import { NextRequest, NextResponse } from 'next/server';

import { syncSheetsToDatabase } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncSheetsToDatabase();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error('Error syncing sheets to database:', error);
    return NextResponse.json({ ok: false, error: 'Sync failed' }, { status: 500 });
  }
}
