import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { sendMail } from "@/lib/mailer";
import {
  APPLICANT_SECRET_HASH_HEADER,
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
  APPLICANT_UPDATE_TOKEN_HASH_HEADER,
  APPLICANT_REGISTRATION_STATUS_HEADER,
  APPLICANT_SHEET_NAME,
  deleteApplicantByIrain,
  ensureColumns,
  getApplicantByEmail,
  updateRowById,
} from "@/lib/sheets";
import { escapeHtml } from "@/lib/validation";
import {
  createApplicantSecret,
  hashApplicantSecret,
  hashToken,
  verifyApplicantUpdateToken,
} from "@/lib/applicantUpdateToken";
import { applicantRegistrationConfirmation } from "@/lib/emailTemplates";

type EmailLanguage = "en" | "fr";

const successPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmed - iRefair</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #f7f4ff;
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
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #e2e6f1;
      border-radius: 16px;
      padding: 40px 32px;
      box-shadow: 0 24px 70px rgba(35, 46, 89, 0.16);
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
      <h1>Registration Confirmed!</h1>
      <p>Your iRefair profile has been successfully activated. You can now apply for referral opportunities.</p>
      <div class="irain">iRAIN: {{iRain}}</div>
    </div>
    <p class="footer">You'll receive a confirmation email shortly with your credentials.</p>
  </div>
</body>
</html>`;

const errorPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Failed - iRefair</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #f7f4ff;
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
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #e2e6f1;
      border-radius: 16px;
      padding: 40px 32px;
      box-shadow: 0 24px 70px rgba(35, 46, 89, 0.16);
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
      <h1>Registration Failed</h1>
      <p>We couldn't complete your registration.</p>
      <div class="error-msg">{{errorMessage}}</div>
    </div>
    <p class="footer">Need help? <a href="mailto:support@irefair.com">Contact support</a></p>
  </div>
</body>
</html>`;

export const runtime = "nodejs";

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
    payload = verifyApplicantUpdateToken(token);
  } catch {
    return errorResponse("This confirmation link is invalid or has expired. Please register again.", 401, isGetRequest);
  }

  const tokenHash = hashToken(token);

  // Look up applicant by email
  const applicant = await getApplicantByEmail(payload.email);
  if (!applicant) {
    return errorResponse("We couldn't find your registration. Please register again.", 404, isGetRequest);
  }

  const storedTokenHash = applicant.record.updateTokenHash?.trim() || "";

  // Verify token hash matches
  if (!safeCompareHash(storedTokenHash, tokenHash)) {
    return errorResponse("This confirmation link is no longer valid. Please register again.", 403, isGetRequest);
  }

  // Check if already confirmed
  const registrationStatus = applicant.record.registrationStatus?.trim() || "";
  if (registrationStatus !== "Pending Confirmation") {
    // Already confirmed - show success page anyway
    const iRainValue = applicant.record.id || "";
    if (isGetRequest) {
      const successHtml = successPageHtml.replace("{{iRain}}", escapeHtml(iRainValue));
      return new NextResponse(successHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  // Check token expiry
  const storedExpiry = parseExpiry(applicant.record.updateTokenExpiresAt);
  if (!storedExpiry || storedExpiry < Date.now()) {
    // Delete the expired pending registration
    if (applicant.record.id) {
      await deleteApplicantByIrain(applicant.record.id);
    }
    return errorResponse("This confirmation link has expired. Please register again.", 403, isGetRequest);
  }

  // Generate applicant secret
  const applicantSecret = createApplicantSecret();
  const applicantSecretHash = hashApplicantSecret(applicantSecret);

  // Prepare columns and updates
  const requiredColumns = [
    APPLICANT_SECRET_HASH_HEADER,
    APPLICANT_UPDATE_TOKEN_HASH_HEADER,
    APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
    APPLICANT_REGISTRATION_STATUS_HEADER,
  ];
  await ensureColumns(APPLICANT_SHEET_NAME, requiredColumns);

  // Update applicant: clear token, set secret, clear registration status
  const updates: Record<string, string> = {
    [APPLICANT_SECRET_HASH_HEADER]: applicantSecretHash,
    [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: "",
    [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: "",
    [APPLICANT_REGISTRATION_STATUS_HEADER]: "",
  };

  const updateResult = await updateRowById(APPLICANT_SHEET_NAME, "Email", payload.email, updates);
  if (!updateResult.updated) {
    return errorResponse("We couldn't complete your registration. Please try again or contact support.", 500, isGetRequest);
  }

  const iRainValue = applicant.record.id || "";
  const firstName = applicant.record.firstName || "there";

  // Determine locale from stored data or default to 'en'
  const locale: EmailLanguage = "en";

  // Build profile snapshot for confirmation email
  const notProvided = "Not provided";
  const locationSnapshot = (() => {
    const locatedCanada = applicant.record.locatedCanada || "";
    const province = applicant.record.province || "";
    const countryOfOrigin = applicant.record.countryOfOrigin || "";
    if (locatedCanada.toLowerCase() === "yes") return province ? `Canada - ${province}` : "Canada";
    if (locatedCanada.toLowerCase() === "no" && countryOfOrigin) return countryOfOrigin;
    return countryOfOrigin || notProvided;
  })();

  const authorizationSnapshot = (() => {
    const locatedCanada = applicant.record.locatedCanada || "";
    const authorizedCanada = applicant.record.authorizedCanada || "";
    const eligibleMoveCanada = applicant.record.eligibleMoveCanada || "";
    if (locatedCanada.toLowerCase() === "yes") return authorizedCanada || notProvided;
    if (locatedCanada.toLowerCase() === "no") {
      if (eligibleMoveCanada) {
        return `Eligible to move/work in 6 months: ${eligibleMoveCanada}`;
      }
      return notProvided;
    }
    return authorizedCanada || eligibleMoveCanada || notProvided;
  })();

  const industrySnapshot = (() => {
    const industryType = applicant.record.industryType || "";
    const industryOther = applicant.record.industryOther || "";
    if (industryType === "Other" && industryOther) return industryOther;
    return industryType || notProvided;
  })();

  const languagesSnapshot = applicant.record.languages || notProvided;

  // Send welcome email with iRAIN and applicant key
  const emailTemplate = applicantRegistrationConfirmation({
    firstName,
    iRain: iRainValue,
    location: locationSnapshot,
    authorization: authorizationSnapshot,
    industry: industrySnapshot,
    languages: languagesSnapshot,
    applicantKey: applicantSecret,
    locale,
  });

  await sendMail({
    to: payload.email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
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
