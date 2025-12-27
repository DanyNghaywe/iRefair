"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { CenteredModal } from "@/components/CenteredModal";
import { EmptyState } from "@/components/founder/EmptyState";
import { Skeleton, SkeletonPortalRows, SkeletonStack } from "@/components/founder/Skeleton";
import { useToast } from "@/components/Toast";

type PortalItem = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
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
  label: string;
  enabledStatuses?: string[];
  disabledStatuses?: string[];
};

const STATUS_LABELS: Record<string, { label: string; variant: "info" | "success" | "warning" | "error" | "neutral" }> = {
  new: { label: "New", variant: "info" },
  "meeting requested": { label: "Meeting Requested", variant: "info" },
  "meeting scheduled": { label: "Meeting Scheduled", variant: "success" },
  "needs reschedule": { label: "Needs Reschedule", variant: "warning" },
  interviewed: { label: "Interviewed", variant: "success" },
  hired: { label: "Hired", variant: "success" },
  "not a good fit": { label: "Not a Good Fit", variant: "error" },
  "cv mismatch": { label: "CV Mismatch", variant: "warning" },
  "cv update requested": { label: "CV Update Requested", variant: "warning" },
  "info requested": { label: "Info Requested", variant: "warning" },
};

const ACTIONS: ActionConfig[] = [
  { code: "SCHEDULE_MEETING", label: "Schedule Meeting" },
  { code: "CANCEL_MEETING", label: "Cancel Meeting", enabledStatuses: ["meeting scheduled"] },
  { code: "REJECT", label: "Not a Good Fit", disabledStatuses: ["hired"] },
  { code: "CV_MISMATCH", label: "CV Doesn't Match", disabledStatuses: ["hired"] },
  { code: "REQUEST_CV_UPDATE", label: "Request CV Update", disabledStatuses: ["hired"] },
  { code: "REQUEST_INFO", label: "Missing Information", disabledStatuses: ["hired"] },
  { code: "MARK_INTERVIEWED", label: "Mark as Interviewed", enabledStatuses: ["meeting scheduled", "meeting requested"] },
  { code: "OFFER_JOB", label: "Offer Job", enabledStatuses: ["interviewed"] },
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

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase().trim() || "new";
  const config = STATUS_LABELS[normalized] || { label: status || "New", variant: "neutral" as const };
  return <span className={`portal-badge portal-badge--${config.variant}`}>{config.label}</span>;
}

function formatMeetingDisplay(date?: string, time?: string, timezone?: string): string {
  if (!date || !time) return "";
  const tz = timezone ? ` (${timezone.split("/").pop()?.replace("_", " ")})` : "";
  return `${date} at ${time}${tz}`;
}

