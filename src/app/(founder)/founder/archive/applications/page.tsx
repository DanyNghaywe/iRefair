"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

type ArchivedApplication = {
  id: string;
  applicantId: string;
  referrerIrref: string;
  position: string;
  archivedAt: string;
  archivedBy: string;
};

const PAGE_SIZE = 10;

function ArchivedApplicationsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [items, setItems] = useState<ArchivedApplication[]>([]);
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

    const response = await fetch(`/api/founder/archive/applications?${params.toString()}`, { cache: "no-store" });
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

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    setError(null);
    try {
      const response = await fetch(`/api/founder/archive/applications/${encodeURIComponent(id)}/restore`, {
        method: "POST",
      });
      const data = await response.json();
      if (data?.ok) {
        await fetchData();
      } else {
        setError(data?.error || "Failed to restore application");
      }
    } catch {
      setError("Failed to restore application");
    }
    setActionLoading(null);
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this application? This cannot be undone.")) {
      return;
    }
    setActionLoading(id);
    setError(null);
    try {
      const response = await fetch(`/api/founder/archive/applications/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data?.ok) {
        await fetchData();
      } else {
        setError(data?.error || "Failed to delete application");
      }
    } catch {
      setError("Failed to delete application");
    }
    setActionLoading(null);
  };

  const columns = useMemo<OpsColumn<ArchivedApplication>[]>(
    () => [
      {
        key: "id",
        label: "ID",
        width: "160px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "applicantId",
        label: "Applicant",
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "referrerIrref",
        label: "Referrer",
        width: "180px",
        nowrap: true,
        ellipsis: true,
        render: (row: ArchivedApplication) => row.referrerIrref || "-",
      },
      { key: "position", label: "Position", width: "180px", nowrap: true, ellipsis: true },
      {
        key: "archivedAt",
        label: "Archived At",
        width: "140px",
        nowrap: true,
        render: (row: ArchivedApplication) => {
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
        render: (row: ArchivedApplication) => row.archivedBy || "Direct",
      },
      {
        key: "actions",
        label: "Actions",
        width: "200px",
        align: "right",
        render: (row: ArchivedApplication) => (
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(row.id)}
              disabled={actionLoading === row.id}
            >
              Restore
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              className="action-btn--danger"
              onClick={() => handlePermanentDelete(row.id)}
              disabled={actionLoading === row.id}
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
        title="Archived Applications"
        subtitle={`${total} archived application${total !== 1 ? "s" : ""}`}
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
            placeholder: "Search archived applications...",
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
            variant="applications"
            title="No archived applications"
            description="Applications that are archived will appear here."
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

export default function ArchivedApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading...</p>}>
      <ArchivedApplicationsContent />
    </Suspense>
  );
}
