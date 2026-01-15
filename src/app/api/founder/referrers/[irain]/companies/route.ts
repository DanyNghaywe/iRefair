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

  // Map companies to response format
  const mappedCompanies = companies.map((c) => ({
    id: c.id,
    timestamp: c.timestamp,
    companyName: c.companyName,
    companyIrcrn: c.companyIrcrn || null,
    companyApproval: c.companyApproval || 'pending',
    companyIndustry: c.companyIndustry,
    careersPortal: c.careersPortal || null,
    workType: c.workType,
    archived: c.archived === 'true',
  }));

  // Sort: pending first, then by timestamp (newest first)
  mappedCompanies.sort((a, b) => {
    const aIsPending = (a.companyApproval || 'pending').toLowerCase() === 'pending';
    const bIsPending = (b.companyApproval || 'pending').toLowerCase() === 'pending';
    if (aIsPending && !bIsPending) return -1;
    if (!aIsPending && bIsPending) return 1;
    // Within same status, sort by timestamp (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return NextResponse.json({
    ok: true,
    companies: mappedCompanies,
  });
}
