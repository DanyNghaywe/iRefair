"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { AutosaveHint } from "@/components/founder/AutosaveHint";
import { DetailPageShell } from "@/components/founder/DetailPageShell";
import { DetailSection } from "@/components/founder/DetailSection";
import { Skeleton, SkeletonDetailGrid, SkeletonStack } from "@/components/founder/Skeleton";
import { Topbar } from "@/components/founder/Topbar";
import { parseActionHistory } from "@/lib/actionHistory";
import { formatMeetingDateTime } from "@/lib/timezone";

type ApplicationRecord = {
  id: string;
  timestamp: string;
  applicantId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
  resumeFileId: string;
  referrerIrref: string;
  referrerEmail: string;
  status: string;
  ownerNotes: string;
  meetingDate: string;
  meetingTime: string;
  meetingTimezone: string;
  meetingUrl: string;
  actionHistory: string;
};

const statusOptions = [
  "",
  "New",
  "Meeting Scheduled",
  "Meeting Requested",
  "Needs Reschedule",
  "Interviewed",
  "CV Mismatch",
  "CV Update Requested",
  "Info Requested",
  "Not a Good Fit",
  "Job Offered",
  "In Review",
  "Submitted",
  "On Hold",
  "Closed",
];

const ACTION_LABELS: Record<string, string> = {
  SCHEDULE_MEETING: "Scheduled Meeting",
  CANCEL_MEETING: "Cancelled Meeting",
  REJECT: "Marked Not a Good Fit",
  CV_MISMATCH: "Flagged CV Mismatch",
  REQUEST_CV_UPDATE: "Requested CV Update",
  REQUEST_INFO: "Requested Info",
  MARK_INTERVIEWED: "Marked Interviewed",
  OFFER_JOB: "Offered Job",
  APPLICANT_UPDATED: "Applicant Updated Profile",
  APPLICANT_RESCHEDULED: "Applicant Requested Reschedule",
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const applicationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanId = typeof applicationId === "string" ? applicationId.trim() : "";

  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const skipAutosaveRef = useRef(true);

  const fetchApplication = useCallback(async () => {
    if (!cleanId) return;
    setLoading(true);
    setNotFound(false);

    const response = await fetch(`/api/founder/applications/${encodeURIComponent(cleanId)}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      setNotFound(true);
      setApplication(null);
      setLoading(false);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (data?.ok && data.item) {
      setApplication(data.item as ApplicationRecord);
    } else {
      setNotFound(true);
      setApplication(null);
    }
    setLoading(false);
  }, [cleanId]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  useEffect(() => {
    if (!application) return;
    setNotes(application.ownerNotes || "");
    setStatus((application.status || "").toLowerCase());
    skipAutosaveRef.current = true;
  }, [application?.id]);

  const updateLocalApplication = (patch: Partial<ApplicationRecord>) => {
    setApplication((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchApplication = async (patch: Record<string, string>) => {
    if (!application) return;
    setSaving(true);
    await fetch(`/api/founder/applications/${encodeURIComponent(application.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocalApplication(patch as Partial<ApplicationRecord>);
    setSaving(false);
  };

  useEffect(() => {
    if (!application) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    const currentStatus = (application.status || "").toLowerCase();
    addIfChanged("ownerNotes", notes, application.ownerNotes || "");
    addIfChanged("status", status, currentStatus);

    if (!Object.keys(patch).length) return;

    const timer = setTimeout(() => {
      patchApplication(patch);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, status, application?.id]);

  if (!cleanId) {
    return (
      <div className="founder-page">
        <Topbar title="Application Review" subtitle="Invalid application ID" />
        <div className="card referrer-review__empty">
          <h2>Application not found</h2>
          <p className="field-hint">This application ID is missing or invalid.</p>
          <ActionBtn as="link" href="/founder/applications" variant="ghost">
            &larr; Back to Applications
          </ActionBtn>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="founder-page">
        <Topbar title="Application Review" subtitle={cleanId} />
        <DetailPageShell
          main={
            <>
              <DetailSection title="Details">
                <SkeletonDetailGrid fields={6} />
              </DetailSection>
              <DetailSection title="Meeting">
                <SkeletonDetailGrid fields={2} />
              </DetailSection>
            </>
          }
          sidebar={
            <DetailSection title="Decision">
              <SkeletonStack>
                <Skeleton variant="input" />
                <Skeleton variant="input" />
              </SkeletonStack>
            </DetailSection>
          }
        />
      </div>
    );
  }

  if (notFound || !application) {
    return (
      <div className="founder-page">
        <Topbar title="Application Review" subtitle={cleanId} />
        <div className="card referrer-review__empty">
          <h2>Application not found</h2>
          <p className="field-hint">Double-check the application ID and try again.</p>
          <ActionBtn as="link" href="/founder/applications" variant="ghost">
            &larr; Back to Applications
          </ActionBtn>
        </div>
      </div>
    );
  }

  const headerTitle = application.position
    ? `${application.position} (${application.id})`
    : "Application Review";
  const history = parseActionHistory(application.actionHistory);

  return (
    <div className="founder-page">
      <Topbar title={headerTitle} subtitle={application.applicantId || application.id} />

      <DetailPageShell
        main={
          <>
            <DetailSection title="Details">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="app-id">Application ID</label>
                  <input id="app-id" type="text" value={application.id || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="app-ircrn">iRCRN</label>
                  <input id="app-ircrn" type="text" value={application.iCrn || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="app-position">Position</label>
                  <input id="app-position" type="text" value={application.position || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="app-applicant">Applicant</label>
                  {application.applicantId ? (
                    <a href={`/founder/applicants/${encodeURIComponent(application.applicantId)}`}>
                      {application.applicantId}
                    </a>
                  ) : (
                    <input id="app-applicant" type="text" value="-" readOnly tabIndex={-1} />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="app-referrer">Referrer</label>
                  <input
                    id="app-referrer"
                    type="text"
                    value={application.referrerIrref || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field">
                  <label htmlFor="app-reference">Reference Number</label>
                  <input
                    id="app-reference"
                    type="text"
                    value={application.referenceNumber || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field">
                  <label htmlFor="app-timestamp">Submitted</label>
                  <input
                    id="app-timestamp"
                    type="text"
                    value={application.timestamp || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Resume">
              {application.resumeFileName ? (
                <div className="field-grid">
                  <div className="field">
                    <label>Resume File</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)" }}>
                      <span style={{ flex: 1 }}>{application.resumeFileName}</span>
                      {application.resumeFileId && (
                        <ActionBtn
                          as="link"
                          href={`https://drive.google.com/file/d/${application.resumeFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="ghost"
                          size="sm"
                        >
                          View
                        </ActionBtn>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="founder-card__meta">No resume on file.</p>
              )}
            </DetailSection>

            {application.meetingDate && (
              <DetailSection title="Meeting">
                <div className="field-grid field-grid--two">
                  <div className="field">
                    <label htmlFor="app-meeting-datetime">Date/Time</label>
                    <input
                      id="app-meeting-datetime"
                      type="text"
                      value={
                        formatMeetingDateTime(
                          application.meetingDate,
                          application.meetingTime,
                          application.meetingTimezone,
                        ) || `${application.meetingDate} ${application.meetingTime}`
                      }
                      readOnly
                      tabIndex={-1}
                    />
                  </div>
                  {application.meetingUrl && (
                    <div className="field">
                      <label>Meeting Link</label>
                      <a href={application.meetingUrl} target="_blank" rel="noopener noreferrer">
                        {application.meetingUrl}
                      </a>
                    </div>
                  )}
                </div>
              </DetailSection>
            )}

            {history.length > 0 && (
              <DetailSection title="Action History">
                <div className="founder-timeline">
                  {history
                    .slice()
                    .reverse()
                    .map((entry, idx) => (
                      <div key={idx} className="founder-timeline__item">
                        <div className="founder-timeline__dot" />
                        <div className="founder-timeline__content">
                          <div className="founder-timeline__header">
                            <strong>{ACTION_LABELS[entry.action] || entry.action}</strong>
                            <span className="founder-timeline__time">
                              {new Date(entry.timestamp).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="founder-timeline__meta">
                            by {entry.performedBy}
                            {entry.performedByEmail && ` (${entry.performedByEmail})`}
                          </div>
                          {entry.notes && <div className="founder-timeline__notes">{entry.notes}</div>}
                          {entry.meetingDetails && (
                            <div className="founder-timeline__meeting">
                              {formatMeetingDateTime(
                                entry.meetingDetails.date,
                                entry.meetingDetails.time,
                                entry.meetingDetails.timezone,
                              )}
                              {entry.meetingDetails.url && (
                                <a href={entry.meetingDetails.url} target="_blank" rel="noopener noreferrer">
                                  {" "}
                                  View meeting
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </DetailSection>
            )}
          </>
        }
        sidebar={
          <>
            <DetailSection title="Decision" className="referrer-review__decision">
              <div className="field">
                <label htmlFor="decision-status">Status</label>
                <select id="decision-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">Unassigned</option>
                  {statusOptions
                    .filter((value) => value)
                    .map((value) => (
                      <option key={value} value={value.toLowerCase()}>
                        {value}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="decision-notes">Internal Notes</label>
                <textarea
                  id="decision-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context, follow-ups, next steps..."
                />
              </div>
              <div>
                <AutosaveHint saving={saving} />
              </div>
              <ActionBtn as="link" href="/founder/applications" variant="ghost">
                &larr; Back to Applications
              </ActionBtn>
            </DetailSection>

            <DetailSection title="Quick Links">
              <div className="flow-stack">
                {application.applicantId && (
                  <ActionBtn
                    as="link"
                    href={`/founder/applicants/${encodeURIComponent(application.applicantId)}`}
                    variant="ghost"
                    size="sm"
                  >
                    View Applicant Profile
                  </ActionBtn>
                )}
                {application.referrerIrref && (
                  <ActionBtn
                    as="link"
                    href={`/founder/referrers/${encodeURIComponent(application.referrerIrref)}`}
                    variant="ghost"
                    size="sm"
                  >
                    View Referrer
                  </ActionBtn>
                )}
              </div>
            </DetailSection>
          </>
        }
      />
    </div>
  );
}
