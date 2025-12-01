'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { Select } from '@/components/Select';

type Language = 'en' | 'fr';

const translations: Record<
  Language,
  {
    roleSwitch: { prompt: string; link: string };
    languageLabel: string;
    english: string;
    french: string;
    eyebrow: string;
    title: string;
    lead: string;
    legends: { aboutYou: string; capacity: string; candidate: string };
    labels: {
      fullName: string;
      workEmail: string;
      company: string;
      role: string;
      linkedin: string;
      timezone: string;
      referralType: string;
      monthlySlots: string;
      targetRoles: string;
      regions: string;
      constraints: string;
      candidateName: string;
      candidateEmail: string;
      candidateRole: string;
      candidateResume: string;
      candidateContext: string;
    };
    placeholders: {
      linkedin: string;
      timezone: string;
      targetRoles: string;
      regions: string;
      constraints: string;
      candidateRole: string;
      candidateResume: string;
      candidateContext: string;
    };
    selects: { selectLabel: string; referralType: string[]; monthlySlots: string[] };
    optional: string;
    statusMessages: { ok: string; error: string };
    errors: { submissionFailed: string };
    buttons: { submit: string; submitting: string; reset: string };
  }
> = {
  en: {
    roleSwitch: { prompt: 'Not a referrer?', link: 'Switch to candidate' },
    languageLabel: 'Language',
    english: 'English',
    french: 'Français',
    eyebrow: 'For referrers',
    title: 'Referrer referral form',
    lead: 'Share the teams, roles, and capacity you have. Log a candidate now or just your availability.',
    legends: {
      aboutYou: 'About you',
      capacity: 'Referral capacity',
      candidate: 'Candidate to refer',
    },
    labels: {
      fullName: 'Full name',
      workEmail: 'Work email',
      company: 'Company',
      role: 'Role / team',
      linkedin: 'LinkedIn profile',
      timezone: 'Location or time zone',
      referralType: 'Referral type',
      monthlySlots: 'Monthly slots',
      targetRoles: 'Teams and roles you cover',
      regions: 'Regions you cover',
      constraints: 'Constraints or notes',
      candidateName: 'Candidate name',
      candidateEmail: 'Candidate email',
      candidateRole: 'Recommended role',
      candidateResume: 'Resume or portfolio link',
      candidateContext: 'Why they stand out',
    },
    placeholders: {
      linkedin: 'https://linkedin.com/in/',
      timezone: 'e.g. PST, Remote US',
      targetRoles: 'e.g. Product Design, Backend (Go/Java), GTM in EMEA',
      regions: 'e.g. US, Canada, Europe',
      constraints: 'e.g. Only full-time roles, no agency work, NDA needed',
      candidateRole: 'e.g. Senior Product Designer',
      candidateResume: 'https://link.to/resume',
      candidateContext: 'How you know them, achievements, and the type of intro you want to make',
    },
    selects: {
      selectLabel: 'Select',
      referralType: ['Internal employee referral', 'Recruiter-led introduction', 'Peer recommendation'],
      monthlySlots: ['1-3 candidates', '4-8 candidates', '9-15 candidates', 'Unlimited'],
    },
    optional: '(optional)',
    statusMessages: {
      ok: "We've received your details. We'll reach out when there's a candidate match.",
      error: "We couldn't send your details right now. Please try again in a moment.",
    },
    errors: {
      submissionFailed: 'Submission failed',
    },
    buttons: {
      submit: 'Send referrer details',
      submitting: 'Submitting...',
      reset: 'Clear form',
    },
  },
  fr: {
    roleSwitch: { prompt: 'Pas référent ?', link: 'Passer au candidat' },
    languageLabel: 'Langue',
    english: 'English',
    french: 'Français',
    eyebrow: 'Pour les référents',
    title: 'Formulaire de recommandation référent',
    lead: 'Indiquez les équipes, les rôles et votre capacité. Enregistrez un candidat ou simplement votre disponibilité.',
    legends: {
      aboutYou: 'À propos de vous',
      capacity: 'Capacité de recommandation',
      candidate: 'Candidat à recommander',
    },
    labels: {
      fullName: 'Nom complet',
      workEmail: 'Email professionnel',
      company: 'Entreprise',
      role: 'Poste / équipe',
      linkedin: 'Profil LinkedIn',
      timezone: 'Lieu ou fuseau horaire',
      referralType: 'Type de recommandation',
      monthlySlots: 'Nombre de recommandations par mois',
      targetRoles: 'Équipes et rôles couverts',
      regions: 'Régions couvertes',
      constraints: 'Contraintes ou notes',
      candidateName: 'Nom du candidat',
      candidateEmail: 'Email du candidat',
      candidateRole: 'Poste recommandé',
      candidateResume: 'Lien vers CV ou portfolio',
      candidateContext: 'Pourquoi ce candidat se démarque',
    },
    placeholders: {
      linkedin: 'https://linkedin.com/in/',
      timezone: 'ex. PST, US à distance',
      targetRoles: 'ex. Design produit, Backend (Go/Java), GTM en EMEA',
      regions: 'ex. États-Unis, Canada, Europe',
      constraints: 'ex. Uniquement temps plein, pas de missions agence, NDA requis',
      candidateRole: 'ex. Designer produit senior',
      candidateResume: 'https://lien.vers/cv',
      candidateContext: "Comment vous le connaissez, ses réussites et le type d'introduction souhaitée",
    },
    selects: {
      selectLabel: 'Sélectionner',
      referralType: ['Recommandation en interne', 'Introduction menée par un recruteur', 'Recommandation par un pair'],
      monthlySlots: ['1-3 candidats', '4-8 candidats', '9-15 candidats', 'Illimité'],
    },
    optional: '(optionnel)',
    statusMessages: {
      ok: "Nous avons bien reçu vos informations. Nous vous contacterons lorsqu'un candidat correspondra.",
      error: "Impossible d'envoyer vos informations pour l'instant. Veuillez réessayer dans un instant.",
    },
    errors: {
      submissionFailed: "Échec de l'envoi",
    },
    buttons: {
      submit: 'Envoyer les informations du référent',
      submitting: 'Envoi...',
      reset: 'Effacer le formulaire',
    },
  },
};

