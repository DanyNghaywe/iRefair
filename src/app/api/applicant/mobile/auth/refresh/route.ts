import { NextRequest, NextResponse } from 'next/server';

import {
  issueApplicantMobileAccessToken,
  issueStatelessApplicantMobileRefreshToken,
  revokeApplicantMobileSessionByRefreshToken,
  rotateApplicantMobileRefreshToken,
  validateApplicantMobileRefreshToken,
  validateStatelessApplicantMobileRefreshToken,
} from '@/lib/applicantMobileAuth';
import { mapApplicantMobileAuthError } from '@/lib/applicantMobileAuthErrors';
import { RATE_LIMITS, rateLimit, rateLimitHeaders } from '@/lib/rateLimit';
import { findApplicantByIdentifier } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type RequestBody = {
  refreshToken?: string;
};

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, {
    keyPrefix: 'applicant-mobile-refresh',
    ...RATE_LIMITS.applicant,
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
    const statelessValidated = validateStatelessApplicantMobileRefreshToken(refreshToken);
    if (statelessValidated) {
      const applicant = await findApplicantByIdentifier(statelessValidated.irain);
      if (!applicant) {
        return NextResponse.json({ ok: false, error: 'Applicant not found.' }, { status: 404 });
      }
      if (applicant.record.archived?.toLowerCase() === 'true') {
        return NextResponse.json(
          { ok: false, error: 'This applicant account has been archived and portal access is no longer available.' },
          { status: 403 },
        );
      }

      const canonicalIrain = applicant.record.id || statelessValidated.irain;
      const access = issueApplicantMobileAccessToken(canonicalIrain);
      const rotated = issueStatelessApplicantMobileRefreshToken(canonicalIrain);

      const response = NextResponse.json({
        ok: true,
        accessToken: access.accessToken,
        accessTokenExpiresIn: access.accessTokenExpiresIn,
        refreshToken: rotated.refreshToken,
        refreshTokenExpiresIn: rotated.refreshTokenExpiresIn,
      });
      rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
      return response;
    }

    const validated = await validateApplicantMobileRefreshToken(refreshToken);
    if (!validated) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired session.' }, { status: 401 });
    }

    const applicant = await findApplicantByIdentifier(validated.irain);
    if (!applicant) {
      await revokeApplicantMobileSessionByRefreshToken(refreshToken);
      return NextResponse.json({ ok: false, error: 'Applicant not found.' }, { status: 404 });
    }
    if (applicant.record.archived?.toLowerCase() === 'true') {
      await revokeApplicantMobileSessionByRefreshToken(refreshToken);
      return NextResponse.json(
        { ok: false, error: 'This applicant account has been archived and portal access is no longer available.' },
        { status: 403 },
      );
    }

    const rotated = await rotateApplicantMobileRefreshToken(validated);
    if (!rotated) {
      return NextResponse.json({ ok: false, error: 'Session rotation failed. Please sign in again.' }, { status: 401 });
    }

    const canonicalIrain = applicant.record.id || validated.irain;
    const access = issueApplicantMobileAccessToken(canonicalIrain);

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
    console.error('Failed to refresh applicant mobile session:', error);
    const mapped = mapApplicantMobileAuthError(error, 'refresh');
    const response = NextResponse.json(
      { ok: false, error: mapped.message },
      { status: mapped.status },
    );
    rateLimitHeaders(rate).forEach((value, key) => response.headers.set(key, value));
    return response;
  }
}
