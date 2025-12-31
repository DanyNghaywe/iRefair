"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ActionBtn } from "@/components/ActionBtn";
import { Badge } from "@/components/founder/Badge";
import { Drawer } from "@/components/founder/Drawer";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

type MatchRecord = {
  matchId: string;
  createdAt: string;
  candidateIrain: string;
  referrerIrref: string;
  companyIrcrn: string;
  positionContext: string;
  stage: string;
  notes: string;
  introSentAt: string;
  missingFields: string[];
};

const stageOptions = ["", "Draft", "Intro Sent", "Interviewing", "Offer", "Closed"];
const matchCreateEnabled = (process.env.NEXT_PUBLIC_ENABLE_MATCH_CREATE || "").toLowerCase() === "true";

export default function MatchesPage() {
  const [items, setItems] = useState<MatchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [selected, setSelected] = useState<MatchRecord | null>(null);
  const [stage, setStage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const appRootRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [newMatch, setNewMatch] = useState({
    candidateIrain: "",
    referrerIrref: "",
    companyIrcrn: "",
    positionContext: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMatches = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (search) params.set("search", search);
    if (stageFilter) params.set("stage", stageFilter);

    const response = await fetch(`/api/founder/matches?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stageFilter]);

  useEffect(() => {
    if (!selected) return;
    setStage((selected.stage || "").toLowerCase());
    setNotes(selected.notes || "");
    setActionMessage(null);
    setActionError(null);
  }, [selected]);

  const updateLocal = (id: string, patch: Partial<MatchRecord>) => {
    setItems((prev) => prev.map((item) => (item.matchId === id ? { ...item, ...patch } : item)));
    setSelected((prev) => (prev && prev.matchId === id ? { ...prev, ...patch } : prev));
  };

  const patchMatch = async (id: string, patch: Record<string, string>) => {
    setSaving(true);
    await fetch(`/api/founder/matches/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocal(id, patch as Partial<MatchRecord>);
    setSaving(false);
  };

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      patchMatch(selected.matchId, { stage, notes });
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, notes]);

  const handleSendIntro = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/matches/${encodeURIComponent(selected.matchId)}/send-intro`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || "Unable to send intro.");
      } else {
        setActionMessage("Intro email sent.");
        updateLocal(selected.matchId, { stage: "intro sent", introSentAt: new Date().toISOString() });
        setStage("intro sent");
      }
    } catch (error) {
      console.error("Send intro failed", error);
      setActionError("Unable to send intro.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo<OpsColumn<MatchRecord>[]>(
    () => [
      {
        key: "matchId",
        label: "Match ID",
        sortable: true,
        nowrap: true,
        ellipsis: true,
        width: "220px",
        render: (row: MatchRecord) => <span title={row.matchId}>{row.matchId}</span>,
      },
      { key: "candidateIrain", label: "Candidate", sortable: true, width: "240px", ellipsis: true },
      { key: "referrerIrref", label: "Referrer", sortable: true, width: "240px", ellipsis: true },
      { key: "companyIrcrn", label: "iRCRN", sortable: true, width: "200px", nowrap: true },
      {
        key: "stage",
        label: "Stage",
        width: "160px",
        nowrap: true,
        align: "center",
        render: (row: MatchRecord) => <Badge tone="neutral">{row.stage || "Unassigned"}</Badge>,
      },
    ],
    [],
  );

  const handleCreateMatch = (event: FormEvent) => {
    event.preventDefault();
    setShowModal(false);
  };

  useEffect(() => {
    setMounted(true);
    appRootRef.current = document.getElementById("__next") as HTMLElement | null;
  }, []);

  useEffect(() => {
    if (!showModal) {
      document.body.style.overflow = "";
      if (appRootRef.current) (appRootRef.current as HTMLElement & { inert?: boolean }).inert = false;
      return undefined;
    }

    if (appRootRef.current) (appRootRef.current as HTMLElement & { inert?: boolean }).inert = true;
    document.body.style.overflow = "hidden";
    const firstField = modalRef.current?.querySelector<HTMLInputElement>("input");
    firstField?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowModal(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [showModal]);

  const modal = matchCreateEnabled && mounted && showModal
    ? createPortal(
        <div ref={modalRef} className="founder-modal modal-root is-open" role="dialog" aria-modal="true">
          <div className="founder-modal__overlay modal-backdrop" onClick={() => setShowModal(false)} />
          <form className="founder-modal__panel modal-panel" onSubmit={handleCreateMatch}>
            <header className="founder-modal__header">
              <h3>Create match</h3>
              <ActionBtn
                as="button"
                variant="ghost"
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                &times;
              </ActionBtn>
            </header>
            <div className="founder-modal__body">
              <label>
                Candidate iRAIN
                <input
                  type="text"
                  value={newMatch.candidateIrain}
                  onChange={(event) => setNewMatch((prev) => ({ ...prev, candidateIrain: event.target.value }))}
                  required
                />
              </label>
              <label>
                Referrer iRREF (optional)
                <input
                  type="text"
                  value={newMatch.referrerIrref}
                  onChange={(event) => setNewMatch((prev) => ({ ...prev, referrerIrref: event.target.value }))}
                />
              </label>
              <label>
                Company iRCRN
                <input
                  type="text"
                  value={newMatch.companyIrcrn}
                  onChange={(event) => setNewMatch((prev) => ({ ...prev, companyIrcrn: event.target.value }))}
                  required
                />
              </label>
              <label>
                Position / Context
                <textarea
                  rows={3}
                  value={newMatch.positionContext}
                  onChange={(event) => setNewMatch((prev) => ({ ...prev, positionContext: event.target.value }))}
                  required
                />
              </label>
              <p className="founder-card__meta">Submission wiring coming in next prompt.</p>
            </div>
            <footer className="founder-modal__footer modal-footer">
              <ActionBtn as="button" variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </ActionBtn>
              <ActionBtn as="button" variant="primary" type="submit" disabled>
                Save match
              </ActionBtn>
            </footer>
          </form>
        </div>,
        document.body,
      )
    : null;

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: "select",
        key: "stage",
        label: "All stages",
        value: stageFilter,
        options: stageOptions
          .filter((value) => value)
          .map((value) => ({ value: value.toLowerCase(), label: value })),
        onChange: setStageFilter,
      },
    ],
    [stageFilter],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Matches"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by match, candidate, referrer..."
        onSearchChange={setSearchInput}
      />

      <FilterBar
        filters={filters}
        actions={
          matchCreateEnabled ? (
            <ActionBtn as="button" variant="primary" type="button" onClick={() => setShowModal(true)}>
              Create match
            </ActionBtn>
          ) : null
        }
      />

      <OpsDataTable<MatchRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="matches"
            title="No matches yet"
            description="Matches connect candidates with referrers and opportunities. Create your first match or adjust your filters to see existing ones."
            actionLabel={matchCreateEnabled ? "Create match" : undefined}
            onAction={matchCreateEnabled ? () => setShowModal(true) : undefined}
          />
        }
        onRowClick={(row) => setSelected(row)}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.candidateIrain} ƒ+' ${selected.companyIrcrn}` : ""}
        description={selected?.referrerIrref || "No referrer linked"}
        actions={
          <div className="founder-actions">
            <ActionBtn
              as="button"
              variant="primary"
              onClick={handleSendIntro}
              disabled={!selected || actionLoading}
            >
              {actionLoading ? "Sending..." : "Send intro email"}
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
              <h3>Context</h3>
              <div className="founder-field">
                <span>Position / Context</span>
                <strong>{selected.positionContext || "-"}</strong>
              </div>
              <div className="founder-field">
                <span>Intro sent</span>
                <strong>{selected.introSentAt || "-"}</strong>
              </div>
            </section>

            <section className="founder-fieldset">
              <label>Stage</label>
              <select value={stage} onChange={(event) => setStage(event.target.value)}>
                <option value="">Unassigned</option>
                {stageOptions
                  .filter((value) => value)
                  .map((value) => (
                    <option key={value} value={value.toLowerCase()}>
                      {value}
                    </option>
                  ))}
              </select>
            </section>

            <section className="founder-fieldset">
              <label>Notes</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context, progress, blockers..."
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
          <p className="founder-card__meta">Select a match to view details.</p>
        )}
      </Drawer>

      {modal}
    </div>
  );
}
