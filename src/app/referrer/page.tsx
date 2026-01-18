'use client';

import Link from 'next/link';
import { FormEvent, useRef, useState } from 'react';
import { ActionBtn } from '@/components/ActionBtn';
import { AppShell } from '@/components/AppShell';
import { Confetti, useConfetti } from '@/components/Confetti';
import { useLanguage } from '@/components/LanguageProvider';
import { PublicFooter } from '@/components/PublicFooter';
import { Select } from '@/components/Select';
import { SubmissionSuccessModal } from '@/components/SubmissionSuccessModal';
import { useNavigationLoader } from '@/components/NavigationLoader';
import { countryOptions } from '@/lib/countries';
import { formMessages } from '@/lib/translations';

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
    const map: Record<string, string> = { 'On-site': 'Sur site', Remote: 'Télétravail', Hybrid: 'Hybride' };
    return ['On-site', 'Remote', 'Hybrid'].map((v) => ({ value: v, label: map[v] }));
  }
  return ['On-site', 'Remote', 'Hybrid'].map((v) => ({ value: v, label: v }));
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
      careersPortal: string;
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
      phone: string;
      country: string;
      workTypeOther: string;
      companyIndustryOther: string;
      careersPortal?: string;
    };
    selects: { selectLabel: string };
    optional: string;
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
    success: {
      title: string;
      thankYou: string;
      iRrefLabel: string;
      founderIntro: string;
      founderCtaLabel: string;
      founderCtaNote: string;
    };
  }
> = {
  en: {
    roleSwitch: { prompt: 'Not a referrer?', link: 'Switch to applicant' },
    languageLabel: 'Language',
    english: 'English',
    french: 'Français',
    eyebrow: 'For referrers',
    title: 'Referrer referral form',
    lead: 'Share the teams, roles, and capacity you have. Log an applicant now or just your availability.',
    legends: {
      personal: 'Personal Information',
      company: 'Company Details',
      workType: 'Type of work',
    },
    labels: {
      fullName: 'Full Name',
      workEmail: 'Email address',
      phone: 'Phone Number',
      country: 'Country of Origin',
      company: 'Company Name',
      careersPortal: 'Careers Portal URL',
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
      phone: '+1-XXX-XXXX or +961-XX-XXXXXX',
      country: 'e.g. Canada',
      companyIndustryOther: 'Please specify',
      workTypeOther: 'Please specify',
      careersPortal: 'https://company.com/careers',
    },
    selects: {
      selectLabel: 'Select',
    },
    optional: '(optional)',
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
      'By submitting this form, I agree to be contacted by iRefair when a potential applicant may align with open roles at my company. I understand and acknowledge the following:',
    consentPoints: [
      'iRefair is a voluntary, community-driven initiative, and I am under no obligation to make any referrals.',
      'Any referral I make is based on my own discretion, and I am solely responsible for complying with my company’s internal referral or hiring policies.',
      'iRefair, &Beyond Consulting, IM Power SARL and Inaspire and their legal founders assume no liability at all including but not limited to: hiring outcomes, internal processes, or employer decisions.',
      'My contact and employer details will be kept confidential and will not be shared without my consent.',
      'I may request to update or delete my information at any time by contacting us via email.',
      'My participation is entirely optional, and I can opt out at any time by contacting us via email.',
    ],
    consentAgreement: 'I have read, understood, and agree to the above terms.',
    success: {
      title: 'Thank you for contributing to iRefair',
      thankYou:
        'Thank you for sharing your referrer details and supporting iRefair. Your contribution helps applicants who are actively looking for work and rely on community referrals.',
      iRrefLabel: 'Your iRefair referral ID (iRREF):',
      founderIntro:
        'Our Founder & Managing Director would also like to meet you, get to know you better, and explore how we can collaborate together.',
      founderCtaLabel: 'Schedule a meeting with the Founder',
      founderCtaNote: 'Coming soon: this scheduling link is not active yet.',
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
      careersPortal: 'Portail carrières',
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
      phone: '+1-XXX-XXXX ou +961-XX-XXXXXX',
      country: 'ex. France',
      companyIndustryOther: 'Précisez',
      workTypeOther: 'Précisez',
      careersPortal: 'https://entreprise.com/careers',
    },
    selects: {
      selectLabel: 'Sélectionner',
    },
    optional: '(optionnel)',
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
      'Je peux demander la mise à jour ou la suppression de mes informations à tout moment en nous contactant par courriel.',
      'Ma participation est entièrement facultative, et je peux me retirer à tout moment en nous contactant par courriel.',
    ],
    consentAgreement: "J'ai lu, compris et j'accepte les conditions ci-dessus.",
    success: {
      title: 'Merci de contribuer Aÿ iRefair',
      thankYou:
        "Merci d’avoir partagAc vos informations de rAcfArent et de soutenir iRefair. Votre contribution aide des candidats qui recherchent activement un emploi et comptent sur les recommandations de la communautAc.",
      iRrefLabel: 'Votre identifiant de recommandation iRefair (iRREF) :',
      founderIntro:
        "Le fondateur et directeur gAcnAc ral d’iRefair souhaiterait AAcgalement vous rencontrer pour mieux vous connaAAtre et voir comment vous pourriez collaborer ensemble.",
      founderCtaLabel: 'Planifier un rendez-vous avec le fondateur',
      founderCtaNote: "BAcentAt disponible : le lien de prise de rendez-vous n’est pas encore actif.",
    },
  },
};

