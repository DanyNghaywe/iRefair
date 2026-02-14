import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { resetProcessEnv } from '../../../lib/__tests__/testUtils';
import { POST } from '../referrer/portal/request-link/route';

const { getReferrerByEmail } = vi.hoisted(() => ({
  getReferrerByEmail: vi.fn(),
}));

const { hasApprovedCompany } = vi.hoisted(() => ({
  hasApprovedCompany: vi.fn(),
}));

const { ensureReferrerPortalTokenVersion, buildReferrerPortalLink, sendReferrerPortalLinkEmail } = vi.hoisted(() => ({
  ensureReferrerPortalTokenVersion: vi.fn(),
  buildReferrerPortalLink: vi.fn(),
  sendReferrerPortalLinkEmail: vi.fn(),
}));

vi.mock('@/lib/sheets', () => ({
  getReferrerByEmail,
  hasApprovedCompany,
}));

vi.mock('@/lib/referrerPortalLink', () => ({
  ensureReferrerPortalTokenVersion,
  buildReferrerPortalLink,
  sendReferrerPortalLinkEmail,
}));

const ORIGINAL_ENV = { ...process.env };

const makeRequest = (body: unknown, raw = false) =>
  new NextRequest('http://localhost/api/referrer/portal/request-link', {
    method: 'POST',
    body: raw ? String(body) : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  getReferrerByEmail.mockReset();
  hasApprovedCompany.mockReset();
  ensureReferrerPortalTokenVersion.mockReset();
  buildReferrerPortalLink.mockReset();
  sendReferrerPortalLinkEmail.mockReset();

  getReferrerByEmail.mockResolvedValue(null);
  hasApprovedCompany.mockResolvedValue(false);
  ensureReferrerPortalTokenVersion.mockResolvedValue(1);
  buildReferrerPortalLink.mockReturnValue('https://example.com/referrer/portal?token=abc');
});

describe('POST /api/referrer/portal/request-link', () => {
  it('returns 400 on invalid JSON', async () => {
    const response = await POST(makeRequest('not-json', true));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Invalid request' });
  });

  it('returns 400 for invalid email', async () => {
    const response = await POST(makeRequest({ email: 'x' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Invalid email address' });
  });

  it('rate limits after 3 requests per hour', async () => {
    const email = 'limit@example.com';
    getReferrerByEmail.mockResolvedValue({
      record: {
        irref: 'IR-LIMIT',
        name: 'Rate Limit Referrer',
        archived: 'false',
      },
    });
    hasApprovedCompany.mockResolvedValue(true);

    const first = await POST(makeRequest({ email }));
    const second = await POST(makeRequest({ email }));
    const third = await POST(makeRequest({ email }));
    const fourth = await POST(makeRequest({ email }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(fourth.status).toBe(429);
    await expect(fourth.json()).resolves.toEqual({
      ok: false,
      error: 'Too many requests. Please try again in an hour.',
    });
  });

  it('returns 404 when no referrer matches the email', async () => {
    getReferrerByEmail.mockResolvedValue(null);

    const response = await POST(makeRequest({ email: 'unknown@example.com' }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'No referrer account found for this email.',
    });
    expect(sendReferrerPortalLinkEmail).not.toHaveBeenCalled();
  });

  it('returns 403 when referrer is not accepted', async () => {
    getReferrerByEmail.mockResolvedValue({
      record: {
        irref: 'IR123',
        name: 'Jane Referrer',
        archived: 'false',
      },
    });
    hasApprovedCompany.mockResolvedValue(false);

    const response = await POST(makeRequest({ email: 'referrer@example.com' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'This referrer account is not accepted yet.',
    });
    expect(sendReferrerPortalLinkEmail).not.toHaveBeenCalled();
  });

  it('returns 403 when referrer is archived', async () => {
    getReferrerByEmail.mockResolvedValue({
      record: {
        irref: 'IR123',
        name: 'Jane Referrer',
        archived: 'true',
      },
    });

    const response = await POST(makeRequest({ email: 'referrer@example.com' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'This referrer account has been archived and cannot access the portal.',
    });
    expect(sendReferrerPortalLinkEmail).not.toHaveBeenCalled();
  });

  it('sends a portal link email for matched and accepted referrers', async () => {
    getReferrerByEmail.mockResolvedValue({
      record: {
        irref: 'IR123',
        name: 'Jane Referrer',
        archived: 'false',
      },
    });
    hasApprovedCompany.mockResolvedValue(true);
    ensureReferrerPortalTokenVersion.mockResolvedValue(2);
    buildReferrerPortalLink.mockReturnValue('https://example.com/referrer/portal?token=abc');

    const response = await POST(makeRequest({ email: 'referrer@example.com' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'Portal access email sent.' });
    expect(sendReferrerPortalLinkEmail).toHaveBeenCalledWith({
      to: 'referrer@example.com',
      name: 'Jane Referrer',
      irref: 'IR123',
      link: 'https://example.com/referrer/portal?token=abc',
    });
  });
});
