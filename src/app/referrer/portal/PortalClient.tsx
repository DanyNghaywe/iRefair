"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { CenteredModal } from "@/components/CenteredModal";
import { EmptyState } from "@/components/founder/EmptyState";
import { Skeleton, SkeletonPortalRows, SkeletonStack } from "@/components/founder/Skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/Toast";

type Language = "en" | "fr";

const translations: Record<
  Language,
  {
    header: {
      eyebrow: string;
      title: string;
      lead: string;
      referrer: string;
      email: string;
      company: string;
      total: string;
      noEmail: string;
    };
    table: {
      title: string;
      activeReferrals: string;
      totalLabel: string;
      candidate: string;
      position: string;
      cv: string;
      status: string;
      actions: string;
      downloadCv: string;
      noCv: string;
      appId: string;
      iRCRN: string;
      caption: string;
    };
    statuses: Record<string, string>;
    actionLabels: Record<string, string>;
    modalTitles: Record<string, string>;
    modalDescriptions: Record<string, string>;
    successMessages: Record<string, string>;
    modal: {
      cancel: string;
      confirm: string;
      sending: string;
      date: string;
      time: string;
      timezone: string;
      meetingUrl: string;
      meetingUrlPlaceholder: string;
      notes: string;
      notesPlaceholder: string;
      includeUpdateLink: string;
      missingFields: string;
    };
    empty: {
      title: string;
      description: string;
    };
    error: {
      loadFailed: string;
      errorLabel: string;
      noData: string;
      refreshMessage: string;
    };
    expiredLink: {
      checkEmail: string;
      sentMessage: string;
      expiredTitle: string;
      expiredMessage: string;
      emailPlaceholder: string;
      sendNewLink: string;
      sending: string;
      emailRequired: string;
      emailRequiredMessage: string;
      linkSent: string;
      linkSentMessage: string;
      requestFailed: string;
    };
    reschedule: string;
    join: string;
    languageLabel: string;
    english: string;
    french: string;
  }
