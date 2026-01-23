"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ActionBtn } from "@/components/ActionBtn";
import { CenteredModal } from "@/components/CenteredModal";
import { DatePicker } from "@/components/DatePicker";
import { EmptyState } from "@/components/founder/EmptyState";
import { Skeleton, SkeletonPortalRows, SkeletonStack } from "@/components/founder/Skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import { Select } from "@/components/Select";
import { TimePicker } from "@/components/TimePicker";
import { useToast } from "@/components/Toast";
import { getAllTimezoneOptions } from "@/lib/timezone";

type Language = "en" | "fr";

const translations: Record<
  Language,
  {
    header: {
      eyebrow: string;
      title: string;
      lead: string;
      referrer: string;
      email: string;
      company: string;
      total: string;
      noEmail: string;
      filterByCompany: string;
      allCompanies: string;
    };
    table: {
      title: string;
      activeReferrals: string;
      totalLabel: string;
      candidate: string;
      position: string;
      cv: string;
      status: string;
      actions: string;
      downloadCv: string;
      noCv: string;
      appId: string;
      iRCRN: string;
      caption: string;
    };
    statuses: Record<string, string>;
    actionLabels: Record<string, string>;
    modalTitles: Record<string, string>;
    modalDescriptions: Record<string, string>;
    successMessages: Record<string, string>;
    modal: {
      cancel: string;
      confirm: string;
      sending: string;
      date: string;
      time: string;
      timezone: string;
      meetingUrl: string;
      meetingUrlPlaceholder: string;
      notes: string;
      notesPlaceholder: string;
      reason: string;
      reasonPlaceholder: string;
      includeUpdateLink: string;
      missingFields: string;
      reasonRequired: string;
      reasonRequiredMessage: string;
    };
    empty: {
      title: string;
      description: string;
    };
    error: {
      loadFailed: string;
      errorLabel: string;
      noData: string;
      refreshMessage: string;
    };
    expiredLink: {
      checkEmail: string;
      sentMessage: string;
      expiredTitle: string;
      expiredMessage: string;
      emailPlaceholder: string;
      sendNewLink: string;
      sending: string;
      emailRequired: string;
      emailRequiredMessage: string;
      linkSent: string;
      linkSentMessage: string;
      requestFailed: string;
    };
    reschedule: string;
    join: string;
    languageLabel: string;
    english: string;
    french: string;
    expanded: {
      countryOfOrigin: string;
      languages: string;
      location: string;
      workAuthorization: string;
      eligibleToMove: string;
      industry: string;
      employmentStatus: string;
      inCanada: string;
      outsideCanada: string;
      yes: string;
      no: string;
      employed: string;
      notEmployed: string;
      tempWork: string;
      notProvided: string;
    };
    history: {
      title: string;
      noHistory: string;
      by: string;
    };
  }
