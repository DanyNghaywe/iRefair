import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { updateApplicationAdmin } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type PatchBody = {
  status?: string;
  ownerNotes?: string;
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body: PatchBody = await request.json().catch(() => ({}));
  const patch: PatchBody = {};

  if ('status' in body) patch.status = body.status ?? '';
  if ('ownerNotes' in body) patch.ownerNotes = body.ownerNotes ?? '';

  try {
    const result = await updateApplicationAdmin(params.id, patch);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    console.error('Error updating application admin fields', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update application.' },
      { status: 500 },
    );
  }
}
