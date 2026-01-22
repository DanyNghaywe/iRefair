'use client';

import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { useLanguage } from '@/components/LanguageProvider';

const translations = {
  en: {
    eyebrow: 'Privacy',
    title: 'Privacy policy',
    lead: 'A short summary of how iRefair collects and uses data.',
    dataWeCollectTitle: 'Data we collect',
    dataWeCollectItems: [
      'Contact details: name, email, phone, and LinkedIn URL.',
      'Referral and company details: role focus, availability, and company info.',
      'Application data: iRAIN/iRCRN, position details, and uploaded CVs.',
    ],
    cvStorageTitle: 'How CVs are stored and used',
    cvStorageText:
      'CVs are stored securely and used only to validate applications and support referrals. Access is limited to the iRefair operations team and is shared with a referrer or company only when needed for an applicant application.',
    contactTitle: 'Contact',
    contactText: 'Email us at',
    contactSuffix: 'for data requests or questions.',
  },
  fr: {
    eyebrow: 'Confidentialité',
    title: 'Politique de confidentialité',
    lead: 'Un bref résumé de la façon dont iRefair collecte et utilise les données.',
    dataWeCollectTitle: 'Données que nous collectons',
    dataWeCollectItems: [
      'Coordonnées : nom, courriel, téléphone et URL LinkedIn.',
      'Détails de recommandation et d\'entreprise : orientation du poste, disponibilité et informations sur l\'entreprise.',
      'Données de candidature : iRAIN/iRCRN, détails du poste et CV téléchargés.',
    ],
    cvStorageTitle: 'Comment les CV sont stockés et utilisés',
    cvStorageText:
      'Les CV sont stockés de manière sécurisée et utilisés uniquement pour valider les candidatures et soutenir les recommandations. L\'accès est limité à l\'équipe opérationnelle d\'iRefair et n\'est partagé avec un référent ou une entreprise que lorsque cela est nécessaire pour une candidature.',
    contactTitle: 'Contact',
    contactText: 'Écrivez-nous à',
    contactSuffix: 'pour les demandes de données ou les questions.',
  },
};

export default function PrivacyPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <AppShell>
      <main>
        <section className="card page-card legal-card" aria-labelledby="privacy-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 id="privacy-title">{t.title}</h2>
              <p className="lead">{t.lead}</p>
            </div>
          </div>

          <div className="legal-stack">
            <section>
              <h3>{t.dataWeCollectTitle}</h3>
              <ul className="legal-list">
                {t.dataWeCollectItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3>{t.cvStorageTitle}</h3>
              <p>{t.cvStorageText}</p>
            </section>

            <section>
              <h3>{t.contactTitle}</h3>
              <p className="legal-contact">
                {t.contactText} <a href="mailto:irefair@andbeyondca.com">irefair@andbeyondca.com</a> {t.contactSuffix}
              </p>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
