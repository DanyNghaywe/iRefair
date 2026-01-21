import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { getFounderStatsCounts } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { applicants, referrers, applications } = await getFounderStatsCounts(since);

    return NextResponse.json({
      ok: true,
      applicants,
      referrers,
      applications,
      since: since.toISOString(),
    });
  } catch (error) {
    console.error('Error loading founder stats', error);
    return NextResponse.json({ ok: false, error: 'Unable to load stats.' }, { status: 500 });
  }
}
