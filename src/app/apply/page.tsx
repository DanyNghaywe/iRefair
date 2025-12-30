'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ActionBtn } from '@/components/ActionBtn';
import { AppShell } from '@/components/AppShell';
import { Confetti, useConfetti } from '@/components/Confetti';
import { useLanguage } from '@/components/LanguageProvider';
import { PublicFooter } from '@/components/PublicFooter';
import { SuccessAnimation } from '@/components/SuccessAnimation';

type Language = 'en' | 'fr';

const translations: Record<
  Language,
  {
    eyebrow: string;
    title: string;
    lead: string;
    applyText: string;
    moreInfo: string;
    moreInfoLink: string;
    labels: {
      applicantId: string;
      applicantKey: string;
      iCrn: string;
      position: string;
      referenceNumber: string;
      resume: string;
    };
    placeholders: {
      applicantId: string;
      applicantKey: string;
      iCrn: string;
      position: string;
      referenceNumber: string;
    };
    upload: string;
    uploadHint: string;
    noFile: string;
    statusMessages: {
      ok: string;
      error: string;
      networkError: string;
    };
    buttons: {
      submit: string;
      submitting: string;
      reset: string;
    };
    errors: {
      applicantId: string;
      applicantKey: string;
      iCrn: string;
      position: string;
      resume: string;
      resumeInvalid: string;
    };
    languageLabel: string;
    english: string;
    french: string;
  }
> = {
  en: {
    eyebrow: 'Application',
    title: 'iRefair - Apply Now',
    lead: 'iRefair is a free initiative created to support Lebanese and Arab newcomers in Canada by connecting them with professionals who can refer them for jobs.',
    applyText: 'Use this form to apply to the company you wish to join. You will need your iRefair iRAIN and the iRefair Company Reference Number (iRCRN).',
    moreInfo: 'For more info, visit',
    moreInfoLink: '&BeyondCA',
    labels: {
      applicantId: 'Your iRAIN *',
      applicantKey: 'Applicant Key *',
      iCrn: 'Enter the iRCRN of the company you wish to join *',
      position: 'Position you are applying for *',
      referenceNumber: "If available, please enter a reference number for the position (from company's website)",
      resume: 'Attach your CV tailored for this position (required)',
    },
    placeholders: {
      applicantId: 'Enter your iRAIN (legacy CAND-... also accepted)',
      applicantKey: 'Enter the Applicant Key from your email',
      iCrn: 'Enter the iRCRN',
      position: 'e.g. Software Engineer',
      referenceNumber: 'Reference number',
    },
    upload: 'Add file',
    uploadHint: 'Upload a CV specific to this company and position. PDF or DOC/DOCX, max 10 MB.',
    noFile: 'No file chosen',
    statusMessages: {
      ok: "Application submitted. We'll log it and follow up with next steps.",
      error: 'Something went wrong. Please try again.',
      networkError: 'Unable to connect. Please check your internet connection and try again.',
    },
    buttons: {
      submit: 'Submit',
      submitting: 'Submitting...',
      reset: 'Clear form',
    },
    errors: {
      applicantId: 'Please enter your iRAIN or legacy CAND ID.',
      applicantKey: 'Please enter your Applicant Key.',
      iCrn: 'Please enter the iRCRN.',
      position: 'Please enter the position you are applying for.',
      resume: 'Please upload your resume (PDF or DOC/DOCX under 10MB).',
      resumeInvalid: 'Please upload a PDF or DOC/DOCX file under 10MB.',
    },
    languageLabel: 'Language',
    english: 'English',
    french: 'Français',
  },
  fr: {
    eyebrow: 'Candidature',
    title: 'iRefair - Postuler maintenant',
    lead: "iRefair est une initiative gratuite créée pour soutenir les nouveaux arrivants libanais et arabes au Canada en les mettant en contact avec des professionnels qui peuvent les recommander pour des emplois.",
    applyText: "Utilisez ce formulaire pour postuler à l'entreprise que vous souhaitez rejoindre. Vous aurez besoin de votre iRAIN iRefair et du numéro de référence de l'entreprise iRefair (iRCRN).",
    moreInfo: 'Pour plus d\'informations, visitez',
    moreInfoLink: '&BeyondCA',
    labels: {
      applicantId: 'Votre iRAIN *',
      applicantKey: 'Clé du candidat *',
      iCrn: "Entrez l'iRCRN de l'entreprise que vous souhaitez rejoindre *",
      position: 'Poste pour lequel vous postulez *',
      referenceNumber: 'Si disponible, veuillez entrer le numéro de référence du poste (depuis le site de l\'entreprise)',
      resume: 'Joignez votre CV adapté à ce poste (requis)',
    },
    placeholders: {
      applicantId: 'Entrez votre iRAIN (ancien CAND-... également accepté)',
      applicantKey: 'Entrez la clé du candidat reçue par e-mail',
      iCrn: "Entrez l'iRCRN",
      position: 'ex. Ingénieur logiciel',
      referenceNumber: 'Numéro de référence',
    },
    upload: 'Ajouter un fichier',
    uploadHint: 'Téléchargez un CV spécifique à cette entreprise et ce poste. PDF ou DOC/DOCX, max 10 Mo.',
    noFile: 'Aucun fichier choisi',
    statusMessages: {
      ok: 'Candidature soumise. Nous l\'enregistrerons et vous contacterons pour les prochaines étapes.',
      error: 'Une erreur s\'est produite. Veuillez réessayer.',
      networkError: 'Connexion impossible. Veuillez vérifier votre connexion internet et réessayer.',
    },
    buttons: {
      submit: 'Soumettre',
      submitting: 'Envoi...',
      reset: 'Effacer le formulaire',
    },
    errors: {
      applicantId: 'Veuillez entrer votre iRAIN ou ancien CAND ID.',
      applicantKey: 'Veuillez entrer votre clé de candidat.',
      iCrn: "Veuillez entrer l'iRCRN.",
      position: 'Veuillez entrer le poste pour lequel vous postulez.',
      resume: 'Veuillez télécharger votre CV (PDF ou DOC/DOCX moins de 10 Mo).',
      resumeInvalid: 'Veuillez télécharger un fichier PDF ou DOC/DOCX de moins de 10 Mo.',
    },
    languageLabel: 'Langue',
    english: 'English',
    french: 'Français',
  },
};

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_RESUME_SIZE = 10 * 1024 * 1024;

