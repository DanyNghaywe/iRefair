'use client';

import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { RoleSelector } from '@/components/RoleSelector/RoleSelector';
import { useLanguage } from '@/components/LanguageProvider';

const translations = {
  en: {
    srHeading: 'iRefair - Get referred to jobs in Canada',
    languageLabel: 'Language',
    english: 'English',
    french: 'Français',
  },
  fr: {
    srHeading: 'iRefair - Obtenez des recommandations pour des emplois au Canada',
    languageLabel: 'Langue',
    english: 'English',
    french: 'Français',
  },
};

export default function LandingPage() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  return (
    <AppShell variant="transparent">
      <main className="role-picker role-picker--fullscreen">
        <section className="role-shell" aria-labelledby="role-selector-heading">
          <div className="select-panel">
            <h1 id="role-selector-heading" className="sr-only">
              {t.srHeading}
            </h1>
            <div className="landing-language-row">
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
            </div>
            <RoleSelector />
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
