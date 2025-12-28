import { NextResponse } from "next/server";
import { ensureResumeLooksLikeCv, scanBufferForViruses } from "@/lib/fileScan";
import { uploadFileToDrive } from "@/lib/drive";
import { sendMail } from "@/lib/mailer";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";
import {
  candidateRegistrationConfirmation,
  candidateIneligibleNotification,
  candidateProfileUpdateConfirmation,
} from "@/lib/emailTemplates";
import {
  CANDIDATE_SECRET_HASH_HEADER,
  CANDIDATE_UPDATE_PENDING_PAYLOAD_HEADER,
  CANDIDATE_UPDATE_TOKEN_EXPIRES_HEADER,
  CANDIDATE_UPDATE_TOKEN_HASH_HEADER,
  CANDIDATE_SHEET_NAME,
  ensureColumns,
  generateIRAIN,
  getCandidateByEmail,
  findExistingCandidate,
  getApplicationById,
  isIrain,
  updateApplicationAdmin,
  updateRowById,
  upsertCandidateRow,
} from "@/lib/sheets";
import { jobOpeningsUrl } from "@/lib/urls";
import { escapeHtml, normalizeHttpUrl } from "@/lib/validation";
import {
  createCandidateSecret,
  createCandidateUpdateToken,
  hashCandidateSecret,
  hashToken,
} from "@/lib/candidateUpdateToken";
import { hashOpaqueToken, isExpired } from "@/lib/tokens";

type EmailLanguage = "en" | "fr";

