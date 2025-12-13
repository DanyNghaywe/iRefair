import { NextResponse } from 'next/server';
import {
  formatSheet,
  CANDIDATE_HEADERS,
  REFERRER_HEADERS,
  CANDIDATE_SHEET_NAME,
  REFERRER_SHEET_NAME,
} from '@/lib/sheets';

export async function GET(request: Request) {
  const token = request.headers.get('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await formatSheet(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);
    await formatSheet(REFERRER_SHEET_NAME, REFERRER_HEADERS);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin format-sheets error', error);
    return NextResponse.json({ ok: false, error: 'Failed to format sheets' }, { status: 500 });
  }
}