> = {
  en: {
    header: {
      eyebrow: "Referrer portal",
      title: "Track your referrals",
      lead: "Review candidates, download CVs, and manage your referrals.",
      referrer: "Referrer",
      email: "Email",
      company: "Company",
      total: "Total",
      noEmail: "No email on file",
      filterByCompany: "Filter by company",
      allCompanies: "All companies",
    },
    table: {
      title: "Applications",
      activeReferrals: "active referrals",
      totalLabel: "total",
      candidate: "Applicant",
      position: "Position / iRCRN",
      cv: "CV",
      status: "Status",
      actions: "Actions",
      downloadCv: "Download CV",
      noCv: "No CV available",
      appId: "App ID",
      iRCRN: "iRCRN",
      caption: "Referrer portal applications",
    },
    statuses: {
      new: "New",
      "meeting requested": "Meeting Requested",
      "meeting scheduled": "Meeting Scheduled",
      "needs reschedule": "Needs Reschedule",
      "met with referrer": "Met with Referrer",
      interviewed: "Met with Referrer",
      "submitted cv to hr": "Submitted CV to HR",
      "interviews being conducted": "Interviews Being Conducted",
      "job offered": "Job Offered",
      "landed job": "Landed Job",
      "not a good fit": "Not a Good Fit",
      "applicant no longer interested": "Applicant No Longer Interested",
      "applicant decided not to move forward": "Applicant Decided Not to Move Forward",
      "hr decided not to proceed": "HR Decided Not to Proceed",
      "another applicant was a better fit": "Another Applicant Was a Better Fit",
      "candidate did not accept offer": "Candidate Did Not Accept Offer",
      "cv mismatch": "CV Mismatch",
      "cv update requested": "CV Update Requested",
      "cv updated": "CV Updated",
      "info requested": "Info Requested",
      "info updated": "Info Updated",
      ineligible: "Ineligible",
    },
    actionLabels: {
      SCHEDULE_MEETING: "Schedule Meeting",
      CANCEL_MEETING: "Cancel Meeting",
      REJECT: "Not a Good Fit",
      CV_MISMATCH: "CV Doesn't Match",
      REQUEST_CV_UPDATE: "Request CV Update",
      REQUEST_INFO: "Missing Information",
      MARK_INTERVIEWED: "Mark Met with Referrer",
      SUBMIT_CV_TO_HR: "Submitted CV to HR",
      HR_INTERVIEWS: "Interviews being conducted",
      HR_DECIDED_NOT_TO_PROCEED: "HR decided not to proceed",
      HR_PROVIDED_OFFER: "HR provided offer",
      APPLICANT_NO_LONGER_INTERESTED: "Applicant no longer interested",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Applicant decided not to move forward",
      ANOTHER_APPLICANT_BETTER_FIT: "Another applicant was a better fit",
      CANDIDATE_ACCEPTED_OFFER: "Candidate accepted offer",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Candidate did not accept offer",
      CV_UPDATED: "CV Updated",
      APPLICANT_UPDATED: "Applicant Updated Profile",
      RESCIND_REJECTION: "Rescind Rejection",
    },
    modalTitles: {
      SCHEDULE_MEETING: "Schedule Meeting",
      CANCEL_MEETING: "Cancel Meeting",
      REJECT: "Not a Good Fit",
      CV_MISMATCH: "CV Doesn't Match",
      REQUEST_CV_UPDATE: "Request CV Update",
      REQUEST_INFO: "Request Information",
      MARK_INTERVIEWED: "Mark Met with Referrer",
      SUBMIT_CV_TO_HR: "Submitted CV to HR",
      HR_INTERVIEWS: "Interviews being conducted",
      HR_DECIDED_NOT_TO_PROCEED: "HR decided not to proceed",
      HR_PROVIDED_OFFER: "HR provided offer",
      APPLICANT_NO_LONGER_INTERESTED: "Applicant no longer interested",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Applicant decided not to move forward",
      ANOTHER_APPLICANT_BETTER_FIT: "Another applicant was a better fit",
      CANDIDATE_ACCEPTED_OFFER: "Candidate accepted offer",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Candidate did not accept offer",
      RESCIND_REJECTION: "Rescind Rejection",
      default: "Confirm Action",
    },
    modalDescriptions: {
      SCHEDULE_MEETING: "Schedule a meeting with this candidate. They will receive an email with the details.",
      CANCEL_MEETING: "Cancel the scheduled meeting. The candidate will be notified.",
      REJECT: "Mark this candidate as not a good fit. They will receive a polite rejection email.",
      CV_MISMATCH: "The CV doesn't match your requirements. The candidate will receive feedback.",
      REQUEST_CV_UPDATE: "Request the candidate to update their CV. They will receive a link to make changes.",
      REQUEST_CV_UPDATE_MEETING_WARNING: "A meeting is scheduled with this candidate. Requesting a CV update will cancel the meeting. You can reschedule after reviewing the updated CV.",
      REQUEST_INFO: "Request additional information from the candidate.",
      MARK_INTERVIEWED: "Mark that this candidate met with the referrer. They will receive a confirmation.",
      SUBMIT_CV_TO_HR: "Confirm that the candidate CV has been submitted to HR. They will be notified.",
      HR_INTERVIEWS: "Mark that HR interviews are currently being conducted.",
      HR_DECIDED_NOT_TO_PROCEED: "HR has decided not to proceed with this candidate. They will be notified.",
      HR_PROVIDED_OFFER: "HR has provided an offer. The candidate will be notified.",
      APPLICANT_NO_LONGER_INTERESTED: "Mark that the applicant is no longer interested. They will be notified.",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "The applicant decided not to move forward. They will be notified.",
      ANOTHER_APPLICANT_BETTER_FIT: "Another applicant was a better fit. This candidate will be notified.",
      CANDIDATE_ACCEPTED_OFFER: "Mark that the candidate accepted the offer. This will close the application.",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Mark that the candidate did not accept the offer. A reason is required.",
      RESCIND_REJECTION: "Undo the rejection and give this candidate another chance. Their status will be reset to New.",
    },
    successMessages: {
      SCHEDULE_MEETING: "Meeting scheduled and candidate notified.",
      CANCEL_MEETING: "Meeting cancelled and candidate notified.",
      REJECT: "Candidate marked as not a good fit.",
      CV_MISMATCH: "CV feedback sent to candidate.",
      REQUEST_CV_UPDATE: "CV update request sent to candidate.",
      REQUEST_INFO: "Information request sent to candidate.",
      MARK_INTERVIEWED: "Candidate marked as met with the referrer.",
      SUBMIT_CV_TO_HR: "CV submitted to HR and candidate notified.",
      HR_INTERVIEWS: "HR interview stage started.",
      HR_DECIDED_NOT_TO_PROCEED: "HR decline sent to candidate.",
      HR_PROVIDED_OFFER: "Offer sent to candidate.",
      APPLICANT_NO_LONGER_INTERESTED: "Candidate marked as no longer interested.",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Candidate marked as not moving forward.",
      ANOTHER_APPLICANT_BETTER_FIT: "Candidate notified about the decision.",
      CANDIDATE_ACCEPTED_OFFER: "Candidate marked as accepted offer.",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Candidate marked as declined offer.",
      RESCIND_REJECTION: "Rejection rescinded. Candidate is back under consideration.",
      default: "Action completed successfully.",
    },
    modal: {
      cancel: "Cancel",
      confirm: "Confirm",
      sending: "Sending...",
      date: "Date",
      time: "Time",
      timezone: "Timezone",
      meetingUrl: "Meeting URL",
      meetingUrlPlaceholder: "https://zoom.us/j/...",
      notes: "Notes (optional)",
      notesPlaceholder: "Add any notes or feedback...",
      reason: "Reason (required)",
      reasonPlaceholder: "Add the reason the candidate did not accept the offer...",
      includeUpdateLink: "Include link for candidate to update their CV",
      missingFields: "Please fill in date, time, timezone, and meeting URL.",
      reasonRequired: "Reason required",
      reasonRequiredMessage: "Please provide the reason the candidate did not accept the offer.",
    },
    empty: {
      title: "No applications assigned",
      description: "Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review.",
    },
    error: {
      loadFailed: "We could not load the portal",
      errorLabel: "Error",
      noData: "No data available",
      refreshMessage: "Please refresh to try again.",
    },
    expiredLink: {
      checkEmail: "Check your email",
      sentMessage: "We've sent a new portal access link to",
      expiredTitle: "Access Link Expired",
      expiredMessage: "Your portal access link has expired or been revoked. Enter your email to receive a fresh link.",
      emailPlaceholder: "your.email@example.com",
      sendNewLink: "Send New Link",
      sending: "Sending...",
      emailRequired: "Email required",
      emailRequiredMessage: "Please enter your email address.",
      linkSent: "Link sent",
      linkSentMessage: "Check your email for a new portal link.",
      requestFailed: "Request failed",
    },
    reschedule: "Candidate requested to reschedule.",
    join: "Join",
    languageLabel: "Language",
    english: "English",
    french: "Français",
    expanded: {
      countryOfOrigin: "Country of Origin",
      languages: "Languages",
      location: "Location",
      workAuthorization: "Work Authorization",
      eligibleToMove: "Eligible to Move",
      industry: "Industry",
      employmentStatus: "Employment Status",
      inCanada: "In Canada",
      outsideCanada: "Outside Canada",
      yes: "Yes",
      no: "No",
      employed: "Currently Employed",
      notEmployed: "Not Employed",
      tempWork: "Temporary Work",
      notProvided: "Not provided",
    },
    history: {
      title: "Activity History",
      noHistory: "No activity recorded yet",
      by: "by",
    },
  },
  fr: {
    header: {
      eyebrow: "Portail référent",
      title: "Suivez vos recommandations",
      lead: "Examinez les candidats, téléchargez les CV et gérez vos recommandations.",
      referrer: "Référent",
      email: "E-mail",
      company: "Entreprise",
      total: "Total",
      noEmail: "Aucun e-mail enregistré",
      filterByCompany: "Filtrer par entreprise",
      allCompanies: "Toutes les entreprises",
    },
    table: {
      title: "Candidatures",
      activeReferrals: "recommandations actives",
      totalLabel: "total",
      candidate: "Candidat(e)",
      position: "Poste / iRCRN",
      cv: "CV",
      status: "Statut",
      actions: "Actions",
      downloadCv: "Télécharger le CV",
      noCv: "Aucun CV disponible",
      appId: "ID candidature",
      iRCRN: "iRCRN",
      caption: "Candidatures du portail référent",
    },
    statuses: {
      new: "Nouveau",
      "meeting requested": "Réunion demandée",
      "meeting scheduled": "Réunion planifiée",
      "needs reschedule": "À replanifier",
      "met with referrer": "Rencontré avec le référent",
      interviewed: "Rencontré avec le référent",
      "submitted cv to hr": "CV transmis aux RH",
      "interviews being conducted": "Entretiens en cours",
      "job offered": "Offre d'emploi",
      "landed job": "Poste accepté",
      "not a good fit": "Profil non retenu",
      "applicant no longer interested": "Le candidat n'est plus intéressé",
      "applicant decided not to move forward": "Le candidat a décidé de ne pas poursuivre",
      "hr decided not to proceed": "Les RH ont décidé de ne pas poursuivre",
      "another applicant was a better fit": "Un autre candidat correspondait mieux",
      "candidate did not accept offer": "Le candidat n'a pas accepté l'offre",
      "cv mismatch": "CV inadapté",
      "cv update requested": "Mise à jour CV demandée",
      "cv updated": "CV mis à jour",
      "info requested": "Informations demandées",
      "info updated": "Informations mises à jour",
      ineligible: "Non admissible",
    },
    actionLabels: {
      SCHEDULE_MEETING: "Planifier une réunion",
      CANCEL_MEETING: "Annuler la réunion",
      REJECT: "Profil non retenu",
      CV_MISMATCH: "CV non conforme",
      REQUEST_CV_UPDATE: "Demander mise à jour CV",
      REQUEST_INFO: "Informations manquantes",
      MARK_INTERVIEWED: "Marquer comme rencontré avec le référent",
      SUBMIT_CV_TO_HR: "CV transmis aux RH",
      HR_INTERVIEWS: "Entretiens en cours",
      HR_DECIDED_NOT_TO_PROCEED: "Les RH ont décidé de ne pas poursuivre",
      HR_PROVIDED_OFFER: "Les RH ont proposé une offre",
      APPLICANT_NO_LONGER_INTERESTED: "Le candidat n'est plus intéressé",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Le candidat a décidé de ne pas poursuivre",
      ANOTHER_APPLICANT_BETTER_FIT: "Un autre candidat correspondait mieux",
      CANDIDATE_ACCEPTED_OFFER: "Le candidat a accepté l'offre",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Le candidat n'a pas accepté l'offre",
      CV_UPDATED: "CV mis à jour",
      APPLICANT_UPDATED: "Profil candidat mis a jour",
      RESCIND_REJECTION: "Annuler le refus",
    },
    modalTitles: {
      SCHEDULE_MEETING: "Planifier une réunion",
      CANCEL_MEETING: "Annuler la réunion",
      REJECT: "Profil non retenu",
      CV_MISMATCH: "CV non conforme",
      REQUEST_CV_UPDATE: "Demander mise à jour CV",
      REQUEST_INFO: "Demander des informations",
      MARK_INTERVIEWED: "Marquer comme rencontré avec le référent",
      SUBMIT_CV_TO_HR: "CV transmis aux RH",
      HR_INTERVIEWS: "Entretiens en cours",
      HR_DECIDED_NOT_TO_PROCEED: "Les RH ont décidé de ne pas poursuivre",
      HR_PROVIDED_OFFER: "Les RH ont proposé une offre",
      APPLICANT_NO_LONGER_INTERESTED: "Le candidat n'est plus intéressé",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Le candidat a décidé de ne pas poursuivre",
      ANOTHER_APPLICANT_BETTER_FIT: "Un autre candidat correspondait mieux",
      CANDIDATE_ACCEPTED_OFFER: "Le candidat a accepté l'offre",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Le candidat n'a pas accepté l'offre",
      RESCIND_REJECTION: "Annuler le refus",
      default: "Confirmer l'action",
    },
    modalDescriptions: {
      SCHEDULE_MEETING: "Planifiez une réunion avec ce candidat. Il recevra un e-mail avec les détails.",
      CANCEL_MEETING: "Annulez la réunion prévue. Le candidat sera informé.",
      REJECT: "Marquez ce candidat comme non retenu. Il recevra un e-mail de refus courtois.",
      CV_MISMATCH: "Le CV ne correspond pas à vos exigences. Le candidat recevra un retour.",
      REQUEST_CV_UPDATE: "Demandez au candidat de mettre à jour son CV. Il recevra un lien pour effectuer les modifications.",
      REQUEST_CV_UPDATE_MEETING_WARNING: "Une réunion est prévue avec ce candidat. Demander une mise à jour du CV annulera la réunion. Vous pourrez replanifier après avoir examiné le CV mis à jour.",
      REQUEST_INFO: "Demandez des informations supplémentaires au candidat.",
      MARK_INTERVIEWED: "Marquez ce candidat comme ayant rencontré le référent. Il recevra une confirmation.",
      SUBMIT_CV_TO_HR: "Confirmez que le CV a été transmis aux RH. Le candidat sera informé.",
      HR_INTERVIEWS: "Marquez que les entretiens RH sont en cours.",
      HR_DECIDED_NOT_TO_PROCEED: "Les RH ont décidé de ne pas poursuivre. Le candidat sera informé.",
      HR_PROVIDED_OFFER: "Les RH ont fait une offre. Le candidat sera informé.",
      APPLICANT_NO_LONGER_INTERESTED: "Marquez que le candidat n'est plus intéressé. Il sera informé.",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Le candidat a décidé de ne pas poursuivre. Il sera informé.",
      ANOTHER_APPLICANT_BETTER_FIT: "Un autre candidat correspondait mieux. Le candidat sera informé.",
      CANDIDATE_ACCEPTED_OFFER: "Marquez que le candidat a accepté l'offre. Cela clôturera la candidature.",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Marquez que le candidat n'a pas accepté l'offre. Une raison est requise.",
      RESCIND_REJECTION: "Annulez le refus et donnez une autre chance à ce candidat. Son statut sera réinitialisé à Nouveau.",
    },
    successMessages: {
      SCHEDULE_MEETING: "Réunion planifiée et candidat informé.",
      CANCEL_MEETING: "Réunion annulée et candidat informé.",
      REJECT: "Candidat marqué comme non retenu.",
      CV_MISMATCH: "Retour sur le CV envoyé au candidat.",
      REQUEST_CV_UPDATE: "Demande de mise à jour du CV envoyée au candidat.",
      REQUEST_INFO: "Demande d'informations envoyée au candidat.",
      MARK_INTERVIEWED: "Candidat marqué comme rencontré avec le référent.",
      SUBMIT_CV_TO_HR: "CV transmis aux RH et candidat informé.",
      HR_INTERVIEWS: "Entretiens RH en cours.",
      HR_DECIDED_NOT_TO_PROCEED: "Refus RH envoyé au candidat.",
      HR_PROVIDED_OFFER: "Offre envoyée au candidat.",
      APPLICANT_NO_LONGER_INTERESTED: "Candidat marqué comme non intéressé.",
      APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD: "Candidat marqué comme ne poursuivant pas.",
      ANOTHER_APPLICANT_BETTER_FIT: "Décision communiquée au candidat.",
      CANDIDATE_ACCEPTED_OFFER: "Candidat marqué comme ayant accepté l'offre.",
      CANDIDATE_DID_NOT_ACCEPT_OFFER: "Candidat marqué comme ayant refusé l'offre.",
      RESCIND_REJECTION: "Refus annulé. Le candidat est de nouveau pris en considération.",
      default: "Action effectuée avec succès.",
    },
    modal: {
      cancel: "Annuler",
      confirm: "Confirmer",
      sending: "Envoi...",
      date: "Date",
      time: "Heure",
      timezone: "Fuseau horaire",
      meetingUrl: "URL de la réunion",
      meetingUrlPlaceholder: "https://zoom.us/j/...",
      notes: "Notes (optionnel)",
      notesPlaceholder: "Ajoutez des notes ou commentaires...",
      reason: "Raison (requise)",
      reasonPlaceholder: "Ajoutez la raison pour laquelle le candidat n'a pas accepté l'offre...",
      includeUpdateLink: "Inclure un lien pour que le candidat mette à jour son CV",
      missingFields: "Veuillez remplir la date, l'heure, le fuseau horaire et l'URL de la réunion.",
      reasonRequired: "Raison requise",
      reasonRequiredMessage: "Veuillez indiquer la raison pour laquelle le candidat n'a pas accepté l'offre.",
    },
    empty: {
      title: "Aucune candidature assignée",
      description: "Les candidatures apparaîtront ici une fois qu'elles vous seront assignées. Revenez bientôt pour de nouvelles recommandations à examiner.",
    },
    error: {
      loadFailed: "Impossible de charger le portail",
      errorLabel: "Erreur",
      noData: "Aucune donnée disponible",
      refreshMessage: "Veuillez actualiser pour réessayer.",
    },
    expiredLink: {
      checkEmail: "Vérifiez votre e-mail",
      sentMessage: "Nous avons envoyé un nouveau lien d'accès au portail à",
      expiredTitle: "Lien d'accès expiré",
      expiredMessage: "Votre lien d'accès au portail a expiré ou a été révoqué. Entrez votre e-mail pour recevoir un nouveau lien.",
      emailPlaceholder: "votre.email@exemple.com",
      sendNewLink: "Envoyer un nouveau lien",
      sending: "Envoi...",
      emailRequired: "E-mail requis",
      emailRequiredMessage: "Veuillez entrer votre adresse e-mail.",
      linkSent: "Lien envoyé",
      linkSentMessage: "Vérifiez votre e-mail pour le nouveau lien du portail.",
      requestFailed: "Échec de la demande",
    },
    reschedule: "Le candidat a demandé à replanifier.",
    join: "Rejoindre",
    languageLabel: "Langue",
    english: "English",
    french: "Français",
    expanded: {
      countryOfOrigin: "Pays d'origine",
      languages: "Langues",
      location: "Emplacement",
      workAuthorization: "Autorisation de travail",
      eligibleToMove: "Éligible à déménager",
      industry: "Secteur",
      employmentStatus: "Statut d'emploi",
      inCanada: "Au Canada",
      outsideCanada: "Hors du Canada",
      yes: "Oui",
      no: "Non",
      employed: "Actuellement employé",
      notEmployed: "Sans emploi",
      tempWork: "Travail temporaire",
      notProvided: "Non fourni",
    },
    history: {
      title: "Historique des activités",
      noHistory: "Aucune activité enregistrée",
      by: "par",
    },
  },
};

