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

  // Keep iOS sessions independent from the one-time portal link token lifetime.
  const session = await issueReferrerMobileSession(referrer.record.irref, expectedVersion, {
    userAgent: request.headers.get('user-agent'),
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
