"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";
import { useLanguage } from "@/components/LanguageProvider";

type ArchivedReferrer = {
  irref: string;
  name: string;
  email: string;
  company: string;
  archivedAt: string;
  archivedBy: string;
};

const PAGE_SIZE = 10;

const translations = {
  en: {
    title: "Archived Referrers",
    subtitle: (total: number) => `${total} archived referrer${total !== 1 ? "s" : ""}`,
    backLabel: "Archive",
    labels: {
      irref: "iRREF",
      name: "Name",
      email: "Email",
      company: "Company",
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
      restoreFailed: "Failed to restore referrer",
      deleteFailed: "Failed to delete referrer",
      deleteConfirm:
        "Are you sure you want to permanently delete this referrer? This cannot be undone.",
    },
    searchPlaceholder: "Search archived referrers...",
    empty: {
      title: "No archived referrers",
      description: "Referrers that are archived will appear here.",
    },
    loading: "Loading...",
  },
  fr: {
    title: "Référents archivés",
    subtitle: (total: number) => `${total} référent${total !== 1 ? "s" : ""} archivé${total !== 1 ? "s" : ""}`,
    backLabel: "Archives",
    labels: {
      irref: "iRREF",
      name: "Nom",
      email: "Courriel",
      company: "Entreprise",
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
      restoreFailed: "Échec de la restauration du référent",
      deleteFailed: "Échec de la suppression du référent",
      deleteConfirm:
        "Êtes-vous sûr de vouloir supprimer définitivement ce référent ? Cette action est irréversible.",
    },
    searchPlaceholder: "Rechercher des référents archivés...",
    empty: {
      title: "Aucun référent archivé",
      description: "Les référents archivés apparaîtront ici.",
    },
    loading: "Chargement...",
  },
};

function ArchivedReferrersFallback() {
  const { language } = useLanguage();
  const t = translations[language];
  return <p className="text-muted">{t.loading}</p>;
}

function ArchivedReferrersContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { language } = useLanguage();
  const t = translations[language];

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
        setError(data?.error || t.errors.restoreFailed);
      }
    } catch {
      setError(t.errors.restoreFailed);
    }
    setActionLoading(null);
  };

  const handlePermanentDelete = async (irref: string) => {
    if (!confirm(t.errors.deleteConfirm)) {
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
        setError(data?.error || t.errors.deleteFailed);
      }
    } catch {
      setError(t.errors.deleteFailed);
    }
    setActionLoading(null);
  };

  const columns = useMemo<OpsColumn<ArchivedReferrer>[]>(
    () => [
      {
        key: "irref",
        label: t.labels.irref,
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      {
        key: "name",
        label: t.labels.name,
        width: "180px",
        nowrap: true,
        ellipsis: true,
      },
      { key: "email", label: t.labels.email, width: "240px", nowrap: true, ellipsis: true },
      { key: "company", label: t.labels.company, width: "180px", nowrap: true, ellipsis: true },
      {
        key: "archivedAt",
        label: t.labels.archivedAt,
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
        label: t.labels.archivedBy,
        width: "140px",
        nowrap: true,
        render: (row: ArchivedReferrer) => row.archivedBy || t.labels.direct,
      },
      {
        key: "actions",
        label: t.labels.actions,
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
              {t.buttons.restore}
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              className="action-btn--danger"
              onClick={() => handlePermanentDelete(row.irref)}
              disabled={actionLoading === row.irref}
            >
              {t.buttons.delete}
            </ActionBtn>
          </div>
        ),
      },
    ],
    [actionLoading, t],
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
            variant="referrers"
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

export default function ArchivedReferrersPage() {
  return (
    <Suspense fallback={<ArchivedReferrersFallback />}>
      <ArchivedReferrersContent />
    </Suspense>
  );
}
