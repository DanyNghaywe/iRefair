"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { Drawer } from "@/components/founder/Drawer";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

type ReferrerRecord = {
  irain: string;
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIndustry: string;
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

export default function ReferrersPage() {
  const [items, setItems] = useState<ReferrerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [selected, setSelected] = useState<ReferrerRecord | null>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchReferrers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (companyFilter) params.set("company", companyFilter);

    const response = await fetch(`/api/founder/referrers?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReferrers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, companyFilter]);

  useEffect(() => {
    if (!selected) return;
    setNotes(selected.ownerNotes || "");
    setTags(selected.tags || "");
    setStatus((selected.status || "").toLowerCase());
    setActionMessage(null);
    setActionError(null);
  }, [selected]);

  const updateLocal = (irain: string, patch: Partial<ReferrerRecord>) => {
    setItems((prev) => prev.map((item) => (item.irain === irain ? { ...item, ...patch } : item)));
    setSelected((prev) => (prev && prev.irain === irain ? { ...prev, ...patch } : prev));
  };

  const patchReferrer = async (irain: string, patch: Record<string, string>) => {
    setSaving(true);
    await fetch(`/api/founder/referrers/${encodeURIComponent(irain)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocal(irain, patch as Partial<ReferrerRecord>);
    setSaving(false);
  };

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      patchReferrer(selected.irain, { ownerNotes: notes, tags, status });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tags, status]);

  const handleInvite = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/referrers/${encodeURIComponent(selected.irain)}/invite-meeting`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || "Unable to send invite.");
      } else {
        setActionMessage("Invite sent.");
        updateLocal(selected.irain, { status: "meeting invited" });
        setStatus("meeting invited");
      }
    } catch (error) {
      console.error("Invite meeting failed", error);
      setActionError("Unable to send invite.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo<OpsColumn<ReferrerRecord>[]>(
    () => [
      { key: "irain", label: "iRAIN", sortable: true, nowrap: true, width: "200px" },
      { key: "name", label: "Name", sortable: true, ellipsis: true, width: "200px" },
      { key: "email", label: "Email", ellipsis: true, width: "320px" },
      { key: "company", label: "Company", sortable: true, ellipsis: true, width: "240px" },
      { key: "workType", label: "Work Type", nowrap: true, width: "160px" },
      { key: "status", label: "Status", sortable: true, nowrap: true, width: "140px", align: "center" },
    ],
    [],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Referrers"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by name, email, company..."
        onSearchChange={setSearchInput}
        actions={
          <div className="founder-toolbar">
            <input
              type="text"
              placeholder="Filter company"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
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

      <OpsDataTable<ReferrerRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState="No referrers match your filters."
        onRowClick={(row) => setSelected(row)}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name || "Referrer"} (${selected.irain})` : ""}
        description={selected?.email}
        actions={
          <div className="founder-actions">
            <ActionBtn
              as="button"
              variant="primary"
              onClick={handleInvite}
              disabled={!selected || actionLoading}
            >
              {actionLoading ? "Sending..." : "Invite to Meet Founder"}
            </ActionBtn>
          </div>
        }
        footer={
          <div className="founder-drawer__footer-meta">
            {saving ? "Saving..." : "Live autosave"}
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
                <span>Country</span>
                <strong>{selected.country || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Company</span>
                <strong>{selected.company || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Industry</span>
                <strong>{selected.companyIndustry || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Work Type</span>
                <strong>{selected.workType || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>LinkedIn</span>
                {selected.linkedin ? (
                  <a href={selected.linkedin} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : (
                  <strong>-</strong>
                )}
              </div>
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
                placeholder="Add context, fit, expectations..."
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
          <p className="founder-card__meta">Select a referrer to view details.</p>
        )}
      </Drawer>
    </div>
  );
}
