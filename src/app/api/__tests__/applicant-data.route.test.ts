import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { resetProcessEnv } from '../../../lib/__tests__/testUtils';
import { GET } from '../applicant/data/route';

const { getApplicationById, findApplicantByIdentifier } = vi.hoisted(() => ({
  getApplicationById: vi.fn(),
  findApplicantByIdentifier: vi.fn(),
}));

const { hashOpaqueToken, isExpired } = vi.hoisted(() => ({
  hashOpaqueToken: vi.fn(),
  isExpired: vi.fn(),
}));

vi.mock('@/lib/sheets', () => ({
  getApplicationById,
  findApplicantByIdentifier,
}));

vi.mock('@/lib/tokens', () => ({
  hashOpaqueToken,
  isExpired,
}));

const ORIGINAL_ENV = { ...process.env };

const makeRequest = (url: string) => new NextRequest(url);

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  getApplicationById.mockReset();
  findApplicantByIdentifier.mockReset();
  hashOpaqueToken.mockReset();
  isExpired.mockReset();

  isExpired.mockReturnValue(false);
  hashOpaqueToken.mockReturnValue('hash123');
});

describe('GET /api/applicant/data', () => {
  it('returns 400 when missing params', async () => {
    const response = await GET(makeRequest('http://localhost/api/applicant/data'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Missing updateToken or appId' });
  });

  it('returns 410 when update link is expired', async () => {
    getApplicationById.mockResolvedValue({
      record: {
        updateRequestTokenHash: 'hash123',
        updateRequestExpiresAt: '2025-01-01T00:00:00Z',
      },
    });
    isExpired.mockReturnValue(true);

    const response = await GET(
      makeRequest('http://localhost/api/applicant/data?updateToken=token123&appId=APP1'),
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Update link has expired' });
  });

  it('returns 401 when token hash does not match', async () => {
    getApplicationById.mockResolvedValue({
      record: {
        updateRequestTokenHash: 'stored-hash',
        updateRequestExpiresAt: '2026-01-01T00:00:00Z',
      },
    });
    hashOpaqueToken.mockReturnValue('different-hash');

    const response = await GET(
      makeRequest('http://localhost/api/applicant/data?updateToken=token123&appId=APP1'),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Invalid update token' });
  });

  it('returns applicant data when token is valid', async () => {
    getApplicationById.mockResolvedValue({
      record: {
        updateRequestTokenHash: 'hash123',
        updateRequestExpiresAt: '2026-01-01T00:00:00Z',
        applicantId: 'A-100',
        updateRequestPurpose: 'resume',
      },
    });

    findApplicantByIdentifier.mockResolvedValue({
      record: {
        firstName: 'Jane',
        familyName: 'Doe',
        email: 'jane@example.com',
      },
    });

    const response = await GET(
      makeRequest('http://localhost/api/applicant/data?updateToken=token123&appId=APP1'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      updatePurpose: 'resume',
      data: {
        firstName: 'Jane',
        familyName: 'Doe',
        email: 'jane@example.com',
      },
    });
  });
});