export default function ReferrerPage() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [language, setLanguage] = useState<Language>('en');
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
      name: valueOf('referrer-name'),
      email: valueOf('referrer-email'),
      company: valueOf('referrer-company'),
      role: valueOf('referrer-role'),
      linkedin: valueOf('referrer-linkedin'),
      timezone: valueOf('referrer-timezone'),
      referralType: valueOf('referral-type'),
      monthlySlots: valueOf('monthly-slots'),
      targetRoles: valueOf('target-roles'),
      regions: valueOf('regions'),
      constraints: valueOf('constraints'),
      candidateName: valueOf('candidate-name'),
      candidateEmail: valueOf('candidate-email'),
      candidateRole: valueOf('candidate-role'),
      candidateResume: valueOf('candidate-resume'),
      candidateContext: valueOf('candidate-context'),
    };
  };

  const validateValues = (values: ReturnType<typeof getFormValues>) => {
    const nextErrors: Record<string, string> = {};

    if (!values.name) nextErrors['referrer-name'] = 'Please enter your name.';

    if (!values.email) {
      nextErrors['referrer-email'] = 'Please enter your email address.';
    } else if (!isValidEmail(values.email)) {
      nextErrors['referrer-email'] = 'Please enter a valid email address.';
    }

    if (!values.company) nextErrors['referrer-company'] = 'Please enter your company.';
    if (!values.role) nextErrors['referrer-role'] = 'Please enter your role.';

    if (values.linkedin && !isValidUrl(values.linkedin)) {
      nextErrors['referrer-linkedin'] = 'Please enter a valid URL.';
    }

    if (!values.referralType) nextErrors['referral-type'] = 'Please select a referral type.';
    if (!values.monthlySlots) nextErrors['monthly-slots'] = 'Please select monthly slots.';

    if (!values.targetRoles) nextErrors['target-roles'] = 'Please enter the teams and roles you cover.';
    if (!values.regions) nextErrors.regions = 'Please enter the regions you cover.';

    if (!values.candidateName) nextErrors['candidate-name'] = 'Please enter the candidate name.';
    if (!values.candidateEmail) {
      nextErrors['candidate-email'] = 'Please enter the candidate email.';
    } else if (!isValidEmail(values.candidateEmail)) {
      nextErrors['candidate-email'] = 'Please enter a valid email address.';
    }
    if (!values.candidateRole) nextErrors['candidate-role'] = 'Please enter the recommended role.';
    if (values.candidateResume && !isValidUrl(values.candidateResume)) {
      nextErrors['candidate-resume'] = 'Please enter a valid URL.';
    }
    if (!values.candidateContext) nextErrors['candidate-context'] = 'Please share why this candidate stands out.';

    return nextErrors;
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

    const payload = {
      name: values.name,
      email: values.email,
      targetRoles: values.targetRoles,
      regions: values.regions,
      referralType: values.referralType,
      monthlySlots: values.monthlySlots,
    };

    try {
      const response = await fetch('/api/referrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || t.errors.submissionFailed);
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
                {t.roleSwitch.prompt} <Link href="/candidate">{t.roleSwitch.link}</Link>
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
                <h2 id="referrer-title">{t.title}</h2>
                <p className="lead">{t.lead}</p>
              </div>
            </div>

            <form
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
                <legend>{t.legends.aboutYou}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'referrer-name')}>
                    <label htmlFor="referrer-name">{t.labels.fullName}</label>
                    <input
                      id="referrer-name"
                      name="referrer-name"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['referrer-name'])}
                      aria-describedby="referrer-name-error"
                      onChange={handleFieldChange('referrer-name')}
                    />
                    <p className="field-error" id="referrer-name-error" role="alert" aria-live="polite">
                      {errors['referrer-name']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-email')}>
                    <label htmlFor="referrer-email">{t.labels.workEmail}</label>
                    <input
                      id="referrer-email"
                      name="referrer-email"
                      type="email"
                      required
                      aria-invalid={Boolean(errors['referrer-email'])}
                      aria-describedby="referrer-email-error"
                      onChange={handleFieldChange('referrer-email')}
                    />
                    <p className="field-error" id="referrer-email-error" role="alert" aria-live="polite">
                      {errors['referrer-email']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-company')}>
                    <label htmlFor="referrer-company">{t.labels.company}</label>
                    <input
                      id="referrer-company"
                      name="referrer-company"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['referrer-company'])}
                      aria-describedby="referrer-company-error"
                      onChange={handleFieldChange('referrer-company')}
                    />
                    <p className="field-error" id="referrer-company-error" role="alert" aria-live="polite">
                      {errors['referrer-company']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-role')}>
                    <label htmlFor="referrer-role">{t.labels.role}</label>
                    <input
                      id="referrer-role"
                      name="referrer-role"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['referrer-role'])}
                      aria-describedby="referrer-role-error"
                      onChange={handleFieldChange('referrer-role')}
                    />
                    <p className="field-error" id="referrer-role-error" role="alert" aria-live="polite">
                      {errors['referrer-role']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-linkedin')}>
                    <label htmlFor="referrer-linkedin">
                      {t.labels.linkedin} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="referrer-linkedin"
                      name="referrer-linkedin"
                      type="url"
                      aria-invalid={Boolean(errors['referrer-linkedin'])}
                      aria-describedby="referrer-linkedin-error"
                      placeholder={t.placeholders.linkedin}
                      onChange={handleFieldChange('referrer-linkedin')}
                    />
                    <p className="field-error" id="referrer-linkedin-error" role="alert" aria-live="polite">
                      {errors['referrer-linkedin']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-timezone')}>
                    <label htmlFor="referrer-timezone">
                      {t.labels.timezone} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="referrer-timezone"
                      name="referrer-timezone"
                      type="text"
                      aria-invalid={Boolean(errors['referrer-timezone'])}
                      aria-describedby="referrer-timezone-error"
                      placeholder={t.placeholders.timezone}
                      onChange={handleFieldChange('referrer-timezone')}
                    />
                    <p className="field-error" id="referrer-timezone-error" role="alert" aria-live="polite">
                      {errors['referrer-timezone']}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.capacity}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'referral-type')}>
                    <label htmlFor="referral-type">{t.labels.referralType}</label>
                    <Select
                      id="referral-type"
                      name="referral-type"
                      options={t.selects.referralType}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="referral-type-error"
                      ariaInvalid={Boolean(errors['referral-type'])}
                      onChange={handleSelectChange('referral-type')}
                    />
                    <p className="field-error" id="referral-type-error" role="alert" aria-live="polite">
                      {errors['referral-type']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'monthly-slots')}>
                    <label htmlFor="monthly-slots">{t.labels.monthlySlots}</label>
                    <Select
                      id="monthly-slots"
                      name="monthly-slots"
                      options={t.selects.monthlySlots}
                      placeholder={t.selects.selectLabel}
                      required
                      ariaDescribedBy="monthly-slots-error"
                      ariaInvalid={Boolean(errors['monthly-slots'])}
                      onChange={handleSelectChange('monthly-slots')}
                    />
                    <p className="field-error" id="monthly-slots-error" role="alert" aria-live="polite">
                      {errors['monthly-slots']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'target-roles')}>
                    <label htmlFor="target-roles">{t.labels.targetRoles}</label>
                    <textarea
                      id="target-roles"
                      name="target-roles"
                      rows={2}
                      required
                      aria-invalid={Boolean(errors['target-roles'])}
                      aria-describedby="target-roles-error"
                      placeholder={t.placeholders.targetRoles}
                      onChange={handleFieldChange('target-roles')}
                    />
                    <p className="field-error" id="target-roles-error" role="alert" aria-live="polite">
                      {errors['target-roles']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'regions')}>
                    <label htmlFor="regions">{t.labels.regions}</label>
                    <input
                      id="regions"
                      name="regions"
                      type="text"
                      required
                      aria-invalid={Boolean(errors.regions)}
                      aria-describedby="regions-error"
                      placeholder={t.placeholders.regions}
                      onChange={handleFieldChange('regions')}
                    />
                    <p className="field-error" id="regions-error" role="alert" aria-live="polite">
                      {errors.regions}
                    </p>
                  </div>
                  <div className={fieldClass('field field-full', 'constraints')}>
                    <label htmlFor="constraints">
                      {t.labels.constraints} <span className="optional">{t.optional}</span>
                    </label>
                    <textarea
                      id="constraints"
                      name="constraints"
                      rows={2}
                      aria-describedby="constraints-error"
                      aria-invalid={Boolean(errors.constraints)}
                      placeholder={t.placeholders.constraints}
                      onChange={handleFieldChange('constraints')}
                    />
                    <p className="field-error" id="constraints-error" role="alert" aria-live="polite">
                      {errors.constraints}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.candidate}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'candidate-name')}>
                    <label htmlFor="candidate-name">{t.labels.candidateName}</label>
                    <input
                      id="candidate-name"
                      name="candidate-name"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['candidate-name'])}
                      aria-describedby="candidate-name-error"
                      onChange={handleFieldChange('candidate-name')}
                    />
                    <p className="field-error" id="candidate-name-error" role="alert" aria-live="polite">
                      {errors['candidate-name']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'candidate-email')}>
                    <label htmlFor="candidate-email">{t.labels.candidateEmail}</label>
                    <input
                      id="candidate-email"
                      name="candidate-email"
                      type="email"
                      required
                      aria-invalid={Boolean(errors['candidate-email'])}
                      aria-describedby="candidate-email-error"
                      onChange={handleFieldChange('candidate-email')}
                    />
                    <p className="field-error" id="candidate-email-error" role="alert" aria-live="polite">
                      {errors['candidate-email']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'candidate-role')}>
                    <label htmlFor="candidate-role">{t.labels.candidateRole}</label>
                    <input
                      id="candidate-role"
                      name="candidate-role"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['candidate-role'])}
                      aria-describedby="candidate-role-error"
                      placeholder={t.placeholders.candidateRole}
                      onChange={handleFieldChange('candidate-role')}
                    />
                    <p className="field-error" id="candidate-role-error" role="alert" aria-live="polite">
                      {errors['candidate-role']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'candidate-resume')}>
                    <label htmlFor="candidate-resume">
                      {t.labels.candidateResume} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="candidate-resume"
                      name="candidate-resume"
                      type="url"
                      aria-invalid={Boolean(errors['candidate-resume'])}
                      aria-describedby="candidate-resume-error"
                      placeholder={t.placeholders.candidateResume}
                      onChange={handleFieldChange('candidate-resume')}
                    />
                    <p className="field-error" id="candidate-resume-error" role="alert" aria-live="polite">
                      {errors['candidate-resume']}
                    </p>
                  </div>
                  <div className={fieldClass('field field-full', 'candidate-context')}>
                    <label htmlFor="candidate-context">{t.labels.candidateContext}</label>
                    <textarea
                      id="candidate-context"
                      name="candidate-context"
                      rows={3}
                      required
                      aria-invalid={Boolean(errors['candidate-context'])}
                      aria-describedby="candidate-context-error"
                      placeholder={t.placeholders.candidateContext}
                      onChange={handleFieldChange('candidate-context')}
                    />
                    <p className="field-error" id="candidate-context-error" role="alert" aria-live="polite">
                      {errors['candidate-context']}
                    </p>
                  </div>
                </div>
              </fieldset>

              <div className="form-footer">
                <div className="footer-status">
                  {status === 'ok' && (
                    <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                      <span className="status-icon" aria-hidden="true">✓</span>
                      <span>{t.statusMessages.ok}</span>
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="status-banner status-banner--error" role="alert" aria-live="assertive">
                      <span className="status-icon" aria-hidden="true">!</span>
                      <span>{t.statusMessages.error}</span>
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
