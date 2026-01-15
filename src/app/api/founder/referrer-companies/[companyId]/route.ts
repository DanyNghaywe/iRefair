import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { updateReferrerCompanyFields } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({} as Record<string, string>));
  const companyId = params.companyId;

  const patch: Record<string, string> = {};
  if (typeof body.companyName === 'string') patch.companyName = body.companyName;
  if (typeof body.companyIndustry === 'string') patch.companyIndustry = body.companyIndustry;
  if (typeof body.careersPortal === 'string') patch.careersPortal = body.careersPortal;
  if (typeof body.workType === 'string') patch.workType = body.workType;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, message: 'No changes' });
  }

  try {
    const result = await updateReferrerCompanyFields(companyId, patch);
    if (!result.updated) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: 'Failed to update company' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating company fields', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update company.' },
      { status: 500 },
    );
  }
}
