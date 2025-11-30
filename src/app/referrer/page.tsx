'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ParticlesBackground } from '@/components/ParticlesBackground';

export default function ReferrerPage() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess('');
    setError('');
    setSubmitting(true);
    timeoutRef.current = setTimeout(() => {
      setSubmitting(false);
      setSuccess('Details received. We will reach out when a candidate match is ready.');
    }, 1200);
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
                Not a referrer? <Link href="/candidate">Switch to candidate</Link>
              </span>
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

            {success && (
              <div className="status-banner" role="status" aria-live="polite">
                <span className="badge success">{success}</span>
              </div>
            )}
            {error && (
              <div className="status-banner error" role="alert" aria-live="assertive">
                <span className="badge danger">{error}</span>
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
                    <select
                      id="referral-type"
                      name="referral-type"
                      required
                      defaultValue=""
                      aria-describedby="referral-type-error"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option>Internal employee referral</option>
                      <option>Recruiter-led introduction</option>
                      <option>Peer recommendation</option>
                    </select>
                    <p className="field-error" id="referral-type-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="monthly-slots">Monthly slots</label>
                    <select
                      id="monthly-slots"
                      name="monthly-slots"
                      required
                      defaultValue=""
                      aria-describedby="monthly-slots-error"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option>1-3 candidates</option>
                      <option>4-8 candidates</option>
                      <option>9-15 candidates</option>
                      <option>Unlimited</option>
                    </select>
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

            <div className="referrer-metrics" aria-label="Referrer quick stats">
              <div className="metric-card">
                <p className="metric-label">Match time</p>
                <p className="metric-value">48h</p>
                <p className="metric-note">We only pair candidates that fit your teams and bandwidth.</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Privacy</p>
                <p className="metric-value">Private</p>
                <p className="metric-note">We keep your details hidden until you accept a match.</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Availability</p>
                <p className="metric-value">Open</p>
                <p className="metric-note">Update us anytime if you need to pause referrals or adjust slots.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