> = {
  en: {
    header: {
      eyebrow: "Referrer portal",
      title: "Track your referrals",
      lead: "Review candidates, download CVs, and manage your referrals.",
      referrer: "Referrer",
      email: "Email",
      company: "Company",
      total: "Total",
      noEmail: "No email on file",
    },
    table: {
      title: "Applications",
      activeReferrals: "active referrals",
      totalLabel: "total",
      candidate: "Applicant",
      position: "Position / iRCRN",
      cv: "CV",
      status: "Status",
      actions: "Actions",
      downloadCv: "Download CV",
      noCv: "No CV available",
      appId: "App ID",
      iRCRN: "iRCRN",
      caption: "Referrer portal applications",
    },
    statuses: {
      new: "New",
      "meeting requested": "Meeting Requested",
      "meeting scheduled": "Meeting Scheduled",
      "needs reschedule": "Needs Reschedule",
      interviewed: "Interviewed",
      hired: "Hired",
      "not a good fit": "Not a Good Fit",
      "cv mismatch": "CV Mismatch",
      "cv update requested": "CV Update Requested",
      "info requested": "Info Requested",
    },
    actionLabels: {
      SCHEDULE_MEETING: "Schedule Meeting",
      CANCEL_MEETING: "Cancel Meeting",
      REJECT: "Not a Good Fit",
      CV_MISMATCH: "CV Doesn't Match",
      REQUEST_CV_UPDATE: "Request CV Update",
      REQUEST_INFO: "Missing Information",
      MARK_INTERVIEWED: "Mark as Interviewed",
      OFFER_JOB: "Offer Job",
    },
    modalTitles: {
      SCHEDULE_MEETING: "Schedule Meeting",
      CANCEL_MEETING: "Cancel Meeting",
      REJECT: "Not a Good Fit",
      CV_MISMATCH: "CV Doesn't Match",
      REQUEST_CV_UPDATE: "Request CV Update",
      REQUEST_INFO: "Request Information",
      MARK_INTERVIEWED: "Mark as Interviewed",
      OFFER_JOB: "Offer Job",
      default: "Confirm Action",
    },
    modalDescriptions: {
      SCHEDULE_MEETING: "Schedule a meeting with this candidate. They will receive an email with the details.",
      CANCEL_MEETING: "Cancel the scheduled meeting. The candidate will be notified.",
      REJECT: "Mark this candidate as not a good fit. They will receive a polite rejection email.",
      CV_MISMATCH: "The CV doesn't match your requirements. The candidate will receive feedback.",
      REQUEST_CV_UPDATE: "Request the candidate to update their CV. They will receive a link to make changes.",
      REQUEST_INFO: "Request additional information from the candidate.",
      MARK_INTERVIEWED: "Mark this candidate as interviewed. They will receive a confirmation.",
      OFFER_JOB: "Offer this candidate the job! They will receive the good news.",
    },
    successMessages: {
      SCHEDULE_MEETING: "Meeting scheduled and candidate notified.",
      CANCEL_MEETING: "Meeting cancelled and candidate notified.",
      REJECT: "Candidate marked as not a good fit.",
      CV_MISMATCH: "CV feedback sent to candidate.",
      REQUEST_CV_UPDATE: "CV update request sent to candidate.",
      REQUEST_INFO: "Information request sent to candidate.",
      MARK_INTERVIEWED: "Candidate marked as interviewed.",
      OFFER_JOB: "Job offer sent to candidate!",
      default: "Action completed successfully.",
    },
    modal: {
      cancel: "Cancel",
      confirm: "Confirm",
      sending: "Sending...",
      date: "Date",
      time: "Time",
      timezone: "Timezone",
      meetingUrl: "Meeting URL (optional)",
      meetingUrlPlaceholder: "https://zoom.us/j/...",
      notes: "Notes (optional)",
      notesPlaceholder: "Add any notes or feedback...",
      includeUpdateLink: "Include link for candidate to update their CV",
      missingFields: "Please fill in date, time, and timezone.",
    },
    empty: {
      title: "No applications assigned",
      description: "Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review.",
    },
    error: {
      loadFailed: "We could not load the portal",
      errorLabel: "Error",
      noData: "No data available",
      refreshMessage: "Please refresh to try again.",
    },
    expiredLink: {
      checkEmail: "Check your email",
      sentMessage: "We've sent a new portal access link to",
      expiredTitle: "Access Link Expired",
      expiredMessage: "Your portal access link has expired or been revoked. Enter your email to receive a fresh link.",
      emailPlaceholder: "your.email@example.com",
      sendNewLink: "Send New Link",
      sending: "Sending...",
      emailRequired: "Email required",
      emailRequiredMessage: "Please enter your email address.",
      linkSent: "Link sent",
      linkSentMessage: "Check your email for a new portal link.",
      requestFailed: "Request failed",
    },
    reschedule: "Candidate requested to reschedule.",
    join: "Join",
    languageLabel: "Language",
    english: "English",
    french: "Français",
  },
  fr: {
    header: {
      eyebrow: "Portail référent",
      title: "Suivez vos recommandations",
      lead: "Examinez les candidats, téléchargez les CV et gérez vos recommandations.",
      referrer: "Référent",
      email: "E-mail",
      company: "Entreprise",
      total: "Total",
      noEmail: "Aucun e-mail enregistré",
    },
    table: {
      title: "Candidatures",
      activeReferrals: "recommandations actives",
      totalLabel: "total",
      candidate: "Candidat(e)",
      position: "Poste / iRCRN",
      cv: "CV",
      status: "Statut",
      actions: "Actions",
      downloadCv: "Télécharger le CV",
      noCv: "Aucun CV disponible",
      appId: "ID candidature",
      iRCRN: "iRCRN",
      caption: "Candidatures du portail référent",
    },
    statuses: {
      new: "Nouveau",
      "meeting requested": "Réunion demandée",
      "meeting scheduled": "Réunion planifiée",
      "needs reschedule": "À replanifier",
      interviewed: "Entretien effectué",
      hired: "Embauché",
      "not a good fit": "Profil non retenu",
      "cv mismatch": "CV inadapté",
      "cv update requested": "Mise à jour CV demandée",
      "info requested": "Informations demandées",
    },
    actionLabels: {
      SCHEDULE_MEETING: "Planifier une réunion",
      CANCEL_MEETING: "Annuler la réunion",
      REJECT: "Profil non retenu",
      CV_MISMATCH: "CV non conforme",
      REQUEST_CV_UPDATE: "Demander mise à jour CV",
      REQUEST_INFO: "Informations manquantes",
      MARK_INTERVIEWED: "Marquer comme interviewé",
      OFFER_JOB: "Proposer le poste",
    },
    modalTitles: {
      SCHEDULE_MEETING: "Planifier une réunion",
      CANCEL_MEETING: "Annuler la réunion",
      REJECT: "Profil non retenu",
      CV_MISMATCH: "CV non conforme",
      REQUEST_CV_UPDATE: "Demander mise à jour CV",
      REQUEST_INFO: "Demander des informations",
      MARK_INTERVIEWED: "Marquer comme interviewé",
      OFFER_JOB: "Proposer le poste",
      default: "Confirmer l'action",
    },
    modalDescriptions: {
      SCHEDULE_MEETING: "Planifiez une réunion avec ce candidat. Il recevra un e-mail avec les détails.",
      CANCEL_MEETING: "Annulez la réunion prévue. Le candidat sera informé.",
      REJECT: "Marquez ce candidat comme non retenu. Il recevra un e-mail de refus courtois.",
      CV_MISMATCH: "Le CV ne correspond pas à vos exigences. Le candidat recevra un retour.",
      REQUEST_CV_UPDATE: "Demandez au candidat de mettre à jour son CV. Il recevra un lien pour effectuer les modifications.",
      REQUEST_INFO: "Demandez des informations supplémentaires au candidat.",
      MARK_INTERVIEWED: "Marquez ce candidat comme ayant passé l'entretien. Il recevra une confirmation.",
      OFFER_JOB: "Proposez le poste à ce candidat ! Il recevra la bonne nouvelle.",
    },
    successMessages: {
      SCHEDULE_MEETING: "Réunion planifiée et candidat informé.",
      CANCEL_MEETING: "Réunion annulée et candidat informé.",
      REJECT: "Candidat marqué comme non retenu.",
      CV_MISMATCH: "Retour sur le CV envoyé au candidat.",
      REQUEST_CV_UPDATE: "Demande de mise à jour du CV envoyée au candidat.",
      REQUEST_INFO: "Demande d'informations envoyée au candidat.",
      MARK_INTERVIEWED: "Candidat marqué comme interviewé.",
      OFFER_JOB: "Offre d'emploi envoyée au candidat !",
      default: "Action effectuée avec succès.",
    },
    modal: {
      cancel: "Annuler",
      confirm: "Confirmer",
      sending: "Envoi...",
      date: "Date",
      time: "Heure",
      timezone: "Fuseau horaire",
      meetingUrl: "URL de la réunion (optionnel)",
      meetingUrlPlaceholder: "https://zoom.us/j/...",
      notes: "Notes (optionnel)",
      notesPlaceholder: "Ajoutez des notes ou commentaires...",
      includeUpdateLink: "Inclure un lien pour que le candidat mette à jour son CV",
      missingFields: "Veuillez remplir la date, l'heure et le fuseau horaire.",
    },
    empty: {
      title: "Aucune candidature assignée",
      description: "Les candidatures apparaîtront ici une fois qu'elles vous seront assignées. Revenez bientôt pour de nouvelles recommandations à examiner.",
    },
    error: {
      loadFailed: "Impossible de charger le portail",
      errorLabel: "Erreur",
      noData: "Aucune donnée disponible",
      refreshMessage: "Veuillez actualiser pour réessayer.",
    },
    expiredLink: {
      checkEmail: "Vérifiez votre e-mail",
      sentMessage: "Nous avons envoyé un nouveau lien d'accès au portail à",
      expiredTitle: "Lien d'accès expiré",
      expiredMessage: "Votre lien d'accès au portail a expiré ou a été révoqué. Entrez votre e-mail pour recevoir un nouveau lien.",
      emailPlaceholder: "votre.email@exemple.com",
      sendNewLink: "Envoyer un nouveau lien",
      sending: "Envoi...",
      emailRequired: "E-mail requis",
      emailRequiredMessage: "Veuillez entrer votre adresse e-mail.",
      linkSent: "Lien envoyé",
      linkSentMessage: "Vérifiez votre e-mail pour le nouveau lien du portail.",
      requestFailed: "Échec de la demande",
    },
    reschedule: "Le candidat a demandé à replanifier.",
    join: "Rejoindre",
    languageLabel: "Langue",
    english: "English",
    french: "Français",
  },
};

