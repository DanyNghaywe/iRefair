"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
      archiveReason: "Archive reason",
    },
    placeholders: {
      unassigned: "Unassigned",
      notes: "Add context, follow-ups, next steps...",
      archiveReason: "Explain why this application should be archived.",
    },
    buttons: {
      view: "View",
      backToApplications: "Back to Applications",
      viewApplicant: "View Applicant Profile",
      viewReferrer: "View Referrer",
      cancel: "Cancel",
      archiveApplication: "Archive application",
      confirmArchive: "Confirm archive",
      archiving: "Archiving...",
      editDetails: "Edit details",
      save: "Save",
      saving: "Saving...",
    },
    messages: {
      unableToArchive: "Unable to archive application.",
      archiveReasonRequired: "Please provide a reason to archive this application.",
    },
    empty: {
      noResume: "No resume on file.",
    },
    statusOptions: {
      new: "New",
      "meeting scheduled": "Meeting Scheduled",
      "meeting requested": "Meeting Requested",
      "needs reschedule": "Needs Reschedule",
      "met with referrer": "Met with Referrer",
      interviewed: "Met with Referrer (legacy)",
      "cv mismatch": "CV Mismatch",
      "cv update requested": "CV Update Requested",
      "cv updated": "CV Updated",
      "info requested": "Info Requested",
      "info updated": "Info Updated",
      "not a good fit": "Not a Good Fit",
      "applicant no longer interested": "Applicant No Longer Interested",
      "submitted cv to hr": "Submitted CV to HR",
      "interviews being conducted": "Interviews Being Conducted",
      "hr decided not to proceed": "HR Decided Not to Proceed",
      "applicant decided not to move forward": "Applicant Decided Not to Move Forward",
      "another applicant was a better fit": "Another Applicant Was a Better Fit",
      "job offered": "Job Offered",
      "candidate did not accept offer": "Candidate Did Not Accept Offer",
      "landed job": "Landed Job",
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
        MARK_INTERVIEWED: "Marked Met with Referrer",
        SUBMIT_CV_TO_HR: "Submitted CV to HR",
        HR_INTERVIEWS: "HR Interviews in Progress",
        HR_DECIDED_NOT_TO_PROCEED: "HR Decided Not to Proceed",
        HR_PROVIDED_OFFER: "HR Provided Offer",
        APPLICANT_NO_LONGER_INTERESTED: "Applicant No Longer Interested",
        APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Applicant Decided Not to Move Forward",
        ANOTHER_APPLICANT_BETTER_FIT: "Another Applicant Was a Better Fit",
        CANDIDATE_ACCEPTED_OFFER: "Candidate Accepted Offer",
        CANDIDATE_DID_NOT_ACCEPT_OFFER: "Candidate Did Not Accept Offer",
        APPLICANT_UPDATED: "Applicant Updated Profile",
        APPLICANT_RESCHEDULED: "Applicant Requested Reschedule",
        LINKED_BY_FOUNDER: "Linked by Founder",
        ARCHIVED_BY_FOUNDER: "Archived by Founder",
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
      archiveReason: "Raison d'archivage",
    },
    placeholders: {
      unassigned: "Non assigné",
      notes: "Ajoutez le contexte, les relances, les prochaines étapes...",
      archiveReason: "Expliquez pourquoi archiver cette candidature.",
    },
    buttons: {
      view: "Voir",
      backToApplications: "Retour aux candidatures",
      viewApplicant: "Voir le profil du candidat",
      viewReferrer: "Voir le référent",
      cancel: "Annuler",
      archiveApplication: "Archiver la candidature",
      confirmArchive: "Confirmer l'archivage",
      archiving: "Archivage...",
      editDetails: "Modifier les détails",
      save: "Enregistrer",
      saving: "Enregistrement...",
    },
    messages: {
      unableToArchive: "Impossible d'archiver la candidature.",
      archiveReasonRequired: "Veuillez préciser une raison pour archiver cette candidature.",
    },
    empty: {
      noResume: "Aucun CV enregistré.",
    },
    statusOptions: {
      new: "Nouveau",
      "meeting scheduled": "Entretien planifié",
      "meeting requested": "Entretien demandé",
      "needs reschedule": "Replanification nécessaire",
      "met with referrer": "Rencontré avec le référent",
      interviewed: "Rencontré avec le référent (legacy)",
      "cv mismatch": "Inadéquation du CV",
      "cv update requested": "Mise à jour du CV demandée",
      "cv updated": "CV mis à jour",
      "info requested": "Informations demandées",
      "info updated": "Informations mises à jour",
      "not a good fit": "Pas un bon profil",
      "applicant no longer interested": "Le candidat n'est plus intéressé",
      "submitted cv to hr": "CV transmis aux RH",
      "interviews being conducted": "Entretiens en cours",
      "hr decided not to proceed": "Les RH ont décidé de ne pas poursuivre",
      "applicant decided not to move forward": "Le candidat a décidé de ne pas poursuivre",
      "another applicant was a better fit": "Un autre candidat correspondait mieux",
      "job offered": "Offre d'emploi",
      "candidate did not accept offer": "Le candidat n'a pas accepté l'offre",
      "landed job": "Poste accepté",
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
        MARK_INTERVIEWED: "Rencontré avec le référent",
        SUBMIT_CV_TO_HR: "CV transmis aux RH",
        HR_INTERVIEWS: "Entretiens RH en cours",
        HR_DECIDED_NOT_TO_PROCEED: "Les RH ont décidé de ne pas poursuivre",
        HR_PROVIDED_OFFER: "Les RH ont fait une offre",
        APPLICANT_NO_LONGER_INTERESTED: "Le candidat n'est plus intéressé",
        APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Le candidat a décidé de ne pas poursuivre",
        ANOTHER_APPLICANT_BETTER_FIT: "Un autre candidat correspondait mieux",
        CANDIDATE_ACCEPTED_OFFER: "Le candidat a accepté l'offre",
        CANDIDATE_DID_NOT_ACCEPT_OFFER: "Le candidat n'a pas accepté l'offre",
        APPLICANT_UPDATED: "Le candidat a mis à jour son profil",
        APPLICANT_RESCHEDULED: "Le candidat a demandé un report",
        LINKED_BY_FOUNDER: "Liée par le fondateur",
        ARCHIVED_BY_FOUNDER: "Archivée par le fondateur",
      },
    },
  },
};

