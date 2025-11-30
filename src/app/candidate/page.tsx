'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { Select } from '@/components/Select';

type Language = 'en' | 'fr';

const translations: Record<
  Language,
  {
    eyebrow: string;
    title: string;
    lead: string;
    success: string;
    legends: Record<string, string>;
    labels: Record<string, string>;
    placeholders: Record<string, string>;
    selects: {
      selectLabel: string;
      seniority: string[];
      jobType: string[];
      workPreference: string[];
      hasPostings: string[];
    };
    optional: string;
    upload: string;
    uploadHint: string;
    noFile: string;
    buttons: { submit: string; submitting: string; reset: string };
    languageLabel: string;
    english: string;
    french: string;
    switchText: { prompt: string; link: string };
  }
> = {
  en: {
    eyebrow: 'For candidates',
    title: 'Candidate referral request',
    lead: "Tell us your background and target roles. We'll pair you with referrers when they're available.",
    success: 'Request sent. We will notify you when a referrer is available.',
    legends: {
      details: 'Your details',
      profiles: 'Your profiles',
      preferences: 'Role preferences',
      experience: 'Experience snapshot',
      context: 'Referral context',
      attachments: 'Attachments (optional)',
    },
    labels: {
      fullName: 'Full name',
      email: 'Email',
      phone: 'Phone number',
      location: 'Location',
      linkedin: 'LinkedIn profile',
      portfolio: 'Portfolio or site',
      github: 'GitHub profile',
      desiredRole: 'Target role',
      seniority: 'Seniority',
      jobType: 'Job type',
      workPreference: 'Work preference',
      preferredLocations: 'Preferred locations',
      experienceYears: 'Years of experience',
      primarySkills: 'Primary skills',
      currentCompany: 'Current company',
      currentTitle: 'Current job title',
      targetCompanies: 'Target companies',
      hasPostings: 'Do you already have specific job postings?',
      postingNotes: 'Links and notes',
      pitch: 'Brief pitch',
      resume: 'Upload resume / CV',
    },
    placeholders: {
      phone: '+1 555 123 4567',
      location: 'City, Country',
      linkedin: 'https://linkedin.com/in/',
      portfolio: 'https://example.com',
      github: 'https://github.com/',
      desiredRole: 'e.g. Product Designer',
      preferredLocations: 'e.g. London, Berlin, Remote Europe',
      primarySkills: 'e.g. React, Node.js, Python, Product Management',
      targetCompanies: 'List company names and/or job links',
      postingNotes: 'Add job links, role IDs, or notes',
      pitch: 'Briefly describe your background and what kind of referral you are looking for',
    },
    selects: {
      selectLabel: 'Select',
      seniority: ['Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Director+'],
      jobType: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      workPreference: ['Remote', 'Hybrid', 'On-site'],
      hasPostings: ['Yes', 'No'],
    },
    optional: '(optional)',
    upload: 'Upload resume',
    uploadHint: 'Accepted: PDF, DOC, DOCX. Max size 10MB.',
    noFile: 'No file selected yet',
    buttons: {
      submit: 'Send referral request',
      submitting: 'Submitting...',
      reset: 'Clear form',
    },
    languageLabel: 'Language',
    english: 'English',
    french: 'Français',
    switchText: {
      prompt: 'Not a candidate?',
      link: 'Switch to referrer',
    },
  },
  fr: {
    eyebrow: 'Pour les candidats',
    title: 'Demande de recommandation candidat',
    lead: 'Parlez-nous de votre parcours et des postes visés. Nous vous mettrons en relation avec des référents disponibles.',
    success: 'Demande envoyée. Nous vous informerons lorsqu’un référent sera disponible.',
    legends: {
      details: 'Vos informations',
      profiles: 'Vos profils',
      preferences: 'Préférences de poste',
      experience: "Résumé de l'expérience",
      context: 'Contexte de recommandation',
      attachments: 'Pièces jointes (optionnel)',
    },
    labels: {
      fullName: 'Nom complet',
      email: 'Email',
      phone: 'Numéro de téléphone',
      location: 'Lieu',
      linkedin: 'Profil LinkedIn',
      portfolio: 'Portfolio ou site',
      github: 'Profil GitHub',
      desiredRole: 'Poste cible',
      seniority: 'Niveau de séniorité',
      jobType: "Type d'emploi",
      workPreference: 'Préférence de travail',
      preferredLocations: 'Lieux préférés',
      experienceYears: "Années d'expérience",
      primarySkills: 'Compétences principales',
      currentCompany: 'Entreprise actuelle',
      currentTitle: 'Intitulé de poste actuel',
      targetCompanies: 'Entreprises ciblées',
      hasPostings: 'Avez-vous déjà des offres spécifiques ?',
      postingNotes: 'Liens et notes',
      pitch: 'Présentation concise',
      resume: 'Télécharger le CV',
    },
    placeholders: {
      phone: '+33 6 12 34 56 78',
      location: 'Ville, Pays',
      linkedin: 'https://linkedin.com/in/',
      portfolio: 'https://exemple.com',
      github: 'https://github.com/',
      desiredRole: 'ex. Designer produit',
      preferredLocations: 'ex. Paris, Lyon, Télétravail Europe',
      primarySkills: 'ex. React, Node.js, Python, Product Management',
      targetCompanies: "Liste d'entreprises et/ou liens d'offres",
      postingNotes: "Ajoutez des liens d'offres, IDs ou notes",
      pitch: 'Décrivez brièvement votre parcours et le type de recommandation souhaitée',
    },
    selects: {
      selectLabel: 'Sélectionner',
      seniority: ['Stagiaire', 'Junior', 'Intermédiaire', 'Senior', 'Lead', 'Directeur+'],
      jobType: ['Temps plein', 'Temps partiel', 'Contrat', 'Stage'],
      workPreference: ['Télétravail', 'Hybride', 'Sur site'],
      hasPostings: ['Oui', 'Non'],
    },
    optional: '(optionnel)',
    upload: 'Télécharger le CV',
    uploadHint: 'Formats acceptés : PDF, DOC, DOCX. Taille max 10 Mo.',
    noFile: 'Aucun fichier sélectionné',
    buttons: {
      submit: 'Envoyer la demande de recommandation',
      submitting: 'Envoi...',
      reset: 'Effacer le formulaire',
    },
    languageLabel: 'Langue',
    english: 'English',
    french: 'Français',
    switchText: {
      prompt: 'Pas candidat ?',
      link: 'Passer au référent',
    },
  },
};

