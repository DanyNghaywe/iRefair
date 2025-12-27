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
  getCandidateByRowIndex,
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

const updateConfirmedHtmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profile update confirmed</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <!-- Header -->
        <tr><td style="padding:0 0 32px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="width:10px;height:10px;background:#3d8bfd;border-radius:50%;"></td>
            <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">iRefair</td>
          </tr></table>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;">Hi {{firstName}},</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Your iRefair profile update is confirmed.</p>
          {{candidateKeySection}}
          <p style="margin:20px 0 0 0;font-size:14px;color:#64748b;">Your iRAIN: <strong style="color:#0f172a;">{{iRain}}</strong></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by iRefair · Connecting talent with opportunity</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const updateConfirmedTextTemplate = `Hi {{firstName}},

Your iRefair profile update is confirmed.

{{candidateKeySection}}

iRAIN: {{iRain}}

- The iRefair team`;

const updateConfirmedHtmlTemplateFr = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mise a jour confirmee</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <!-- Header -->
        <tr><td style="padding:0 0 32px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="width:10px;height:10px;background:#3d8bfd;border-radius:50%;"></td>
            <td style="padding-left:10px;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">iRefair</td>
          </tr></table>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;">Bonjour {{firstName}},</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">La mise a jour de votre profil iRefair est confirmee.</p>
          {{candidateKeySection}}
          <p style="margin:20px 0 0 0;font-size:14px;color:#64748b;">Votre iRAIN : <strong style="color:#0f172a;">{{iRain}}</strong></p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Envoye par iRefair · Connecter les talents aux opportunites</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const updateConfirmedTextTemplateFr = `Bonjour {{firstName}},

La mise a jour de votre profil iRefair est confirmee.

{{candidateKeySection}}

Votre iRAIN : {{iRain}}

- L'equipe iRefair`;

const successPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Updated - iRefair</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { max-width: 480px; text-align: center; }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 32px;
    }
    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #3d8bfd;
      border-radius: 50%;
      margin-right: 10px;
      vertical-align: middle;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 32px;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: #ecfdf5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; color: #10b981; }
    h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    .irain {
      display: inline-block;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      color: #0f172a;
      font-weight: 600;
    }
    .footer { margin-top: 24px; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="dot"></span>iRefair</div>
    <div class="card">
      <div class="icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h1>Profile Updated!</h1>
      <p>Your iRefair profile has been successfully updated. You can close this page.</p>
      <div class="irain">iRAIN: {{iRain}}</div>
    </div>
    <p class="footer">You'll receive a confirmation email shortly.</p>
  </div>
</body>
</html>`;

const errorPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update Failed - iRefair</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #ffffff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { max-width: 480px; text-align: center; }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 32px;
    }
    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #3d8bfd;
      border-radius: 50%;
      margin-right: 10px;
      vertical-align: middle;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 32px;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: #fef2f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; color: #ef4444; }
    h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    .error-msg {
      display: inline-block;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      color: #dc2626;
    }
    .footer { margin-top: 24px; font-size: 13px; color: #94a3b8; }
    a { color: #3d8bfd; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="dot"></span>iRefair</div>
    <div class="card">
      <div class="icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h1>Update Failed</h1>
      <p>We couldn't complete your profile update.</p>
      <div class="error-msg">{{errorMessage}}</div>
    </div>
    <p class="footer">Need help? <a href="mailto:support@irefair.com">Contact support</a></p>
  </div>
</body>
</html>`;

export const runtime = "nodejs";

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? "");
}

function errorResponse(message: string, status: number, isGetRequest: boolean) {
  if (isGetRequest) {
    const html = errorPageHtml.replace("{{errorMessage}}", escapeHtml(message));
    return new NextResponse(html, {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.json({ ok: false, error: message }, { status });
}

function buildCandidateKeySectionHtml(candidateKey?: string) {
  if (!candidateKey) return "";
  const safeKey = escapeHtml(candidateKey);
  return `<div style="margin:20px 0;padding:16px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;">
  <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#0f172a;"><strong>Your Candidate Key:</strong> ${safeKey}</p>
  <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Keep this private. You will need it to apply with your iRAIN.</p>
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

async function handleConfirm(request: NextRequest, isGetRequest: boolean) {
  const token = await readToken(request);
  if (!token) {
    return errorResponse("Missing confirmation token. Please use the link from your email.", 400, isGetRequest);
  }

  let payload;
  try {
    payload = verifyCandidateUpdateToken(token);
  } catch {
    return errorResponse("This confirmation link is invalid or has expired. Please submit a new update request.", 401, isGetRequest);
  }

  const tokenHash = hashToken(token);
  let candidate = await getCandidateByEmail(payload.email);
  let storedTokenHash = candidate?.record.updateTokenHash?.trim() || "";

  if (!candidate || !safeCompareHash(storedTokenHash, tokenHash)) {
    candidate = await getCandidateByRowIndex(payload.rowIndex);
    storedTokenHash = candidate?.record.updateTokenHash?.trim() || "";
  }

  if (!candidate) {
    return errorResponse("We couldn't find your profile. Please contact support if this persists.", 404, isGetRequest);
  }

  if (!safeCompareHash(storedTokenHash, tokenHash)) {
    return errorResponse("This confirmation link is no longer valid. Please submit a new update request.", 403, isGetRequest);
  }

  const storedExpiry = parseExpiry(candidate.record.updateTokenExpiresAt);
  if (!storedExpiry || storedExpiry < Date.now()) {
    return errorResponse("This confirmation link has expired. Please submit a new update request.", 403, isGetRequest);
  }

  const pendingRaw = candidate.record.updatePendingPayload?.trim();
  if (!pendingRaw) {
    return errorResponse("No pending update found. Your profile may have already been updated.", 400, isGetRequest);
  }

  let pending: PendingCandidateUpdatePayload;
  try {
    pending = JSON.parse(pendingRaw) as PendingCandidateUpdatePayload;
  } catch {
    return errorResponse("There was a problem processing your update. Please try again.", 400, isGetRequest);
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
    return errorResponse("We couldn't save your update. Please try again or contact support.", 500, isGetRequest);
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

  if (isGetRequest) {
    const successHtml = successPageHtml.replace("{{iRain}}", escapeHtml(iRainValue));
    return new NextResponse(successHtml, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  return handleConfirm(request, true);
}

export async function POST(request: NextRequest) {
  return handleConfirm(request, false);
}
