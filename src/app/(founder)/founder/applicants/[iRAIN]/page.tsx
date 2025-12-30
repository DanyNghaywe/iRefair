"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { AutosaveHint } from "@/components/founder/AutosaveHint";
import { Badge } from "@/components/founder/Badge";
import { DetailPageShell } from "@/components/founder/DetailPageShell";
import { DetailSection } from "@/components/founder/DetailSection";
import { Skeleton, SkeletonDetailGrid, SkeletonStack } from "@/components/founder/Skeleton";
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

const computeEligibility = (located: string, eligibleMove: string) => {
  const locatedYes = located.trim().toLowerCase() === "yes";
  const eligibleYes = eligibleMove.trim().toLowerCase() === "yes";
  const eligible = locatedYes || eligibleYes;
  const reason = eligible ? (locatedYes ? "In Canada" : "Can move in 6 months") : "Not eligible";
  return { eligible, reason };
};

export default function CandidateReviewPage() {
  const params = useParams();
  const rawId = params?.iRAIN ?? params?.irain;
  const irain = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanIrain = typeof irain === "string" ? irain.trim() : "";
  const searchParams = useSearchParams();
  const initialEdit = searchParams?.get("edit") === "1";

  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editDetails, setEditDetails] = useState(initialEdit);

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
  const [lastContactedAt, setLastContactedAt] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const skipAutosaveRef = useRef(true);
  const skipDetailsAutosaveRef = useRef(true);

  const fullName = useMemo(
    () => [firstName, middleName, familyName].filter(Boolean).join(" ").trim(),
    [firstName, middleName, familyName],
  );

  const profileEligibility = useMemo(
    () => computeEligibility(locatedCanada, eligibleMoveCanada),
    [locatedCanada, eligibleMoveCanada],
  );

  const fetchCandidate = useCallback(async () => {
    if (!cleanIrain) return;
    setLoading(true);
    setNotFound(false);

    const response = await fetch(`/api/founder/applicants/${encodeURIComponent(cleanIrain)}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      setNotFound(true);
      setCandidate(null);
      setLoading(false);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (data?.ok && data.item) {
      setCandidate(data.item as CandidateRecord);
    } else {
      setNotFound(true);
      setCandidate(null);
    }
    setLoading(false);
  }, [cleanIrain]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  useEffect(() => {
    if (!candidate) return;
    setFirstName(candidate.firstName || "");
    setMiddleName(candidate.middleName || "");
    setFamilyName(candidate.familyName || "");
    setEmail(candidate.email || "");
    setPhone(candidate.phone || "");
    setLocatedCanada(candidate.locatedCanada || "");
    setProvince(candidate.province || "");
    setWorkAuthorization(candidate.workAuthorization || "");
    setEligibleMoveCanada(candidate.eligibleMoveCanada || "");
    setCountryOfOrigin(candidate.countryOfOrigin || "");
    setLanguages(candidate.languages || "");
    setLanguagesOther(candidate.languagesOther || "");
    setIndustryType(candidate.industryType || "");
    setIndustryOther(candidate.industryOther || "");
    setEmploymentStatus(candidate.employmentStatus || "");
    setNotes(candidate.ownerNotes || "");
    setTags(candidate.tags || "");
    setStatus((candidate.status || "").toLowerCase());
    setLastContactedAt(candidate.lastContactedAt || "");
    setNextActionAt(candidate.nextActionAt || "");
    setActionMessage(null);
    setActionError(null);
    skipAutosaveRef.current = true;
    skipDetailsAutosaveRef.current = true;
  }, [candidate?.irain]);

  const fetchApplications = async (irainValue: string) => {
    setAppsLoading(true);
    const params = new URLSearchParams({ search: irainValue, limit: "10", offset: "0" });
    const response = await fetch(`/api/founder/applications?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    if (data?.ok) setApplications(data.items ?? []);
    setAppsLoading(false);
  };

  useEffect(() => {
    if (!candidate?.irain) return;
    fetchApplications(candidate.irain);
  }, [candidate?.irain]);

  const updateLocalCandidate = (patch: Partial<CandidateRecord>) => {
    setCandidate((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if ("locatedCanada" in patch || "eligibleMoveCanada" in patch) {
        next.eligibility = computeEligibility(next.locatedCanada, next.eligibleMoveCanada);
      }
      return next;
    });
  };

  const patchCandidate = async (patch: Record<string, string>) => {
    if (!candidate) return;
    setSaving(true);
    await fetch(`/api/founder/applicants/${encodeURIComponent(candidate.irain)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    updateLocalCandidate(patch as Partial<CandidateRecord>);
    setSaving(false);
  };

  useEffect(() => {
    if (!candidate) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    const currentStatus = (candidate.status || "").toLowerCase();
    addIfChanged("ownerNotes", notes, candidate.ownerNotes || "");
    addIfChanged("tags", tags, candidate.tags || "");
    addIfChanged("status", status, currentStatus);
    addIfChanged("lastContactedAt", lastContactedAt, candidate.lastContactedAt || "");
    addIfChanged("nextActionAt", nextActionAt, candidate.nextActionAt || "");

    if (!Object.keys(patch).length) return;

    const timer = setTimeout(() => {
      patchCandidate(patch);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tags, status, lastContactedAt, nextActionAt, candidate?.irain]);

  useEffect(() => {
    if (!candidate) return;
    if (skipDetailsAutosaveRef.current) {
      skipDetailsAutosaveRef.current = false;
      return;
    }
    const patch: Record<string, string> = {};
    const addIfChanged = (key: string, value: string, current: string) => {
      if (value !== current) patch[key] = value;
    };
    addIfChanged("firstName", firstName, candidate.firstName || "");
    addIfChanged("middleName", middleName, candidate.middleName || "");
    addIfChanged("familyName", familyName, candidate.familyName || "");
    addIfChanged("email", email, candidate.email || "");
    addIfChanged("phone", phone, candidate.phone || "");
    addIfChanged("locatedCanada", locatedCanada, candidate.locatedCanada || "");
    addIfChanged("province", province, candidate.province || "");
    addIfChanged("workAuthorization", workAuthorization, candidate.workAuthorization || "");
    addIfChanged("eligibleMoveCanada", eligibleMoveCanada, candidate.eligibleMoveCanada || "");
    addIfChanged("countryOfOrigin", countryOfOrigin, candidate.countryOfOrigin || "");
    addIfChanged("languages", languages, candidate.languages || "");
    addIfChanged("languagesOther", languagesOther, candidate.languagesOther || "");
    addIfChanged("industryType", industryType, candidate.industryType || "");
    addIfChanged("industryOther", industryOther, candidate.industryOther || "");
    addIfChanged("employmentStatus", employmentStatus, candidate.employmentStatus || "");

    if (!Object.keys(patch).length) return;

    const timer = setTimeout(() => {
      patchCandidate(patch);
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
    candidate?.irain,
  ]);

  const handleRequestResume = async () => {
    if (!candidate) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const response = await fetch(
        `/api/founder/applicants/${encodeURIComponent(candidate.irain)}/request-resume`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setActionError(data?.error || "Unable to send request.");
      } else {
        setActionMessage("Resume request sent.");
        updateLocalCandidate({ status: "resume requested" });
        setStatus("resume requested");
      }
    } catch (error) {
      console.error("Request resume failed", error);
      setActionError("Unable to send request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!candidate) return;
    await patchCandidate({ status: "reviewed" });
    setStatus("reviewed");
  };

  if (!cleanIrain) {
    return (
      <div className="founder-page">
        <Topbar title="Candidate Review" subtitle="Invalid candidate ID" />
        <div className="card referrer-review__empty">
          <h2>Candidate not found</h2>
          <p className="field-hint">This candidate ID is missing or invalid.</p>
          <ActionBtn as="link" href="/founder/applicants" variant="ghost">
            &larr; Back to Applicants
          </ActionBtn>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="founder-page">
        <Topbar title="Candidate Review" subtitle={cleanIrain.toUpperCase()} />
        <DetailPageShell
          main={
            <>
              <DetailSection title="Profile">
                <SkeletonDetailGrid fields={8} />
              </DetailSection>
              <DetailSection title="Admin">
                <SkeletonDetailGrid fields={4} />
              </DetailSection>
            </>
          }
          sidebar={
            <DetailSection title="Decision">
              <SkeletonStack>
                <Skeleton variant="input" />
                <Skeleton variant="button" />
                <Skeleton variant="button" />
                <Skeleton variant="button" />
              </SkeletonStack>
            </DetailSection>
          }
        />
      </div>
    );
  }

  if (notFound || !candidate) {
    return (
      <div className="founder-page">
        <Topbar title="Candidate Review" subtitle={cleanIrain.toUpperCase()} />
        <div className="card referrer-review__empty">
          <h2>Candidate not found</h2>
          <p className="field-hint">Double-check the iRAIN and try again.</p>
          <ActionBtn as="link" href="/founder/applicants" variant="ghost">
            &larr; Back to Applicants
          </ActionBtn>
        </div>
      </div>
    );
  }

  const headerId = candidate.irain || cleanIrain;
  const headerTitle = fullName ? `${fullName} (${headerId})` : "Candidate Review";
  const missingFieldsLabel = candidate.missingFields.length
    ? candidate.missingFields.join(", ")
    : "Complete";

  return (
    <div className="founder-page">
      <Topbar title={headerTitle} subtitle={email || headerId} />

      <DetailPageShell
        main={
          <>
            <DetailSection title="Profile">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="candidate-first-name">First Name</label>
                  <input
                    id="candidate-first-name"
                    type="text"
                    value={editDetails ? firstName : firstName || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-middle-name">Middle Name</label>
                  <input
                    id="candidate-middle-name"
                    type="text"
                    value={editDetails ? middleName : middleName || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setMiddleName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-family-name">Family Name</label>
                  <input
                    id="candidate-family-name"
                    type="text"
                    value={editDetails ? familyName : familyName || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setFamilyName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-email">Email</label>
                  <input
                    id="candidate-email"
                    type="email"
                    value={editDetails ? email : email || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-phone">Phone</label>
                  <input
                    id="candidate-phone"
                    type="text"
                    value={editDetails ? phone : phone || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-irain">Candidate iRAIN</label>
                  <input id="candidate-irain" type="text" value={candidate.irain || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="candidate-legacy-id">Legacy Candidate ID</label>
                  <input
                    id="candidate-legacy-id"
                    type="text"
                    value={candidate.legacyCandidateId || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-located">Located in Canada</label>
                  <select
                    id="candidate-located"
                    value={locatedCanada}
                    onChange={(event) => setLocatedCanada(event.target.value)}
                    disabled={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                  >
                    {yesNoOptions.map((value) => (
                      <option key={value} value={value}>
                        {value || "Select"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="candidate-province">Province</label>
                  <input
                    id="candidate-province"
                    type="text"
                    value={editDetails ? province : province || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setProvince(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-work-auth">Work Authorization</label>
                  <select
                    id="candidate-work-auth"
                    value={workAuthorization}
                    onChange={(event) => setWorkAuthorization(event.target.value)}
                    disabled={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                  >
                    {yesNoOptions.map((value) => (
                      <option key={value} value={value}>
                        {value || "Select"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="candidate-eligible-move">Eligible to Move (6 Months)</label>
                  <select
                    id="candidate-eligible-move"
                    value={eligibleMoveCanada}
                    onChange={(event) => setEligibleMoveCanada(event.target.value)}
                    disabled={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                  >
                    {yesNoOptions.map((value) => (
                      <option key={value} value={value}>
                        {value || "Select"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="candidate-country">Country of Origin</label>
                  <input
                    id="candidate-country"
                    type="text"
                    value={editDetails ? countryOfOrigin : countryOfOrigin || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setCountryOfOrigin(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-languages">Languages</label>
                  <input
                    id="candidate-languages"
                    type="text"
                    value={editDetails ? languages : languages || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setLanguages(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-languages-other">Languages Other</label>
                  <input
                    id="candidate-languages-other"
                    type="text"
                    value={editDetails ? languagesOther : languagesOther || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setLanguagesOther(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-industry-type">Industry Type</label>
                  <input
                    id="candidate-industry-type"
                    type="text"
                    value={editDetails ? industryType : industryType || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setIndustryType(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-industry-other">Industry Other</label>
                  <input
                    id="candidate-industry-other"
                    type="text"
                    value={editDetails ? industryOther : industryOther || "-"}
                    readOnly={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                    onChange={(event) => setIndustryOther(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-employment-status">Employment Status</label>
                  <select
                    id="candidate-employment-status"
                    value={employmentStatus}
                    onChange={(event) => setEmploymentStatus(event.target.value)}
                    disabled={!editDetails}
                    tabIndex={editDetails ? 0 : -1}
                  >
                    {employmentOptions.map((value) => (
                      <option key={value} value={value}>
                        {value || "Select"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="candidate-eligibility">Eligibility</label>
                  <input
                    id="candidate-eligibility"
                    type="text"
                    value={profileEligibility.reason}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Admin">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="candidate-status">Status</label>
                  <select
                    id="candidate-status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {statusOptions
                      .filter((value) => value)
                      .map((value) => (
                        <option key={value} value={value.toLowerCase()}>
                          {value}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="candidate-tags">Tags</label>
                  <input
                    id="candidate-tags"
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="Comma separated tags"
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-last-contacted">Last Contacted At</label>
                  <input
                    id="candidate-last-contacted"
                    type="text"
                    value={lastContactedAt}
                    onChange={(event) => setLastContactedAt(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-next-action">Next Action At</label>
                  <input
                    id="candidate-next-action"
                    type="text"
                    value={nextActionAt}
                    onChange={(event) => setNextActionAt(event.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="candidate-notes">Owner Notes</label>
                <textarea
                  id="candidate-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context, outreach details, blockers..."
                />
              </div>
            </DetailSection>

            <DetailSection title="Data quality">
              {candidate.missingFields.length ? (
                <div className="founder-pill">{missingFieldsLabel}</div>
              ) : (
                <div className="founder-pill founder-pill--success">Complete</div>
              )}
            </DetailSection>
          </>
        }
        sidebar={
          <>
            <DetailSection title="Decision" className="referrer-review__decision">
              <div className="field">
                <label htmlFor="decision-status">Current status</label>
                <input
                  id="decision-status"
                  type="text"
                  value={status || "Unassigned"}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
              <div className="flow-stack">
                <ActionBtn as="button" variant="ghost" onClick={() => setEditDetails((prev) => !prev)}>
                  {editDetails ? "Done editing" : "Edit details"}
                </ActionBtn>
                <ActionBtn as="button" variant="primary" onClick={handleMarkReviewed}>
                  Mark Reviewed
                </ActionBtn>
                <ActionBtn
                  as="button"
                  variant="ghost"
                  onClick={handleRequestResume}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Sending..." : "Request updated resume"}
                </ActionBtn>
              </div>
              <div>
                <AutosaveHint saving={saving} />
                {actionMessage ? (
                  <div className="status-banner status-banner--ok" role="status" aria-live="polite">
                    {actionMessage}
                  </div>
                ) : null}
                {actionError ? (
                  <div className="status-banner status-banner--error" role="alert">
                    {actionError}
                  </div>
                ) : null}
              </div>
              <ActionBtn as="link" href="/founder/applicants" variant="ghost">
                &larr; Back to Applicants
              </ActionBtn>
            </DetailSection>

            <DetailSection title="Applications">
              {appsLoading ? (
                <SkeletonStack>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </SkeletonStack>
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
                        {app.id} - {app.status || "Unassigned"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </>
        }
      />
    </div>
  );
}
