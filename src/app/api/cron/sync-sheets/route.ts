import { NextRequest, NextResponse } from 'next/server';

import { requireCronAuth } from '@/lib/cronAuth';
import { syncSheetsToDatabase } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResponse = requireCronAuth(request);
  if (authResponse) return authResponse;

  try {
    const result = await syncSheetsToDatabase();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    console.error('Error syncing sheets to database:', error);
    return NextResponse.json({ ok: false, error: 'Sync failed' }, { status: 500 });
  }
}
