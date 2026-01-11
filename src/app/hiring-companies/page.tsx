import type { Metadata } from 'next';
import { listApprovedReferrerCompanies } from '@/lib/sheets';
import { HiringCompaniesClient } from './HiringCompaniesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'iRefair | Hiring companies & iRCRN list',
  description: 'Steps to apply plus the latest iRefair company reference numbers (iRCRN) and career site links.',
};

export default async function HiringCompaniesPage() {
  const companies = await listApprovedReferrerCompanies();

  return <HiringCompaniesClient mergedCompanies={companies} />;
}
