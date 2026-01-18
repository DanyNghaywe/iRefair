import { NextResponse } from "next/server";
import { ensureResumeLooksLikeCv, scanBufferForViruses } from "@/lib/fileScan";
import { uploadFileToDrive } from "@/lib/drive";
import { sendMail } from "@/lib/mailer";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";
import {
  applicantProfileUpdateConfirmation,
  newApplicantRegistrationConfirmation,
} from "@/lib/emailTemplates";
import {
  APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER,
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
  APPLICANT_UPDATE_TOKEN_HASH_HEADER,
  APPLICANT_REGISTRATION_STATUS_HEADER,
  APPLICANT_SHEET_NAME,
  cleanupExpiredPendingApplicants,
  cleanupExpiredPendingUpdates,
  ensureColumns,
  generateIRAIN,
  getApplicantByEmail,
  findExistingApplicant,
  isIrain,
  updateRowById,
  upsertApplicantRow,
} from "@/lib/sheets";
import { jobOpeningsUrl } from "@/lib/urls";
import { escapeHtml, normalizeHttpUrl } from "@/lib/validation";
import {
  createApplicantUpdateToken,
  hashToken,
} from "@/lib/applicantUpdateToken";

type EmailLanguage = "en" | "fr";

type PendingApplicantUpdatePayload = {
  id?: string;
  legacyApplicantId?: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  phone: string;
  locatedCanada: string;
  province: string;
  authorizedCanada: string;
  eligibleMoveCanada: string;
  countryOfOrigin: string;
  languages: string;
  languagesOther: string;
  industryType: string;
  industryOther: string;
  employmentStatus: string;
  resumeFileId?: string;
  resumeFileName?: string;
  locale: EmailLanguage;
};

const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_RESUME_EXTENSIONS = ["pdf", "doc", "docx"];
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB

const isAllowedResume = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const typeAllowed = file.type ? ALLOWED_RESUME_TYPES.includes(file.type) : false;
  const extensionAllowed = extension ? ALLOWED_RESUME_EXTENSIONS.includes(extension) : false;
  return typeAllowed || extensionAllowed;
};

export const runtime = "nodejs";

const UPDATE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const baseFromEnv =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL;
const appBaseUrl =
  baseFromEnv && baseFromEnv.startsWith("http") ? baseFromEnv : baseFromEnv ? `https://${baseFromEnv}` : "https://irefair.com";

