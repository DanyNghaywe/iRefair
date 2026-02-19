import { timingSafeEqual } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { hashApplicantSecret } from '@/lib/applicantUpdateToken';
import {
  issueApplicantMobileSession,
  issueStatelessApplicantMobileSession,
  type IssuedApplicantMobileSession,
} from '@/lib/applicantMobileAuth';
import {
  isApplicantMobileSessionStoreUnavailable,
  mapApplicantMobileAuthError,
} from '@/lib/applicantMobileAuthErrors';
import { RATE_LIMITS, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { findApplicantByIdentifier } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type RequestBody = {
  applicantId?: string;
  applicantKey?: string;
};

function normalize(value: string | undefined) {
  return (value || '').trim();
}

function safeEqualHex(left: string, right: string) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, {
    keyPrefix: 'applicant-mobile-exchange',
    ...RATE_LIMITS.applicant,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  try {
    let body: RequestBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
    }

    const applicantId = normalize(body.applicantId);
    const applicantKey = normalize(body.applicantKey);

    if (!applicantId || !applicantKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing applicant credentials.' },
        { status: 400 },
      );
    }

    const applicant = await findApplicantByIdentifier(applicantId);
    if (!applicant) {
      return NextResponse.json({ ok: false, error: 'Applicant not found.' }, { status: 404 });
    }

    if (applicant.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json(
        { ok: false, error: 'This applicant account has been archived and portal access is no longer available.' },
        { status: 403 },
      );
    }

    const storedKeyHash = normalize(applicant.record.applicantSecretHash).toLowerCase();
    const providedKeyHash = hashApplicantSecret(applicantKey).toLowerCase();

    if (!safeEqualHex(storedKeyHash, providedKeyHash)) {
      return NextResponse.json({ ok: false, error: 'Invalid applicant credentials.' }, { status: 401 });
    }

    const canonicalIrain = normalize(applicant.record.id) || applicantId;

    let session: IssuedApplicantMobileSession;
    try {
      session = await issueApplicantMobileSession(canonicalIrain, {
        userAgent: request.headers.get('user-agent'),
      });
    } catch (error) {
      if (!isApplicantMobileSessionStoreUnavailable(error)) {
        throw error;
      }
      console.warn('Applicant mobile session store unavailable, using stateless session fallback.', {
        irain: canonicalIrain,
        error,
      });
      session = issueStatelessApplicantMobileSession(canonicalIrain);
    }

    const response = NextResponse.json({
      ok: true,
      accessToken: session.accessToken,
      accessTokenExpiresIn: session.accessTokenExpiresIn,
      refreshToken: session.refreshToken,
      refreshTokenExpiresIn: session.refreshTokenExpiresIn,
      applicant: {
        irain: canonicalIrain,
        firstName: applicant.record.firstName || '',
        lastName: applicant.record.familyName || '',
        email: applicant.record.email || '',
      },
    });

    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  } catch (error) {
    console.error('Failed to exchange applicant mobile session:', error);
    const mapped = mapApplicantMobileAuthError(error, 'exchange');
    const response = NextResponse.json(
      { ok: false, error: mapped.message },
      { status: mapped.status },
    );
    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  }
}