export default function ReferrerPage() {
  const { startNavigation } = useNavigationLoader();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const { language, setLanguage, withLanguage } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement | null>(null);
  const linkedinInputRef = useRef<HTMLInputElement | null>(null);
  const [companyIndustrySelection, setCompanyIndustrySelection] = useState('');
  const [countrySelection, setCountrySelection] = useState('');
  const [workTypeSelection, setWorkTypeSelection] = useState('');
  const [iRref, setIRref] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);
  const confetti = useConfetti();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const t = translations[language];
  const formCopy = formMessages.referrer[language];
  const founderMeetLink = (process.env.FOUNDER_MEET_LINK || '').trim();
  const showFounderMeetCta = Boolean(founderMeetLink);

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

  const isValidUrl = (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const renderConsentPoint = (point: string) => {
    const email = 'irefair.andbeyondconsulting@gmail.com';
    const linkTextEn = 'contacting us via email';
    const linkTextFr = 'nous contactant par courriel';
    const linkStyle = { color: '#063770', textDecoration: 'underline', fontWeight: 600 };

    if (point.includes(linkTextEn)) {
      const parts = point.split(linkTextEn);
      return (
        <>
          {parts[0]}
          <a href={`mailto:${email}`} style={linkStyle}>{linkTextEn}</a>
          {parts.slice(1).join(linkTextEn)}
        </>
      );
    }

    if (point.includes(linkTextFr)) {
      const parts = point.split(linkTextFr);
      return (
        <>
          {parts[0]}
          <a href={`mailto:${email}`} style={linkStyle}>{linkTextFr}</a>
          {parts.slice(1).join(linkTextFr)}
        </>
      );
    }

    return point;
  };

  const getFormValues = (formData: FormData) => {
    const valueOf = (key: string) => ((formData.get(key) as string | null)?.trim() || '');
    return {
      name: valueOf('referrer-name'),
      email: valueOf('referrer-email'),
      company: valueOf('referrer-company'),
      careersPortal: valueOf('referrer-careers-portal'),
      companyIndustry: valueOf('referrer-company-industry'),
      companyIndustryOther: valueOf('referrer-company-industry-other'),
      workType: valueOf('work-type'),
      linkedin: valueOf('referrer-linkedin'),
      phone: valueOf('referrer-phone'),
      country: valueOf('referrer-country'),
      website: valueOf('website'),
      consentLegal: formData.get('consent-legal') === 'on',
    };
  };

  const validateValues = (values: ReturnType<typeof getFormValues>) => {
    const nextErrors: Record<string, string> = {};

    if (!values.name) nextErrors['referrer-name'] = formCopy.validation.nameRequired;

    if (!values.email) {
      nextErrors['referrer-email'] = formCopy.validation.emailRequired;
    } else if (!isValidEmail(values.email)) {
      nextErrors['referrer-email'] = formCopy.validation.emailInvalid;
    }

    if (!values.companyIndustry) nextErrors['referrer-company-industry'] = formCopy.validation.companyIndustryRequired;
    if (values.companyIndustry === 'Other' && !values.companyIndustryOther) {
      nextErrors['referrer-company-industry-other'] = formCopy.validation.companyIndustryOtherRequired;
    }
    if (!values.workType) nextErrors['work-type'] = formCopy.validation.workTypeRequired;
    if (!values.phone) nextErrors['referrer-phone'] = formCopy.validation.phoneRequired;
    if (!values.country) nextErrors['referrer-country'] = formCopy.validation.countryRequired;
    if (!values.careersPortal) {
      nextErrors['referrer-careers-portal'] = formCopy.validation.careersPortalRequired;
    } else if (!isValidUrl(values.careersPortal)) {
      nextErrors['referrer-careers-portal'] = formCopy.validation.careersPortalInvalid;
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      ...getFormValues(formData),
      companyIndustry: companyIndustrySelection,
      country: countrySelection,
      workType: workTypeSelection,
    };
    const validationErrors = validateValues(values);

    const linkedinInput = linkedinInputRef.current;
    const linkedinInvalid = Boolean(values.linkedin) && !isValidLinkedInProfileUrl(values.linkedin);
    linkedinInput?.setCustomValidity('');
    if (linkedinInvalid) {
      validationErrors['referrer-linkedin'] = formCopy.validation.linkedinInvalid;
    }

    const hasErrors = Object.keys(validationErrors).length > 0;

    if (hasErrors) {
      setErrors(validationErrors);
      setStatus('idle');
      setSubmitting(false);
      scrollToFirstError();
      return;
    }

    // Use browser native validation for consent checkbox
    const consentCheckbox = event.currentTarget.querySelector<HTMLInputElement>('#consent-legal');
    if (consentCheckbox && !consentCheckbox.checkValidity()) {
      consentCheckbox.reportValidity();
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
      company: values.company,
      careersPortal: values.careersPortal,
      companyIndustry: values.companyIndustry,
      companyIndustryOther: values.companyIndustryOther,
      workType: values.workType,
      linkedin: values.linkedin,
      website: values.website,
    };

    try {
      const response = await fetch('/api/referrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || formCopy.errors.submissionFailed);
      }

      setIRref(typeof data.iRref === 'string' ? data.iRref : null);
      setIsExisting(data.isExisting === true);
      setStatus('ok');
      setSubmittedEmail(values.email);
      setShowSuccessModal(true);
      confetti.trigger();
    } catch {
      setIRref(null);
      setIsExisting(false);
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main>
        <section className="card page-card referrer-card" aria-labelledby="referrer-title">
          <div className="role-switch">
            <span className="role-switch__text">
              {t.roleSwitch.prompt}{' '}
              <Link
                href={withLanguage('/applicant')}
                onClick={() => {
                  startNavigation('/applicant');
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

            {status === 'ok' && iRref && (
              <section
                className="success-panel"
                aria-live="polite"
                aria-label={t.success.title}
                style={{ marginBottom: '1.5rem' }}
              >
                <h3 className="success-title">{t.success.title}</h3>
                <p className="success-text">{t.success.thankYou}</p>

                <p className="success-irain">
                  <span className="success-irain-label">{t.success.iRrefLabel} </span>
                  <code className="success-irain-value">{iRref}</code>
                </p>

                <p className="success-founder">{t.success.founderIntro}</p>

                {showFounderMeetCta ? (
                  <div className="success-founder-actions">
                    <ActionBtn as="link" href={founderMeetLink} variant="ghost" target="_blank" rel="noreferrer">
                      {t.success.founderCtaLabel}
                    </ActionBtn>
                  </div>
                ) : null}
              </section>
            )}

            <form
              ref={formRef}
              className="referral-form"
              action="#"
              method="post"
              noValidate
              onSubmit={handleSubmit}
              onReset={() => {
                setErrors({});
                linkedinInputRef.current?.setCustomValidity('');
                setStatus('idle');
                setIRref(null);
                setIsExisting(false);
                setCompanyIndustrySelection('');
                setCountrySelection('');
                setWorkTypeSelection('');
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-10000px',
                  top: 'auto',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                }}
                aria-hidden="true"
              >
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <fieldset>
                <legend>{t.legends.personal}</legend>
                <div className="field-grid field-grid--two">
                  <div className={fieldClass('field', 'referrer-name')}>
                    <label htmlFor="referrer-name">{t.labels.fullName}</label>
                    <input
                      id="referrer-name"
                      name="referrer-name"
                      type="text"
                      autoComplete="name"
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
                      inputMode="email"
                      autoComplete="email"
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
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
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
                    <label htmlFor="referrer-linkedin">
                      {t.labels.linkedin} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="referrer-linkedin"
                      name="referrer-linkedin"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
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
                    <label htmlFor="referrer-company">
                      {t.labels.company} <span className="optional">{t.optional}</span>
                    </label>
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
                  <div className={fieldClass('field', 'referrer-careers-portal')}>
                    <label htmlFor="referrer-careers-portal">{t.labels.careersPortal}</label>
                    <input
                      id="referrer-careers-portal"
                      name="referrer-careers-portal"
                      type="url"
                      inputMode="url"
                      required
                      placeholder={t.placeholders.careersPortal || 'https://company.com/careers'}
                      aria-invalid={Boolean(errors['referrer-careers-portal'])}
                      aria-describedby="referrer-careers-portal-error"
                      onChange={handleFieldChange('referrer-careers-portal')}
                    />
                    <p
                      className="field-error"
                      id="referrer-careers-portal-error"
                      role="alert"
                      aria-live="polite"
                    >
                      {errors['referrer-careers-portal']}
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
                  <div className="consent-checkbox consent-legal">
                    <input
                      id="consent-legal"
                      name="consent-legal"
                      type="checkbox"
                      required
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
                      <span>{isExisting ? formCopy.statusMessages.okExisting : formCopy.statusMessages.ok}</span>
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="status-banner status-banner--error" role="alert" aria-live="assertive">
                      <span className="status-icon" aria-hidden="true">!</span>
                      <span>{formCopy.statusMessages.error}</span>
                    </div>
                  )}
                </div>
                <div className="actions">
                  <ActionBtn variant="ghost" type="reset">
                    {t.buttons.reset}
                  </ActionBtn>
                  <ActionBtn variant="primary" type="submit" disabled={submitting} aria-busy={submitting}>
                    {submitting ? (
                      <>
                        {t.buttons.submitting}
                        <span className="loading-indicator" aria-hidden="true" />
                      </>
                    ) : (
                      t.buttons.submit
                    )}
                  </ActionBtn>
                </div>
              </div>
            </form>
          </section>
      </main>
      <PublicFooter />
      <Confetti active={confetti.active} onComplete={confetti.reset} />
      <SubmissionSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        email={submittedEmail}
        locale={language}
      />
    </AppShell>
  );
}
