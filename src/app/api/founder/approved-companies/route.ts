import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { listApprovedCompanies } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const companies = await listApprovedCompanies();
    return NextResponse.json({
      ok: true,
      companies: companies.map((company) => ({
        code: company.code,
        name: company.name,
      })),
    });
  } catch (error) {
    console.error('Error listing approved companies', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load approved companies.' },
      { status: 500 },
    );
  }
}
