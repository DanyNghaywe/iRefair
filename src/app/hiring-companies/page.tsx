import type { Metadata } from 'next';
import { listApprovedCompanies } from '@/lib/sheets';
import { HiringCompaniesClient } from './HiringCompaniesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'iRefair | Hiring companies & iRCRN list',
  description: 'Steps to apply plus the latest iRefair company reference numbers (iRCRN) and career site links.',
};

export default async function HiringCompaniesPage() {
  // listApprovedCompanies checks new Referrer Companies sheet first,
  // falls back to legacy Referrers sheet if new sheet is empty
  const companies = await listApprovedCompanies();

  return <HiringCompaniesClient mergedCompanies={companies} />;
}
