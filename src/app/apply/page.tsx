'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { usePersistedLanguage } from '@/lib/usePersistedLanguage';

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

const CANDIDATE_ID_OPTIONS = parseList(process.env.NEXT_PUBLIC_IRAIN_OPTIONS);
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
  usePersistedLanguage();
  const candidateIdOptions = CANDIDATE_ID_OPTIONS;
  const iCrnOptions = IRCRN_OPTIONS;

  const [candidateId, setCandidateId] = useState('');
  const [candidateKey, setCandidateKey] = useState('');
  const [iCrn, setICrn] = useState('');
  const [position, setPosition] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!preserveStatus) setStatus('idle');
    setSubmitting(false);
    setCandidateId('');
    setCandidateKey('');
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
        resume: 'Please upload a PDF or DOC/DOCX file under 10MB.',
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

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!candidateId.trim()) nextErrors.candidateId = 'Please enter your iRAIN or legacy CAND ID.';
    if (!candidateKey.trim()) nextErrors.candidateKey = 'Please enter your Candidate Key.';
    if (!iCrn.trim()) nextErrors.iCrn = 'Please enter the iRCRN.';
    if (!position.trim()) nextErrors.position = 'Please enter the position you are applying for.';

    const resumeFile = resumeInputRef.current?.files?.[0];
    if (!resumeFile) {
      nextErrors.resume = 'Please upload your resume (PDF or DOC/DOCX under 10MB).';
    } else if (!isAllowedResume(resumeFile) || resumeFile.size > MAX_RESUME_SIZE) {
      nextErrors.resume = 'Please upload a PDF or DOC/DOCX file under 10MB.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const websiteInput = event.currentTarget.elements.namedItem('website');
    const honeypot = websiteInput instanceof HTMLInputElement ? websiteInput.value.trim() : '';
    setStatus('idle');
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
      formData.append('candidateId', candidateId.trim());
      formData.append('candidateKey', candidateKey.trim());
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

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Something went wrong.');
      }

      setStatus('ok');
      resetForm(true);
    } catch (error) {
      console.error('Application submission failed', error);
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main>
        <section className="card page-card apply-card" aria-labelledby="apply-title">
          <div className="apply-top">
            <div>
              <p className="eyebrow">Application</p>
              <h2 id="apply-title">iRefair - Apply Now</h2>
              <p className="lead">
                iRefair is a free initiative created to support Lebanese and Arab newcomers in Canada by connecting them
                with professionals who can refer them for jobs.
              </p>
              <p className="apply-text">
                Use this form to apply to the company you wish to join. You will need your iRefair iRAIN and the iRefair
                Company Reference Number (iRCRN).
              </p>
              <p className="apply-link-row">
                For more info, visit{' '}
                <Link href="https://andbeyondca.com/impact/" target="_blank" rel="noreferrer">
                  &BeyondCA
                </Link>
              </p>
            </div>
          </div>

          {status === 'ok' && (
            <div className="status-banner status-banner--ok" role="status" aria-live="polite">
              Application submitted. We&apos;ll log it and follow up with next steps.
            </div>
          )}
          {status === 'error' && (
            <div className="status-banner status-banner--error" role="status" aria-live="polite">
              We couldn&apos;t submit your application right now. Please try again in a moment.
            </div>
          )}

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
              <div className={fieldClass('candidateId')}>
                <div className="field-label-row">
                  <label htmlFor="candidate-id">Your iRAIN *</label>
                </div>
                <ComboInput
                  id="candidate-id"
                  name="candidate-id"
                  options={candidateIdOptions}
                  required
                  value={candidateId}
                  placeholder="Enter your iRAIN (legacy CAND-... also accepted)"
                  ariaDescribedBy="candidate-id-error"
                  ariaInvalid={Boolean(errors.candidateId)}
                  onChange={(nextValue) => {
                    setCandidateId(nextValue);
                    clearError('candidateId');
                  }}
                />
                <p className="field-error" id="candidate-id-error" role="alert" aria-live="polite">
                  {errors.candidateId}
                </p>
              </div>

              <div className={fieldClass('candidateKey')}>
                <label htmlFor="candidate-key">Candidate Key *</label>
                <input
                  id="candidate-key"
                  name="candidate-key"
                  type="text"
                  required
                  placeholder="Enter the Candidate Key from your email"
                  value={candidateKey}
                  aria-invalid={Boolean(errors.candidateKey)}
                  aria-describedby="candidate-key-error"
                  onChange={(event) => {
                    setCandidateKey(event.target.value);
                    clearError('candidateKey');
                  }}
                />
                <p className="field-error" id="candidate-key-error" role="alert" aria-live="polite">
                  {errors.candidateKey}
                </p>
              </div>

              <div className={fieldClass('iCrn')}>
                <div className="field-label-row">
                  <label htmlFor="ircrn">Enter the iRCRN of the company you wish to join *</label>
                </div>
                <ComboInput
                  id="ircrn"
                  name="ircrn"
                  options={iCrnOptions}
                  required
                  value={iCrn}
                  placeholder="Enter the iRCRN"
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
                <label htmlFor="position">Position you are applying for *</label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  placeholder="e.g. Software Engineer"
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
                <label htmlFor="reference-number">
                  If available, please enter a reference number for the position (from company&apos;s website)
                </label>
                <input
                  id="reference-number"
                  name="reference-number"
                  type="text"
                  placeholder="Reference number"
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
                <label htmlFor="resume">Attach your CV (required)</label>
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
                  <button
                    type="button"
                    className="btn ghost file-upload-trigger"
                    onClick={() => resumeInputRef.current?.click()}
                    aria-describedby="resume-helper resume-file-name resume-error"
                  >
                    Add file
                  </button>
                  <span id="resume-file-name" className="file-upload-name" aria-live="polite">
                    {resumeName || 'No file chosen'}
                  </span>
                </div>
                <p id="resume-helper" className="field-hint">
                  Upload 1 supported file: PDF or document. Max 10 MB. Files are scanned for security and may be
                  reviewed/removed if not a CV.
                </p>
                <p className="field-error" id="resume-error" role="alert" aria-live="polite">
                  {errors.resume}
                </p>
              </div>
            </div>

            <div className="form-footer">
              <div className="footer-status" aria-live="polite">
                {status === 'submitting' ? 'Submitting your application...' : '* Required fields'}
              </div>
              <div className="actions">
                <button type="reset" className="btn ghost">
                  Clear form
                </button>
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}
