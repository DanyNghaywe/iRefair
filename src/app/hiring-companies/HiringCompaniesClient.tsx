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

type Language = 'en' | 'fr';

const translations: Record<
  Language,
  {
    eyebrow: string;
    title: string;
    lead: string;
    steps: string[];
    tableTitle: string;
    columnIrcn: string;
    columnCompany: string;
    columnIndustry: string;
    columnCareers: string;
    openCareers: string;
    openCareersAriaLabel: (company: string) => string;
    notProvided: string;
    pageOf: (current: number, total: number) => string;
    footnote: string;
    followup: { before: string; middle: string; after: string };
    applyNow: string;
    followupSuffix: string;
    goodLuck: string;
    languageLabel: string;
    english: string;
    french: string;
    firstPage: string;
    prevPage: string;
    nextPage: string;
    lastPage: string;
  }
> = {
  en: {
    eyebrow: 'Hiring now',
    title: 'Hiring companies & iRCRN list',
    lead: 'Follow these steps to find a suitable role and submit your application through iRefair.',
    steps: [
      'Review the companies listed in the table below.',
      'Open the <strong>careers website</strong> of the company you are interested in.',
      'Choose the position you want to apply for and note the company <strong>iRCRN</strong>.',
      'Complete the <strong>Apply Now</strong> form on the iRefair website using your <strong>iRAIN</strong> and the company <strong>iRCRN</strong>. Do not apply directly on the company website.',
    ],
    tableTitle: 'iRCRN company list',
    columnIrcn: 'iRCRN',
    columnCompany: 'Company Name',
    columnIndustry: 'Industry',
    columnCareers: 'Careers website',
    openCareers: 'Open careers website',
    openCareersAriaLabel: (company: string) => `Open careers website for ${company}`,
    notProvided: 'Not provided yet',
    pageOf: (current: number, total: number) => `Page ${current} of ${total}`,
    footnote: 'iRCRN: iRefair Company Reference Number',
    followup: {
      before: 'Once you have identified a suitable vacancy, keep the company ',
      middle: ' and your ',
      after: ' ready, then submit your application through the ',
    },
    applyNow: 'Apply Now',
    followupSuffix: ' page on iRefair.',
    goodLuck: 'We wish you success with your applications.',
    languageLabel: 'Language',
    english: 'English',
    french: 'Français',
    firstPage: 'Go to first page',
    prevPage: 'Go to previous page',
    nextPage: 'Go to next page',
    lastPage: 'Go to last page',
  },
  fr: {
    eyebrow: 'Embauche en cours',
    title: 'Entreprises qui recrutent et liste iRCRN',
    lead: 'Suivez ces étapes pour trouver un poste adapté et soumettre votre candidature via iRefair.',
    steps: [
      'Consultez les entreprises listées dans le tableau ci-dessous.',
      'Ouvrez le <strong>site carrières</strong> de l\'entreprise qui vous intéresse.',
      'Choisissez le poste auquel vous souhaitez postuler et notez le <strong>iRCRN</strong> de l\'entreprise.',
      'Remplissez le formulaire <strong>Postuler maintenant</strong> sur le site iRefair en utilisant votre <strong>iRAIN</strong> et le <strong>iRCRN</strong> de l\'entreprise. Ne postulez pas directement sur le site de l\'entreprise.',
    ],
    tableTitle: 'Liste des entreprises iRCRN',
    columnIrcn: 'iRCRN',
    columnCompany: 'Nom de l\'entreprise',
    columnIndustry: 'Secteur',
    columnCareers: 'Site carrières',
    openCareers: 'Ouvrir le site carrières',
    openCareersAriaLabel: (company: string) => `Ouvrir le site carrières de ${company}`,
    notProvided: 'Non fourni',
    pageOf: (current: number, total: number) => `Page ${current} sur ${total}`,
    footnote: 'iRCRN : Numéro de référence d\'entreprise iRefair',
    followup: {
      before: 'Une fois que vous avez identifié un poste approprié, gardez le ',
      middle: ' de l\'entreprise et votre ',
      after: ' à portée de main, puis soumettez votre candidature via la page ',
    },
    applyNow: 'Postuler maintenant',
    followupSuffix: '.',
    goodLuck: 'Nous vous souhaitons beaucoup de succès dans vos candidatures.',
    languageLabel: 'Langue',
    english: 'English',
    french: 'Français',
    firstPage: 'Aller à la première page',
    prevPage: 'Aller à la page précédente',
    nextPage: 'Aller à la page suivante',
    lastPage: 'Aller à la dernière page',
  },
};

