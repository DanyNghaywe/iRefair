"use client";

import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { Topbar } from "@/components/founder/Topbar";

const translations = {
  en: {
    title: "Archive",
    subtitle: "View and manage archived records",
    archivedApplicants: "Archived Applicants",
    archivedApplicantsDesc: "View applicants that have been archived along with their related applications.",
    archivedReferrers: "Archived Referrers",
    archivedReferrersDesc: "View referrers that have been archived along with their related applications.",
    archivedApplications: "Archived Applications",
    archivedApplicationsDesc: "View all archived applications, including those archived via cascade.",
  },
  fr: {
    title: "Archives",
    subtitle: "Afficher et gérer les enregistrements archivés",
    archivedApplicants: "Candidats archivés",
    archivedApplicantsDesc: "Afficher les candidats archivés ainsi que leurs candidatures associées.",
    archivedReferrers: "Référents archivés",
    archivedReferrersDesc: "Afficher les référents archivés ainsi que leurs candidatures associées.",
    archivedApplications: "Candidatures archivées",
    archivedApplicationsDesc: "Afficher toutes les candidatures archivées, y compris celles archivées en cascade.",
  },
};

export default function ArchivePage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="founder-page">
      <Topbar title={t.title} subtitle={t.subtitle} />

      <div className="field-grid field-grid--three">
        <Link href="/founder/archive/applicants" className="card card--link">
          <h3 className="card__title">{t.archivedApplicants}</h3>
          <p className="field-hint">
            {t.archivedApplicantsDesc}
          </p>
        </Link>

        <Link href="/founder/archive/referrers" className="card card--link">
          <h3 className="card__title">{t.archivedReferrers}</h3>
          <p className="field-hint">
            {t.archivedReferrersDesc}
          </p>
        </Link>

        <Link href="/founder/archive/applications" className="card card--link">
          <h3 className="card__title">{t.archivedApplications}</h3>
          <p className="field-hint">
            {t.archivedApplicationsDesc}
          </p>
        </Link>
      </div>
    </div>
  );
}
