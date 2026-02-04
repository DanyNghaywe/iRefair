import { NextResponse } from 'next/server';

import { listApprovedCompanies } from '@/lib/sheets';
import { normalizeHttpUrl } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const companies = await listApprovedCompanies();
  const normalized = companies
    .map((company) => ({
      ...company,
      careersUrl: normalizeHttpUrl(company.careersUrl ?? '') ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return NextResponse.json({ ok: true, companies: normalized });
}
