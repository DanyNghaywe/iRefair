"use client";

import { ActionBtn } from "@/components/ActionBtn";
import { AppShell } from "@/components/AppShell";
import { PublicFooter } from "@/components/PublicFooter";
import { useLanguage } from "@/components/LanguageProvider";

const translations = {
  en: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved. Let's get you back on track.",
    goHome: "Go home",
    findReferrers: "Find referrers",
  },
  fr: {
    title: "Page introuvable",
    description:
      "La page que vous recherchez n'existe pas ou a été déplacée. Revenons à quelque chose d'utile.",
    goHome: "Retour à l'accueil",
    findReferrers: "Trouver des référents",
  },
};

function NotFoundIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="not-found__illustration"
    >
      <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <circle cx="60" cy="60" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.08" />

      {/* Compass/search icon */}
      <circle cx="60" cy="52" r="16" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.4" />
      <path
        d="M72 64L82 74"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />

      {/* Question mark */}
      <path
        d="M56 48c0-3.5 2.5-6 6-6 3.5 0 6 2.5 6 6 0 2.5-2 4-4 5v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="60" r="1.5" fill="currentColor" fillOpacity="0.5" />

      {/* Decorative dots */}
      <circle cx="30" cy="40" r="2" fill="currentColor" fillOpacity="0.15" />
      <circle cx="90" cy="80" r="2" fill="currentColor" fillOpacity="0.15" />
      <circle cx="85" cy="35" r="1.5" fill="currentColor" fillOpacity="0.1" />
      <circle cx="35" cy="85" r="1.5" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

export default function NotFound() {
  const { language, withLanguage } = useLanguage();
  const t = translations[language];

  return (
    <AppShell>
      <main className="not-found">
        <section className="glass-card not-found__card">
          <NotFoundIllustration />
          <div className="not-found__content">
            <p className="not-found__code">404</p>
            <h1 className="not-found__title">{t.title}</h1>
            <p className="not-found__description">{t.description}</p>
            <div className="not-found__actions">
              <ActionBtn as="link" href={withLanguage("/")} variant="primary">
                {t.goHome}
              </ActionBtn>
              <ActionBtn as="link" href={withLanguage("/hiring-companies")} variant="ghost">
                {t.findReferrers}
              </ActionBtn>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
