import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { sendMail } from "@/lib/mailer";
import {
  CANDIDATE_SECRET_HASH_HEADER,
  CANDIDATE_UPDATE_PENDING_PAYLOAD_HEADER,
  CANDIDATE_UPDATE_TOKEN_EXPIRES_HEADER,
  CANDIDATE_UPDATE_TOKEN_HASH_HEADER,
  CANDIDATE_SHEET_NAME,
  LEGACY_CANDIDATE_ID_HEADER,
  ensureColumns,
  getCandidateByEmail,
  updateRowById,
} from "@/lib/sheets";
import { escapeHtml } from "@/lib/validation";
import {
  createCandidateSecret,
  hashCandidateSecret,
  hashToken,
  verifyCandidateUpdateToken,
} from "@/lib/candidateUpdateToken";

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
  locale?: EmailLanguage;
};

const updateConfirmedSubject = "Your iRefair profile update is confirmed";
const updateConfirmedSubjectFr = "Votre mise a jour iRefair est confirmee";

const updateConfirmedHtmlTemplate = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:20px;">
    <tr><td style="padding:6px 0 12px 0;">
      <div style="font-size:20px;font-weight:700;color:#2f5fb3;">iRefair</div>
    </td></tr>
    <tr><td>
      <p style="margin:0 0 10px 0;font-size:15px;color:#1f2a37;">Hi {{firstName}},</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#3b4251;">Your iRefair profile update is confirmed.</p>
      {{candidateKeySection}}
      <p style="margin:12px 0 0 0;font-size:13px;color:#5c6675;">Your iRAIN: <strong>{{iRain}}</strong></p>
    </td></tr>
  </table>
</body></html>`;

const updateConfirmedTextTemplate = `Hi {{firstName}},

Your iRefair profile update is confirmed.

{{candidateKeySection}}

iRAIN: {{iRain}}

- The iRefair team`;

const updateConfirmedHtmlTemplateFr = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:20px;">
    <tr><td style="padding:6px 0 12px 0;">
      <div style="font-size:20px;font-weight:700;color:#2f5fb3;">iRefair</div>
    </td></tr>
    <tr><td>
      <p style="margin:0 0 10px 0;font-size:15px;color:#1f2a37;">Bonjour {{firstName}},</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#3b4251;">La mise a jour de votre profil iRefair est confirmee.</p>
      {{candidateKeySection}}
      <p style="margin:12px 0 0 0;font-size:13px;color:#5c6675;">Votre iRAIN : <strong>{{iRain}}</strong></p>
    </td></tr>
  </table>
</body></html>`;

const updateConfirmedTextTemplateFr = `Bonjour {{firstName}},

La mise a jour de votre profil iRefair est confirmee.

{{candidateKeySection}}

Votre iRAIN : {{iRain}}

- L'equipe iRefair`;

export const runtime = "nodejs";

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? "");
}

function buildCandidateKeySectionHtml(candidateKey?: string) {
  if (!candidateKey) return "";
  const safeKey = escapeHtml(candidateKey);
  return `<div style="margin:12px 0 0 0;padding:12px 14px;border-radius:10px;border:1px solid #e0e7ef;background:#f7f9fc;">
  <p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;"><strong>Your Candidate Key:</strong> ${safeKey}</p>
  <p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563;">Keep this private. You will need it to apply with your iRAIN.</p>
</div>`;
}

function buildCandidateKeySectionText(candidateKey?: string) {
  if (!candidateKey) return "";
  return `Your Candidate Key: ${candidateKey}
Keep this private. You will need it to apply with your iRAIN.`;
}

function parseExpiry(value?: string) {
  if (!value) return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function safeCompareHash(expected: string, actual: string) {
  if (!expected || !actual) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function readToken(request: NextRequest) {
  const tokenFromQuery = request.nextUrl.searchParams.get("token");
  if (tokenFromQuery) return tokenFromQuery;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { token?: string };
      if (typeof body?.token === "string") return body.token;
    } catch {
      return "";
    }
  }
  if (contentType.includes("form")) {
    try {
      const form = await request.formData();
      const tokenEntry = form.get("token");
      if (typeof tokenEntry === "string") return tokenEntry;
    } catch {
      return "";
    }
  }
  return "";
}

