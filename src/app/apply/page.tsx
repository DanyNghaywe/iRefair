'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Select } from '@/components/Select';
import { useNavigationLoader } from '@/components/NavigationLoader';

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

export default function ApplyPage() {
  const { startNavigation } = useNavigationLoader();
  const hasCandidateIdOptions = CANDIDATE_ID_OPTIONS.length > 0;
  const hasICrnOptions = IRCRN_OPTIONS.length > 0;

  const [useManualCandidateId, setUseManualCandidateId] = useState(!hasCandidateIdOptions);
  const [useManualICrn, setUseManualICrn] = useState(!hasICrnOptions);
  const [candidateId, setCandidateId] = useState('');
  const [iCrn, setICrn] = useState('');
  const [position, setPosition] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const candidateIdSelectOptions = hasCandidateIdOptions
    ? CANDIDATE_ID_OPTIONS.map((value) => ({ value, label: value }))
    : [];
  const iCrnSelectOptions = hasICrnOptions ? IRCRN_OPTIONS.map((value) => ({ value, label: value })) : [];

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
    setICrn('');
    setPosition('');
    setReferenceNumber('');
    setResumeName('');
    setUseManualCandidateId(!hasCandidateIdOptions);
    setUseManualICrn(!hasICrnOptions);
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
    if (!iCrn.trim()) nextErrors.iCrn = 'Please enter the iRCRN.';
    if (!position.trim()) nextErrors.position = 'Please enter the position you are applying for.';

    const resumeFile = resumeInputRef.current?.files?.[0];
    if (resumeFile && (!isAllowedResume(resumeFile) || resumeFile.size > MAX_RESUME_SIZE)) {
      nextErrors.resume = 'Please upload a PDF or DOC/DOCX file under 10MB.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidateId.trim(),
          iCrn: iCrn.trim(),
          position: position.trim(),
          referenceNumber: referenceNumber.trim(),
          resumeFileName: resumeName,
        }),
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
            <div className="field-grid field-grid--two">
              <div className={fieldClass('candidateId')}>
                <div className="field-label-row">
                  <label htmlFor="candidate-id">Your iRAIN *</label>
                  {hasCandidateIdOptions && (
                    <button
                      type="button"
                      className="inline-toggle"
                      onClick={() => {
                        setUseManualCandidateId((prev) => !prev);
                        setCandidateId('');
                        clearError('candidateId');
                      }}
                    >
                      {useManualCandidateId ? 'Choose from list' : 'Type it instead'}
                    </button>
                  )}
                </div>
                {hasCandidateIdOptions && !useManualCandidateId ? (
                  <Select
                    id="candidate-id"
                    name="candidate-id"
                    options={[...candidateIdSelectOptions, { value: '__manual__', label: 'Type it instead' }]}
                    placeholder="Choose"
                    required
                    value={candidateId}
                    ariaDescribedBy="candidate-id-error"
                    ariaInvalid={Boolean(errors.candidateId)}
                    onChange={(value) => {
                      if (value === '__manual__') {
                        setUseManualCandidateId(true);
                        setCandidateId('');
                        return;
                      }
                      const next = Array.isArray(value) ? value[0] ?? '' : value ?? '';
                      setCandidateId(next);
                      clearError('candidateId');
                    }}
                  />
                ) : (
                  <input
                    id="candidate-id"
                    name="candidate-id"
                    type="text"
                    required
                    placeholder="Enter your iRAIN (legacy CAND-... also accepted)"
                    value={candidateId}
                    aria-invalid={Boolean(errors.candidateId)}
                    aria-describedby="candidate-id-error"
                    onChange={(event) => {
                      setCandidateId(event.target.value);
                      clearError('candidateId');
                    }}
                  />
                )}
                <p className="field-error" id="candidate-id-error" role="alert" aria-live="polite">
                  {errors.candidateId}
                </p>
              </div>

              <div className={fieldClass('iCrn')}>
                <div className="field-label-row">
                  <label htmlFor="ircrn">Enter the iRCRN of the company you wish to join *</label>
                  {hasICrnOptions && (
                    <button
                      type="button"
                      className="inline-toggle"
                      onClick={() => {
                        setUseManualICrn((prev) => !prev);
                        setICrn('');
                        clearError('iCrn');
                      }}
                    >
                      {useManualICrn ? 'Choose from list' : 'Type it instead'}
                    </button>
                  )}
                </div>
                {hasICrnOptions && !useManualICrn ? (
                  <Select
                    id="ircrn"
                    name="ircrn"
                    options={[...iCrnSelectOptions, { value: '__manual__', label: 'Type it instead' }]}
                    placeholder="Choose"
                    required
                    value={iCrn}
                    ariaDescribedBy="ircrn-error"
                    ariaInvalid={Boolean(errors.iCrn)}
                    onChange={(value) => {
                      if (value === '__manual__') {
                        setUseManualICrn(true);
                        setICrn('');
                        return;
                      }
                      const next = Array.isArray(value) ? value[0] ?? '' : value ?? '';
                      setICrn(next);
                      clearError('iCrn');
                    }}
                  />
                ) : (
                  <input
                    id="ircrn"
                    name="ircrn"
                    type="text"
                    required
                    placeholder="Enter the iRCRN"
                    value={iCrn}
                    aria-invalid={Boolean(errors.iCrn)}
                    aria-describedby="ircrn-error"
                    onChange={(event) => {
                      setICrn(event.target.value);
                      clearError('iCrn');
                    }}
                  />
                )}
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
                <label htmlFor="resume">
                  To increase your chances of success, please attach a customized CV here if you wish to submit one{' '}
                  <span className="optional">(optional)</span>
                </label>
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
                  Upload 1 supported file: PDF or document. Max 10 MB.
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
    </AppShell>
  );
}