export default function CandidatePage() {
  const [resumeName, setResumeName] = useState('');
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<Language>('en');

  const t = translations[language];

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
      setSuccess(t.success);
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
          <section className="card referral-card" aria-labelledby="referral-title">
            <div className="role-switch">
              <span className="role-switch__text">
                {t.switchText.prompt} <Link href="/referrer">{t.switchText.link}</Link>
              </span>
            </div>
            <div className="language-toggle" role="group" aria-label={t.languageLabel}>
              <button
                type="button"
                className={`language-toggle__btn ${language === 'en' ? 'is-active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                {t.english}
              </button>
              <button
                type="button"
                className={`language-toggle__btn ${language === 'fr' ? 'is-active' : ''}`}
                onClick={() => setLanguage('fr')}
              >
                {t.french}
              </button>
            </div>
            <div className="card-header">
              <div>
                <p className="eyebrow">{t.eyebrow}</p>
                <h2 id="referral-title">{t.title}</h2>
                <p className="lead">{t.lead}</p>
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
                <legend>{t.legends.details}</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="full-name">{t.labels.fullName}</label>
                    <input id="full-name" name="full-name" type="text" required aria-describedby="full-name-error" />
                    <p className="field-error" id="full-name-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="email">{t.labels.email}</label>
                    <input id="email" name="email" type="email" required aria-describedby="email-error" />
                    <p className="field-error" id="email-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="phone">{t.labels.phone}</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder={t.placeholders.phone}
                      aria-describedby="phone-error"
                    />
                    <p className="field-error" id="phone-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="location">{t.labels.location}</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      required
                      placeholder={t.placeholders.location}
                      aria-describedby="location-error"
                    />
                    <p className="field-error" id="location-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.profiles}</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="linkedin">{t.labels.linkedin}</label>
                    <input
                      id="linkedin"
                      name="linkedin"
                      type="url"
                      required
                      aria-describedby="linkedin-error"
                      placeholder={t.placeholders.linkedin}
                    />
                    <p className="field-error" id="linkedin-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="portfolio">
                      {t.labels.portfolio} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="portfolio"
                      name="portfolio"
                      type="url"
                      placeholder={t.placeholders.portfolio}
                      aria-describedby="portfolio-error"
                    />
                    <p className="field-error" id="portfolio-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="github">
                      {t.labels.github} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="github"
                      name="github"
                      type="url"
                      placeholder={t.placeholders.github}
                      aria-describedby="github-error"
                    />
                    <p className="field-error" id="github-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.preferences}</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="desired-role">{t.labels.desiredRole}</label>
                    <input
                      id="desired-role"
                      name="desired-role"
                      type="text"
                      required
                      aria-describedby="desired-role-error"
                      placeholder={t.placeholders.desiredRole}
                    />
                    <p className="field-error" id="desired-role-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="seniority">{t.labels.seniority}</label>
                    <Select
                      id="seniority"
                      name="seniority"
                      options={t.selects.seniority}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="seniority-error"
                    />
                    <p className="field-error" id="seniority-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="job-type">{t.labels.jobType}</label>
                    <Select
                      id="job-type"
                      name="job-type"
                      options={t.selects.jobType}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="job-type-error"
                    />
                    <p className="field-error" id="job-type-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="work-preference">{t.labels.workPreference}</label>
                    <Select
                      id="work-preference"
                      name="work-preference"
                      options={t.selects.workPreference}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="work-preference-error"
                    />
                    <p className="field-error" id="work-preference-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="preferred-locations">
                      {t.labels.preferredLocations} <span className="optional">{t.optional}</span>
                    </label>
                    <textarea
                      id="preferred-locations"
                      name="preferred-locations"
                      rows={2}
                      aria-describedby="preferred-locations-error"
                      placeholder={t.placeholders.preferredLocations}
                    />
                    <p className="field-error" id="preferred-locations-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.experience}</legend>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="experience-years">{t.labels.experienceYears}</label>
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
                    <label htmlFor="primary-skills">{t.labels.primarySkills}</label>
                    <textarea
                      id="primary-skills"
                      name="primary-skills"
                      rows={2}
                      required
                      aria-describedby="primary-skills-error"
                      placeholder={t.placeholders.primarySkills}
                    />
                    <p className="field-error" id="primary-skills-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="current-company">
                      {t.labels.currentCompany} <span className="optional">{t.optional}</span>
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
                      {t.labels.currentTitle} <span className="optional">{t.optional}</span>
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
                <legend>{t.legends.context}</legend>
                <div className="field-grid">
                  <div className="field field-full">
                    <label htmlFor="target-companies">{t.labels.targetCompanies}</label>
                    <textarea
                      id="target-companies"
                      name="target-companies"
                      rows={2}
                      required
                      aria-describedby="target-companies-error"
                      placeholder={t.placeholders.targetCompanies}
                    />
                    <p className="field-error" id="target-companies-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field">
                    <label htmlFor="has-postings">
                      {t.labels.hasPostings} <span className="optional">{t.optional}</span>
                    </label>
                    <Select
                      id="has-postings"
                      name="has-postings"
                      options={t.selects.hasPostings}
                      defaultValue={t.selects.hasPostings[1]}
                      placeholder={t.selects.selectLabel}
                      ariaDescribedBy="has-postings-error"
                    />
                    <p className="field-error" id="has-postings-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="posting-notes">
                      {t.labels.postingNotes} <span className="optional">{t.optional}</span>
                    </label>
                    <textarea
                      id="posting-notes"
                      name="posting-notes"
                      rows={2}
                      aria-describedby="posting-notes-error"
                      placeholder={t.placeholders.postingNotes}
                    />
                    <p className="field-error" id="posting-notes-error" role="alert" aria-live="polite"></p>
                  </div>
                  <div className="field field-full">
                    <label htmlFor="pitch">{t.labels.pitch}</label>
                    <textarea
                      id="pitch"
                      name="pitch"
                      rows={3}
                      required
                      aria-describedby="pitch-error"
                      placeholder={t.placeholders.pitch}
                    />
                    <p className="field-error" id="pitch-error" role="alert" aria-live="polite"></p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.attachments}</legend>
                <div className="field">
                  <label htmlFor="resume">
                    {t.labels.resume} <span className="optional">{t.optional}</span>
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
                      {t.upload}
                    </button>
                    <span id="resume-file-name" className="file-upload-name" aria-live="polite">
                      {resumeName || t.noFile}
                    </span>
                  </div>
                  <p id="resume-helper" className="field-hint">
                    {t.uploadHint}
                  </p>
                  <p className="field-error" id="resume-error" role="alert" aria-live="polite"></p>
                </div>
              </fieldset>

              <div className="actions">
                <button className="btn primary" type="submit" disabled={submitting} aria-busy={submitting}>
                  {submitting ? (
                    <>
                      {t.buttons.submitting}
                      <span className="loading-indicator" aria-hidden="true" />
                    </>
                  ) : (
                    t.buttons.submit
                  )}
                </button>
                <button className="btn ghost" type="reset">
                  {t.buttons.reset}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
