"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { AutosaveHint } from "@/components/founder/AutosaveHint";
import { Badge } from "@/components/founder/Badge";
import { DetailPageShell } from "@/components/founder/DetailPageShell";
import { DetailSection } from "@/components/founder/DetailSection";
import { Select } from "@/components/Select";
import { Skeleton, SkeletonDetailGrid, SkeletonStack } from "@/components/founder/Skeleton";
import { Topbar } from "@/components/founder/Topbar";
import { countryOptions } from "@/lib/countries";

const translations = {
  en: {
    inviteSent: "Invite sent.",
    unableToSendInvite: "Unable to send invite.",
    companyApproved: "Company approved.",
    companyDenied: "Company denied.",
    unableToUpdateApproval: "Unable to update approval.",
    updateApplied: "Update applied successfully.",
    updateDenied: "Update denied.",
    unableToProcessUpdate: "Unable to process update.",
    unableToArchive: "Unable to archive referrer.",
    portalLinkGenerated: "Portal link generated.",
    portalLinkGeneratedEmailed: "Portal link generated and emailed.",
    unableToGeneratePortal: "Unable to generate portal link.",
    portalTokensRotated: "Portal tokens rotated. Generate a new link to share.",
    unableToRotateToken: "Unable to rotate portal token.",
    page: {
      title: "Referrer Review",
      invalidSubtitle: "Invalid referrer ID",
      notFoundTitle: "Referrer not found",
      notFoundDescription: "This referrer ID is missing or invalid.",
      notFoundRetry: "Double-check the referrer ID and try again.",
      reviewTitle: (name: string) => (name ? `${name} - Review` : "Referrer Review"),
    },
    sections: {
      pendingUpdates: "Pending Updates",
      companies: "Companies",
      admin: "Admin",
      profile: "Profile",
      links: "Links",
      decision: "Decision",
      applications: "Applications",
    },
    labels: {
      status: "Status",
      unassigned: "Unassigned",
      referrerType: "Referrer Type",
      lastContacted: "Last Contact Date",
      nextFollowUp: "Next Follow-up",
      internalNotes: "Internal Notes",
      name: "Name",
      email: "Email",
      phone: "Phone",
      country: "Country",
      referrerId: "Referrer iRREF",
      missingFields: "Missing Fields",
      linkedin: "LinkedIn",
      currentStatus: "Current status",
      complete: "Complete",
      company: "Company",
      ircrn: "iRCRN",
      industry: "Industry",
      workType: "Work Type",
      careersPortal: "Careers Portal",
    },
    placeholders: {
      referrerType: "e.g. HR Manager, Recruiter, Agency",
      lastContacted: "e.g. 2025-01-15",
      nextFollowUp: "e.g. 2025-01-20 or Call Monday",
      notes: "Add notes about this referrer...",
      select: "Select",
      careersPortal: "https://...",
    },
    buttons: {
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      editDetails: "Edit details",
      approve: "Approve",
      reject: "Reject",
      confirmReject: "Confirm reject",
      updating: "Updating...",
      archiveReferrer: "Archive referrer",
      confirmArchive: "Confirm archive",
      archiving: "Archiving...",
      backToReferrers: "Back to Referrers",
    },
    statusLabels: {
      pending: "Pending",
      approved: "Approved",
      denied: "Denied",
    },
    statusOptions: {
      new: "New",
      engaged: "Engaged",
      active: "Active",
      paused: "Paused",
      closed: "Closed",
    },
    pendingUpdates: {
      title: "Pending Updates",
      pending: "Pending",
      applying: "Applying...",
      approve: "Approve",
      deny: "Deny",
    },
    companies: {
      pending: "Pending",
      approved: "Approved",
      denied: "Denied",
      company: "Company",
      ircrn: "iRCRN",
      industry: "Industry",
      workType: "Work Type",
      careersPortal: "Careers Portal",
      unnamed: "Unnamed",
      select: "Select",
    },
    links: {
      linkedin: "LinkedIn",
      view: "View",
      referrerPortal: "Referrer Portal",
      open: "Open",
      generate: "Generate",
      generating: "Generating...",
      generateHint: "Generate a portal link for this referrer",
      rotateToken: "Rotate Portal Token",
      rotate: "Rotate",
      rotating: "Rotating...",
      rotateHint: "Invalidate existing portal tokens",
      meetFounder: "Meet Founder",
      invite: "Invite",
      sendingInvite: "Sending invite...",
      sendInviteEmail: "Send invite email",
      notProvided: "Not provided",
    },
    banners: {
      archiveWarning: "This will also archive all related applications.",
    },
    applications: {
      none: "No applications yet.",
      application: "Application",
      unassigned: "Unassigned",
    },
    fieldLabels: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      country: "Country",
      company: "Company",
      companyIndustry: "Industry",
      careersPortal: "Careers Portal",
      workType: "Work Type",
      linkedin: "LinkedIn",
    },
  },
  fr: {
    inviteSent: "Invitation envoyée.",
    unableToSendInvite: "Impossible d'envoyer l'invitation.",
    companyApproved: "Entreprise approuvée.",
    companyDenied: "Entreprise refusée.",
    unableToUpdateApproval: "Impossible de mettre à jour l'approbation.",
    updateApplied: "Mise à jour appliquée avec succès.",
    updateDenied: "Mise à jour refusée.",
    unableToProcessUpdate: "Impossible de traiter la mise à jour.",
    unableToArchive: "Impossible d'archiver le référent.",
    portalLinkGenerated: "Lien du portail généré.",
    portalLinkGeneratedEmailed: "Lien du portail généré et envoyé par courriel.",
    unableToGeneratePortal: "Impossible de générer le lien du portail.",
    portalTokensRotated: "Jetons du portail réinitialisés. Générez un nouveau lien à partager.",
    unableToRotateToken: "Impossible de réinitialiser le jeton du portail.",
    page: {
      title: "Revue du référent",
      invalidSubtitle: "Identifiant référent invalide",
      notFoundTitle: "Référent introuvable",
      notFoundDescription: "Cet identifiant de référent est manquant ou invalide.",
      notFoundRetry: "Vérifiez l'identifiant du référent et réessayez.",
      reviewTitle: (name: string) => (name ? `${name} - Revue` : "Revue du référent"),
    },
    sections: {
      pendingUpdates: "Mises à jour en attente",
      companies: "Entreprises",
      admin: "Administration",
      profile: "Profil",
      links: "Liens",
      decision: "Décision",
      applications: "Candidatures",
    },
    labels: {
      status: "Statut",
      unassigned: "Non assigné",
      referrerType: "Type de référent",
      lastContacted: "Dernière prise de contact",
      nextFollowUp: "Prochaine relance",
      internalNotes: "Notes internes",
      name: "Nom",
      email: "Courriel",
      phone: "Téléphone",
      country: "Pays",
      referrerId: "iRREF du référent",
      missingFields: "Champs manquants",
      linkedin: "LinkedIn",
      currentStatus: "Statut actuel",
      complete: "Complet",
      company: "Entreprise",
      ircrn: "iRCRN",
      industry: "Secteur",
      workType: "Type de travail",
      careersPortal: "Portail carrières",
    },
    placeholders: {
      referrerType: "ex. RH, recruteur, agence",
      lastContacted: "ex. 2025-01-15",
      nextFollowUp: "ex. 2025-01-20 ou Appeler lundi",
      notes: "Ajoutez des notes sur ce référent...",
      select: "Sélectionner",
      careersPortal: "https://...",
    },
    buttons: {
      save: "Enregistrer",
      saving: "Enregistrement...",
      cancel: "Annuler",
      editDetails: "Modifier les détails",
      approve: "Approuver",
      reject: "Refuser",
      confirmReject: "Confirmer le refus",
      updating: "Mise à jour...",
      archiveReferrer: "Archiver le référent",
      confirmArchive: "Confirmer l'archivage",
      archiving: "Archivage...",
      backToReferrers: "Retour aux référents",
    },
    statusLabels: {
      pending: "En attente",
      approved: "Approuvé",
      denied: "Refusé",
    },
    statusOptions: {
      new: "Nouveau",
      engaged: "Engagé",
      active: "Actif",
      paused: "En pause",
      closed: "Fermé",
    },
    pendingUpdates: {
      title: "Mises à jour en attente",
      pending: "En attente",
      applying: "Traitement...",
      approve: "Approuver",
      deny: "Refuser",
    },
    companies: {
      pending: "En attente",
      approved: "Approuvé",
      denied: "Refusé",
      company: "Entreprise",
      ircrn: "iRCRN",
      industry: "Secteur",
      workType: "Type de travail",
      careersPortal: "Portail carrières",
      unnamed: "Sans nom",
      select: "Sélectionner",
    },
    links: {
      linkedin: "LinkedIn",
      view: "Voir",
      referrerPortal: "Portail référent",
      open: "Ouvrir",
      generate: "Générer",
      generating: "Génération...",
      generateHint: "Générer un lien de portail pour ce référent",
      rotateToken: "Réinitialiser le jeton du portail",
      rotate: "Réinitialiser",
      rotating: "Réinitialisation...",
      rotateHint: "Invalider les jetons de portail existants",
      meetFounder: "Rencontrer le fondateur",
      invite: "Inviter",
      sendingInvite: "Envoi de l'invitation...",
      sendInviteEmail: "Envoyer un e-mail d'invitation",
      notProvided: "Non fourni",
    },
    banners: {
      archiveWarning: "Cela archivera également toutes les candidatures associées.",
    },
    applications: {
      none: "Aucune candidature pour l'instant.",
      application: "Candidature",
      unassigned: "Non assigné",
    },
    fieldLabels: {
      name: "Nom",
      email: "Courriel",
      phone: "Téléphone",
      country: "Pays",
      company: "Entreprise",
      companyIndustry: "Secteur",
      careersPortal: "Portail carrières",
      workType: "Type de travail",
      linkedin: "LinkedIn",
    },
  },
};

