import { vi } from 'vitest';
import { NextRequest } from 'next/server';

import { resetProcessEnv } from '../../../lib/__tests__/testUtils';
import { POST } from '../referrer/portal/request-link/route';

const { getReferrerByEmail } = vi.hoisted(() => ({
  getReferrerByEmail: vi.fn(),
}));

const { ensureReferrerPortalTokenVersion, buildReferrerPortalLink, sendReferrerPortalLinkEmail } = vi.hoisted(() => ({
  ensureReferrerPortalTokenVersion: vi.fn(),
  buildReferrerPortalLink: vi.fn(),
  sendReferrerPortalLinkEmail: vi.fn(),
}));

vi.mock('@/lib/sheets', () => ({
  getReferrerByEmail,
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
  ensureReferrerPortalTokenVersion.mockReset();
  buildReferrerPortalLink.mockReset();
  sendReferrerPortalLinkEmail.mockReset();

  getReferrerByEmail.mockResolvedValue(null);
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

  it('sends a portal link email for known referrers', async () => {
    getReferrerByEmail.mockResolvedValue({
      record: {
        irref: 'IR123',
        name: 'Jane Referrer',
        archived: 'false',
      },
    });
    ensureReferrerPortalTokenVersion.mockResolvedValue(2);
    buildReferrerPortalLink.mockReturnValue('https://example.com/referrer/portal?token=abc');

    const response = await POST(makeRequest({ email: 'referrer@example.com' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(sendReferrerPortalLinkEmail).toHaveBeenCalledWith({
      to: 'referrer@example.com',
      name: 'Jane Referrer',
      irref: 'IR123',
      link: 'https://example.com/referrer/portal?token=abc',
    });
  });
});
