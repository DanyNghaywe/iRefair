"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
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

const translations = {
  en: {
    page: {
      title: "Candidate Review",
      invalidSubtitle: "Invalid candidate ID",
      notFoundTitle: "Candidate not found",
      notFoundDescription: "This candidate ID is missing or invalid.",
      notFoundRetry: "Double-check the iRAIN and try again.",
      reviewTitle: (name: string, id: string) => (name ? `${name} (${id})` : "Candidate Review"),
    },
    sections: {
      profile: "Profile",
      admin: "Admin",
      resume: "Resume",
      dataQuality: "Data quality",
      decision: "Decision",
      applications: "Applications",
    },
    labels: {
      firstName: "First Name",
      middleName: "Middle Name",
      familyName: "Family Name",
      email: "Email",
      phone: "Phone",
      candidateId: "Candidate iRAIN",
      legacyId: "Legacy Candidate ID",
      locatedCanada: "Located in Canada",
      province: "Province",
      workAuthorization: "Work Authorization",
      eligibleMove: "Eligible to Move (6 Months)",
      countryOfOrigin: "Country of Origin",
      languages: "Languages",
      languagesOther: "Languages Other",
      industryType: "Industry Type",
      industryOther: "Industry Other",
      employmentStatus: "Employment Status",
      eligibility: "Eligibility",
      currentStatus: "Current status",
      currentResume: "Current Resume",
    },
    placeholders: {
      select: "Select",
    },
    options: {
      yesNo: {
        Yes: "Yes",
        No: "No",
      },
      employment: {
        Yes: "Yes",
        No: "No",
        "Temporary Work": "Temporary Work",
      },
      languages: {
        English: "English",
        Arabic: "Arabic",
        French: "French",
        Other: "Other",
      },
    },
    statusLabels: {
      new: "New",
      reviewed: "Reviewed",
      "in progress": "In Progress",
      "on hold": "On Hold",
      closed: "Closed",
      "resume requested": "Resume Requested",
      unassigned: "Unassigned",
    },
    eligibility: {
      inCanada: "In Canada",
      canMove: "Can move in 6 months",
      notEligible: "Not eligible",
    },
    buttons: {
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      editDetails: "Edit details",
      reviewed: "Reviewed",
      markReviewed: "Mark Reviewed",
      requestResume: "Request updated resume",
      sending: "Sending...",
      archiveApplicant: "Archive applicant",
      confirmArchive: "Confirm archive",
      archiving: "Archiving...",
      backToApplicants: "Back to Applicants",
      uploadResume: "Upload Resume",
      replaceResume: "Replace Resume",
      submit: "Submit",
      uploading: "Uploading...",
      chooseFile: "Choose File",
      view: "View",
    },
    messages: {
      resumeRequestSent: "Resume request sent.",
      unableToSendRequest: "Unable to send request.",
      unableToArchive: "Unable to archive applicant.",
      invalidFileType: "Please upload a PDF, DOC, or DOCX file.",
      fileTooLarge: "File size exceeds 10MB limit.",
      unableToUploadResume: "Unable to upload resume.",
      resumeUploaded: "Resume uploaded successfully.",
    },
    hints: {
      resumeTypes: "PDF, DOC, or DOCX. Max 10MB.",
    },
    banners: {
      archiveWarning: "This will also archive all related applications.",
    },
    applications: {
      none: "No applications yet.",
      application: "Application",
      unassigned: "Unassigned",
    },
    resume: {
      none: "No resume on file.",
    },
    dataQuality: {
      complete: "Complete",
    },
  },
  fr: {
    page: {
      title: "Revue du candidat",
      invalidSubtitle: "Identifiant candidat invalide",
      notFoundTitle: "Candidat introuvable",
      notFoundDescription: "Cet identifiant de candidat est manquant ou invalide.",
      notFoundRetry: "Vérifiez l'iRAIN et réessayez.",
      reviewTitle: (name: string, id: string) => (name ? `${name} (${id})` : "Revue du candidat"),
    },
    sections: {
      profile: "Profil",
      admin: "Administration",
      resume: "CV",
      dataQuality: "Qualité des données",
      decision: "Décision",
      applications: "Candidatures",
    },
    labels: {
      firstName: "Prénom",
      middleName: "Deuxième prénom",
      familyName: "Nom de famille",
      email: "Courriel",
      phone: "Téléphone",
      candidateId: "iRAIN du candidat",
      legacyId: "Identifiant candidat hérité",
      locatedCanada: "Situé au Canada",
      province: "Province",
      workAuthorization: "Autorisation de travail",
      eligibleMove: "Admissible à déménager (6 mois)",
      countryOfOrigin: "Pays d'origine",
      languages: "Langues",
      languagesOther: "Autres langues",
      industryType: "Secteur d'activité",
      industryOther: "Autre secteur",
      employmentStatus: "Statut d'emploi",
      eligibility: "Admissibilité",
      currentStatus: "Statut actuel",
      currentResume: "CV actuel",
    },
    placeholders: {
      select: "Sélectionner",
    },
    options: {
      yesNo: {
        Yes: "Oui",
        No: "Non",
      },
      employment: {
        Yes: "Oui",
        No: "Non",
        "Temporary Work": "Travail temporaire",
      },
      languages: {
        English: "Anglais",
        Arabic: "Arabe",
        French: "Français",
        Other: "Autre",
      },
    },
    statusLabels: {
      new: "Nouveau",
      reviewed: "Révisé",
      "in progress": "En cours",
      "on hold": "En pause",
      closed: "Fermé",
      "resume requested": "CV demandé",
      unassigned: "Non assigné",
    },
    eligibility: {
      inCanada: "Au Canada",
      canMove: "Peut déménager dans 6 mois",
      notEligible: "Non admissible",
    },
    buttons: {
      save: "Enregistrer",
      saving: "Enregistrement...",
      cancel: "Annuler",
      editDetails: "Modifier les détails",
      reviewed: "Révisé",
      markReviewed: "Marquer comme révisé",
      requestResume: "Demander un CV mis à jour",
      sending: "Envoi...",
      archiveApplicant: "Archiver le candidat",
      confirmArchive: "Confirmer l'archivage",
      archiving: "Archivage...",
      backToApplicants: "Retour aux candidats",
      uploadResume: "Téléverser le CV",
      replaceResume: "Remplacer le CV",
      submit: "Soumettre",
      uploading: "Téléversement...",
      chooseFile: "Choisir un fichier",
      view: "Voir",
    },
    messages: {
      resumeRequestSent: "Demande de CV envoyée.",
      unableToSendRequest: "Impossible d'envoyer la demande.",
      unableToArchive: "Impossible d'archiver le candidat.",
      invalidFileType: "Veuillez téléverser un fichier PDF, DOC ou DOCX.",
      fileTooLarge: "La taille du fichier dépasse la limite de 10 Mo.",
      unableToUploadResume: "Impossible de téléverser le CV.",
      resumeUploaded: "CV téléversé avec succès.",
    },
    hints: {
      resumeTypes: "PDF, DOC ou DOCX. Max 10 Mo.",
    },
    banners: {
      archiveWarning: "Cela archivera également toutes les candidatures associées.",
    },
    applications: {
      none: "Aucune candidature pour l'instant.",
      application: "Candidature",
      unassigned: "Non assigné",
    },
    resume: {
      none: "Aucun CV enregistré.",
    },
    dataQuality: {
      complete: "Complet",
    },
  },
};

