import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  APPLICATION_HEADERS,
  APPLICATION_SHEET_NAME,
  CANDIDATE_HEADERS,
  CANDIDATE_SHEET_NAME,
  MATCH_HEADERS,
  MATCH_SHEET_NAME,
  REFERRER_HEADERS,
  REFERRER_SHEET_NAME,
  formatSheet,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await Promise.all([
      formatSheet(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS),
      formatSheet(REFERRER_SHEET_NAME, REFERRER_HEADERS),
      formatSheet(APPLICATION_SHEET_NAME, APPLICATION_HEADERS),
      formatSheet(MATCH_SHEET_NAME, MATCH_HEADERS),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Founder format sheets failed', error);
    return NextResponse.json({ ok: false, error: 'Unable to format sheets.' }, { status: 500 });
  }
}
