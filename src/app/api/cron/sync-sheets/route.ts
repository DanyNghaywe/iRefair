import { NextRequest, NextResponse } from 'next/server';

import { requireCronAuth } from '@/lib/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResponse = requireCronAuth(request);
  if (authResponse) return authResponse;

  return NextResponse.json(
    { ok: false, error: 'Cron Sheets sync is disabled. Use founder Sync now.' },
    { status: 410 },
  );
}
