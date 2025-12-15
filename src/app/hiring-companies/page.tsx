import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { companies, type CompanyRow } from '@/lib/hiringCompanies';

export const metadata: Metadata = {
  title: 'iRefair | Hiring companies & iRCRN list',
  description: 'Steps to apply plus the latest iRefair company reference numbers (iRCRN) and career site links.',
};

export default function HiringCompaniesPage() {
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

          <div className="hiring-table-wrapper" aria-labelledby="company-table-title">
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
                  {companies.map((company: CompanyRow) => (
                    <tr key={company.code}>
                      <td>{company.code}</td>
                      <td>{company.name}</td>
                      <td>{company.industry}</td>
                      <td>
                        {company.careersUrl ? (
                          <Link
                            href={company.careersUrl}
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
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hiring-footnote">
              <strong>iRCRN:</strong> iRefair Company Reference Number
            </p>
          </div>

          <p className="hiring-followup">
            Once you have identified a suitable vacancy, keep the company <strong>iRCRN</strong> and your <strong>iRAIN</strong>{' '}
            ready, then submit your application through the{' '}
            <Link href="/apply" className="hiring-link hiring-link--cta">
              Apply Now
            </Link>{' '}
            page on iRefair.
          </p>
          <p className="hiring-good-luck">We wish you success with your applications.</p>
        </section>
      </main>
    </AppShell>
  );
}