type PortalItem = {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  position: string;
  iCrn: string;
  companyId?: string;
  companyName?: string;
  resumeFileName: string;
  resumeDownloadUrl?: string;
  status: string;
  ownerNotes: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingTimezone?: string;
  meetingUrl?: string;
  // Additional applicant details for expanded view
  countryOfOrigin?: string;
  languages?: string;
  languagesOther?: string;
  locatedCanada?: string;
  province?: string;
  authorizedCanada?: string;
  eligibleMoveCanada?: string;
  industryType?: string;
  industryOther?: string;
  employmentStatus?: string;
  // Action history
  actionHistory?: Array<{
    action: string;
    timestamp: string;
    performedBy: string;
    performedByEmail?: string;
    notes?: string;
    meetingDetails?: {
      date: string;
      time: string;
      timezone: string;
      url: string;
    };
  }>;
};

type PortalCompany = {
  id: string;
  name: string;
  ircrn: string;
};

type PortalResponse = {
  ok: true;
  referrer: { irref: string; name?: string; email?: string; company?: string };
  items: PortalItem[];
  companies?: PortalCompany[];
  total: number;
};

type FeedbackAction =
  | "SCHEDULE_MEETING"
  | "CANCEL_MEETING"
  | "REJECT"
  | "CV_MISMATCH"
  | "REQUEST_CV_UPDATE"
  | "REQUEST_INFO"
  | "MARK_INTERVIEWED"
  | "SUBMIT_CV_TO_HR"
  | "HR_INTERVIEWS"
  | "HR_DECIDED_NOT_TO_PROCEED"
  | "HR_PROVIDED_OFFER"
  | "APPLICANT_NO_LONGER_INTERESTED"
  | "APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD"
  | "ANOTHER_APPLICANT_BETTER_FIT"
  | "CANDIDATE_ACCEPTED_OFFER"
  | "CANDIDATE_DID_NOT_ACCEPT_OFFER";

