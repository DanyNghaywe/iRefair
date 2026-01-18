export const jobOpeningsPath = '/hiring-companies';
export const applyPath = '/apply';

const baseFromEnv =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.VERCEL_URL;

const normalizedBase =
  baseFromEnv && baseFromEnv.startsWith('http') ? baseFromEnv : baseFromEnv ? `https://${baseFromEnv}` : null;

export const jobOpeningsUrl = new URL(jobOpeningsPath, normalizedBase ?? 'https://irefair.com').toString();
export const applyUrl = new URL(applyPath, normalizedBase ?? 'https://irefair.com').toString();
