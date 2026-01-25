import { vi } from 'vitest';

import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };

const clearBaseEnv = () => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_BASE_URL;
  delete process.env.VERCEL_URL;
};

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.resetModules();
});

const loadUrls = async () => {
  return await import('../urls');
};

describe('urls', () => {
  it('falls back to the production base url when env is empty', async () => {
    clearBaseEnv();

    const { jobOpeningsUrl, applyUrl } = await loadUrls();

    expect(jobOpeningsUrl).toBe('https://irefair.com/hiring-companies');
    expect(applyUrl).toBe('https://irefair.com/apply');
  });

  it('uses the configured base url when set', async () => {
    clearBaseEnv();
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

    const { jobOpeningsUrl, applyUrl } = await loadUrls();

    expect(jobOpeningsUrl).toBe('https://example.com/hiring-companies');
    expect(applyUrl).toBe('https://example.com/apply');
  });

  it('normalizes the base url when missing a scheme', async () => {
    clearBaseEnv();
    process.env.NEXT_PUBLIC_APP_URL = 'example.com';

    const { applyUrl } = await loadUrls();

    expect(applyUrl).toBe('https://example.com/apply');
  });
});
