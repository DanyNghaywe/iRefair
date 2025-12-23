import type { NextRequest } from 'next/server';

export const REFERRER_PORTAL_COOKIE = 'irefair_ref_portal';

export function getReferrerPortalToken(
  request: NextRequest,
  fallbackToken?: string | null,
): string {
  const cookieToken = request.cookies.get(REFERRER_PORTAL_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const fallback = typeof fallbackToken === 'string' ? fallbackToken.trim() : '';
  if (fallback) return fallback;

  return request.nextUrl.searchParams.get('token') || '';
}