type ReferrerRecord = {
  irref: string;
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIrcrn?: string;
  companyApproval?: string;
  companyIndustry: string;
  careersPortal?: string;
  workType: string;
  linkedin: string;
  pendingUpdates?: string;
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  missingFields: string[];
};

type PendingUpdate = {
  id: string;
  timestamp: string;
  status: "pending" | "approved" | "denied";
  data: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    company?: string;
    companyIndustry?: string;
    careersPortal?: string;
    workType?: string;
    linkedin?: string;
  };
};

type ApplicationItem = {
  id: string;
  applicantId: string;
  iCrn: string;
  position: string;
  status: string;
};

type ReferrerCompany = {
  id: string;
  timestamp: string;
  companyName: string;
  companyIrcrn: string | null;
  companyApproval: string;
  companyIndustry: string;
  careersPortal: string | null;
  workType: string;
  archived: boolean;
};

const statusOptions = ["", "New", "Engaged", "Active", "Paused", "Closed"];
const LINK_PREVIEW_MAX = 42;

const COMPANY_INDUSTRY_VALUES: string[] = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Hospitality",
  "Marketing / Media",
  "Engineering / Construction",
  "Consulting",
  "Not for profit",
  "Compliance / Audit",
  "Other",
];

const WORK_TYPE_VALUES: string[] = ["On-site", "Remote", "Hybrid"];

