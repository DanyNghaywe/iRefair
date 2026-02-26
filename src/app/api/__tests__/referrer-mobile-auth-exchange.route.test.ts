import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '../referrer/mobile/auth/exchange/route';

const { rateLimit, rateLimitHeaders } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(),
}));

const { verifyLegacyReferrerPortalToken, issueReferrerMobileSession, issueStatelessReferrerMobileSession } = vi.hoisted(() => ({
  verifyLegacyReferrerPortalToken: vi.fn(),
  issueReferrerMobileSession: vi.fn(),
  issueStatelessReferrerMobileSession: vi.fn(),
}));

const { normalizePortalTokenVersion, verifyReferrerTokenAllowExpired } = vi.hoisted(() => ({
  normalizePortalTokenVersion: vi.fn(),
  verifyReferrerTokenAllowExpired: vi.fn(),
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
  verifyLegacyReferrerPortalToken,
  issueReferrerMobileSession,
  issueStatelessReferrerMobileSession,
}));

vi.mock('@/lib/referrerPortalToken', () => ({
  normalizePortalTokenVersion,
  verifyReferrerTokenAllowExpired,
}));

vi.mock('@/lib/sheets', () => ({
  getReferrerByIrref,
}));

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/referrer/mobile/auth/exchange', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  rateLimit.mockReset();
  rateLimitHeaders.mockReset();
  verifyLegacyReferrerPortalToken.mockReset();
  issueReferrerMobileSession.mockReset();
  issueStatelessReferrerMobileSession.mockReset();
  normalizePortalTokenVersion.mockReset();
  verifyReferrerTokenAllowExpired.mockReset();
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

  verifyLegacyReferrerPortalToken.mockReturnValue({
    irref: 'iRREF0000000001',
    v: 2,
  });
  normalizePortalTokenVersion.mockImplementation((value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  verifyReferrerTokenAllowExpired.mockReturnValue({
    irref: 'iRREF0000000001',
    exp: Math.floor(Date.now() / 1000) - 10,
    v: 2,
  });
  getReferrerByIrref.mockResolvedValue({
    record: {
      irref: 'iRREF0000000001',
      name: 'Jane Referrer',
      email: 'jane@example.com',
      archived: 'false',
      portalTokenVersion: '2',
    },
  });
  issueReferrerMobileSession.mockResolvedValue({
    accessToken: 'access-token',
    accessTokenExpiresIn: 900,
    refreshToken: 'refresh-token',
    refreshTokenExpiresIn: 2592000,
  });
  issueStatelessReferrerMobileSession.mockReturnValue({
    accessToken: 'stateless-access-token',
    accessTokenExpiresIn: 900,
    refreshToken: 'stateless:refresh-token',
    refreshTokenExpiresIn: 2592000,
  });
});

describe('POST /api/referrer/mobile/auth/exchange', () => {
  it('returns 200 for a valid exchange', async () => {
    const response = await POST(makeRequest({ portalToken: 'valid-token' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
      refreshToken: 'refresh-token',
      refreshTokenExpiresIn: 2592000,
      referrer: {
        irref: 'iRREF0000000001',
        name: 'Jane Referrer',
        email: 'jane@example.com',
      },
    });
  });

  it('falls back to stateless session when mobile-session table is unavailable', async () => {
    issueReferrerMobileSession.mockRejectedValue({
      code: 'P2021',
      message: 'The table `public.ReferrerMobileSession` does not exist in the current database.',
    });

    const response = await POST(makeRequest({ portalToken: 'valid-token' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      accessToken: 'stateless-access-token',
      accessTokenExpiresIn: 900,
      refreshToken: 'stateless:refresh-token',
      refreshTokenExpiresIn: 2592000,
      referrer: {
        irref: 'iRREF0000000001',
        name: 'Jane Referrer',
        email: 'jane@example.com',
      },
    });
  });

  it('returns archived error when portal token is expired but belongs to an archived referrer', async () => {
    verifyLegacyReferrerPortalToken.mockImplementation(() => {
      throw new Error('Token expired');
    });
    verifyReferrerTokenAllowExpired.mockReturnValue({
      irref: 'iRREF0000000001',
      exp: Math.floor(Date.now() / 1000) - 10,
      v: 2,
    });
    getReferrerByIrref.mockResolvedValue({
      record: {
        irref: 'iRREF0000000001',
        name: 'Jane Referrer',
        email: 'jane@example.com',
        archived: 'true',
        portalTokenVersion: '2',
      },
    });

    const response = await POST(makeRequest({ portalToken: 'expired-valid-token' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'This referrer account has been archived and portal access is no longer available.',
    });
  });

  it('returns structured JSON for unexpected server errors', async () => {
    issueReferrerMobileSession.mockRejectedValue(new Error('unexpected failure'));

    const response = await POST(makeRequest({ portalToken: 'valid-token' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Unable to sign in right now. Please try again later.',
    });
  });
});
