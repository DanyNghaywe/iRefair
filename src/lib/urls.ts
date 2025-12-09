export const jobOpeningsPath = '/hiring-companies';

const baseFromEnv =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.VERCEL_URL;

const normalizedBase =
  baseFromEnv && baseFromEnv.startsWith('http') ? baseFromEnv : baseFromEnv ? `https://${baseFromEnv}` : null;

export const jobOpeningsUrl = new URL(jobOpeningsPath, normalizedBase ?? 'https://irefair.com').toString();
