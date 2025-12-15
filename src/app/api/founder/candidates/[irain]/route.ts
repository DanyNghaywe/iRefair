import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { updateCandidateAdmin } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type PatchBody = {
  status?: string;
  ownerNotes?: string;
  tags?: string;
  lastContactedAt?: string;
  nextActionAt?: string;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body: PatchBody = await request.json().catch(() => ({}));
  const patch: PatchBody = {};

  if ('status' in body) patch.status = body.status ?? '';
  if ('ownerNotes' in body) patch.ownerNotes = body.ownerNotes ?? '';
  if ('tags' in body) patch.tags = body.tags ?? '';
  if ('lastContactedAt' in body) patch.lastContactedAt = body.lastContactedAt ?? '';
  if ('nextActionAt' in body) patch.nextActionAt = body.nextActionAt ?? '';

  try {
    const result = await updateCandidateAdmin(params.irain, patch);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Candidate not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    console.error('Error updating candidate admin fields', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update candidate.' },
      { status: 500 },
    );
  }
}
