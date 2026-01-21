"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/founder/Badge";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

const translations = {
  en: {
    title: "Applications",
    records: "records",
    searchPlaceholder: "Search by ID, candidate, position...",
    filterByIrcrn: "Filter by iRCRN",
    allStatuses: "All statuses",
    id: "ID",
    applicant: "Applicant",
    referrer: "Referrer",
    ircrn: "iRCRN",
    position: "Position",
    status: "Status",
    unassigned: "Unassigned",
    createApplication: "Create application",
    emptyTitle: "No applications yet",
    emptyDescription: "Applications will appear here when candidates submit their resumes for positions. Try adjusting your filters or check back later.",
  },
  fr: {
    title: "Candidatures",
    records: "enregistrements",
    searchPlaceholder: "Rechercher par ID, candidat, poste...",
    filterByIrcrn: "Filtrer par iRCRN",
    allStatuses: "Tous les statuts",
    id: "ID",
    applicant: "Candidat",
    referrer: "Référent",
    ircrn: "iRCRN",
    position: "Poste",
    status: "Statut",
    unassigned: "Non assigné",
    createApplication: "Creer la candidature",
    emptyTitle: "Aucune candidature",
    emptyDescription: "Les candidatures apparaîtront ici lorsque les candidats soumettront leurs CV pour des postes. Essayez d'ajuster vos filtres ou revenez plus tard.",
  },
};

type ApplicationRecord = {
  id: string;
  timestamp: string;
  applicantId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
  resumeFileId: string;
  referrerIrref: string;
  referrerEmail: string;
  status: string;
  ownerNotes: string;
  meetingDate: string;
  meetingTime: string;
  meetingTimezone: string;
  meetingUrl: string;
  actionHistory: string;
};

const statusOptions = [
  "",
  "New",
  "Meeting Scheduled",
  "Meeting Requested",
  "Needs Reschedule",
  "Interviewed",
  "CV Mismatch",
  "CV Update Requested",
  "Info Requested",
  "Not a Good Fit",
  "Job Offered",
  "In Review",
  "Submitted",
  "On Hold",
  "Closed",
];

const PAGE_SIZE = 10;

export default function ApplicationsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];
  const [items, setItems] = useState<ApplicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ircrnFilter, setIrcrnFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, ircrnFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((currentPage - 1) * PAGE_SIZE));
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
  }, [search, statusFilter, ircrnFilter, currentPage]);

  const handleRowClick = useCallback(
    (row: ApplicationRecord) => {
      const id = row.id?.trim();
      if (!id) return;
      router.push(`/founder/applications/${encodeURIComponent(id)}`);
    },
    [router],
  );

  const columns = useMemo<OpsColumn<ApplicationRecord>[]>(
    () => [
      {
        key: "id",
        label: t.id,
        sortable: true,
        nowrap: true,
        ellipsis: true,
        width: "260px",
        render: (row: ApplicationRecord) => <span title={row.id}>{row.id}</span>,
      },
      { key: "applicantId", label: t.applicant, sortable: true, ellipsis: true, width: "180px" },
      { key: "referrerIrref", label: t.referrer, sortable: true, ellipsis: true, width: "180px" },
      { key: "iCrn", label: t.ircrn, sortable: true, nowrap: true, width: "180px" },
      { key: "position", label: t.position, sortable: true, ellipsis: true, width: "220px" },
      {
        key: "status",
        label: t.status,
        nowrap: true,
        width: "180px",
        align: "center",
        render: (row: ApplicationRecord) => <Badge tone="neutral">{row.status || t.unassigned}</Badge>,
      },
    ],
    [t],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: "text",
        key: "ircrn",
        placeholder: t.filterByIrcrn,
        value: ircrnFilter,
        onChange: setIrcrnFilter,
      },
      {
        type: "select",
        key: "status",
        label: t.allStatuses,
        value: statusFilter,
        options: statusOptions
          .filter((value) => value)
          .map((value) => ({ value: value.toLowerCase(), label: value })),
        onChange: setStatusFilter,
      },
    ],
    [ircrnFilter, statusFilter, t],
  );

  return (
    <div className="founder-page">
      <Topbar
        title={t.title}
        subtitle={`${total} ${t.records}`}
        searchValue={searchInput}
        searchPlaceholder={t.searchPlaceholder}
        onSearchChange={setSearchInput}
        actions={
          <ActionBtn as="link" href="/founder/applications/new" variant="primary" size="sm">
            {t.createApplication}
          </ActionBtn>
        }
      />

      <FilterBar filters={filters} />

      <OpsDataTable<ApplicationRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="applications"
            title={t.emptyTitle}
            description={t.emptyDescription}
            actionLabel={t.createApplication}
            actionHref="/founder/applications/new"
          />
        }
        onRowClick={handleRowClick}
        pageSize={PAGE_SIZE}
        totalItems={total}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
