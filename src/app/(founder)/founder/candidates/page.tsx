"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { Badge } from "@/components/founder/Badge";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

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

export default function CandidatesPage() {
  const [items, setItems] = useState<CandidateRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [eligibleFilter, setEligibleFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCandidates = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (eligibleFilter === "eligible") params.set("eligible", "true");
    if (eligibleFilter === "ineligible") params.set("eligible", "false");

    const response = await fetch(`/api/founder/candidates?${params.toString()}`, { cache: "no-store" });
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
  }, [search, statusFilter, eligibleFilter]);

  const handleRowClick = (row: CandidateRecord) => {
    router.push(`/founder/candidates/${encodeURIComponent(row.irain)}`);
  };

  const columns = useMemo<OpsColumn<CandidateRecord>[]>(
    () => [
      {
        key: "irain",
        label: "iRAIN",
        sortable: true,
        width: "220px",
        nowrap: true,
        ellipsis: true,
        render: (row: CandidateRecord) => <span title={row.irain}>{row.irain}</span>,
      },
      {
        key: "firstName",
        label: "Name",
        width: "200px",
        nowrap: true,
        ellipsis: true,
        render: (row: CandidateRecord) =>
          [row.firstName, row.middleName, row.familyName].filter(Boolean).join(" ") || "-",
        sortable: true,
      },
      { key: "email", label: "Email", width: "320px", nowrap: true, ellipsis: true },
      { key: "phone", label: "Phone", width: "180px", nowrap: true },
      {
        key: "eligibility",
        label: "Eligibility",
        width: "140px",
        nowrap: true,
        render: (row: CandidateRecord) => (
          <Badge tone={row.eligibility.eligible ? "success" : "danger"}>{row.eligibility.reason}</Badge>
        ),
      },
      { key: "status", label: "Status", width: "140px", nowrap: true, sortable: true },
      { key: "province", label: "Province", width: "140px", nowrap: true, sortable: true },
      {
        key: "quickEdit",
        label: "",
        width: "84px",
        align: "center",
        render: (row: CandidateRecord) => (
          <span data-no-row-click>
            <ActionBtn
              as="button"
              variant="ghost"
              size="sm"
              title="Quick edit"
              aria-label="Quick edit candidate"
              className="founder-quick-edit-btn"
              onClick={(event) => {
                event.stopPropagation();
                router.push(`/founder/candidates/${encodeURIComponent(row.irain)}?edit=1`);
              }}
            >
              <PencilIcon />
            </ActionBtn>
          </span>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Candidates"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by name, email, iRAIN..."
        onSearchChange={setSearchInput}
        actions={
          <div className="founder-toolbar">
            <select
              value={eligibleFilter}
              onChange={(event) =>
                setEligibleFilter(event.target.value as "all" | "eligible" | "ineligible")
              }
            >
              <option value="all">Eligibility</option>
              <option value="eligible">Eligible</option>
              <option value="ineligible">Ineligible</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {statusOptions
                .filter((status) => status)
                .map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {value}
                  </option>
                ))}
            </select>
          </div>
        }
      />

      {/* Candidates table reference:
          - Wrapper chain: founder-page -> OpsDataTable (adds founder-card) -> DataTable -> div.founder-table > .founder-table__container (overflow: auto scroll) > table.data-table.candidates-table.
          - Layout: table-layout: fixed via .founder-table table and .ops-scope .data-table; colgroup uses the width props here (iRAIN 220px, Name 200px, Email 320px, Phone 180px, Eligibility/Status/Province 140px).
          - Overflow rules: col-nowrap/col-clip classes (nowrap + ellipsis) from globals; .candidates-table nth-child(1) is nowrap, cols 2-3 are nowrap + ellipsis; the container supplies scroll and thead is sticky.
          - Safety/selectors: runs inside .ops-scope with .founder-card/.founder-table/.data-table/.candidates-table/.col-*; ops grid keeps .ops-main min-width: 0 to prevent overflow blowouts. */}
      <OpsDataTable<CandidateRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState="No candidates match your filters."
        onRowClick={handleRowClick}
        tableClassName="candidates-table"
      />
    </div>
  );
}