const STATUS_VALUES = [
  "New",
  "Meeting Scheduled",
  "Meeting Requested",
  "Needs Reschedule",
  "Met with Referrer",
  "Interviewed",
  "CV Mismatch",
  "CV Update Requested",
  "CV Updated",
  "Info Requested",
  "Info Updated",
  "Not a Good Fit",
  "Applicant No Longer Interested",
  "Submitted CV to HR",
  "Interviews Being Conducted",
  "HR Decided Not to Proceed",
  "Applicant Decided Not to Move Forward",
  "Another Applicant Was a Better Fit",
  "Job Offered",
  "Candidate Did Not Accept Offer",
  "Landed Job",
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
  const searchParams = useSearchParams();
  const initialEdit = searchParams?.get("edit") === "1";
  const { language } = useLanguage();
  const router = useRouter();
  const t = translations[language];
  const historyLocale = language === "fr" ? "fr-CA" : "en-US";
  const actionLabels = t.actionHistory.labels as Record<string, string>;
  const statusOptions = t.statusOptions as Record<string, string>;

  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editDetails, setEditDetails] = useState(initialEdit);

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [iCrn, setICrn] = useState("");
  const [position, setPosition] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referrerIrref, setReferrerIrref] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingTimezone, setMeetingTimezone] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const skipAutosaveRef = useRef(true);

  // Store original values when entering edit mode
  const originalDetailsRef = useRef<{
    iCrn: string;
    position: string;
    referenceNumber: string;
    referrerIrref: string;
    meetingDate: string;
    meetingTime: string;
    meetingTimezone: string;
    meetingUrl: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setICrn(application.iCrn || "");
    setPosition(application.position || "");
    setReferenceNumber(application.referenceNumber || "");
    setReferrerIrref(application.referrerIrref || "");
    setMeetingDate(application.meetingDate || "");
    setMeetingTime(application.meetingTime || "");
    setMeetingTimezone(application.meetingTimezone || "");
    setMeetingUrl(application.meetingUrl || "");
    skipAutosaveRef.current = true;
    originalDetailsRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleStartEdit = () => {
    originalDetailsRef.current = {
      iCrn,
      position,
      referenceNumber,
      referrerIrref,
      meetingDate,
      meetingTime,
      meetingTimezone,
      meetingUrl,
    };
    setEditDetails(true);
  };

  const handleCancelEdit = () => {
    if (originalDetailsRef.current) {
      setICrn(originalDetailsRef.current.iCrn);
      setPosition(originalDetailsRef.current.position);
      setReferenceNumber(originalDetailsRef.current.referenceNumber);
      setReferrerIrref(originalDetailsRef.current.referrerIrref);
      setMeetingDate(originalDetailsRef.current.meetingDate);
      setMeetingTime(originalDetailsRef.current.meetingTime);
      setMeetingTimezone(originalDetailsRef.current.meetingTimezone);
      setMeetingUrl(originalDetailsRef.current.meetingUrl);
    }
    originalDetailsRef.current = null;
    setEditDetails(false);
  };

  const handleSaveEdit = async () => {
    if (!application) return;
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    addIfChanged("iCrn", iCrn, application.iCrn || "");
    addIfChanged("position", position, application.position || "");
    addIfChanged("referenceNumber", referenceNumber, application.referenceNumber || "");
    addIfChanged("referrerIrref", referrerIrref, application.referrerIrref || "");
    addIfChanged("meetingDate", meetingDate, application.meetingDate || "");
    addIfChanged("meetingTime", meetingTime, application.meetingTime || "");
    addIfChanged("meetingTimezone", meetingTimezone, application.meetingTimezone || "");
    addIfChanged("meetingUrl", meetingUrl, application.meetingUrl || "");

    if (Object.keys(patch).length) {
      await patchApplication(patch);
    }
    originalDetailsRef.current = null;
    setEditDetails(false);
  };

  const handleDelete = async () => {
    if (!application || deleteLoading) return;

    setDeleteLoading(true);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/founder/applications/${encodeURIComponent(application.id)}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.messages.unableToArchive);
        return;
      }
      router.push("/founder/applications");
    } catch (error) {
      console.error("Archive application failed", error);
      setActionError(t.messages.unableToArchive);
    } finally {
      setDeleteLoading(false);
    }
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
  const history = parseActionHistory(application.actionHistory).filter((entry) => entry.action !== "OFFER_JOB");

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
                  {editDetails ? (
                    <input
                      id="app-ircrn"
                      type="text"
                      value={iCrn}
                      onChange={(event) => setICrn(event.target.value)}
                    />
                  ) : (
                    <input id="app-ircrn" type="text" value={iCrn || "-"} readOnly tabIndex={-1} />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="app-position">{t.labels.position}</label>
                  {editDetails ? (
                    <input
                      id="app-position"
                      type="text"
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                    />
                  ) : (
                    <input id="app-position" type="text" value={position || "-"} readOnly tabIndex={-1} />
                  )}
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
                  {editDetails ? (
                    <input
                      id="app-referrer"
                      type="text"
                      value={referrerIrref}
                      onChange={(event) => setReferrerIrref(event.target.value)}
                    />
                  ) : (
                    <input
                      id="app-referrer"
                      type="text"
                      value={referrerIrref || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="app-reference">{t.labels.referenceNumber}</label>
                  {editDetails ? (
                    <input
                      id="app-reference"
                      type="text"
                      value={referenceNumber}
                      onChange={(event) => setReferenceNumber(event.target.value)}
                    />
                  ) : (
                    <input
                      id="app-reference"
                      type="text"
                      value={referenceNumber || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
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

            {(application.meetingDate || editDetails) && (
              <DetailSection title={t.sections.meeting}>
                <div className="field-grid field-grid--two">
                  <div className="field">
                    <label htmlFor="app-meeting-date">{t.labels.dateTime}</label>
                    {editDetails ? (
                      <input
                        id="app-meeting-date"
                        type="date"
                        value={meetingDate}
                        onChange={(event) => setMeetingDate(event.target.value)}
                      />
                    ) : (
                      <input
                        id="app-meeting-date"
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
                    )}
                  </div>
                  {editDetails && (
                    <div className="field">
                      <label htmlFor="app-meeting-time">Time</label>
                      <input
                        id="app-meeting-time"
                        type="time"
                        value={meetingTime}
                        onChange={(event) => setMeetingTime(event.target.value)}
                      />
                    </div>
                  )}
                  {editDetails && (
                    <div className="field">
                      <label htmlFor="app-meeting-timezone">Timezone</label>
                      <input
                        id="app-meeting-timezone"
                        type="text"
                        value={meetingTimezone}
                        onChange={(event) => setMeetingTimezone(event.target.value)}
                        placeholder="e.g. America/Toronto"
                      />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="app-meeting-url">{t.labels.meetingLink}</label>
                    {editDetails ? (
                      <input
                        id="app-meeting-url"
                        type="url"
                        value={meetingUrl}
                        onChange={(event) => setMeetingUrl(event.target.value)}
                        placeholder="https://..."
                      />
                    ) : application.meetingUrl ? (
                      <a href={application.meetingUrl} target="_blank" rel="noopener noreferrer">
                        {application.meetingUrl}
                      </a>
                    ) : (
                      <input id="app-meeting-url" type="text" value="-" readOnly tabIndex={-1} />
                    )}
                  </div>
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
                      {statusOptions[value.toLowerCase()] || value}
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
              <div className="flow-stack flow-stack--tight">
                {editDetails ? (
                  <>
                    <ActionBtn as="button" variant="primary" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? t.buttons.saving : t.buttons.save}
                    </ActionBtn>
                    <ActionBtn as="button" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
                      {t.buttons.cancel}
                    </ActionBtn>
                  </>
                ) : (
                  <ActionBtn as="button" variant="ghost" onClick={handleStartEdit}>
                    {t.buttons.editDetails}
                  </ActionBtn>
                )}
              </div>
              {deleteConfirm ? (
                <>
                  <ActionBtn
                    as="button"
                    className="action-btn--danger"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? t.buttons.archiving : t.buttons.confirmArchive}
                  </ActionBtn>
                  <ActionBtn
                    as="button"
                    variant="ghost"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    {t.buttons.cancel}
                  </ActionBtn>
                </>
              ) : (
                <ActionBtn
                  as="button"
                  variant="ghost"
                  onClick={() => setDeleteConfirm(true)}
                >
                  {t.buttons.archiveApplication}
                </ActionBtn>
              )}
              {actionError && (
                <div className="status-banner status-banner--error" role="alert">
                  {actionError}
                </div>
              )}
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