const PAGE_SIZE = 20;

export function HiringCompaniesClient({ mergedCompanies }: Props) {
  const { language, setLanguage, withLanguage } = useLanguage();
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

  const t = translations[language];

  return (
    <AppShell>
      <main>
        <section className="card page-card hiring-card" aria-labelledby="hiring-title">
          <div className="language-toggle" role="group" aria-label={t.languageLabel}>
            <button
              type="button"
              className={`language-toggle__btn ${language === 'en' ? 'is-active' : ''}`}
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
            >
              {t.english}
            </button>
            <button
              type="button"
              className={`language-toggle__btn ${language === 'fr' ? 'is-active' : ''}`}
              onClick={() => setLanguage('fr')}
              aria-pressed={language === 'fr'}
            >
              {t.french}
            </button>
          </div>
          <div className="card-header">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 id="hiring-title">{t.title}</h2>
              <p className="lead">{t.lead}</p>
            </div>
          </div>
          <ol className="hiring-steps">
            {t.steps.map((step, index) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: step }} />
            ))}
          </ol>

          <div className="hiring-table-wrapper table-responsive-cards" aria-labelledby="company-table-title">
            <div className="hiring-table-title" id="company-table-title">
              {t.tableTitle}
            </div>
            <div className="hiring-table-scroll">
              <table className="hiring-table">
                <thead>
                  <tr>
                    <th scope="col">{t.columnIrcn}</th>
                    <th scope="col">{t.columnCompany}</th>
                    <th scope="col">{t.columnIndustry}</th>
                    <th scope="col">{t.columnCareers}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCompanies.map((company: CompanyRow) => {
                    const careersUrl = normalizeHttpUrl(company.careersUrl || '');
                    return (
                      <tr key={company.code}>
                        <td data-label={t.columnIrcn}>{company.code}</td>
                        <td data-label={t.columnCompany}>{company.name}</td>
                        <td data-label={t.columnIndustry}>{company.industry}</td>
                        <td data-label={t.columnCareers} className="td--full">
                          {careersUrl ? (
                            <button
                              type="button"
                              className="hiring-link hiring-link--btn"
                              aria-label={t.openCareersAriaLabel(company.name)}
                              onClick={() => handleOpenCareersClick(company.name, careersUrl)}
                            >
                              {t.openCareers}
                            </button>
                          ) : (
                            <span className="hiring-missing">{t.notProvided}</span>
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
                  aria-label={t.firstPage}
                >
                  &laquo;
                </button>
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  aria-label={t.prevPage}
                >
                  &lsaquo;
                </button>
                <span className="hiring-pagination-info">
                  {t.pageOf(validPage, totalPages)}
                </span>
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  aria-label={t.nextPage}
                >
                  &rsaquo;
                </button>
                <button
                  type="button"
                  className="hiring-pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validPage === totalPages}
                  aria-label={t.lastPage}
                >
                  &raquo;
                </button>
              </div>
            )}
            <p className="hiring-footnote">
              <strong>{t.columnIrcn}:</strong> {t.footnote.split(': ')[1]}
            </p>
          </div>

          <p className="hiring-followup">
            {t.followup.before}
            <strong>iRCRN</strong>
            {t.followup.middle}
            <strong>iRAIN</strong>
            {t.followup.after}
            <Link href={withLanguage('/apply')} className="hiring-link hiring-link--cta">
              {t.applyNow}
            </Link>
            {t.followupSuffix}
          </p>
          <p className="hiring-good-luck">{t.goodLuck}</p>
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
