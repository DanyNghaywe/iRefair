'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { ActionBtn } from '@/components/ActionBtn';
import { AppShell } from '@/components/AppShell';
import { Confetti, useConfetti } from '@/components/Confetti';
import { PublicFooter } from '@/components/PublicFooter';
import { Select } from '@/components/Select';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { useNavigationLoader } from '@/components/NavigationLoader';
import { countryOptions } from '@/lib/countries';
import { usePersistedLanguage } from '@/lib/usePersistedLanguage';

type Language = 'en' | 'fr';

// Stable values; labels are localized below
const LANGUAGE_VALUES = ['English', 'Arabic', 'French', 'Other'] as const;
const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_RESUME_SIZE = 10 * 1024 * 1024;

const PROVINCES: string[] = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Nova Scotia',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Northwest Territories',
  'Nunavut',
  'Yukon',
];
// Stable values; labels are localized below
const INDUSTRY_VALUES: string[] = [
  'Information Technology (IT)',
  'Finance / Banking / Accounting',
  'Healthcare / Medical',
  'Education / Academia',
  'Engineering / Construction',
  'Marketing / Advertising / PR',
  'Media / Entertainment / Journalism',
  'Legal / Law',
  'Human Resources / Recruitment',
  'Retail / E-commerce',
  'Hospitality / Travel / Tourism',
  'Logistics / Transportation',
  'Manufacturing',
  'Non-Profit / NGO',
  'Real Estate',
  'Energy / Utilities',
  'Telecommunications',
  'Agriculture / Food Industry',
  'Compliance/ Audit/ Monitoring & Evaluation',
  'Other',
];
// Stable values; labels are localized below
const EMPLOYMENT_VALUES: string[] = ['Yes', 'No', 'Temporary Work'];

type Option = { value: string; label: string };

function yesNoOptions(lang: Language): Option[] {
  const [yes, no] = lang === 'fr' ? ['Oui', 'Non'] : ['Yes', 'No'];
  return [
    { value: 'Yes', label: yes },
    { value: 'No', label: no },
  ];
}

function languageOptions(lang: Language): Option[] {
  const labels =
    lang === 'fr'
      ? { English: 'Anglais', Arabic: 'Arabe', French: 'Français', Other: 'Autre' }
      : { English: 'English', Arabic: 'Arabic', French: 'French', Other: 'Other' };
  return LANGUAGE_VALUES.map((v) => ({ value: v, label: labels[v] }));
}

function industryOptions(lang: Language): Option[] {
  if (lang === 'fr') {
    const map: Record<string, string> = {
      'Information Technology (IT)': "Technologies de l'information (TI)",
      'Finance / Banking / Accounting': 'Finance / Banque / Comptabilité',
      'Healthcare / Medical': 'Santé / Médical',
      'Education / Academia': 'Éducation / Université',
      'Engineering / Construction': 'Ingénierie / Construction',
      'Marketing / Advertising / PR': 'Marketing / Publicité / RP',
      'Media / Entertainment / Journalism': 'Médias / Divertissement / Journalisme',
      'Legal / Law': 'Juridique / Droit',
      'Human Resources / Recruitment': 'Ressources humaines / Recrutement',
      'Retail / E-commerce': 'Commerce de détail / E-commerce',
      'Hospitality / Travel / Tourism': 'Hôtellerie / Voyage / Tourisme',
      'Logistics / Transportation': 'Logistique / Transport',
      Manufacturing: 'Fabrication',
      'Non-Profit / NGO': 'Organisme à but non lucratif / ONG',
      'Real Estate': 'Immobilier',
      'Energy / Utilities': 'Énergie / Services publics',
      Telecommunications: 'Télécommunications',
      'Agriculture / Food Industry': 'Agriculture / Agroalimentaire',
      'Compliance/ Audit/ Monitoring & Evaluation': 'Conformité / Audit / Suivi & Évaluation',
      Other: 'Autre',
    };
    return INDUSTRY_VALUES.map((v) => ({ value: v, label: map[v] ?? v }));
  }
  return INDUSTRY_VALUES.map((v) => ({ value: v, label: v }));
}

