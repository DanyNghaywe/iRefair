import type { Metadata } from 'next';
import { companies, type CompanyRow } from '@/lib/hiringCompanies';
import { listApprovedReferrerCompanies } from '@/lib/sheets';
import { HiringCompaniesClient } from './HiringCompaniesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'iRefair | Hiring companies & iRCRN list',
  description: 'Steps to apply plus the latest iRefair company reference numbers (iRCRN) and career site links.',
};

export default async function HiringCompaniesPage() {
  const approved = await listApprovedReferrerCompanies();
  const mergedMap = new Map<string, CompanyRow>();
  for (const company of companies) {
    mergedMap.set(company.code, company);
  }
  for (const company of approved) {
    if (!mergedMap.has(company.code)) {
      mergedMap.set(company.code, company);
    }
  }
  const mergedCompanies = Array.from(mergedMap.values());

  return <HiringCompaniesClient mergedCompanies={mergedCompanies} />;
}
