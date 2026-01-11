import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { permanentlyDeleteApplicant } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function DELETE(
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
    const result = await permanentlyDeleteApplicant(params.irain);
    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
      }
      if (result.reason === 'not_archived') {
        return NextResponse.json({ ok: false, error: 'Only archived applicants can be permanently deleted' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: 'Unable to delete applicant.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error permanently deleting applicant', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to delete applicant.' },
      { status: 500 },
    );
  }
}
