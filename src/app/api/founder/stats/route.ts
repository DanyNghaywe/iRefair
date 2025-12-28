import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { APPLICATION_SHEET_NAME, APPLICANT_SHEET_NAME, MATCH_SHEET_NAME, REFERRER_SHEET_NAME, countApplicationsSince, countRowsInSheet } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [applicants, referrers, matches, applications] = await Promise.all([
      countRowsInSheet(APPLICANT_SHEET_NAME),
      countRowsInSheet(REFERRER_SHEET_NAME),
      countRowsInSheet(MATCH_SHEET_NAME),
      countApplicationsSince(since),
    ]);

    return NextResponse.json({
      ok: true,
      applicants,
      referrers,
      applications,
      matches,
      since: since.toISOString(),
    });
  } catch (error) {
    console.error('Error loading founder stats', error);
    return NextResponse.json({ ok: false, error: 'Unable to load stats.' }, { status: 500 });
  }
}
