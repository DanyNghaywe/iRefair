import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    return NextResponse.json({ ok: false, error: 'Missing GOOGLE_SHEETS_SPREADSHEET_ID' }, { status: 500 });
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  return NextResponse.redirect(url);
}
