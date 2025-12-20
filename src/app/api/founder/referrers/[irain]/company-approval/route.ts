import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { updateReferrerCompanyApproval } from '@/lib/sheets';

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

  const body = await request.json().catch(() => ({} as { approval?: string }));
  const approval = String(body.approval || '').trim().toLowerCase();
  if (!approval || (approval !== 'approved' && approval !== 'denied')) {
    return NextResponse.json(
      { ok: false, error: 'Invalid approval value. Use approved or denied.' },
      { status: 400 },
    );
  }

  try {
    const result = await updateReferrerCompanyApproval(params.irain, approval);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      approval: result.companyApproval,
      companyIrcrn: result.companyIrcrn,
    });
  } catch (error) {
    console.error('Error updating referrer company approval', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update company approval.' },
      { status: 500 },
    );
  }
}
