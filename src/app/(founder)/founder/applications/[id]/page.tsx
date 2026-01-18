"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
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

const translations = {
  en: {
    page: {
      title: "Application Review",
      invalidSubtitle: "Invalid application ID",
      notFoundTitle: "Application not found",
      notFoundDescription: "This application ID is missing or invalid.",
      notFoundRetry: "Double-check the application ID and try again.",
      reviewTitle: (position: string, id: string) =>
        position ? `${position} (${id})` : "Application Review",
    },
    sections: {
      details: "Details",
      resume: "Resume",
      meeting: "Meeting",
      actionHistory: "Action History",
      decision: "Decision",
      quickLinks: "Quick Links",
    },
    labels: {
      applicationId: "Application ID",
      ircrn: "iRCRN",
      position: "Position",
      applicant: "Applicant",
      referrer: "Referrer",
      referenceNumber: "Reference Number",
      submitted: "Submitted",
      resumeFile: "Resume File",
      dateTime: "Date/Time",
      meetingLink: "Meeting Link",
      status: "Status",
      internalNotes: "Internal Notes",
    },
    placeholders: {
      unassigned: "Unassigned",
      notes: "Add context, follow-ups, next steps...",
    },
    buttons: {
      view: "View",
      backToApplications: "Back to Applications",
      viewApplicant: "View Applicant Profile",
      viewReferrer: "View Referrer",
    },
    empty: {
      noResume: "No resume on file.",
    },
    statusOptions: {
      new: "New",
      "meeting scheduled": "Meeting Scheduled",
      "meeting requested": "Meeting Requested",
      "needs reschedule": "Needs Reschedule",
      interviewed: "Interviewed",
      "cv mismatch": "CV Mismatch",
      "cv update requested": "CV Update Requested",
      "info requested": "Info Requested",
      "not a good fit": "Not a Good Fit",
      "job offered": "Job Offered",
      "in review": "In Review",
      submitted: "Submitted",
      "on hold": "On Hold",
      closed: "Closed",
    },
    actionHistory: {
      by: "by",
      viewMeeting: "View meeting",
      labels: {
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
      },
    },
  },
  fr: {
    page: {
      title: "Revue de candidature",
      invalidSubtitle: "Identifiant de candidature invalide",
      notFoundTitle: "Candidature introuvable",
      notFoundDescription: "Cet identifiant de candidature est manquant ou invalide.",
      notFoundRetry: "Vérifiez l'identifiant de candidature et réessayez.",
      reviewTitle: (position: string, id: string) =>
        position ? `${position} (${id})` : "Revue de candidature",
    },
    sections: {
      details: "Détails",
      resume: "CV",
      meeting: "Entretien",
      actionHistory: "Historique des actions",
      decision: "Décision",
      quickLinks: "Liens rapides",
    },
    labels: {
      applicationId: "Identifiant de candidature",
      ircrn: "iRCRN",
      position: "Poste",
      applicant: "Candidat",
      referrer: "Référent",
      referenceNumber: "Numéro de référence",
      submitted: "Soumis",
      resumeFile: "Fichier CV",
      dateTime: "Date/Heure",
      meetingLink: "Lien de réunion",
      status: "Statut",
      internalNotes: "Notes internes",
    },
    placeholders: {
      unassigned: "Non assigné",
      notes: "Ajoutez le contexte, les relances, les prochaines étapes...",
    },
    buttons: {
      view: "Voir",
      backToApplications: "Retour aux candidatures",
      viewApplicant: "Voir le profil du candidat",
      viewReferrer: "Voir le référent",
    },
    empty: {
      noResume: "Aucun CV enregistré.",
    },
    statusOptions: {
      new: "Nouveau",
      "meeting scheduled": "Entretien planifié",
      "meeting requested": "Entretien demandé",
      "needs reschedule": "Replanification nécessaire",
      interviewed: "Entretien réalisé",
      "cv mismatch": "Inadéquation du CV",
      "cv update requested": "Mise à jour du CV demandée",
      "info requested": "Informations demandées",
      "not a good fit": "Pas un bon profil",
      "job offered": "Offre d'emploi",
      "in review": "En cours d'examen",
      submitted: "Soumis",
      "on hold": "En pause",
      closed: "Fermé",
    },
    actionHistory: {
      by: "par",
      viewMeeting: "Voir l'entretien",
      labels: {
        SCHEDULE_MEETING: "Entretien planifié",
        CANCEL_MEETING: "Entretien annulé",
        REJECT: "Marqué comme pas un bon profil",
        CV_MISMATCH: "Inadéquation du CV signalée",
        REQUEST_CV_UPDATE: "Mise à jour du CV demandée",
        REQUEST_INFO: "Informations demandées",
        MARK_INTERVIEWED: "Entretien réalisé",
        OFFER_JOB: "Offre d'emploi",
        APPLICANT_UPDATED: "Le candidat a mis à jour son profil",
        APPLICANT_RESCHEDULED: "Le candidat a demandé un report",
      },
    },
  },
};