async function handleConfirm(request: NextRequest) {
  const token = await readToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyCandidateUpdateToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 401 });
  }

  const candidate = await getCandidateByEmail(payload.email);
  if (!candidate) {
    return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  }

  if (candidate.rowIndex !== payload.rowIndex) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 403 });
  }

  const storedTokenHash = candidate.record.updateTokenHash?.trim() || "";
  const tokenHash = hashToken(token);
  if (!safeCompareHash(storedTokenHash, tokenHash)) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 403 });
  }

  const storedExpiry = parseExpiry(candidate.record.updateTokenExpiresAt);
  if (!storedExpiry || storedExpiry < Date.now()) {
    return NextResponse.json({ ok: false, error: "Token expired" }, { status: 403 });
  }

  const pendingRaw = candidate.record.updatePendingPayload?.trim();
  if (!pendingRaw) {
    return NextResponse.json({ ok: false, error: "Missing pending update" }, { status: 400 });
  }

  let pending: PendingCandidateUpdatePayload;
  try {
    pending = JSON.parse(pendingRaw) as PendingCandidateUpdatePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid pending payload" }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const requiredColumns = [
    CANDIDATE_SECRET_HASH_HEADER,
    CANDIDATE_UPDATE_TOKEN_HASH_HEADER,
    CANDIDATE_UPDATE_TOKEN_EXPIRES_HEADER,
    CANDIDATE_UPDATE_PENDING_PAYLOAD_HEADER,
  ];

  if (pending.resumeFileId || pending.resumeFileName) {
    requiredColumns.push("Resume File Name", "Resume File ID", "Resume URL");
  }
  if (pending.legacyCandidateId) {
    requiredColumns.push(LEGACY_CANDIDATE_ID_HEADER);
  }

  await ensureColumns(CANDIDATE_SHEET_NAME, requiredColumns);

  let candidateSecret: string | undefined;
  let candidateSecretHash: string | undefined;
  if (!candidate.record.candidateSecretHash) {
    candidateSecret = createCandidateSecret();
    candidateSecretHash = hashCandidateSecret(candidateSecret);
  }

  const updates: Record<string, string | undefined> = {
    iRAIN: pending.id,
    Timestamp: timestamp,
    "First Name": pending.firstName,
    "Middle Name": pending.middleName,
    "Family Name": pending.familyName,
    Email: pending.email,
    Phone: pending.phone,
    "Located in Canada": pending.locatedCanada,
    Province: pending.province,
    "Work Authorization": pending.authorizedCanada,
    "Eligible to Move (6 Months)": pending.eligibleMoveCanada,
    "Country of Origin": pending.countryOfOrigin,
    Languages: pending.languages,
    "Languages Other": pending.languagesOther,
    "Industry Type": pending.industryType,
    "Industry Other": pending.industryOther,
    "Employment Status": pending.employmentStatus,
    [LEGACY_CANDIDATE_ID_HEADER]: pending.legacyCandidateId,
    [CANDIDATE_SECRET_HASH_HEADER]: candidateSecretHash,
    [CANDIDATE_UPDATE_TOKEN_HASH_HEADER]: "",
    [CANDIDATE_UPDATE_TOKEN_EXPIRES_HEADER]: "",
    [CANDIDATE_UPDATE_PENDING_PAYLOAD_HEADER]: "",
  };

  if (pending.resumeFileId || pending.resumeFileName) {
    updates["Resume File Name"] = pending.resumeFileName;
    updates["Resume File ID"] = pending.resumeFileId;
    updates["Resume URL"] = "";
  }

  const updateResult = await updateRowById(CANDIDATE_SHEET_NAME, "Email", payload.email, updates);
  if (!updateResult.updated) {
    return NextResponse.json({ ok: false, error: "Failed to apply update" }, { status: 500 });
  }

  const locale: EmailLanguage = pending.locale === "fr" ? "fr" : "en";
  const firstName = pending.firstName || candidate.record.firstName || "there";
  const iRainValue = pending.id || candidate.record.id || "";

  const candidateKeySectionHtml = buildCandidateKeySectionHtml(candidateSecret);
  const candidateKeySectionText = buildCandidateKeySectionText(candidateSecret);
  const template = locale === "fr" ? updateConfirmedHtmlTemplateFr : updateConfirmedHtmlTemplate;
  const textTemplate = locale === "fr" ? updateConfirmedTextTemplateFr : updateConfirmedTextTemplate;
  const html = fillTemplate(template, {
    firstName: escapeHtml(firstName),
    iRain: escapeHtml(iRainValue),
    candidateKeySection: candidateKeySectionHtml,
  });
  const text = fillTemplate(textTemplate, {
    firstName,
    iRain: iRainValue,
    candidateKeySection: candidateKeySectionText,
  });
  const subject = locale === "fr" ? updateConfirmedSubjectFr : updateConfirmedSubject;

  await sendMail({
    to: pending.email || payload.email,
    subject,
    html,
    text,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  return handleConfirm(request);
}

export async function POST(request: NextRequest) {
  return handleConfirm(request);
}
