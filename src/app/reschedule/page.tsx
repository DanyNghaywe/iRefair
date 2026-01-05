'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PublicFooter } from '@/components/PublicFooter';
import { ActionBtn } from '@/components/ActionBtn';
import { DatePicker } from '@/components/DatePicker';
import { TimePicker } from '@/components/TimePicker';
import { SuccessAnimation } from '@/components/SuccessAnimation';

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

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Form fields
  const [reason, setReason] = useState('');
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
      setErrorMessage('This reschedule link is missing required information. Please use the link from your email.');
      setPageState('error');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/referrer/reschedule/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setErrorMessage(data.error || 'This reschedule link is invalid or has expired.');
          setPageState('error');
          return;
        }

        setMeetingInfo(data.meetingInfo);
        setPageState('form');
      } catch {
        setErrorMessage('Unable to validate the reschedule link. Please try again.');
        setPageState('error');
      }
    };

    validateToken();
  }, [token]);

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
      const validProposedTimes = proposedTimes.filter((t) => t.date && t.time);

      const response = await fetch(`/api/referrer/reschedule?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          proposedTimes: validProposedTimes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        setPageState('error');
        return;
      }

      setShowSuccessAnimation(true);
      setPageState('success');
    } catch {
      setErrorMessage('Unable to submit reschedule request. Please try again.');
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
              <h1 id="reschedule-title">Loading...</h1>
              <p className="lead">Validating your reschedule link</p>
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
              <h1 id="reschedule-title">Unable to Reschedule</h1>
              <p className="lead">{errorMessage}</p>
              <p className="reschedule-hint">
                If you need assistance, please contact the recruiter directly.
              </p>
            </div>
          )}

          {pageState === 'success' && (
            <div className="reschedule-result">
              <div className="reschedule-icon reschedule-icon--success" aria-hidden="true">
                <SuccessAnimation
                  show={showSuccessAnimation}
                  variant="default"
                  size="lg"
                  onAnimationComplete={() => setShowSuccessAnimation(false)}
                />
              </div>
              <h1 id="reschedule-title">Reschedule Requested</h1>
              <p className="lead">
                Your request has been submitted successfully. The recruiter has been notified and will reach out with new meeting options.
              </p>
              <p className="reschedule-hint">You can close this window.</p>
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
                <h1 id="reschedule-title">Request to Reschedule</h1>
                <p className="lead">
                  Would you like to request a new meeting time? The recruiter will be notified and will reach out with alternative options.
                </p>
              </div>

              <div className="reschedule-current-meeting">
                <h2>Current Meeting</h2>
                <div className="meeting-details">
                  <div className="meeting-detail">
                    <span className="meeting-detail-label">Date & Time</span>
                    <span className="meeting-detail-value">{meetingInfo.formattedDateTime || `${meetingInfo.meetingDate} at ${meetingInfo.meetingTime}`}</span>
                  </div>
                  <div className="meeting-detail">
                    <span className="meeting-detail-label">Position</span>
                    <span className="meeting-detail-value">{meetingInfo.position}</span>
                  </div>
                </div>
              </div>

              <form className="reschedule-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="reason">Reason for rescheduling (optional)</label>
                  <textarea
                    id="reason"
                    name="reason"
                    rows={3}
                    placeholder="Let the recruiter know why you need to reschedule..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                  />
                  <p className="field-hint">{reason.length}/500 characters</p>
                </div>

                <div className="proposed-times-section">
                  <h2>Suggest Alternative Times (optional)</h2>
                  <p className="section-description">
                    Help the recruiter find a better time by suggesting up to 3 time slots that work for you.
                  </p>

                  <div className="proposed-times-grid">
                    {proposedTimes.map((slot, index) => (
                      <div key={index} className="proposed-time-row">
                        <span className="proposed-time-label">Option {index + 1}</span>
                        <div className="proposed-time-inputs">
                          <DatePicker
                            id={`proposed-date-${index}`}
                            value={slot.date}
                            onChange={(value) => updateProposedTime(index, 'date', value)}
                            placeholder="Select date"
                            minDate={minDate}
                          />
                          <TimePicker
                            id={`proposed-time-${index}`}
                            value={slot.time}
                            onChange={(value) => updateProposedTime(index, 'time', value)}
                            placeholder="Select time"
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
                        Submitting...
                        <span className="loading-indicator" aria-hidden="true" />
                      </>
                    ) : (
                      'Request Reschedule'
                    )}
                  </ActionBtn>
                  <p className="reschedule-cancel-hint">
                    Changed your mind?{' '}
                    <button type="button" className="link-button" onClick={() => window.close()}>
                      Close this window
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
  return (
    <AppShell>
      <main>
        <section className="card page-card reschedule-card" aria-labelledby="reschedule-title">
          <div className="reschedule-loading">
            <div className="reschedule-icon reschedule-icon--loading">
              <span className="loading-indicator" aria-hidden="true" />
            </div>
            <h1 id="reschedule-title">Loading...</h1>
            <p className="lead">Validating your reschedule link</p>
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
