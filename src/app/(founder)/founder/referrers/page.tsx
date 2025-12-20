"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  missingFields: string[];
};

const statusOptions = ["", "New", "Engaged", "Active", "Paused", "Closed"];

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
      { key: "irref", label: "iRREF", sortable: true, nowrap: true, width: "200px" },
      { key: "name", label: "Name", sortable: true, ellipsis: true, width: "200px" },
      { key: "email", label: "Email", ellipsis: true, width: "320px" },
      { key: "company", label: "Company", sortable: true, ellipsis: true, width: "240px" },
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
    ],
    [],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Referrers"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by name, email, company..."
        onSearchChange={setSearchInput}
        actions={
          <div className="founder-toolbar">
            <input
              type="text"
              placeholder="Filter company"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {statusOptions
                .filter((value) => value)
                .map((value) => (
                  <option key={value} value={value.toLowerCase()}>
                    {value}
                  </option>
                ))}
            </select>
            <select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)}>
              <option value="">All approvals</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>
        }
      />

      <OpsDataTable<ReferrerRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState="No referrers match your filters."
        onRowClick={handleRowClick}
        rowAriaLabel={(row) =>
          row.email ? `Open referrer review for ${row.email}` : `Open referrer review for ${row.irref}`
        }
        tableClassName="referrers-table"
      />
    </div>
  );
}
