"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";
import { useLanguage } from "@/components/LanguageProvider";

type ArchivedApplication = {
  id: string;
  applicantId: string;
  referrerIrref: string;
  position: string;
  archivedAt: string;
  archivedBy: string;
};

const PAGE_SIZE = 10;

const translations = {
  en: {
    title: "Archived Applications",
    subtitle: (total: number) => `${total} archived application${total !== 1 ? "s" : ""}`,
    backLabel: "Archive",
    labels: {
      id: "ID",
      applicant: "Applicant",
      referrer: "Referrer",
      position: "Position",
      archivedAt: "Archived At",
      archivedBy: "Archived By",
      actions: "Actions",
      direct: "Direct",
    },
    buttons: {
      restore: "Restore",
      delete: "Delete",
    },
    errors: {
      restoreFailed: "Failed to restore application",
      deleteFailed: "Failed to delete application",
      deleteConfirm:
        "Are you sure you want to permanently delete this application? This cannot be undone.",
    },
    searchPlaceholder: "Search archived applications...",
    empty: {
      title: "No archived applications",
      description: "Applications that are archived will appear here.",
    },
    loading: "Loading...",
  },
  fr: {
    title: "Candidatures archivées",
    subtitle: (total: number) => `${total} candidature${total !== 1 ? "s" : ""} archivée${total !== 1 ? "s" : ""}`,
    backLabel: "Archives",
    labels: {
      id: "ID",
      applicant: "Candidat",
      referrer: "Référent",
      position: "Poste",
      archivedAt: "Archivée le",
      archivedBy: "Archivée par",
      actions: "Actions",
      direct: "Direct",
    },
    buttons: {
      restore: "Restaurer",
      delete: "Supprimer",
    },
    errors: {
      restoreFailed: "Échec de la restauration de la candidature",
      deleteFailed: "Échec de la suppression de la candidature",
      deleteConfirm:
        "Êtes-vous sûr de vouloir supprimer définitivement cette candidature ? Cette action est irréversible.",
    },
    searchPlaceholder: "Rechercher des candidatures archivées...",
    empty: {
      title: "Aucune candidature archivée",
      description: "Les candidatures archivées apparaîtront ici.",
    },
    loading: "Chargement...",
  },
};

function ArchivedApplicationsFallback() {
  const { language } = useLanguage();
  const t = translations[language];
  return <p className="text-muted">{t.loading}</p>;
}

function ArchivedApplicationsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { language } = useLanguage();
  const t = translations[language];

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search]);

  const fetchData = useCallback(async () => {
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
  }, [currentPage, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleRestore = useCallback(async (id: string) => {
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
        setError(data?.error || t.errors.restoreFailed);
      }
    } catch {
      setError(t.errors.restoreFailed);
    }
    setActionLoading(null);
  }, [fetchData, t]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    if (!confirm(t.errors.deleteConfirm)) {
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
        setError(data?.error || t.errors.deleteFailed);
      }
    } catch {
      setError(t.errors.deleteFailed);
    }
    setActionLoading(null);
  }, [fetchData, t]);

  const columns = useMemo<OpsColumn<ArchivedApplication>[]>(
    () => [
      {
        key: "id",
        label: t.labels.id,
        width: "160px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "applicantId",
        label: t.labels.applicant,
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "referrerIrref",
        label: t.labels.referrer,
        width: "180px",
        nowrap: true,
        ellipsis: true,
        render: (row: ArchivedApplication) => row.referrerIrref || "-",
      },
      { key: "position", label: t.labels.position, width: "180px", nowrap: true, ellipsis: true },
      {
        key: "archivedAt",
        label: t.labels.archivedAt,
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
        label: t.labels.archivedBy,
        width: "180px",
        nowrap: true,
        render: (row: ArchivedApplication) => row.archivedBy || t.labels.direct,
      },
      {
        key: "actions",
        label: t.labels.actions,
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
              {t.buttons.restore}
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              className="action-btn--danger"
              onClick={() => handlePermanentDelete(row.id)}
              disabled={actionLoading === row.id}
            >
              {t.buttons.delete}
            </ActionBtn>
          </div>
        ),
      },
    ],
    [actionLoading, handlePermanentDelete, handleRestore, t],
  );

  return (
    <div className="founder-page">
      <Topbar
        title={t.title}
        subtitle={t.subtitle(total)}
        backHref="/founder/archive"
        backLabel={t.backLabel}
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
            placeholder: t.searchPlaceholder,
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
            title={t.empty.title}
            description={t.empty.description}
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
    <Suspense fallback={<ArchivedApplicationsFallback />}>
      <ArchivedApplicationsContent />
    </Suspense>
  );
}
