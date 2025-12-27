import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { listCandidates } from '@/lib/sheets';

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
  const locatedCanada = searchParams.get('locatedCanada') ?? undefined;
  const eligibleParam = searchParams.get('eligible');
  const limit = Number.parseInt(searchParams.get('limit') || '', 10);
  const offset = Number.parseInt(searchParams.get('offset') || '', 10);

  const eligible =
    eligibleParam === null
      ? undefined
      : eligibleParam.toLowerCase() === 'true'
        ? true
        : eligibleParam.toLowerCase() === 'false'
          ? false
          : undefined;

  try {
    const data = await listCandidates({ search, status, eligible, locatedCanada, limit, offset });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Error listing candidates', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load candidates right now.' },
      { status: 500 },
    );
  }
}