const YES_NO_VALUES = ["Yes", "No"] as const;
const EMPLOYMENT_VALUES = ["Yes", "No", "Temporary Work"] as const;
const LANGUAGE_VALUES = ["English", "Arabic", "French", "Other"] as const;

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

const PROVINCE_LABELS_FR: Record<string, string> = {
  Alberta: "Alberta",
  "British Columbia": "Colombie-Britannique",
  Manitoba: "Manitoba",
  "New Brunswick": "Nouveau-Brunswick",
  "Newfoundland and Labrador": "Terre-Neuve-et-Labrador",
  "Nova Scotia": "Nouvelle-Écosse",
  Ontario: "Ontario",
  "Prince Edward Island": "Île-du-Prince-Édouard",
  Quebec: "Québec",
  Saskatchewan: "Saskatchewan",
  "Northwest Territories": "Territoires du Nord-Ouest",
  Nunavut: "Nunavut",
  Yukon: "Yukon",
};

const INDUSTRY_VALUES: string[] = [
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

const INDUSTRY_LABELS_FR: Record<string, string> = {
  "Information Technology (IT)": "Technologies de l'information (TI)",
  "Finance / Banking / Accounting": "Finance / Banque / Comptabilité",
  "Healthcare / Medical": "Santé / Médical",
  "Education / Academia": "Éducation / Milieu académique",
  "Engineering / Construction": "Ingénierie / Construction",
  "Marketing / Advertising / PR": "Marketing / Publicité / RP",
  "Media / Entertainment / Journalism": "Médias / Divertissement / Journalisme",
  "Legal / Law": "Juridique / Droit",
  "Human Resources / Recruitment": "Ressources humaines / Recrutement",
  "Retail / E-commerce": "Commerce de détail / Commerce électronique",
  "Hospitality / Travel / Tourism": "Hôtellerie / Voyages / Tourisme",
  "Logistics / Transportation": "Logistique / Transport",
  Manufacturing: "Fabrication",
  "Non-Profit / NGO": "Organisme à but non lucratif / ONG",
  "Real Estate": "Immobilier",
  "Energy / Utilities": "Énergie / Services publics",
  Telecommunications: "Télécommunications",
  "Agriculture / Food Industry": "Agriculture / Industrie alimentaire",
  "Compliance/ Audit/ Monitoring & Evaluation": "Conformité / Audit / Suivi et évaluation",
  Other: "Autre",
};

const getOptionLabel = (value: string, labels?: Record<string, string>) => {
  if (!value) return value;
  return labels?.[value] ?? value;
};

const formatOptionList = (value: string, labels?: Record<string, string>) => {
  if (!value) return value;
  return value
    .split(",")
    .map((item) => {
      const trimmed = item.trim();
      return labels?.[trimmed] ?? trimmed;
    })
    .filter(Boolean)
    .join(", ");
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const computeEligibility = (
  located: string,
  eligibleMove: string,
  eligibilityCopy: { inCanada: string; canMove: string; notEligible: string },
) => {
  const locatedYes = located.trim().toLowerCase() === "yes";
  const eligibleYes = eligibleMove.trim().toLowerCase() === "yes";
  const eligible = locatedYes || eligibleYes;
  const reason = eligible
    ? locatedYes
      ? eligibilityCopy.inCanada
      : eligibilityCopy.canMove
    : eligibilityCopy.notEligible;
  return { eligible, reason };
};

export default function CandidateReviewPage() {
  const params = useParams();
  const rawId = params?.iRAIN ?? params?.irain;
  const irain = Array.isArray(rawId) ? rawId[0] : rawId;
  const cleanIrain = typeof irain === "string" ? irain.trim() : "";
  const searchParams = useSearchParams();
  const initialEdit = searchParams?.get("edit") === "1";
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];

  const yesNoLabels = t.options.yesNo;
  const employmentLabels = t.options.employment;
  const languageLabels = t.options.languages;
  const provinceLabels = language === "fr" ? PROVINCE_LABELS_FR : undefined;
  const industryLabels = language === "fr" ? INDUSTRY_LABELS_FR : undefined;

  const yesNoOptions = YES_NO_VALUES.map((value) => ({
    value,
    label: yesNoLabels[value] ?? value,
  }));
  const employmentOptions = EMPLOYMENT_VALUES.map((value) => ({
    value,
    label: employmentLabels[value] ?? value,
  }));
  const languageOptions = LANGUAGE_VALUES.map((value) => ({
    value,
    label: languageLabels[value] ?? value,
  }));
  const provinceOptions = PROVINCES.map((value) => ({
    value,
    label: getOptionLabel(value, provinceLabels),
  }));
  const industryOptions = INDUSTRY_VALUES.map((value) => ({
    value,
    label: getOptionLabel(value, industryLabels),
  }));

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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    () => computeEligibility(locatedCanada, eligibleMoveCanada, t.eligibility),
    [locatedCanada, eligibleMoveCanada, t],
  );

  const locatedCanadaLabel = getOptionLabel(locatedCanada, yesNoLabels);
  const workAuthorizationLabel = getOptionLabel(workAuthorization, yesNoLabels);
  const eligibleMoveLabel = getOptionLabel(eligibleMoveCanada, yesNoLabels);
  const provinceLabel = getOptionLabel(province, provinceLabels);
  const languagesLabel = formatOptionList(languages, languageLabels);
  const industryLabel = getOptionLabel(industryType, industryLabels);
  const employmentLabel = getOptionLabel(employmentStatus, employmentLabels);
  const statusLabels = t.statusLabels as Record<string, string>;
  const statusLabel = status ? statusLabels[status] ?? toTitleCase(status) : statusLabels.unassigned;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        next.eligibility = computeEligibility(next.locatedCanada, next.eligibleMoveCanada, t.eligibility);
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
        setActionError(data?.error || t.messages.unableToSendRequest);
      } else {
        setActionMessage(t.messages.resumeRequestSent);
        updateLocalCandidate({ status: "resume requested" });
        setStatus("resume requested");
      }
    } catch (error) {
      console.error("Request resume failed", error);
      setActionError(t.messages.unableToSendRequest);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!candidate) return;
    await patchCandidate({ status: "reviewed" });
    setStatus("reviewed");
  };

  const handleDelete = async () => {
    if (!candidate || deleteLoading) return;
    setDeleteLoading(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await fetch(
        `/api/founder/applicants/${encodeURIComponent(candidate.irain)}`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.ok) {
        setActionError(data?.error || t.messages.unableToArchive);
        setDeleteConfirm(false);
      } else {
        router.push("/founder/applicants");
      }
    } catch (error) {
      console.error("Archive applicant failed", error);
      setActionError(t.messages.unableToArchive);
      setDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
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
        setResumeFileName(data.resumeFileName || pendingResumeFile.name);
        setResumeFileId(data.resumeFileId || "");
        setResumeSuccess(t.messages.resumeUploaded);
        updateLocalCandidate({
          resumeFileName: data.resumeFileName,
          resumeFileId: data.resumeFileId,
          resumeUrl: data.resumeUrl,
        });
        setPendingResumeFile(null);
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

  if (!cleanIrain) {
    return (
      <div className="founder-page">
        <Topbar title={t.page.title} subtitle={t.page.invalidSubtitle} />
        <div className="card referrer-review__empty">
          <h2>{t.page.notFoundTitle}</h2>
          <p className="field-hint">{t.page.notFoundDescription}</p>
          <ActionBtn as="link" href="/founder/applicants" variant="ghost">
            &larr; {t.buttons.backToApplicants}
          </ActionBtn>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="founder-page">
        <Topbar title={t.page.title} subtitle={cleanIrain.toUpperCase()} />
        <DetailPageShell
          main={
            <>
              <DetailSection title={t.sections.profile}>
                <SkeletonDetailGrid fields={8} />
              </DetailSection>
              <DetailSection title={t.sections.admin}>
                <SkeletonDetailGrid fields={4} />
              </DetailSection>
            </>
          }
          sidebar={
            <DetailSection title={t.sections.decision}>
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
        <Topbar title={t.page.title} subtitle={cleanIrain.toUpperCase()} />
        <div className="card referrer-review__empty">
          <h2>{t.page.notFoundTitle}</h2>
          <p className="field-hint">{t.page.notFoundRetry}</p>
          <ActionBtn as="link" href="/founder/applicants" variant="ghost">
            &larr; {t.buttons.backToApplicants}
          </ActionBtn>
        </div>
      </div>
    );
  }

  const headerId = candidate.irain || cleanIrain;
  const headerTitle = t.page.reviewTitle(fullName, headerId);
  const missingFieldsLabel = candidate.missingFields.length
    ? candidate.missingFields.join(", ")
    : t.dataQuality.complete;

  return (
    <div className="founder-page">
      <Topbar title={headerTitle} subtitle={email || headerId} />

      <DetailPageShell
        main={
          <>
            <DetailSection title={t.sections.profile}>
              <div className="field-grid field-grid--two">
                <div className="field">
                  <label htmlFor="candidate-first-name">{t.labels.firstName}</label>
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
                  <label htmlFor="candidate-middle-name">{t.labels.middleName}</label>
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
                  <label htmlFor="candidate-family-name">{t.labels.familyName}</label>
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
                  <label htmlFor="candidate-email">{t.labels.email}</label>
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
                  <label htmlFor="candidate-phone">{t.labels.phone}</label>
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
                  <label htmlFor="candidate-irain">{t.labels.candidateId}</label>
                  <input id="candidate-irain" type="text" value={candidate.irain || "-"} readOnly tabIndex={-1} />
                </div>
                <div className="field">
                  <label htmlFor="candidate-legacy-id">{t.labels.legacyId}</label>
                  <input
                    id="candidate-legacy-id"
                    type="text"
                    value={candidate.legacyCandidateId || "-"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
                <div className="field">
                  <label htmlFor="candidate-located">{t.labels.locatedCanada}</label>
                  {editDetails ? (
                    <Select
                      id="candidate-located"
                      name="candidate-located"
                      options={yesNoOptions}
                      placeholder={t.placeholders.select}
                      value={locatedCanada}
                      onChange={(value) => setLocatedCanada(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-located"
                      type="text"
                      value={locatedCanadaLabel || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                {locatedCanada === "Yes" && (
                  <div className="field">
                    <label htmlFor="candidate-province">{t.labels.province}</label>
                    {editDetails ? (
                      <Select
                        id="candidate-province"
                        name="candidate-province"
                        options={provinceOptions}
                        placeholder={t.placeholders.select}
                        value={province}
                        onChange={(value) => setProvince(Array.isArray(value) ? value[0] : value)}
                      />
                    ) : (
                      <input
                        id="candidate-province"
                        type="text"
                        value={provinceLabel || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                {locatedCanada === "Yes" && (
                  <div className="field">
                    <label htmlFor="candidate-work-auth">{t.labels.workAuthorization}</label>
                    {editDetails ? (
                      <Select
                        id="candidate-work-auth"
                        name="candidate-work-auth"
                        options={yesNoOptions}
                        placeholder={t.placeholders.select}
                        value={workAuthorization}
                        onChange={(value) => setWorkAuthorization(Array.isArray(value) ? value[0] : value)}
                      />
                    ) : (
                      <input
                        id="candidate-work-auth"
                        type="text"
                        value={workAuthorizationLabel || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                {locatedCanada === "No" && (
                  <div className="field">
                    <label htmlFor="candidate-eligible-move">{t.labels.eligibleMove}</label>
                    {editDetails ? (
                      <Select
                        id="candidate-eligible-move"
                        name="candidate-eligible-move"
                        options={yesNoOptions}
                        placeholder={t.placeholders.select}
                        value={eligibleMoveCanada}
                        onChange={(value) => setEligibleMoveCanada(Array.isArray(value) ? value[0] : value)}
                      />
                    ) : (
                      <input
                        id="candidate-eligible-move"
                        type="text"
                        value={eligibleMoveLabel || "-"}
                        readOnly
                        tabIndex={-1}
                      />
                    )}
                  </div>
                )}
                <div className="field">
                  <label htmlFor="candidate-country">{t.labels.countryOfOrigin}</label>
                  {editDetails ? (
                    <Select
                      id="candidate-country"
                      name="candidate-country"
                      options={countryOptions()}
                      placeholder={t.placeholders.select}
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
                  <label htmlFor="candidate-languages">{t.labels.languages}</label>
                  {editDetails ? (
                    <Select
                      id="candidate-languages"
                      name="candidate-languages"
                      options={languageOptions}
                      placeholder={t.placeholders.select}
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
                      value={languagesLabel || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                {languages.includes("Other") && (
                  <div className="field">
                    <label htmlFor="candidate-languages-other">{t.labels.languagesOther}</label>
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
                  <label htmlFor="candidate-industry-type">{t.labels.industryType}</label>
                  {editDetails ? (
                    <Select
                      id="candidate-industry-type"
                      name="candidate-industry-type"
                      options={industryOptions}
                      placeholder={t.placeholders.select}
                      value={industryType}
                      onChange={(value) => setIndustryType(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-industry-type"
                      type="text"
                      value={industryLabel || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                {industryType === "Other" && (
                  <div className="field">
                    <label htmlFor="candidate-industry-other">{t.labels.industryOther}</label>
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
                  <label htmlFor="candidate-employment-status">{t.labels.employmentStatus}</label>
                  {editDetails ? (
                    <Select
                      id="candidate-employment-status"
                      name="candidate-employment-status"
                      options={employmentOptions}
                      placeholder={t.placeholders.select}
                      value={employmentStatus}
                      onChange={(value) => setEmploymentStatus(Array.isArray(value) ? value[0] : value)}
                    />
                  ) : (
                    <input
                      id="candidate-employment-status"
                      type="text"
                      value={employmentLabel || "-"}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="candidate-eligibility">{t.labels.eligibility}</label>
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

            <DetailSection title={t.sections.resume}>
              {resumeFileName ? (
                <div className="field-grid">
                  <div className="field">
                    <label>{t.labels.currentResume}</label>
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
                          {t.buttons.view}
                        </ActionBtn>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="founder-card__meta">{t.resume.none}</p>
              )}
              <div className="field" style={{ marginTop: "var(--gap)" }}>
                <label htmlFor="resume-upload">
                  {resumeFileName ? t.buttons.replaceResume : t.buttons.uploadResume}
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

            <DetailSection title={t.sections.dataQuality}>
              {candidate.missingFields.length ? (
                <div className="founder-pill">{missingFieldsLabel}</div>
              ) : (
                <div className="founder-pill founder-pill--success">{t.dataQuality.complete}</div>
              )}
            </DetailSection>
          </>
        }
        sidebar={
          <>
            <DetailSection title={t.sections.decision} className="referrer-review__decision">
              <div className="field">
                <label htmlFor="decision-status">{t.labels.currentStatus}</label>
                <input
                  id="decision-status"
                  type="text"
                  value={statusLabel}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                />
              </div>
              <div className="flow-stack">
                {editDetails ? (
                  <>
                    <ActionBtn as="button" variant="primary" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? t.buttons.saving : t.buttons.save}
                    </ActionBtn>
                    <ActionBtn as="button" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
                      {t.buttons.cancel}
                    </ActionBtn>
                  </>
                ) : (
                  <ActionBtn as="button" variant="ghost" onClick={handleStartEdit}>
                    {t.buttons.editDetails}
                  </ActionBtn>
                )}
                <ActionBtn
                  as="button"
                  variant={status === "reviewed" ? "ghost" : "primary"}
                  onClick={handleMarkReviewed}
                  disabled={status === "reviewed"}
                >
                  {status === "reviewed" ? t.buttons.reviewed : t.buttons.markReviewed}
                </ActionBtn>
                <ActionBtn
                  as="button"
                  variant="ghost"
                  onClick={handleRequestResume}
                  disabled={actionLoading}
                >
                  {actionLoading ? t.buttons.sending : t.buttons.requestResume}
                </ActionBtn>
                {deleteConfirm ? (
                  <>
                    <div className="status-banner status-banner--warning" role="alert" style={{ marginBottom: "8px" }}>
                      {t.banners.archiveWarning}
                    </div>
                    <ActionBtn
                      as="button"
                      className="action-btn--danger"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? t.buttons.archiving : t.buttons.confirmArchive}
                    </ActionBtn>
                    <ActionBtn
                      as="button"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleteLoading}
                    >
                      {t.buttons.cancel}
                    </ActionBtn>
                  </>
                ) : (
                  <ActionBtn
                    as="button"
                    variant="ghost"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    {t.buttons.archiveApplicant}
                  </ActionBtn>
                )}
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
                &larr; {t.buttons.backToApplicants}
              </ActionBtn>
            </DetailSection>

            <DetailSection title={t.sections.applications}>
              {appsLoading ? (
                <SkeletonStack>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </SkeletonStack>
              ) : applications.length === 0 ? (
                <p className="founder-card__meta">{t.applications.none}</p>
              ) : (
                <ul className="founder-list">
                  {applications.map((app) => (
                    <li key={app.id}>
                      <Link href={`/founder/applications/${app.id}`} className="founder-list__link">
                        <div className="founder-list__title">
                          {app.position || t.applications.application} <Badge tone="neutral">{app.iCrn}</Badge>
                        </div>
                        <div className="founder-list__meta">
                          {app.id} - {app.status || t.applications.unassigned}
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
