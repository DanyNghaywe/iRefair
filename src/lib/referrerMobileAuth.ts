import { randomBytes, randomUUID } from 'crypto';

import { db } from '@/lib/db';
import { createReferrerToken, normalizePortalTokenVersion, verifyReferrerToken } from '@/lib/referrerPortalToken';
import { hashOpaqueToken } from '@/lib/tokens';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt((value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ACCESS_TOKEN_TTL_SECONDS = parsePositiveInt(
  process.env.REFERRER_MOBILE_ACCESS_TOKEN_TTL_SECONDS,
  15 * 60,
);
const REFRESH_TOKEN_TTL_SECONDS = parsePositiveInt(
  process.env.REFERRER_MOBILE_REFRESH_TOKEN_TTL_SECONDS,
  30 * 24 * 60 * 60,
);
const SESSION_TTL_SECONDS = parsePositiveInt(
  process.env.REFERRER_MOBILE_SESSION_TTL_SECONDS,
  30 * 24 * 60 * 60,
);

export type IssuedReferrerMobileSession = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

export type ValidatedReferrerMobileRefreshToken = {
  sessionId: string;
  irref: string;
  refreshTokenHash: string;
  sessionExpiresAt: Date;
};

type RefreshTokenParts = {
  sessionId: string;
  tokenHash: string;
};

function nowPlusSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

function parseRefreshToken(refreshToken: string): RefreshTokenParts | null {
  const trimmed = refreshToken.trim();
  if (!trimmed) return null;

  const separator = trimmed.indexOf('.');
  if (separator <= 0 || separator >= trimmed.length - 1) return null;

  const sessionId = trimmed.slice(0, separator).trim();
  const secretPart = trimmed.slice(separator + 1).trim();
  if (!sessionId || !secretPart || secretPart.length < 16) return null;

  return {
    sessionId,
    tokenHash: hashOpaqueToken(trimmed),
  };
}

function makeRefreshToken(sessionId: string) {
  const secret = randomBytes(32).toString('base64url');
  const refreshToken = `${sessionId}.${secret}`;
  return {
    refreshToken,
    refreshTokenHash: hashOpaqueToken(refreshToken),
  };
}

function normalizeRequestedRefreshTtl(ttlSeconds?: number) {
  if (!Number.isFinite(ttlSeconds) || !ttlSeconds || ttlSeconds <= 0) {
    return REFRESH_TOKEN_TTL_SECONDS;
  }
  return Math.max(60, Math.floor(ttlSeconds));
}

function normalizeSessionTtl(ttlSeconds?: number) {
  if (!Number.isFinite(ttlSeconds) || !ttlSeconds || ttlSeconds <= 0) {
    return SESSION_TTL_SECONDS;
  }
  return Math.max(60, Math.floor(ttlSeconds));
}

function resolveRefreshExpiry(sessionExpiresAt: Date, requestedTtlSeconds: number) {
  const requestedExpiresAt = nowPlusSeconds(requestedTtlSeconds);
  if (requestedExpiresAt.getTime() <= sessionExpiresAt.getTime()) {
    return requestedExpiresAt;
  }
  return sessionExpiresAt;
}

function getRefreshExpiresInSeconds(refreshExpiresAt: Date) {
  return Math.max(1, Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000));
}

function sanitizeUserAgent(value?: string | null) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 512);
}

