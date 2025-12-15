"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { Badge } from "@/components/founder/Badge";
import { Drawer } from "@/components/founder/Drawer";
import { OpsDataTable } from "@/components/founder/OpsDataTable";
import { Skeleton } from "@/components/founder/Skeleton";
import { Topbar } from "@/components/founder/Topbar";

type CandidateRecord = {
  irain: string;
  timestamp: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  phone: string;
  locatedCanada: string;
  province: string;
  workAuthorization: string;
  eligibleMoveCanada: string;
  countryOfOrigin: string;
  languages: string;
  languagesOther: string;
  industryType: string;
  industryOther: string;
  employmentStatus: string;
  legacyCandidateId: string;
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  eligibility: { eligible: boolean; reason: string };
  missingFields: string[];
};

type ApplicationRecord = {
  id: string;
  timestamp: string;
  candidateId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  status: string;
  ownerNotes: string;
};

const statusOptions = ["", "New", "Reviewed", "In Progress", "On Hold", "Closed"];

export default function CandidatesPage() {
  const [items, setItems] = useState<CandidateRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eligibleFilter, setEligibleFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const [selected, setSelected] = useState<CandidateRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCandidates = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (eligibleFilter === "eligible") params.set("eligible", "true");
    if (eligibleFilter === "ineligible") params.set("eligible", "false");

    const response = await fetch(`/api/founder/candidates?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, eligibleFilter]);

  useEffect(() => {
    if (!selected) return;
    setNotes(selected.ownerNotes || "");
    setTags(selected.tags || "");
    setStatus((selected.status || "").toLowerCase());
    setActionMessage(null);
    setActionError(null);
  }, [selected]);

  const fetchApplications = async (irain: string) => {
    setAppsLoading(true);
    const params = new URLSearchParams({ search: irain, limit: "10", offset: "0" });
    const response = await fetch(`/api/founder/applications?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) setApplications(data.items ?? []);
    setAppsLoading(false);
  };

  const handleRequestResume = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/candidates/${encodeURIComponent(selected.irain)}/request-resume`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || "Unable to send request.");
      } else {
        setActionMessage("Resume request sent.");
        updateLocalCandidate(selected.irain, { status: "resume requested" } as any);
        setStatus("resume requested");
      }
    } catch (error) {
      console.error("Request resume failed", error);
      setActionError("Unable to send request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRowClick = (row: CandidateRecord) => {
    setSelected(row);
    fetchApplications(row.irain);
  };

  const updateLocalCandidate = (irain: string, patch: Partial<CandidateRecord>) => {
    setItems((prev) => prev.map((item) => (item.irain === irain ? { ...item, ...patch } : item)));
    setSelected((prev) => (prev && prev.irain === irain ? { ...prev, ...patch } : prev));
  };

  const patchCandidate = async (irain: string, patch: Record<string, string>) => {
    setSaving(true);
    await fetch(`/api/founder/candidates/${encodeURIComponent(irain)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocalCandidate(irain, patch as Partial<CandidateRecord>);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      patchCandidate(selected.irain, { ownerNotes: notes, tags, status });
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tags, status]);

  const eligibilityBadge = (record: CandidateRecord) => {
    const tone = record.eligibility.eligible ? "success" : "danger";
    return <Badge tone={tone}>{record.eligibility.reason}</Badge>;
  };

  const columns = useMemo(
    () => [
      { key: "irain", label: "iRAIN", sortable: true, width: "220px", nowrap: true },
      {
        key: "firstName",
        label: "Name",
        width: "200px",
        nowrap: true,
        ellipsis: true,
        render: (row: CandidateRecord) =>
          [row.firstName, row.middleName, row.familyName].filter(Boolean).join(" ") || "-",
        sortable: true,
      },
      { key: "email", label: "Email", width: "320px", nowrap: true, ellipsis: true },
      { key: "phone", label: "Phone", width: "180px", nowrap: true },
      { key: "eligibility", label: "Eligibility", width: "140px", nowrap: true, render: eligibilityBadge },
      { key: "status", label: "Status", width: "140px", nowrap: true, sortable: true },
      { key: "province", label: "Province", width: "140px", nowrap: true, sortable: true },
    ],
    [],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Candidates"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by name, email, iRAIN..."
        onSearchChange={setSearchInput}
        actions={
          <div className="founder-toolbar">
            <select value={eligibleFilter} onChange={(event) => setEligibleFilter(event.target.value as any)}>
              <option value="all">Eligibility</option>
              <option value="eligible">Eligible</option>
              <option value="ineligible">Ineligible</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {statusOptions
                .filter((status) => status)
                .map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
        }
      />

      {/* Candidates table reference:
          - Wrapper chain: founder-page -> OpsDataTable (adds founder-card) -> DataTable -> div.founder-table > .founder-table__container (overflow: auto scroll) > table.data-table.candidates-table.
          - Layout: table-layout: fixed via .founder-table table and .ops-scope .data-table; colgroup uses the width props here (iRAIN 220px, Name 200px, Email 320px, Phone 180px, Eligibility/Status/Province 140px).
          - Overflow rules: col-nowrap/col-clip classes (nowrap + ellipsis) from globals; .candidates-table nth-child(1) is nowrap, cols 2-3 are nowrap + ellipsis; the container supplies scroll and thead is sticky.
          - Safety/selectors: runs inside .ops-scope with .founder-card/.founder-table/.data-table/.candidates-table/.col-*; ops grid keeps .ops-main min-width: 0 to prevent overflow blowouts. */}
      <OpsDataTable<CandidateRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState="No candidates match your filters."
        onRowClick={handleRowClick}
        tableClassName="candidates-table"
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName || "Candidate"} (${selected.irain})` : ""}
        description={selected?.email}
        actions={
          <div className="founder-actions">
            <ActionBtn
              as="button"
              variant="primary"
              onClick={() => selected && patchCandidate(selected.irain, { status: "reviewed" })}
              disabled={!selected}
            >
              Mark Reviewed
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              onClick={handleRequestResume}
              disabled={!selected || actionLoading}
            >
              {actionLoading ? "Sending..." : "Request updated resume"}
            </ActionBtn>
          </div>
        }
        footer={
          <div className="founder-drawer__footer-meta">
            {saving ? "Saving..." : savedAt ? `Saved ${savedAt}` : "Live autosave"}
            {actionMessage ? <span className="founder-pill founder-pill--success">{actionMessage}</span> : null}
            {actionError ? <span className="founder-pill">{actionError}</span> : null}
          </div>
        }
      >
        {selected ? (
          <div className="founder-drawer__grid">
            <section>
              <h3>Profile</h3>
              <div className="founder-field">
                <span>Location</span>
                <strong>{selected.locatedCanada || "Unknown"}</strong>
              </div>
              <div className="founder-field">
                <span>Eligibility</span>
                {eligibilityBadge(selected)}
              </div>
              <div className="founder-field">
                <span>Province</span>
                <strong>{selected.province || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Work Authorization</span>
                <strong>{selected.workAuthorization || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Languages</span>
                <strong>{selected.languages || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Industry</span>
                <strong>{selected.industryType || "-"}</strong>
              </div>
            </section>

            <section>
              <h3>Applications</h3>
              {appsLoading ? (
                <div className="founder-stack">
                  <Skeleton width="100%" height={12} />
                  <Skeleton width="80%" height={12} />
                </div>
              ) : applications.length === 0 ? (
                <p className="founder-card__meta">No applications yet.</p>
              ) : (
                <ul className="founder-list">
                  {applications.map((app) => (
                    <li key={app.id}>
                      <div className="founder-list__title">
                        {app.position || "Application"} <Badge tone="neutral">{app.iCrn}</Badge>
                      </div>
                      <div className="founder-list__meta">
                        {app.id} · {app.status || "Unassigned"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
                placeholder="Add context, outreach details, blockers..."
              />
            </section>

            <section className="founder-fieldset">
              <label>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Comma separated tags"
              />
            </section>

            <section>
              <h3>Data quality</h3>
              {selected.missingFields.length ? (
                <div className="founder-pill">{selected.missingFields.join(", ")}</div>
              ) : (
                <div className="founder-pill founder-pill--success">Complete</div>
              )}
            </section>
          </div>
        ) : (
          <p className="founder-card__meta">Select a candidate to view details.</p>
        )}
      </Drawer>
    </div>
  );
}