type PortalItem = {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  position: string;
  iCrn: string;
  resumeFileName: string;
  resumeDownloadUrl?: string;
  status: string;
  ownerNotes: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingTimezone?: string;
  meetingUrl?: string;
};

type PortalResponse = {
  ok: true;
  referrer: { irref: string; name?: string; email?: string; company?: string };
  items: PortalItem[];
  total: number;
};

type FeedbackAction =
  | "SCHEDULE_MEETING"
  | "CANCEL_MEETING"
  | "REJECT"
  | "CV_MISMATCH"
  | "REQUEST_CV_UPDATE"
  | "REQUEST_INFO"
  | "MARK_INTERVIEWED"
  | "OFFER_JOB";

type ActionConfig = {
  code: FeedbackAction;
  enabledStatuses?: string[];
  disabledStatuses?: string[];
};

const STATUS_VARIANTS: Record<string, "info" | "success" | "warning" | "error" | "neutral"> = {
  new: "info",
  "meeting requested": "info",
  "meeting scheduled": "success",
  "needs reschedule": "warning",
  interviewed: "success",
  hired: "success",
  "not a good fit": "error",
  "cv mismatch": "warning",
  "cv update requested": "warning",
  "info requested": "warning",
};

const ACTIONS: ActionConfig[] = [
  { code: "SCHEDULE_MEETING" },
  { code: "CANCEL_MEETING", enabledStatuses: ["meeting scheduled"] },
  { code: "REJECT", disabledStatuses: ["hired"] },
  { code: "CV_MISMATCH", disabledStatuses: ["hired"] },
  { code: "REQUEST_CV_UPDATE", disabledStatuses: ["hired"] },
  { code: "REQUEST_INFO", disabledStatuses: ["hired"] },
  { code: "MARK_INTERVIEWED", enabledStatuses: ["meeting scheduled", "meeting requested"] },
  { code: "OFFER_JOB", enabledStatuses: ["interviewed"] },
];

