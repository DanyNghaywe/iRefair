"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

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
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  missingFields: string[];
};

const statusOptions = ["", "New", "Engaged", "Active", "Paused", "Closed"];

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

export default function ReferrersPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReferrerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchReferrers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
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
  }, [search, statusFilter, companyFilter, approvalFilter]);

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
        label: "iRREF",
        sortable: true,
        nowrap: true,
        ellipsis: true,
        width: "200px",
        render: (row) => <span title={row.irref}>{row.irref}</span>,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        ellipsis: true,
        width: "240px",
        render: (row) => (
          <div className="referrer-name-cell">
            <span>{row.name}</span>
            {row.pendingUpdateCount && row.pendingUpdateCount > 0 ? (
              <span
                className="pending-updates-badge"
                title={`${row.pendingUpdateCount} pending update${row.pendingUpdateCount > 1 ? "s" : ""}`}
              >
                {row.pendingUpdateCount} update{row.pendingUpdateCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        ),
      },
      { key: "email", label: "Email", ellipsis: true, width: "320px" },
      { key: "company", label: "Company", sortable: true, ellipsis: true, width: "240px" },
      { key: "companyIndustry", label: "Industry", sortable: true, ellipsis: true, width: "240px" },
      {
        key: "companyApproval",
        label: "Approval",
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
                Approved
              </span>
            );
          }
          if (value === "denied") {
            return (
              <span className="founder-pill" data-no-row-click>
                Denied
              </span>
            );
          }
          if (value === "pending") {
            return (
              <span className="founder-pill founder-pill--muted" data-no-row-click>
                Pending
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
      { key: "workType", label: "Work Type", nowrap: true, width: "160px" },
      { key: "status", label: "Status", sortable: true, nowrap: true, width: "140px", align: "center" },
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
              title="Quick edit"
              aria-label="Quick edit"
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
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: "text",
        key: "company",
        placeholder: "Filter by company",
        value: companyFilter,
        onChange: setCompanyFilter,
      },
      {
        type: "select",
        key: "status",
        label: "All statuses",
        value: statusFilter,
        options: statusOptions
          .filter((value) => value)
          .map((value) => ({ value: value.toLowerCase(), label: value })),
        onChange: setStatusFilter,
      },
      {
        type: "select",
        key: "approval",
        label: "All approvals",
        value: approvalFilter,
        options: [
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "denied", label: "Denied" },
        ],
        onChange: setApprovalFilter,
      },
    ],
    [companyFilter, statusFilter, approvalFilter],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Referrers"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by name, email, company..."
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
            title="No referrers yet"
            description="Referrers will appear here once they sign up through the referrer registration form. Try adjusting your filters if you expected to see results."
          />
        }
        onRowClick={handleRowClick}
        rowAriaLabel={(row) =>
          row.email ? `Open referrer review for ${row.email}` : `Open referrer review for ${row.irref}`
        }
        tableClassName="referrers-table"
      />
    </div>
  );
}
