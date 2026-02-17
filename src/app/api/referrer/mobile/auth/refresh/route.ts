import { NextRequest, NextResponse } from 'next/server';

import {
  issueReferrerMobileAccessToken,
  revokeReferrerMobileSessionByRefreshToken,
  rotateReferrerMobileRefreshToken,
  validateReferrerMobileRefreshToken,
} from '@/lib/referrerMobileAuth';
import { RATE_LIMITS, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { mapReferrerMobileAuthError } from '@/lib/referrerMobileAuthErrors';
import { normalizePortalTokenVersion } from '@/lib/referrerPortalToken';
import { getReferrerByIrref } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type RequestBody = {
  refreshToken?: string;
};

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, {
    keyPrefix: 'referrer-mobile-refresh',
    ...RATE_LIMITS.referrer,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  let body: RequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const refreshToken = String(body.refreshToken || '').trim();
  if (!refreshToken) {
    return NextResponse.json({ ok: false, error: 'Missing refresh token.' }, { status: 400 });
  }

  try {
    const validated = await validateReferrerMobileRefreshToken(refreshToken);
    if (!validated) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired session.' }, { status: 401 });
    }

    const referrer = await getReferrerByIrref(validated.irref);
    if (!referrer) {
      await revokeReferrerMobileSessionByRefreshToken(refreshToken);
      return NextResponse.json({ ok: false, error: 'Referrer not found.' }, { status: 404 });
    }
    if (referrer.record.archived?.toLowerCase() === 'true') {
      await revokeReferrerMobileSessionByRefreshToken(refreshToken);
      return NextResponse.json(
        { ok: false, error: 'This referrer account has been archived and portal access is no longer available.' },
        { status: 403 },
      );
    }

    const rotated = await rotateReferrerMobileRefreshToken(validated);
    if (!rotated) {
      return NextResponse.json({ ok: false, error: 'Session rotation failed. Please sign in again.' }, { status: 401 });
    }

    const expectedVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
    const access = issueReferrerMobileAccessToken(referrer.record.irref, expectedVersion);

    const response = NextResponse.json({
      ok: true,
      accessToken: access.accessToken,
      accessTokenExpiresIn: access.accessTokenExpiresIn,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresIn: rotated.refreshTokenExpiresIn,
    });
    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  } catch (error) {
    console.error('Failed to refresh referrer mobile session:', error);
    const mapped = mapReferrerMobileAuthError(error, 'refresh');
    const response = NextResponse.json(
      { ok: false, error: mapped.message },
      { status: mapped.status },
    );
    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  }
}
