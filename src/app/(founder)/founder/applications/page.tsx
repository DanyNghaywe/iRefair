"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/founder/Badge";
import { EmptyState } from "@/components/founder/EmptyState";
import { FilterBar, type FilterConfig } from "@/components/founder/FilterBar";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Topbar } from "@/components/founder/Topbar";

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
        label: "ID",
        sortable: true,
        nowrap: true,
        ellipsis: true,
        width: "220px",
        render: (row: ApplicationRecord) => <span title={row.id}>{row.id}</span>,
      },
      { key: "applicantId", label: "Applicant", sortable: true, ellipsis: true, width: "240px" },
      { key: "referrerIrref", label: "Referrer", sortable: true, ellipsis: true, width: "240px" },
      { key: "iCrn", label: "iRCRN", sortable: true, nowrap: true, width: "200px" },
      { key: "position", label: "Position", sortable: true, ellipsis: true, width: "320px" },
      {
        key: "status",
        label: "Status",
        nowrap: true,
        width: "140px",
        align: "center",
        render: (row: ApplicationRecord) => <Badge tone="neutral">{row.status || "Unassigned"}</Badge>,
      },
    ],
    [],
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        type: "text",
        key: "ircrn",
        placeholder: "Filter by iRCRN",
        value: ircrnFilter,
        onChange: setIrcrnFilter,
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
    ],
    [ircrnFilter, statusFilter],
  );

  return (
    <div className="founder-page">
      <Topbar
        title="Applications"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by ID, candidate, position..."
        onSearchChange={setSearchInput}
      />

      <FilterBar filters={filters} />

      <OpsDataTable<ApplicationRecord>
        columns={columns}
        data={items}
        loading={loading}
        emptyState={
          <EmptyState
            variant="applications"
            title="No applications yet"
            description="Applications will appear here when candidates submit their resumes for positions. Try adjusting your filters or check back later."
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