function sanitize(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export async function POST(request: Request) {
  const rate = await rateLimit(request, { keyPrefix: "applicant", ...RATE_LIMITS.applicant });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  // Cleanup expired pending registrations and updates in the background
  cleanupExpiredPendingApplicants().catch((err) => {
    console.error("Error cleaning up expired pending applicants:", err);
  });
  cleanupExpiredPendingUpdates().catch((err) => {
    console.error("Error cleaning up expired pending updates:", err);
  });

  try {
    const form = await request.formData();
    const valueOf = (key: string) => sanitize(form.get(key));
    const firstName = valueOf("firstName");
    const middleName = valueOf("middleName");
    const familyName = valueOf("familyName");
    const email = valueOf("email");
    const phone = valueOf("phone");
    const locatedCanada = valueOf("locatedCanada");
    const province = valueOf("province");
    const authorizedCanada = valueOf("authorizedCanada");
    const eligibleMoveCanada = valueOf("eligibleMoveCanada");
    const countryOfOrigin = valueOf("countryOfOrigin");
    const industryType = valueOf("industryType");
    const industryOther = valueOf("industryOther");
    const employmentStatus = valueOf("employmentStatus");
    const languagesOther = valueOf("languagesOther");
    const language = valueOf("language").toLowerCase();
    const languagesRaw = valueOf("languages");
    const resumeEntry = form.get("resume");
    const locale: EmailLanguage = language === "fr" ? "fr" : "en";
    const honeypot = valueOf("website");
    const updateRequestToken = valueOf("updateRequestToken");
    const updateRequestApplicationId = valueOf("updateRequestApplicationId");

    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    if (!firstName || !email) {
      return NextResponse.json({ ok: false, error: "Missing required fields: firstName and email." }, { status: 400 });
    }

    const notProvided = locale === "fr" ? "Non fourni" : "Not provided";
    const normalizeYesNo = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return "";
      const lowered = trimmed.toLowerCase();
      if (lowered === "yes" || lowered === "oui") return locale === "fr" ? "Oui" : "Yes";
      if (lowered === "no" || lowered === "non") return locale === "fr" ? "Non" : "No";
      return trimmed;
    };

    // Check for existing applicant using 2-of-3 matching (name, email, phone)
    let existingApplicant = await findExistingApplicant(firstName, familyName, email, phone);
    if (!existingApplicant) {
      // Fallback to email match to avoid treating updates as new registrations.
      existingApplicant = await getApplicantByEmail(email);
    }

    // Block archived applicants from registering or updating their profile
    if (existingApplicant?.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json(
        { ok: false, error: 'This applicant profile has been archived and can no longer be updated.' },
        { status: 403 },
      );
    }

    const isExistingApplicant = existingApplicant !== null;
    const existingId = existingApplicant?.record.id || "";
    const shouldAssignNewIrain = Boolean(existingApplicant) && !isIrain(existingId);

    // Use existing iRAIN if found, otherwise generate new
    let iRain: string;
    if (existingApplicant && existingApplicant.record.id && isIrain(existingApplicant.record.id)) {
      iRain = existingApplicant.record.id;
    } else if (existingApplicant && existingApplicant.record.legacyApplicantId) {
      // Has legacy ID but no iRAIN - generate new iRAIN but keep legacy reference
      iRain = await generateIRAIN();
    } else {
      iRain = await generateIRAIN();
    }

    const legacyApplicantId = shouldAssignNewIrain
      ? existingApplicant?.record.legacyApplicantId || existingId || undefined
      : undefined;
    const isIneligible =
      (locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no") ||
      (locatedCanada.toLowerCase() === "yes" && authorizedCanada.toLowerCase() === "no");
    let resumeFileId: string | undefined;
    let resumeFileName: string | undefined;

    if (resumeEntry instanceof File && resumeEntry.size > 0) {
      if (!isAllowedResume(resumeEntry) || resumeEntry.size > MAX_RESUME_SIZE) {
        return NextResponse.json(
          { ok: false, field: "resume", error: "Please upload a PDF or DOC/DOCX file under 10MB." },
          { status: 400 },
        );
      }
      const fileBuffer = Buffer.from(await resumeEntry.arrayBuffer());
      const virusScan = await scanBufferForViruses(fileBuffer, resumeEntry.name);
      if (!virusScan.ok) {
        return NextResponse.json(
          { ok: false, field: "resume", error: virusScan.message || "Your file failed virus scanning." },
          { status: 400 },
        );
      }

      const resumeCheck = await ensureResumeLooksLikeCv(fileBuffer, resumeEntry.type, resumeEntry.name);
      if (!resumeCheck.ok) {
        return NextResponse.json(
          {
            ok: false,
            field: "resume",
            error: resumeCheck.message || "Please upload a complete resume (PDF/DOCX).",
          },
          { status: 400 },
        );
      }

      const upload = await uploadFileToDrive({
        buffer: fileBuffer,
        name: `${iRain}-${resumeEntry.name}`,
        mimeType: resumeEntry.type || "application/octet-stream",
        folderId: process.env.GDRIVE_FOLDER_ID || "",
      });
      resumeFileId = upload.fileId;
      resumeFileName = resumeEntry.name;
    }

    const locationSnapshot = (() => {
      if (locatedCanada === "Yes" || locatedCanada === "yes") return province ? `Canada - ${province}` : "Canada";
      if ((locatedCanada === "No" || locatedCanada === "no") && countryOfOrigin) return countryOfOrigin;
      return countryOfOrigin || notProvided;
    })();

    const authorizationSnapshot = (() => {
      if (locatedCanada === "Yes" || locatedCanada === "yes") return normalizeYesNo(authorizedCanada) || notProvided;
      if (locatedCanada === "No" || locatedCanada === "no") {
        const eligibility = normalizeYesNo(eligibleMoveCanada) || eligibleMoveCanada;
        if (eligibility) {
          return locale === "fr"
            ? `Eligible pour s'installer/travailler dans 6 mois : ${eligibility}`
            : `Eligible to move/work in 6 months: ${eligibility}`;
        }
        return notProvided;
      }
      const fallback = normalizeYesNo(authorizedCanada) || normalizeYesNo(eligibleMoveCanada);
      return fallback || notProvided;
    })();

    const industrySnapshot = (() => {
      if (industryType === "Other" && industryOther) return industryOther;
      return industryType || notProvided;
    })();

    const languagesSnapshot = (() => {
      const baseList = languagesRaw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && item.toLowerCase() !== "other");
      const all = languagesOther ? [...baseList, languagesOther.trim()] : baseList;
      const combined = all.filter(Boolean).join(", ");
      return combined || notProvided;
    })();

    // Check if email matches the existing applicant's email (if found by 2-of-3 matching)
    // If email matches, we can skip confirmation as they prove ownership via email
    // If email is different (name+phone match only), require confirmation for security
    const emailMatchesExisting = existingApplicant &&
      existingApplicant.record.email.trim().toLowerCase() === email.trim().toLowerCase();

    // If existing applicant with matching email is still pending confirmation, prompt them to confirm
    if (existingApplicant && emailMatchesExisting) {
      const registrationStatus = existingApplicant.record.registrationStatus?.trim() || "";
      if (registrationStatus === "Pending Confirmation") {
        return NextResponse.json({ ok: true, needsEmailConfirm: true });
      }
    }

    if (existingApplicant && !emailMatchesExisting) {
      // Email is different, require confirmation before updating
      const exp = Math.floor(Date.now() / 1000) + UPDATE_TOKEN_TTL_SECONDS;
      const token = createApplicantUpdateToken({
        email: existingApplicant.record.email || email,
        rowIndex: existingApplicant.rowIndex,
        exp,
        locale,
      });
      const tokenHash = hashToken(token);
      const pendingPayload: PendingApplicantUpdatePayload = {
        firstName,
        middleName,
        familyName,
        email,
        phone,
        locatedCanada,
        province,
        authorizedCanada,
        eligibleMoveCanada,
        countryOfOrigin,
        languages: languagesSnapshot,
        languagesOther,
        industryType,
        industryOther,
        employmentStatus,
        resumeFileId,
        resumeFileName,
        locale,
      };

      if (shouldAssignNewIrain) {
        pendingPayload.id = iRain;
        if (legacyApplicantId) {
          pendingPayload.legacyApplicantId = legacyApplicantId;
        }
      }

      await ensureColumns(APPLICANT_SHEET_NAME, [
        APPLICANT_UPDATE_TOKEN_HASH_HEADER,
        APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
        APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER,
      ]);

      const updateResult = await updateRowById(APPLICANT_SHEET_NAME, "Email", existingApplicant.record.email, {
        [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: tokenHash,
        [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: new Date(exp * 1000).toISOString(),
        [APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER]: JSON.stringify(pendingPayload),
      });
      if (!updateResult.updated) {
        return NextResponse.json({ ok: false, error: "Failed to start update confirmation." }, { status: 500 });
      }

      const confirmUrl = new URL("/api/applicant/confirm-update", appBaseUrl);
      confirmUrl.searchParams.set("token", token);

      const emailTemplate = applicantProfileUpdateConfirmation({
        firstName,
        confirmUrl: confirmUrl.toString(),
        locale,
      });

      await sendMail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      return NextResponse.json({ ok: true, needsEmailConfirm: true });
    }

    // For NEW applicants, require email confirmation before creating the profile
    if (!existingApplicant) {
      // Insert the applicant row with "Pending Confirmation" status
      const upsertResult = await upsertApplicantRow({
        id: iRain,
        firstName,
        middleName,
        familyName,
        email,
        phone,
        locatedCanada,
        province,
        authorizedCanada,
        eligibleMoveCanada,
        countryOfOrigin,
        languages: languagesSnapshot,
        languagesOther,
        industryType,
        industryOther,
        employmentStatus,
      });

      // Create confirmation token (use rowIndex 0 as placeholder for new applicants - we'll look up by email)
      const exp = Math.floor(Date.now() / 1000) + UPDATE_TOKEN_TTL_SECONDS;
      const token = createApplicantUpdateToken({
        email,
        rowIndex: 0, // Not used for new applicants - lookup by email instead
        exp,
        locale,
      });
      const tokenHash = hashToken(token);

      // Store token and set pending status
      const requiredColumns = [
        APPLICANT_UPDATE_TOKEN_HASH_HEADER,
        APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
        APPLICANT_REGISTRATION_STATUS_HEADER,
      ];
      if (resumeFileId || resumeFileName) {
        requiredColumns.push("Resume File Name", "Resume File ID", "Resume URL");
      }
      await ensureColumns(APPLICANT_SHEET_NAME, requiredColumns);

      const applicantRowUpdates: Record<string, string | undefined> = {
        [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: tokenHash,
        [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: new Date(exp * 1000).toISOString(),
        [APPLICANT_REGISTRATION_STATUS_HEADER]: "Pending Confirmation",
      };
      if (resumeFileId || resumeFileName) {
        applicantRowUpdates["Resume File Name"] = resumeFileName;
        applicantRowUpdates["Resume File ID"] = resumeFileId;
        applicantRowUpdates["Resume URL"] = "";
      }

      const updateResult = await updateRowById(APPLICANT_SHEET_NAME, "iRAIN", upsertResult.id, applicantRowUpdates);
      if (!updateResult.updated) {
        return NextResponse.json({ ok: false, error: "Failed to save applicant profile." }, { status: 500 });
      }

      // Send registration confirmation email
      const confirmUrl = new URL("/api/applicant/confirm-registration", appBaseUrl);
      confirmUrl.searchParams.set("token", token);

      const emailTemplate = newApplicantRegistrationConfirmation({
        firstName,
        confirmUrl: confirmUrl.toString(),
        locale,
      });

      await sendMail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      return NextResponse.json({ ok: true, needsEmailConfirm: true });
    }

    // For existing applicants with matching email, also require confirmation before updating
    // This ensures the person submitting the form owns the email address
    const exp = Math.floor(Date.now() / 1000) + UPDATE_TOKEN_TTL_SECONDS;
    const token = createApplicantUpdateToken({
      email: existingApplicant.record.email,
      rowIndex: existingApplicant.rowIndex,
      exp,
      locale,
    });
    const tokenHash = hashToken(token);
    const pendingPayload: PendingApplicantUpdatePayload = {
      firstName,
      middleName,
      familyName,
      email,
      phone,
      locatedCanada,
      province,
      authorizedCanada,
      eligibleMoveCanada,
      countryOfOrigin,
      languages: languagesSnapshot,
      languagesOther,
      industryType,
      industryOther,
      employmentStatus,
      resumeFileId,
      resumeFileName,
      locale,
    };

    if (shouldAssignNewIrain) {
      pendingPayload.id = iRain;
      if (legacyApplicantId) {
        pendingPayload.legacyApplicantId = legacyApplicantId;
      }
    }

    await ensureColumns(APPLICANT_SHEET_NAME, [
      APPLICANT_UPDATE_TOKEN_HASH_HEADER,
      APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
      APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER,
    ]);

    const updateResult = await updateRowById(APPLICANT_SHEET_NAME, "Email", existingApplicant.record.email, {
      [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: tokenHash,
      [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: new Date(exp * 1000).toISOString(),
      [APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER]: JSON.stringify(pendingPayload),
    });
    if (!updateResult.updated) {
      return NextResponse.json({ ok: false, error: "Failed to start update confirmation." }, { status: 500 });
    }

    const confirmUrl = new URL("/api/applicant/confirm-update", appBaseUrl);
    confirmUrl.searchParams.set("token", token);

    const emailTemplate = applicantProfileUpdateConfirmation({
      firstName,
      confirmUrl: confirmUrl.toString(),
      locale,
    });

    await sendMail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return NextResponse.json({ ok: true, needsEmailConfirm: true });
  } catch (error) {
    console.error("Candidate email API error", error);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}
