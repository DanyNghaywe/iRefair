'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { Select } from '@/components/Select';
import { useNavigationLoader } from '@/components/NavigationLoader';
import { countryOptions } from '@/lib/countries';

type Language = 'en' | 'fr';

// Stable values; labels are localized below
const COMPANY_INDUSTRY_VALUES: string[] = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Hospitality',
  'Marketing / Media',
  'Engineering / Construction',
  'Consulting',
  'Not for profit',
  'Compliance / Audit',
  'Other',
];

type Option = { value: string; label: string };

function companyIndustryOptions(lang: Language): Option[] {
  if (lang === 'fr') {
    const map: Record<string, string> = {
      Technology: 'Technologie',
      Finance: 'Finance',
      Healthcare: 'Santé',
      Education: 'Éducation',
      Retail: 'Commerce de détail',
      Hospitality: 'Hôtellerie',
      'Marketing / Media': 'Marketing / Médias',
      'Engineering / Construction': 'Ingénierie / Construction',
      Consulting: 'Conseil',
      'Not for profit': 'Organisme à but non lucratif',
      'Compliance / Audit': 'Conformité / Audit',
      Other: 'Autre',
    };
    return COMPANY_INDUSTRY_VALUES.map((v) => ({ value: v, label: map[v] ?? v }));
  }
  return COMPANY_INDUSTRY_VALUES.map((v) => ({ value: v, label: v }));
}