export function issueReferrerMobileAccessToken(irref: string, tokenVersion: number) {
  const normalizedVersion = normalizePortalTokenVersion(String(tokenVersion));
  return {
    accessToken: createReferrerToken(irref, normalizedVersion, ACCESS_TOKEN_TTL_SECONDS),
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export async function issueReferrerMobileSession(
  irref: string,
  tokenVersion: number,
  options?: {
    userAgent?: string | null;
    refreshTtlSeconds?: number;
    sessionTtlSeconds?: number;
  },
): Promise<IssuedReferrerMobileSession> {
  const sessionId = randomUUID();
  const sessionTtlSeconds = normalizeSessionTtl(options?.sessionTtlSeconds);
  const requestedRefreshTtlSeconds = normalizeRequestedRefreshTtl(options?.refreshTtlSeconds);
  const sessionExpiresAt = nowPlusSeconds(sessionTtlSeconds);
  const refreshExpiresAt = resolveRefreshExpiry(sessionExpiresAt, requestedRefreshTtlSeconds);
  const refreshTokenExpiresIn = getRefreshExpiresInSeconds(refreshExpiresAt);

  const refresh = makeRefreshToken(sessionId);

  await db.referrerMobileSession.create({
    data: {
      id: sessionId,
      irref,
      refreshTokenHash: refresh.refreshTokenHash,
      refreshTokenExpiresAt: refreshExpiresAt,
      sessionExpiresAt,
      userAgent: sanitizeUserAgent(options?.userAgent),
      lastUsedAt: new Date(),
    },
  });

  const access = issueReferrerMobileAccessToken(irref, tokenVersion);

  return {
    accessToken: access.accessToken,
    accessTokenExpiresIn: access.accessTokenExpiresIn,
    refreshToken: refresh.refreshToken,
    refreshTokenExpiresIn,
  };
}

export async function validateReferrerMobileRefreshToken(refreshToken: string): Promise<ValidatedReferrerMobileRefreshToken | null> {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) return null;

  const session = await db.referrerMobileSession.findUnique({
    where: { id: parsed.sessionId },
    select: {
      id: true,
      irref: true,
      refreshTokenHash: true,
      refreshTokenExpiresAt: true,
      sessionExpiresAt: true,
      revokedAt: true,
    },
  });
  if (!session) return null;

  const now = new Date();
  if (session.revokedAt) return null;
  if (session.sessionExpiresAt.getTime() <= now.getTime()) return null;
  if (session.refreshTokenExpiresAt.getTime() <= now.getTime()) return null;
  if (session.refreshTokenHash !== parsed.tokenHash) return null;

  return {
    sessionId: session.id,
    irref: session.irref,
    refreshTokenHash: parsed.tokenHash,
    sessionExpiresAt: session.sessionExpiresAt,
  };
}

export async function rotateReferrerMobileRefreshToken(
  validated: ValidatedReferrerMobileRefreshToken,
): Promise<{ refreshToken: string; refreshTokenExpiresIn: number } | null> {
  const now = new Date();
  const refresh = makeRefreshToken(validated.sessionId);
  const refreshExpiresAt = resolveRefreshExpiry(validated.sessionExpiresAt, REFRESH_TOKEN_TTL_SECONDS);
  const refreshTokenExpiresIn = getRefreshExpiresInSeconds(refreshExpiresAt);

  const updated = await db.referrerMobileSession.updateMany({
    where: {
      id: validated.sessionId,
      refreshTokenHash: validated.refreshTokenHash,
      revokedAt: null,
      sessionExpiresAt: { gt: now },
      refreshTokenExpiresAt: { gt: now },
    },
    data: {
      refreshTokenHash: refresh.refreshTokenHash,
      refreshTokenExpiresAt: refreshExpiresAt,
      lastUsedAt: now,
    },
  });

  if (updated.count !== 1) return null;

  return {
    refreshToken: refresh.refreshToken,
    refreshTokenExpiresIn,
  };
}

export async function revokeReferrerMobileSessionByRefreshToken(refreshToken: string): Promise<void> {
  const parsed = parseRefreshToken(refreshToken);
  if (!parsed) return;

  await db.referrerMobileSession.updateMany({
    where: {
      id: parsed.sessionId,
      refreshTokenHash: parsed.tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeAllReferrerMobileSessions(irref: string): Promise<void> {
  await db.referrerMobileSession.updateMany({
    where: {
      irref,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export function verifyLegacyReferrerPortalToken(token: string) {
  return verifyReferrerToken(token);
}
