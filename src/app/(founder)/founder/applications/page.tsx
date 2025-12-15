"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/founder/Badge";
import { Drawer } from "@/components/founder/Drawer";
import { OpsDataTable } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

type ApplicationRecord = {
  id: string;
  timestamp: string;
  candidateId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
  status: string;
  ownerNotes: string;
};

const statusOptions = ["", "New", "In Review", "Submitted", "On Hold", "Closed"];

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

  const columns = useMemo(
    () => [
      { key: "id", label: "ID", sortable: true, nowrap: true, width: "160px" },
      { key: "candidateId", label: "Candidate", sortable: true, ellipsis: true, width: "240px" },
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
        emptyState="No applications match your filters."
        onRowClick={(row) => setSelected(row)}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.position || "Application"} (${selected.id})` : ""}
        description={selected?.candidateId}
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
                <span>Candidate</span>
                {selected.candidateId ? (
                  <a href={`/founder/candidates?search=${encodeURIComponent(selected.candidateId)}`}>Open profile</a>
                ) : (
                  <strong>-</strong>
                )}
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
          </div>
        ) : (
          <p className="founder-card__meta">Select an application to view details.</p>
        )}
      </Drawer>
    </div>
  );
}
