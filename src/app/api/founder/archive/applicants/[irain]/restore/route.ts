import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { restoreApplicantByIrain } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await restoreApplicantByIrain(params.irain);
    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
      }
      if (result.reason === 'not_archived') {
        return NextResponse.json({ ok: false, error: 'Applicant is not archived' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: 'Unable to restore applicant.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error restoring applicant', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to restore applicant.' },
      { status: 500 },
    );
  }
}
