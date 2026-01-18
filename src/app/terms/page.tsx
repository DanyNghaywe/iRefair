'use client';

import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { useLanguage } from '@/components/LanguageProvider';

const translations = {
  en: {
    eyebrow: 'Terms',
    title: 'Terms of use',
    lead: 'Clear expectations for using iRefair.',
    serviceOverviewTitle: 'Service overview',
    serviceOverviewText:
      'iRefair is a community referral initiative. We help connect applicants and referrers, but we do not guarantee interviews, referrals, or hiring outcomes.',
    responsibilitiesTitle: 'Your responsibilities',
    responsibilitiesItems: [
      'Provide accurate information and keep your details up to date.',
      'Ensure you have the right to share any data you submit.',
      'Follow your employer policies when making or requesting referrals.',
    ],
    questionsTitle: 'Questions',
    questionsText: 'Email us at',
  },
  fr: {
    eyebrow: 'Conditions',
    title: 'Conditions d\'utilisation',
    lead: 'Des attentes claires pour l\'utilisation d\'iRefair.',
    serviceOverviewTitle: 'Aperçu du service',
    serviceOverviewText:
      'iRefair est une initiative communautaire de recommandation. Nous aidons à mettre en relation les candidats et les référents, mais nous ne garantissons pas les entretiens, les recommandations ou les résultats d\'embauche.',
    responsibilitiesTitle: 'Vos responsabilités',
    responsibilitiesItems: [
      'Fournir des informations exactes et maintenir vos coordonnées à jour.',
      'Vous assurer que vous avez le droit de partager toutes les données que vous soumettez.',
      'Respecter les politiques de votre employeur lors de la formulation ou de la demande de recommandations.',
    ],
    questionsTitle: 'Questions',
    questionsText: 'Écrivez-nous à',
  },
};

export default function TermsPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <AppShell>
      <main>
        <section className="card page-card legal-card" aria-labelledby="terms-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 id="terms-title">{t.title}</h2>
              <p className="lead">{t.lead}</p>
            </div>
          </div>

          <div className="legal-stack">
            <section>
              <h3>{t.serviceOverviewTitle}</h3>
              <p>{t.serviceOverviewText}</p>
            </section>

            <section>
              <h3>{t.responsibilitiesTitle}</h3>
              <ul className="legal-list">
                {t.responsibilitiesItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3>{t.questionsTitle}</h3>
              <p className="legal-contact">
                {t.questionsText} <a href="mailto:irefair.andbeyondconsulting@gmail.com">irefair.andbeyondconsulting@gmail.com</a>.
              </p>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
