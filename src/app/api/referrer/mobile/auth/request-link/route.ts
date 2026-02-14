import { NextRequest, NextResponse } from 'next/server';

import { referrerMobileLoginLink } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { buildReferrerPortalLink, ensureReferrerPortalTokenVersion } from '@/lib/referrerPortalLink';
import {
  buildReferrerMobileAppLink,
  createReferrerMobileLoginToken,
} from '@/lib/referrerMobileAuth';
import { RATE_LIMITS, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { getReferrerByEmail } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type RequestBody = {
  email?: string;
};

function isValidEmail(value: string) {
  return value.includes('@') && value.length >= 5;
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, {
    keyPrefix: 'referrer-mobile-request-link',
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

  const email = String(body.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Valid email is required.' }, { status: 400 });
  }

  try {
    const referrer = await getReferrerByEmail(email);

    // Keep response shape stable to prevent email enumeration.
    if (!referrer || !referrer.record.irref) {
      return NextResponse.json({ ok: true });
    }

    if (referrer.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json({ ok: true });
    }

    const loginToken = await createReferrerMobileLoginToken(referrer.record.irref);
    const appLoginUrl = buildReferrerMobileAppLink(loginToken);
    let fallbackPortalUrl: string | undefined;
    try {
      const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrer.record.irref);
      fallbackPortalUrl = buildReferrerPortalLink(referrer.record.irref, portalTokenVersion);
    } catch (error) {
      console.warn('Unable to build fallback web portal URL for mobile auth email:', error);
    }

    const template = referrerMobileLoginLink({
      name: referrer.record.name || 'there',
      iRref: referrer.record.irref,
      appLoginUrl,
      fallbackPortalUrl,
      locale: referrer.record.locale?.toLowerCase() === 'fr' ? 'fr' : 'en',
    });

    await sendMail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    const response = NextResponse.json({ ok: true });
    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  } catch (error) {
    console.error('Error sending referrer mobile login link:', error);
    const response = NextResponse.json(
      { ok: false, error: 'Unable to send link. Please try again later.' },
      { status: 500 },
    );
    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  }
}