const STATUS_VALUES = [
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

export default function ApplicationDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const applicationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanId = typeof applicationId === "string" ? applicationId.trim() : "";
  const { language } = useLanguage();
  const t = translations[language];
  const historyLocale = language === "fr" ? "fr-CA" : "en-US";
  const actionLabels = t.actionHistory.labels as Record<string, string>;

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
        <Topbar title={t.page.title} subtitle={t.page.invalidSubtitle} />
        <div className="card referrer-review__empty">
          <h2>{t.page.notFoundTitle}</h2>
          <p className="field-hint">{t.page.notFoundDescription}</p>
          <ActionBtn as="link" href="/founder/applications" variant="ghost">
            &larr; {t.buttons.backToApplications}
          </ActionBtn>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="founder-page">
        <Topbar title={t.page.title} subtitle={cleanId} />
        <DetailPageShell
          main={
            <>
              <DetailSection title={t.sections.details}>
                <SkeletonDetailGrid fields={6} />
              </DetailSection>
              <DetailSection title={t.sections.meeting}>
                <SkeletonDetailGrid fields={2} />
              </DetailSection>
            </>
          }
          sidebar={
            <DetailSection title={t.sections.decision}>
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
        <Topbar title={t.page.title} subtitle={cleanId} />
        <div className="card referrer-review__empty">
          <h2>{t.page.notFoundTitle}</h2>
          <p className="field-hint">{t.page.notFoundRetry}</p>
          <ActionBtn as="link" href="/founder/applications" variant="ghost">
            &larr; {t.buttons.backToApplications}
          </ActionBtn>
        </div>
      </div>
    );
  }

  const headerTitle = t.page.reviewTitle(application.position, application.id);
  const history = parseActionHistory(application.actionHistory);

  return (
    <div className="founder-page">
      <Topbar title={headerTitle} subtitle={application.applicantId || application.id} />

      <DetailPageShell
        main={
          <>
            <DetailSection title={t.sections.details}>
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="app-id">{t.labels.applicationId}</label>
                  <input id="app-id" type="text" value={application.id || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="app-ircrn">{t.labels.ircrn}</label>
                  <input id="app-ircrn" type="text" value={application.iCrn || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="app-position">{t.labels.position}</label>
                  <input id="app-position" type="text" value={application.position || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="app-applicant">{t.labels.applicant}</label>
                  {application.applicantId ? (
                    <a href={`/founder/applicants/${encodeURIComponent(application.applicantId)}`}>
                      {application.applicantId}
                    </a>
                  ) : (
                    <input id="app-applicant" type="text" value="-" readOnly tabIndex={-1} />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="app-referrer">{t.labels.referrer}</label>
                  <input
                    id="app-referrer"
                    type="text"
                    value={application.referrerIrref || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field">
                  <label htmlFor="app-reference">{t.labels.referenceNumber}</label>
                  <input
                    id="app-reference"
                    type="text"
                    value={application.referenceNumber || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field">
                  <label htmlFor="app-timestamp">{t.labels.submitted}</label>
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

            <DetailSection title={t.sections.resume}>
              {application.resumeFileName ? (
                <div className="field-grid">
                  <div className="field">
                    <label>{t.labels.resumeFile}</label>
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
                          {t.buttons.view}
                        </ActionBtn>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="founder-card__meta">{t.empty.noResume}</p>
              )}
            </DetailSection>

            {application.meetingDate && (
              <DetailSection title={t.sections.meeting}>
                <div className="field-grid field-grid--two">
                  <div className="field">
                    <label htmlFor="app-meeting-datetime">{t.labels.dateTime}</label>
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
                      <label>{t.labels.meetingLink}</label>
                      <a href={application.meetingUrl} target="_blank" rel="noopener noreferrer">
                        {application.meetingUrl}
                      </a>
                    </div>
                  )}
                </div>
              </DetailSection>
            )}

            {history.length > 0 && (
              <DetailSection title={t.sections.actionHistory}>
                <div className="founder-timeline">
                  {history
                    .slice()
                    .reverse()
                    .map((entry, idx) => (
                      <div key={idx} className="founder-timeline__item">
                        <div className="founder-timeline__dot" />
                        <div className="founder-timeline__content">
                          <div className="founder-timeline__header">
                            <strong>{actionLabels[entry.action] || entry.action}</strong>
                            <span className="founder-timeline__time">
                              {new Date(entry.timestamp).toLocaleDateString(historyLocale, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="founder-timeline__meta">
                            {t.actionHistory.by} {entry.performedBy}
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
                                  {t.actionHistory.viewMeeting}
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
            <DetailSection title={t.sections.decision} className="referrer-review__decision">
              <div className="field">
                <label htmlFor="decision-status">{t.labels.status}</label>
                <select id="decision-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">{t.placeholders.unassigned}</option>
                  {STATUS_VALUES.map((value) => (
                    <option key={value} value={value.toLowerCase()}>
                      {t.statusOptions[value.toLowerCase()] || value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="decision-notes">{t.labels.internalNotes}</label>
                <textarea
                  id="decision-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t.placeholders.notes}
                />
              </div>
              <div>
                <AutosaveHint saving={saving} />
              </div>
              <ActionBtn as="link" href="/founder/applications" variant="ghost">
                &larr; {t.buttons.backToApplications}
              </ActionBtn>
            </DetailSection>

            <DetailSection title={t.sections.quickLinks}>
              <div className="flow-stack">
                {application.applicantId && (
                  <ActionBtn
                    as="link"
                    href={`/founder/applicants/${encodeURIComponent(application.applicantId)}`}
                    variant="ghost"
                    size="sm"
                  >
                    {t.buttons.viewApplicant}
                  </ActionBtn>
                )}
                {application.referrerIrref && (
                  <ActionBtn
                    as="link"
                    href={`/founder/referrers/${encodeURIComponent(application.referrerIrref)}`}
                    variant="ghost"
                    size="sm"
                  >
                    {t.buttons.viewReferrer}
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