const COMPANY_INDUSTRY_LABELS_FR: Record<string, string> = {
  Technology: "Technologie",
  Finance: "Finance",
  Healthcare: "Santé",
  Education: "Éducation",
  Retail: "Commerce de détail",
  Hospitality: "Hôtellerie",
  "Marketing / Media": "Marketing / Médias",
  "Engineering / Construction": "Ingénierie / Construction",
  Consulting: "Conseil",
  "Not for profit": "Organisme à but non lucratif",
  "Compliance / Audit": "Conformité / Audit",
  Other: "Autre",
};


const WORK_TYPE_LABELS_FR: Record<string, string> = {
  "On-site": "Sur site",
  Remote: "Télétravail",
  Hybrid: "Hybride",
};


const companyIndustryOptions = (lang: "en" | "fr") =>
  COMPANY_INDUSTRY_VALUES.map((value) => ({
    value,
    label: lang === "fr" ? COMPANY_INDUSTRY_LABELS_FR[value] || value : value,
  }));

const workTypeOptions = (lang: "en" | "fr") =>
  WORK_TYPE_VALUES.map((value) => ({
    value,
    label: lang === "fr" ? WORK_TYPE_LABELS_FR[value] || value : value,
  }));

const formatFieldLabel = (key: string, labels: Record<string, string>) => {
  if (labels[key]) return labels[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const truncateText = (value: string, max: number) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
};

const buildLinkPreview = (url: string | null | undefined, notProvidedLabel: string) => {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) {
    return { preview: notProvidedLabel, href: "", isMissing: true };
  }

  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./i, "");
    const segments = parsed.pathname.split("/").filter(Boolean);
    const snippet = segments.slice(0, 2).join("/");
    const path = snippet ? `/${snippet}` : "";
    const suffix = segments.length > 2 ? "/..." : "";
    const preview = truncateText(`${host}${path}${suffix}`, LINK_PREVIEW_MAX);
    return { preview, href: normalized, isMissing: false };
  } catch {
    return { preview: truncateText(raw, LINK_PREVIEW_MAX), href: normalized, isMissing: false };
  }
};

type LinkRowProps = {
  icon: ReactNode;
  label: string;
  url?: string | null;
  actionLabel: string;
  onAction?: () => void;
  isLoading?: boolean;
  loadingLabel?: string;
  previewOverride?: string;
  notProvidedLabel: string;
};

const IconLink = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16" />
    <path d="M12 4c3.5 4 3.5 12 0 16" />
    <path d="M12 4c-3.5 4-3.5 12 0 16" />
  </svg>
);

const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="8" cy="9" r="1" />
    <path d="M7.5 11v5" />
    <path d="M11 16v-3.2c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8V16" />
  </svg>
);

const IconMeet = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M8 3v4M16 3v4M4 9h16" />
    <circle cx="12" cy="14" r="2" />
    <path d="M9.5 18c.7-1.2 1.7-2 2.5-2s1.8.8 2.5 2" />
  </svg>
);

function LinkRow({
  icon,
  label,
  url,
  actionLabel,
  onAction,
  isLoading,
  loadingLabel,
  previewOverride,
  notProvidedLabel,
}: LinkRowProps) {
  const { preview, href, isMissing: linkMissing } = buildLinkPreview(url, notProvidedLabel);
  const hasCustomAction = Boolean(onAction);
  const isMissing = hasCustomAction ? false : linkMissing;
  const hasAction = hasCustomAction || Boolean(href);
  const isDisabled = isMissing || !hasAction || Boolean(isLoading);
  const previewText = previewOverride ?? preview;
  const previewMuted = !previewOverride && isMissing;

  const handleAction = () => {
    if (isDisabled || !hasAction) return;
    if (onAction) {
      onAction();
      return;
    }
    if (href && typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const role = isDisabled ? undefined : onAction ? "button" : "link";

  return (
    <div
      className={`referrer-review__link-row ${isDisabled ? "is-disabled" : "is-clickable"}`}
      role={role}
      tabIndex={isDisabled ? -1 : 0}
      onClick={isDisabled ? undefined : handleAction}
      onKeyDown={
        isDisabled
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleAction();
              }
            }
      }
      aria-disabled={isDisabled || undefined}
    >
      <span className="referrer-review__link-icon">{icon}</span>
      <span className="referrer-review__link-label">{label}</span>
      <span className={`referrer-review__link-preview${previewMuted ? " is-muted" : ""}`}>
        {previewText}
      </span>
      {!isMissing ? (
        <ActionBtn
          as="button"
          variant="ghost"
          size="sm"
          className="referrer-review__link-chip"
          onClick={(event) => {
            event.stopPropagation();
            handleAction();
          }}
          disabled={isDisabled}
        >
          {isLoading ? loadingLabel ?? actionLabel : actionLabel}
        </ActionBtn>
      ) : (
        <span className="referrer-review__link-chip-spacer" aria-hidden="true" />
      )}
      <span className="referrer-review__link-chevron" aria-hidden="true">
        &gt;
      </span>
    </div>
  );
}

