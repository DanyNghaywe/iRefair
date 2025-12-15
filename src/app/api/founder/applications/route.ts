import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { listApplications } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const ircrn = searchParams.get('ircrn') ?? undefined;
  const limit = Number.parseInt(searchParams.get('limit') || '', 10);
  const offset = Number.parseInt(searchParams.get('offset') || '', 10);

  try {
    const data = await listApplications({ search, status, ircrn, limit, offset });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Error listing applications', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load applications right now.' },
      { status: 500 },
    );
  }
}
