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
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const fieldClass = (base: string, field: string) => `${base}${errors[field] ? ' has-error' : ''}`;

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFieldChange = (field: string) => () => clearError(field);
  const handleSelectChange = (field: string) => () => clearError(field);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isValidUrl = (value: string) => {
    try {
      const url = new URL(value);
      return Boolean(url.protocol) && Boolean(url.hostname);
    } catch {
      return false;
    }
  };

  const getFormValues = (formData: FormData) => {
    const valueOf = (key: string) => ((formData.get(key) as string | null)?.trim() || '');
    return {
      fullName: valueOf('full-name'),
      email: valueOf('email'),
      phone: valueOf('phone'),
      location: valueOf('location'),
      linkedin: valueOf('linkedin'),
      portfolio: valueOf('portfolio'),
      github: valueOf('github'),
      desiredRole: valueOf('desired-role'),
      seniority: valueOf('seniority'),
      jobType: valueOf('job-type'),
      workPreference: valueOf('work-preference'),
      preferredLocations: valueOf('preferred-locations'),
      experienceYears: valueOf('experience-years'),
      primarySkills: valueOf('primary-skills'),
      currentCompany: valueOf('current-company'),
      currentTitle: valueOf('current-title'),
      targetCompanies: valueOf('target-companies'),
      hasPostings: valueOf('has-postings'),
      postingNotes: valueOf('posting-notes'),
      pitch: valueOf('pitch'),
    };
  };

  const validateValues = (values: ReturnType<typeof getFormValues>) => {
    const nextErrors: Record<string, string> = {};

    if (!values.fullName) nextErrors['full-name'] = 'Please enter your full name.';

    if (!values.email) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!isValidEmail(values.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!values.phone) nextErrors.phone = 'Please enter your phone number.';
    if (!values.location) nextErrors.location = 'Please enter your location.';

    if (!values.linkedin) {
      nextErrors.linkedin = 'Please enter your LinkedIn profile.';
    } else if (!isValidUrl(values.linkedin)) {
      nextErrors.linkedin = 'Please enter a valid URL.';
    }

    if (values.portfolio && !isValidUrl(values.portfolio)) {
      nextErrors.portfolio = 'Please enter a valid URL.';
    }
    if (values.github && !isValidUrl(values.github)) {
      nextErrors.github = 'Please enter a valid URL.';
    }

    if (!values.desiredRole) nextErrors['desired-role'] = 'Please enter your target role.';
    if (!values.seniority) nextErrors.seniority = 'Please select your seniority.';
    if (!values.jobType) nextErrors['job-type'] = 'Please select a job type.';
    if (!values.workPreference) nextErrors['work-preference'] = 'Please select your work preference.';

    if (!values.experienceYears) nextErrors['experience-years'] = 'Please enter your years of experience.';
    if (!values.primarySkills) nextErrors['primary-skills'] = 'Please enter your primary skills.';
    if (!values.targetCompanies) nextErrors['target-companies'] = 'Please enter your target companies.';
    if (!values.pitch) nextErrors.pitch = 'Please add a brief pitch.';

    return nextErrors;
  };

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResumeName(file ? file.name : '');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = getFormValues(formData);
    const validationErrors = validateValues(values);

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      setStatus('idle');
      setSubmitting(false);
      return;
    }

    setErrors({});
    setStatus('submitting');
    setSubmitting(true);

    const [firstName, ...rest] = values.fullName.split(' ').filter(Boolean);
    const payload = {
      firstName: firstName || values.fullName,
      lastName: rest.join(' '),
      email: values.email,
      targetRoles: values.desiredRole,
      seniority: values.seniority,
      location: values.location,
      targetCompanies: values.targetCompanies,
      phone: values.phone,
      workPreference: values.workPreference,
      preferredLocations: values.preferredLocations,
    };

    try {
      const response = await fetch('/api/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Something went wrong. Please try again.');
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
            <div className="card-header">
              <div>
                <p className="eyebrow">{t.eyebrow}</p>
                <h2 id="referral-title">{t.title}</h2>
                <p className="lead">{t.lead}</p>
              </div>
            </div>

            <form
              ref={formRef}
              className="referral-form"
              action="#"
              method="post"
              onSubmit={handleSubmit}
              onReset={() => {
                setErrors({});
                setStatus('idle');
              }}
            >
              <fieldset>
                <legend>{t.legends.details}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'full-name')}>
                    <label htmlFor="full-name">{t.labels.fullName}</label>
                    <input
                      id="full-name"
                      name="full-name"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['full-name'])}
                      aria-describedby="full-name-error"
                      onChange={handleFieldChange('full-name')}
                    />
                    <p className="field-error" id="full-name-error" role="alert" aria-live="polite">
                      {errors['full-name']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'email')}>
                    <label htmlFor="email">{t.labels.email}</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby="email-error"
                      onChange={handleFieldChange('email')}
                    />
                    <p className="field-error" id="email-error" role="alert" aria-live="polite">
                      {errors.email}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'phone')}>
                    <label htmlFor="phone">{t.labels.phone}</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder={t.placeholders.phone}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby="phone-error"
                      onChange={handleFieldChange('phone')}
                    />
                    <p className="field-error" id="phone-error" role="alert" aria-live="polite">
                      {errors.phone}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'location')}>
                    <label htmlFor="location">{t.labels.location}</label>
                    <input
                      id="location"
                      name="location"
                      type="text"
                      required
                      placeholder={t.placeholders.location}
                      aria-invalid={Boolean(errors.location)}
                      aria-describedby="location-error"
                      onChange={handleFieldChange('location')}
                    />
                    <p className="field-error" id="location-error" role="alert" aria-live="polite">
                      {errors.location}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.profiles}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'linkedin')}>
                    <label htmlFor="linkedin">{t.labels.linkedin}</label>
                    <input
                      id="linkedin"
                      name="linkedin"
                      type="url"
                      required
                      aria-invalid={Boolean(errors.linkedin)}
                      aria-describedby="linkedin-error"
                      placeholder={t.placeholders.linkedin}
                      onChange={handleFieldChange('linkedin')}
                    />
                    <p className="field-error" id="linkedin-error" role="alert" aria-live="polite">
                      {errors.linkedin}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'portfolio')}>
                    <label htmlFor="portfolio">
                      {t.labels.portfolio} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="portfolio"
                      name="portfolio"
                      type="url"
                      placeholder={t.placeholders.portfolio}
                      aria-invalid={Boolean(errors.portfolio)}
                      aria-describedby="portfolio-error"
                      onChange={handleFieldChange('portfolio')}
                    />
                    <p className="field-error" id="portfolio-error" role="alert" aria-live="polite">
                      {errors.portfolio}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'github')}>
                    <label htmlFor="github">
                      {t.labels.github} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="github"
                      name="github"
                      type="url"
                      placeholder={t.placeholders.github}
                      aria-invalid={Boolean(errors.github)}
                      aria-describedby="github-error"
                      onChange={handleFieldChange('github')}
                    />
                    <p className="field-error" id="github-error" role="alert" aria-live="polite">
                      {errors.github}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.preferences}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'desired-role')}>
                    <label htmlFor="desired-role">{t.labels.desiredRole}</label>
                    <input
                      id="desired-role"
                      name="desired-role"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['desired-role'])}
                      aria-describedby="desired-role-error"
                      placeholder={t.placeholders.desiredRole}
                      onChange={handleFieldChange('desired-role')}
                    />
                    <p className="field-error" id="desired-role-error" role="alert" aria-live="polite">
                      {errors['desired-role']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'seniority')}>
                    <label htmlFor="seniority">{t.labels.seniority}</label>
                    <Select
                      id="seniority"
                      name="seniority"
                      options={t.selects.seniority}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="seniority-error"
                      ariaInvalid={Boolean(errors.seniority)}
                      onChange={handleSelectChange('seniority')}
                    />
                    <p className="field-error" id="seniority-error" role="alert" aria-live="polite">
                      {errors.seniority}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'job-type')}>
                    <label htmlFor="job-type">{t.labels.jobType}</label>
                    <Select
                      id="job-type"
                      name="job-type"
                      options={t.selects.jobType}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="job-type-error"
                      ariaInvalid={Boolean(errors['job-type'])}
                      onChange={handleSelectChange('job-type')}
                    />
                    <p className="field-error" id="job-type-error" role="alert" aria-live="polite">
                      {errors['job-type']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'work-preference')}>
                    <label htmlFor="work-preference">{t.labels.workPreference}</label>
                    <Select
                      id="work-preference"
                      name="work-preference"
                      options={t.selects.workPreference}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="work-preference-error"
                      ariaInvalid={Boolean(errors['work-preference'])}
                      onChange={handleSelectChange('work-preference')}
                    />
                    <p className="field-error" id="work-preference-error" role="alert" aria-live="polite">
                      {errors['work-preference']}
                    </p>
                  </div>
                  <div className={fieldClass('field field-full', 'preferred-locations')}>
                    <label htmlFor="preferred-locations">
                      {t.labels.preferredLocations} <span className="optional">{t.optional}</span>
                    </label>
                    <textarea
                      id="preferred-locations"
                      name="preferred-locations"
                      rows={2}
                      aria-describedby="preferred-locations-error"
                      placeholder={t.placeholders.preferredLocations}
                      aria-invalid={Boolean(errors['preferred-locations'])}
                      onChange={handleFieldChange('preferred-locations')}
                    />
                    <p className="field-error" id="preferred-locations-error" role="alert" aria-live="polite">
                      {errors['preferred-locations']}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.experience}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'experience-years')}>
                    <label htmlFor="experience-years">{t.labels.experienceYears}</label>
                    <input
                      id="experience-years"
                      name="experience-years"
                      type="number"
                      min="0"
                      required
                      aria-invalid={Boolean(errors['experience-years'])}
                      aria-describedby="experience-years-error"
                      onChange={handleFieldChange('experience-years')}
                    />
                    <p className="field-error" id="experience-years-error" role="alert" aria-live="polite">
                      {errors['experience-years']}
                    </p>
                  </div>
                  <div className={fieldClass('field field-full', 'primary-skills')}>
                    <label htmlFor="primary-skills">{t.labels.primarySkills}</label>
                    <textarea
                      id="primary-skills"
                      name="primary-skills"
                      rows={2}
                      required
                      aria-invalid={Boolean(errors['primary-skills'])}
                      aria-describedby="primary-skills-error"
                      placeholder={t.placeholders.primarySkills}
                      onChange={handleFieldChange('primary-skills')}
                    />
                    <p className="field-error" id="primary-skills-error" role="alert" aria-live="polite">
                      {errors['primary-skills']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'current-company')}>
                    <label htmlFor="current-company">
                      {t.labels.currentCompany} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="current-company"
                      name="current-company"
                      type="text"
                      aria-invalid={Boolean(errors['current-company'])}
                      aria-describedby="current-company-error"
                      onChange={handleFieldChange('current-company')}
                    />
                    <p className="field-error" id="current-company-error" role="alert" aria-live="polite">
                      {errors['current-company']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'current-title')}>
                    <label htmlFor="current-title">
                      {t.labels.currentTitle} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="current-title"
                      name="current-title"
                      type="text"
                      aria-invalid={Boolean(errors['current-title'])}
                      aria-describedby="current-title-error"
                      onChange={handleFieldChange('current-title')}
                    />
                    <p className="field-error" id="current-title-error" role="alert" aria-live="polite">
                      {errors['current-title']}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.context}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field field-full', 'target-companies')}>
                    <label htmlFor="target-companies">{t.labels.targetCompanies}</label>
                    <textarea
                      id="target-companies"
                      name="target-companies"
                      rows={2}
                      required
                      aria-invalid={Boolean(errors['target-companies'])}
                      aria-describedby="target-companies-error"
                      placeholder={t.placeholders.targetCompanies}
                      onChange={handleFieldChange('target-companies')}
                    />
                    <p className="field-error" id="target-companies-error" role="alert" aria-live="polite">
                      {errors['target-companies']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'has-postings')}>
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
                      ariaInvalid={Boolean(errors['has-postings'])}
                      onChange={handleSelectChange('has-postings')}
                    />
                    <p className="field-error" id="has-postings-error" role="alert" aria-live="polite">
                      {errors['has-postings']}
                    </p>
                  </div>
                  <div className={fieldClass('field field-full', 'posting-notes')}>
                    <label htmlFor="posting-notes">
                      {t.labels.postingNotes} <span className="optional">{t.optional}</span>
                    </label>
                    <textarea
                      id="posting-notes"
                      name="posting-notes"
                      rows={2}
                      aria-describedby="posting-notes-error"
                      aria-invalid={Boolean(errors['posting-notes'])}
                      placeholder={t.placeholders.postingNotes}
                      onChange={handleFieldChange('posting-notes')}
                    />
                    <p className="field-error" id="posting-notes-error" role="alert" aria-live="polite">
                      {errors['posting-notes']}
                    </p>
                  </div>
                  <div className={fieldClass('field field-full', 'pitch')}>
                    <label htmlFor="pitch">{t.labels.pitch}</label>
                    <textarea
                      id="pitch"
                      name="pitch"
                      rows={3}
                      required
                      aria-invalid={Boolean(errors.pitch)}
                      aria-describedby="pitch-error"
                      placeholder={t.placeholders.pitch}
                      onChange={handleFieldChange('pitch')}
                    />
                    <p className="field-error" id="pitch-error" role="alert" aria-live="polite">
                      {errors.pitch}
                    </p>
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

              <div className="form-footer">
                <div className="footer-status">
                  {status === 'ok' && (
                    <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                      <span className="status-icon" aria-hidden="true">✓</span>
                      <span>We’ve received your request. We’ll follow up by email soon.</span>
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="status-banner status-banner--error" role="alert" aria-live="assertive">
                      <span className="status-icon" aria-hidden="true">!</span>
                      <span>We couldn’t send your request right now. Please try again in a moment.</span>
                    </div>
                  )}
                </div>
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
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
