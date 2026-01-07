"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

type ArchivedReferrer = {
  irref: string;
  name: string;
  email: string;
  company: string;
  archivedAt: string;
  archivedBy: string;
};

const PAGE_SIZE = 10;

function ArchivedReferrersContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [items, setItems] = useState<ArchivedReferrer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((currentPage - 1) * PAGE_SIZE));
    if (search) params.set("search", search);

    const response = await fetch(`/api/founder/archive/referrers?${params.toString()}`, { cache: "no-store" });
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
  }, [search, currentPage]);

  const handleRestore = async (irref: string) => {
    setActionLoading(irref);
    setError(null);
    try {
      const response = await fetch(`/api/founder/archive/referrers/${encodeURIComponent(irref)}/restore`, {
        method: "POST",
      });
      const data = await response.json();
      if (data?.ok) {
        await fetchData();
      } else {
        setError(data?.error || "Failed to restore referrer");
      }
    } catch {
      setError("Failed to restore referrer");
    }
    setActionLoading(null);
  };

  const handlePermanentDelete = async (irref: string) => {
    if (!confirm("Are you sure you want to permanently delete this referrer? This cannot be undone.")) {
      return;
    }
    setActionLoading(irref);
    setError(null);
    try {
      const response = await fetch(`/api/founder/archive/referrers/${encodeURIComponent(irref)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data?.ok) {
        await fetchData();
      } else {
        setError(data?.error || "Failed to delete referrer");
      }
    } catch {
      setError("Failed to delete referrer");
    }
    setActionLoading(null);
  };

  const columns = useMemo<OpsColumn<ArchivedReferrer>[]>(
    () => [
      {
        key: "irref",
        label: "iRREF",
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "name",
        label: "Name",
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      { key: "email", label: "Email", width: "240px", nowrap: true, ellipsis: true },
      { key: "company", label: "Company", width: "180px", nowrap: true, ellipsis: true },
      {
        key: "archivedAt",
        label: "Archived At",
        width: "140px",
        nowrap: true,
        render: (row: ArchivedReferrer) => {
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
        width: "140px",
        nowrap: true,
        render: (row: ArchivedReferrer) => row.archivedBy || "Direct",
      },
      {
        key: "actions",
        label: "Actions",
        width: "200px",
        align: "right",
        render: (row: ArchivedReferrer) => (
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(row.irref)}
              disabled={actionLoading === row.irref}
            >
              Restore
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              className="action-btn--danger"
              onClick={() => handlePermanentDelete(row.irref)}
              disabled={actionLoading === row.irref}
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
        title="Archived Referrers"
        subtitle={`${total} archived referrer${total !== 1 ? "s" : ""}`}
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
            placeholder: "Search archived referrers...",
            value: searchInput,
            onChange: setSearchInput,
          },
        ]}
      />

      <OpsDataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="referrers"
            title="No archived referrers"
            description="Referrers that are archived will appear here."
          />
        }
        pageSize={PAGE_SIZE}
        totalItems={total}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default function ArchivedReferrersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <ArchivedReferrersContent />
    </Suspense>
  );
}
