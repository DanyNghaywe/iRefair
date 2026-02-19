import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { POST } from '../applicant/mobile/auth/exchange/route';

const { hashApplicantSecret } = vi.hoisted(() => ({
  hashApplicantSecret: vi.fn(),
}));

const { rateLimit, rateLimitHeaders } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(),
}));

const {
  issueApplicantMobileSession,
  issueStatelessApplicantMobileSession,
} = vi.hoisted(() => ({
  issueApplicantMobileSession: vi.fn(),
  issueStatelessApplicantMobileSession: vi.fn(),
}));

const {
  isApplicantMobileSessionStoreUnavailable,
  mapApplicantMobileAuthError,
} = vi.hoisted(() => ({
  isApplicantMobileSessionStoreUnavailable: vi.fn(),
  mapApplicantMobileAuthError: vi.fn(),
}));

const { findApplicantByIdentifier } = vi.hoisted(() => ({
  findApplicantByIdentifier: vi.fn(),
}));

vi.mock('@/lib/applicantUpdateToken', () => ({
  hashApplicantSecret,
}));

vi.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: {
    applicant: { limit: 10, windowSeconds: 60 },
  },
  rateLimit,
  rateLimitHeaders,
}));

vi.mock('@/lib/applicantMobileAuth', () => ({
  issueApplicantMobileSession,
  issueStatelessApplicantMobileSession,
}));

vi.mock('@/lib/applicantMobileAuthErrors', () => ({
  isApplicantMobileSessionStoreUnavailable,
  mapApplicantMobileAuthError,
}));

vi.mock('@/lib/sheets', () => ({
  findApplicantByIdentifier,
}));

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/applicant/mobile/auth/exchange', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  rateLimit.mockReset();
  rateLimitHeaders.mockReset();
  hashApplicantSecret.mockReset();
  issueApplicantMobileSession.mockReset();
  issueStatelessApplicantMobileSession.mockReset();
  isApplicantMobileSessionStoreUnavailable.mockReset();
  mapApplicantMobileAuthError.mockReset();
  findApplicantByIdentifier.mockReset();

  rateLimit.mockResolvedValue({
    allowed: true,
    limit: 10,
    remaining: 9,
    reset: 123,
    retryAfter: 0,
    enabled: false,
  });
  rateLimitHeaders.mockReturnValue(new Headers());

  hashApplicantSecret.mockReturnValue('a'.repeat(64));
  findApplicantByIdentifier.mockResolvedValue({
    record: {
      id: 'iRAIN0000000001',
      firstName: 'Jane',
      familyName: 'Applicant',
      email: 'jane@example.com',
      archived: 'false',
      applicantSecretHash: 'a'.repeat(64),
    },
  });
  issueApplicantMobileSession.mockResolvedValue({
    accessToken: 'access-token',
    accessTokenExpiresIn: 900,
    refreshToken: 'refresh-token',
    refreshTokenExpiresIn: 2592000,
  });
  issueStatelessApplicantMobileSession.mockReturnValue({
    accessToken: 'stateless-access-token',
    accessTokenExpiresIn: 900,
    refreshToken: 'stateless:refresh-token',
    refreshTokenExpiresIn: 2592000,
  });

  isApplicantMobileSessionStoreUnavailable.mockReturnValue(false);
  mapApplicantMobileAuthError.mockReturnValue({
    status: 500,
    message: 'Unable to sign in right now. Please try again later.',
  });
});

describe('POST /api/applicant/mobile/auth/exchange', () => {
  it('returns 200 for valid applicant credentials', async () => {
    const response = await POST(makeRequest({ applicantId: 'iRAIN0000000001', applicantKey: 'secret-key' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
      refreshToken: 'refresh-token',
      refreshTokenExpiresIn: 2592000,
      applicant: {
        irain: 'iRAIN0000000001',
        firstName: 'Jane',
        lastName: 'Applicant',
        email: 'jane@example.com',
      },
    });
  });

  it('returns 401 when applicant credentials are invalid', async () => {
    hashApplicantSecret.mockReturnValue('b'.repeat(64));

    const response = await POST(makeRequest({ applicantId: 'iRAIN0000000001', applicantKey: 'wrong-key' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Invalid applicant credentials.',
    });
  });

  it('falls back to stateless session when session table is unavailable', async () => {
    issueApplicantMobileSession.mockRejectedValue({
      code: 'P2021',
      message: 'The table `public.ApplicantMobileSession` does not exist in the current database.',
    });
    isApplicantMobileSessionStoreUnavailable.mockReturnValue(true);

    const response = await POST(makeRequest({ applicantId: 'iRAIN0000000001', applicantKey: 'secret-key' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      accessToken: 'stateless-access-token',
      accessTokenExpiresIn: 900,
      refreshToken: 'stateless:refresh-token',
      refreshTokenExpiresIn: 2592000,
      applicant: {
        irain: 'iRAIN0000000001',
        firstName: 'Jane',
        lastName: 'Applicant',
        email: 'jane@example.com',
      },
    });
  });
});