function employmentOptions(lang: Language): Option[] {
  if (lang === 'fr') {
    const map: Record<string, string> = { Yes: 'Oui', No: 'Non', 'Temporary Work': 'Travail temporaire' };
    return EMPLOYMENT_VALUES.map((v) => ({ value: v, label: map[v] ?? v }));
  }
  return EMPLOYMENT_VALUES.map((v) => ({ value: v, label: v }));
}

const translations: Record<
  Language,
  {
    eyebrow: string;
    title: string;
    lead: string;
    success: string;
    statusMessages: { ok: string; error: string };
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
    eyebrow: 'For candidates',
    title: 'Candidate referral request',
    lead: "Tell us your background and target roles. We'll pair you with referrers when they're available.",
    success: 'Request sent. We will notify you when a referrer is available.',
    statusMessages: {
      ok: "We've received your request. We'll follow up by email soon.",
      error: "We couldn't send your request right now. Please try again in a moment.",
    },
    legends: {
      details: 'Personal Information',
      profiles: 'Your profiles',
      preferences: 'Role preferences',
      locationAuth: 'Location and Work Authorization',
      professionalProfile: 'Professional Profile',
      experience: 'Experience snapshot',
      context: 'Referral context',
      attachments: 'Attachments (optional)',
    },
    labels: {
      firstName: 'First Name',
      middleName: 'Middle Name',
      familyName: 'Family Name',
      email: 'Email address',
      languagesSpoken: 'Languages Spoken',
      languagesOther: 'Other language',
      locatedCanada: 'Are you currently located in Canada?',
      province: 'If yes, which province',
      authorizedCanada: 'Are you legally authorized to work in Canada?',
      eligibleMoveCanada: 'Are you eligible to move and work in Canada in the next 6 months?',
      industryType: 'Education/Experience Industry Type',
      industryOther: 'Other industry type',
      employmentStatus: 'Are you currently employed?',
      countryOfOrigin: 'Country of Origin',
      phone: 'Phone Number',
      linkedin: 'LinkedIn Profile',
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
      phone: '+1-XXX-XXXX or +961-XX-XXXXXX',
      languagesOther: 'Please specify',
      province: 'Select province',
      industryOther: 'Please specify',
      countryOfOrigin: 'e.g. Canada',
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
      'iRefair, &Beyond Consulting, IM Power SARL and inaspire and their legal founders assume no liability at all including but not limited to: hiring outcomes, internal processes, or employer decisions.',
      'My contact and employer details will be kept confidential and will not be shared without my consent.',
      'I may request to update or delete my information at any time by contacting info@andbeyondca.com.',
      'My participation is entirely optional, and I can opt out at any time via contacting info@andbeyondca.com.',
    ],
    consentAgreement: 'I have read, understood, and agree to the above terms.',
  },
  fr: {
    eyebrow: 'Pour les candidats',
    title: 'Demande de recommandation candidat',
    lead: 'Parlez-nous de votre parcours et des postes visés. Nous vous mettrons en relation avec des référents disponibles.',
    success: 'Demande envoyée. Nous vous informerons lorsqu’un référent sera disponible.',
    statusMessages: {
      ok: 'Nous avons bien reçu votre demande. Nous vous contacterons bientôt par e-mail.',
      error: "Nous ne pouvons pas envoyer votre demande pour l'instant. Veuillez réessayer dans un moment.",
    },
    legends: {
      details: 'Informations personnelles',
      profiles: 'Vos profils',
      preferences: 'Préférences de poste',
      locationAuth: 'Localisation et autorisation de travail',
      professionalProfile: 'Profil professionnel',
      experience: "Résumé de l'expérience",
      context: 'Contexte de recommandation',
      attachments: 'Pièces jointes (optionnel)',
    },
    labels: {
      firstName: 'Prenom',
      middleName: 'Deuxieme prenom',
      familyName: 'Nom de famille',
      email: 'Adresse email',
      languagesSpoken: 'Langues parlees',
      languagesOther: 'Autre langue',
      locatedCanada: 'Êtes-vous actuellement au Canada ?',
      province: 'Si oui, quelle province',
      authorizedCanada: 'Êtes-vous autorisé(e) à travailler au Canada ?',
      eligibleMoveCanada: 'Pouvez-vous vous installer et travailler au Canada dans les 6 prochains mois ?',
      industryType: "Type d'industrie (formation/expérience)",
      industryOther: 'Autre industrie',
      employmentStatus: 'Êtes-vous actuellement en emploi ?',
      countryOfOrigin: "Pays d'origine",
      phone: 'Numero de telephone',
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
      phone: '+1-XXX-XXXX ou +961-XX-XXXXXX',
      languagesOther: 'Precisez',
      province: 'Sélectionnez une province',
      industryOther: 'Precisez',
      countryOfOrigin: 'ex. France',
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
      "iRefair, &Beyond Consulting, IM Power SARL et inaspire ainsi que leurs fondateurs légaux déclinent toute responsabilité (y compris, sans s'y limiter) concernant les résultats d'embauche, les processus internes ou les décisions de l'employeur.",
      'Mes coordonnées et informations employeur resteront confidentielles et ne seront pas partagées sans mon consentement.',
      'Je peux demander la mise à jour ou la suppression de mes informations à tout moment en contactant info@andbeyondca.com.',
      'Ma participation est entièrement facultative, et je peux me retirer à tout moment en contactant info@andbeyondca.com.',
    ],
    consentAgreement: "J'ai lu, compris et j'accepte les conditions ci-dessus.",
  },
};

