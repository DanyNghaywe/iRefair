'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { Select } from '@/components/Select';

export default function ReferrerPage() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [language, setLanguage] = useState<'en' | 'fr'>('en');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = (formData.get('referrer-name') as string | null)?.trim() || '';

    const payload = {
      name,
      email: (formData.get('referrer-email') as string | null)?.trim() || '',
      targetRoles: (formData.get('target-roles') as string | null)?.trim() || '',
      regions: (formData.get('regions') as string | null)?.trim() || '',
      referralType: (formData.get('referral-type') as string | null)?.trim() || '',
      monthlySlots: (formData.get('monthly-slots') as string | null)?.trim() || '',
    };

    try {
      const response = await fetch('/api/referrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Submission failed');
      }

      setStatus('ok');
    } catch (err) {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board">
        <div className="shell-header">
          <span className="wordmark" aria-label="iRefair">
            iRefair
          </span>
        </div>
        <main>
          <section className="card referrer-card" aria-labelledby="referrer-title">
            <div className="role-switch">
              <span className="role-switch__text">
                {language === 'fr' ? 'Pas référent ?' : 'Not a referrer?'}{' '}
                <Link href="/candidate">{language === 'fr' ? 'Passer au candidat' : 'Switch to candidate'}</Link>
              </span>
            </div>
            <div className="language-toggle" role="group" aria-label="Language">
              <button
                type="button"
                className={`language-toggle__btn ${language === 'en' ? 'is-active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`language-toggle__btn ${language === 'fr' ? 'is-active' : ''}`}
                onClick={() => setLanguage('fr')}
              >
                Français
              </button>
            </div>
            <div className="card-header">
              <div>
                <p className="eyebrow">For referrers</p>
                <h2 id="referrer-title">Referrer referral form</h2>
                <p className="lead">
                  Share the teams, roles, and capacity you have. Log a candidate now or just your availability.
                </p>
              </div>
            </div>

            {status === 'ok' && (
              <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                <span className="status-icon" aria-hidden="true">✓</span>
                <span>We’ve received your details. We’ll reach out when there’s a candidate match.</span>
              </div>
            )}
            {status === 'error' && (
              <div className="status-banner status-banner--error" role="alert" aria-live="assertive">
                <span className="status-icon" aria-hidden="true">!</span>
                <span>We couldn’t send your details right now. Please try again in a moment.</span>
              </div>
            )}

            <form className="referral-form" action="#" method="post" onSubmit={handleSubmit}>
              <fieldset>
                <legend>About you</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="referrer-name">Full name</label>
                    <input
                      id="referrer-name"
                      name="referrer-name"
                      type="text"
                      required
                      aria-describedby="referrer-name-error"
                    />
                    <p className="field-error" id="referrer-name-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="referrer-email">Work email</label>
                    <input
                      id="referrer-email"
                      name="referrer-email"
                      type="email"
                      required
                      aria-describedby="referrer-email-error"
                    />
                    <p className="field-error" id="referrer-email-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="referrer-company">Company</label>
                    <input
                      id="referrer-company"
                      name="referrer-company"
                      type="text"
                      required
                      aria-describedby="referrer-company-error"
                    />
                    <p className="field-error" id="referrer-company-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="referrer-role">Role / team</label>
                    <input
                      id="referrer-role"
                      name="referrer-role"
                      type="text"
                      required
                      aria-describedby="referrer-role-error"
                    />
                    <p className="field-error" id="referrer-role-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="referrer-linkedin">
                      LinkedIn profile <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="referrer-linkedin"
                      name="referrer-linkedin"
                      type="url"
                      aria-describedby="referrer-linkedin-error"
                      placeholder="https://linkedin.com/in/"
                    />
                    <p className="field-error" id="referrer-linkedin-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="referrer-timezone">
                      Location or time zone <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="referrer-timezone"
                      name="referrer-timezone"
                      type="text"
                      aria-describedby="referrer-timezone-error"
                      placeholder="e.g. PST, Remote US"
                    />
                    <p className="field-error" id="referrer-timezone-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Referral capacity</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="referral-type">Referral type</label>
                    <Select
                      id="referral-type"
                      name="referral-type"
                      options={['Internal employee referral', 'Recruiter-led introduction', 'Peer recommendation']}
                      placeholder="Select"
                      required
                      ariaDescribedBy="referral-type-error"
                    />
                    <p className="field-error" id="referral-type-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="monthly-slots">Monthly slots</label>
                    <Select
                      id="monthly-slots"
                      name="monthly-slots"
                      options={['1-3 candidates', '4-8 candidates', '9-15 candidates', 'Unlimited']}
                      placeholder="Select"
                      required
                      ariaDescribedBy="monthly-slots-error"
                    />
                    <p className="field-error" id="monthly-slots-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="target-roles">Teams and roles you cover</label>
                    <textarea
                      id="target-roles"
                      name="target-roles"
                      rows={2}
                      required
                      aria-describedby="target-roles-error"
                      placeholder="e.g. Product Design, Backend (Go/Java), GTM in EMEA"
                    />
                    <p className="field-error" id="target-roles-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="regions">Regions you cover</label>
                    <input
                      id="regions"
                      name="regions"
                      type="text"
                      required
                      aria-describedby="regions-error"
                      placeholder="e.g. US, Canada, Europe"
                    />
                    <p className="field-error" id="regions-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="constraints">
                      Constraints or notes <span className="optional">(optional)</span>
                    </label>
                    <textarea
                      id="constraints"
                      name="constraints"
                      rows={2}
                      aria-describedby="constraints-error"
                      placeholder="e.g. Only full-time roles, no agency work, NDA needed"
                    />
                    <p className="field-error" id="constraints-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Candidate to refer</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="candidate-name">Candidate name</label>
                    <input
                      id="candidate-name"
                      name="candidate-name"
                      type="text"
                      required
                      aria-describedby="candidate-name-error"
                    />
                    <p className="field-error" id="candidate-name-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="candidate-email">Candidate email</label>
                    <input
                      id="candidate-email"
                      name="candidate-email"
                      type="email"
                      required
                      aria-describedby="candidate-email-error"
                    />
                    <p className="field-error" id="candidate-email-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="candidate-role">Recommended role</label>
                    <input
                      id="candidate-role"
                      name="candidate-role"
                      type="text"
                      required
                      aria-describedby="candidate-role-error"
                      placeholder="e.g. Senior Product Designer"
                    />
                    <p className="field-error" id="candidate-role-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="candidate-resume">
                      Resume or portfolio link <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="candidate-resume"
                      name="candidate-resume"
                      type="url"
                      aria-describedby="candidate-resume-error"
                      placeholder="https://link.to/resume"
                    />
                    <p className="field-error" id="candidate-resume-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="candidate-context">Why they stand out</label>
                    <textarea
                      id="candidate-context"
                      name="candidate-context"
                      rows={3}
                      required
                      aria-describedby="candidate-context-error"
                      placeholder="How you know them, achievements, and the type of intro you want to make"
                    />
                    <p className="field-error" id="candidate-context-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <div className="actions">
                <button className="btn primary" type="submit" disabled={submitting} aria-busy={submitting}>
                  {submitting ? (
                    <>
                      Submitting...
                      <span className="loading-indicator" aria-hidden="true" />
                    </>
                  ) : (
                    'Send referrer details'
                  )}
                </button>
                <button className="btn ghost" type="reset">
                  Save progress
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
