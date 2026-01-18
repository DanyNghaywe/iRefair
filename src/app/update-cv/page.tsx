'use client';

import { Suspense, useEffect, useRef, useState, ChangeEvent, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActionBtn } from '@/components/ActionBtn';
import { AppShell } from '@/components/AppShell';
import { Confetti, useConfetti } from '@/components/Confetti';
import { PublicFooter } from '@/components/PublicFooter';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { useLanguage } from '@/components/LanguageProvider';

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB

const translations = {
  en: {
    title: 'Update Your CV',
    applicationFor: 'Application for',
    at: 'at',
    currentCv: 'Current CV',
    uploadLabel: 'Upload new CV',
    uploadHint: 'PDF or DOC/DOCX, max 10 MB',
    uploadButton: 'Choose file',
    noFile: 'No file chosen',
    submitButton: 'Update CV',
    submitting: 'Uploading...',
    successTitle: 'CV Updated',
    successMessage: 'Your CV has been successfully updated.',
    errorTitle: 'Error',
    missingLink: 'This update link is missing required information. Please use the link from your email.',
    loadError: 'Unable to load application details.',
    invalidFile: 'Please upload a PDF or DOC/DOCX file under 10MB.',
    loading: 'Loading...',
    loadingHint: 'Validating your update link',
    unableToLoad: 'Unable to Load',
    errorHint: 'If you need assistance, please contact your referrer or iRefair support.',
    successHint: 'You can close this window.',
    formLead: 'A referrer has requested an updated CV for your application.',
    applicationDetails: 'Application Details',
    position: 'Position',
    company: 'Company',
    uploadLabelRequired: 'Upload your updated CV *',
    uploadHintFull: 'PDF, DOC, or DOCX (max 10MB)',
    pleaseUploadCv: 'Please upload your updated CV.',
    somethingWentWrong: 'Something went wrong.',
    networkError: 'A network error occurred. Please try again.',
    successTitleFull: 'CV Updated Successfully',
    successMessageFull: 'Your CV has been updated and the referrer has been notified. They will review your updated CV and follow up with next steps.',
  },
  fr: {
    title: 'Mettre à jour votre CV',
    applicationFor: 'Candidature pour',
    at: 'chez',
    currentCv: 'CV actuel',
    uploadLabel: 'Téléverser un nouveau CV',
    uploadHint: 'PDF ou DOC/DOCX, max 10 Mo',
    uploadButton: 'Choisir un fichier',
    noFile: 'Aucun fichier choisi',
    submitButton: 'Mettre à jour le CV',
    submitting: 'Téléversement...',
    successTitle: 'CV mis à jour',
    successMessage: 'Votre CV a été mis à jour avec succès.',
    errorTitle: 'Erreur',
    missingLink: 'Ce lien de mise à jour manque d\'informations requises. Veuillez utiliser le lien de votre courriel.',
    loadError: 'Impossible de charger les détails de la candidature.',
    invalidFile: 'Veuillez téléverser un fichier PDF ou DOC/DOCX de moins de 10 Mo.',
    loading: 'Chargement...',
    loadingHint: 'Validation de votre lien de mise à jour',
    unableToLoad: 'Impossible de charger',
    errorHint: 'Si vous avez besoin d\'aide, veuillez contacter votre référent ou le support iRefair.',
    successHint: 'Vous pouvez fermer cette fenêtre.',
    formLead: 'Un référent a demandé un CV mis à jour pour votre candidature.',
    applicationDetails: 'Détails de la candidature',
    position: 'Poste',
    company: 'Entreprise',
    uploadLabelRequired: 'Téléversez votre CV mis à jour *',
    uploadHintFull: 'PDF, DOC ou DOCX (max 10 Mo)',
    pleaseUploadCv: 'Veuillez téléverser votre CV mis à jour.',
    somethingWentWrong: 'Une erreur s\'est produite.',
    networkError: 'Une erreur réseau s\'est produite. Veuillez réessayer.',
    successTitleFull: 'CV mis à jour avec succès',
    successMessageFull: 'Votre CV a été mis à jour et le référent a été notifié. Il examinera votre CV mis à jour et vous contactera pour les prochaines étapes.',
  },
};

type ApplicationContext = {
  position: string;
  companyName: string;
  currentCvName: string;
};

type PageState = 'loading' | 'form' | 'success' | 'error';

function UpdateCvPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const appId = searchParams.get('appId') || '';
  const { language } = useLanguage();
  const t = translations[language];

  const [pageState, setPageState] = useState<PageState>('loading');
  const [contextError, setContextError] = useState('');
  const [applicationContext, setApplicationContext] = useState<ApplicationContext | null>(null);
  const [resumeName, setResumeName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const confetti = useConfetti();

  useEffect(() => {
    if (!token || !appId) {
      setContextError(t.missingLink);
      setPageState('error');
      return;
    }

    const fetchContext = async () => {
      try {
        const response = await fetch(`/api/update-cv/context?token=${encodeURIComponent(token)}&appId=${encodeURIComponent(appId)}`);
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          setContextError(data?.error || t.loadError);
          setPageState('error');
          return;
        }

        setApplicationContext(data.data);
        setPageState('form');
      } catch {
        setContextError(t.loadError);
        setPageState('error');
      }
    };

    fetchContext();
  }, [token, appId, t.missingLink, t.loadError]);

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
      setErrors((prev) => {
        const next = { ...prev };
        delete next.resume;
        return next;
      });
      return;
    }

    if (!isAllowedResume(file) || file.size > MAX_RESUME_SIZE) {
      setErrors((prev) => ({
        ...prev,
        resume: t.invalidFile,
      }));
      setResumeName('');
      event.target.value = '';
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.resume;
      return next;
    });
    setResumeName(file.name);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const resumeFile = resumeInputRef.current?.files?.[0];
    if (!resumeFile) {
      setErrors({ resume: t.pleaseUploadCv });
      return;
    }

    if (!isAllowedResume(resumeFile) || resumeFile.size > MAX_RESUME_SIZE) {
      setErrors({ resume: t.invalidFile });
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('appId', appId);
      formData.append('resume', resumeFile);

      const response = await fetch('/api/update-cv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        const message = typeof data?.error === 'string' ? data.error : t.somethingWentWrong;
        if (data?.field === 'resume') {
          setErrors({ resume: message });
        } else {
          setErrorMessage(message);
          setPageState('error');
        }
        return;
      }

      setShowSuccessAnimation(true);
      setPageState('success');
      confetti.trigger();
    } catch {
      setErrorMessage(t.networkError);
      setPageState('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main>
        <section className="card page-card update-cv-card" aria-labelledby="update-cv-title">
          {pageState === 'loading' && (
            <div className="update-cv-loading">
              <div className="update-cv-icon update-cv-icon--loading">
                <span className="loading-indicator" aria-hidden="true" />
              </div>
              <h1 id="update-cv-title">{t.loading}</h1>
              <p className="lead">{t.loadingHint}</p>
            </div>
          )}

          {pageState === 'error' && (
            <div className="update-cv-result">
              <div className="update-cv-icon update-cv-icon--error" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 id="update-cv-title">{t.unableToLoad}</h1>
              <p className="lead">{contextError || errorMessage}</p>
              <p className="update-cv-hint">{t.errorHint}</p>
            </div>
          )}

          {pageState === 'success' && (
            <div className="update-cv-result">
              <SuccessAnimation
                show={showSuccessAnimation}
                variant="default"
                size="lg"
              />
              <h1 id="update-cv-title">{t.successTitleFull}</h1>
              <p className="lead">{t.successMessageFull}</p>
              <p className="update-cv-hint">{t.successHint}</p>
            </div>
          )}

          {pageState === 'form' && applicationContext && (
            <>
              <div className="update-cv-header">
                <div className="update-cv-icon update-cv-icon--document" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h1 id="update-cv-title">{t.title}</h1>
                <p className="lead">{t.formLead}</p>
              </div>

              <div className="update-cv-context">
                <h2>{t.applicationDetails}</h2>
                <div className="context-details">
                  <div className="context-detail">
                    <span className="context-label">{t.position}</span>
                    <span className="context-value">{applicationContext.position || 'N/A'}</span>
                  </div>
                  <div className="context-detail">
                    <span className="context-label">{t.company}</span>
                    <span className="context-value">{applicationContext.companyName || 'N/A'}</span>
                  </div>
                  {applicationContext.currentCvName && (
                    <div className="context-detail">
                      <span className="context-label">{t.currentCv}</span>
                      <span className="context-value">{applicationContext.currentCvName}</span>
                    </div>
                  )}
                </div>
              </div>

              <form ref={formRef} onSubmit={handleSubmit} noValidate className="update-cv-form">
                <div className={`field ${errors.resume ? 'has-error' : ''}`}>
                  <label htmlFor="resume">{t.uploadLabelRequired}</label>
                  <div className="file-upload">
                    <input
                      id="resume"
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      ref={resumeInputRef}
                      onChange={handleResumeChange}
                      className="file-input"
                      aria-describedby="resume-hint resume-file-name resume-error"
                    />
                    <ActionBtn
                      variant="ghost"
                      className="file-upload-trigger"
                      onClick={() => resumeInputRef.current?.click()}
                      aria-describedby="resume-hint resume-file-name resume-error"
                    >
                      {t.uploadButton}
                    </ActionBtn>
                    <span id="resume-file-name" className="file-upload-name" aria-live="polite">
                      {resumeName || t.noFile}
                    </span>
                  </div>
                  <p className="field-hint" id="resume-hint">
                    {t.uploadHintFull}
                  </p>
                  {errors.resume && (
                    <p className="field-error" id="resume-error" role="alert" aria-live="polite">
                      {errors.resume}
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div
                    className="status-banner status-banner--error"
                    role="alert"
                    aria-live="assertive"
                  >
                    <span className="status-icon" aria-hidden="true">!</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="form-actions">
                  <ActionBtn
                    variant="primary"
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <>
                        {t.submitting}
                        <span className="loading-indicator" aria-hidden="true" />
                      </>
                    ) : (
                      t.submitButton
                    )}
                  </ActionBtn>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
      <PublicFooter />
      <Confetti active={confetti.active} onComplete={confetti.reset} />
    </AppShell>
  );
}

function LoadingFallback() {
  return (
    <AppShell>
      <main>
        <section className="card page-card update-cv-card">
          <div className="update-cv-loading">
            <div className="update-cv-icon update-cv-icon--loading">
              <span className="loading-indicator" aria-hidden="true" />
            </div>
            <h1>Loading...</h1>
            <p className="lead">Please wait</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}

export default function UpdateCvPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UpdateCvPageContent />
    </Suspense>
  );
}
