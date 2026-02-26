import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '../referrer/mobile/auth/refresh/route';

const { rateLimit, rateLimitHeaders } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(),
}));

const {
  getReferrerMobileRefreshTokenIrrefHint,
  getReferrerMobileStatelessRefreshTokenIrrefHint,
  issueReferrerMobileAccessToken,
  issueStatelessReferrerMobileRefreshToken,
  revokeReferrerMobileSessionByRefreshToken,
  rotateReferrerMobileRefreshToken,
  validateStatelessReferrerMobileRefreshToken,
  validateReferrerMobileRefreshToken,
} = vi.hoisted(() => ({
  getReferrerMobileRefreshTokenIrrefHint: vi.fn(),
  getReferrerMobileStatelessRefreshTokenIrrefHint: vi.fn(),
  issueReferrerMobileAccessToken: vi.fn(),
  issueStatelessReferrerMobileRefreshToken: vi.fn(),
  revokeReferrerMobileSessionByRefreshToken: vi.fn(),
  rotateReferrerMobileRefreshToken: vi.fn(),
  validateStatelessReferrerMobileRefreshToken: vi.fn(),
  validateReferrerMobileRefreshToken: vi.fn(),
}));

const { normalizePortalTokenVersion } = vi.hoisted(() => ({
  normalizePortalTokenVersion: vi.fn(),
}));

const { getReferrerByIrref } = vi.hoisted(() => ({
  getReferrerByIrref: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: {
    referrer: { limit: 10, windowSeconds: 60 },
  },
  rateLimit,
  rateLimitHeaders,
}));

vi.mock('@/lib/referrerMobileAuth', () => ({
  getReferrerMobileRefreshTokenIrrefHint,
  getReferrerMobileStatelessRefreshTokenIrrefHint,
  issueReferrerMobileAccessToken,
  issueStatelessReferrerMobileRefreshToken,
  revokeReferrerMobileSessionByRefreshToken,
  rotateReferrerMobileRefreshToken,
  validateStatelessReferrerMobileRefreshToken,
  validateReferrerMobileRefreshToken,
}));

vi.mock('@/lib/referrerPortalToken', () => ({
  normalizePortalTokenVersion,
}));

vi.mock('@/lib/sheets', () => ({
  getReferrerByIrref,
}));

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/referrer/mobile/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  rateLimit.mockReset();
  rateLimitHeaders.mockReset();
  issueReferrerMobileAccessToken.mockReset();
  issueStatelessReferrerMobileRefreshToken.mockReset();
  getReferrerMobileRefreshTokenIrrefHint.mockReset();
  getReferrerMobileStatelessRefreshTokenIrrefHint.mockReset();
  revokeReferrerMobileSessionByRefreshToken.mockReset();
  rotateReferrerMobileRefreshToken.mockReset();
  validateStatelessReferrerMobileRefreshToken.mockReset();
  validateReferrerMobileRefreshToken.mockReset();
  normalizePortalTokenVersion.mockReset();
  getReferrerByIrref.mockReset();

  rateLimit.mockResolvedValue({
    allowed: true,
    limit: 10,
    remaining: 9,
    reset: 123,
    retryAfter: 0,
    enabled: false,
  });
  rateLimitHeaders.mockReturnValue(new Headers());

  validateStatelessReferrerMobileRefreshToken.mockReturnValue(null);
  validateReferrerMobileRefreshToken.mockResolvedValue(null);
  getReferrerMobileRefreshTokenIrrefHint.mockResolvedValue(null);
  getReferrerMobileStatelessRefreshTokenIrrefHint.mockReturnValue(null);
  normalizePortalTokenVersion.mockImplementation((value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
});

describe('POST /api/referrer/mobile/auth/refresh', () => {
  it('refreshes stateless sessions', async () => {
    validateStatelessReferrerMobileRefreshToken.mockReturnValue({
      irref: 'iRREF0000000001',
      tokenVersion: 2,
    });
    getReferrerByIrref.mockResolvedValue({
      record: {
        irref: 'iRREF0000000001',
        archived: 'false',
        portalTokenVersion: '2',
      },
    });
    issueReferrerMobileAccessToken.mockReturnValue({
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
    });
    issueStatelessReferrerMobileRefreshToken.mockReturnValue({
      refreshToken: 'stateless:refresh-token',
      refreshTokenExpiresIn: 2592000,
    });

    const response = await POST(makeRequest({ refreshToken: 'stateless:anything' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
      refreshToken: 'stateless:refresh-token',
      refreshTokenExpiresIn: 2592000,
    });
  });

  it('rejects stateless session when token version no longer matches', async () => {
    validateStatelessReferrerMobileRefreshToken.mockReturnValue({
      irref: 'iRREF0000000001',
      tokenVersion: 1,
    });
    getReferrerByIrref.mockResolvedValue({
      record: {
        irref: 'iRREF0000000001',
        archived: 'false',
        portalTokenVersion: '2',
      },
    });

    const response = await POST(makeRequest({ refreshToken: 'stateless:anything' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid or expired session.',
    });
  });

  it('returns archived error when a revoked stateful refresh token belongs to an archived referrer', async () => {
    validateStatelessReferrerMobileRefreshToken.mockReturnValue(null);
    validateReferrerMobileRefreshToken.mockResolvedValue(null);
    getReferrerMobileRefreshTokenIrrefHint.mockResolvedValue({
      irref: 'iRREF0000000001',
    });
    getReferrerByIrref.mockResolvedValue({
      record: {
        irref: 'iRREF0000000001',
        archived: 'true',
        portalTokenVersion: '2',
      },
    });

    const response = await POST(makeRequest({ refreshToken: 'session.secret-token-value' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'This referrer account has been archived and portal access is no longer available.',
    });
  });

  it('returns archived error for an expired stateless refresh token belonging to an archived referrer', async () => {
    validateStatelessReferrerMobileRefreshToken.mockReturnValue(null);
    getReferrerMobileStatelessRefreshTokenIrrefHint.mockReturnValue({
      irref: 'iRREF0000000001',
    });
    validateReferrerMobileRefreshToken.mockResolvedValue(null);
    getReferrerByIrref.mockResolvedValue({
      record: {
        irref: 'iRREF0000000001',
        archived: 'true',
        portalTokenVersion: '2',
      },
    });

    const response = await POST(makeRequest({ refreshToken: 'stateless:expired-token' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'This referrer account has been archived and portal access is no longer available.',
    });
  });
});
