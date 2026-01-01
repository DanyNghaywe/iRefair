"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { AutosaveHint } from "@/components/founder/AutosaveHint";
import { Badge } from "@/components/founder/Badge";
import { DetailPageShell } from "@/components/founder/DetailPageShell";
import { DetailSection } from "@/components/founder/DetailSection";
import { Select } from "@/components/Select";
import { Skeleton, SkeletonDetailGrid, SkeletonStack } from "@/components/founder/Skeleton";
import { Topbar } from "@/components/founder/Topbar";
import { countryOptions } from "@/lib/countries";

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
  resumeFileName?: string;
  resumeFileId?: string;
  resumeUrl?: string;
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

const PROVINCES: string[] = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Northwest Territories",
  "Nunavut",
  "Yukon",
];

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Arabic", label: "Arabic" },
  { value: "French", label: "French" },
  { value: "Other", label: "Other" },
];

const INDUSTRY_OPTIONS: string[] = [
  "Information Technology (IT)",
  "Finance / Banking / Accounting",
  "Healthcare / Medical",
  "Education / Academia",
  "Engineering / Construction",
  "Marketing / Advertising / PR",
  "Media / Entertainment / Journalism",
  "Legal / Law",
  "Human Resources / Recruitment",
  "Retail / E-commerce",
  "Hospitality / Travel / Tourism",
  "Logistics / Transportation",
  "Manufacturing",
  "Non-Profit / NGO",
  "Real Estate",
  "Energy / Utilities",
  "Telecommunications",
  "Agriculture / Food Industry",
  "Compliance/ Audit/ Monitoring & Evaluation",
  "Other",
];

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

  // Resume upload state
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFileId, setResumeFileId] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  // Store original values when entering edit mode
  const originalDetailsRef = useRef<{
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
  } | null>(null);

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
    setResumeFileName(candidate.resumeFileName || "");
    setResumeFileId(candidate.resumeFileId || "");
    setActionMessage(null);
    setActionError(null);
    setResumeError(null);
    setResumeSuccess(null);
    skipAutosaveRef.current = true;
    originalDetailsRef.current = null;
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

  const handleStartEdit = () => {
    originalDetailsRef.current = {
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
    };
    setEditDetails(true);
  };

  const handleCancelEdit = () => {
    if (originalDetailsRef.current) {
      setFirstName(originalDetailsRef.current.firstName);
      setMiddleName(originalDetailsRef.current.middleName);
      setFamilyName(originalDetailsRef.current.familyName);
      setEmail(originalDetailsRef.current.email);
      setPhone(originalDetailsRef.current.phone);
      setLocatedCanada(originalDetailsRef.current.locatedCanada);
      setProvince(originalDetailsRef.current.province);
      setWorkAuthorization(originalDetailsRef.current.workAuthorization);
      setEligibleMoveCanada(originalDetailsRef.current.eligibleMoveCanada);
      setCountryOfOrigin(originalDetailsRef.current.countryOfOrigin);
      setLanguages(originalDetailsRef.current.languages);
      setLanguagesOther(originalDetailsRef.current.languagesOther);
      setIndustryType(originalDetailsRef.current.industryType);
      setIndustryOther(originalDetailsRef.current.industryOther);
      setEmploymentStatus(originalDetailsRef.current.employmentStatus);
    }
    originalDetailsRef.current = null;
    setEditDetails(false);
  };

  const handleSaveEdit = async () => {
    if (!candidate) return;
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

    if (Object.keys(patch).length) {
      await patchCandidate(patch);
    }
    originalDetailsRef.current = null;
    setEditDetails(false);
  };

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

  const handleResumeFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !candidate) return;

    // Reset input so same file can be selected again
    event.target.value = "";

    // Client-side validation
    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["pdf", "doc", "docx"];
    if (!extension || !allowedExtensions.includes(extension)) {
      setResumeError("Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setResumeError("File size exceeds 10MB limit.");
      return;
    }

    setResumeError(null);
    setResumeSuccess(null);
    setPendingResumeFile(file);
  };

  const handleResumeUploadSubmit = async () => {
    if (!pendingResumeFile || !candidate) return;

    setResumeUploading(true);
    setResumeError(null);
    setResumeSuccess(null);

    try {
      const formData = new FormData();
      formData.append("resume", pendingResumeFile);

      const response = await fetch(
        `/api/founder/applicants/${encodeURIComponent(candidate.irain)}/resume`,
        { method: "POST", body: formData },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        setResumeError(data?.error || "Unable to upload resume.");
      } else {
        setResumeFileName(data.resumeFileName || pendingResumeFile.name);
        setResumeFileId(data.resumeFileId || "");
        setResumeSuccess("Resume uploaded successfully.");
        updateLocalCandidate({
          resumeFileName: data.resumeFileName,
          resumeFileId: data.resumeFileId,
          resumeUrl: data.resumeUrl,
        });
        setPendingResumeFile(null);
      }
    } catch (error) {
      console.error("Resume upload failed", error);
      setResumeError("Unable to upload resume.");
    } finally {
      setResumeUploading(false);
    }
  };

  const handleResumeUploadCancel = () => {
    setPendingResumeFile(null);
    setResumeError(null);
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
                  {editDetails ? (
                    <input
                      id="candidate-first-name"
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  ) : (
                    <input
                      id="candidate-first-name"
                      type="text"
                      value={firstName || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="candidate-middle-name">Middle Name</label>
                  {editDetails ? (
                    <input
                      id="candidate-middle-name"
                      type="text"
                      value={middleName}
                      onChange={(event) => setMiddleName(event.target.value)}
                    />
                  ) : (
                    <input
                      id="candidate-middle-name"
                      type="text"
                      value={middleName || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="candidate-family-name">Family Name</label>
                  {editDetails ? (
                    <input
                      id="candidate-family-name"
                      type="text"
                      value={familyName}
                      onChange={(event) => setFamilyName(event.target.value)}
                    />
                  ) : (
                    <input
                      id="candidate-family-name"
                      type="text"
                      value={familyName || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="candidate-email">Email</label>
                  {editDetails ? (
                    <input
                      id="candidate-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  ) : (
                    <input
                      id="candidate-email"
                      type="text"
                      value={email || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="candidate-phone">Phone</label>
                  {editDetails ? (
                    <input
                      id="candidate-phone"
                      type="text"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  ) : (
                    <input
                      id="candidate-phone"
                      type="text"
                      value={phone || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
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
                  {editDetails ? (
                    <Select
                      id="candidate-located"
                      name="candidate-located"
                      options={yesNoOptions.filter(Boolean)}
                      placeholder="Select"
                      value={locatedCanada}
                      onChange={(value) => setLocatedCanada(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-located"
                      type="text"
                      value={locatedCanada || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                {locatedCanada === "Yes" && (
                  <div className="field">
                    <label htmlFor="candidate-province">Province</label>
                    {editDetails ? (
                      <Select
                        id="candidate-province"
                        name="candidate-province"
                        options={PROVINCES}
                        placeholder="Select"
                        value={province}
                        onChange={(value) => setProvince(Array.isArray(value) ? value[0] : value)}
                      />
                    ) : (
                      <input
                        id="candidate-province"
                        type="text"
                        value={province || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                {locatedCanada === "Yes" && (
                  <div className="field">
                    <label htmlFor="candidate-work-auth">Work Authorization</label>
                    {editDetails ? (
                      <Select
                        id="candidate-work-auth"
                        name="candidate-work-auth"
                        options={yesNoOptions.filter(Boolean)}
                        placeholder="Select"
                        value={workAuthorization}
                        onChange={(value) => setWorkAuthorization(Array.isArray(value) ? value[0] : value)}
                      />
                    ) : (
                      <input
                        id="candidate-work-auth"
                        type="text"
                        value={workAuthorization || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                {locatedCanada === "No" && (
                  <div className="field">
                    <label htmlFor="candidate-eligible-move">Eligible to Move (6 Months)</label>
                    {editDetails ? (
                      <Select
                        id="candidate-eligible-move"
                        name="candidate-eligible-move"
                        options={yesNoOptions.filter(Boolean)}
                        placeholder="Select"
                        value={eligibleMoveCanada}
                        onChange={(value) => setEligibleMoveCanada(Array.isArray(value) ? value[0] : value)}
                      />
                    ) : (
                      <input
                        id="candidate-eligible-move"
                        type="text"
                        value={eligibleMoveCanada || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="candidate-country">Country of Origin</label>
                  {editDetails ? (
                    <Select
                      id="candidate-country"
                      name="candidate-country"
                      options={countryOptions()}
                      placeholder="Select"
                      value={countryOfOrigin}
                      onChange={(value) => setCountryOfOrigin(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-country"
                      type="text"
                      value={countryOfOrigin || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="candidate-languages">Languages</label>
                  {editDetails ? (
                    <Select
                      id="candidate-languages"
                      name="candidate-languages"
                      options={LANGUAGE_OPTIONS}
                      placeholder="Select"
                      multi
                      values={languages ? languages.split(", ").map((l) => l.trim()).filter(Boolean) : []}
                      onChange={(value) => {
                        const arr = Array.isArray(value) ? value : value ? [value] : [];
                        setLanguages(arr.join(", "));
                      }}
                    />
                  ) : (
                    <input
                      id="candidate-languages"
                      type="text"
                      value={languages || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                {languages.includes("Other") && (
                  <div className="field">
                    <label htmlFor="candidate-languages-other">Languages Other</label>
                    {editDetails ? (
                      <input
                        id="candidate-languages-other"
                        type="text"
                        value={languagesOther}
                        onChange={(event) => setLanguagesOther(event.target.value)}
                      />
                    ) : (
                      <input
                        id="candidate-languages-other"
                        type="text"
                        value={languagesOther || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="candidate-industry-type">Industry Type</label>
                  {editDetails ? (
                    <Select
                      id="candidate-industry-type"
                      name="candidate-industry-type"
                      options={INDUSTRY_OPTIONS}
                      placeholder="Select"
                      value={industryType}
                      onChange={(value) => setIndustryType(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-industry-type"
                      type="text"
                      value={industryType || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                {industryType === "Other" && (
                  <div className="field">
                    <label htmlFor="candidate-industry-other">Industry Other</label>
                    {editDetails ? (
                      <input
                        id="candidate-industry-other"
                        type="text"
                        value={industryOther}
                        onChange={(event) => setIndustryOther(event.target.value)}
                      />
                    ) : (
                      <input
                        id="candidate-industry-other"
                        type="text"
                        value={industryOther || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="candidate-employment-status">Employment Status</label>
                  {editDetails ? (
                    <Select
                      id="candidate-employment-status"
                      name="candidate-employment-status"
                      options={employmentOptions.filter(Boolean)}
                      placeholder="Select"
                      value={employmentStatus}
                      onChange={(value) => setEmploymentStatus(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-employment-status"
                      type="text"
                      value={employmentStatus || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
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

            <DetailSection title="Resume">
              {resumeFileName ? (
                <div className="field-grid">
                  <div className="field">
                    <label>Current Resume</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)" }}>
                      <span style={{ flex: 1 }}>{resumeFileName}</span>
                      {resumeFileId && (
                        <ActionBtn
                          as="link"
                          href={`https://drive.google.com/file/d/${resumeFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="ghost"
                          size="sm"
                        >
                          View
                        </ActionBtn>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="founder-card__meta">No resume on file.</p>
              )}
              <div className="field" style={{ marginTop: "var(--gap)" }}>
                <label htmlFor="resume-upload">
                  {resumeFileName ? "Replace Resume" : "Upload Resume"}
                </label>
                <div className="file-upload">
                  <input
                    ref={resumeInputRef}
                    id="resume-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="file-input"
                    onChange={handleResumeFileSelect}
                    disabled={resumeUploading}
                  />
                  {pendingResumeFile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--gap)", flexWrap: "wrap" }}>
                      <span style={{ fontStyle: "italic" }}>{pendingResumeFile.name}</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <ActionBtn
                          as="button"
                          variant="primary"
                          size="sm"
                          onClick={handleResumeUploadSubmit}
                          disabled={resumeUploading}
                        >
                          {resumeUploading ? "Uploading..." : "Submit"}
                        </ActionBtn>
                        <ActionBtn
                          as="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResumeUploadCancel}
                          disabled={resumeUploading}
                        >
                          Cancel
                        </ActionBtn>
                      </div>
                    </div>
                  ) : (
                    <ActionBtn
                      as="button"
                      variant="ghost"
                      onClick={() => resumeInputRef.current?.click()}
                      disabled={resumeUploading}
                    >
                      Choose File
                    </ActionBtn>
                  )}
                </div>
                <p className="field-hint">PDF, DOC, or DOCX. Max 10MB.</p>
                {resumeError && (
                  <div className="status-banner status-banner--error" role="alert">
                    {resumeError}
                  </div>
                )}
                {resumeSuccess && (
                  <div className="status-banner status-banner--ok" role="status">
                    {resumeSuccess}
                  </div>
                )}
              </div>
            </DetailSection>

            <DetailSection title="Admin">
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="candidate-status">Status</label>
                  <Select
                    id="candidate-status"
                    name="candidate-status"
                    options={statusOptions
                      .filter((opt) => opt)
                      .map((opt) => ({ value: opt.toLowerCase(), label: opt }))}
                    placeholder="Unassigned"
                    value={status}
                    onChange={(value) => setStatus(Array.isArray(value) ? value[0] : value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-tags">Skills / Interests</label>
                  <input
                    id="candidate-tags"
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="e.g. iPhone repair, soldering, retail"
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-last-contacted">Last Contact Date</label>
                  <input
                    id="candidate-last-contacted"
                    type="text"
                    value={lastContactedAt}
                    onChange={(event) => setLastContactedAt(event.target.value)}
                    placeholder="e.g. 2025-01-15"
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-next-action">Next Follow-up</label>
                  <input
                    id="candidate-next-action"
                    type="text"
                    value={nextActionAt}
                    onChange={(event) => setNextActionAt(event.target.value)}
                    placeholder="e.g. 2025-01-20 or Call Monday"
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: "var(--gap)" }}>
                <label htmlFor="candidate-notes">Internal Notes</label>
                <textarea
                  id="candidate-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add interview notes, availability, concerns..."
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
                  value={
                    status
                      ? status
                          .split(" ")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")
                      : "Unassigned"
                  }
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
              <div className="flow-stack">
                {editDetails ? (
                  <>
                    <ActionBtn as="button" variant="primary" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </ActionBtn>
                    <ActionBtn as="button" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
                      Cancel
                    </ActionBtn>
                  </>
                ) : (
                  <ActionBtn as="button" variant="ghost" onClick={handleStartEdit}>
                    Edit details
                  </ActionBtn>
                )}
                <ActionBtn
                  as="button"
                  variant={status === "reviewed" ? "ghost" : "primary"}
                  onClick={handleMarkReviewed}
                  disabled={status === "reviewed"}
                >
                  {status === "reviewed" ? "Reviewed" : "Mark Reviewed"}
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
                      <Link href={`/founder/applications/${app.id}`} className="founder-list__link">
                        <div className="founder-list__title">
                          {app.position || "Application"} <Badge tone="neutral">{app.iCrn}</Badge>
                        </div>
                        <div className="founder-list__meta">
                          {app.id} - {app.status || "Unassigned"}
                        </div>
                      </Link>
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
