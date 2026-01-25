import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock dependencies
vi.mock('@/lib/sheets', () => ({
  getReferrerByIrref: vi.fn(),
  updateRowById: vi.fn().mockResolvedValue({ updated: true }),
  ensureColumns: vi.fn(),
  REFERRER_SHEET_NAME: 'Referrers',
  REFERRER_PORTAL_TOKEN_VERSION_HEADER: 'Portal Token Version',
}));

vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
}));

vi.mock('@/lib/referrerPortalToken', () => ({
  createReferrerToken: vi.fn().mockReturnValue('test-token'),
  normalizePortalTokenVersion: vi.fn((v) => {
    const num = parseInt(v, 10);
    return !v || isNaN(num) || num < 1 ? 1 : num;
  }),
}));

vi.mock('@/lib/validation', () => ({
  normalizeHttpUrl: vi.fn((url) => url),
}));

vi.mock('@/lib/emailTemplates', () => ({
  referrerPortalLink: vi.fn().mockReturnValue({
    subject: 'Your Portal Link',
    html: '<p>Portal</p>',
    text: 'Portal',
  }),
}));

describe('referrerPortalLink', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getAppBaseUrl', () => {
    it('returns localhost when no env vars set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_BASE_URL;
      delete process.env.VERCEL_URL;

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('http://localhost:3000');
    });

    it('uses NEXT_PUBLIC_APP_URL if set', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com';

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('https://myapp.com');
    });

    it('falls back to NEXT_PUBLIC_SITE_URL', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_SITE_URL = 'https://site.com';

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('https://site.com');
    });

    it('falls back to NEXT_PUBLIC_BASE_URL', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_BASE_URL = 'https://base.com';

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('https://base.com');
    });

    it('falls back to VERCEL_URL', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.NEXT_PUBLIC_BASE_URL;
      process.env.VERCEL_URL = 'myapp.vercel.app';

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('https://myapp.vercel.app');
    });

    it('adds https:// if missing', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'example.com';

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('https://example.com');
    });

    it('preserves http:// if present', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:8080';

      const { getAppBaseUrl } = await import('../referrerPortalLink');
      expect(getAppBaseUrl()).toBe('http://localhost:8080');
    });
  });

  describe('ensureReferrerPortalTokenVersion', () => {
    it('throws error when referrer not found', async () => {
      const { getReferrerByIrref } = await import('@/lib/sheets');
      vi.mocked(getReferrerByIrref).mockResolvedValueOnce(null);

      const { ensureReferrerPortalTokenVersion } = await import('../referrerPortalLink');

      await expect(ensureReferrerPortalTokenVersion('iRREF0000000001')).rejects.toThrow(
        'Referrer not found'
      );
    });

    it('returns normalized version when already stored', async () => {
      const { getReferrerByIrref } = await import('@/lib/sheets');
      vi.mocked(getReferrerByIrref).mockResolvedValueOnce({
        record: { portalTokenVersion: '1' },
      } as any);

      const { ensureReferrerPortalTokenVersion } = await import('../referrerPortalLink');
      const version = await ensureReferrerPortalTokenVersion('iRREF0000000001');

      expect(version).toBe(1);
    });

    it('updates sheet when version is missing', async () => {
      const { getReferrerByIrref, updateRowById, ensureColumns } = await import('@/lib/sheets');
      vi.mocked(getReferrerByIrref).mockResolvedValueOnce({
        record: { portalTokenVersion: '' },
      } as any);

      const { ensureReferrerPortalTokenVersion } = await import('../referrerPortalLink');
      await ensureReferrerPortalTokenVersion('iRREF0000000001');

      expect(ensureColumns).toHaveBeenCalled();
      expect(updateRowById).toHaveBeenCalledWith(
        'Referrers',
        'iRREF',
        'iRREF0000000001',
        expect.objectContaining({ 'Portal Token Version': '1' })
      );
    });
  });

  describe('buildReferrerPortalLink', () => {
    it('builds portal link with token', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      const { buildReferrerPortalLink } = await import('../referrerPortalLink');
      const link = buildReferrerPortalLink('iRREF0000000001', 1);

      expect(link).toContain('https://example.com/referrer/portal');
      expect(link).toContain('token=test-token');
    });

    it('throws error when URL normalization fails', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      const { normalizeHttpUrl } = await import('@/lib/validation');
      vi.mocked(normalizeHttpUrl).mockReturnValueOnce(null);

      const { buildReferrerPortalLink } = await import('../referrerPortalLink');

      expect(() => buildReferrerPortalLink('iRREF0000000001', 1)).toThrow('Invalid portal link URL');
    });
  });

  describe('sendReferrerPortalLinkEmail', () => {
    it('sends email with correct parameters', async () => {
      const { sendMail } = await import('@/lib/mailer');
      const { referrerPortalLink } = await import('@/lib/emailTemplates');

      const { sendReferrerPortalLinkEmail } = await import('../referrerPortalLink');

      await sendReferrerPortalLinkEmail({
        to: 'referrer@example.com',
        name: 'John',
        irref: 'iRREF0000000001',
        link: 'https://example.com/portal',
        locale: 'en',
      });

      expect(referrerPortalLink).toHaveBeenCalledWith({
        name: 'John',
        iRref: 'iRREF0000000001',
        portalUrl: 'https://example.com/portal',
        locale: 'en',
      });

      expect(sendMail).toHaveBeenCalledWith({
        to: 'referrer@example.com',
        subject: 'Your Portal Link',
        html: '<p>Portal</p>',
        text: 'Portal',
      });
    });

    it('uses "there" as default name', async () => {
      const { referrerPortalLink } = await import('@/lib/emailTemplates');

      const { sendReferrerPortalLinkEmail } = await import('../referrerPortalLink');

      await sendReferrerPortalLinkEmail({
        to: 'referrer@example.com',
        irref: 'iRREF0000000001',
        link: 'https://example.com/portal',
      });

      expect(referrerPortalLink).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'there' })
      );
    });

    it('uses English as default locale', async () => {
      const { referrerPortalLink } = await import('@/lib/emailTemplates');

      const { sendReferrerPortalLinkEmail } = await import('../referrerPortalLink');

      await sendReferrerPortalLinkEmail({
        to: 'referrer@example.com',
        irref: 'iRREF0000000001',
        link: 'https://example.com/portal',
      });

      expect(referrerPortalLink).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en' })
      );
    });

    it('supports French locale', async () => {
      const { referrerPortalLink } = await import('@/lib/emailTemplates');

      const { sendReferrerPortalLinkEmail } = await import('../referrerPortalLink');

      await sendReferrerPortalLinkEmail({
        to: 'referrer@example.com',
        irref: 'iRREF0000000001',
        link: 'https://example.com/portal',
        locale: 'fr',
      });

      expect(referrerPortalLink).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'fr' })
      );
    });
  });
});
