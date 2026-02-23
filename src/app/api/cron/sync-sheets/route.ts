import { NextRequest, NextResponse } from 'next/server';

import { requireCronAuth } from '@/lib/cronAuth';
import { syncDatabaseToSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResponse = requireCronAuth(request);
  if (authResponse) return authResponse;

  try {
    const result = await syncDatabaseToSheets();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error('Error syncing database to sheets (cron):', error);
    return NextResponse.json(
      { ok: false, error: 'Database to Sheets sync failed' },
      { status: 500 },
    );
  }
}
