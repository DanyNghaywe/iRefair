"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { DetailPageShell } from "@/components/founder/DetailPageShell";
import { DetailSection } from "@/components/founder/DetailSection";
import { Select } from "@/components/Select";
import { Topbar } from "@/components/founder/Topbar";

type CandidateRecord = {
  irain: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  phone: string;
  resumeFileName?: string;
  resumeFileId?: string;
  resumeUrl?: string;
  targetCompanies?: string;
  desiredRole?: string;
  pendingCompanyIrcrn?: string;
  pendingPosition?: string;
  pendingReferenceNumber?: string;
  pendingCvRequestedAt?: string;
  pendingCvTokenHash?: string;
  pendingCvTokenExpiresAt?: string;
};

type ApprovedCompany = {
  code: string;
  name: string;
};

type ResumeMode = "existing" | "request" | "upload";

const translations = {
  en: {
    page: {
      title: "Create application",
      subtitle: "Founder-initiated application",
    },
    sections: {
      applicant: "Applicant",
      company: "Company",
      resume: "Resume",
      actions: "Actions",
    },
    labels: {
      applicant: "Applicant",
      applicantId: "Applicant iRAIN",
      email: "Email",
      phone: "Phone",
      company: "Approved Company",
      position: "Position (optional)",
      referenceNumber: "Reference Number (optional)",
      resumeChoice: "Resume",
      currentResume: "Current Resume",
      pendingCvRequestedAt: "Requested at",
      pendingCvExpiresAt: "Expires at",
    },
    buttons: {
      createApplication: "Create application",
      requestCv: "Request CV",
      uploadResume: "Upload resume",
      replaceResume: "Replace resume",
      chooseFile: "Choose File",
      submit: "Upload",
      uploading: "Uploading...",
      cancel: "Cancel",
      sending: "Sending...",
      changeApplicant: "Change applicant",
      backToApplications: "Back to Applications",
      backToApplicant: "Back to Applicant",
      viewApplicant: "View Applicant Profile",
    },
    placeholders: {
      applicantSearch: "Search by name, email, iRAIN...",
      companySelect: "Select an approved company",
    },
    messages: {
      applicantRequired: "Select an applicant to continue.",
      loadingApplicant: "Loading applicant...",
      applicantNotFound: "Applicant not found.",
      unableToLoadApplicant: "Unable to load applicant.",
      unableToLoadCompanies: "Unable to load approved companies.",
      missingCompany: "Select an approved company.",
      resumeMissing: "No resume on file. A CV request is required.",
      resumeUploadRequired: "Upload a resume to continue.",
      pendingCv: "A CV request is already pending for this applicant.",
      resumeUploaded: "Resume uploaded successfully.",
      invalidFileType: "Please upload a PDF, DOC, or DOCX file.",
      fileTooLarge: "File size exceeds 10MB limit.",
      unableToUploadResume: "Unable to upload resume.",
      applicationCreated: "Application created.",
      cvRequestSent: "CV request sent.",
      unableToCreateApplication: "Unable to create application.",
      unableToRequestCv: "Unable to request CV.",
      searching: "Searching...",
      searchHint: "Type at least 2 characters to search.",
      searchEmpty: "No applicants found.",
    },
    hints: {
      resumeExisting: "Use existing resume",
      resumeRequest: "Request a new resume",
      resumeUpload: "Upload a resume",
      resumeTypes: "PDF, DOC, or DOCX. Max 10MB.",
    },
  },
  fr: {
    page: {
      title: "Creer une candidature",
      subtitle: "Candidature initiee par le fondateur",
    },
    sections: {
      applicant: "Candidat",
      company: "Entreprise",
      resume: "CV",
      actions: "Actions",
    },
    labels: {
      applicant: "Candidat",
      applicantId: "iRAIN du candidat",
      email: "Courriel",
      phone: "Telephone",
      company: "Entreprise approuvee",
      position: "Poste (optionnel)",
      referenceNumber: "Numero de reference (optionnel)",
      resumeChoice: "CV",
      currentResume: "CV actuel",
      pendingCvRequestedAt: "Demande le",
      pendingCvExpiresAt: "Expire le",
    },
    buttons: {
      createApplication: "Creer la candidature",
      requestCv: "Demander un CV",
      uploadResume: "Televerser le CV",
      replaceResume: "Remplacer le CV",
      chooseFile: "Choisir un fichier",
      submit: "Televerser",
      uploading: "Televersement...",
      cancel: "Annuler",
      sending: "Envoi...",
      changeApplicant: "Changer de candidat",
      backToApplications: "Retour aux candidatures",
      backToApplicant: "Retour au candidat",
      viewApplicant: "Voir le profil du candidat",
    },
    placeholders: {
      applicantSearch: "Rechercher par nom, courriel, iRAIN...",
      companySelect: "Selectionner une entreprise approuvee",
    },
    messages: {
      applicantRequired: "Selectionnez un candidat pour continuer.",
      loadingApplicant: "Chargement du candidat...",
      applicantNotFound: "Candidat introuvable.",
      unableToLoadApplicant: "Impossible de charger le candidat.",
      unableToLoadCompanies: "Impossible de charger les entreprises approuvees.",
      missingCompany: "Selectionnez une entreprise approuvee.",
      resumeMissing: "Aucun CV enregistre. Une demande de CV est requise.",
      resumeUploadRequired: "Televersez un CV pour continuer.",
      pendingCv: "Une demande de CV est deja en attente pour ce candidat.",
      resumeUploaded: "CV televerse avec succes.",
      invalidFileType: "Veuillez televerser un fichier PDF, DOC ou DOCX.",
      fileTooLarge: "La taille du fichier depasse la limite de 10 Mo.",
      unableToUploadResume: "Impossible de televerser le CV.",
      applicationCreated: "Candidature creee.",
      cvRequestSent: "Demande de CV envoyee.",
      unableToCreateApplication: "Impossible de creer la candidature.",
      unableToRequestCv: "Impossible de demander le CV.",
      searching: "Recherche...",
      searchHint: "Saisissez au moins 2 caracteres pour rechercher.",
      searchEmpty: "Aucun candidat trouve.",
    },
    hints: {
      resumeExisting: "Utiliser le CV existant",
      resumeRequest: "Demander un nouveau CV",
      resumeUpload: "Televerser un CV",
      resumeTypes: "PDF, DOC ou DOCX. Max 10 Mo.",
    },
  },
};

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 8;

