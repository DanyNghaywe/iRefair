import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { listReferrerCompanies, getReferrerByIrref } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const irref = params.irain;

  // Verify referrer exists
  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  // Get all companies for this referrer
  const companies = await listReferrerCompanies(irref);

  return NextResponse.json({
    ok: true,
    companies: companies.map((c) => ({
      id: c.id,
      timestamp: c.timestamp,
      companyName: c.companyName,
      companyIrcrn: c.companyIrcrn || null,
      companyApproval: c.companyApproval || 'pending',
      companyIndustry: c.companyIndustry,
      careersPortal: c.careersPortal || null,
      workType: c.workType,
      archived: c.archived === 'true',
    })),
  });
}
