'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { ActionBtn } from '@/components/ActionBtn';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import { Select } from '@/components/Select';
import { SuccessAnimation } from '@/components/SuccessAnimation';
import { getAllTimezoneOptions } from '@/lib/timezone';
import { useLanguage } from '@/components/LanguageProvider';
import { formMessages } from '@/lib/translations';

const TIMEZONE_OPTIONS = getAllTimezoneOptions();

const translations = {
  en: {
    title: 'Reschedule Meeting',
    currentMeeting: 'Current Meeting',
    position: 'Position',
    scheduledFor: 'Scheduled for',
    reasonLabel: 'Reason for rescheduling',
    reasonPlaceholder: 'Please explain why you need to reschedule...',
    timezoneLabel: 'Your timezone',
    proposedTimesLabel: 'Proposed alternative times',
    proposedTimesHint: 'Please suggest at least one alternative time',
    dateLabel: 'Date',
    timeLabel: 'Time',
    submitButton: 'Submit Reschedule Request',
    submitting: 'Submitting...',
    successTitle: 'Request Submitted',
    successMessage: 'Your reschedule request has been sent. The referrer will contact you with a new time.',
    errorTitle: 'Error',
    loading: 'Loading...',
    loadingHint: 'Validating your reschedule link',
    successHint: 'You can close this window.',
    formTitle: 'Request to Reschedule',
    formLead: 'Would you like to request a new meeting time? The recruiter will be notified and will reach out with alternative options.',
    dateTimeLabel: 'Date & Time',
    optional: '(optional)',
    characters: 'characters',
    suggestAlternativeTimes: 'Suggest Alternative Times',
    suggestAlternativeTimesHint: 'Help the recruiter find a better time by suggesting up to 3 time slots that work for you.',
    timezone: 'Timezone',
    selectTimezone: 'Select timezone',
    option: 'Option',
    selectDate: 'Select date',
    selectTime: 'Select time',
    requestReschedule: 'Request Reschedule',
    changedMind: 'Changed your mind?',
    closeWindow: 'Close this window',
  },
  fr: {
    title: "Reprogrammer la réunion",
    currentMeeting: "Réunion actuelle",
    position: "Poste",
    scheduledFor: "Prévue pour",
    reasonLabel: "Raison de la reprogrammation",
    reasonPlaceholder: "Veuillez expliquer pourquoi vous devez reprogrammer...",
    timezoneLabel: "Votre fuseau horaire",
    proposedTimesLabel: "Horaires alternatifs proposés",
    proposedTimesHint: "Veuillez suggérer au moins un horaire alternatif",
    dateLabel: "Date",
    timeLabel: "Heure",
    submitButton: "Soumettre la demande",
    submitting: "Envoi en cours...",
    successTitle: "Demande soumise",
    successMessage: "Votre demande de reprogrammation a été envoyée. Le référent vous contactera avec un nouvel horaire.",
    errorTitle: "Erreur",
    loading: "Chargement...",
    loadingHint: "Validation de votre lien de reprogrammation",
    successHint: "Vous pouvez fermer cette fenêtre.",
    formTitle: "Demande de reprogrammation",
    formLead: "Souhaitez-vous demander un nouvel horaire de réunion ? Le recruteur sera notifié et vous proposera des alternatives.",
    dateTimeLabel: "Date et heure",
    optional: "(facultatif)",
    characters: "caractères",
    suggestAlternativeTimes: "Suggérer des horaires alternatifs",
    suggestAlternativeTimesHint: "Aidez le recruteur à trouver un meilleur moment en suggérant jusqu'à 3 créneaux horaires qui vous conviennent.",
    timezone: "Fuseau horaire",
    selectTimezone: "Sélectionner le fuseau horaire",
    option: "Option",
    selectDate: "Sélectionner la date",
    selectTime: "Sélectionner l'heure",
    requestReschedule: "Demander la reprogrammation",
    changedMind: "Vous avez changé d'avis ?",
    closeWindow: "Fermer cette fenêtre",
  },
};

type MeetingInfo = {
  meetingDate: string;
  meetingTime: string;
  meetingTimezone: string;
  position: string;
  formattedDateTime: string;
};

type PageState = 'loading' | 'form' | 'success' | 'error';

type ProposedTime = {
  date: string;
  time: string;
};

function ReschedulePageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { language } = useLanguage();
  const t = translations[language];
  const formCopy = formMessages.reschedule[language];

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Form fields
  const [reason, setReason] = useState('');
  const [timezone, setTimezone] = useState('');
  const [proposedTimes, setProposedTimes] = useState<ProposedTime[]>([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ]);

  // Get tomorrow's date as minimum for date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorMessage(formCopy.errors.missingLink);
      setPageState('error');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/referrer/reschedule/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setErrorMessage(data.error || formCopy.errors.invalidLink);
          setPageState('error');
          return;
        }

        setMeetingInfo(data.meetingInfo);
        setTimezone(data.meetingInfo.meetingTimezone || '');
        setPageState('form');
      } catch {
        setErrorMessage(formCopy.errors.validationError);
        setPageState('error');
      }
    };

    validateToken();
  }, [token, formCopy.errors.missingLink, formCopy.errors.invalidLink, formCopy.errors.validationError]);

  const updateProposedTime = (index: number, field: 'date' | 'time', value: string) => {
    setProposedTimes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);

    try {
      // Filter out empty proposed times
      const validProposedTimes = proposedTimes.filter((pt) => pt.date && pt.time);

      const response = await fetch(`/api/referrer/reschedule?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          proposedTimes: validProposedTimes,
          proposedTimezone: timezone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || formCopy.errors.submitError);
        setPageState('error');
        return;
      }

      setShowSuccessAnimation(true);
      setPageState('success');
    } catch {
      setErrorMessage(formCopy.errors.submitNetworkError);
      setPageState('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <main>
        <section className="card page-card reschedule-card" aria-labelledby="reschedule-title">
          {pageState === 'loading' && (
            <div className="reschedule-loading">
              <div className="reschedule-icon reschedule-icon--loading">
                <span className="loading-indicator" aria-hidden="true" />
              </div>
              <h1 id="reschedule-title">{t.loading}</h1>
              <p className="lead">{t.loadingHint}</p>
            </div>
          )}

          {pageState === 'error' && (
            <div className="reschedule-result">
              <div className="reschedule-icon reschedule-icon--error" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 id="reschedule-title">{formCopy.errors.unableToReschedule}</h1>
              <p className="lead">{errorMessage}</p>
              <p className="reschedule-hint">{formCopy.errors.errorHint}</p>
            </div>
          )}

          {pageState === 'success' && (
            <div className="reschedule-result">
              <div className="reschedule-icon reschedule-icon--success" aria-hidden="true">
                <SuccessAnimation
                  show={showSuccessAnimation}
                  variant="default"
                  size="lg"
                />
              </div>
              <h1 id="reschedule-title">{t.successTitle}</h1>
              <p className="lead">{t.successMessage}</p>
              <p className="reschedule-hint">{t.successHint}</p>
            </div>
          )}

          {pageState === 'form' && meetingInfo && (
            <>
              <div className="reschedule-header">
                <div className="reschedule-icon reschedule-icon--calendar" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h1 id="reschedule-title">{t.formTitle}</h1>
                <p className="lead">{t.formLead}</p>
              </div>

              <div className="reschedule-current-meeting">
                <h2>{t.currentMeeting}</h2>
                <div className="meeting-details">
                  <div className="meeting-detail">
                    <span className="meeting-detail-label">{t.dateTimeLabel}</span>
                    <span className="meeting-detail-value">{meetingInfo.formattedDateTime || `${meetingInfo.meetingDate} ${meetingInfo.meetingTime}`}</span>
                  </div>
                  <div className="meeting-detail">
                    <span className="meeting-detail-label">{t.position}</span>
                    <span className="meeting-detail-value">{meetingInfo.position}</span>
                  </div>
                </div>
              </div>

              <form className="reschedule-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="reason">{t.reasonLabel} {t.optional}</label>
                  <textarea
                    id="reason"
                    name="reason"
                    rows={3}
                    placeholder={t.reasonPlaceholder}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                  />
                  <p className="field-hint">{reason.length}/500 {t.characters}</p>
                </div>

                <div className="proposed-times-section">
                  <h2>{t.suggestAlternativeTimes} {t.optional}</h2>
                  <p className="section-description">{t.suggestAlternativeTimesHint}</p>

                  <div className="proposed-times-timezone">
                    <label htmlFor="proposed-timezone">{t.timezone}</label>
                    <Select
                      id="proposed-timezone"
                      name="proposed-timezone"
                      options={TIMEZONE_OPTIONS}
                      value={timezone}
                      onChange={(val) => setTimezone(val as string)}
                      placeholder={t.selectTimezone}
                    />
                  </div>

                  <div className="proposed-times-grid">
                    {proposedTimes.map((slot, index) => (
                      <div key={index} className="proposed-time-row">
                        <span className="proposed-time-label">{t.option} {index + 1}</span>
                        <div className="proposed-time-inputs">
                          <DatePicker
                            id={`proposed-date-${index}`}
                            value={slot.date}
                            onChange={(value) => updateProposedTime(index, 'date', value)}
                            placeholder={t.selectDate}
                            minDate={minDate}
                          />
                          <TimePicker
                            id={`proposed-time-${index}`}
                            value={slot.time}
                            onChange={(value) => updateProposedTime(index, 'time', value)}
                            placeholder={t.selectTime}
                            interval={30}
                            minTime="08:00"
                            maxTime="20:00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="reschedule-actions">
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
                      t.requestReschedule
                    )}
                  </ActionBtn>
                  <p className="reschedule-cancel-hint">
                    {t.changedMind}{' '}
                    <button type="button" className="link-button" onClick={() => window.close()}>
                      {t.closeWindow}
                    </button>
                  </p>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}

function ReschedulePageLoading() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <AppShell>
      <main>
        <section className="card page-card reschedule-card" aria-labelledby="reschedule-title">
          <div className="reschedule-loading">
            <div className="reschedule-icon reschedule-icon--loading">
              <span className="loading-indicator" aria-hidden="true" />
            </div>
            <h1 id="reschedule-title">{t.loading}</h1>
            <p className="lead">{t.loadingHint}</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </AppShell>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={<ReschedulePageLoading />}>
      <ReschedulePageContent />
    </Suspense>
  );
}
