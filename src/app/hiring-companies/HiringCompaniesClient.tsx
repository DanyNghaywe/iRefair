'use client';

import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { useLanguage } from '@/components/LanguageProvider';
import { PublicFooter } from '@/components/PublicFooter';
import type { CompanyRow } from '@/lib/hiringCompanies';
import { normalizeHttpUrl } from '@/lib/validation';

type Props = {
  mergedCompanies: CompanyRow[];
};

export function HiringCompaniesClient({ mergedCompanies }: Props) {
  const { withLanguage } = useLanguage();

  return (
    <AppShell>
      <main>
        <section className="card page-card hiring-card" aria-labelledby="hiring-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">Hiring now</p>
              <h2 id="hiring-title">Hiring companies &amp; iRCRN list</h2>
              <p className="lead">Follow these steps to find a suitable role and submit your application through iRefair.</p>
            </div>
          </div>
          <ol className="hiring-steps">
            <li>Review the companies listed in the table below.</li>
            <li>
              Open the <strong>careers website</strong> of the company you are interested in.
            </li>
            <li>
              Choose the position you want to apply for and note the company <strong>iRCRN</strong>.
            </li>
            <li>
              Complete the <strong>Apply Now</strong> form on the iRefair website using your <strong>iRAIN</strong> and the
              company <strong>iRCRN</strong>. Do not apply directly on the company website.
            </li>
          </ol>

          <div className="hiring-table-wrapper table-responsive-cards" aria-labelledby="company-table-title">
            <div className="hiring-table-title" id="company-table-title">
              iRCRN company list
            </div>
            <div className="hiring-table-scroll">
              <table className="hiring-table">
                <thead>
                  <tr>
                    <th scope="col">iRCRN</th>
                    <th scope="col">Company Name</th>
                    <th scope="col">Industry</th>
                    <th scope="col">Careers website</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedCompanies.map((company: CompanyRow) => {
                    const careersUrl = normalizeHttpUrl(company.careersUrl || '');
                    return (
                      <tr key={company.code}>
                        <td data-label="iRCRN">{company.code}</td>
                        <td data-label="Company">{company.name}</td>
                        <td data-label="Industry">{company.industry}</td>
                        <td data-label="Careers" className="td--full">
                          {careersUrl ? (
                            <Link
                              href={careersUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hiring-link"
                              aria-label={`Open careers website for ${company.name}`}
                            >
                              Open careers website
                            </Link>
                          ) : (
                            <span className="hiring-missing">Not provided yet</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="hiring-footnote">
              <strong>iRCRN:</strong> iRefair Company Reference Number
            </p>
          </div>

          <p className="hiring-followup">
            Once you have identified a suitable vacancy, keep the company <strong>iRCRN</strong> and your{' '}
            <strong>iRAIN</strong> ready, then submit your application through the{' '}
            <Link href={withLanguage('/apply')} className="hiring-link hiring-link--cta">
              Apply Now
            </Link>{' '}
            page on iRefair.
          </p>
          <p className="hiring-good-luck">We wish you success with your applications.</p>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
