'use client';

import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { useLanguage } from '@/components/LanguageProvider';

const translations = {
  en: {
    eyebrow: 'Contact',
    title: 'Contact iRefair',
    lead: 'We are here to help with questions or data requests.',
    emailTitle: 'Email',
    emailText: 'Reach us at',
    whatToIncludeTitle: 'What to include',
    whatToInclude: [
      'Your iRAIN or iRREF if available.',
      'The topic (support, privacy, or feedback).',
    ],
  },
  fr: {
    eyebrow: 'Contact',
    title: 'Contacter iRefair',
    lead: 'Nous sommes là pour vous aider avec vos questions ou demandes de données.',
    emailTitle: 'Courriel',
    emailText: 'Écrivez-nous à',
    whatToIncludeTitle: 'Ce qu\'il faut inclure',
    whatToInclude: [
      'Votre iRAIN ou iRREF si disponible.',
      'Le sujet (support, confidentialité ou commentaires).',
    ],
  },
};

export default function ContactPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <AppShell>
      <main>
        <section className="card page-card legal-card" aria-labelledby="contact-title">
          <div className="card-header">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 id="contact-title">{t.title}</h2>
              <p className="lead">{t.lead}</p>
            </div>
          </div>

          <div className="legal-stack">
            <section>
              <h3>{t.emailTitle}</h3>
              <p className="legal-contact">
                {t.emailText} <a href="mailto:irefair@andbeyondca.com">irefair@andbeyondca.com</a>.
              </p>
            </section>

            <section>
              <h3>{t.whatToIncludeTitle}</h3>
              <ul className="legal-list">
                {t.whatToInclude.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