const TIMEZONES = [
  "America/Toronto",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
  "America/St_Johns",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "UTC",
];

function StatusBadge({ status, statusLabels }: { status: string; statusLabels: Record<string, string> }) {
  const normalized = status?.toLowerCase().trim() || "new";
  const variant = STATUS_VARIANTS[normalized] || "neutral";
  const label = statusLabels[normalized] || status || statusLabels.new;
  return <span className={`portal-badge portal-badge--${variant}`}>{label}</span>;
}

function formatMeetingDisplay(date?: string, time?: string, timezone?: string): string {
  if (!date || !time) return "";
  const tz = timezone ? ` (${timezone.split("/").pop()?.replace("_", " ")})` : "";
  return `${date} at ${time}${tz}`;
}

export default function PortalClient() {
  const toast = useToast();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalResponse | null>(null);

  // Self-service link request state
  const [showRequestLink, setShowRequestLink] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [linkRequested, setLinkRequested] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<FeedbackAction | null>(null);
  const [modalItem, setModalItem] = useState<PortalItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields for modal
  const [notes, setNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingTimezone, setMeetingTimezone] = useState("America/Toronto");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [includeUpdateLink, setIncludeUpdateLink] = useState(true);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/referrer/portal/data", { cache: "no-store" });
      const json = await res.json();

      // Detect expired/invalid token (401) or version mismatch (403)
      if (res.status === 401 || res.status === 403) {
        setShowRequestLink(true);
        setLoading(false);
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to load portal");
      }
      setData(json as PortalResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler for requesting new link
  const handleRequestLink = async () => {
    if (!requestEmail.trim()) {
      toast.error(t.expiredLink.emailRequired, t.expiredLink.emailRequiredMessage);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/referrer/portal/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: requestEmail }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to send link");
      }

      setLinkRequested(true);
      toast.success(t.expiredLink.linkSent, t.expiredLink.linkSentMessage);
    } catch (err) {
      toast.error(t.expiredLink.requestFailed, err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Handle dropdown toggle with position calculation
  const handleDropdownToggle = (itemId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown === itemId) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const menuWidth = 180;
      const menuHeight = 320; // Approximate max height for 8 items

      // Calculate position - prefer below and aligned to right edge of button
      let top = rect.bottom + 4;
      let left = rect.right - menuWidth;

      // If menu would go off the bottom of the viewport, position above
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
      }

      // Ensure menu doesn't go off the left edge
      if (left < 8) {
        left = 8;
      }

      setDropdownPosition({ top, left });
      setOpenDropdown(itemId);
    }
  };

  const openModal = (item: PortalItem, action: FeedbackAction) => {
    setModalItem(item);
    setModalAction(action);
    setNotes("");
    setMeetingDate("");
    setMeetingTime("");
    setMeetingTimezone("America/Toronto");
    setMeetingUrl("");
    setIncludeUpdateLink(true);
    setModalOpen(true);
    setOpenDropdown(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItem(null);
    setModalAction(null);
  };

  const handleSubmit = async () => {
    if (!modalItem || !modalAction) return;

    // Validation for schedule meeting
    if (modalAction === "SCHEDULE_MEETING") {
      if (!meetingDate || !meetingTime || !meetingTimezone) {
        toast.error(t.modal.missingFields, t.modal.missingFields);
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        applicationId: modalItem.id,
        action: modalAction,
        notes: notes.trim() || undefined,
      };

      if (modalAction === "SCHEDULE_MEETING") {
        body.meetingDate = meetingDate;
        body.meetingTime = meetingTime;
        body.meetingTimezone = meetingTimezone;
        body.meetingUrl = meetingUrl.trim() || undefined;
      }

      if (modalAction === "CV_MISMATCH") {
        body.includeUpdateLink = includeUpdateLink;
      }

      const res = await fetch("/api/referrer/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to submit feedback");
      }

      toast.success(t.modalTitles[modalAction] || t.modalTitles.default, t.successMessages[modalAction] || t.successMessages.default);

      // Update local state
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === modalItem.id
                  ? {
                      ...item,
                      status: json.status || item.status,
                      meetingDate: modalAction === "SCHEDULE_MEETING" ? meetingDate : modalAction === "CANCEL_MEETING" ? "" : item.meetingDate,
                      meetingTime: modalAction === "SCHEDULE_MEETING" ? meetingTime : modalAction === "CANCEL_MEETING" ? "" : item.meetingTime,
                      meetingTimezone: modalAction === "SCHEDULE_MEETING" ? meetingTimezone : modalAction === "CANCEL_MEETING" ? "" : item.meetingTimezone,
                      meetingUrl: modalAction === "SCHEDULE_MEETING" ? meetingUrl : modalAction === "CANCEL_MEETING" ? "" : item.meetingUrl,
                    }
                  : item
              ),
            }
          : prev
      );

      closeModal();
    } catch (err) {
      toast.error(t.expiredLink.requestFailed, err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  const isActionEnabled = (action: ActionConfig, status: string): boolean => {
    const normalized = status?.toLowerCase().trim() || "new";
    if (normalized === "hired" && action.code !== "OFFER_JOB") return false;
    if (action.enabledStatuses) return action.enabledStatuses.includes(normalized);
    if (action.disabledStatuses) return !action.disabledStatuses.includes(normalized);
    return true;
  };

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => a.id.localeCompare(b.id));
  }, [data]);

  const header = (
    <section className="card page-card portal-card" aria-labelledby="portal-title">
      <div className="language-toggle" role="group" aria-label={t.languageLabel}>
        <button
          type="button"
          className={`language-toggle__btn ${language === "en" ? "is-active" : ""}`}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
        >
          {t.english}
        </button>
        <button
          type="button"
          className={`language-toggle__btn ${language === "fr" ? "is-active" : ""}`}
          onClick={() => setLanguage("fr")}
          aria-pressed={language === "fr"}
        >
          {t.french}
        </button>
      </div>
      <div className="card-header portal-header">
        <div className="portal-header__copy">
          <p className="eyebrow">{t.header.eyebrow}</p>
          <h2 id="portal-title">{t.header.title}</h2>
          <p className="lead">{t.header.lead}</p>
        </div>
        {data ? (
          <dl className="portal-meta">
            <div className="portal-meta__item">
              <dt>{t.header.referrer}</dt>
              <dd>
                {data.referrer.name || t.header.referrer} - {data.referrer.irref}
              </dd>
            </div>
            <div className="portal-meta__item">
              <dt>{t.header.email}</dt>
              <dd>{data.referrer.email || t.header.noEmail}</dd>
            </div>
            {data.referrer.company ? (
              <div className="portal-meta__item">
                <dt>{t.header.company}</dt>
                <dd>{data.referrer.company}</dd>
              </div>
            ) : null}
            <div className="portal-meta__item">
              <dt>{t.header.total}</dt>
              <dd>{data.total}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-table-card" aria-live="polite">
          <div className="portal-table-header">
            <SkeletonStack>
              <Skeleton variant="heading" size="sm" width="40%" />
              <Skeleton variant="text" width="25%" />
            </SkeletonStack>
          </div>
          <div className="portal-table-wrapper">
            <SkeletonPortalRows rows={5} />
          </div>
        </section>
      </div>
    );
  }

  if (showRequestLink) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card" style={{ maxWidth: 600, margin: "0 auto" }}>
          {linkRequested ? (
            <div style={{ padding: "48px 32px", textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 32,
                  color: "#ffffff",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
              >
                ✓
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "#111827" }}>
                {t.expiredLink.checkEmail}
              </h2>
              <p style={{ fontSize: 16, color: "#1f2937", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                {t.expiredLink.sentMessage} <strong style={{ color: "#111827" }}>{requestEmail}</strong>.
              </p>
            </div>
          ) : (
            <div style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(255, 193, 7, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 32,
                  }}
                >
                  🔒
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "#111827" }}>
                  {t.expiredLink.expiredTitle}
                </h2>
                <p style={{ fontSize: 16, color: "#1f2937", lineHeight: 1.5, marginBottom: 32 }}>
                  {t.expiredLink.expiredMessage}
                </p>
              </div>
              <div style={{ maxWidth: 380, margin: "0 auto" }}>
                <input
                  type="email"
                  placeholder={t.expiredLink.emailPlaceholder}
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRequestLink()}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginBottom: 16,
                    fontSize: 15,
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    outline: "none",
                    transition: "border-color 0.2s",
                    fontFamily: "inherit",
                    color: "#111827",
                    backgroundColor: "#ffffff",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                  }}
                  disabled={submitting}
                />
                <ActionBtn
                  variant="primary"
                  onClick={handleRequestLink}
                  disabled={submitting}
                >
                  {submitting ? t.expiredLink.sending : t.expiredLink.sendNewLink}
                </ActionBtn>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card portal-state-card--error" role="alert">
          <div className="portal-state">
            <div className="portal-state__icon portal-state__icon--error" aria-hidden="true" />
            <div>
              <p className="portal-state__title">{t.error.loadFailed}</p>
              <p className="portal-state__message">{t.error.errorLabel}: {error}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card">
          <div className="portal-state">
            <div className="portal-state__icon" aria-hidden="true" />
            <div>
              <p className="portal-state__title">{t.error.noData}</p>
              <p className="portal-state__message">{t.error.refreshMessage}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="portal-stack">
      {header}
      <section className="card page-card portal-card portal-table-card">
        <div className="portal-table-header">
          <div>
            <p className="portal-table-title">{t.table.title}</p>
            <p className="portal-table-sub">{sortedItems.length} {t.table.activeReferrals}</p>
          </div>
          <div className="portal-table-meta">
            <span className="portal-count-pill">{data.total} {t.table.totalLabel}</span>
          </div>
        </div>
        <div className="portal-table-wrapper">
          <div className="founder-table portal-table" ref={dropdownRef}>
            <div className="founder-table__container portal-table__scroll">
              <table>
                <caption className="sr-only">{t.table.caption}</caption>
                <thead>
                  <tr>
                    <th className="portal-col-candidate">{t.table.candidate}</th>
                    <th className="portal-col-position">{t.table.position}</th>
                    <th className="portal-col-cv">{t.table.cv}</th>
                    <th className="portal-col-status">{t.table.status}</th>
                    <th className="portal-col-actions">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="portal-table-empty">
                        <EmptyState
                          variant="portal"
                          title={t.empty.title}
                          description={t.empty.description}
                        />
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item) => {
                      const normalizedStatus = item.status?.toLowerCase().trim() || "new";
                      const hasMeeting = normalizedStatus === "meeting scheduled" && item.meetingDate;
                      const needsReschedule = normalizedStatus === "needs reschedule";

                      return (
                        <tr key={item.id}>
                          <td className="portal-col-candidate">
                            <div className="portal-cell-title">{item.applicantName || item.applicantId}</div>
                            <div className="portal-cell-sub">{item.applicantEmail}</div>
                            <div className="portal-cell-sub">{item.applicantPhone}</div>
                          </td>
                          <td className="portal-col-position">
                            <div className="portal-cell-title">{item.position}</div>
                            <div className="portal-cell-sub">{t.table.iRCRN}: {item.iCrn || "-"}</div>
                          </td>
                          <td className="portal-col-cv">
                            {item.resumeDownloadUrl ? (
                              <a href={item.resumeDownloadUrl} target="_blank" rel="noreferrer" className="portal-link">
                                {t.table.downloadCv}
                              </a>
                            ) : (
                              <span className="portal-muted">{t.table.noCv}</span>
                            )}
                          </td>
                          <td className="portal-col-status">
                            <StatusBadge status={item.status} statusLabels={t.statuses} />
                            {hasMeeting && (
                              <div className="portal-meeting-info">
                                <span className="portal-meeting-date">
                                  {formatMeetingDisplay(item.meetingDate, item.meetingTime, item.meetingTimezone)}
                                </span>
                                {item.meetingUrl && (
                                  <a
                                    href={item.meetingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="portal-meeting-link"
                                  >
                                    {t.join}
                                  </a>
                                )}
                              </div>
                            )}
                            {needsReschedule && (
                              <div className="portal-reschedule-warning">
                                {t.reschedule}
                              </div>
                            )}
                          </td>
                          <td className="portal-col-actions">
                            <div className="portal-dropdown">
                              <ActionBtn
                                size="sm"
                                variant="ghost"
                                className="portal-dropdown-trigger"
                                onClick={(e) => handleDropdownToggle(item.id, e)}
                                aria-expanded={openDropdown === item.id}
                                aria-haspopup="menu"
                              >
                                {t.table.actions}
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ marginLeft: 4 }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </ActionBtn>
                              {openDropdown === item.id && dropdownPosition && (
                                <div
                                  className="portal-dropdown-menu portal-dropdown-menu--fixed"
                                  role="menu"
                                  style={{
                                    top: dropdownPosition.top,
                                    left: dropdownPosition.left,
                                  }}
                                >
                                  {ACTIONS.map((action) => {
                                    const enabled = isActionEnabled(action, item.status);
                                    return (
                                      <button
                                        key={action.code}
                                        type="button"
                                        className={`portal-dropdown-item ${!enabled ? "portal-dropdown-item--disabled" : ""}`}
                                        onClick={() => enabled && openModal(item, action.code)}
                                        disabled={!enabled}
                                        role="menuitem"
                                      >
                                        {t.actionLabels[action.code]}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Modal */}
      <CenteredModal
        open={modalOpen}
        onClose={closeModal}
        title={modalAction ? (t.modalTitles[modalAction] || t.modalTitles.default) : ""}
        description={modalAction ? (t.modalDescriptions[modalAction] || "") : ""}
        size={modalAction === "SCHEDULE_MEETING" ? "md" : "sm"}
        footer={
          <>
            <ActionBtn variant="ghost" onClick={closeModal} disabled={submitting}>
              {t.modal.cancel}
            </ActionBtn>
            <ActionBtn variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? t.modal.sending : t.modal.confirm}
            </ActionBtn>
          </>
        }
      >
        {modalItem && (
          <div className="portal-modal-content">
            <div className="portal-modal-candidate">
              <strong>{modalItem.applicantName || modalItem.applicantId}</strong>
              <span>{modalItem.position}</span>
            </div>

            {modalAction === "SCHEDULE_MEETING" && (
              <div className="portal-modal-fields">
                <div className="portal-modal-field">
                  <label htmlFor="meeting-date">{t.modal.date} *</label>
                  <input
                    id="meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="portal-modal-field">
                  <label htmlFor="meeting-time">{t.modal.time} *</label>
                  <input
                    id="meeting-time"
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                  />
                </div>
                <div className="portal-modal-field">
                  <label htmlFor="meeting-timezone">{t.modal.timezone} *</label>
                  <select
                    id="meeting-timezone"
                    value={meetingTimezone}
                    onChange={(e) => setMeetingTimezone(e.target.value)}
                    required
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="portal-modal-field portal-modal-field--full">
                  <label htmlFor="meeting-url">{t.modal.meetingUrl}</label>
                  <input
                    id="meeting-url"
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder={t.modal.meetingUrlPlaceholder}
                  />
                </div>
              </div>
            )}

            {modalAction === "CV_MISMATCH" && (
              <div className="portal-modal-checkbox">
                <input
                  id="include-update-link"
                  type="checkbox"
                  checked={includeUpdateLink}
                  onChange={(e) => setIncludeUpdateLink(e.target.checked)}
                />
                <label htmlFor="include-update-link">
                  {t.modal.includeUpdateLink}
                </label>
              </div>
            )}

            <div className="portal-modal-field portal-modal-field--full">
              <label htmlFor="notes">{t.modal.notes}</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.modal.notesPlaceholder}
              />
            </div>
          </div>
        )}
      </CenteredModal>
    </div>
  );
}
