import { NextRequest, NextResponse } from 'next/server';

import { revokeApplicantMobileSessionByRefreshToken } from '@/lib/applicantMobileAuth';

export const dynamic = 'force-dynamic';

type RequestBody = {
  refreshToken?: string;
};

export async function POST(request: NextRequest) {
  let body: RequestBody = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const refreshToken = String(body.refreshToken || '').trim();
  if (!refreshToken) {
    return NextResponse.json({ ok: true });
  }

  try {
    await revokeApplicantMobileSessionByRefreshToken(refreshToken);
  } catch (error) {
    console.error('Failed to revoke applicant mobile session:', error);
    return NextResponse.json({ ok: false, error: 'Unable to end session.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