const STATUS_VARIANTS: Record<string, "info" | "success" | "warning" | "error" | "neutral"> = {
  new: "info",
  "meeting requested": "info",
  "meeting scheduled": "success",
  "needs reschedule": "warning",
  "met with referrer": "success",
  interviewed: "success",
  "submitted cv to hr": "info",
  "interviews being conducted": "info",
  "job offered": "success",
  "landed job": "success",
  "not a good fit": "error",
  "applicant no longer interested": "error",
  "applicant decided not to move forward": "error",
  "hr decided not to proceed": "error",
  "another applicant was a better fit": "error",
  "candidate did not accept offer": "error",
  "cv mismatch": "warning",
  "cv update requested": "warning",
  "cv updated": "info",
  "info requested": "warning",
  "info updated": "info",
  ineligible: "error",
};

const ACTIONS: FeedbackAction[] = [
  "SCHEDULE_MEETING",
  "CANCEL_MEETING",
  "MARK_INTERVIEWED",
  "SUBMIT_CV_TO_HR",
  "HR_INTERVIEWS",
  "HR_PROVIDED_OFFER",
  "CANDIDATE_ACCEPTED_OFFER",
  "CANDIDATE_DID_NOT_ACCEPT_OFFER",
  "REQUEST_CV_UPDATE",
  "REQUEST_INFO",
  "REJECT",
  "CV_MISMATCH",
  "APPLICANT_NO_LONGER_INTERESTED",
  "HR_DECIDED_NOT_TO_PROCEED",
  "APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD",
  "ANOTHER_APPLICANT_BETTER_FIT",
];

const TERMINAL_STATUSES = new Set([
  "not a good fit",
  "cv mismatch",
  "applicant no longer interested",
  "applicant decided not to move forward",
  "hr decided not to proceed",
  "another applicant was a better fit",
  "candidate did not accept offer",
  "landed job",
  "ineligible",
]);

const PRE_MEETING_STATUSES = new Set([
  "new",
  "meeting requested",
  "meeting scheduled",
  "needs reschedule",
]);

const POST_MEETING_BASE_STATUSES = new Set([
  "met with referrer",
  "cv updated",
  "info updated",
]);

const HR_STATUSES = new Set([
  "submitted cv to hr",
  "interviews being conducted",
]);

const POST_MEETING_ACTION_STATUSES = new Set([
  ...POST_MEETING_BASE_STATUSES,
  ...HR_STATUSES,
]);

// Get all available IANA timezones with formatted labels
const TIMEZONE_OPTIONS = getAllTimezoneOptions();

const PAGE_SIZE = 10;
const ALL_COMPANIES_VALUE = "__all__";

function StatusBadge({ status, statusLabels }: { status: string; statusLabels: Record<string, string> }) {
  const normalized = status?.toLowerCase().trim() || "new";
  const variant = STATUS_VARIANTS[normalized] || "neutral";
  const label = statusLabels[normalized] || status || statusLabels.new;
  return <span className={`portal-badge portal-badge--${variant}`}>{label}</span>;
}

function formatMeetingDisplay(date?: string, time?: string, timezone?: string): string {
  if (!date || !time) return "";
  const tz = timezone ? ` (${timezone.split("/").pop()?.replace("_", " ")} time)` : "";
  return `${date} at ${time}${tz}`;
}

