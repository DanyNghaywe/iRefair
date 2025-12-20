"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { Topbar } from "@/components/founder/Topbar";

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
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  missingFields: string[];
};

const statusOptions = ["", "New", "Engaged", "Active", "Paused", "Closed"];
const LINK_PREVIEW_MAX = 42;

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

function LinkRow({ icon, label, url, actionLabel, onAction, isLoading, previewOverride }: LinkRowProps) {
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
          {isLoading ? "Sending..." : actionLabel}
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

  const [referrer, setReferrer] = useState<ReferrerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
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
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const skipAutosaveRef = useRef(true);
  const skipDetailsAutosaveRef = useRef(true);

  const approvalValue = useMemo(() => {
    const value = (referrer?.companyApproval || "approved").toLowerCase();
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
        companyApproval: data.item.companyApproval || "approved",
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

  useEffect(() => {
    if (!referrer) return;
    setNotes(referrer.ownerNotes || "");
    setTags(referrer.tags || "");
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
    setRejectConfirm(false);
    skipAutosaveRef.current = true;
    skipDetailsAutosaveRef.current = true;
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
      patchReferrer({ ownerNotes: notes, tags, status });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tags, status, referrer?.irref]);

  useEffect(() => {
    if (!referrer) return;
    if (skipDetailsAutosaveRef.current) {
      skipDetailsAutosaveRef.current = false;
      return;
    }
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

    if (!Object.keys(patch).length) return;

    const timer = setTimeout(() => {
      patchReferrer(patch);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    email,
    phone,
    country,
    company,
    companyIndustry,
    careersPortal,
    workType,
    linkedin,
    referrer?.irref,
  ]);

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
        setActionError(data?.error || "Unable to send invite.");
      } else {
        setActionMessage("Invite sent.");
        updateLocal({ status: "meeting invited" });
        setStatus("meeting invited");
      }
    } catch (error) {
      console.error("Invite meeting failed", error);
      setActionError("Unable to send invite.");
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
        setActionError(data?.error || "Unable to update approval.");
      } else {
        updateLocal({
          companyApproval: data.approval,
          companyIrcrn: data.companyIrcrn || referrer.companyIrcrn,
        });
        setActionMessage(approval === "approved" ? "Company approved." : "Company denied.");
        setRejectConfirm(false);
      }
    } catch (error) {
      console.error("Update approval failed", error);
      setActionError("Unable to update approval.");
    } finally {
      setApprovalLoading(false);
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
        <div className="card">
          <p className="field-hint">Loading referrer details...</p>
        </div>
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

      <div className="referrer-review">
        <div className="referrer-review__main">
          <section className="card">
            <p className="referrer-review__section-title">Status + Approval</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="referrer-status">Status</label>
                <select
                  id="referrer-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
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
                <label htmlFor="company-approval">Company Approval</label>
                <input
                  id="company-approval"
                  type="text"
                  value={approvalLabel}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
            </div>
          </section>

          <section className="card">
            <p className="referrer-review__section-title">Profile</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={editDetails ? name : name || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={editDetails ? email : email || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  type="text"
                  value={editDetails ? phone : phone || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-country">Country</label>
                <input
                  id="profile-country"
                  type="text"
                  value={editDetails ? country : country || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setCountry(event.target.value)}
                />
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
          </section>

          <section className="card">
            <p className="referrer-review__section-title">Company</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="company-name">Company</label>
                <input
                  id="company-name"
                  type="text"
                  value={editDetails ? company : company || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setCompany(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="company-ircrn">Company iRCRN</label>
                <input id="company-ircrn" type="text" value={referrer.companyIrcrn || "-"} readOnly tabIndex={-1} />
              </div>
              <div className="field">
                <label htmlFor="company-industry">Industry</label>
                <input
                  id="company-industry"
                  type="text"
                  value={editDetails ? companyIndustry : companyIndustry || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setCompanyIndustry(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="company-work-type">Work Type</label>
                <input
                  id="company-work-type"
                  type="text"
                  value={editDetails ? workType : workType || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setWorkType(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <p className="referrer-review__section-title">Links</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="link-careers">Careers Portal</label>
                <input
                  id="link-careers"
                  type="url"
                  value={editDetails ? careersPortal : careersPortal || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setCareersPortal(event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="link-linkedin">LinkedIn</label>
                <input
                  id="link-linkedin"
                  type="url"
                  value={editDetails ? linkedin : linkedin || "-"}
                  readOnly={!editDetails}
                  tabIndex={editDetails ? 0 : -1}
                  onChange={(event) => setLinkedin(event.target.value)}
                />
              </div>
            </div>
            <div className="referrer-review__link-list">
              <LinkRow icon={<IconLink />} label="Careers Portal" url={careersPortal} actionLabel="Open" />
              <LinkRow icon={<IconLinkedIn />} label="LinkedIn" url={linkedin} actionLabel="View" />
              <LinkRow
                icon={<IconMeet />}
                label="Meet Founder"
                actionLabel="Invite"
                onAction={handleInvite}
                isLoading={actionLoading}
                previewOverride={actionLoading ? "Sending invite..." : "Send invite email"}
              />
            </div>
          </section>

        </div>

        <aside className="referrer-review__sidebar">
          <section className="card referrer-review__decision">
            <p className="referrer-review__section-title">Decision</p>
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
              <ActionBtn as="button" variant="ghost" onClick={() => setEditDetails((prev) => !prev)}>
                {editDetails ? "Done editing" : "Edit details"}
              </ActionBtn>
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
            </div>
            <div>
              {saving ? <p className="field-hint">Saving...</p> : null}
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
          </section>
        </aside>
      </div>
    </div>
  );
}