const parseList = (value?: string) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const APPLICANT_ID_OPTIONS = parseList(process.env.NEXT_PUBLIC_IRAIN_OPTIONS);
const IRCRN_OPTIONS = parseList(process.env.NEXT_PUBLIC_IRCRN_OPTIONS);

type Status = 'idle' | 'submitting' | 'ok' | 'error';

type ComboInputProps = {
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  options: string[];
  required?: boolean;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  onChange: (value: string) => void;
};

function ComboInput({
  id,
  name,
  value,
  placeholder,
  options,
  required,
  ariaDescribedBy,
  ariaInvalid,
  onChange,
}: ComboInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = `${id}-listbox`;

  const filteredOptions = useMemo(() => {
    if (!options.length) return [];
    const query = value.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, value]);

  const visibleOptions = useMemo(() => filteredOptions.slice(0, 8), [filteredOptions]);
  const activeOptionId =
    isOpen && visibleOptions.length > 0 ? `${id}-option-${highlightedIndex}` : undefined;

  useEffect(() => {
    if (!isOpen) return;
    if (highlightedIndex >= visibleOptions.length) {
      setHighlightedIndex(0);
    }
  }, [highlightedIndex, isOpen, visibleOptions.length]);

  const openDropdown = () => {
    if (!options.length) return;
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const closeDropdown = () => {
    setIsOpen(false);
  };

  const selectOption = (option: string) => {
    onChange(option);
    closeDropdown();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const hasVisibleOptions = visibleOptions.length > 0;

    switch (event.key) {
      case 'ArrowDown':
        if (!hasVisibleOptions) {
          openDropdown();
          return;
        }
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }
        setHighlightedIndex((current) => (current + 1) % visibleOptions.length);
        break;
      case 'ArrowUp':
        if (!hasVisibleOptions) {
          openDropdown();
          return;
        }
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
          return;
        }
        setHighlightedIndex((current) =>
          current - 1 < 0 ? visibleOptions.length - 1 : current - 1,
        );
        break;
      case 'Enter':
        if (isOpen && hasVisibleOptions) {
          event.preventDefault();
          selectOption(visibleOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        closeDropdown();
        break;
      default:
        break;
    }
  };

  return (
    <div className="combo-field">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        className="combo-input"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && visibleOptions.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        onFocus={openDropdown}
        onBlur={closeDropdown}
        onChange={(event) => {
          onChange(event.target.value);
          openDropdown();
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && visibleOptions.length > 0 && (
        <ul id={listId} className="select-dropdown combo-dropdown" role="listbox">
          {visibleOptions.map((option, index) => (
            <li
              key={`${option}-${index}`}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option === value}
              className={`select-option ${index === highlightedIndex ? 'is-highlighted' : ''} ${
                option === value ? 'is-selected' : ''
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                selectOption(option);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ApplyPage() {
  const applicantIdOptions = APPLICANT_ID_OPTIONS;
  const iCrnOptions = IRCRN_OPTIONS;
  const { language, setLanguage } = useLanguage();

  const [applicantId, setApplicantId] = useState('');
  const [applicantKey, setApplicantKey] = useState('');
  const [iCrn, setICrn] = useState('');
  const [position, setPosition] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confetti = useConfetti();
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const t = translations[language];

  const fieldClass = (name: string) => `field ${errors[name] ? 'has-error' : ''}`.trim();

  const clearError = (name: string) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const resetForm = (preserveStatus = false) => {
    formRef.current?.reset();
    setErrors({});
    if (!preserveStatus) {
      setStatus('idle');
      setErrorMessage('');
    }
    setSubmitting(false);
    setApplicantId('');
    setApplicantKey('');
    setICrn('');
    setPosition('');
    setReferenceNumber('');
    setResumeName('');
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  };

  const isAllowedResume = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const typeAllowed = file.type ? ALLOWED_RESUME_TYPES.includes(file.type) : false;
    const extensionAllowed = extension ? ALLOWED_RESUME_EXTENSIONS.includes(extension) : false;
    return typeAllowed || extensionAllowed;
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
        resume: t.errors.resumeInvalid,
      }));
      setResumeName('');
      event.target.value = '';
      return;
    }

    clearError('resume');
    setResumeName(file.name);
  };

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const formElement = formRef.current;
      if (!formElement) return;
      const firstErrorField = formElement.querySelector('.has-error') as HTMLElement | null;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusTarget = firstErrorField.querySelector<HTMLElement>('input, select, textarea, button');
        focusTarget?.focus({ preventScroll: true });
      }
    });
  };

  const scrollToStatusError = () => {
    requestAnimationFrame(() => {
      const banner = errorBannerRef.current;
      if (!banner) return;
      banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      banner.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    if (status === 'error') {
      scrollToStatusError();
    }
  }, [status]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!applicantId.trim()) nextErrors.applicantId = t.errors.applicantId;
    if (!applicantKey.trim()) nextErrors.applicantKey = t.errors.applicantKey;
    if (!iCrn.trim()) nextErrors.iCrn = t.errors.iCrn;
    if (!position.trim()) nextErrors.position = t.errors.position;

    const resumeFile = resumeInputRef.current?.files?.[0];
    if (!resumeFile) {
      nextErrors.resume = t.errors.resume;
    } else if (!isAllowedResume(resumeFile) || resumeFile.size > MAX_RESUME_SIZE) {
      nextErrors.resume = t.errors.resumeInvalid;
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const websiteInput = event.currentTarget.elements.namedItem('website');
    const honeypot = websiteInput instanceof HTMLInputElement ? websiteInput.value.trim() : '';
    setStatus('idle');
    setErrorMessage('');
    const validationErrors = validate();
    const hasErrors = Object.keys(validationErrors).length > 0;

    if (hasErrors) {
      setErrors(validationErrors);
      scrollToFirstError();
      return;
    }

    setErrors({});
    setSubmitting(true);
    setStatus('submitting');

    try {
      const resumeFile = resumeInputRef.current?.files?.[0];
      const formData = new FormData();
      formData.append('applicantId', applicantId.trim());
      formData.append('applicantKey', applicantKey.trim());
      formData.append('iCrn', iCrn.trim());
      formData.append('position', position.trim());
      formData.append('referenceNumber', referenceNumber.trim());
      formData.append('website', honeypot);
      if (resumeFile) {
        formData.append('resume', resumeFile);
      }

      const response = await fetch('/api/apply', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Something went wrong.';
        if (data?.field === 'resume') {
          setErrors((prev) => ({ ...prev, resume: message }));
          setStatus('idle');
          scrollToFirstError();
        } else {
          setErrorMessage(message);
          setStatus('error');
        }
        return;
      }

      setStatus('ok');
      confetti.trigger();
      setShowSuccessAnimation(true);
      resetForm(true);
    } catch (error) {
      console.error('Application submission failed', error);
      setErrorMessage(t.statusMessages.networkError);
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main>
        <section className="card page-card apply-card" aria-labelledby="apply-title">
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
          <div className="apply-top">
            <div>
              <p className="eyebrow">{t.eyebrow}</p>
              <h2 id="apply-title">{t.title}</h2>
              <p className="lead">{t.lead}</p>
              <p className="apply-text">{t.applyText}</p>
              <p className="apply-link-row">
                {t.moreInfo}{' '}
                <Link href="https://andbeyondca.com/impact/" target="_blank" rel="noreferrer">
                  {t.moreInfoLink}
                </Link>
              </p>
            </div>
          </div>

<form ref={formRef} className="referral-form" onSubmit={handleSubmit} onReset={() => resetForm()} noValidate>
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
            <div className="field-grid field-grid--two">
              <div className={fieldClass('applicantId')}>
                <div className="field-label-row">
                  <label htmlFor="applicant-id">{t.labels.applicantId}</label>
                </div>
                <ComboInput
                  id="applicant-id"
                  name="applicant-id"
                  options={applicantIdOptions}
                  required
                  value={applicantId}
                  placeholder={t.placeholders.applicantId}
                  ariaDescribedBy="applicant-id-error"
                  ariaInvalid={Boolean(errors.applicantId)}
                  onChange={(nextValue) => {
                    setApplicantId(nextValue);
                    clearError('applicantId');
                  }}
                />
                <p className="field-error" id="applicant-id-error" role="alert" aria-live="polite">
                  {errors.applicantId}
                </p>
              </div>

              <div className={fieldClass('applicantKey')}>
                <label htmlFor="applicant-key">{t.labels.applicantKey}</label>
                <input
                  id="applicant-key"
                  name="applicant-key"
                  type="text"
                  required
                  placeholder={t.placeholders.applicantKey}
                  value={applicantKey}
                  aria-invalid={Boolean(errors.applicantKey)}
                  aria-describedby="applicant-key-error"
                  onChange={(event) => {
                    setApplicantKey(event.target.value);
                    clearError('applicantKey');
                  }}
                />
                <p className="field-error" id="applicant-key-error" role="alert" aria-live="polite">
                  {errors.applicantKey}
                </p>
              </div>

              <div className={fieldClass('iCrn')}>
                <div className="field-label-row">
                  <label htmlFor="ircrn">{t.labels.iCrn}</label>
                </div>
                <ComboInput
                  id="ircrn"
                  name="ircrn"
                  options={iCrnOptions}
                  required
                  value={iCrn}
                  placeholder={t.placeholders.iCrn}
                  ariaDescribedBy="ircrn-error"
                  ariaInvalid={Boolean(errors.iCrn)}
                  onChange={(nextValue) => {
                    setICrn(nextValue);
                    clearError('iCrn');
                  }}
                />
                <p className="field-error" id="ircrn-error" role="alert" aria-live="polite">
                  {errors.iCrn}
                </p>
              </div>

              <div className={`${fieldClass('position')} field-full`}>
                <label htmlFor="position">{t.labels.position}</label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  placeholder={t.placeholders.position}
                  value={position}
                  aria-invalid={Boolean(errors.position)}
                  aria-describedby="position-error"
                  onChange={(event) => {
                    setPosition(event.target.value);
                    clearError('position');
                  }}
                />
                <p className="field-error" id="position-error" role="alert" aria-live="polite">
                  {errors.position}
                </p>
              </div>

              <div className={`${fieldClass('referenceNumber')} field-full`}>
                <label htmlFor="reference-number">{t.labels.referenceNumber}</label>
                <input
                  id="reference-number"
                  name="reference-number"
                  type="text"
                  placeholder={t.placeholders.referenceNumber}
                  value={referenceNumber}
                  aria-invalid={Boolean(errors.referenceNumber)}
                  aria-describedby="reference-number-error"
                  onChange={(event) => {
                    setReferenceNumber(event.target.value);
                    clearError('referenceNumber');
                  }}
                />
                <p className="field-error" id="reference-number-error" role="alert" aria-live="polite">
                  {errors.referenceNumber}
                </p>
              </div>

              <div className={`${fieldClass('resume')} field-full`}>
                <label htmlFor="resume">{t.labels.resume}</label>
                <div className="file-upload">
                  <input
                    ref={resumeInputRef}
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="file-input"
                    aria-describedby="resume-helper resume-file-name resume-error"
                    onChange={handleResumeChange}
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
            </div>

            <div className="form-footer">
              <div className="footer-status">
                {status === 'ok' && (
                  <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                    <SuccessAnimation
                      show={showSuccessAnimation}
                      variant="default"
                      size="sm"
                      onAnimationComplete={() => setShowSuccessAnimation(false)}
                    />
                    <span>{t.statusMessages.ok}</span>
                  </div>
                )}
                {status === 'error' && (
                  <div
                    ref={errorBannerRef}
                    className="status-banner status-banner--error"
                    role="alert"
                    aria-live="assertive"
                    tabIndex={-1}
                  >
                    <span className="status-icon" aria-hidden="true">!</span>
                    <span>{errorMessage || t.statusMessages.error}</span>
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