const isExpiredIso = (value?: string) => {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() <= Date.now();
};

const splitTargetCompanies = (value: string) =>
  value
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const matchApprovedCompany = (targets: string, companies: ApprovedCompany[]) => {
  if (!targets || !companies.length) return "";
  const tokens = splitTargetCompanies(targets);
  const normalizedTokens = tokens.map((token) => token.toLowerCase());

  for (const token of normalizedTokens) {
    const match = companies.find((company) => {
      const name = company.name?.toLowerCase() || "";
      return company.code.toLowerCase() === token || (name && name === token);
    });
    if (match) return match.code;
  }

  for (const token of normalizedTokens) {
    const match = companies.find((company) => {
      const name = company.name?.toLowerCase() || "";
      return token.includes(company.code.toLowerCase()) || (name && token.includes(name));
    });
    if (match) return match.code;
  }

  return "";
};

export default function CreateApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const t = translations[language];

  const applicantParam = searchParams?.get("applicant") || "";
  const fromApplicant = searchParams?.get("from") === "applicant";
  const cleanApplicantId = applicantParam.trim();

  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CandidateRecord[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [approvedCompanies, setApprovedCompanies] = useState<ApprovedCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const [linkCompany, setLinkCompany] = useState("");
  const [linkPosition, setLinkPosition] = useState("");
  const [linkReferenceNumber, setLinkReferenceNumber] = useState("");
  const [resumeMode, setResumeMode] = useState<ResumeMode>("existing");
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const linkInitRef = useRef(false);
  const lastApplicantRef = useRef("");

  const hasResume = Boolean(candidate?.resumeFileId && candidate?.resumeFileName);
  const pendingCvRequestedAt = candidate?.pendingCvRequestedAt || "";
  const pendingCvExpiresAt = candidate?.pendingCvTokenExpiresAt || "";
  const pendingCvActive = Boolean(candidate?.pendingCvTokenHash) && !isExpiredIso(pendingCvExpiresAt);

  const applicantName = useMemo(() => {
    if (!candidate) return "";
    return [candidate.firstName, candidate.middleName, candidate.familyName].filter(Boolean).join(" ").trim();
  }, [candidate]);

  const updateLocalCandidate = useCallback((updates: Partial<CandidateRecord>) => {
    setCandidate((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const companyOptions = useMemo(
    () =>
      approvedCompanies.map((company) => ({
        value: company.code,
        label: company.name ? `${company.name} (${company.code})` : company.code,
      })),
    [approvedCompanies],
  );

  const resumeOptions = useMemo(() => {
    const options = [];
    if (hasResume) {
      options.push({ value: "existing", label: t.hints.resumeExisting });
    }
    options.push({ value: "request", label: t.hints.resumeRequest });
    options.push({ value: "upload", label: t.hints.resumeUpload });
    return options;
  }, [hasResume, t.hints.resumeExisting, t.hints.resumeRequest, t.hints.resumeUpload]);

  const formatTimestamp = useCallback(
    (value: string) => {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString(language === "fr" ? "fr-CA" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },
    [language],
  );

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCandidate = useCallback(async () => {
    if (!cleanApplicantId) return;
    setCandidateLoading(true);
    setCandidateError(null);
    try {
      const response = await fetch(`/api/founder/applicants/${encodeURIComponent(cleanApplicantId)}`, {
        cache: "no-store",
      });
      if (response.status === 404) {
        setCandidate(null);
        setCandidateError(t.messages.applicantNotFound);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setCandidate(null);
        setCandidateError(data?.error || t.messages.unableToLoadApplicant);
        return;
      }
      setCandidate(data.item as CandidateRecord);
    } catch (error) {
      console.error("Failed to load applicant", error);
      setCandidate(null);
      setCandidateError(t.messages.unableToLoadApplicant);
    } finally {
      setCandidateLoading(false);
    }
  }, [cleanApplicantId, t.messages.applicantNotFound, t.messages.unableToLoadApplicant]);

  useEffect(() => {
    linkInitRef.current = false;
    const previousApplicant = lastApplicantRef.current;
    lastApplicantRef.current = cleanApplicantId;
    if (!cleanApplicantId) {
      setCandidate(null);
      setCandidateError(null);
      setCandidateLoading(false);
      return;
    }
    if (previousApplicant && previousApplicant !== cleanApplicantId) {
      setCandidate(null);
    }
    fetchCandidate();
  }, [cleanApplicantId, fetchCandidate]);

  useEffect(() => {
    if (candidate) {
      setSearchInput("");
      setSearchResults([]);
    }
  }, [candidate]);

  useEffect(() => {
    if (!hasResume && resumeMode === "existing") {
      setResumeMode("request");
    }
  }, [hasResume, resumeMode]);

  useEffect(() => {
    const isReady = search.length >= SEARCH_MIN_LENGTH;
    if (!isReady) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setSearchLoading(true);
      try {
        const params = new URLSearchParams({ search, limit: String(SEARCH_LIMIT), offset: "0" });
        const response = await fetch(`/api/founder/applicants?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok) {
          setSearchResults(data.items ?? []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to search applicants", error);
        }
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [search]);

  const fetchApprovedCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError(null);
    try {
      const response = await fetch("/api/founder/approved-companies", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setCompaniesError(data?.error || t.messages.unableToLoadCompanies);
        return;
      }
      setApprovedCompanies(Array.isArray(data.companies) ? data.companies : []);
    } catch (error) {
      console.error("Failed to load approved companies", error);
      setCompaniesError(t.messages.unableToLoadCompanies);
    } finally {
      setCompaniesLoading(false);
    }
  }, [t.messages.unableToLoadCompanies]);

  useEffect(() => {
    fetchApprovedCompanies();
  }, [fetchApprovedCompanies]);

  useEffect(() => {
    if (!candidate) {
      setLinkCompany("");
      setLinkPosition("");
      setLinkReferenceNumber("");
      setResumeMode("existing");
      setResumeUploading(false);
      setPendingResumeFile(null);
      setResumeError(null);
      setResumeSuccess(null);
      setLinkError(null);
      setLinkSuccess(null);
      linkInitRef.current = false;
      return;
    }
    if (linkInitRef.current) return;

    const suggestedCompany =
      candidate.pendingCompanyIrcrn ||
      matchApprovedCompany(candidate.targetCompanies || "", approvedCompanies);
    setLinkCompany(suggestedCompany || "");
    setLinkPosition(candidate.pendingPosition || candidate.desiredRole || "");
    setLinkReferenceNumber(candidate.pendingReferenceNumber || "");
    setResumeMode(hasResume ? "existing" : "request");
    setPendingResumeFile(null);
    setResumeError(null);
    setResumeSuccess(null);
    setResumeUploading(false);
    setLinkError(null);
    linkInitRef.current = true;
  }, [candidate, approvedCompanies, hasResume]);

  const handleChangeApplicant = () => {
    router.replace("/founder/applications/new");
    setSearchInput("");
    setSearch("");
    setSearchResults([]);
    setResumeMode("existing");
    setResumeUploading(false);
    setPendingResumeFile(null);
    setResumeError(null);
    setResumeSuccess(null);
  };

  const handleResumeFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !candidate) return;

    // Reset input so same file can be selected again
    event.target.value = "";

    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["pdf", "doc", "docx"];
    if (!extension || !allowedExtensions.includes(extension)) {
      setResumeError(t.messages.invalidFileType);
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setResumeError(t.messages.fileTooLarge);
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
        setResumeError(data?.error || t.messages.unableToUploadResume);
      } else {
        const resumeFileName = data.resumeFileName || pendingResumeFile.name;
        updateLocalCandidate({
          resumeFileName,
          resumeFileId: data.resumeFileId,
          resumeUrl: data.resumeUrl,
        });
        setResumeSuccess(t.messages.resumeUploaded);
        setPendingResumeFile(null);
        setResumeMode("existing");
        setLinkError(null);
      }
    } catch (error) {
      console.error("Resume upload failed", error);
      setResumeError(t.messages.unableToUploadResume);
    } finally {
      setResumeUploading(false);
    }
  };

  const handleResumeUploadCancel = () => {
    setPendingResumeFile(null);
    setResumeError(null);
  };

  const handleLinkSubmit = async () => {
    if (!candidate || linkSubmitting) return;

    if (pendingCvActive) {
      setLinkError(t.messages.pendingCv);
      return;
    }

    const companyIrcrn = linkCompany.trim();
    if (!companyIrcrn) {
      setLinkError(t.messages.missingCompany);
      return;
    }

    if (resumeMode === "upload") {
      setLinkError(t.messages.resumeUploadRequired);
      return;
    }

    if (resumeMode === "existing" && !hasResume) {
      setLinkError(t.messages.resumeMissing);
      return;
    }

    setLinkSubmitting(true);
    setLinkError(null);
    setLinkSuccess(null);

    const payload: Record<string, string> = {
      companyIrcrn,
      position: linkPosition.trim(),
      referenceNumber: linkReferenceNumber.trim(),
    };

    const usingExistingResume = resumeMode === "existing";
    const endpoint = usingExistingResume
      ? `/api/founder/applicants/${encodeURIComponent(candidate.irain)}/create-application`
      : `/api/founder/applicants/${encodeURIComponent(candidate.irain)}/request-cv`;

    let nextApplicationId: string | null = null;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) {
          setLinkError(
            data?.error ||
            (usingExistingResume ? t.messages.unableToCreateApplication : t.messages.unableToRequestCv),
          );
          return;
        }

      if (usingExistingResume) {
        nextApplicationId = data?.id || null;
        if (!nextApplicationId) {
          setLinkSuccess(t.messages.applicationCreated);
        }
      } else {
        setLinkSuccess(t.messages.cvRequestSent);
        fetchCandidate();
      }
    } catch (error) {
      console.error("Linking applicant failed", error);
      setLinkError(usingExistingResume ? t.messages.unableToCreateApplication : t.messages.unableToRequestCv);
    } finally {
      setLinkSubmitting(false);
    }

    if (nextApplicationId) {
      router.push(`/founder/applications/${encodeURIComponent(nextApplicationId)}`);
    }
  };

  const resumeModeValue = resumeMode;
  const linkSubmitDisabled =
    linkSubmitting ||
    resumeUploading ||
    pendingCvActive ||
    !candidate ||
    !linkCompany.trim() ||
    resumeMode === "upload" ||
    (resumeMode === "existing" && !hasResume);

  const cancelHref =
    fromApplicant && candidate?.irain
      ? `/founder/applicants/${encodeURIComponent(candidate.irain)}`
      : "/founder/applications";
  const cancelLabel = fromApplicant && candidate ? t.buttons.backToApplicant : t.buttons.backToApplications;
  const headerSubtitle = candidate ? applicantName || candidate.irain : t.page.subtitle;

  return (
    <div className="founder-page">
      <Topbar title={t.page.title} subtitle={headerSubtitle} />

      <DetailPageShell
        main={
          <>
            <DetailSection title={t.sections.applicant}>
              {candidate ? (
                <div className="flow-stack">
                  <div className="founder-field">
                    <span>{t.labels.applicantId}</span>
                    <strong>{candidate.irain}</strong>
                  </div>
                  <div className="founder-field">
                    <span>{t.labels.applicant}</span>
                    <strong>{applicantName || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>{t.labels.email}</span>
                    <strong>{candidate.email || "-"}</strong>
                  </div>
                  <div className="founder-field">
                    <span>{t.labels.phone}</span>
                    <strong>{candidate.phone || "-"}</strong>
                  </div>
                  <ActionBtn as="button" variant="ghost" onClick={handleChangeApplicant}>
                    {t.buttons.changeApplicant}
                  </ActionBtn>
                </div>
              ) : candidateLoading ? (
                <p className="field-hint">{t.messages.loadingApplicant}</p>
              ) : (
                <>
                  <div className="founder-fieldset">
                    <label htmlFor="applicant-search">{t.labels.applicant}</label>
                    <input
                      id="applicant-search"
                      type="search"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder={t.placeholders.applicantSearch}
                    />
                  </div>
                  {candidateError ? (
                    <div className="status-banner status-banner--error" role="alert">
                      {candidateError}
                    </div>
                  ) : null}
                  {searchInput && search.length < SEARCH_MIN_LENGTH ? (
                    <p className="field-hint">{t.messages.searchHint}</p>
                  ) : searchLoading ? (
                    <p className="field-hint">{t.messages.searching}</p>
                  ) : searchResults.length ? (
                    <ul className="founder-list">
                      {searchResults.map((item) => {
                        const name = [item.firstName, item.middleName, item.familyName].filter(Boolean).join(" ");
                        return (
                          <li key={item.irain}>
                            <Link
                              href={`/founder/applications/new?applicant=${encodeURIComponent(item.irain)}`}
                              className="founder-list__link"
                            >
                              <div className="founder-list__title">{name || item.irain}</div>
                              <div className="founder-list__meta">
                                {item.irain} - {item.email || "-"}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="field-hint">{t.messages.searchEmpty}</p>
                  )}
                </>
              )}
            </DetailSection>

            {candidate ? (
              <>
                <DetailSection title={t.sections.company}>
                  {companiesError ? (
                    <div className="status-banner status-banner--error" role="alert">
                      {companiesError}
                    </div>
                  ) : null}
                  <div className="founder-fieldset">
                    <label htmlFor="link-company">{t.labels.company}</label>
                    <Select
                      id="link-company"
                      name="link-company"
                      options={companyOptions}
                      placeholder={t.placeholders.companySelect}
                      value={linkCompany}
                      preferNative={false}
                      onChange={(value) => {
                        setLinkCompany(Array.isArray(value) ? value[0] : value);
                        setLinkError(null);
                      }}
                    />
                    {companiesLoading ? <p className="field-hint">{t.buttons.sending}</p> : null}
                  </div>
                  <div className="founder-fieldset founder-fieldset--spaced">
                    <label htmlFor="link-position">{t.labels.position}</label>
                    <input
                      id="link-position"
                      type="text"
                      placeholder="TBD"
                      value={linkPosition}
                      onChange={(event) => setLinkPosition(event.target.value)}
                    />
                  </div>
                  <div className="founder-fieldset founder-fieldset--spaced">
                    <label htmlFor="link-reference">{t.labels.referenceNumber}</label>
                    <input
                      id="link-reference"
                      type="text"
                      placeholder="TBD"
                      value={linkReferenceNumber}
                      onChange={(event) => setLinkReferenceNumber(event.target.value)}
                    />
                  </div>
                </DetailSection>

                <DetailSection title={t.sections.resume}>
                  {pendingCvActive ? (
                    <div className="status-banner status-banner--warning" role="status">
                      {t.messages.pendingCv}
                    </div>
                  ) : null}
                  {pendingCvActive ? (
                    <div className="referrer-review__notes-grid">
                      <div className="founder-field">
                        <span>{t.labels.pendingCvRequestedAt}</span>
                        <strong>{formatTimestamp(pendingCvRequestedAt) || "-"}</strong>
                      </div>
                      <div className="founder-field">
                        <span>{t.labels.pendingCvExpiresAt}</span>
                        <strong>{formatTimestamp(pendingCvExpiresAt) || "-"}</strong>
                      </div>
                    </div>
                  ) : null}
                  <div className="founder-fieldset">
                    <label htmlFor="resume-mode">{t.labels.resumeChoice}</label>
                    <Select
                      id="resume-mode"
                      name="resume-mode"
                      options={resumeOptions}
                      value={resumeModeValue}
                      preferNative={false}
                      onChange={(value) => {
                        const nextMode = (Array.isArray(value) ? value[0] : value) as ResumeMode;
                        setResumeMode(nextMode);
                        setLinkError(null);
                        setResumeError(null);
                        setResumeSuccess(null);
                        if (nextMode !== "upload") {
                          setPendingResumeFile(null);
                        }
                      }}
                    />
                    {!hasResume && resumeMode !== "upload" ? (
                      <p className="field-hint">{t.messages.resumeMissing}</p>
                    ) : null}
                    {resumeMode === "upload" ? (
                      <p className="field-hint">{t.messages.resumeUploadRequired}</p>
                    ) : null}
                  </div>
                  {candidate.resumeFileName ? (
                    <div className="founder-field founder-field--spaced">
                      <span>{t.labels.currentResume}</span>
                      <strong>{candidate.resumeFileName}</strong>
                    </div>
                  ) : null}
                  {resumeMode === "upload" ? (
                    <div className="founder-fieldset founder-fieldset--spaced">
                      <label htmlFor="resume-upload">
                        {hasResume ? t.buttons.replaceResume : t.buttons.uploadResume}
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
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "var(--gap)", flexWrap: "wrap" }}
                          >
                            <span style={{ fontStyle: "italic" }}>{pendingResumeFile.name}</span>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <ActionBtn
                                as="button"
                                variant="primary"
                                size="sm"
                                onClick={handleResumeUploadSubmit}
                                disabled={resumeUploading}
                              >
                                {resumeUploading ? t.buttons.uploading : t.buttons.submit}
                              </ActionBtn>
                              <ActionBtn
                                as="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResumeUploadCancel}
                                disabled={resumeUploading}
                              >
                                {t.buttons.cancel}
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
                            {t.buttons.chooseFile}
                          </ActionBtn>
                        )}
                      </div>
                      <p className="field-hint">{t.hints.resumeTypes}</p>
                      {resumeError ? (
                        <div className="status-banner status-banner--error" role="alert">
                          {resumeError}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {resumeSuccess ? (
                    <div className="status-banner status-banner--ok" role="status">
                      {resumeSuccess}
                    </div>
                  ) : null}
                </DetailSection>

              </>
            ) : (
              <DetailSection title={t.sections.company}>
                <p className="field-hint">{t.messages.applicantRequired}</p>
              </DetailSection>
            )}
          </>
        }
        sidebar={
          <DetailSection title={t.sections.actions} className="referrer-review__decision">
            <div className="flow-stack">
                <ActionBtn as="button" variant="primary" onClick={handleLinkSubmit} disabled={linkSubmitDisabled}>
                  {linkSubmitting
                    ? t.buttons.sending
                    : resumeMode === "request"
                      ? t.buttons.requestCv
                      : t.buttons.createApplication}
                </ActionBtn>
              <ActionBtn as="link" href={cancelHref} variant="ghost">
                {cancelLabel}
              </ActionBtn>
              {candidate && !fromApplicant ? (
                <ActionBtn
                  as="link"
                  href={`/founder/applicants/${encodeURIComponent(candidate.irain)}`}
                  variant="ghost"
                >
                  {t.buttons.viewApplicant}
                </ActionBtn>
              ) : null}
            </div>
            {linkSuccess ? (
              <div className="status-banner status-banner--ok" role="status">
                {linkSuccess}
              </div>
            ) : null}
            {linkError ? (
              <div className="status-banner status-banner--error" role="alert">
                {linkError}
              </div>
            ) : null}
          </DetailSection>
        }
      />
    </div>
  );
}
