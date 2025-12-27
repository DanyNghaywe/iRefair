import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { listMatches } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const stage = searchParams.get('stage') ?? undefined;
  const limit = Number.parseInt(searchParams.get('limit') || '', 10);
  const offset = Number.parseInt(searchParams.get('offset') || '', 10);

  try {
    const data = await listMatches({ search, stage, limit, offset });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Error listing matches', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load matches right now.' },
      { status: 500 },
    );
  }
}