export default function ReferrerReviewPage() {
  const params = useParams();
  const rawId = params?.iRREF ?? params?.irref;
  const irref = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanIrref = typeof irref === "string" ? irref.trim() : "";
  const searchParams = useSearchParams();
  const initialEdit = searchParams?.get("edit") === "1";
  const { language } = useLanguage();
  const t = translations[language];

  const [referrer, setReferrer] = useState<ReferrerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [lastContactedAt, setLastContactedAt] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [status, setStatus] = useState("");
  const [editDetails, setEditDetails] = useState(initialEdit);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [portalLink, setPortalLink] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalRotateLoading, setPortalRotateLoading] = useState(false);
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingUpdateLoading, setPendingUpdateLoading] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const router = useRouter();
  const [appsLoading, setAppsLoading] = useState(false);
  const [companies, setCompanies] = useState<ReferrerCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyApprovalLoading, setCompanyApprovalLoading] = useState<string | null>(null);
  const [justApprovedCompanyIds, setJustApprovedCompanyIds] = useState<Set<string>>(new Set());
  const [editedCompanies, setEditedCompanies] = useState<Record<string, Partial<ReferrerCompany>>>({});
  const skipAutosaveRef = useRef(true);

  // Store original values when entering edit mode
  const originalDetailsRef = useRef<{
    name: string;
    email: string;
    phone: string;
    country: string;
    linkedin: string;
    companies: ReferrerCompany[];
  } | null>(null);

  // Parse pending updates from referrer
  const pendingUpdates = useMemo<PendingUpdate[]>(() => {
    if (!referrer?.pendingUpdates) return [];
    try {
      const parsed = JSON.parse(referrer.pendingUpdates);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [referrer?.pendingUpdates]);

  const pendingOnlyUpdates = useMemo(
    () => pendingUpdates.filter((u) => u.status === "pending"),
    [pendingUpdates],
  );

  const approvalValue = useMemo(() => {
    const value = (referrer?.companyApproval || "pending").toLowerCase();
    if (value === "approved" || value === "denied" || value === "pending") return value;
    return "pending";
  }, [referrer?.companyApproval]);

  const approvalLabel = useMemo(() => {
    if (approvalValue === "approved") return t.statusLabels.approved;
    if (approvalValue === "denied") return t.statusLabels.denied;
    return t.statusLabels.pending;
  }, [approvalValue, t.statusLabels]);

  const fetchReferrer = useCallback(async () => {
    if (!cleanIrref) return;
    setLoading(true);
    setNotFound(false);

    const response = await fetch(`/api/founder/referrers/${encodeURIComponent(cleanIrref)}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      setNotFound(true);
      setReferrer(null);
      setLoading(false);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (data?.ok && data.item) {
      const next = {
        ...data.item,
        companyApproval: data.item.companyApproval || "pending",
      } as ReferrerRecord;
      setReferrer(next);
    } else {
      setNotFound(true);
      setReferrer(null);
    }
    setLoading(false);
  }, [cleanIrref]);

  useEffect(() => {
    fetchReferrer();
  }, [fetchReferrer]);

  const fetchApplications = async (irrefValue: string) => {
    setAppsLoading(true);
    const params = new URLSearchParams({ referrerIrref: irrefValue, limit: "50", offset: "0" });
    const response = await fetch(`/api/founder/applications?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) setApplications(data.items ?? []);
    setAppsLoading(false);
  };

  useEffect(() => {
    if (!referrer?.irref) return;
    fetchApplications(referrer.irref);
  }, [referrer?.irref]);

  const fetchCompanies = async (irrefValue: string) => {
    setCompaniesLoading(true);
    try {
      const response = await fetch(`/api/founder/referrers/${encodeURIComponent(irrefValue)}/companies`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (data?.ok) {
        setCompanies(data.companies ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch companies", error);
    }
    setCompaniesLoading(false);
  };

  useEffect(() => {
    if (!referrer?.irref) return;
    fetchCompanies(referrer.irref);
  }, [referrer?.irref]);

  const handleCompanyApproval = async (companyId: string, approval: "approved" | "denied") => {
    setCompanyApprovalLoading(companyId);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(`/api/founder/referrer-companies/${encodeURIComponent(companyId)}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.unableToUpdateApproval);
      } else {
        // Update the companies list with the new approval status
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === companyId
              ? { ...c, companyApproval: approval, companyIrcrn: data.companyIrcrn || c.companyIrcrn }
              : c,
          ),
        );
        // Track just-approved company so we can show temporary "Approved" badge
        if (approval === "approved") {
          setJustApprovedCompanyIds((prev) => new Set(prev).add(companyId));
        }
        setActionMessage(approval === "approved" ? t.companyApproved : t.companyDenied);
      }
    } catch (error) {
      console.error("Company approval failed", error);
      setActionError(t.unableToUpdateApproval);
    } finally {
      setCompanyApprovalLoading(null);
    }
  };

  useEffect(() => {
    if (!referrer) return;
    setNotes(referrer.ownerNotes || "");
    setTags(referrer.tags || "");
    setLastContactedAt(referrer.lastContactedAt || "");
    setNextActionAt(referrer.nextActionAt || "");
    setStatus((referrer.status || "").toLowerCase());
    setName(referrer.name || "");
    setEmail(referrer.email || "");
    setPhone(referrer.phone || "");
    setCountry(referrer.country || "");
    setLinkedin(referrer.linkedin || "");
    setActionMessage(null);
    setActionError(null);
    setPortalLink("");
    setPortalMessage(null);
    setPortalError(null);
    setRejectConfirm(false);
    skipAutosaveRef.current = true;
    originalDetailsRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referrer?.irref]);

  const updateLocal = (patch: Partial<ReferrerRecord>) => {
    setReferrer((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const patchReferrer = async (patch: Record<string, string>) => {
    if (!referrer) return;
    setSaving(true);
    await fetch(`/api/founder/referrers/${encodeURIComponent(referrer.irref)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocal(patch as Partial<ReferrerRecord>);
    setSaving(false);
  };

  useEffect(() => {
    if (!referrer) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      patchReferrer({ ownerNotes: notes, tags, status, lastContactedAt, nextActionAt });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tags, status, lastContactedAt, nextActionAt, referrer?.irref]);

  const handleStartEdit = () => {
    originalDetailsRef.current = {
      name,
      email,
      phone,
      country,
      linkedin,
      companies: companies.map((c) => ({ ...c })),
    };
    setEditedCompanies({});
    setEditDetails(true);
  };

  const handleCancelEdit = () => {
    if (originalDetailsRef.current) {
      setName(originalDetailsRef.current.name);
      setEmail(originalDetailsRef.current.email);
      setPhone(originalDetailsRef.current.phone);
      setCountry(originalDetailsRef.current.country);
      setLinkedin(originalDetailsRef.current.linkedin);
      setCompanies(originalDetailsRef.current.companies);
    }
    originalDetailsRef.current = null;
    setEditedCompanies({});
    setEditDetails(false);
  };

  const handleCompanyFieldChange = (companyId: string, field: keyof ReferrerCompany, value: string) => {
    setEditedCompanies((prev) => ({
      ...prev,
      [companyId]: {
        ...prev[companyId],
        [field]: value,
      },
    }));
    // Also update the companies array for display
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === companyId ? { ...c, [field]: value } : c
      )
    );
  };

  const handleSaveEdit = async () => {
    if (!referrer) return;
    setSaving(true);

    // Save referrer profile changes
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    addIfChanged("name", name, referrer.name || "");
    addIfChanged("email", email, referrer.email || "");
    addIfChanged("phone", phone, referrer.phone || "");
    addIfChanged("country", country, referrer.country || "");
    addIfChanged("linkedin", linkedin, referrer.linkedin || "");

    if (Object.keys(patch).length) {
      await patchReferrer(patch);
    }

    // Save company changes
    const companyUpdatePromises = Object.entries(editedCompanies).map(async ([companyId, changes]) => {
      if (Object.keys(changes).length === 0) return;
      try {
        await fetch(`/api/founder/referrer-companies/${encodeURIComponent(companyId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        });
      } catch (error) {
        console.error(`Failed to update company ${companyId}`, error);
      }
    });

    await Promise.all(companyUpdatePromises);

    originalDetailsRef.current = null;
    setEditedCompanies({});
    setEditDetails(false);
    setSaving(false);
  };

  const handlePortalLink = async () => {
    if (!referrer || portalLoading) return;
    setPortalMessage(null);
    setPortalError(null);

    if (portalLink) {
      if (typeof window !== "undefined") {
        window.open(portalLink, "_blank", "noopener,noreferrer");
      }
      return;
    }

    setPortalLoading(true);
    try {
      const response = await fetch("/api/referrer/portal/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ irref: referrer.irref }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.link) {
        setPortalError(data?.error || t.unableToGeneratePortal);
        return;
      }
      setPortalLink(data.link);
      setPortalMessage(referrer.email ? t.portalLinkGeneratedEmailed : t.portalLinkGenerated);
    } catch (error) {
      console.error("Generate portal link failed", error);
      setPortalError(t.unableToGeneratePortal);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRotatePortalToken = async () => {
    if (!referrer || portalRotateLoading) return;
    setPortalMessage(null);
    setPortalError(null);
    setPortalRotateLoading(true);
    try {
      const response = await fetch(
        `/api/founder/referrers/${encodeURIComponent(referrer.irref)}/rotate-portal-token`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setPortalError(data?.error || t.unableToRotateToken);
        return;
      }
      setPortalLink("");
      setPortalMessage(t.portalTokensRotated);
    } catch (error) {
      console.error("Rotate portal token failed", error);
      setPortalError(t.unableToRotateToken);
    } finally {
      setPortalRotateLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!referrer) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/referrers/${encodeURIComponent(referrer.irref)}/invite-meeting`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.unableToSendInvite);
      } else {
        setActionMessage(t.inviteSent);
        updateLocal({ status: "meeting invited" });
        setStatus("meeting invited");
      }
    } catch (error) {
      console.error("Invite meeting failed", error);
      setActionError(t.unableToSendInvite);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproval = async (approval: "approved" | "denied") => {
    if (!referrer) return;
    setApprovalLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/referrers/${encodeURIComponent(referrer.irref)}/company-approval`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approval }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.unableToUpdateApproval);
      } else {
        updateLocal({
          companyApproval: data.approval,
          companyIrcrn: data.companyIrcrn || referrer.companyIrcrn,
        });
        // Update all pending companies to the same approval status (API auto-approves them)
        const pendingIds = companies
          .filter((c) => (c.companyApproval || "pending").toLowerCase() === "pending")
          .map((c) => c.id);
        setCompanies((prev) =>
          prev.map((c) =>
            (c.companyApproval || "pending").toLowerCase() === "pending"
              ? { ...c, companyApproval: approval }
              : c,
          ),
        );
        // Track just-approved companies so we can show temporary "Approved" badge
        if (approval === "approved" && pendingIds.length > 0) {
          setJustApprovedCompanyIds(new Set(pendingIds));
        }
        setActionMessage(approval === "approved" ? t.companyApproved : t.companyDenied);
        setRejectConfirm(false);
      }
    } catch (error) {
      console.error("Update approval failed", error);
      setActionError(t.unableToUpdateApproval);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handlePendingUpdate = async (updateId: string, action: "approve" | "deny") => {
    if (!referrer || pendingUpdateLoading) return;
    setPendingUpdateLoading(updateId);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/referrers/${encodeURIComponent(referrer.irref)}/pending-updates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updateId, action }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.unableToProcessUpdate);
      } else {
        // Refresh the referrer data to get updated pending updates
        await fetchReferrer();
        setActionMessage(action === "approve" ? t.updateApplied : t.updateDenied);
      }
    } catch (error) {
      console.error("Process pending update failed", error);
      setActionError(t.unableToProcessUpdate);
    } finally {
      setPendingUpdateLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!referrer || deleteLoading) return;
    setDeleteLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/referrers/${encodeURIComponent(referrer.irref)}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.unableToArchive);
        setDeleteConfirm(false);
      } else {
        router.push("/founder/referrers");
      }
    } catch (error) {
      console.error("Archive referrer failed", error);
      setActionError(t.unableToArchive);
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!cleanIrref) {
    return (
      <div className="founder-page">
        <Topbar title={t.page.title} subtitle={t.page.invalidSubtitle} />
        <div className="card referrer-review__empty">
          <h2>{t.page.notFoundTitle}</h2>
          <p className="field-hint">{t.page.notFoundDescription}</p>
          <ActionBtn as="link" href="/founder/referrers" variant="ghost">
            &larr; {t.buttons.backToReferrers}
          </ActionBtn>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="founder-page">
        <Topbar title={t.page.title} subtitle={cleanIrref.toUpperCase()} />
        <DetailPageShell
          main={
            <>
              <DetailSection title={t.sections.decision}>
                <SkeletonDetailGrid fields={2} />
              </DetailSection>
              <DetailSection title={t.sections.profile}>
                <SkeletonDetailGrid fields={6} />
              </DetailSection>
              <DetailSection title={t.sections.companies}>
                <SkeletonDetailGrid fields={4} />
              </DetailSection>
              <DetailSection title={t.sections.links}>
                <SkeletonDetailGrid fields={2} />
                <SkeletonStack>
                  <Skeleton variant="button" />
                  <Skeleton variant="button" />
                  <Skeleton variant="button" />
                </SkeletonStack>
              </DetailSection>
            </>
          }
          sidebar={
            <DetailSection title={t.sections.decision}>
              <SkeletonStack>
                <Skeleton variant="input" />
                <Skeleton variant="button" />
                <Skeleton variant="button" />
                <Skeleton variant="button" />
              </SkeletonStack>
            </DetailSection>
          }
        />
      </div>
    );
  }

  if (notFound || !referrer) {
    return (
      <div className="founder-page">
        <Topbar title={t.page.title} subtitle={cleanIrref.toUpperCase()} />
        <div className="card referrer-review__empty">
          <h2>{t.page.notFoundTitle}</h2>
          <p className="field-hint">{t.page.notFoundRetry}</p>
          <ActionBtn as="link" href="/founder/referrers" variant="ghost">
            &larr; {t.buttons.backToReferrers}
          </ActionBtn>
        </div>
      </div>
    );
  }

  const missingFieldsLabel = referrer.missingFields.length ? referrer.missingFields.join(", ") : t.labels.complete;

  return (
    <div className="founder-page">
      <Topbar
        title={t.page.reviewTitle(name)}
        subtitle={email || referrer.irref}
      />

      <DetailPageShell
        main={
          <>
            {pendingOnlyUpdates.length > 0 && (
              <DetailSection
                  title={
                    <span className="referrer-name-cell">
                      {t.pendingUpdates.title}
                      <span className="pending-updates-badge">
                        {pendingOnlyUpdates.length}
                      </span>
                    </span>
                  }
              >
                <div className="pending-updates-list">
                  {pendingOnlyUpdates.map((update) => (
                    <div key={update.id} className="pending-update-card">
                      <div className="pending-update-header">
                        <span className="pending-updates-badge">{t.pendingUpdates.pending}</span>
                        <span className="pending-update-timestamp">
                          {new Date(update.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="pending-update-fields">
                        {Object.entries(update.data).map(([key, newValue]) => {
                          const currentValue =
                            referrer[key as keyof ReferrerRecord] || "";
                          const hasChanged = newValue !== currentValue;
                          if (!hasChanged && !newValue) return null;
                          return (
                            <div key={key} className="pending-update-row">
                              <span className="pending-update-label">
                                {formatFieldLabel(key, t.fieldLabels)}
                              </span>
                              <span className="pending-update-value">
                                {String(currentValue) || "-"}
                              </span>
                              <span
                                className={`pending-update-value${hasChanged ? " is-changed" : ""}`}
                              >
                                {String(newValue) || "-"}
                                {hasChanged && " ✓"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pending-update-actions">
                        <ActionBtn
                          as="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handlePendingUpdate(update.id, "approve")}
                          disabled={pendingUpdateLoading === update.id}
                        >
                          {pendingUpdateLoading === update.id ? t.pendingUpdates.applying : t.pendingUpdates.approve}
                        </ActionBtn>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePendingUpdate(update.id, "deny")}
                          disabled={pendingUpdateLoading === update.id}
                        >
                          {t.pendingUpdates.deny}
                        </ActionBtn>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Multi-company support: Companies from Referrer Companies sheet */}
            {(companiesLoading || companies.length > 0) && (() => {
              const pendingCount = companies.filter(
                (c) => (c.companyApproval || "pending").toLowerCase() === "pending"
              ).length;
              return (
                <DetailSection
                  title={
                    <span className="referrer-name-cell">
                      {t.sections.companies}
                      {/* Only show action-color badge when there are individual approve/deny buttons */}
                      {pendingCount > 0 && approvalValue !== "pending" && (
                        <span className="pending-updates-badge">{pendingCount}</span>
                      )}
                    </span>
                  }
                  className="referrer-review__companies"
                >
                  {companiesLoading ? (
                    <SkeletonDetailGrid fields={3} />
                  ) : (
                    <div className="companies-list">
                      {companies.map((comp) => {
                        const isLoading = companyApprovalLoading === comp.id;
                        const isPending = (comp.companyApproval || "pending").toLowerCase() === "pending";
                        const isDenied = comp.companyApproval?.toLowerCase() === "denied";
                        const justApproved = justApprovedCompanyIds.has(comp.id);
                        return (
                          <div key={comp.id} className="company-card">
                            <div className="company-card__header">
                              {isPending ? (
                                approvalValue === "pending" ? (
                                  <Badge tone="neutral">{t.companies.pending}</Badge>
                                ) : (
                                  <span className="pending-updates-badge">{t.companies.pending}</span>
                                )
                              ) : isDenied ? (
                                <Badge tone="danger">{t.companies.denied}</Badge>
                              ) : justApproved ? (
                                <Badge tone="success">{t.companies.approved}</Badge>
                              ) : null}
                              <span className="company-card__timestamp">
                                {new Date(comp.timestamp).toLocaleString()}
                              </span>
                            </div>
                          <div className="company-card__details">
                            <div className="company-card__row">
                              <span className="company-card__label">{t.companies.company}</span>
                              {editDetails ? (
                                <input
                                  type="text"
                                  value={comp.companyName || ""}
                                  onChange={(e) => handleCompanyFieldChange(comp.id, "companyName", e.target.value)}
                                  className="company-card__input"
                                />
                              ) : (
                                <span>{comp.companyName || t.companies.unnamed}</span>
                              )}
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">{t.companies.ircrn}</span>
                              <span>{comp.companyIrcrn || "-"}</span>
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">{t.companies.industry}</span>
                              {editDetails ? (
                                <Select
                                  id={`company-industry-${comp.id}`}
                                  name={`company-industry-${comp.id}`}
                                  options={companyIndustryOptions(language)}
                                  placeholder={t.companies.select}
                                  value={comp.companyIndustry || ""}
                                  onChange={(value) => handleCompanyFieldChange(comp.id, "companyIndustry", Array.isArray(value) ? value[0] : value)}
                                />
                              ) : (
                                <span>{comp.companyIndustry || "-"}</span>
                              )}
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">{t.companies.workType}</span>
                              {editDetails ? (
                                <Select
                                  id={`company-work-type-${comp.id}`}
                                  name={`company-work-type-${comp.id}`}
                                  options={workTypeOptions(language)}
                                  placeholder={t.companies.select}
                                  value={comp.workType || ""}
                                  onChange={(value) => handleCompanyFieldChange(comp.id, "workType", Array.isArray(value) ? value[0] : value)}
                                />
                              ) : (
                                <span>{comp.workType || "-"}</span>
                              )}
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">{t.companies.careersPortal}</span>
                              {editDetails ? (
                                <input
                                  type="url"
                                  value={comp.careersPortal || ""}
                                  onChange={(e) => handleCompanyFieldChange(comp.id, "careersPortal", e.target.value)}
                                  className="company-card__input"
                                  placeholder={t.placeholders.careersPortal}
                                />
                              ) : comp.careersPortal ? (
                                <a href={comp.careersPortal} target="_blank" rel="noopener noreferrer" className="company-card__link">
                                  {truncateText(comp.careersPortal, 40)}
                                </a>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </div>
                          {/* Only show individual approve/deny buttons for returning referrers (already approved/denied) */}
                          {isPending && approvalValue !== "pending" && !editDetails && (
                            <div className="company-card__actions">
                                <ActionBtn
                                  as="button"
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleCompanyApproval(comp.id, "approved")}
                                  disabled={isLoading}
                                >
                                  {t.buttons.approve}{isLoading && "..."}
                                </ActionBtn>
                                <ActionBtn
                                  as="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCompanyApproval(comp.id, "denied")}
                                  disabled={isLoading}
                                >
                                  {t.pendingUpdates.deny}{isLoading && "..."}
                                </ActionBtn>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  )}
                </DetailSection>
              );
            })()}

            <DetailSection title={t.sections.admin}>
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="referrer-status">{t.labels.status}</label>
                  <Select
                    id="referrer-status"
                    name="referrer-status"
                    options={statusOptions
                      .filter((opt) => opt)
                      .map((opt) => ({
                        value: opt.toLowerCase(),
                        label: t.statusOptions[opt.toLowerCase() as keyof typeof t.statusOptions] || opt,
                      }))}
                    placeholder={t.labels.unassigned}
                    value={status}
                    onChange={(value) => setStatus(Array.isArray(value) ? value[0] : value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="referrer-type">{t.labels.referrerType}</label>
                  <input
                    id="referrer-type"
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder={t.placeholders.referrerType}
                  />
                </div>
                <div className="field">
                  <label htmlFor="referrer-last-contacted">{t.labels.lastContacted}</label>
                  <input
                    id="referrer-last-contacted"
                    type="text"
                    value={lastContactedAt}
                    onChange={(event) => setLastContactedAt(event.target.value)}
                    placeholder={t.placeholders.lastContacted}
                  />
                </div>
                <div className="field">
                  <label htmlFor="referrer-next-action">{t.labels.nextFollowUp}</label>
                  <input
                    id="referrer-next-action"
                    type="text"
                    value={nextActionAt}
                    onChange={(event) => setNextActionAt(event.target.value)}
                    placeholder={t.placeholders.nextFollowUp}
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: "var(--gap)" }}>
                <label htmlFor="referrer-notes">{t.labels.internalNotes}</label>
                <textarea
                  id="referrer-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t.placeholders.notes}
                />
              </div>
            </DetailSection>

            <DetailSection title={t.sections.profile}>
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="profile-name">{t.labels.name}</label>
                  {editDetails ? (
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  ) : (
                    <input
                      id="profile-name"
                      type="text"
                      value={name || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="profile-email">{t.labels.email}</label>
                  {editDetails ? (
                    <input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  ) : (
                    <input
                      id="profile-email"
                      type="text"
                      value={email || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="profile-phone">{t.labels.phone}</label>
                  {editDetails ? (
                    <input
                      id="profile-phone"
                      type="text"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  ) : (
                    <input
                      id="profile-phone"
                      type="text"
                      value={phone || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="profile-country">{t.labels.country}</label>
                  {editDetails ? (
                    <Select
                      id="profile-country"
                      name="profile-country"
                      options={countryOptions()}
                      placeholder={t.placeholders.select}
                      value={country}
                      onChange={(value) => setCountry(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="profile-country"
                      type="text"
                      value={country || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="profile-irref">{t.labels.referrerId}</label>
                  <input id="profile-irref" type="text" value={referrer.irref || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="profile-missing">{t.labels.missingFields}</label>
                  <input id="profile-missing" type="text" value={missingFieldsLabel} readOnly tabIndex={-1} />
                </div>
              </div>
            </DetailSection>


            <DetailSection title={t.sections.links}>
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="link-linkedin">{t.labels.linkedin}</label>
                  {editDetails ? (
                    <input
                      id="link-linkedin"
                      type="url"
                      value={linkedin}
                      onChange={(event) => setLinkedin(event.target.value)}
                    />
                  ) : (
                    <input
                      id="link-linkedin"
                      type="text"
                      value={linkedin || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
              </div>
              <div className="referrer-review__link-list">
                <LinkRow
                  icon={<IconLinkedIn />}
                  label={t.links.linkedin}
                  url={linkedin}
                  actionLabel={t.links.view}
                  notProvidedLabel={t.links.notProvided}
                />
                <LinkRow
                  icon={<IconLink />}
                  label={t.links.referrerPortal}
                  url={portalLink}
                  actionLabel={portalLink ? t.links.open : t.links.generate}
                  onAction={handlePortalLink}
                  isLoading={portalLoading}
                  loadingLabel={t.links.generating}
                  previewOverride={portalLink ? undefined : t.links.generateHint}
                  notProvidedLabel={t.links.notProvided}
                />
                <LinkRow
                  icon={<IconLink />}
                  label={t.links.rotateToken}
                  actionLabel={t.links.rotate}
                  onAction={handleRotatePortalToken}
                  isLoading={portalRotateLoading}
                  loadingLabel={t.links.rotating}
                  previewOverride={t.links.rotateHint}
                  notProvidedLabel={t.links.notProvided}
                />
                <LinkRow
                  icon={<IconMeet />}
                  label={t.links.meetFounder}
                  actionLabel={t.links.invite}
                  onAction={handleInvite}
                  isLoading={actionLoading}
                  loadingLabel={t.links.sendingInvite}
                  previewOverride={actionLoading ? t.links.sendingInvite : t.links.sendInviteEmail}
                  notProvidedLabel={t.links.notProvided}
                />
              </div>
              {portalMessage ? (
                <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                  {portalMessage}
                </div>
              ) : null}
              {portalError ? (
                <div className="status-banner status-banner--error" role="alert">
                  {portalError}
                </div>
              ) : null}
            </DetailSection>
          </>
        }
        sidebar={
          <>
            <DetailSection title={t.sections.decision} className="referrer-review__decision">
              <div className="field">
                <label htmlFor="decision-status">{t.labels.currentStatus}</label>
                <input
                  id="decision-status"
                  type="text"
                  value={approvalLabel}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
              <div className="flow-stack">
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
                {approvalValue === "pending" && (
                  <>
                    <ActionBtn
                      as="button"
                      variant="primary"
                      onClick={() => handleApproval("approved")}
                      disabled={!referrer || approvalLoading}
                    >
                      {approvalLoading ? t.buttons.updating : t.buttons.approve}
                    </ActionBtn>
                    {rejectConfirm ? (
                      <>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={() => handleApproval("denied")}
                          disabled={!referrer || approvalLoading}
                        >
                          {approvalLoading ? t.buttons.updating : t.buttons.confirmReject}
                        </ActionBtn>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={() => setRejectConfirm(false)}
                          disabled={approvalLoading}
                        >
                          {t.buttons.cancel}
                        </ActionBtn>
                      </>
                    ) : (
                      <ActionBtn
                        as="button"
                        variant="ghost"
                        onClick={() => setRejectConfirm(true)}
                        disabled={!referrer || approvalLoading}
                      >
                        {t.buttons.reject}
                      </ActionBtn>
                    )}
                  </>
                )}
                {!editDetails && approvalValue !== "pending" && (
                  <>
                    {deleteConfirm ? (
                      <>
                        <div className="status-banner status-banner--warning" role="alert" style={{ marginBottom: "8px" }}>
                          {t.banners.archiveWarning}
                        </div>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={handleDelete}
                          disabled={!referrer || deleteLoading}
                          className="action-btn--danger"
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
                        disabled={!referrer || deleteLoading}
                      >
                        {t.buttons.archiveReferrer}
                      </ActionBtn>
                    )}
                  </>
                )}
              </div>
              <div>
                <AutosaveHint saving={saving} />
                {actionMessage ? (
                  <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                    {actionMessage}
                  </div>
                ) : null}
                {actionError ? (
                  <div className="status-banner status-banner--error" role="alert">
                    {actionError}
                  </div>
                ) : null}
              </div>
              <ActionBtn as="link" href="/founder/referrers" variant="ghost">
                &larr; {t.buttons.backToReferrers}
              </ActionBtn>
            </DetailSection>

            <DetailSection title={t.sections.applications}>
              {appsLoading ? (
                <SkeletonStack>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </SkeletonStack>
              ) : applications.length === 0 ? (
                <p className="founder-card__meta">{t.applications.none}</p>
              ) : (
                <ul className="founder-list">
                  {applications.map((app) => (
                    <li key={app.id}>
                      <Link href={`/founder/applications/${app.id}`} className="founder-list__link">
                        <div className="founder-list__title">
                          {app.position || t.applications.application} <Badge tone="neutral">{app.iCrn}</Badge>
                        </div>
                        <div className="founder-list__meta">
                          {app.id} - {app.status || t.applications.unassigned}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </>
        }
      />
    </div>
  );
}
