'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { CareersWarningModal } from '@/components/CareersWarningModal';
import { useLanguage } from '@/components/LanguageProvider';
import { PublicFooter } from '@/components/PublicFooter';
import type { CompanyRow } from '@/lib/hiringCompanies';
import { normalizeHttpUrl } from '@/lib/validation';

type Props = {
  mergedCompanies: CompanyRow[];
};

const PAGE_SIZE = 20;

export function HiringCompaniesClient({ mergedCompanies }: Props) {
  const { withLanguage } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [selectedCareersUrl, setSelectedCareersUrl] = useState('');
  const [modalKey, setModalKey] = useState(0);

  const totalPages = Math.ceil(mergedCompanies.length / PAGE_SIZE);
  const validPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedCompanies = useMemo(() => {
    const startIndex = (validPage - 1) * PAGE_SIZE;
    return mergedCompanies.slice(startIndex, startIndex + PAGE_SIZE);
  }, [mergedCompanies, validPage]);

  const handleOpenCareersClick = (companyName: string, careersUrl: string) => {
    setSelectedCompanyName(companyName);
    setSelectedCareersUrl(careersUrl);
    setModalKey((k) => k + 1);
    setWarningOpen(true);
  };

  const handleCloseWarning = () => {
    setWarningOpen(false);
    setSelectedCompanyName('');
    setSelectedCareersUrl('');
  };

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
                  {paginatedCompanies.map((company: CompanyRow) => {
                    const careersUrl = normalizeHttpUrl(company.careersUrl || '');
                    return (
                      <tr key={company.code}>
                        <td data-label="iRCRN">{company.code}</td>
                        <td data-label="Company">{company.name}</td>
                        <td data-label="Industry">{company.industry}</td>
                        <td data-label="Careers" className="td--full">
                          {careersUrl ? (
                            <button
                              type="button"
                              className="hiring-link hiring-link--btn"
                              aria-label={`Open careers website for ${company.name}`}
                              onClick={() => handleOpenCareersClick(company.name, careersUrl)}
                            >
                              Open careers website
                            </button>
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
            {totalPages > 1 && (
              <div className="hiring-pagination">
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={validPage === 1}
                  aria-label="Go to first page"
                >
                  &laquo;
                </button>
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  aria-label="Go to previous page"
                >
                  &lsaquo;
                </button>
                <span className="hiring-pagination-info">
                  Page {validPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  aria-label="Go to next page"
                >
                  &rsaquo;
                </button>
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validPage === totalPages}
                  aria-label="Go to last page"
                >
                  &raquo;
                </button>
              </div>
            )}
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

      <CareersWarningModal
        key={modalKey}
        open={warningOpen}
        onClose={handleCloseWarning}
        companyName={selectedCompanyName}
        careersUrl={selectedCareersUrl}
      />
    </AppShell>
  );
}
