"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

const translations = {
  en: {
    title: "Referrers",
    records: "records",
    searchPlaceholder: "Search by name, email, company...",
    filterByCompany: "Filter by company",
    allStatuses: "All statuses",
    allApprovals: "All approvals",
    pending: "Pending",
    approved: "Approved",
    denied: "Denied",
    irref: "iRREF",
    name: "Name",
    email: "Email",
    company: "Company",
    industry: "Industry",
    approval: "Approval",
    workType: "Work Type",
    status: "Status",
    quickEdit: "Quick edit",
    updates: "updates",
    update: "update",
    newApproval: "New",
    pendingCompanies: "companies",
    pendingCompany: "company",
    emptyTitle: "No referrers yet",
    emptyDescription: "Referrers will appear here once they sign up through the referrer registration form. Try adjusting your filters if you expected to see results.",
  },
  fr: {
    title: "Référents",
    records: "enregistrements",
    searchPlaceholder: "Rechercher par nom, courriel, entreprise...",
    filterByCompany: "Filtrer par entreprise",
    allStatuses: "Tous les statuts",
    allApprovals: "Toutes les approbations",
    pending: "En attente",
    approved: "Approuvé",
    denied: "Refusé",
    irref: "iRREF",
    name: "Nom",
    email: "Courriel",
    company: "Entreprise",
    industry: "Industrie",
    approval: "Approbation",
    workType: "Type de travail",
    status: "Statut",
    quickEdit: "Modification rapide",
    updates: "mises à jour",
    update: "mise à jour",
    newApproval: "Nouveau",
    pendingCompanies: "entreprises",
    pendingCompany: "entreprise",
    emptyTitle: "Aucun référent",
    emptyDescription: "Les référents apparaîtront ici une fois inscrits via le formulaire d'inscription. Essayez d'ajuster vos filtres si vous vous attendiez à voir des résultats.",
  },
};

type ReferrerRecord = {
  irref: string;
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIrcrn?: string;
  companyApproval?: string;
  companyIndustry: string;
  careersPortal?: string;
  workType: string;
  linkedin: string;
  pendingUpdates?: string;
  pendingUpdateCount?: number;
  pendingCompanyCount?: number;
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  missingFields: string[];
};

const statusOptions = ["", "New", "Engaged", "Active", "Paused", "Closed"];

const PAGE_SIZE = 10;

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08ZM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0l-1.35 1.35 3.75 3.75 1.35-1.35Z"
      />
    </svg>
  );
}

function ReferrersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { language } = useLanguage();
  const t = translations[language];

  const [items, setItems] = useState<ReferrerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, companyFilter, approvalFilter]);

  const fetchReferrers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((currentPage - 1) * PAGE_SIZE));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (companyFilter) params.set("company", companyFilter);
    if (approvalFilter) params.set("approval", approvalFilter);

    const response = await fetch(`/api/founder/referrers?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      const nextItems =
        (data.items ?? []).map((item: ReferrerRecord) => ({
          ...item,
          companyApproval: item.companyApproval || "approved",
        })) ?? [];
      setItems(nextItems);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReferrers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, companyFilter, approvalFilter, currentPage]);

  const handleRowClick = useCallback(
    (row: ReferrerRecord) => {
      const id = row.irref?.trim();
      if (!id) return;
      router.push(`/founder/referrers/${encodeURIComponent(id)}`);
    },
    [router],
  );

  const columns = useMemo<OpsColumn<ReferrerRecord>[]>(
    () => [
      {
        key: "irref",
        label: t.irref,
        sortable: true,
        nowrap: true,
        ellipsis: true,
        width: "200px",
        render: (row) => <span title={row.irref}>{row.irref}</span>,
      },
      {
        key: "name",
        label: t.name,
        sortable: true,
        ellipsis: true,
        width: "240px",
        render: (row) => (
          <div className="referrer-name-cell">
            <span>{row.name}</span>
            {row.pendingUpdateCount && row.pendingUpdateCount > 0 ? (
              <span
                className="pending-updates-badge"
                title={`${row.pendingUpdateCount} ${row.pendingUpdateCount > 1 ? t.updates : t.update}`}
              >
                {row.pendingUpdateCount} {row.pendingUpdateCount > 1 ? t.updates : t.update}
              </span>
            ) : null}
            {(() => {
              const isNew = !row.companyApproval || row.companyApproval === 'pending';
              const pendingCount = row.pendingCompanyCount ?? 0;
              const hasPendingCompanies = pendingCount > 0;
              if (isNew && hasPendingCompanies) {
                const companiesText = `${pendingCount} ${pendingCount > 1 ? t.pendingCompanies : t.pendingCompany}`;
                return (
                  <span className="pending-approval-badge" title={`${t.newApproval}, ${companiesText}`}>
                    {t.newApproval}, {companiesText}
                  </span>
                );
              }
              if (hasPendingCompanies) {
                return (
                  <span
                    className="pending-updates-badge"
                    title={`${pendingCount} ${pendingCount > 1 ? t.pendingCompanies : t.pendingCompany}`}
                  >
                    {pendingCount} {pendingCount > 1 ? t.pendingCompanies : t.pendingCompany}
                  </span>
                );
              }
              if (isNew) {
                return (
                  <span className="pending-approval-badge" title={t.newApproval}>
                    {t.newApproval}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        ),
      },
      { key: "email", label: t.email, ellipsis: true, width: "320px" },
      { key: "company", label: t.company, sortable: true, ellipsis: true, width: "240px" },
      { key: "companyIndustry", label: t.industry, sortable: true, ellipsis: true, width: "240px" },
      {
        key: "companyApproval",
        label: t.approval,
        sortable: true,
        nowrap: true,
        width: "160px",
        align: "center",
        render: (row) => {
          const label = row.companyApproval || "pending";
          const value = label.toLowerCase();
          if (value === "approved") {
            return (
              <span className="founder-pill founder-pill--success" data-no-row-click>
                {t.approved}
              </span>
            );
          }
          if (value === "denied") {
            return (
              <span className="founder-pill" data-no-row-click>
                {t.denied}
              </span>
            );
          }
          if (value === "pending") {
            return (
              <span className="founder-pill founder-pill--muted" data-no-row-click>
                {t.pending}
              </span>
            );
          }
          return (
            <span className="founder-pill founder-pill--muted" data-no-row-click>
              {label}
            </span>
          );
        },
      },
      { key: "workType", label: t.workType, nowrap: true, width: "160px" },
      { key: "status", label: t.status, sortable: true, nowrap: true, width: "140px", align: "center" },
      {
        key: "quickEdit",
        label: "",
        width: "72px",
        align: "right",
        render: (row) => {
          const id = row.irref?.trim();
          if (!id) return null;
          const href = `/founder/referrers/${encodeURIComponent(id)}?edit=1`;
          return (
            <ActionBtn
              as="link"
              href={href}
              variant="ghost"
              size="sm"
              title={t.quickEdit}
              aria-label={t.quickEdit}
              className="founder-quick-edit-btn"
              data-no-row-click
              onClick={(event) => event.stopPropagation()}
            >
              <PencilIcon />
            </ActionBtn>
          );
        },
      },
    ],
    [t],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: "text",
        key: "company",
        placeholder: t.filterByCompany,
        value: companyFilter,
        onChange: setCompanyFilter,
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
      {
        type: "select",
        key: "approval",
        label: t.allApprovals,
        value: approvalFilter,
        options: [
          { value: "pending", label: t.pending },
          { value: "approved", label: t.approved },
          { value: "denied", label: t.denied },
        ],
        onChange: setApprovalFilter,
      },
    ],
    [companyFilter, statusFilter, approvalFilter, t],
  );

  return (
    <div className="founder-page">
      <Topbar
        title={t.title}
        subtitle={`${total} ${t.records}`}
        searchValue={searchInput}
        searchPlaceholder={t.searchPlaceholder}
        onSearchChange={setSearchInput}
      />

      <FilterBar filters={filters} />

      <OpsDataTable<ReferrerRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="referrers"
            title={t.emptyTitle}
            description={t.emptyDescription}
          />
        }
        onRowClick={handleRowClick}
        rowAriaLabel={(row) =>
          row.email ? `Open referrer review for ${row.email}` : `Open referrer review for ${row.irref}`
        }
        tableClassName="referrers-table"
        pageSize={PAGE_SIZE}
        totalItems={total}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default function ReferrersPage() {
  return (
    <Suspense>
      <ReferrersPageContent />
    </Suspense>
  );
}
