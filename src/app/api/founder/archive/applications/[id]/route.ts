import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { permanentlyDeleteApplication } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await permanentlyDeleteApplication(params.id);
    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
      }
      if (result.reason === 'not_archived') {
        return NextResponse.json({ ok: false, error: 'Only archived applications can be permanently deleted' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: 'Unable to delete application.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error permanently deleting application', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to delete application.' },
      { status: 500 },
    );
  }
}