export default function CandidatePage() {
  const { startNavigation } = useNavigationLoader();
  const { language, setLanguage, withLanguage } = usePersistedLanguage();
  const [resumeName, setResumeName] = useState('');
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const linkedinInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'error'>('idle');
  const formRef = useRef<HTMLFormElement | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confetti = useConfetti();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [languageSelection, setLanguageSelection] = useState<string[]>([]);
  const [countrySelection, setCountrySelection] = useState('');
  const [locatedInCanada, setLocatedInCanada] = useState('');
  const [provinceSelection, setProvinceSelection] = useState('');
  const [authorizedCanada, setAuthorizedCanada] = useState('');
  const [eligibleMoveCanada, setEligibleMoveCanada] = useState('');
  const [industrySelection, setIndustrySelection] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('');

  const t = translations[language];

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
    clearError('linkedin');
  };

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

  const isAllowedResume = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const typeAllowed = file.type ? ALLOWED_RESUME_TYPES.includes(file.type) : false;
    const extensionAllowed = extension ? ALLOWED_RESUME_EXTENSIONS.includes(extension) : false;
    return typeAllowed || extensionAllowed;
  };

  const toSingleValue = (value: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

  const getFormValues = (formData: FormData) => {
    const valueOf = (key: string) => ((formData.get(key) as string | null)?.trim() || '');
    return {
      firstName: valueOf('first-name'),
      middleName: valueOf('middle-name'),
      familyName: valueOf('family-name'),
      email: valueOf('email'),
      languages: (formData.getAll('languages') as string[]).map((value) => value.trim()).filter(Boolean),
      languagesOther: valueOf('languages-other'),
      locatedCanada: valueOf('located-canada'),
      province: valueOf('province'),
      authorizedCanada: valueOf('authorized-canada'),
      eligibleMoveCanada: valueOf('eligible-move-canada'),
      industryType: valueOf('industry-type'),
      industryOther: valueOf('industry-other'),
      employmentStatus: valueOf('employment-status'),
      countryOfOrigin: valueOf('country-of-origin'),
      phone: valueOf('phone'),
      linkedin: valueOf('linkedin'),
      consentLegal: formData.get('consent-legal') === 'on',
    };
  };

  const validateValues = (values: ReturnType<typeof getFormValues>) => {
    const nextErrors: Record<string, string> = {};

    if (!values.firstName) nextErrors['first-name'] = 'Please enter your first name.';
    if (!values.familyName) nextErrors['family-name'] = 'Please enter your family name.';

    if (!values.email) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!isValidEmail(values.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!values.phone) {
      nextErrors.phone = 'Please enter your phone number.';
    }

    if (!values.locatedCanada) {
      nextErrors['located-canada'] = 'Please select your current location status.';
    }

    if (values.locatedCanada === 'Yes') {
      if (!values.province) {
        nextErrors.province = 'Please select your province.';
      }

      if (!values.authorizedCanada) {
        nextErrors['authorized-canada'] = 'Please confirm your work authorization.';
      }
    }

    if (values.locatedCanada === 'No' && !values.eligibleMoveCanada) {
      nextErrors['eligible-move-canada'] = 'Please confirm if you can move and work in Canada in the next 6 months.';
    }

    if (!values.industryType) {
      nextErrors['industry-type'] = 'Please select an industry type.';
    }

    if (values.industryType === 'Other' && !values.industryOther) {
      nextErrors['industry-other'] = 'Please specify the other industry type.';
    }

    if (!values.employmentStatus) {
      nextErrors['employment-status'] = 'Please select your employment status.';
    }

    if (!values.languages.length) {
      nextErrors.languages = 'Please select at least one language.';
    }

    if (values.languages.includes('Other') && !values.languagesOther) {
      nextErrors['languages-other'] = 'Please specify the other language.';
    }

    if (!values.countryOfOrigin) {
      nextErrors['country-of-origin'] = 'Please select your country of origin.';
    }

    if (!values.consentLegal) {
      nextErrors['consent-legal'] = 'Please confirm your consent to proceed.';
    }

    return nextErrors;
  };

  const handleResumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setResumeName('');
      clearError('resume');
      return;
    }

    if (!isAllowedResume(file) || file.size > MAX_RESUME_SIZE) {
      setErrors((prev) => ({
        ...prev,
        resume: 'Please upload a PDF or DOC/DOCX file under 10MB.',
      }));
      setResumeName('');
      event.target.value = '';
      return;
    }

    clearError('resume');
    setResumeName(file.name);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const honeypot = (formData.get('website') as string | null)?.trim() || '';
    const values = getFormValues(formData);
    const validationErrors = validateValues(values);

    const resumeFile = resumeInputRef.current?.files?.[0];
    if (resumeFile && (!isAllowedResume(resumeFile) || resumeFile.size > MAX_RESUME_SIZE)) {
      validationErrors.resume = 'Please upload a PDF or DOC/DOCX file under 10MB.';
    }

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

    const formBody = new FormData();
    formBody.append('firstName', values.firstName);
    formBody.append('middleName', values.middleName);
    formBody.append('familyName', values.familyName);
    formBody.append('email', values.email);
    formBody.append('language', language);
    formBody.append('locatedCanada', values.locatedCanada);
    formBody.append('province', values.province);
    formBody.append('authorizedCanada', values.authorizedCanada);
    formBody.append('eligibleMoveCanada', values.eligibleMoveCanada);
    formBody.append('languages', values.languages.join(', '));
    formBody.append('languagesOther', values.languagesOther);
    formBody.append('industryType', values.industryType);
    formBody.append('industryOther', values.industryOther);
    formBody.append('employmentStatus', values.employmentStatus);
    formBody.append('countryOfOrigin', values.countryOfOrigin);
    formBody.append('phone', values.phone);
    formBody.append('website', honeypot);
    if (resumeFile) {
      formBody.append('resume', resumeFile);
    }

    try {
      const response = await fetch('/api/candidate', {
        method: 'POST',
        body: formBody,
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }

      setStatus('ok');
      confetti.trigger();
      setShowSuccessAnimation(true);
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main>
        <section className="card page-card referral-card" aria-labelledby="referral-title">
          <div className="role-switch">
            <span className="role-switch__text">
              {t.switchText.prompt}{' '}
              <Link
                href={withLanguage('/referrer')}
                onClick={() => {
                  startNavigation('/referrer');
                }}
              >
                {t.switchText.link}
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
                linkedinInputRef.current?.setCustomValidity('');
                setStatus('idle');
                setLanguageSelection([]);
                setCountrySelection('');
                setLocatedInCanada('');
                setProvinceSelection('');
                setAuthorizedCanada('');
                setEligibleMoveCanada('');
                setIndustrySelection('');
                setEmploymentStatus('');
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
                <legend>{t.legends.details}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'first-name')}>
                    <label htmlFor="first-name">{t.labels.firstName}</label>
                    <input
                      id="first-name"
                      name="first-name"
                      type="text"
                      required
                      autoComplete="given-name"
                      aria-invalid={Boolean(errors['first-name'])}
                      aria-describedby="first-name-error"
                      onChange={handleFieldChange('first-name')}
                    />
                    <p className="field-error" id="first-name-error" role="alert" aria-live="polite">
                      {errors['first-name']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'middle-name')}>
                    <label htmlFor="middle-name">
                      {t.labels.middleName} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="middle-name"
                      name="middle-name"
                      type="text"
                      autoComplete="additional-name"
                      aria-invalid={Boolean(errors['middle-name'])}
                      aria-describedby="middle-name-error"
                      onChange={handleFieldChange('middle-name')}
                    />
                    <p className="field-error" id="middle-name-error" role="alert" aria-live="polite">
                      {errors['middle-name']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'family-name')}>
                    <label htmlFor="family-name">{t.labels.familyName}</label>
                    <input
                      id="family-name"
                      name="family-name"
                      type="text"
                      required
                      autoComplete="family-name"
                      aria-invalid={Boolean(errors['family-name'])}
                      aria-describedby="family-name-error"
                      onChange={handleFieldChange('family-name')}
                    />
                    <p className="field-error" id="family-name-error" role="alert" aria-live="polite">
                      {errors['family-name']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'country-of-origin')}>
                    <label htmlFor="country-of-origin">{t.labels.countryOfOrigin}</label>
                    <Select
                      id="country-of-origin"
                      name="country-of-origin"
                      options={countryOptions()}
                      placeholder={t.selects.selectLabel}
                      required
                      value={countrySelection}
                      ariaDescribedBy="country-of-origin-error"
                      ariaInvalid={Boolean(errors['country-of-origin'])}
                      onChange={(value) => {
                        setCountrySelection(toSingleValue(value));
                        clearError('country-of-origin');
                      }}
                    />
                    <p className="field-error" id="country-of-origin-error" role="alert" aria-live="polite">
                      {errors['country-of-origin']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'email')}>
                    <label htmlFor="email">{t.labels.email}</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby="email-error"
                      onChange={handleFieldChange('email')}
                    />
                    <p className="field-error" id="email-error" role="alert" aria-live="polite">
                      {errors.email}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'languages')}>
                    <label htmlFor="languages">{t.labels.languagesSpoken}</label>
                    <Select
                      id="languages"
                      name="languages"
                      options={languageOptions(language)}
                      placeholder={t.selects.selectLabel}
                      required
                      multi
                      values={languageSelection}
                      ariaDescribedBy="languages-error"
                      ariaInvalid={Boolean(errors.languages)}
                      onChange={(value) => {
                        const next = Array.isArray(value) ? value : value ? [value] : [];
                        setLanguageSelection(next);
                        clearError('languages');
                        if (!next.includes('Other')) clearError('languages-other');
                      }}
                    />
                    <p className="field-error" id="languages-error" role="alert" aria-live="polite">
                      {errors.languages}
                    </p>
                  </div>
                  {languageSelection.includes('Other') && (
                    <div className={fieldClass('field', 'languages-other')}>
                      <label htmlFor="languages-other">{t.labels.languagesOther}</label>
                      <input
                        id="languages-other"
                        name="languages-other"
                        type="text"
                        placeholder={t.placeholders.languagesOther}
                        aria-invalid={Boolean(errors['languages-other'])}
                        aria-describedby="languages-other-error"
                        onChange={handleFieldChange('languages-other')}
                      />
                      <p className="field-error" id="languages-other-error" role="alert" aria-live="polite">
                        {errors['languages-other']}
                      </p>
                    </div>
                  )}
                  <div className={fieldClass('field', 'phone')}>
                    <label htmlFor="phone">{t.labels.phone}</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      placeholder={t.placeholders.phone}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby="phone-helper phone-error"
                      onChange={handleFieldChange('phone')}
                    />
                    <p className="field-hint" id="phone-helper">
                      {t.placeholders.phone}
                    </p>
                    <p className="field-error" id="phone-error" role="alert" aria-live="polite">
                      {errors.phone}
                    </p>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.locationAuth}</legend>
                <div className="field-grid field-grid--two">
                  <div className={fieldClass('field', 'located-canada')}>
                    <label htmlFor="located-canada">{t.labels.locatedCanada}</label>
                    <Select
                      id="located-canada"
                      name="located-canada"
                      options={yesNoOptions(language)}
                      placeholder={t.selects.selectLabel}
                      required
                      value={locatedInCanada}
                      ariaDescribedBy="located-canada-error"
                      ariaInvalid={Boolean(errors['located-canada'])}
                      onChange={(value) => {
                        const next = toSingleValue(value);
                        setLocatedInCanada(next);
                        clearError('located-canada');
                        setAuthorizedCanada('');
                        clearError('authorized-canada');
                        setEligibleMoveCanada('');
                        clearError('eligible-move-canada');
                        if (next !== 'Yes') {
                          setProvinceSelection('');
                          clearError('province');
                        }
                      }}
                    />
                    <p className="field-error" id="located-canada-error" role="alert" aria-live="polite">
                      {errors['located-canada']}
                    </p>
                  </div>
                  {locatedInCanada === 'Yes' && (
                    <div className={fieldClass('field', 'province')}>
                      <label htmlFor="province">{t.labels.province}</label>
                      <Select
                        id="province"
                        name="province"
                        options={PROVINCES}
                        placeholder={t.placeholders.province}
                        required
                        value={provinceSelection}
                        ariaDescribedBy="province-error"
                        ariaInvalid={Boolean(errors.province)}
                        onChange={(value) => {
                        setProvinceSelection(toSingleValue(value));
                        clearError('province');
                      }}
                    />
                    <p className="field-error" id="province-error" role="alert" aria-live="polite">
                      {errors.province}
                    </p>
                  </div>
                  )}
                  {locatedInCanada === 'Yes' && (
                    <div className={fieldClass('field', 'authorized-canada')}>
                      <label htmlFor="authorized-canada">{t.labels.authorizedCanada}</label>
                      <Select
                        id="authorized-canada"
                        name="authorized-canada"
                        options={yesNoOptions(language)}
                        placeholder={t.selects.selectLabel}
                        required
                        value={authorizedCanada}
                        ariaDescribedBy="authorized-canada-error"
                        ariaInvalid={Boolean(errors['authorized-canada'])}
                        onChange={(value) => {
                          setAuthorizedCanada(toSingleValue(value));
                          clearError('authorized-canada');
                        }}
                      />
                      <p className="field-error" id="authorized-canada-error" role="alert" aria-live="polite">
                        {errors['authorized-canada']}
                      </p>
                    </div>
                  )}
                  {locatedInCanada === 'No' && (
                    <div className={fieldClass('field', 'eligible-move-canada')}>
                      <label htmlFor="eligible-move-canada">{t.labels.eligibleMoveCanada}</label>
                      <Select
                        id="eligible-move-canada"
                        name="eligible-move-canada"
                        options={yesNoOptions(language)}
                        placeholder={t.selects.selectLabel}
                        required
                        value={eligibleMoveCanada}
                        ariaDescribedBy="eligible-move-canada-error"
                        ariaInvalid={Boolean(errors['eligible-move-canada'])}
                        onChange={(value) => {
                          setEligibleMoveCanada(toSingleValue(value));
                          clearError('eligible-move-canada');
                        }}
                      />
                      <p className="field-error" id="eligible-move-canada-error" role="alert" aria-live="polite">
                        {errors['eligible-move-canada']}
                      </p>
                    </div>
                  )}
                </div>
              </fieldset>

              <fieldset>
                <legend>{t.legends.professionalProfile}</legend>
                <div className="field-grid">
                  <div className={fieldClass('field', 'industry-type')}>
                    <label htmlFor="industry-type">{t.labels.industryType}</label>
                    <Select
                      id="industry-type"
                      name="industry-type"
                      options={industryOptions(language)}
                      placeholder={t.selects.selectLabel}
                      required
                      value={industrySelection}
                      ariaDescribedBy="industry-type-error"
                      ariaInvalid={Boolean(errors['industry-type'])}
                      onChange={(value) => {
                        const next = toSingleValue(value);
                        setIndustrySelection(next);
                        clearError('industry-type');
                        if (next !== 'Other') {
                          clearError('industry-other');
                        }
                      }}
                    />
                    <p className="field-error" id="industry-type-error" role="alert" aria-live="polite">
                      {errors['industry-type']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'employment-status')}>
                    <label htmlFor="employment-status">{t.labels.employmentStatus}</label>
                    <Select
                      id="employment-status"
                      name="employment-status"
                      options={employmentOptions(language)}
                      placeholder={t.selects.selectLabel}
                      required
                      value={employmentStatus}
                      ariaDescribedBy="employment-status-error"
                      ariaInvalid={Boolean(errors['employment-status'])}
                      onChange={(value) => {
                        setEmploymentStatus(toSingleValue(value));
                        clearError('employment-status');
                      }}
                    />
                    <p className="field-error" id="employment-status-error" role="alert" aria-live="polite">
                      {errors['employment-status']}
                    </p>
                  </div>
                  <div className={fieldClass('field', 'linkedin')}>
                    <label htmlFor="linkedin">
                      {t.labels.linkedin} <span className="optional">{t.optional}</span>
                    </label>
                    <input
                      id="linkedin"
                      name="linkedin"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      ref={linkedinInputRef}
                      aria-invalid={Boolean(errors.linkedin)}
                      aria-describedby="linkedin-error"
                      placeholder={t.placeholders.linkedin}
                      onChange={handleLinkedInChange}
                    />
                    <p className="field-error" id="linkedin-error" role="alert" aria-live="polite">
                      {errors.linkedin}
                    </p>
                  </div>
                  {industrySelection === 'Other' && (
                    <div className={fieldClass('field', 'industry-other')}>
                      <label htmlFor="industry-other">{t.labels.industryOther}</label>
                      <input
                        id="industry-other"
                        name="industry-other"
                        type="text"
                        placeholder={t.placeholders.industryOther}
                        aria-invalid={Boolean(errors['industry-other'])}
                        aria-describedby="industry-other-error"
                        onChange={handleFieldChange('industry-other')}
                      />
                      <p className="field-error" id="industry-other-error" role="alert" aria-live="polite">
                        {errors['industry-other']}
                      </p>
                    </div>
                  )}
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
                    <ActionBtn
                      variant="ghost"
                      className="file-upload-trigger"
                      onClick={() => resumeInputRef.current?.click()}
                      aria-describedby="resume-helper resume-file-name resume-error"
                    >
                      {t.upload}
                    </ActionBtn>
                    <span id="resume-file-name" className="file-upload-name" aria-live="polite">
                      {resumeName || t.noFile}
                    </span>
                  </div>
                  <p id="resume-helper" className="field-hint">
                    {t.uploadHint}
                  </p>
                  <p className="field-error" id="resume-error" role="alert" aria-live="polite">
                    {errors.resume}
                  </p>
                </div>
              </fieldset>

              <section className="consent-section" aria-labelledby="consent-title">
                <div className="consent-card">
                  <h2 id="consent-title">{t.consentTitle}</h2>
                  <p>{t.consentIntro}</p>
                  <ul className="consent-list">
                    {t.consentPoints.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                  <div className={fieldClass('consent-checkbox', 'consent-legal')}>
                    <input
                      id="consent-legal"
                      name="consent-legal"
                      type="checkbox"
                      required
                      aria-describedby="consent-legal-error"
                      onChange={handleFieldChange('consent-legal')}
                    />
                    <label htmlFor="consent-legal">{t.consentAgreement}</label>
                    <p className="field-error" id="consent-legal-error" role="alert" aria-live="polite">
                      {errors['consent-legal']}
                    </p>
                  </div>
                </div>
              </section>

              <div className="form-footer">
                <div className="footer-status">
                  {status === 'ok' && (
                    <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                      <SuccessAnimation
                        show={showSuccessAnimation}
                        variant="submit"
                        size="sm"
                        onAnimationComplete={() => setShowSuccessAnimation(false)}
                      />
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
    </AppShell>
  );
}
