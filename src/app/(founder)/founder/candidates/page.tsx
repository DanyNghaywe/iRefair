"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ActionBtn } from "@/components/ActionBtn";
import { Badge } from "@/components/founder/Badge";
import { Drawer } from "@/components/founder/Drawer";
import { OpsDataTable, type OpsColumn } from "@/components/founder/OpsDataTable";
import { Skeleton } from "@/components/founder/Skeleton";
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

type ApplicationRecord = {
  id: string;
  timestamp: string;
  candidateId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  status: string;
  ownerNotes: string;
};

const statusOptions = ["", "New", "Reviewed", "In Progress", "On Hold", "Closed"];
const yesNoOptions = ["", "Yes", "No"];
const employmentOptions = ["", "Yes", "No", "Temporary Work"];

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
  const [selected, setSelected] = useState<CandidateRecord | null>(null);
  const [editProfile, setEditProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [locatedCanada, setLocatedCanada] = useState("");
  const [province, setProvince] = useState("");
  const [workAuthorization, setWorkAuthorization] = useState("");
  const [eligibleMoveCanada, setEligibleMoveCanada] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [languages, setLanguages] = useState("");
  const [languagesOther, setLanguagesOther] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [industryOther, setIndustryOther] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const skipProfileAutosaveRef = useRef(true);

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

  useEffect(() => {
    if (!selected) return;
    setNotes(selected.ownerNotes || "");
    setTags(selected.tags || "");
    setStatus((selected.status || "").toLowerCase());
    setActionMessage(null);
    setActionError(null);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setFirstName(selected.firstName || "");
    setMiddleName(selected.middleName || "");
    setFamilyName(selected.familyName || "");
    setEmail(selected.email || "");
    setPhone(selected.phone || "");
    setLocatedCanada(selected.locatedCanada || "");
    setProvince(selected.province || "");
    setWorkAuthorization(selected.workAuthorization || "");
    setEligibleMoveCanada(selected.eligibleMoveCanada || "");
    setCountryOfOrigin(selected.countryOfOrigin || "");
    setLanguages(selected.languages || "");
    setLanguagesOther(selected.languagesOther || "");
    setIndustryType(selected.industryType || "");
    setIndustryOther(selected.industryOther || "");
    setEmploymentStatus(selected.employmentStatus || "");
    skipProfileAutosaveRef.current = true;
  }, [selected?.irain]);

  const fetchApplications = async (irain: string) => {
    setAppsLoading(true);
    const params = new URLSearchParams({ search: irain, limit: "10", offset: "0" });
    const response = await fetch(`/api/founder/applications?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) setApplications(data.items ?? []);
    setAppsLoading(false);
  };

  const handleRequestResume = async () => {
    if (!selected) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/candidates/${encodeURIComponent(selected.irain)}/request-resume`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || "Unable to send request.");
      } else {
        setActionMessage("Resume request sent.");
        updateLocalCandidate(selected.irain, { status: "resume requested" });
        setStatus("resume requested");
      }
    } catch (error) {
      console.error("Request resume failed", error);
      setActionError("Unable to send request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRowClick = (row: CandidateRecord) => {
    setEditProfile(false);
    setSelected(row);
    fetchApplications(row.irain);
  };

  const computeEligibility = (located: string, eligibleMove: string) => {
    const locatedYes = located.trim().toLowerCase() === "yes";
    const eligibleYes = eligibleMove.trim().toLowerCase() === "yes";
    const eligible = locatedYes || eligibleYes;
    const reason = eligible ? (locatedYes ? "In Canada" : "Can move in 6 months") : "Not eligible";
    return { eligible, reason };
  };

  const updateLocalCandidate = (irain: string, patch: Partial<CandidateRecord>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.irain !== irain) return item;
        const next = { ...item, ...patch };
        if ("locatedCanada" in patch || "eligibleMoveCanada" in patch) {
          next.eligibility = computeEligibility(next.locatedCanada, next.eligibleMoveCanada);
        }
        return next;
      }),
    );
    setSelected((prev) => {
      if (!prev || prev.irain !== irain) return prev;
      const next = { ...prev, ...patch };
      if ("locatedCanada" in patch || "eligibleMoveCanada" in patch) {
        next.eligibility = computeEligibility(next.locatedCanada, next.eligibleMoveCanada);
      }
      return next;
    });
  };

  const patchCandidate = async (irain: string, patch: Record<string, string>) => {
    setSaving(true);
    await fetch(`/api/founder/candidates/${encodeURIComponent(irain)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocalCandidate(irain, patch as Partial<CandidateRecord>);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(() => {
      patchCandidate(selected.irain, { ownerNotes: notes, tags, status });
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tags, status]);

  useEffect(() => {
    if (!selected) return;
    if (skipProfileAutosaveRef.current) {
      skipProfileAutosaveRef.current = false;
      return;
    }
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    addIfChanged("firstName", firstName, selected.firstName || "");
    addIfChanged("middleName", middleName, selected.middleName || "");
    addIfChanged("familyName", familyName, selected.familyName || "");
    addIfChanged("email", email, selected.email || "");
    addIfChanged("phone", phone, selected.phone || "");
    addIfChanged("locatedCanada", locatedCanada, selected.locatedCanada || "");
    addIfChanged("province", province, selected.province || "");
    addIfChanged("workAuthorization", workAuthorization, selected.workAuthorization || "");
    addIfChanged("eligibleMoveCanada", eligibleMoveCanada, selected.eligibleMoveCanada || "");
    addIfChanged("countryOfOrigin", countryOfOrigin, selected.countryOfOrigin || "");
    addIfChanged("languages", languages, selected.languages || "");
    addIfChanged("languagesOther", languagesOther, selected.languagesOther || "");
    addIfChanged("industryType", industryType, selected.industryType || "");
    addIfChanged("industryOther", industryOther, selected.industryOther || "");
    addIfChanged("employmentStatus", employmentStatus, selected.employmentStatus || "");

    if (!Object.keys(patch).length) return;

    const timer = setTimeout(() => {
      patchCandidate(selected.irain, patch);
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    firstName,
    middleName,
    familyName,
    email,
    phone,
    locatedCanada,
    province,
    workAuthorization,
    eligibleMoveCanada,
    countryOfOrigin,
    languages,
    languagesOther,
    industryType,
    industryOther,
    employmentStatus,
    selected?.irain,
  ]);

  const eligibilityBadge = (eligibility: CandidateRecord["eligibility"]) => {
    const tone = eligibility.eligible ? "success" : "danger";
    return <Badge tone={tone}>{eligibility.reason}</Badge>;
  };

  const profileEligibility = useMemo(
    () => computeEligibility(locatedCanada, eligibleMoveCanada),
    [locatedCanada, eligibleMoveCanada],
  );

  const columns = useMemo<OpsColumn<CandidateRecord>[]>(
    () => [
      { key: "irain", label: "iRAIN", sortable: true, width: "220px", nowrap: true },
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
        render: (row: CandidateRecord) => eligibilityBadge(row.eligibility),
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
                setSelected(row);
                setEditProfile(true);
                fetchApplications(row.irain);
              }}
            >
              <PencilIcon />
            </ActionBtn>
          </span>
        ),
      },
    ],
    [],
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

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.firstName || "Candidate"} (${selected.irain})` : ""}
        description={selected?.email}
        actions={
          <div className="founder-actions">
            <ActionBtn
              as="button"
              variant="primary"
              onClick={() => selected && patchCandidate(selected.irain, { status: "reviewed" })}
              disabled={!selected}
            >
              Mark Reviewed
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              onClick={handleRequestResume}
              disabled={!selected || actionLoading}
            >
              {actionLoading ? "Sending..." : "Request updated resume"}
            </ActionBtn>
            <ActionBtn
              as="button"
              variant="ghost"
              onClick={() => setEditProfile((prev) => !prev)}
              disabled={!selected}
            >
              {editProfile ? "Done editing" : "Edit profile"}
            </ActionBtn>
          </div>
        }
        footer={
          <div className="founder-drawer__footer-meta">
            {saving ? "Saving..." : savedAt ? `Saved ${savedAt}` : "Live autosave"}
            {actionMessage ? <span className="founder-pill founder-pill--success">{actionMessage}</span> : null}
            {actionError ? <span className="founder-pill">{actionError}</span> : null}
          </div>
        }
      >
        {selected ? (
          <div className="founder-drawer__grid">
            <section>
              <h3>Profile</h3>
              {editProfile ? (
                <>
                  <div className="founder-fieldset">
                    <label>First Name</label>
                    <input type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Middle Name</label>
                    <input type="text" value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Family Name</label>
                    <input type="text" value={familyName} onChange={(event) => setFamilyName(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Email</label>
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Phone</label>
                    <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Located in Canada</label>
                    <select value={locatedCanada} onChange={(event) => setLocatedCanada(event.target.value)}>
                      {yesNoOptions.map((value) => (
                        <option key={value} value={value}>
                          {value || "Select"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="founder-fieldset">
                    <label>Province</label>
                    <input type="text" value={province} onChange={(event) => setProvince(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Work Authorization</label>
                    <select
                      value={workAuthorization}
                      onChange={(event) => setWorkAuthorization(event.target.value)}
                    >
                      {yesNoOptions.map((value) => (
                        <option key={value} value={value}>
                          {value || "Select"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="founder-fieldset">
                    <label>Eligible to Move (6 Months)</label>
                    <select
                      value={eligibleMoveCanada}
                      onChange={(event) => setEligibleMoveCanada(event.target.value)}
                    >
                      {yesNoOptions.map((value) => (
                        <option key={value} value={value}>
                          {value || "Select"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="founder-fieldset">
                    <label>Country of Origin</label>
                    <input
                      type="text"
                      value={countryOfOrigin}
                      onChange={(event) => setCountryOfOrigin(event.target.value)}
                    />
                  </div>
                  <div className="founder-fieldset">
                    <label>Languages</label>
                    <input type="text" value={languages} onChange={(event) => setLanguages(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Languages Other</label>
                    <input
                      type="text"
                      value={languagesOther}
                      onChange={(event) => setLanguagesOther(event.target.value)}
                    />
                  </div>
                  <div className="founder-fieldset">
                    <label>Industry Type</label>
                    <input type="text" value={industryType} onChange={(event) => setIndustryType(event.target.value)} />
                  </div>
                  <div className="founder-fieldset">
                    <label>Industry Other</label>
                    <input
                      type="text"
                      value={industryOther}
                      onChange={(event) => setIndustryOther(event.target.value)}
                    />
                  </div>
                  <div className="founder-fieldset">
                    <label>Employment Status</label>
                    <select value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value)}>
                      {employmentOptions.map((value) => (
                        <option key={value} value={value}>
                          {value || "Select"}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="founder-field">
                    <span>First Name</span>
                    <strong>{firstName || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Middle Name</span>
                    <strong>{middleName || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Family Name</span>
                    <strong>{familyName || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Email</span>
                    <strong>{email || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Phone</span>
                    <strong>{phone || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Located in Canada</span>
                    <strong>{locatedCanada || "Unknown"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Province</span>
                    <strong>{province || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Work Authorization</span>
                    <strong>{workAuthorization || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Eligible to Move (6 Months)</span>
                    <strong>{eligibleMoveCanada || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Country of Origin</span>
                    <strong>{countryOfOrigin || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Languages</span>
                    <strong>{languages || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Languages Other</span>
                    <strong>{languagesOther || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Industry Type</span>
                    <strong>{industryType || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Industry Other</span>
                    <strong>{industryOther || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>Employment Status</span>
                    <strong>{employmentStatus || "-"}</strong>
                  </div>
                </>
              )}
              <div className="founder-field">
                <span>Eligibility</span>
                {eligibilityBadge(profileEligibility)}
              </div>
            </section>

            <section>
              <h3>Applications</h3>
              {appsLoading ? (
                <div className="founder-stack">
                  <Skeleton width="100%" height={12} />
                  <Skeleton width="80%" height={12} />
                </div>
              ) : applications.length === 0 ? (
                <p className="founder-card__meta">No applications yet.</p>
              ) : (
                <ul className="founder-list">
                  {applications.map((app) => (
                    <li key={app.id}>
                      <div className="founder-list__title">
                        {app.position || "Application"} <Badge tone="neutral">{app.iCrn}</Badge>
                      </div>
                      <div className="founder-list__meta">
                        {app.id} · {app.status || "Unassigned"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="founder-fieldset">
              <label>Status</label>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Unassigned</option>
                {statusOptions
                  .filter((value) => value)
                  .map((value) => (
                    <option key={value} value={value.toLowerCase()}>
                      {value}
                    </option>
                  ))}
              </select>
            </section>

            <section className="founder-fieldset">
              <label>Owner Notes</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context, outreach details, blockers..."
              />
            </section>

            <section className="founder-fieldset">
              <label>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Comma separated tags"
              />
            </section>

            <section>
              <h3>Data quality</h3>
              {selected.missingFields.length ? (
                <div className="founder-pill">{selected.missingFields.join(", ")}</div>
              ) : (
                <div className="founder-pill founder-pill--success">Complete</div>
              )}
            </section>
          </div>
        ) : (
          <p className="founder-card__meta">Select a candidate to view details.</p>
        )}
      </Drawer>
    </div>
  );
}
