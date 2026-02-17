import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '../referrer/mobile/auth/exchange/route';

const { rateLimit, rateLimitHeaders } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(),
}));

const { verifyLegacyReferrerPortalToken, issueReferrerMobileSession } = vi.hoisted(() => ({
  verifyLegacyReferrerPortalToken: vi.fn(),
  issueReferrerMobileSession: vi.fn(),
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
  verifyLegacyReferrerPortalToken,
  issueReferrerMobileSession,
}));

vi.mock('@/lib/referrerPortalToken', () => ({
  normalizePortalTokenVersion,
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

  verifyLegacyReferrerPortalToken.mockReturnValue({
    irref: 'iRREF0000000001',
    v: 2,
  });
  normalizePortalTokenVersion.mockImplementation((value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

  it('returns structured JSON for missing mobile-session table errors', async () => {
    issueReferrerMobileSession.mockRejectedValue({
      code: 'P2021',
      message: 'The table `public.ReferrerMobileSession` does not exist in the current database.',
    });

    const response = await POST(makeRequest({ portalToken: 'valid-token' }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Mobile portal sign-in is temporarily unavailable. Please try again in a few minutes.',
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
