import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { cleanupExpiredPendingApplicants, listApplicants } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Cleanup expired pending registrations in the background
  cleanupExpiredPendingApplicants().catch((err) => {
    console.error('Error cleaning up expired pending applicants:', err);
  });

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
    const data = await listApplicants({ search, status, eligible, locatedCanada, limit, offset });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Error listing applicants', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load applicants right now.' },
      { status: 500 },
    );
  }
}
