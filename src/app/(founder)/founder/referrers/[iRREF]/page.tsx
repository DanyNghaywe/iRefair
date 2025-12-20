"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

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

export default function ReferrerReviewPage() {
  const params = useParams();
  const rawId = params?.iRREF ?? params?.irref;
  const irref = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanIrref = typeof irref === "string" ? irref.trim() : "";

  const [referrer, setReferrer] = useState<ReferrerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const skipAutosaveRef = useRef(true);

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
    setActionMessage(null);
    setActionError(null);
    setRejectConfirm(false);
    skipAutosaveRef.current = true;
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
        title={referrer.name ? `${referrer.name} - Review` : "Referrer Review"}
        subtitle={referrer.email || referrer.irref}
      />

      <div className="referrer-review">
        <div className="referrer-review__main">
          <section className="card">
            <p className="hiring-table-title">Status + Approval</p>
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
            <p className="hiring-table-title">Profile</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="profile-phone">Phone</label>
                <input id="profile-phone" type="text" value={referrer.phone || "-"} readOnly tabIndex={-1} />
              </div>
              <div className="field">
                <label htmlFor="profile-country">Country</label>
                <input id="profile-country" type="text" value={referrer.country || "-"} readOnly tabIndex={-1} />
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
            <p className="hiring-table-title">Company</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="company-name">Company</label>
                <input id="company-name" type="text" value={referrer.company || "-"} readOnly tabIndex={-1} />
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
                  value={referrer.companyIndustry || "-"}
                  readOnly
                  tabIndex={-1}
                />
              </div>
              <div className="field">
                <label htmlFor="company-work-type">Work Type</label>
                <input id="company-work-type" type="text" value={referrer.workType || "-"} readOnly tabIndex={-1} />
              </div>
            </div>
          </section>

          <section className="card">
            <p className="hiring-table-title">Links</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="careers-portal">Careers Portal</label>
                <input
                  id="careers-portal"
                  type="text"
                  value={referrer.careersPortal || "Not provided"}
                  readOnly
                  tabIndex={-1}
                />
                <ActionBtn
                  as="link"
                  variant="ghost"
                  size="sm"
                  href={referrer.careersPortal || "#"}
                  target="_blank"
                  rel="noreferrer"
                  disabled={!referrer.careersPortal}
                >
                  Open
                </ActionBtn>
              </div>
              <div className="field">
                <label htmlFor="linkedin">LinkedIn</label>
                <input
                  id="linkedin"
                  type="text"
                  value={referrer.linkedin || "Not provided"}
                  readOnly
                  tabIndex={-1}
                />
                <ActionBtn
                  as="link"
                  variant="ghost"
                  size="sm"
                  href={referrer.linkedin || "#"}
                  target="_blank"
                  rel="noreferrer"
                  disabled={!referrer.linkedin}
                >
                  View
                </ActionBtn>
              </div>
              <div className="field field-full">
                <label>Meet Founder</label>
                <ActionBtn
                  as="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleInvite}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Sending..." : "Invite to Meet Founder"}
                </ActionBtn>
              </div>
            </div>
          </section>

          <section className="card">
            <p className="hiring-table-title">Notes + Tags</p>
            <div className="field-grid field-grid--two">
              <div className="field">
                <label htmlFor="referrer-notes">Owner Notes</label>
                <textarea
                  id="referrer-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context, fit, expectations..."
                />
              </div>
              <div className="field">
                <label htmlFor="referrer-tags">Tags</label>
                <input
                  id="referrer-tags"
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="Comma separated tags"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="referrer-review__sidebar">
          <section className="card referrer-review__decision">
            <p className="hiring-table-title">Decision</p>
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
