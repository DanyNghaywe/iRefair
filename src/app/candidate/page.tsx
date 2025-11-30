'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ParticlesBackground } from '@/components/ParticlesBackground';

export default function CandidatePage() {
  const [resumeName, setResumeName] = useState('');
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResumeName(file ? file.name : '');
  };

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
      setSuccess('Request sent. We will notify you when a referrer is available.');
    }, 1200);
  };

  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board">
        <main>
          <section className="card referral-card" aria-labelledby="referral-title">
            <div className="card-header">
              <div>
                <p className="eyebrow">For candidates</p>
                <h2 id="referral-title">Request a referral match</h2>
                <p className="lead">
                  Tell us your background and target roles. We&apos;ll pair you with referrers when they&apos;re available.
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
                <legend>Your details</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="full-name">Full name</label>
                    <input id="full-name" name="full-name" type="text" required aria-describedby="full-name-error" />
                    <p className="field-error" id="full-name-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" required aria-describedby="email-error" />
                    <p className="field-error" id="email-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="phone">
                      Phone number <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 555 123 4567"
                      aria-describedby="phone-error"
                    />
                    <p className="field-error" id="phone-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="location">Location</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      required
                      placeholder="City, Country"
                      aria-describedby="location-error"
                    />
                    <p className="field-error" id="location-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Your profiles</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="linkedin">LinkedIn profile</label>
                    <input
                      id="linkedin"
                      name="linkedin"
                      type="url"
                      required
                      aria-describedby="linkedin-error"
                      placeholder="https://linkedin.com/in/"
                    />
                    <p className="field-error" id="linkedin-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="portfolio">
                      Portfolio or site <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="portfolio"
                      name="portfolio"
                      type="url"
                      placeholder="https://example.com"
                      aria-describedby="portfolio-error"
                    />
                    <p className="field-error" id="portfolio-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="github">
                      GitHub profile <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="github"
                      name="github"
                      type="url"
                      placeholder="https://github.com/"
                      aria-describedby="github-error"
                    />
                    <p className="field-error" id="github-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Role preferences</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="desired-role">Target role</label>
                    <input
                      id="desired-role"
                      name="desired-role"
                      type="text"
                      required
                      aria-describedby="desired-role-error"
                      placeholder="e.g. Product Designer"
                    />
                    <p className="field-error" id="desired-role-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="seniority">Seniority</label>
                    <select
                      id="seniority"
                      name="seniority"
                      required
                      defaultValue=""
                      aria-describedby="seniority-error"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option>Intern</option>
                      <option>Junior</option>
                      <option>Mid-level</option>
                      <option>Senior</option>
                      <option>Lead</option>
                      <option>Director+</option>
                    </select>
                    <p className="field-error" id="seniority-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="job-type">Job type</label>
                    <select
                      id="job-type"
                      name="job-type"
                      required
                      defaultValue=""
                      aria-describedby="job-type-error"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                    <p className="field-error" id="job-type-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="work-preference">Work preference</label>
                    <select
                      id="work-preference"
                      name="work-preference"
                      required
                      defaultValue=""
                      aria-describedby="work-preference-error"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option>Remote</option>
                      <option>Hybrid</option>
                      <option>On-site</option>
                    </select>
                    <p className="field-error" id="work-preference-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="preferred-locations">
                      Preferred locations <span className="optional">(optional)</span>
                    </label>
                    <textarea
                      id="preferred-locations"
                      name="preferred-locations"
                      rows={2}
                      aria-describedby="preferred-locations-error"
                      placeholder="e.g. London, Berlin, Remote Europe"
                    />
                    <p className="field-error" id="preferred-locations-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Experience snapshot</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="experience-years">Years of experience</label>
                    <input
                      id="experience-years"
                      name="experience-years"
                      type="number"
                      min="0"
                      required
                      aria-describedby="experience-years-error"
                    />
                    <p className="field-error" id="experience-years-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="primary-skills">Primary skills</label>
                    <textarea
                      id="primary-skills"
                      name="primary-skills"
                      rows={2}
                      required
                      aria-describedby="primary-skills-error"
                      placeholder="e.g. React, Node.js, Python, Product Management"
                    />
                    <p className="field-error" id="primary-skills-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="current-company">
                      Current company <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="current-company"
                      name="current-company"
                      type="text"
                      aria-describedby="current-company-error"
                    />
                    <p className="field-error" id="current-company-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="current-title">
                      Current job title <span className="optional">(optional)</span>
                    </label>
                    <input
                      id="current-title"
                      name="current-title"
                      type="text"
                      aria-describedby="current-title-error"
                    />
                    <p className="field-error" id="current-title-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Referral context</legend>
                <div className="field-grid">
                  <div className="field field-full">
                    <label htmlFor="target-companies">Target companies</label>
                    <textarea
                      id="target-companies"
                      name="target-companies"
                      rows={2}
                      required
                      aria-describedby="target-companies-error"
                      placeholder="List company names and/or job links"
                    />
                    <p className="field-error" id="target-companies-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="has-postings">
                      Do you already have specific job postings? <span className="optional">(optional)</span>
                    </label>
                    <select
                      id="has-postings"
                      name="has-postings"
                      defaultValue="No"
                      aria-describedby="has-postings-error"
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                    <p className="field-error" id="has-postings-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="posting-notes">
                      Links and notes <span className="optional">(optional)</span>
                    </label>
                    <textarea
                      id="posting-notes"
                      name="posting-notes"
                      rows={2}
                      aria-describedby="posting-notes-error"
                      placeholder="Add job links, role IDs, or notes"
                    />
                    <p className="field-error" id="posting-notes-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="pitch">Brief pitch</label>
                    <textarea
                      id="pitch"
                      name="pitch"
                      rows={3}
                      required
                      aria-describedby="pitch-error"
                      placeholder="Briefly describe your background and what kind of referral you are looking for"
                    />
                    <p className="field-error" id="pitch-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Attachments (optional)</legend>
                <div className="field">
                  <label htmlFor="resume">
                    Upload resume / CV <span className="optional">(optional)</span>
                  </label>
                  <div className="file-upload">
                    <input
                      ref={resumeInputRef}
                      id="resume"
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="file-input"
                      onChange={handleResumeChange}
                      aria-describedby="resume-helper resume-file-name resume-error"
                    />
                    <button
                      type="button"
                      className="btn ghost file-upload-trigger"
                      onClick={() => resumeInputRef.current?.click()}
                      aria-describedby="resume-helper resume-file-name resume-error"
                    >
                      Upload resume
                    </button>
                    <span id="resume-file-name" className="file-upload-name" aria-live="polite">
                      {resumeName || 'No file selected yet'}
                    </span>
                  </div>
                  <p id="resume-helper" className="field-hint">
                    Accepted: PDF, DOC, DOCX. Max size 10MB.
                  </p>
                  <p className="field-error" id="resume-error" role="alert" aria-live="polite"></p>
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
                    'Send referral request'
                  )}
                </button>
                <button className="btn ghost" type="reset">
                  Clear form
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
