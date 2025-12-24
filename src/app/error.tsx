"use client";

import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { PublicFooter } from "@/components/PublicFooter";

function ErrorIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="error-page__illustration"
    >
      <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <circle cx="60" cy="60" r="44" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" />
      <circle cx="60" cy="60" r="28" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.08" />

      {/* Warning triangle */}
      <path
        d="M60 35L82 75H38L60 35Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.4"
        strokeLinejoin="round"
      />

      {/* Exclamation mark */}
      <path
        d="M60 48v14"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="68" r="2" fill="currentColor" fillOpacity="0.5" />

      {/* Decorative elements */}
      <circle cx="28" cy="45" r="2" fill="currentColor" fillOpacity="0.15" />
      <circle cx="92" cy="75" r="2" fill="currentColor" fillOpacity="0.15" />
      <path
        d="M25 70l6 6M95 40l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <AppShell>
      <main id="main-content" className="error-page">
        <section className="glass-card error-page__card">
          <ErrorIllustration />
          <div className="error-page__content">
            <p className="error-page__code">Error</p>
            <h1 className="error-page__title">Something went wrong</h1>
            <p className="error-page__description">
              We encountered an unexpected issue. This has been logged and we're looking into it.
              Please try again or return to the homepage.
            </p>
            {error.digest && (
              <p className="error-page__digest">
                Reference: <code>{error.digest}</code>
              </p>
            )}
            <div className="error-page__actions">
              <button type="button" className="btn btn-primary" onClick={reset}>
                Try again
              </button>
              <a href="/" className="btn btn-ghost">
                Go home
              </a>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
