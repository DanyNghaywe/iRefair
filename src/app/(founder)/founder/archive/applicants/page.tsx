"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

type ArchivedApplicant = {
  irain: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  archivedAt: string;
  archivedBy: string;
};

function ArchivedApplicantsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [items, setItems] = useState<ArchivedApplicant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (search) params.set("search", search);

    const response = await fetch(`/api/founder/archive/applicants?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleRestore = async (irain: string) => {
    setActionLoading(irain);
    setError(null);
    try {
      const response = await fetch(`/api/founder/archive/applicants/${encodeURIComponent(irain)}/restore`, {
        method: "POST",
      });
      const data = await response.json();
      if (data?.ok) {
        await fetchData();
      } else {
        setError(data?.error || "Failed to restore applicant");
      }
    } catch {
      setError("Failed to restore applicant");
    }
    setActionLoading(null);
  };

  const handlePermanentDelete = async (irain: string) => {
    if (!confirm("Are you sure you want to permanently delete this applicant? This cannot be undone.")) {
      return;
    }
    setActionLoading(irain);
    setError(null);
    try {
      const response = await fetch(`/api/founder/archive/applicants/${encodeURIComponent(irain)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data?.ok) {
        await fetchData();
      } else {
        setError(data?.error || "Failed to delete applicant");
      }
    } catch {
      setError("Failed to delete applicant");
    }
    setActionLoading(null);
  };

  const columns = useMemo<OpsColumn<ArchivedApplicant>[]>(
    () => [
      {
        key: "irain",
        label: "iRAIN",
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "firstName",
        label: "Name",
        width: "200px",
        nowrap: true,
        ellipsis: true,
        render: (row: ArchivedApplicant) =>
          [row.firstName, row.middleName, row.familyName].filter(Boolean).join(" ") || "-",
      },
      { key: "email", label: "Email", width: "280px", nowrap: true, ellipsis: true },
      {
        key: "archivedAt",
        label: "Archived At",
        width: "180px",
        nowrap: true,
        render: (row: ArchivedApplicant) => {
          if (!row.archivedAt) return "-";
          try {
            return new Date(row.archivedAt).toLocaleDateString();
          } catch {
            return row.archivedAt;
          }
        },
      },
      {
        key: "archivedBy",
        label: "Archived By",
        width: "180px",
        nowrap: true,
        render: (row: ArchivedApplicant) => row.archivedBy || "Direct",
      },
      {
        key: "actions",
        label: "Actions",
        width: "200px",
        align: "right",
        render: (row: ArchivedApplicant) => (
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(row.irain)}
              disabled={actionLoading === row.irain}
            >
              Restore
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              className="action-btn--danger"
              onClick={() => handlePermanentDelete(row.irain)}
              disabled={actionLoading === row.irain}
            >
              Delete
            </ActionBtn>
          </div>
        ),
      },
    ],
    [actionLoading],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Archived Applicants"
        subtitle={`${total} archived applicant${total !== 1 ? "s" : ""}`}
        backHref="/founder/archive"
        backLabel="Archive"
      />

      {error && (
        <div className="status-banner status-banner--error" role="alert">
          {error}
        </div>
      )}

      <FilterBar
        filters={[
          {
            type: "text",
            key: "search",
            placeholder: "Search archived applicants...",
            value: searchInput,
            onChange: setSearchInput,
          },
        ]}
      />

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState
          variant="candidates"
          title="No archived applicants"
          description="Applicants that are archived will appear here."
        />
      ) : (
        <OpsDataTable columns={columns} data={items} />
      )}
    </div>
  );
}

export default function ArchivedApplicantsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <ArchivedApplicantsContent />
    </Suspense>
  );
}
