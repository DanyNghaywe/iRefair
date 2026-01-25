import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { resetProcessEnv } from '../../../lib/__tests__/testUtils';
import { POST } from '../referrer/portal/link/route';

const { requireFounder } = vi.hoisted(() => ({
  requireFounder: vi.fn(),
}));

const { getReferrerByIrref } = vi.hoisted(() => ({
  getReferrerByIrref: vi.fn(),
}));

const { ensureReferrerPortalTokenVersion, buildReferrerPortalLink, sendReferrerPortalLinkEmail } = vi.hoisted(() => ({
  ensureReferrerPortalTokenVersion: vi.fn(),
  buildReferrerPortalLink: vi.fn(),
  sendReferrerPortalLinkEmail: vi.fn(),
}));

vi.mock('@/lib/founderAuth', () => ({
  requireFounder,
}));

vi.mock('@/lib/sheets', () => ({
  getReferrerByIrref,
}));

vi.mock('@/lib/referrerPortalLink', () => ({
  ensureReferrerPortalTokenVersion,
  buildReferrerPortalLink,
  sendReferrerPortalLinkEmail,
}));

const ORIGINAL_ENV = { ...process.env };

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/referrer/portal/link', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  requireFounder.mockReset();
  getReferrerByIrref.mockReset();
  ensureReferrerPortalTokenVersion.mockReset();
  buildReferrerPortalLink.mockReset();
  sendReferrerPortalLinkEmail.mockReset();

  requireFounder.mockReturnValue({ email: 'founder@example.com', exp: Math.floor(Date.now() / 1000) + 1000 });
});

describe('POST /api/referrer/portal/link', () => {
  it('returns 400 when missing iRREF', async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Missing iRREF' });
  });

  it('returns 403 when referrer is archived', async () => {
    getReferrerByIrref.mockResolvedValue({
      record: {
        archived: 'true',
      },
    });

    const response = await POST(makeRequest({ irref: 'IR123' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'This referrer has been archived. Restore the referrer before generating a portal link.',
    });
  });

  it('sends portal link email and returns the link', async () => {
    getReferrerByIrref.mockResolvedValue({
      record: {
        archived: 'false',
        email: 'referrer@example.com',
        name: 'Jane Referrer',
        locale: 'fr',
      },
    });
    ensureReferrerPortalTokenVersion.mockResolvedValue(2);
    buildReferrerPortalLink.mockReturnValue('https://example.com/referrer/portal?token=abc');

    const response = await POST(makeRequest({ irref: 'IR123' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      link: 'https://example.com/referrer/portal?token=abc',
    });

    expect(sendReferrerPortalLinkEmail).toHaveBeenCalledWith({
      to: 'referrer@example.com',
      name: 'Jane Referrer',
      irref: 'IR123',
      link: 'https://example.com/referrer/portal?token=abc',
      locale: 'fr',
    });
  });
});
