"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/founder/Badge";
import { Drawer } from "@/components/founder/Drawer";
import { EmptyState } from "@/components/founder/EmptyState";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";
import { parseActionHistory, type ActionLogEntry } from "@/lib/actionHistory";
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
  "Hired",
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

export default function ApplicationsPage() {
  const [items, setItems] = useState<ApplicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ircrnFilter, setIrcrnFilter] = useState("");
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchApplications = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (ircrnFilter) params.set("ircrn", ircrnFilter);

    const response = await fetch(`/api/founder/applications?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, ircrnFilter]);

  useEffect(() => {
    if (!selected) return;
    setNotes(selected.ownerNotes || "");
    setStatus((selected.status || "").toLowerCase());
  }, [selected]);

  const updateLocal = (id: string, patch: Partial<ApplicationRecord>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  };

  const patchApplication = async (id: string, patch: Record<string, string>) => {
    setSaving(true);
    await fetch(`/api/founder/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocal(id, patch as Partial<ApplicationRecord>);
    setSaving(false);
  };

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      patchApplication(selected.id, { ownerNotes: notes, status });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, status]);

  const columns = useMemo<OpsColumn<ApplicationRecord>[]>(
    () => [
      {
        key: "id",
        label: "ID",
        sortable: true,
        nowrap: true,
        ellipsis: true,
        width: "220px",
        render: (row: ApplicationRecord) => <span title={row.id}>{row.id}</span>,
      },
      { key: "applicantId", label: "Applicant", sortable: true, ellipsis: true, width: "240px" },
      { key: "iCrn", label: "iRCRN", sortable: true, nowrap: true, width: "200px" },
      { key: "position", label: "Position", sortable: true, ellipsis: true, width: "320px" },
      {
        key: "status",
        label: "Status",
        nowrap: true,
        width: "140px",
        align: "center",
        render: (row: ApplicationRecord) => <Badge tone="neutral">{row.status || "Unassigned"}</Badge>,
      },
    ],
    [],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Applications"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by ID, candidate, position..."
        onSearchChange={setSearchInput}
        actions={
          <div className="founder-toolbar">
            <input
              type="text"
              placeholder="Filter iRCRN"
              value={ircrnFilter}
              onChange={(event) => setIrcrnFilter(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {statusOptions
                .filter((value) => value)
                .map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
        }
      />

      <OpsDataTable<ApplicationRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="applications"
            title="No applications yet"
            description="Applications will appear here when candidates submit their resumes for positions. Try adjusting your filters or check back later."
          />
        }
        onRowClick={(row) => setSelected(row)}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.position || "Application"} (${selected.id})` : ""}
        description={selected?.applicantId}
        footer={<div className="founder-drawer__footer-meta">{saving ? "Saving..." : "Live autosave"}</div>}
      >
        {selected ? (
          <div className="founder-drawer__grid">
            <section>
              <h3>Details</h3>
              <div className="founder-field">
                <span>iRCRN</span>
                <strong>{selected.iCrn || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Applicant</span>
                {selected.applicantId ? (
                  <a href={`/founder/applicants?search=${encodeURIComponent(selected.applicantId)}`}>Open profile</a>
                ) : (
                  <strong>-</strong>
                )}
              </div>
              <div className="founder-field">
                <span>Referrer</span>
                <strong>{selected.referrerIrref || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Reference</span>
                <strong>{selected.referenceNumber || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Resume</span>
                <strong>{selected.resumeFileName || "-"}</strong>
              </div>
            </section>

            {selected.meetingDate && (
              <section className="founder-meeting-section">
                <h3>Meeting Details</h3>
                <div className="founder-meeting-info">
                  <div className="founder-field">
                    <span>Date/Time</span>
                    <strong>
                      {formatMeetingDateTime(
                        selected.meetingDate,
                        selected.meetingTime,
                        selected.meetingTimezone
                      ) || `${selected.meetingDate} ${selected.meetingTime}`}
                    </strong>
                  </div>
                  {selected.meetingUrl && (
                    <div className="founder-field">
                      <span>Meeting Link</span>
                      <a href={selected.meetingUrl} target="_blank" rel="noopener noreferrer">
                        {selected.meetingUrl}
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="founder-fieldset">
              <label>Status</label>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Unassigned</option>
                {statusOptions
                  .filter((value) => value)
                  .map((value) => (
                    <option key={value} value={value.toLowerCase()}>
                      {value}
                    </option>
                  ))}
              </select>
            </section>

            <section className="founder-fieldset">
              <label>Owner Notes</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context, follow-ups, next steps..."
              />
            </section>

            {(() => {
              const history = parseActionHistory(selected.actionHistory);
              if (history.length === 0) return null;
              return (
                <section className="founder-timeline-section">
                  <h3>Action History</h3>
                  <div className="founder-timeline">
                    {history.slice().reverse().map((entry, idx) => (
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
                          {entry.notes && (
                            <div className="founder-timeline__notes">{entry.notes}</div>
                          )}
                          {entry.meetingDetails && (
                            <div className="founder-timeline__meeting">
                              {formatMeetingDateTime(
                                entry.meetingDetails.date,
                                entry.meetingDetails.time,
                                entry.meetingDetails.timezone
                              )}
                              {entry.meetingDetails.url && (
                                <a href={entry.meetingDetails.url} target="_blank" rel="noopener noreferrer">
                                  {" "}View meeting
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        ) : (
          <p className="founder-card__meta">Select an application to view details.</p>
        )}
      </Drawer>
    </div>
  );
}