function workTypeOptions(lang: Language): Option[] {
  if (lang === 'fr') {
    const map: Record<string, string> = { Physical: 'Sur site', Remote: 'Télétravail', Hybrid: 'Hybride' };
    return ['Physical', 'Remote', 'Hybrid'].map((v) => ({ value: v, label: map[v] }));
  }
  return ['Physical', 'Remote', 'Hybrid'].map((v) => ({ value: v, label: v }));
}

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
    legends: { personal: string; company: string; workType: string };
    labels: {
      fullName: string;
      workEmail: string;
      phone: string;
      country: string;
      company: string;
      companyIndustry: string;
      companyIndustryOther: string;
      workType: string;
      linkedin: string;
      referralType: string;
      monthlySlots: string;
      targetRoles: string;
      regions: string;
      constraints: string;
    };
    placeholders: {
      linkedin: string;
      targetRoles: string;
      regions: string;
      constraints: string;
      phone: string;
      country: string;
      workTypeOther: string;
      companyIndustryOther: string;
    };
    selects: { selectLabel: string; referralType: string[]; monthlySlots: string[] };
    optional: string;
    statusMessages: { ok: string; error: string };
    errors: { submissionFailed: string };
    buttons: { submit: string; submitting: string; reset: string };
    disclaimer: {
      body: string;
      linksLead: string;
      termsLabel: string;
      privacyLabel: string;
      separator: string;
      ariaLabel: string;
    };
    consentTitle: string;
    consentIntro: string;
    consentPoints: string[];
    consentAgreement: string;
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
      personal: 'Personal Information',
      company: 'Company Details',
      workType: 'Type of work',
    },
    labels: {
      fullName: 'Full Name *',
      workEmail: 'Email address *',
      phone: 'Phone Number',
      country: 'Country of Origin',
      company: 'Company  Name',
      companyIndustry: 'Industry of the company',
      workType: 'Type of work',
      companyIndustryOther: 'Other company industry',
      linkedin: 'LinkedIn Profile',
      referralType: 'Referral type',
      monthlySlots: 'Monthly slots',
      targetRoles: 'Teams and roles you cover',
      regions: 'Regions you cover',
      constraints: 'Constraints or notes',
    },
    placeholders: {
      linkedin: 'https://linkedin.com/in/',
      targetRoles: 'e.g. Product Design, Backend (Go/Java), GTM in EMEA',
      regions: 'e.g. US, Canada, Europe',
      constraints: 'e.g. Only full-time roles, no agency work, NDA needed',
      phone: '+1-XXX-XXXX or +961-XX-XXXXXX',
      country: 'e.g. Canada',
      companyIndustryOther: 'Please specify',
      workTypeOther: 'Please specify',
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
    disclaimer: {
      body: 'By submitting, you agree that iRefair may contact you about this request.',
      linksLead: 'Read our',
      termsLabel: 'Terms',
      privacyLabel: 'Privacy Policy',
      separator: 'and',
      ariaLabel: 'Form disclaimer',
    },
    consentTitle: 'Consent & Legal Disclaimer',
    consentIntro:
      'By submitting this form, I agree to be contacted by iRefair when a potential candidate may align with open roles at my company. I understand and acknowledge the following:',
    consentPoints: [
      'iRefair is a voluntary, community-driven initiative, and I am under no obligation to make any referrals.',
      'Any referral I make is based on my own discretion, and I am solely responsible for complying with my company’s internal referral or hiring policies.',
      'iRefair, &Beyond Consulting, IM Power SARL and Inaspire and their legal founders assume no liability at all including but not limited to: hiring outcomes, internal processes, or employer decisions.',
      'My contact and employer details will be kept confidential and will not be shared without my consent.',
      'I may request to update or delete my information at any time by contacting info@andbeyondca.com.',
      'My participation is entirely optional, and I can opt out at any time via contacting info@andbeyondca.com.',
    ],
    consentAgreement: 'I have read, understood, and agree to the above terms.',
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
      personal: 'Informations personnelles',
      company: "Détails de l'entreprise",
      workType: 'Type de travail',
    },
    labels: {
      fullName: 'Nom complet',
      workEmail: 'Adresse email',
      phone: 'Numéro de téléphone',
      country: "Pays d'origine",
      company: 'Entreprise',
      companyIndustry: "Secteur de l'entreprise",
      workType: 'Type de travail',
      companyIndustryOther: 'Autre secteur',
      linkedin: 'Profil LinkedIn',
      referralType: 'Type de recommandation',
      monthlySlots: 'Nombre de recommandations par mois',
      targetRoles: 'Équipes et rôles couverts',
      regions: 'Régions couvertes',
      constraints: 'Contraintes ou notes',
    },
    placeholders: {
      linkedin: 'https://linkedin.com/in/',
      targetRoles: 'ex. Design produit, Backend (Go/Java), GTM en EMEA',
      regions: 'ex. États-Unis, Canada, Europe',
      constraints: 'ex. Uniquement temps plein, pas de missions agence, NDA requis',
      phone: '+1-XXX-XXXX ou +961-XX-XXXXXX',
      country: 'ex. France',
      companyIndustryOther: 'Précisez',
      workTypeOther: 'Précisez',
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
    disclaimer: {
      body: "En envoyant le formulaire, vous acceptez d'être contacté par iRefair au sujet de cette demande.",
      linksLead: 'Consultez nos',
      termsLabel: 'Conditions',
      privacyLabel: 'Politique de confidentialité',
      separator: 'et notre',
      ariaLabel: 'Avertissement du formulaire',
    },
    consentTitle: 'Consentement et avis légal',
    consentIntro:
      "En soumettant ce formulaire, j'accepte d'être contacté par iRefair lorsqu'un candidat potentiel pourrait correspondre à des postes ouverts dans mon entreprise. Je comprends et reconnais ce qui suit :",
    consentPoints: [
      'iRefair est une initiative bénévole, portée par la communauté, et je ne suis soumis à aucune obligation de recommander qui que ce soit.',
      "Toute recommandation que je fais est à ma discrétion, et je suis seul responsable du respect des politiques internes de mon entreprise en matière de recommandation ou de recrutement.",
      "iRefair, &Beyond Consulting, IM Power SARL et Inaspire ainsi que leurs fondateurs légaux déclinent toute responsabilité (y compris, sans s'y limiter) concernant les résultats d'embauche, les processus internes ou les décisions de l'employeur.",
      'Mes coordonnées et informations employeur resteront confidentielles et ne seront pas partagées sans mon consentement.',
      "Je peux demander la mise à jour ou la suppression de mes informations à tout moment en contactant info@andbeyondca.com.",
      'Ma participation est entièrement facultative, et je peux me retirer à tout moment en contactant info@andbeyondca.com.',
    ],
    consentAgreement: "J'ai lu, compris et j'accepte les conditions ci-dessus.",
  },
};

