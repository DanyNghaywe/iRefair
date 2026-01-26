import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { retrySheetSyncIssue } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function POST(request: NextRequest, context: { params: Params }) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const issueId = context.params.id;
  if (!issueId) {
    return NextResponse.json({ ok: false, error: 'Missing issue id.' }, { status: 400 });
  }

  try {
    const result = await retrySheetSyncIssue(issueId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'Retry failed.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error retrying sheet sync issue', error);
    return NextResponse.json({ ok: false, error: 'Retry failed.' }, { status: 500 });
  }
}
