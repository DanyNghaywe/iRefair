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
  },
  fr: {
    inviteSent: "Invitation envoy\u00e9e.",
    unableToSendInvite: "Impossible d'envoyer l'invitation.",
    companyApproved: "Entreprise approuv\u00e9e.",
    companyDenied: "Entreprise refus\u00e9e.",
    unableToUpdateApproval: "Impossible de mettre \u00e0 jour l'approbation.",
    updateApplied: "Mise \u00e0 jour appliqu\u00e9e avec succ\u00e8s.",
    updateDenied: "Mise \u00e0 jour refus\u00e9e.",
    unableToProcessUpdate: "Impossible de traiter la mise \u00e0 jour.",
    unableToArchive: "Impossible d'archiver le r\u00e9f\u00e9rent.",
    portalLinkGenerated: "Lien du portail g\u00e9n\u00e9r\u00e9.",
    portalLinkGeneratedEmailed: "Lien du portail g\u00e9n\u00e9r\u00e9 et envoy\u00e9 par courriel.",
    unableToGeneratePortal: "Impossible de g\u00e9n\u00e9rer le lien du portail.",
    portalTokensRotated: "Jetons du portail r\u00e9initialis\u00e9s. G\u00e9n\u00e9rez un nouveau lien \u00e0 partager.",
    unableToRotateToken: "Impossible de r\u00e9initialiser le jeton du portail.",
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

const COMPANY_INDUSTRY_OPTIONS: string[] = [
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

const WORK_TYPE_OPTIONS: string[] = ["On-site", "Remote", "Hybrid"];

const fieldLabelMap: Record<string, string> = {
  companyIndustry: "Industry",
  careersPortal: "Careers Portal",
  workType: "Work Type",
};

const formatFieldLabel = (key: string) => {
  if (fieldLabelMap[key]) return fieldLabelMap[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const truncateText = (value: string, max: number) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
};

const buildLinkPreview = (url?: string | null) => {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) {
    return { preview: "Not provided", href: "", isMissing: true };
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
}: LinkRowProps) {
  const { preview, href, isMissing: linkMissing } = buildLinkPreview(url);
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
          {isLoading ? loadingLabel || "Sending..." : actionLabel}
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
  const [company, setCompany] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [careersPortal, setCareersPortal] = useState("");
  const [workType, setWorkType] = useState("");
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
  const skipAutosaveRef = useRef(true);

  // Store original values when entering edit mode
  const originalDetailsRef = useRef<{
    name: string;
    email: string;
    phone: string;
    country: string;
    company: string;
    companyIndustry: string;
    careersPortal: string;
    workType: string;
    linkedin: string;
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
    if (approvalValue === "approved") return "Approved";
    if (approvalValue === "denied") return "Rejected";
    return "Pending";
  }, [approvalValue]);

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
    setCompany(referrer.company || "");
    setCompanyIndustry(referrer.companyIndustry || "");
    setCareersPortal(referrer.careersPortal || "");
    setWorkType(referrer.workType || "");
    setLinkedin(referrer.linkedin || "");
    setActionMessage(null);
    setActionError(null);
    setPortalLink("");
    setPortalMessage(null);
    setPortalError(null);
    setRejectConfirm(false);
    skipAutosaveRef.current = true;
    originalDetailsRef.current = null;
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
      company,
      companyIndustry,
      careersPortal,
      workType,
      linkedin,
    };
    setEditDetails(true);
  };

  const handleCancelEdit = () => {
    if (originalDetailsRef.current) {
      setName(originalDetailsRef.current.name);
      setEmail(originalDetailsRef.current.email);
      setPhone(originalDetailsRef.current.phone);
      setCountry(originalDetailsRef.current.country);
      setCompany(originalDetailsRef.current.company);
      setCompanyIndustry(originalDetailsRef.current.companyIndustry);
      setCareersPortal(originalDetailsRef.current.careersPortal);
      setWorkType(originalDetailsRef.current.workType);
      setLinkedin(originalDetailsRef.current.linkedin);
    }
    originalDetailsRef.current = null;
    setEditDetails(false);
  };

  const handleSaveEdit = async () => {
    if (!referrer) return;
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    addIfChanged("name", name, referrer.name || "");
    addIfChanged("email", email, referrer.email || "");
    addIfChanged("phone", phone, referrer.phone || "");
    addIfChanged("country", country, referrer.country || "");
    addIfChanged("company", company, referrer.company || "");
    addIfChanged("companyIndustry", companyIndustry, referrer.companyIndustry || "");
    addIfChanged("careersPortal", careersPortal, referrer.careersPortal || "");
    addIfChanged("workType", workType, referrer.workType || "");
    addIfChanged("linkedin", linkedin, referrer.linkedin || "");

    if (Object.keys(patch).length) {
      await patchReferrer(patch);
    }
    originalDetailsRef.current = null;
    setEditDetails(false);
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
        <Topbar title="Referrer Review" subtitle="Invalid referrer ID" />
        <div className="card referrer-review__empty">
          <h2>Referrer not found</h2>
          <p className="field-hint">This referrer ID is missing or invalid.</p>
          <ActionBtn as="link" href="/founder/referrers" variant="ghost">
            &larr; Back to Referrers
          </ActionBtn>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="founder-page">
        <Topbar title="Referrer Review" subtitle={cleanIrref.toUpperCase()} />
        <DetailPageShell
          main={
            <>
              <DetailSection title="Status + Approval">
                <SkeletonDetailGrid fields={2} />
              </DetailSection>
              <DetailSection title="Profile">
                <SkeletonDetailGrid fields={6} />
              </DetailSection>
              <DetailSection title="Company">
                <SkeletonDetailGrid fields={4} />
              </DetailSection>
              <DetailSection title="Links">
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
            <DetailSection title="Decision">
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
        <Topbar title="Referrer Review" subtitle={cleanIrref.toUpperCase()} />
        <div className="card referrer-review__empty">
          <h2>Referrer not found</h2>
          <p className="field-hint">Double-check the iRREF and try again.</p>
          <ActionBtn as="link" href="/founder/referrers" variant="ghost">
            &larr; Back to Referrers
          </ActionBtn>
        </div>
      </div>
    );
  }

  const missingFieldsLabel = referrer.missingFields.length ? referrer.missingFields.join(", ") : "Complete";

  return (
    <div className="founder-page">
      <Topbar
        title={name ? `${name} - Review` : "Referrer Review"}
        subtitle={email || referrer.irref}
      />

      <DetailPageShell
        main={
          <>
            {pendingOnlyUpdates.length > 0 && (
              <DetailSection
                title={
                  <span className="referrer-name-cell">
                    Pending Updates
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
                        <span className="pending-updates-badge">Pending</span>
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
                                {formatFieldLabel(key)}
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
                          {pendingUpdateLoading === update.id ? "Applying..." : "Approve"}
                        </ActionBtn>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePendingUpdate(update.id, "deny")}
                          disabled={pendingUpdateLoading === update.id}
                        >
                          Deny
                        </ActionBtn>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

            {/* Multi-company support: Companies from Referrer Companies sheet */}
            {companies.length > 0 && (() => {
              const pendingCount = companies.filter(
                (c) => (c.companyApproval || "pending").toLowerCase() === "pending"
              ).length;
              return (
                <DetailSection
                  title={
                    <span className="referrer-name-cell">
                      Companies
                      {pendingCount > 0 && (
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
                        const isApproved = comp.companyApproval?.toLowerCase() === "approved";
                        const isDenied = comp.companyApproval?.toLowerCase() === "denied";
                        return (
                          <div key={comp.id} className="company-card">
                            <div className="company-card__header">
                              {isPending ? (
                                <span className="pending-updates-badge">Pending</span>
                              ) : (
                                <Badge tone={isApproved ? "success" : "danger"}>
                                  {isApproved ? "Approved" : "Denied"}
                                </Badge>
                              )}
                              <span className="company-card__timestamp">
                                {new Date(comp.timestamp).toLocaleString()}
                              </span>
                            </div>
                          <div className="company-card__details">
                            <div className="company-card__row">
                              <span className="company-card__label">Company</span>
                              <span>{comp.companyName || "Unnamed"}</span>
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">iRCRN</span>
                              <span>{comp.companyIrcrn || "-"}</span>
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">Industry</span>
                              <span>{comp.companyIndustry || "-"}</span>
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">Work Type</span>
                              <span>{comp.workType || "-"}</span>
                            </div>
                            <div className="company-card__row">
                              <span className="company-card__label">Careers Portal</span>
                              {comp.careersPortal ? (
                                <a href={comp.careersPortal} target="_blank" rel="noopener noreferrer">
                                  {truncateText(comp.careersPortal, 40)}
                                </a>
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </div>
                          {isPending && (
                            <div className="company-card__actions">
                              <ActionBtn
                                as="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleCompanyApproval(comp.id, "approved")}
                                disabled={isLoading}
                              >
                                {isLoading ? "..." : "Approve"}
                              </ActionBtn>
                              <ActionBtn
                                as="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompanyApproval(comp.id, "denied")}
                                disabled={isLoading}
                              >
                                {isLoading ? "..." : "Deny"}
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

            <DetailSection title="Admin">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="referrer-status">Status</label>
                  <Select
                    id="referrer-status"
                    name="referrer-status"
                    options={statusOptions
                      .filter((opt) => opt)
                      .map((opt) => ({ value: opt.toLowerCase(), label: opt }))}
                    placeholder="Unassigned"
                    value={status}
                    onChange={(value) => setStatus(Array.isArray(value) ? value[0] : value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="referrer-type">Referrer Type</label>
                  <input
                    id="referrer-type"
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="e.g. HR Manager, Recruiter, Agency"
                  />
                </div>
                <div className="field">
                  <label htmlFor="referrer-last-contacted">Last Contact Date</label>
                  <input
                    id="referrer-last-contacted"
                    type="text"
                    value={lastContactedAt}
                    onChange={(event) => setLastContactedAt(event.target.value)}
                    placeholder="e.g. 2025-01-15"
                  />
                </div>
                <div className="field">
                  <label htmlFor="referrer-next-action">Next Follow-up</label>
                  <input
                    id="referrer-next-action"
                    type="text"
                    value={nextActionAt}
                    onChange={(event) => setNextActionAt(event.target.value)}
                    placeholder="e.g. 2025-01-20 or Call Monday"
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: "var(--gap)" }}>
                <label htmlFor="referrer-notes">Internal Notes</label>
                <textarea
                  id="referrer-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add notes about this referrer..."
                />
              </div>
            </DetailSection>

            <DetailSection title="Profile">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="profile-name">Name</label>
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
                  <label htmlFor="profile-email">Email</label>
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
                  <label htmlFor="profile-phone">Phone</label>
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
                  <label htmlFor="profile-country">Country</label>
                  {editDetails ? (
                    <Select
                      id="profile-country"
                      name="profile-country"
                      options={countryOptions()}
                      placeholder="Select"
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
                  <label htmlFor="profile-irref">Referrer iRREF</label>
                  <input id="profile-irref" type="text" value={referrer.irref || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="profile-missing">Missing Fields</label>
                  <input id="profile-missing" type="text" value={missingFieldsLabel} readOnly tabIndex={-1} />
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Company">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="company-name">Company</label>
                  {editDetails ? (
                    <input
                      id="company-name"
                      type="text"
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                    />
                  ) : (
                    <input
                      id="company-name"
                      type="text"
                      value={company || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="company-ircrn">Company iRCRN</label>
                  <input id="company-ircrn" type="text" value={referrer.companyIrcrn || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="company-industry">Industry</label>
                  {editDetails ? (
                    <Select
                      id="company-industry"
                      name="company-industry"
                      options={COMPANY_INDUSTRY_OPTIONS}
                      placeholder="Select"
                      value={companyIndustry}
                      onChange={(value) => setCompanyIndustry(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="company-industry"
                      type="text"
                      value={companyIndustry || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="company-work-type">Work Type</label>
                  {editDetails ? (
                    <Select
                      id="company-work-type"
                      name="company-work-type"
                      options={WORK_TYPE_OPTIONS}
                      placeholder="Select"
                      value={workType}
                      onChange={(value) => setWorkType(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="company-work-type"
                      type="text"
                      value={workType || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Links">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="link-careers">Careers Portal</label>
                  {editDetails ? (
                    <input
                      id="link-careers"
                      type="url"
                      value={careersPortal}
                      onChange={(event) => setCareersPortal(event.target.value)}
                    />
                  ) : (
                    <input
                      id="link-careers"
                      type="text"
                      value={careersPortal || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="link-linkedin">LinkedIn</label>
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
                <LinkRow icon={<IconLink />} label="Careers Portal" url={careersPortal} actionLabel="Open" />
                <LinkRow icon={<IconLinkedIn />} label="LinkedIn" url={linkedin} actionLabel="View" />
                <LinkRow
                  icon={<IconLink />}
                  label="Referrer Portal"
                  url={portalLink}
                  actionLabel={portalLink ? "Open" : "Generate"}
                  onAction={handlePortalLink}
                  isLoading={portalLoading}
                  loadingLabel="Generating..."
                  previewOverride={portalLink ? undefined : "Generate a portal link for this referrer"}
                />
                <LinkRow
                  icon={<IconLink />}
                  label="Rotate Portal Token"
                  actionLabel="Rotate"
                  onAction={handleRotatePortalToken}
                  isLoading={portalRotateLoading}
                  loadingLabel="Rotating..."
                  previewOverride="Invalidate existing portal tokens"
                />
                <LinkRow
                  icon={<IconMeet />}
                  label="Meet Founder"
                  actionLabel="Invite"
                  onAction={handleInvite}
                  isLoading={actionLoading}
                  previewOverride={actionLoading ? "Sending invite..." : "Send invite email"}
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
            <DetailSection title="Decision" className="referrer-review__decision">
              <div className="field">
                <label htmlFor="decision-status">Current status</label>
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
                      {saving ? "Saving..." : "Save"}
                    </ActionBtn>
                    <ActionBtn as="button" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
                      Cancel
                    </ActionBtn>
                  </>
                ) : (
                  <ActionBtn as="button" variant="ghost" onClick={handleStartEdit}>
                    Edit details
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
                      {approvalLoading ? "Updating..." : "Approve"}
                    </ActionBtn>
                    {rejectConfirm ? (
                      <>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={() => handleApproval("denied")}
                          disabled={!referrer || approvalLoading}
                        >
                          {approvalLoading ? "Updating..." : "Confirm reject"}
                        </ActionBtn>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={() => setRejectConfirm(false)}
                          disabled={approvalLoading}
                        >
                          Cancel
                        </ActionBtn>
                      </>
                    ) : (
                      <ActionBtn
                        as="button"
                        variant="ghost"
                        onClick={() => setRejectConfirm(true)}
                        disabled={!referrer || approvalLoading}
                      >
                        Reject
                      </ActionBtn>
                    )}
                  </>
                )}
                {approvalValue !== "pending" && (
                  <>
                    {deleteConfirm ? (
                      <>
                        <div className="status-banner status-banner--warning" role="alert" style={{ marginBottom: "8px" }}>
                          This will also archive all related applications.
                        </div>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={handleDelete}
                          disabled={!referrer || deleteLoading}
                          className="action-btn--danger"
                        >
                          {deleteLoading ? "Archiving..." : "Confirm archive"}
                        </ActionBtn>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(false)}
                          disabled={deleteLoading}
                        >
                          Cancel
                        </ActionBtn>
                      </>
                    ) : (
                      <ActionBtn
                        as="button"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(true)}
                        disabled={!referrer || deleteLoading}
                      >
                        Archive referrer
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
                &larr; Back to Referrers
              </ActionBtn>
            </DetailSection>

            <DetailSection title="Applications">
              {appsLoading ? (
                <SkeletonStack>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </SkeletonStack>
              ) : applications.length === 0 ? (
                <p className="founder-card__meta">No applications yet.</p>
              ) : (
                <ul className="founder-list">
                  {applications.map((app) => (
                    <li key={app.id}>
                      <Link href={`/founder/applications/${app.id}`} className="founder-list__link">
                        <div className="founder-list__title">
                          {app.position || "Application"} <Badge tone="neutral">{app.iCrn}</Badge>
                        </div>
                        <div className="founder-list__meta">
                          {app.id} - {app.status || "Unassigned"}
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