export default function PortalClient() {
  const toast = useToast();
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalResponse | null>(null);

  // Self-service link request state
  const [showRequestLink, setShowRequestLink] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [linkRequested, setLinkRequested] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<FeedbackAction | null>(null);
  const [modalItem, setModalItem] = useState<PortalItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields for modal
  const [notes, setNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingTimezone, setMeetingTimezone] = useState("America/Toronto");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [includeUpdateLink, setIncludeUpdateLink] = useState(true);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number | "auto";
    bottom?: number | "auto";
    left: number;
    width: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Company filter state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(ALL_COMPANIES_VALUE);

  // Sorting state
  type SortColumn = "candidate" | "position" | "status";
  type SortDirection = "asc" | "desc";
  const [sortColumn, setSortColumn] = useState<SortColumn>("candidate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  const toggleRowExpanded = useCallback((itemId: string) => {
    // Close any open dropdown when clicking on a row
    setOpenDropdown(null);
    setDropdownPosition(null);
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/referrer/portal/data", { cache: "no-store" });
      const json = await res.json();

      // Detect expired/invalid token (401) or version mismatch (403)
      if (res.status === 401 || res.status === 403) {
        setShowRequestLink(true);
        setLoading(false);
        return;
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to load portal");
      }
      setData(json as PortalResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler for requesting new link
  const handleRequestLink = async () => {
    if (!requestEmail.trim()) {
      toast.error(t.expiredLink.emailRequired, t.expiredLink.emailRequiredMessage);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/referrer/portal/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: requestEmail }),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to send link");
      }

      setLinkRequested(true);
      toast.success(t.expiredLink.linkSent, t.expiredLink.linkSentMessage);
    } catch (err) {
      toast.error(t.expiredLink.requestFailed, err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only keep dropdown open if clicking inside the dropdown menu itself or the trigger button
      const clickedInsideDropdown = target.closest(".portal-dropdown-menu") || target.closest(".portal-dropdown-trigger");
      if (!clickedInsideDropdown) {
        setOpenDropdown(null);
        setDropdownPosition(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Handle dropdown toggle with position calculation
  const handleDropdownToggle = (itemId: string, event: React.MouseEvent<HTMLButtonElement>, itemStatus: string) => {
    if (openDropdown === itemId) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const menuWidth = Math.max(rect.width, 220);

      // Calculate menu height: ~44px per item + 24px padding (conservative estimate)
      const enabledCount = ACTIONS.filter((a) => isActionEnabled(a, itemStatus)).length;
      const menuHeight = enabledCount * 44 + 24;

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      let left = rect.left;
      if (left + menuWidth > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - menuWidth - 8);
      }

      // If not enough space below but enough above, position above
      const positionAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      if (positionAbove) {
        // Use bottom positioning so dropdown bottom aligns with button top
        const bottom = viewportHeight - rect.top;
        setDropdownPosition({ bottom, left, top: "auto", width: menuWidth });
      } else {
        // Position below - dropdown top aligns with button bottom
        setDropdownPosition({ top: rect.bottom, left, bottom: "auto", width: menuWidth });
      }
      setOpenDropdown(itemId);
    }
  };

  const openModal = (item: PortalItem, action: FeedbackAction) => {
    setModalItem(item);
    setModalAction(action);
    setNotes("");
    setMeetingDate("");
    setMeetingTime("");
    setMeetingTimezone("America/Toronto");
    setMeetingUrl("");
    setIncludeUpdateLink(true);
    setModalOpen(true);
    setOpenDropdown(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItem(null);
    setModalAction(null);
  };

  const handleSubmit = async () => {
    if (!modalItem || !modalAction) return;

    // Validation for schedule meeting
    if (modalAction === "SCHEDULE_MEETING") {
      if (!meetingDate || !meetingTime || !meetingTimezone || !meetingUrl.trim()) {
        toast.error(t.modal.missingFields, t.modal.missingFields);
        return;
      }
    }
    if (modalAction === "CANDIDATE_DID_NOT_ACCEPT_OFFER" && !notes.trim()) {
      toast.error(t.modal.reasonRequired, t.modal.reasonRequiredMessage);
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        applicationId: modalItem.id,
        action: modalAction,
        notes: notes.trim() || undefined,
      };

      if (modalAction === "SCHEDULE_MEETING") {
        body.meetingDate = meetingDate;
        body.meetingTime = meetingTime;
        body.meetingTimezone = meetingTimezone;
        body.meetingUrl = meetingUrl.trim() || undefined;
      }

      if (modalAction === "CV_MISMATCH") {
        body.includeUpdateLink = includeUpdateLink;
      }

      const res = await fetch("/api/referrer/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to submit feedback");
      }

      toast.success(t.modalTitles[modalAction] || t.modalTitles.default, t.successMessages[modalAction] || t.successMessages.default);

      // Update local state
      const shouldClearMeeting = modalAction === "CANCEL_MEETING" ||
        (modalAction === "REQUEST_CV_UPDATE" && modalItem.status?.toLowerCase().trim() === "meeting scheduled");
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === modalItem.id
                  ? {
                      ...item,
                      status: json.status || item.status,
                      meetingDate: modalAction === "SCHEDULE_MEETING" ? meetingDate : shouldClearMeeting ? "" : item.meetingDate,
                      meetingTime: modalAction === "SCHEDULE_MEETING" ? meetingTime : shouldClearMeeting ? "" : item.meetingTime,
                      meetingTimezone: modalAction === "SCHEDULE_MEETING" ? meetingTimezone : shouldClearMeeting ? "" : item.meetingTimezone,
                      meetingUrl: modalAction === "SCHEDULE_MEETING" ? meetingUrl : shouldClearMeeting ? "" : item.meetingUrl,
                    }
                  : item
              ),
            }
          : prev
      );

      closeModal();
    } catch (err) {
      toast.error(t.expiredLink.requestFailed, err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  const isActionEnabled = (action: FeedbackAction, status: string): boolean => {
    const normalized = status?.toLowerCase().trim() || "new";

    if (TERMINAL_STATUSES.has(normalized)) return false;

    if (normalized === "job offered") {
      return action === "CANDIDATE_ACCEPTED_OFFER" || action === "CANDIDATE_DID_NOT_ACCEPT_OFFER";
    }

    switch (action) {
      case "SCHEDULE_MEETING":
        return normalized === "new" || normalized === "meeting requested" || normalized === "needs reschedule";
      case "CANCEL_MEETING":
        return normalized === "meeting scheduled";
      case "MARK_INTERVIEWED":
        return normalized === "meeting scheduled" || normalized === "meeting requested";
      case "REQUEST_INFO":
        return PRE_MEETING_STATUSES.has(normalized);
      case "CV_MISMATCH":
        return PRE_MEETING_STATUSES.has(normalized);
      case "REQUEST_CV_UPDATE":
        return PRE_MEETING_STATUSES.has(normalized) || POST_MEETING_ACTION_STATUSES.has(normalized);
      case "REJECT":
        return PRE_MEETING_STATUSES.has(normalized) || POST_MEETING_ACTION_STATUSES.has(normalized);
      case "APPLICANT_NO_LONGER_INTERESTED":
        return POST_MEETING_ACTION_STATUSES.has(normalized);
      case "SUBMIT_CV_TO_HR":
        return POST_MEETING_BASE_STATUSES.has(normalized);
      case "HR_INTERVIEWS":
        return normalized === "submitted cv to hr";
      case "HR_PROVIDED_OFFER":
        return normalized === "submitted cv to hr" || normalized === "interviews being conducted";
      case "HR_DECIDED_NOT_TO_PROCEED":
        return normalized === "submitted cv to hr" || normalized === "interviews being conducted";
      case "APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD":
        return HR_STATUSES.has(normalized);
    case "ANOTHER_APPLICANT_BETTER_FIT":
      return normalized === "interviews being conducted";
    case "CANDIDATE_ACCEPTED_OFFER":
    case "CANDIDATE_DID_NOT_ACCEPT_OFFER":
      return normalized === "job offered";
      default:
        return false;
    }
  };

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    // Filter by company first if a company is selected
    const filteredItems = selectedCompanyId !== ALL_COMPANIES_VALUE
      ? data.items.filter((item) => item.companyId === selectedCompanyId)
      : data.items;
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case "candidate":
          comparison = (a.applicantName || a.applicantId).localeCompare(b.applicantName || b.applicantId);
          break;
        case "position":
          comparison = (a.position || "").localeCompare(b.position || "");
          break;
        case "status":
          comparison = (a.status || "new").localeCompare(b.status || "new");
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, selectedCompanyId]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedItems.length / PAGE_SIZE);
  const validPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedItems = useMemo(() => {
    const startIndex = (validPage - 1) * PAGE_SIZE;
    return sortedItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedItems, validPage]);

  // Reset to page 1 when data or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data?.items?.length, selectedCompanyId]);

  const header = (
    <section className="card page-card portal-card" aria-labelledby="portal-title">
      <div className="language-toggle" role="group" aria-label={t.languageLabel}>
        <button
          type="button"
          className={`language-toggle__btn ${language === "en" ? "is-active" : ""}`}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
        >
          {t.english}
        </button>
        <button
          type="button"
          className={`language-toggle__btn ${language === "fr" ? "is-active" : ""}`}
          onClick={() => setLanguage("fr")}
          aria-pressed={language === "fr"}
        >
          {t.french}
        </button>
      </div>
      <div className="card-header portal-header">
        <div className="portal-header__copy">
          <p className="eyebrow">{t.header.eyebrow}</p>
          <h2 id="portal-title">{t.header.title}</h2>
          <p className="lead">{t.header.lead}</p>
        </div>
        {data ? (
          <dl className="portal-meta">
            <div className="portal-meta__item">
              <dt>{t.header.referrer}</dt>
              <dd>
                {data.referrer.name || t.header.referrer} - {data.referrer.irref}
              </dd>
            </div>
            <div className="portal-meta__item">
              <dt>{t.header.email}</dt>
              <dd>{data.referrer.email || t.header.noEmail}</dd>
            </div>
            {data.referrer.company ? (
              <div className="portal-meta__item">
                <dt>{t.header.company}</dt>
                <dd>{data.referrer.company}</dd>
              </div>
            ) : null}
            <div className="portal-meta__item">
              <dt>{t.header.total}</dt>
              <dd>{data.total}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-table-card" aria-live="polite">
          <div className="portal-table-header">
            <SkeletonStack>
              <Skeleton variant="heading" size="sm" width="40%" />
              <Skeleton variant="text" width="25%" />
            </SkeletonStack>
          </div>
          <div className="portal-table-wrapper">
            <SkeletonPortalRows rows={5} />
          </div>
        </section>
      </div>
    );
  }

  if (showRequestLink) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card" style={{ maxWidth: 600, margin: "0 auto" }}>
          {linkRequested ? (
            <div style={{ padding: "48px 32px", textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  fontSize: 32,
                  color: "#ffffff",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
              >
                ✓
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "#111827" }}>
                {t.expiredLink.checkEmail}
              </h2>
              <p style={{ fontSize: 16, color: "#1f2937", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                {t.expiredLink.sentMessage} <strong style={{ color: "#111827" }}>{requestEmail}</strong>.
              </p>
            </div>
          ) : (
            <div style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(255, 193, 7, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 32,
                  }}
                >
                  🔒
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "#111827" }}>
                  {t.expiredLink.expiredTitle}
                </h2>
                <p style={{ fontSize: 16, color: "#1f2937", lineHeight: 1.5, marginBottom: 32 }}>
                  {t.expiredLink.expiredMessage}
                </p>
              </div>
              <div style={{ maxWidth: 380, margin: "0 auto" }}>
                <input
                  type="email"
                  placeholder={t.expiredLink.emailPlaceholder}
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRequestLink()}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginBottom: 16,
                    fontSize: 15,
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    outline: "none",
                    transition: "border-color 0.2s",
                    fontFamily: "inherit",
                    color: "#111827",
                    backgroundColor: "#ffffff",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                  }}
                  disabled={submitting}
                />
                <ActionBtn
                  variant="primary"
                  onClick={handleRequestLink}
                  disabled={submitting}
                >
                  {submitting ? t.expiredLink.sending : t.expiredLink.sendNewLink}
                </ActionBtn>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card portal-state-card--error" role="alert">
          <div className="portal-state">
            <div className="portal-state__icon portal-state__icon--error" aria-hidden="true" />
            <div>
              <p className="portal-state__title">{t.error.loadFailed}</p>
              <p className="portal-state__message">{t.error.errorLabel}: {error}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="portal-stack">
        {header}
        <section className="card page-card portal-card portal-state-card">
          <div className="portal-state">
            <div className="portal-state__icon" aria-hidden="true" />
            <div>
              <p className="portal-state__title">{t.error.noData}</p>
              <p className="portal-state__message">{t.error.refreshMessage}</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="portal-stack">
      {header}
      <section className="card page-card portal-card portal-table-card">
        <div className="portal-table-header">
          <div>
            <p className="portal-table-title">{t.table.title}</p>
            <p className="portal-table-sub">{sortedItems.length} {t.table.activeReferrals}</p>
          </div>
          <div className="portal-table-meta">
            {/* Company filter - only show if there are multiple companies */}
            {data.companies && data.companies.length > 1 && (
              <div className="portal-company-filter">
                <Select
                  id="portal-company-filter"
                  name="portal-company-filter"
                  value={selectedCompanyId}
                  options={[
                    { value: ALL_COMPANIES_VALUE, label: t.header.allCompanies },
                    ...data.companies.map((company) => ({
                      value: company.id,
                      label: company.name,
                    })),
                  ]}
                  placeholder={t.header.filterByCompany}
                  onChange={(value) => {
                    setSelectedCompanyId(Array.isArray(value) ? value[0] : value);
                  }}
                />
              </div>
            )}
            <span className="portal-count-pill">{data.total} {t.table.totalLabel}</span>
            {totalPages > 1 && (
              <span className="portal-page-info">
                {language === "fr" ? "Page" : "Page"} {validPage} / {totalPages}
              </span>
            )}
          </div>
        </div>
        <div className="portal-table-wrapper">
          <div className="founder-table portal-table" ref={dropdownRef}>
            <div className="founder-table__container portal-table__scroll">
              <table>
                <caption className="sr-only">{t.table.caption}</caption>
                <thead>
                  <tr>
                    <th className="portal-col-candidate portal-col-sortable" onClick={() => handleSort("candidate")}>
                      <span className="portal-th-content">
                        {t.table.candidate}
                        <svg
                          className={`portal-sort-icon ${sortColumn === "candidate" ? "portal-sort-icon--active" : ""} ${sortColumn === "candidate" && sortDirection === "desc" ? "portal-sort-icon--desc" : ""}`}
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12l7-7 7 7" />
                        </svg>
                      </span>
                    </th>
                    <th className="portal-col-position portal-col-sortable" onClick={() => handleSort("position")}>
                      <span className="portal-th-content">
                        {t.table.position}
                        <svg
                          className={`portal-sort-icon ${sortColumn === "position" ? "portal-sort-icon--active" : ""} ${sortColumn === "position" && sortDirection === "desc" ? "portal-sort-icon--desc" : ""}`}
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12l7-7 7 7" />
                        </svg>
                      </span>
                    </th>
                    <th className="portal-col-cv">{t.table.cv}</th>
                    <th className="portal-col-status portal-col-sortable" onClick={() => handleSort("status")}>
                      <span className="portal-th-content">
                        {t.table.status}
                        <svg
                          className={`portal-sort-icon ${sortColumn === "status" ? "portal-sort-icon--active" : ""} ${sortColumn === "status" && sortDirection === "desc" ? "portal-sort-icon--desc" : ""}`}
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12l7-7 7 7" />
                        </svg>
                      </span>
                    </th>
                    <th className="portal-col-actions">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="portal-table-empty">
                        <EmptyState
                          variant="portal"
                          title={t.empty.title}
                          description={t.empty.description}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const normalizedStatus = item.status?.toLowerCase().trim() || "new";
                      const hasMeeting = normalizedStatus === "meeting scheduled" && item.meetingDate;
                      const needsReschedule = normalizedStatus === "needs reschedule";
                      const isExpanded = expandedRows.has(item.id);
                      const hasAnyAction = ACTIONS.some((action) => isActionEnabled(action, item.status));

                      // Format display values for expanded content
                      const formatLocation = () => {
                        if (item.locatedCanada?.toLowerCase() === "yes") {
                          return item.province ? `${t.expanded.inCanada} (${item.province})` : t.expanded.inCanada;
                        }
                        return t.expanded.outsideCanada;
                      };

                      const formatLanguages = () => {
                        const langs = item.languages || "";
                        const other = item.languagesOther || "";
                        if (!langs && !other) return t.expanded.notProvided;
                        return other ? `${langs}, ${other}` : langs;
                      };

                      const formatIndustry = () => {
                        const industry = item.industryType || "";
                        const other = item.industryOther || "";
                        if (!industry) return t.expanded.notProvided;
                        return industry.toLowerCase() === "other" && other ? other : industry;
                      };

                      const formatEmployment = () => {
                        const status = item.employmentStatus?.toLowerCase() || "";
                        if (status === "yes") return t.expanded.employed;
                        if (status === "no") return t.expanded.notEmployed;
                        if (status === "temp" || status === "temporary") return t.expanded.tempWork;
                        return item.employmentStatus || t.expanded.notProvided;
                      };

                      const formatWorkAuth = () => {
                        if (item.locatedCanada?.toLowerCase() === "yes") {
                          const auth = item.authorizedCanada?.toLowerCase();
                          if (auth === "yes") return t.expanded.yes;
                          if (auth === "no") return t.expanded.no;
                          return item.authorizedCanada || t.expanded.notProvided;
                        } else {
                          const eligible = item.eligibleMoveCanada?.toLowerCase();
                          if (eligible === "yes") return t.expanded.yes;
                          if (eligible === "no") return t.expanded.no;
                          return item.eligibleMoveCanada || t.expanded.notProvided;
                        }
                      };

                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            className={`portal-row-expandable ${isExpanded ? "portal-row-expanded" : ""}`}
                            onClick={() => toggleRowExpanded(item.id)}
                            style={{ cursor: "pointer" }}
                          >
                            <td className="portal-col-candidate">
                              <div className="portal-cell-expand-wrapper">
                                <svg
                                  className={`portal-expand-icon ${isExpanded ? "portal-expand-icon--open" : ""}`}
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <div>
                                  <div className="portal-cell-title">{item.applicantName || item.applicantId}</div>
                                  <div className="portal-cell-sub">{item.applicantEmail}</div>
                                  <div className="portal-cell-sub">{item.applicantPhone}</div>
                                </div>
                              </div>
                            </td>
                            <td className="portal-col-position" data-label={t.table.position}>
                              <div className="portal-cell-title">{item.position}</div>
                              <div className="portal-cell-sub">{t.table.iRCRN}: {item.iCrn || "-"}</div>
                              {data.companies && data.companies.length > 1 && item.companyName && (
                                <div className="portal-cell-sub portal-cell-company">{item.companyName}</div>
                              )}
                            </td>
                            <td className="portal-col-cv" data-label={t.table.cv} onClick={(e) => e.stopPropagation()}>
                              {item.resumeDownloadUrl ? (
                                <a href={item.resumeDownloadUrl} target="_blank" rel="noreferrer" className="portal-link">
                                  {t.table.downloadCv}
                                </a>
                              ) : (
                                <span className="portal-muted">{t.table.noCv}</span>
                              )}
                            </td>
                            <td className="portal-col-status" data-label={t.table.status}>
                              <div className="portal-status-content">
                                <StatusBadge status={item.status} statusLabels={t.statuses} />
                                {hasMeeting && (
                                  <div className="portal-meeting-info">
                                    <span className="portal-meeting-date">
                                      {formatMeetingDisplay(item.meetingDate, item.meetingTime, item.meetingTimezone)}
                                    </span>
                                    {item.meetingUrl && (
                                      <a
                                        href={item.meetingUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="portal-meeting-link"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <span className="portal-meeting-link-icon" aria-hidden="true">&#x1F517;</span>
                                        <span className="portal-meeting-link-text">{t.join}</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                {needsReschedule && (
                                  <div className="portal-reschedule-warning">
                                    {t.reschedule}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="portal-col-actions" onClick={(e) => e.stopPropagation()}>
                              {hasAnyAction ? (
                                <div className="portal-dropdown">
                                  <ActionBtn
                                    size="sm"
                                    variant="ghost"
                                    className="portal-dropdown-trigger"
                                    onClick={(e) => handleDropdownToggle(item.id, e, item.status)}
                                    aria-expanded={openDropdown === item.id}
                                    aria-haspopup="menu"
                                  >
                                    {t.table.actions}
                                    <svg
                                      className="portal-dropdown-icon"
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </ActionBtn>
                                  {openDropdown === item.id && dropdownPosition && typeof document !== "undefined" &&
                                    createPortal(
                                      <>
                                        <div
                                          className="portal-dropdown-backdrop"
                                          onClick={() => {
                                            setOpenDropdown(null);
                                            setDropdownPosition(null);
                                          }}
                                        />
                                        <div
                                          className="portal-dropdown-menu portal-dropdown-menu--fixed"
                                          role="menu"
                                          style={{
                                            top: dropdownPosition.top,
                                            bottom: dropdownPosition.bottom,
                                            left: dropdownPosition.left,
                                            width: dropdownPosition.width,
                                          }}
                                        >
                                          {ACTIONS.map((action) => {
                                            const enabled = isActionEnabled(action, item.status);
                                            if (!enabled) return null;
                                            return (
                                              <button
                                                key={action}
                                                type="button"
                                                className="portal-dropdown-item"
                                                onClick={() => openModal(item, action)}
                                                role="menuitem"
                                              >
                                                {t.actionLabels[action]}
                                              </button>
                                            );
                                          })}
                                          <button
                                            type="button"
                                            className="portal-dropdown-item portal-dropdown-cancel"
                                            onClick={() => {
                                              setOpenDropdown(null);
                                              setDropdownPosition(null);
                                            }}
                                            role="menuitem"
                                          >
                                            {t.modal.cancel}
                                          </button>
                                        </div>
                                      </>,
                                      document.body
                                    )}
                                </div>
                              ) : (
                                <span className="portal-muted">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="portal-expanded-row">
                              <td colSpan={5}>
                                <div className="portal-expanded-content">
                                  <div className="portal-detail-grid">
                                    <div className="portal-detail-item">
                                      <span className="portal-detail-label">{t.expanded.countryOfOrigin}</span>
                                      <span className="portal-detail-value">{item.countryOfOrigin || t.expanded.notProvided}</span>
                                    </div>
                                    <div className="portal-detail-item">
                                      <span className="portal-detail-label">{t.expanded.languages}</span>
                                      <span className="portal-detail-value">{formatLanguages()}</span>
                                    </div>
                                    <div className="portal-detail-item">
                                      <span className="portal-detail-label">{t.expanded.industry}</span>
                                      <span className="portal-detail-value">{formatIndustry()}</span>
                                    </div>
                                    <div className="portal-detail-item">
                                      <span className="portal-detail-label">{t.expanded.location}</span>
                                      <span className="portal-detail-value">{formatLocation()}</span>
                                    </div>
                                    <div className="portal-detail-item">
                                      <span className="portal-detail-label">
                                        {item.locatedCanada?.toLowerCase() === "yes"
                                          ? t.expanded.workAuthorization
                                          : t.expanded.eligibleToMove}
                                      </span>
                                      <span className="portal-detail-value">{formatWorkAuth()}</span>
                                    </div>
                                    <div className="portal-detail-item">
                                      <span className="portal-detail-label">{t.expanded.employmentStatus}</span>
                                      <span className="portal-detail-value">{formatEmployment()}</span>
                                    </div>
                                  </div>
                                  {/* Action History */}
                                  {item.actionHistory && item.actionHistory.some((entry) => entry.action !== "OFFER_JOB") && (
                                    <div className="portal-history">
                                      <h4 className="portal-history-title">{t.history.title}</h4>
                                      <ul className="portal-timeline">
                                        {[...item.actionHistory]
                                          .filter((entry) => entry.action !== "OFFER_JOB")
                                          .reverse()
                                          .map((entry, idx) => {
                                          const actionLabel = t.actionLabels[entry.action] || entry.action;
                                          const date = new Date(entry.timestamp);
                                          const dateStr = date.toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          });
                                          return (
                                            <li key={idx} className="portal-timeline-item">
                                              <span className="portal-timeline-dot" />
                                              <div className="portal-timeline-content">
                                                <span className="portal-timeline-action">{actionLabel}</span>
                                                <div className="portal-timeline-meta">
                                                  {dateStr}
                                                  {entry.performedBy && entry.performedBy !== "applicant" && (
                                                    <> — {t.history.by} {entry.performedByEmail || entry.performedBy}</>
                                                  )}
                                                  {entry.performedBy === "applicant" && (
                                                    <> — {t.history.by} {t.table.candidate.toLowerCase()}</>
                                                  )}
                                                </div>
                                                {entry.notes && (
                                                  <div className="portal-timeline-notes">&quot;{entry.notes}&quot;</div>
                                                )}
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="portal-pagination">
            <button
              type="button"
              className="portal-pagination-btn"
              onClick={() => setCurrentPage(1)}
              disabled={validPage === 1}
              aria-label={language === "fr" ? "Aller à la première page" : "Go to first page"}
            >
              &laquo;
            </button>
            <button
              type="button"
              className="portal-pagination-btn"
              onClick={() => setCurrentPage(Math.max(1, validPage - 1))}
              disabled={validPage === 1}
              aria-label={language === "fr" ? "Page précédente" : "Go to previous page"}
            >
              &lsaquo;
            </button>
            <span className="portal-pagination-info">
              {language === "fr" ? "Page" : "Page"} {validPage} {language === "fr" ? "sur" : "of"} {totalPages}
            </span>
            <button
              type="button"
              className="portal-pagination-btn"
              onClick={() => setCurrentPage(Math.min(totalPages, validPage + 1))}
              disabled={validPage === totalPages}
              aria-label={language === "fr" ? "Page suivante" : "Go to next page"}
            >
              &rsaquo;
            </button>
            <button
              type="button"
              className="portal-pagination-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={validPage === totalPages}
              aria-label={language === "fr" ? "Aller à la dernière page" : "Go to last page"}
            >
              &raquo;
            </button>
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      <CenteredModal
        open={modalOpen}
        onClose={closeModal}
        title={modalAction ? (t.modalTitles[modalAction] || t.modalTitles.default) : ""}
        description={modalAction ? (
          modalAction === "REQUEST_CV_UPDATE" && modalItem?.status?.toLowerCase().trim() === "meeting scheduled"
            ? t.modalDescriptions.REQUEST_CV_UPDATE_MEETING_WARNING
            : (t.modalDescriptions[modalAction] || "")
        ) : ""}
        size={modalAction === "SCHEDULE_MEETING" ? "md" : "sm"}
        footer={
          <>
            <ActionBtn variant="ghost" onClick={closeModal} disabled={submitting}>
              {t.modal.cancel}
            </ActionBtn>
            <ActionBtn variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? t.modal.sending : t.modal.confirm}
            </ActionBtn>
          </>
        }
      >
        {modalItem && (
          <div className="portal-modal-content">
            <div className="portal-modal-candidate">
              <strong>{modalItem.applicantName || modalItem.applicantId}</strong>
              <span>{modalItem.position}</span>
            </div>

            {modalAction === "SCHEDULE_MEETING" && (
              <div className="portal-modal-fields">
                <div className="portal-modal-field">
                  <label htmlFor="meeting-date">{t.modal.date} *</label>
                  <DatePicker
                    id="meeting-date"
                    value={meetingDate}
                    onChange={setMeetingDate}
                    required
                    placeholder={language === "fr" ? "Choisir une date" : "Select date"}
                    minDate={new Date().toISOString().split("T")[0]}
                    locale={language}
                  />
                </div>
                <div className="portal-modal-field">
                  <label htmlFor="meeting-time">{t.modal.time} *</label>
                  <TimePicker
                    id="meeting-time"
                    value={meetingTime}
                    onChange={setMeetingTime}
                    required
                    placeholder={language === "fr" ? "Choisir l'heure" : "Select time"}
                    interval={30}
                    minTime="08:00"
                    maxTime="20:00"
                    locale={language}
                  />
                </div>
                <div className="portal-modal-field portal-modal-field--full">
                  <label htmlFor="meeting-timezone">{t.modal.timezone} *</label>
                  <div className="portal-select-wrapper">
                    <Select
                      id="meeting-timezone"
                      name="meeting-timezone"
                      options={TIMEZONE_OPTIONS}
                      value={meetingTimezone}
                      onChange={(val) => setMeetingTimezone(val as string)}
                      required
                      placeholder={language === "fr" ? "Choisir le fuseau" : "Select timezone"}
                    />
                  </div>
                </div>
                <div className="portal-modal-field portal-modal-field--full">
                  <label htmlFor="meeting-url">{t.modal.meetingUrl} *</label>
                  <input
                    id="meeting-url"
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder={t.modal.meetingUrlPlaceholder}
                    required
                  />
                </div>
              </div>
            )}

            {modalAction === "CV_MISMATCH" && (
              <div className="portal-modal-checkbox">
                <input
                  id="include-update-link"
                  type="checkbox"
                  checked={includeUpdateLink}
                  onChange={(e) => setIncludeUpdateLink(e.target.checked)}
                />
                <label htmlFor="include-update-link">
                  {t.modal.includeUpdateLink}
                </label>
              </div>
            )}

            <div className="portal-modal-field portal-modal-field--full">
              <label htmlFor="notes">
                {modalAction === "CANDIDATE_DID_NOT_ACCEPT_OFFER" ? t.modal.reason : t.modal.notes}
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  modalAction === "CANDIDATE_DID_NOT_ACCEPT_OFFER"
                    ? t.modal.reasonPlaceholder
                    : t.modal.notesPlaceholder
                }
              />
            </div>
          </div>
        )}
      </CenteredModal>
    </div>
  );
}
