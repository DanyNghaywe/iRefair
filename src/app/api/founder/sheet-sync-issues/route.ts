import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { listSheetSyncIssues } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const issues = await listSheetSyncIssues();
    return NextResponse.json({ ok: true, issues });
  } catch (error) {
    console.error('Error loading sheet sync issues', error);
    return NextResponse.json({ ok: false, error: 'Unable to load sheet sync issues.' }, { status: 500 });
  }
}
