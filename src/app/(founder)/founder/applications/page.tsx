"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/founder/Badge";
import { EmptyState } from "@/components/founder/EmptyState";
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
  "Hired",
  "In Review",
  "Submitted",
  "On Hold",
  "Closed",
];

export default function ApplicationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ApplicationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ircrnFilter, setIrcrnFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchApplications = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", "0");
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
  }, [search, statusFilter, ircrnFilter]);

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

  return (
    <div className="founder-page">
      <Topbar
        title="Applications"
        subtitle={`${total} records`}
        searchValue={searchInput}
        searchPlaceholder="Search by ID, candidate, position..."
        onSearchChange={setSearchInput}
        actions={
          <div className="founder-toolbar">
            <input
              type="text"
              placeholder="Filter iRCRN"
              value={ircrnFilter}
              onChange={(event) => setIrcrnFilter(event.target.value)}
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
          </div>
        }
      />

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
      />
    </div>
  );
}