export default function PortalClient() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalResponse | null>(null);

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
        toast.error("Missing required fields", "Please fill in date, time, and timezone.");
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

      toast.success("Action completed", getSuccessMessage(modalAction));

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
      toast.error("Action failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getSuccessMessage = (action: FeedbackAction): string => {
    switch (action) {
      case "SCHEDULE_MEETING":
        return "Meeting scheduled and candidate notified.";
      case "CANCEL_MEETING":
        return "Meeting cancelled and candidate notified.";
      case "REJECT":
        return "Candidate marked as not a good fit.";
      case "CV_MISMATCH":
        return "CV feedback sent to candidate.";
      case "REQUEST_CV_UPDATE":
        return "CV update request sent to candidate.";
      case "REQUEST_INFO":
        return "Information request sent to candidate.";
      case "MARK_INTERVIEWED":
        return "Candidate marked as interviewed.";
      case "OFFER_JOB":
        return "Job offer sent to candidate!";
      default:
        return "Action completed successfully.";
    }
  };

  const getModalTitle = (action: FeedbackAction): string => {
    switch (action) {
      case "SCHEDULE_MEETING":
        return "Schedule Meeting";
      case "CANCEL_MEETING":
        return "Cancel Meeting";
      case "REJECT":
        return "Not a Good Fit";
      case "CV_MISMATCH":
        return "CV Doesn't Match";
      case "REQUEST_CV_UPDATE":
        return "Request CV Update";
      case "REQUEST_INFO":
        return "Request Information";
      case "MARK_INTERVIEWED":
        return "Mark as Interviewed";
      case "OFFER_JOB":
        return "Offer Job";
      default:
        return "Confirm Action";
    }
  };

  const getModalDescription = (action: FeedbackAction): string => {
    switch (action) {
      case "SCHEDULE_MEETING":
        return "Schedule a meeting with this candidate. They will receive an email with the details.";
      case "CANCEL_MEETING":
        return "Cancel the scheduled meeting. The candidate will be notified.";
      case "REJECT":
        return "Mark this candidate as not a good fit. They will receive a polite rejection email.";
      case "CV_MISMATCH":
        return "The CV doesn't match your requirements. The candidate will receive feedback.";
      case "REQUEST_CV_UPDATE":
        return "Request the candidate to update their CV. They will receive a link to make changes.";
      case "REQUEST_INFO":
        return "Request additional information from the candidate.";
      case "MARK_INTERVIEWED":
        return "Mark this candidate as interviewed. They will receive a confirmation.";
      case "OFFER_JOB":
        return "Offer this candidate the job! They will receive the good news.";
      default:
        return "";
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
      <div className="card-header portal-header">
        <div className="portal-header__copy">
          <p className="eyebrow">Referrer portal</p>
          <h2 id="portal-title">Track your referrals</h2>
          <p className="lead">Review candidates, download CVs, and manage your referrals.</p>
        </div>
        {data ? (
          <dl className="portal-meta">
            <div className="portal-meta__item">
              <dt>Referrer</dt>
              <dd>
                {data.referrer.name || "Referrer"} - {data.referrer.irref}
              </dd>
            </div>
            <div className="portal-meta__item">
              <dt>Email</dt>
              <dd>{data.referrer.email || "No email on file"}</dd>
            </div>
            {data.referrer.company ? (
              <div className="portal-meta__item">
                <dt>Company</dt>
                <dd>{data.referrer.company}</dd>
              </div>
            ) : null}
            <div className="portal-meta__item">
              <dt>Total</dt>
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

  if (error) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card portal-state-card--error" role="alert">
          <div className="portal-state">
            <div className="portal-state__icon portal-state__icon--error" aria-hidden="true" />
            <div>
              <p className="portal-state__title">We could not load the portal</p>
              <p className="portal-state__message">Error: {error}</p>
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
              <p className="portal-state__title">No data available</p>
              <p className="portal-state__message">Please refresh to try again.</p>
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
            <p className="portal-table-title">Applications</p>
            <p className="portal-table-sub">{sortedItems.length} active referrals</p>
          </div>
          <div className="portal-table-meta">
            <span className="portal-count-pill">{data.total} total</span>
          </div>
        </div>
        <div className="portal-table-wrapper">
          <div className="founder-table portal-table" ref={dropdownRef}>
            <div className="founder-table__container portal-table__scroll">
              <table>
                <caption className="sr-only">Referrer portal applications</caption>
                <thead>
                  <tr>
                    <th className="portal-col-candidate">Candidate</th>
                    <th className="portal-col-position">Position / iRCRN</th>
                    <th className="portal-col-cv">CV</th>
                    <th className="portal-col-status">Status</th>
                    <th className="portal-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="portal-table-empty">
                        <EmptyState
                          variant="portal"
                          title="No applications assigned"
                          description="Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review."
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
                            <div className="portal-cell-title">{item.candidateName || item.candidateId}</div>
                            <div className="portal-cell-sub">{item.candidateEmail}</div>
                            <div className="portal-cell-sub">{item.candidatePhone}</div>
                            <div className="portal-cell-meta">App ID: {item.id}</div>
                          </td>
                          <td className="portal-col-position">
                            <div className="portal-cell-title">{item.position}</div>
                            <div className="portal-cell-sub">iRCRN: {item.iCrn || "-"}</div>
                          </td>
                          <td className="portal-col-cv">
                            {item.resumeDownloadUrl ? (
                              <a href={item.resumeDownloadUrl} target="_blank" rel="noreferrer" className="portal-link">
                                Download CV
                              </a>
                            ) : (
                              <span className="portal-muted">No CV available</span>
                            )}
                          </td>
                          <td className="portal-col-status">
                            <StatusBadge status={item.status} />
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
                                    Join
                                  </a>
                                )}
                              </div>
                            )}
                            {needsReschedule && (
                              <div className="portal-reschedule-warning">
                                Candidate requested to reschedule.
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
                                Actions
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
                                        {action.label}
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
        title={modalAction ? getModalTitle(modalAction) : ""}
        description={modalAction ? getModalDescription(modalAction) : ""}
        size={modalAction === "SCHEDULE_MEETING" ? "md" : "sm"}
        footer={
          <>
            <ActionBtn variant="ghost" onClick={closeModal} disabled={submitting}>
              Cancel
            </ActionBtn>
            <ActionBtn variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Sending..." : "Confirm"}
            </ActionBtn>
          </>
        }
      >
        {modalItem && (
          <div className="portal-modal-content">
            <div className="portal-modal-candidate">
              <strong>{modalItem.candidateName || modalItem.candidateId}</strong>
              <span>{modalItem.position}</span>
            </div>

            {modalAction === "SCHEDULE_MEETING" && (
              <div className="portal-modal-fields">
                <div className="portal-modal-field">
                  <label htmlFor="meeting-date">Date *</label>
                  <input
                    id="meeting-date"
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="portal-modal-field">
                  <label htmlFor="meeting-time">Time *</label>
                  <input
                    id="meeting-time"
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                  />
                </div>
                <div className="portal-modal-field">
                  <label htmlFor="meeting-timezone">Timezone *</label>
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
                  <label htmlFor="meeting-url">Meeting URL (optional)</label>
                  <input
                    id="meeting-url"
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://zoom.us/j/..."
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
                  Include link for candidate to update their CV
                </label>
              </div>
            )}

            <div className="portal-modal-field portal-modal-field--full">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or feedback..."
              />
            </div>
          </div>
        )}
      </CenteredModal>
    </div>
  );
}
