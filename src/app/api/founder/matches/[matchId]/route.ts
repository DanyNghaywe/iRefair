import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { updateMatch } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type PatchBody = {
  stage?: string;
  notes?: string;
  introSentAt?: string;
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body: PatchBody = await request.json().catch(() => ({}));
  const patch: PatchBody = {};

  if ('stage' in body) patch.stage = body.stage ?? '';
  if ('notes' in body) patch.notes = body.notes ?? '';
  if ('introSentAt' in body) patch.introSentAt = body.introSentAt ?? '';

  try {
    const result = await updateMatch(params.matchId, patch);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Match not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    console.error('Error updating match', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update match.' },
      { status: 500 },
    );
  }
}
