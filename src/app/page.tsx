'use client';

import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { RoleSelector } from '@/components/RoleSelector/RoleSelector';
import { useLanguage } from '@/components/LanguageProvider';

const translations = {
  en: { srHeading: 'iRefair — Get referred to jobs in Canada' },
  fr: { srHeading: 'iRefair — Obtenez des recommandations pour des emplois au Canada' },
};

export default function LandingPage() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <AppShell variant="transparent">
      <main className="role-picker role-picker--fullscreen">
        <section className="role-shell" aria-labelledby="role-selector-heading">
          <div className="select-panel">
            <h1 id="role-selector-heading" className="sr-only">
              {t.srHeading}
            </h1>
            <RoleSelector />
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
