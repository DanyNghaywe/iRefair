import type { Metadata } from 'next';
import Link from 'next/link';
import { ParticlesBackground } from '@/components/ParticlesBackground';

type CompanyRow = {
  code: string;
  name: string;
  industry: string;
  careersUrl?: string;
};

const companies: CompanyRow[] = [
  {
    code: 'iRCRN0000000001',
    name: 'Whish Money Canada',
    industry: 'FinTech',
  },
  {
    code: 'iRCRN0000000002',
    name: 'Primerica',
    industry: 'Financial services and Insurance',
    careersUrl: 'https://primerica.wd1.myworkdayjobs.com/PRI',
  },
  {
    code: 'iRCRN0000000003',
    name: 'Dayforce',
    industry: 'Technology',
    careersUrl: 'https://jobs.dayforcehcm.com/en-US/mydayforce/alljobs',
  },
  {
    code: 'iRCRN0000000004',
    name: 'Scotia Bank',
    industry: 'Finance, Consulting',
    careersUrl: 'https://jobs.scotiabank.com/search/?createNewAlert=false&q=&locationsearch=canada',
  },
  {
    code: 'iRCRN0000000005',
    name: 'Nextcare',
    industry: 'Healthcare',
  },
  {
    code: 'iRCRN0000000007',
    name: 'Kuehne+Nagel',
    industry: 'Logistics',
    careersUrl: 'https://jobs.kuehne-nagel.com/global/en',
  },
  {
    code: 'iRCRN0000000008',
    name: 'T360 Pay',
    industry: 'Technology, Finance',
    careersUrl: 'https://t360pay.com/contact-us/',
  },
  {
    code: 'iRCRN0000000011',
    name: 'KPMG',
    industry: 'Consulting, Compliance / Audit',
    careersUrl: 'https://careers.kpmg.ca/professionals/jobs?page=1',
  },
  {
    code: 'iRCRN0000000012',
    name: 'Maples Group',
    industry: 'Finance, Compliance / Audit',
    careersUrl:
      'https://maplesgroupcareers.ttcportals.com/search/jobs?ns_page=financial&cfm3=The%20Maples%20Group%20(Financial%20Services)',
  },
  {
    code: 'iRCRN0000000013',
    name: 'CLV Group Inc.',
    industry: 'Rental',
    careersUrl: 'https://clvgroup.bamboohr.com/careers',
  },
  {
    code: 'iRCRN0000000015',
    name: 'Sobencom',
    industry: 'Healthcare',
  },
];

export const metadata: Metadata = {
  title: 'iRefair | Hiring companies & iRCRN list',
  description: 'Steps to apply plus the latest iRefair company reference numbers (iRCRN) and career site links.',
};

export default function HiringCompaniesPage() {
  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board">
        <main>
          <section className="card page-card hiring-card" aria-labelledby="hiring-title">
            <div className="card-header">
              <div>
                <p className="eyebrow">Hiring now</p>
                <h2 id="hiring-title">Hiring companies &amp; iRCRN list</h2>
                <p className="lead">
                  Follow these steps to find a suitable role and submit your application through iRefair.
                </p>
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
                Complete the <strong>Apply Now</strong> form on the iRefair website using your <strong>iRAIN</strong> and
                the company <strong>iRCRN</strong>. Do not apply directly on the company website.
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
                    {companies.map((company) => (
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
              Once you have identified a suitable vacancy, keep the company <strong>iRCRN</strong> and your{' '}
              <strong>iRAIN</strong> ready, then submit your application through the{' '}
              <Link href="/apply" className="hiring-link hiring-link--cta">
                Apply Now
              </Link>{' '}
              page on iRefair.
            </p>
            <p className="hiring-good-luck">We wish you success with your applications.</p>
          </section>
        </main>
      </div>
    </div>
  );
}
