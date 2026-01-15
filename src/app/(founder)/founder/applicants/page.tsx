"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/founder/Badge";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

const translations = {
  en: {
    title: "Candidates",
    records: "records",
    searchPlaceholder: "Search by name, email, iRAIN...",
    allEligibility: "All eligibility",
    eligible: "Eligible",
    ineligible: "Ineligible",
    allStatuses: "All statuses",
    irain: "iRAIN",
    name: "Name",
    email: "Email",
    phone: "Phone",
    eligibility: "Eligibility",
    status: "Status",
    province: "Province",
    quickEdit: "Quick edit",
    emptyTitle: "No candidates yet",
    emptyDescription: "Candidates will appear here once they register through the intake form. Check back soon or adjust your filters.",
  },
  fr: {
    title: "Candidats",
    records: "enregistrements",
    searchPlaceholder: "Rechercher par nom, courriel, iRAIN...",
    allEligibility: "Toutes les éligibilités",
    eligible: "Éligible",
    ineligible: "Non éligible",
    allStatuses: "Tous les statuts",
    irain: "iRAIN",
    name: "Nom",
    email: "Courriel",
    phone: "Téléphone",
    eligibility: "Éligibilité",
    status: "Statut",
    province: "Province",
    quickEdit: "Modification rapide",
    emptyTitle: "Aucun candidat",
    emptyDescription: "Les candidats apparaîtront ici une fois inscrits via le formulaire d'inscription. Revenez bientôt ou ajustez vos filtres.",
  },
};

type CandidateRecord = {
  irain: string;
  timestamp: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  phone: string;
  locatedCanada: string;
  province: string;
  workAuthorization: string;
  eligibleMoveCanada: string;
  countryOfOrigin: string;
  languages: string;
  languagesOther: string;
  industryType: string;
  industryOther: string;
  employmentStatus: string;
  legacyCandidateId: string;
  status: string;
  registrationStatus: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  eligibility: { eligible: boolean; reason: string };
  missingFields: string[];
};

const statusOptions = ["", "New", "Reviewed", "In Progress", "On Hold", "Closed"];

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

const PAGE_SIZE = 10;

function CandidatesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { language } = useLanguage();
  const t = translations[language];

  const [items, setItems] = useState<CandidateRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [eligibleFilter, setEligibleFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, eligibleFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((currentPage - 1) * PAGE_SIZE));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (eligibleFilter === "eligible") params.set("eligible", "true");
    if (eligibleFilter === "ineligible") params.set("eligible", "false");

    const response = await fetch(`/api/founder/applicants?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) {
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, eligibleFilter, currentPage]);

  const handleRowClick = (row: CandidateRecord) => {
    router.push(`/founder/applicants/${encodeURIComponent(row.irain)}`);
  };

  const columns = useMemo<OpsColumn<CandidateRecord>[]>(
    () => [
      {
        key: "irain",
        label: t.irain,
        sortable: true,
        width: "220px",
        nowrap: true,
        ellipsis: true,
        render: (row: CandidateRecord) => <span title={row.irain}>{row.irain}</span>,
      },
      {
        key: "firstName",
        label: t.name,
        width: "200px",
        nowrap: true,
        ellipsis: true,
        render: (row: CandidateRecord) =>
          [row.firstName, row.middleName, row.familyName].filter(Boolean).join(" ") || "-",
        sortable: true,
      },
      { key: "email", label: t.email, width: "320px", nowrap: true, ellipsis: true },
      { key: "phone", label: t.phone, width: "180px", nowrap: true },
      {
        key: "eligibility",
        label: t.eligibility,
        width: "180px",
        nowrap: true,
        render: (row: CandidateRecord) => (
          <Badge tone={row.eligibility.eligible ? "success" : "danger"}>{row.eligibility.reason}</Badge>
        ),
      },
      {
        key: "status",
        label: t.status,
        width: "180px",
        nowrap: true,
        sortable: true,
        render: (row: CandidateRecord) => {
          if (row.status) return row.status;
          if (row.registrationStatus) {
            return <Badge tone="warning">{row.registrationStatus}</Badge>;
          }
          return "-";
        },
      },
      { key: "province", label: t.province, width: "140px", nowrap: true, sortable: true },
      {
        key: "quickEdit",
        label: "",
        width: "72px",
        align: "right",
        render: (row: CandidateRecord) => {
          const id = row.irain?.trim();
          if (!id) return null;
          const href = `/founder/applicants/${encodeURIComponent(id)}?edit=1`;
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
        type: "select",
        key: "eligibility",
        label: t.allEligibility,
        value: eligibleFilter === "all" ? "" : eligibleFilter,
        options: [
          { value: "eligible", label: t.eligible },
          { value: "ineligible", label: t.ineligible },
        ],
        onChange: (value) => setEligibleFilter(value === "" ? "all" : (value as "eligible" | "ineligible")),
      },
      {
        type: "select",
        key: "status",
        label: t.allStatuses,
        value: statusFilter,
        options: statusOptions
          .filter((status) => status)
          .map((value) => ({ value: value.toLowerCase(), label: value })),
        onChange: setStatusFilter,
      },
    ],
    [eligibleFilter, statusFilter, t],
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

      {/* Candidates table reference:
          - Wrapper chain: founder-page -> OpsDataTable (adds founder-card) -> DataTable -> div.founder-table > .founder-table__container (overflow: auto scroll) > table.data-table.candidates-table.
          - Layout: table-layout: fixed via .founder-table table and .ops-scope .data-table; colgroup uses the width props here (iRAIN 220px, Name 200px, Email 320px, Phone 180px, Eligibility/Status/Province 140px).
          - Overflow rules: col-nowrap/col-clip classes (nowrap + ellipsis) from globals; .candidates-table nth-child(1) is nowrap, cols 2-3 are nowrap + ellipsis; the container supplies scroll and thead is sticky.
          - Safety/selectors: runs inside .ops-scope with .founder-card/.founder-table/.data-table/.candidates-table/.col-*; ops grid keeps .ops-main min-width: 0 to prevent overflow blowouts. */}
      <OpsDataTable<CandidateRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="candidates"
            title={t.emptyTitle}
            description={t.emptyDescription}
          />
        }
        onRowClick={handleRowClick}
        tableClassName="candidates-table"
        pageSize={PAGE_SIZE}
        totalItems={total}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense>
      <CandidatesPageContent />
    </Suspense>
  );
}
