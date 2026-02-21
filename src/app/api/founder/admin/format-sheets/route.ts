import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    { ok: false, error: 'Sheet formatting endpoint is disabled in SQL-only mode.' },
    { status: 410 },
  );
}
