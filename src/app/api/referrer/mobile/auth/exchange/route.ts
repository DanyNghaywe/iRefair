import { NextRequest, NextResponse } from 'next/server';

import {
  consumeReferrerMobileLoginToken,
  issueReferrerMobileSession,
  verifyLegacyReferrerPortalToken,
} from '@/lib/referrerMobileAuth';
import { RATE_LIMITS, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { normalizePortalTokenVersion } from '@/lib/referrerPortalToken';
import { getReferrerByIrref } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type RequestBody = {
  loginToken?: string;
  portalToken?: string;
};

function normalizedRefreshTtlFromPortalToken(exp: number) {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = exp - now;
  if (secondsRemaining <= 0) return 0;
  return Math.max(60, secondsRemaining);
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, {
    keyPrefix: 'referrer-mobile-exchange',
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

  const loginToken = String(body.loginToken || '').trim();
  const portalToken = String(body.portalToken || '').trim();

  if (!loginToken && !portalToken) {
    return NextResponse.json(
      { ok: false, error: 'Missing login credentials.' },
      { status: 400 },
    );
  }

  let irref = '';
  let portalTokenExp: number | undefined;
  let portalTokenVersion: number | undefined;

  if (loginToken) {
    const consumed = await consumeReferrerMobileLoginToken(loginToken);
    if (!consumed?.irref) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired sign-in link.' }, { status: 401 });
    }
    irref = consumed.irref;
  } else {
    try {
      const payload = verifyLegacyReferrerPortalToken(portalToken);
      irref = payload.irref;
      portalTokenExp = payload.exp;
      portalTokenVersion = normalizePortalTokenVersion(String(payload.v));
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid or expired token.' }, { status: 401 });
    }
  }

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found.' }, { status: 404 });
  }

  if (referrer.record.archived?.toLowerCase() === 'true') {
    return NextResponse.json(
      { ok: false, error: 'This referrer account has been archived and portal access is no longer available.' },
      { status: 403 },
    );
  }

  const expectedVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  if (portalToken && portalTokenVersion !== expectedVersion) {
    return NextResponse.json(
      { ok: false, error: 'Session expired. Please request a fresh sign-in link.' },
      { status: 403 },
    );
  }

  const portalTokenRefreshTtl = portalTokenExp ? normalizedRefreshTtlFromPortalToken(portalTokenExp) : undefined;
  if (portalTokenExp && (!portalTokenRefreshTtl || portalTokenRefreshTtl <= 0)) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token.' }, { status: 401 });
  }

  const session = await issueReferrerMobileSession(referrer.record.irref, expectedVersion, {
    userAgent: request.headers.get('user-agent'),
    refreshTtlSeconds: portalTokenRefreshTtl,
    sessionTtlSeconds: portalTokenRefreshTtl,
  });

  const response = NextResponse.json({
    ok: true,
    accessToken: session.accessToken,
    accessTokenExpiresIn: session.accessTokenExpiresIn,
    refreshToken: session.refreshToken,
    refreshTokenExpiresIn: session.refreshTokenExpiresIn,
    referrer: {
      irref: referrer.record.irref,
      name: referrer.record.name,
      email: referrer.record.email,
    },
  });

  rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
  return response;
}