export default function ReferrerPage() {
  const { startNavigation } = useNavigationLoader();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const [language, setLanguage] = useState<Language>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const linkedinInputRef = useRef<HTMLInputElement | null>(null);
  const [companyIndustrySelection, setCompanyIndustrySelection] = useState('');
  const [countrySelection, setCountrySelection] = useState('');
  const [workTypeSelection, setWorkTypeSelection] = useState('');
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

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const formElement = formRef.current;
      if (!formElement) return;
      const firstErrorField = formElement.querySelector('.has-error') as HTMLElement | null;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusTarget = firstErrorField.querySelector<HTMLElement>(
          'input, select, textarea, button, [role="combobox"], [tabindex]:not([tabindex="-1"])'
        );
        focusTarget?.focus({ preventScroll: true });
      }
    });
  };

  const handleFieldChange = (field: string) => () => clearError(field);
  const handleLinkedInChange = () => {
    linkedinInputRef.current?.setCustomValidity('');
    clearError('referrer-linkedin');
  };

  const toSingleValue = (value: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isValidLinkedInProfileUrl = (value: string) => {
    try {
      const url = new URL(value);
      const protocol = url.protocol.toLowerCase();
      const hostname = url.hostname.toLowerCase();
      if (protocol !== 'http:' && protocol !== 'https:') return false;
      if (hostname !== 'linkedin.com' && !hostname.endsWith('.linkedin.com')) return false;

      const segments = url.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.toLowerCase());

      if (segments[0] === 'mwlite') segments.shift();
      if (!segments.length) return false;

      const [first, second] = segments;
      if ((first === 'in' || first === 'pub') && Boolean(second)) return true;
      if (first === 'profile' && second === 'view') return url.searchParams.has('id');

      return false;
    } catch {
      return false;
    }
  };

  const renderConsentPoint = (point: string) => {
    const email = 'info@andbeyondca.com';
    if (!point.includes(email)) return point;
    const parts = point.split(email);
    return (
      <>
        {parts[0]}
        <a href={`mailto:${email}`}>{email}</a>
        {parts.slice(1).join(email)}
      </>
    );
  };

  const getFormValues = (formData: FormData) => {
    const valueOf = (key: string) => ((formData.get(key) as string | null)?.trim() || '');
    return {
      name: valueOf('referrer-name'),
      email: valueOf('referrer-email'),
      company: valueOf('referrer-company'),
      companyIndustry: valueOf('referrer-company-industry'),
      companyIndustryOther: valueOf('referrer-company-industry-other'),
      workType: valueOf('work-type'),
      linkedin: valueOf('referrer-linkedin'),
      phone: valueOf('referrer-phone'),
      country: valueOf('referrer-country'),
      referralType: valueOf('referral-type'),
      monthlySlots: valueOf('monthly-slots'),
      targetRoles: valueOf('target-roles'),
      regions: valueOf('regions'),
      constraints: valueOf('constraints'),
    };
  };

  const validateValues = (values: ReturnType<typeof getFormValues>) => {
    const nextErrors: Record<string, string> = {};

    if (!values.name) nextErrors['referrer-name'] = 'Please enter your name.';

    if (!values.email) {
      nextErrors['referrer-email'] = 'Please enter your work email.';
    } else if (!isValidEmail(values.email)) {
      nextErrors['referrer-email'] = 'Please enter a valid email address.';
    }

    if (!values.companyIndustry) nextErrors['referrer-company-industry'] = 'Please select the company industry.';
    if (values.companyIndustry === 'Other' && !values.companyIndustryOther) {
      nextErrors['referrer-company-industry-other'] = 'Please specify the company industry.';
    }
    if (!values.workType) nextErrors['work-type'] = 'Please select a work type.';
    if (!values.phone) nextErrors['referrer-phone'] = 'Please enter your phone number.';
    if (!values.country) nextErrors['referrer-country'] = 'Please select your country of origin.';

    if (!values.referralType) nextErrors['referral-type'] = 'Please select a referral type.';
    if (!values.monthlySlots) nextErrors['monthly-slots'] = 'Please select monthly slots.';

    if (!values.targetRoles) nextErrors['target-roles'] = 'Please enter the teams and roles you cover.';
    if (!values.regions) nextErrors.regions = 'Please enter the regions you cover.';
    if (values.constraints && values.constraints.length > 500) nextErrors.constraints = 'Constraints must be under 500 characters.';

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = getFormValues(formData);
    const validationErrors = validateValues(values);

    const linkedinInput = linkedinInputRef.current;
    const linkedinInvalid = Boolean(values.linkedin) && !isValidLinkedInProfileUrl(values.linkedin);
    linkedinInput?.setCustomValidity('');
    if (linkedinInvalid && linkedinInput) {
      linkedinInput.setCustomValidity('Please enter a valid LinkedIn profile URL.');
    }

    const hasErrors = Object.keys(validationErrors).length > 0;

    if (linkedinInvalid) {
      setErrors(validationErrors);
      setStatus('idle');
      setSubmitting(false);
      linkedinInput?.reportValidity();
      return;
    }

    if (hasErrors) {
      setErrors(validationErrors);
      setStatus('idle');
      setSubmitting(false);
      scrollToFirstError();
      return;
    }

    setErrors({});
    setStatus('submitting');
    setSubmitting(true);

    const payload = {
      name: values.name,
      email: values.email,
      language,
      phone: values.phone,
      country: values.country,
      companyIndustry: values.companyIndustry,
      companyIndustryOther: values.companyIndustryOther,
      workType: values.workType,
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
    } catch {
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
                {t.roleSwitch.prompt}{' '}
                <Link
                  href="/candidate"
                  onClick={() => {
                    startNavigation('/candidate');
                  }}
                >
                  {t.roleSwitch.link}
                </Link>
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
              ref={formRef}
              className="referral-form"
              action="#"
              method="post"
              onSubmit={handleSubmit}
              onReset={() => {
                setErrors({});
                linkedinInputRef.current?.setCustomValidity('');
                setStatus('idle');
                setCompanyIndustrySelection('');
                setCountrySelection('');
                setWorkTypeSelection('');
              }}
            >
              <fieldset>
                <legend>{t.legends.personal}</legend>
                <div className="field-grid field-grid--two">
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
                  <div className={fieldClass('field', 'referrer-phone')}>
                    <label htmlFor="referrer-phone">{t.labels.phone}</label>
                    <input
                      id="referrer-phone"
                      name="referrer-phone"
                      type="text"
                      required
                      aria-invalid={Boolean(errors['referrer-phone'])}
                      aria-describedby="referrer-phone-helper referrer-phone-error"
                      onChange={handleFieldChange('referrer-phone')}
                    />
                    <p className="field-hint" id="referrer-phone-helper">
                      {t.placeholders.phone}
                    </p>
                    <p className="field-error" id="referrer-phone-error" role="alert" aria-live="polite">
                      {errors['referrer-phone']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-country')}>
                    <label htmlFor="referrer-country">{t.labels.country}</label>
                    <Select
                      id="referrer-country"
                      name="referrer-country"
                      options={countryOptions()}
                      placeholder={t.selects.selectLabel}
                      required
                      value={countrySelection}
                      ariaDescribedBy="referrer-country-error"
                      ariaInvalid={Boolean(errors['referrer-country'])}
                      onChange={(value) => {
                        setCountrySelection(toSingleValue(value));
                        clearError('referrer-country');
                      }}
                    />
                    <p className="field-error" id="referrer-country-error" role="alert" aria-live="polite">
                      {errors['referrer-country']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-linkedin')}>
                    <label htmlFor="referrer-linkedin">{t.labels.linkedin}</label>
                    <input
                      id="referrer-linkedin"
                      name="referrer-linkedin"
                      type="url"
                      ref={linkedinInputRef}
                      aria-invalid={Boolean(errors['referrer-linkedin'])}
                      aria-describedby="referrer-linkedin-error"
                      placeholder={t.placeholders.linkedin}
                      onChange={handleLinkedInChange}
                    />
                    <p className="field-error" id="referrer-linkedin-error" role="alert" aria-live="polite">
                      {errors['referrer-linkedin']}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.company}</legend>
                <div className="field-grid field-grid--two">
                  <div className={fieldClass('field', 'referrer-company')}>
                    <label htmlFor="referrer-company">{t.labels.company}</label>
                    <input
                      id="referrer-company"
                      name="referrer-company"
                      type="text"
                      aria-invalid={Boolean(errors['referrer-company'])}
                      aria-describedby="referrer-company-error"
                      onChange={handleFieldChange('referrer-company')}
                    />
                    <p className="field-error" id="referrer-company-error" role="alert" aria-live="polite">
                      {errors['referrer-company']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'referrer-company-industry')}>
                    <label htmlFor="referrer-company-industry">{t.labels.companyIndustry}</label>
                    <Select
                      id="referrer-company-industry"
                      name="referrer-company-industry"
                      options={companyIndustryOptions(language)}
                      placeholder={t.selects.selectLabel}
                      required
                      value={companyIndustrySelection}
                      ariaDescribedBy="referrer-company-industry-error"
                      ariaInvalid={Boolean(errors['referrer-company-industry'])}
                      onChange={(value) => {
                        const next = toSingleValue(value);
                        setCompanyIndustrySelection(next);
                        clearError('referrer-company-industry');
                        if (next !== 'Other') clearError('referrer-company-industry-other');
                      }}
                    />
                    <p className="field-error" id="referrer-company-industry-error" role="alert" aria-live="polite">
                      {errors['referrer-company-industry']}
                    </p>
                  </div>
                  {companyIndustrySelection === 'Other' && (
                    <div className={fieldClass('field', 'referrer-company-industry-other')}>
                      <label htmlFor="referrer-company-industry-other">{t.labels.companyIndustryOther}</label>
                      <input
                        id="referrer-company-industry-other"
                        name="referrer-company-industry-other"
                        type="text"
                        placeholder={t.placeholders.companyIndustryOther}
                        aria-invalid={Boolean(errors['referrer-company-industry-other'])}
                        aria-describedby="referrer-company-industry-other-error"
                        onChange={handleFieldChange('referrer-company-industry-other')}
                      />
                      <p
                        className="field-error"
                        id="referrer-company-industry-other-error"
                        role="alert"
                        aria-live="polite"
                      >
                        {errors['referrer-company-industry-other']}
                      </p>
                    </div>
                  )}
                  <div className={fieldClass('field', 'work-type')}>
                    <label htmlFor="work-type">{t.labels.workType}</label>
                    <Select
                      id="work-type"
                      name="work-type"
                      options={workTypeOptions(language)}
                      placeholder={t.selects.selectLabel}
                      required
                      value={workTypeSelection}
                      ariaDescribedBy="work-type-error"
                      ariaInvalid={Boolean(errors['work-type'])}
                      onChange={(value) => {
                        setWorkTypeSelection(toSingleValue(value));
                        clearError('work-type');
                      }}
                    />
                    <p className="field-error" id="work-type-error" role="alert" aria-live="polite">
                      {errors['work-type']}
                    </p>
                  </div>
                </div>
              </fieldset>

              <section className="consent-section" aria-labelledby="consent-title">
                <div className="consent-card">
                  <h2 id="consent-title">{t.consentTitle}</h2>
                  <p>{t.consentIntro}</p>
                  <ul className="consent-list">
                    {t.consentPoints.map((item, index) => (
                      <li key={index}>{renderConsentPoint(item)}</li>
                    ))}
                  </ul>
                  <div className="consent-checkbox">
                    <input
                      id="consent-legal"
                      name="consent-legal"
                      type="checkbox"
                      required
                      aria-describedby="consent-legal-help"
                    />
                    <label htmlFor="consent-legal">{t.consentAgreement}</label>
                  </div>
                </div>
              </section>

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
                  <button className="btn ghost" type="reset">
                    {t.buttons.reset}
                  </button>
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
                </div>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