type PendingCandidateUpdatePayload = {
  id?: string;
  legacyCandidateId?: string;
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

const UPDATE_TOKEN_TTL_SECONDS = 60 * 60 * 24;

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
  const rate = await rateLimit(request, { keyPrefix: "candidate", ...RATE_LIMITS.candidate });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

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

    // Check for existing candidate using 2-of-3 matching (name, email, phone)
    const existingCandidate = await findExistingCandidate(firstName, familyName, email, phone);
    const isExistingCandidate = existingCandidate !== null;
    const existingId = existingCandidate?.record.id || "";
    const shouldAssignNewIrain = Boolean(existingCandidate) && !isIrain(existingId);

    // Use existing iRAIN if found, otherwise generate new
    let iRain: string;
    if (isExistingCandidate && existingCandidate.record.id && isIrain(existingCandidate.record.id)) {
      iRain = existingCandidate.record.id;
    } else if (isExistingCandidate && existingCandidate.record.legacyCandidateId) {
      // Has legacy ID but no iRAIN - generate new iRAIN but keep legacy reference
      iRain = await generateIRAIN();
    } else if (!isExistingCandidate) {
      iRain = await generateIRAIN();
    } else {
      iRain = await generateIRAIN();
    }

    const legacyCandidateId = shouldAssignNewIrain
      ? existingCandidate?.record.legacyCandidateId || existingId || undefined
      : undefined;
    const isIneligible = locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no";
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

    // Check if email matches the existing candidate's email (if found by 2-of-3 matching)
    // If email matches, we can skip confirmation as they prove ownership via email
    // If email is different (name+phone match only), require confirmation for security
    const emailMatchesExisting = existingCandidate &&
      existingCandidate.record.email.trim().toLowerCase() === email.trim().toLowerCase();

    if (existingCandidate && !emailMatchesExisting) {
      // Email is different, require confirmation before updating
      const exp = Math.floor(Date.now() / 1000) + UPDATE_TOKEN_TTL_SECONDS;
      const token = createCandidateUpdateToken({
        email: existingCandidate.record.email || email,
        rowIndex: existingCandidate.rowIndex,
        exp,
      });
      const tokenHash = hashToken(token);
      const pendingPayload: PendingCandidateUpdatePayload = {
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
        if (legacyCandidateId) {
          pendingPayload.legacyCandidateId = legacyCandidateId;
        }
      }

      await ensureColumns(CANDIDATE_SHEET_NAME, [
        CANDIDATE_UPDATE_TOKEN_HASH_HEADER,
        CANDIDATE_UPDATE_TOKEN_EXPIRES_HEADER,
        CANDIDATE_UPDATE_PENDING_PAYLOAD_HEADER,
      ]);

      const updateResult = await updateRowById(CANDIDATE_SHEET_NAME, "Email", existingCandidate.record.email, {
        [CANDIDATE_UPDATE_TOKEN_HASH_HEADER]: tokenHash,
        [CANDIDATE_UPDATE_TOKEN_EXPIRES_HEADER]: new Date(exp * 1000).toISOString(),
        [CANDIDATE_UPDATE_PENDING_PAYLOAD_HEADER]: JSON.stringify(pendingPayload),
      });
      if (!updateResult.updated) {
        return NextResponse.json({ ok: false, error: "Failed to start update confirmation." }, { status: 500 });
      }

      const confirmUrl = new URL("/api/candidate/confirm-update", appBaseUrl);
      confirmUrl.searchParams.set("token", token);

      const emailTemplate = candidateProfileUpdateConfirmation({
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

    // For new candidates OR existing candidates with matching email,
    // proceed with direct update/insert

    const upsertResult = await upsertCandidateRow({
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
    const candidateSecret = createCandidateSecret();
    const candidateSecretHash = hashCandidateSecret(candidateSecret);
    const candidateRowUpdates: Record<string, string | undefined> = {
      [CANDIDATE_SECRET_HASH_HEADER]: candidateSecretHash,
    };
    const requiredColumns = [CANDIDATE_SECRET_HASH_HEADER];
    if (resumeFileId || resumeFileName) {
      candidateRowUpdates["Resume File Name"] = resumeFileName;
      candidateRowUpdates["Resume File ID"] = resumeFileId;
      candidateRowUpdates["Resume URL"] = "";
      requiredColumns.push("Resume File Name", "Resume File ID", "Resume URL");
    }
    await ensureColumns(CANDIDATE_SHEET_NAME, requiredColumns);
    const updateResult = await updateRowById(CANDIDATE_SHEET_NAME, "iRAIN", upsertResult.id, candidateRowUpdates);
    if (!updateResult.updated) {
      return NextResponse.json({ ok: false, error: "Failed to save candidate profile." }, { status: 500 });
    }

    // Handle update-request token validation and clearing (from referrer portal flow)
    let updateRequestCleared = false;
    if (updateRequestToken && updateRequestApplicationId) {
      try {
        const application = await getApplicationById(updateRequestApplicationId);
        if (application?.record) {
          const storedHash = application.record.updateRequestTokenHash || "";
          const storedExpiry = application.record.updateRequestExpiresAt || "";
          const providedHash = hashOpaqueToken(updateRequestToken);

          // Validate: hash matches and not expired
          if (storedHash && storedHash === providedHash && !isExpired(storedExpiry)) {
            // Clear the update request fields
            await updateApplicationAdmin(updateRequestApplicationId, {
              updateRequestTokenHash: "",
              updateRequestExpiresAt: "",
              updateRequestPurpose: "",
            });
            updateRequestCleared = true;
          }
        }
      } catch (err) {
        // Log but don't fail the submission - token clearing is best-effort
        console.error("Error clearing update request token:", err);
      }
    }

    const finalIRain = upsertResult.id;

    // Override wasUpdated based on our 2-of-3 detection
    // This is true if we found an existing candidate with matching email (not requiring confirmation)
    const wasUpdated = isExistingCandidate && emailMatchesExisting;

    const shouldIncludeStatusNote = upsertResult.wasUpdated && !isIneligible;
    const statusNote = shouldIncludeStatusNote
      ? locale === "fr"
        ? "Nous avons mis a jour votre demande avec les dernieres informations fournies."
        : "We updated your referral request with the latest details you shared."
      : undefined;

    // Determine which template to use and generate email
    let emailTemplate;

    if (isIneligible) {
      emailTemplate = candidateIneligibleNotification({
        firstName,
        iRain: finalIRain,
        candidateKey: candidateSecret,
        locale,
      });
    } else {
      emailTemplate = candidateRegistrationConfirmation({
        firstName,
        iRain: finalIRain,
        location: locationSnapshot,
        authorization: authorizationSnapshot,
        industry: industrySnapshot,
        languages: languagesSnapshot,
        candidateKey: candidateSecret,
        isUpdate: wasUpdated || undefined,
        statusNote,
        locale,
      });
    }

    await sendMail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return NextResponse.json({ ok: true, updated: wasUpdated, iRain: finalIRain });
  } catch (error) {
    console.error("Candidate email API error", error);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}
