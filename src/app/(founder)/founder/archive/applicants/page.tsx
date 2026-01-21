"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";
import { useLanguage } from "@/components/LanguageProvider";

type ArchivedApplicant = {
  irain: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  archivedAt: string;
  archivedBy: string;
};

const PAGE_SIZE = 10;

const translations = {
  en: {
    title: "Archived Applicants",
    subtitle: (total: number) => `${total} archived applicant${total !== 1 ? "s" : ""}`,
    backLabel: "Archive",
    labels: {
      irain: "iRAIN",
      name: "Name",
      email: "Email",
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
      restoreFailed: "Failed to restore applicant",
      deleteFailed: "Failed to delete applicant",
      deleteConfirm:
        "Are you sure you want to permanently delete this applicant? This cannot be undone.",
    },
    searchPlaceholder: "Search archived applicants...",
    empty: {
      title: "No archived applicants",
      description: "Applicants that are archived will appear here.",
    },
    loading: "Loading...",
  },
  fr: {
    title: "Candidats archivés",
    subtitle: (total: number) => `${total} candidat${total !== 1 ? "s" : ""} archivé${total !== 1 ? "s" : ""}`,
    backLabel: "Archives",
    labels: {
      irain: "iRAIN",
      name: "Nom",
      email: "Courriel",
      archivedAt: "Archivé le",
      archivedBy: "Archivé par",
      actions: "Actions",
      direct: "Direct",
    },
    buttons: {
      restore: "Restaurer",
      delete: "Supprimer",
    },
    errors: {
      restoreFailed: "Échec de la restauration du candidat",
      deleteFailed: "Échec de la suppression du candidat",
      deleteConfirm:
        "Êtes-vous sûr de vouloir supprimer définitivement ce candidat ? Cette action est irréversible.",
    },
    searchPlaceholder: "Rechercher des candidats archivés...",
    empty: {
      title: "Aucun candidat archivé",
      description: "Les candidats archivés apparaîtront ici.",
    },
    loading: "Chargement...",
  },
};

function ArchivedApplicantsFallback() {
  const { language } = useLanguage();
  const t = translations[language];
  return <p className="text-muted">{t.loading}</p>;
}

function ArchivedApplicantsContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { language } = useLanguage();
  const t = translations[language];

  const [items, setItems] = useState<ArchivedApplicant[]>([]);
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

    const response = await fetch(`/api/founder/archive/applicants?${params.toString()}`, { cache: "no-store" });
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

  const handleRestore = useCallback(async (irain: string) => {
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
        setError(data?.error || t.errors.restoreFailed);
      }
    } catch {
      setError(t.errors.restoreFailed);
    }
    setActionLoading(null);
  }, [fetchData, t]);

  const handlePermanentDelete = useCallback(async (irain: string) => {
    if (!confirm(t.errors.deleteConfirm)) {
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
        setError(data?.error || t.errors.deleteFailed);
      }
    } catch {
      setError(t.errors.deleteFailed);
    }
    setActionLoading(null);
  }, [fetchData, t]);

  const columns = useMemo<OpsColumn<ArchivedApplicant>[]>(
    () => [
      {
        key: "irain",
        label: t.labels.irain,
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "firstName",
        label: t.labels.name,
        width: "200px",
        nowrap: true,
        ellipsis: true,
        render: (row: ArchivedApplicant) =>
          [row.firstName, row.middleName, row.familyName].filter(Boolean).join(" ") || "-",
      },
      { key: "email", label: t.labels.email, width: "280px", nowrap: true, ellipsis: true },
      {
        key: "archivedAt",
        label: t.labels.archivedAt,
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
        label: t.labels.archivedBy,
        width: "180px",
        nowrap: true,
        render: (row: ArchivedApplicant) => row.archivedBy || t.labels.direct,
      },
      {
        key: "actions",
        label: t.labels.actions,
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
              {t.buttons.restore}
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              className="action-btn--danger"
              onClick={() => handlePermanentDelete(row.irain)}
              disabled={actionLoading === row.irain}
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
            variant="candidates"
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

export default function ArchivedApplicantsPage() {
  return (
    <Suspense fallback={<ArchivedApplicantsFallback />}>
      <ArchivedApplicantsContent />
    </Suspense>
  );
}
