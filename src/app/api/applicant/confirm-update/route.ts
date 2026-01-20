import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { sendMail } from "@/lib/mailer";
import {
  APPLICANT_SECRET_HASH_HEADER,
  APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER,
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
  APPLICANT_UPDATE_TOKEN_HASH_HEADER,
  APPLICANT_SHEET_NAME,
  LEGACY_APPLICANT_ID_HEADER,
  ensureColumns,
  getApplicantByEmail,
  getApplicantByRowIndex,
  getApplicationById,
  updateRowById,
  updateApplicationAdmin,
  checkApplicantEligibilityAndGetAffectedApplications,
  markApplicationsAsIneligible,
  getReferrerByIrref,
} from "@/lib/sheets";
import { escapeHtml } from "@/lib/validation";
import { appendActionHistoryEntry, type ActionLogEntry } from "@/lib/actionHistory";
import {
  createApplicantSecret,
  hashApplicantSecret,
  hashToken,
  verifyApplicantUpdateToken,
} from "@/lib/applicantUpdateToken";
import {
  applicantProfileUpdateConfirmed,
  applicantIneligibleNotification,
  applicantUpdatedToReferrer,
  meetingCancelledToApplicant,
  meetingCancelledToReferrer,
} from "@/lib/emailTemplates";
import { buildReferrerPortalLink, ensureReferrerPortalTokenVersion } from "@/lib/referrerPortalLink";

type EmailLanguage = "en" | "fr";

function getLocaleFromToken(token: string): EmailLanguage {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.locale === 'fr' ? 'fr' : 'en';
    }
  } catch {
    // Ignore parse errors
  }
  return 'en';
}

type PendingApplicantUpdatePayload = {
  id?: string;
  legacyApplicantId?: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  phone: string;
  linkedin: string;
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
  updateRequestApplicationId?: string;
  updateRequestTokenHash?: string;
  updateRequestPurpose?: string;
};

const successPageHtml = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} - iRefair</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif;
      background-color: #0f343c;
      background-image: radial-gradient(ellipse at 50% 30%, rgba(223, 243, 248, 0.6) 0%, rgba(19, 80, 88, 0.58) 42%, #0f343c 100%);
      background-repeat: no-repeat;
      background-attachment: fixed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 36px 28px;
      position: relative;
      overflow: hidden;
    }
    .background-hero {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at 50% 32%, rgba(223, 243, 248, 0.54) 0%, rgba(19, 80, 88, 0.62) 44%, #0b2b32 100%);
      opacity: 0.88;
    }
    .particles {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
    }
    .particle {
      position: absolute;
      width: 3px;
      height: 3px;
      background: rgba(122, 215, 227, 0.55);
      animation: float 20s infinite ease-in-out;
    }
    .particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; animation-duration: 25s; }
    .particle:nth-child(2) { left: 20%; top: 80%; animation-delay: -5s; animation-duration: 20s; }
    .particle:nth-child(3) { left: 30%; top: 40%; animation-delay: -10s; animation-duration: 28s; }
    .particle:nth-child(4) { left: 40%; top: 60%; animation-delay: -3s; animation-duration: 22s; }
    .particle:nth-child(5) { left: 50%; top: 30%; animation-delay: -7s; animation-duration: 26s; }
    .particle:nth-child(6) { left: 60%; top: 70%; animation-delay: -12s; animation-duration: 24s; }
    .particle:nth-child(7) { left: 70%; top: 50%; animation-delay: -2s; animation-duration: 21s; }
    .particle:nth-child(8) { left: 80%; top: 25%; animation-delay: -8s; animation-duration: 27s; }
    .particle:nth-child(9) { left: 90%; top: 85%; animation-delay: -15s; animation-duration: 23s; }
    .particle:nth-child(10) { left: 15%; top: 55%; animation-delay: -6s; animation-duration: 19s; }
    .particle:nth-child(11) { left: 85%; top: 45%; animation-delay: -9s; animation-duration: 30s; }
    .particle:nth-child(12) { left: 45%; top: 15%; animation-delay: -4s; animation-duration: 18s; }
    @keyframes float {
      0%, 100% { transform: translate(0, 0); opacity: 0.55; }
      25% { transform: translate(30px, -40px); opacity: 0.7; }
      50% { transform: translate(-20px, 20px); opacity: 0.4; }
      75% { transform: translate(40px, 30px); opacity: 0.6; }
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 480px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 32px;
      letter-spacing: -0.01em;
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
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 40px 32px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; color: #10b981; }
    h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    p { font-size: 15px; color: rgba(255, 255, 255, 0.7); line-height: 1.6; margin-bottom: 24px; }
    .irain {
      display: inline-block;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      color: #ffffff;
      font-weight: 600;
    }
    .footer { margin-top: 24px; font-size: 13px; color: rgba(255, 255, 255, 0.5); }
    @media (max-width: 600px) {
      body { padding: 20px 14px; }
      .card { padding: 32px 24px; }
    }
  </style>
</head>
<body>
  <div class="background-hero"></div>
  <div class="particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>
  <div class="container">
    <div class="logo"><span class="dot"></span>iRefair</div>
    <div class="card">
      <div class="icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <h1>{{heading}}</h1>
      <p>{{description}}</p>
      <div class="irain">iRAIN: {{iRain}}</div>
    </div>
    <p class="footer">{{footer}}</p>
  </div>
</body>
</html>`;

const ineligiblePageHtml = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} - iRefair</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif;
      background-color: #0f343c;
      background-image: radial-gradient(ellipse at 50% 30%, rgba(223, 243, 248, 0.6) 0%, rgba(19, 80, 88, 0.58) 42%, #0f343c 100%);
      background-repeat: no-repeat;
      background-attachment: fixed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 36px 28px;
      position: relative;
      overflow: hidden;
    }
    .background-hero {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at 50% 32%, rgba(223, 243, 248, 0.54) 0%, rgba(19, 80, 88, 0.62) 44%, #0b2b32 100%);
      opacity: 0.88;
    }
    .particles {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
    }
    .particle {
      position: absolute;
      width: 3px;
      height: 3px;
      background: rgba(122, 215, 227, 0.55);
      animation: float 20s infinite ease-in-out;
    }
    .particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; animation-duration: 25s; }
    .particle:nth-child(2) { left: 20%; top: 80%; animation-delay: -5s; animation-duration: 20s; }
    .particle:nth-child(3) { left: 30%; top: 40%; animation-delay: -10s; animation-duration: 28s; }
    .particle:nth-child(4) { left: 40%; top: 60%; animation-delay: -3s; animation-duration: 22s; }
    .particle:nth-child(5) { left: 50%; top: 30%; animation-delay: -7s; animation-duration: 26s; }
    .particle:nth-child(6) { left: 60%; top: 70%; animation-delay: -12s; animation-duration: 24s; }
    .particle:nth-child(7) { left: 70%; top: 50%; animation-delay: -2s; animation-duration: 21s; }
    .particle:nth-child(8) { left: 80%; top: 25%; animation-delay: -8s; animation-duration: 27s; }
    .particle:nth-child(9) { left: 90%; top: 85%; animation-delay: -15s; animation-duration: 23s; }
    .particle:nth-child(10) { left: 15%; top: 55%; animation-delay: -6s; animation-duration: 19s; }
    .particle:nth-child(11) { left: 85%; top: 45%; animation-delay: -9s; animation-duration: 30s; }
    .particle:nth-child(12) { left: 45%; top: 15%; animation-delay: -4s; animation-duration: 18s; }
    @keyframes float {
      0%, 100% { transform: translate(0, 0); opacity: 0.55; }
      25% { transform: translate(30px, -40px); opacity: 0.7; }
      50% { transform: translate(-20px, 20px); opacity: 0.4; }
      75% { transform: translate(40px, 30px); opacity: 0.6; }
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 480px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 32px;
      letter-spacing: -0.01em;
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
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 40px 32px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; color: #f59e0b; }
    h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    p { font-size: 15px; color: rgba(255, 255, 255, 0.7); line-height: 1.6; margin-bottom: 24px; }
    .irain {
      display: inline-block;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      color: #ffffff;
      font-weight: 600;
    }
    .footer { margin-top: 24px; font-size: 13px; color: rgba(255, 255, 255, 0.5); }
    @media (max-width: 600px) {
      body { padding: 20px 14px; }
      .card { padding: 32px 24px; }
    }
  </style>
</head>
<body>
  <div class="background-hero"></div>
  <div class="particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>
  <div class="container">
    <div class="logo"><span class="dot"></span>iRefair</div>
    <div class="card">
      <div class="icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <h1>{{heading}}</h1>
      <p>{{description}}</p>
      <div class="irain">iRAIN: {{iRain}}</div>
    </div>
    <p class="footer">{{footer}}</p>
  </div>
</body>
</html>`;

const errorPageHtml = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{pageTitle}} - iRefair</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif;
      background-color: #0f343c;
      background-image: radial-gradient(ellipse at 50% 30%, rgba(223, 243, 248, 0.6) 0%, rgba(19, 80, 88, 0.58) 42%, #0f343c 100%);
      background-repeat: no-repeat;
      background-attachment: fixed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 36px 28px;
      position: relative;
      overflow: hidden;
    }
    .background-hero {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at 50% 32%, rgba(223, 243, 248, 0.54) 0%, rgba(19, 80, 88, 0.62) 44%, #0b2b32 100%);
      opacity: 0.88;
    }
    .particles {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      overflow: hidden;
    }
    .particle {
      position: absolute;
      width: 3px;
      height: 3px;
      background: rgba(122, 215, 227, 0.55);
      animation: float 20s infinite ease-in-out;
    }
    .particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; animation-duration: 25s; }
    .particle:nth-child(2) { left: 20%; top: 80%; animation-delay: -5s; animation-duration: 20s; }
    .particle:nth-child(3) { left: 30%; top: 40%; animation-delay: -10s; animation-duration: 28s; }
    .particle:nth-child(4) { left: 40%; top: 60%; animation-delay: -3s; animation-duration: 22s; }
    .particle:nth-child(5) { left: 50%; top: 30%; animation-delay: -7s; animation-duration: 26s; }
    .particle:nth-child(6) { left: 60%; top: 70%; animation-delay: -12s; animation-duration: 24s; }
    .particle:nth-child(7) { left: 70%; top: 50%; animation-delay: -2s; animation-duration: 21s; }
    .particle:nth-child(8) { left: 80%; top: 25%; animation-delay: -8s; animation-duration: 27s; }
    .particle:nth-child(9) { left: 90%; top: 85%; animation-delay: -15s; animation-duration: 23s; }
    .particle:nth-child(10) { left: 15%; top: 55%; animation-delay: -6s; animation-duration: 19s; }
    .particle:nth-child(11) { left: 85%; top: 45%; animation-delay: -9s; animation-duration: 30s; }
    .particle:nth-child(12) { left: 45%; top: 15%; animation-delay: -4s; animation-duration: 18s; }
    @keyframes float {
      0%, 100% { transform: translate(0, 0); opacity: 0.55; }
      25% { transform: translate(30px, -40px); opacity: 0.7; }
      50% { transform: translate(-20px, 20px); opacity: 0.4; }
      75% { transform: translate(40px, 30px); opacity: 0.6; }
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 480px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 32px;
      letter-spacing: -0.01em;
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
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04));
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 40px 32px;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; color: #ef4444; }
    h1 { font-size: 24px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    p { font-size: 15px; color: rgba(255, 255, 255, 0.7); line-height: 1.6; margin-bottom: 24px; }
    .error-msg {
      display: inline-block;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 12px 20px;
      font-size: 14px;
      color: #fca5a5;
    }
    .footer { margin-top: 24px; font-size: 13px; color: rgba(255, 255, 255, 0.5); }
    a { color: #7ad7e3; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media (max-width: 600px) {
      body { padding: 20px 14px; }
      .card { padding: 32px 24px; }
    }
  </style>
</head>
<body>
  <div class="background-hero"></div>
  <div class="particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>
  <div class="container">
    <div class="logo"><span class="dot"></span>iRefair</div>
    <div class="card">
      <div class="icon">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>
      <h1>{{heading}}</h1>
      <p>{{description}}</p>
      <div class="error-msg">{{errorMessage}}</div>
    </div>
    <p class="footer">{{needHelp}} <a href="mailto:irefair.andbeyondconsulting@gmail.com">{{contactSupport}}</a></p>
  </div>
</body>
</html>`;

export const runtime = "nodejs";

function errorResponse(message: string, status: number, isGetRequest: boolean, locale: EmailLanguage = 'en') {
  const translations = {
    en: {
      pageTitle: 'Update Failed',
      heading: 'Update Failed',
      description: "We couldn't complete your profile update.",
      needHelp: 'Need help?',
      contactSupport: 'Contact support',
    },
    fr: {
      pageTitle: 'Échec de la mise à jour',
      heading: 'Échec de la mise à jour',
      description: "Nous n'avons pas pu compléter la mise à jour de votre profil.",
      needHelp: "Besoin d'aide?",
      contactSupport: 'Contacter le support',
    },
  };
  const t = translations[locale];

  if (isGetRequest) {
    const html = errorPageHtml
      .replace("{{lang}}", locale)
      .replace("{{pageTitle}}", t.pageTitle)
      .replace("{{heading}}", t.heading)
      .replace("{{description}}", t.description)
      .replace("{{needHelp}}", t.needHelp)
      .replace("{{contactSupport}}", t.contactSupport)
      .replace("{{errorMessage}}", message);
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
    return errorResponse(
      "Missing confirmation token. Please use the link from your email.",
      400,
      isGetRequest
    );
  }

  const locale = getLocaleFromToken(token);

  let payload;
  try {
    payload = verifyApplicantUpdateToken(token);
  } catch {
    return errorResponse(
      locale === 'fr'
        ? "Ce lien de confirmation est invalide ou a expiré. Veuillez soumettre une nouvelle demande de mise à jour."
        : "This confirmation link is invalid or has expired. Please submit a new update request.",
      401,
      isGetRequest,
      locale
    );
  }

  const tokenHash = hashToken(token);
  let applicant = await getApplicantByEmail(payload.email);
  let storedTokenHash = applicant?.record.updateTokenHash?.trim() || "";

  if (!applicant || !safeCompareHash(storedTokenHash, tokenHash)) {
    applicant = await getApplicantByRowIndex(payload.rowIndex);
    storedTokenHash = applicant?.record.updateTokenHash?.trim() || "";
  }

  if (!applicant) {
    return errorResponse(
      locale === 'fr'
        ? "Nous n'avons pas trouvé votre profil. Veuillez contacter le support si le problème persiste."
        : "We couldn't find your profile. Please contact support if this persists.",
      404,
      isGetRequest,
      locale
    );
  }

  // Block archived applicants from confirming profile updates
  if (applicant.record.archived?.toLowerCase() === 'true') {
    return errorResponse(
      locale === 'fr'
        ? "Ce profil de candidat a été archivé et ne peut plus être mis à jour."
        : "This applicant profile has been archived and can no longer be updated.",
      403,
      isGetRequest,
      locale
    );
  }

  if (!safeCompareHash(storedTokenHash, tokenHash)) {
    return errorResponse(
      locale === 'fr'
        ? "Ce lien de confirmation n'est plus valide. Veuillez soumettre une nouvelle demande de mise à jour."
        : "This confirmation link is no longer valid. Please submit a new update request.",
      403,
      isGetRequest,
      locale
    );
  }

  const storedExpiry = parseExpiry(applicant.record.updateTokenExpiresAt);
  if (!storedExpiry || storedExpiry < Date.now()) {
    return errorResponse(
      locale === 'fr'
        ? "Ce lien de confirmation a expiré. Veuillez soumettre une nouvelle demande de mise à jour."
        : "This confirmation link has expired. Please submit a new update request.",
      403,
      isGetRequest,
      locale
    );
  }

  const pendingRaw = applicant.record.updatePendingPayload?.trim();
  if (!pendingRaw) {
    return errorResponse(
      locale === 'fr'
        ? "Aucune mise à jour en attente. Votre profil a peut-être déjà été mis à jour."
        : "No pending update found. Your profile may have already been updated.",
      400,
      isGetRequest,
      locale
    );
  }

  let pending: PendingApplicantUpdatePayload;
  try {
    pending = JSON.parse(pendingRaw) as PendingApplicantUpdatePayload;
  } catch {
    return errorResponse(
      locale === 'fr'
        ? "Un problème est survenu lors du traitement de votre mise à jour. Veuillez réessayer."
        : "There was a problem processing your update. Please try again.",
      400,
      isGetRequest,
      locale
    );
  }

  const timestamp = new Date().toISOString();
  const requiredColumns = [
    APPLICANT_SECRET_HASH_HEADER,
    APPLICANT_UPDATE_TOKEN_HASH_HEADER,
    APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
    APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER,
  ];

  if (pending.resumeFileId || pending.resumeFileName) {
    requiredColumns.push("Resume File Name", "Resume File ID", "Resume URL");
  }
  if (pending.legacyApplicantId) {
    requiredColumns.push(LEGACY_APPLICANT_ID_HEADER);
  }

  await ensureColumns(APPLICANT_SHEET_NAME, requiredColumns);

  let applicantSecret: string | undefined;
  let applicantSecretHash: string | undefined;
  if (!applicant.record.applicantSecretHash) {
    applicantSecret = createApplicantSecret();
    applicantSecretHash = hashApplicantSecret(applicantSecret);
  }

  const updates: Record<string, string | undefined> = {
    iRAIN: pending.id,
    Timestamp: timestamp,
    "First Name": pending.firstName,
    "Middle Name": pending.middleName,
    "Family Name": pending.familyName,
    Email: pending.email,
    Phone: pending.phone,
    LinkedIn: pending.linkedin,
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
    [LEGACY_APPLICANT_ID_HEADER]: pending.legacyApplicantId,
    [APPLICANT_SECRET_HASH_HEADER]: applicantSecretHash,
    [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: "",
    [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: "",
    [APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER]: "",
  };

  if (pending.resumeFileId || pending.resumeFileName) {
    updates["Resume File Name"] = pending.resumeFileName;
    updates["Resume File ID"] = pending.resumeFileId;
    updates["Resume URL"] = "";
  }

  const updateResult = await updateRowById(APPLICANT_SHEET_NAME, "Email", payload.email, updates);
  // Prefer pending.locale over token locale
  const finalLocale: EmailLanguage = pending.locale === "fr" ? "fr" : locale;
  if (!updateResult.updated) {
    return errorResponse(
      finalLocale === 'fr'
        ? "Nous n'avons pas pu enregistrer votre mise à jour. Veuillez réessayer ou contacter le support."
        : "We couldn't save your update. Please try again or contact support.",
      500,
      isGetRequest,
      finalLocale
    );
  }
  const firstName = pending.firstName || applicant.record.firstName || "there";
  const iRainValue = pending.id || applicant.record.id || "";

  // Check if applicant became ineligible and update their applications
  const locatedCanada = pending.locatedCanada || "";
  const authorizedCanada = pending.authorizedCanada || "";
  const eligibleMoveCanada = pending.eligibleMoveCanada || "";

  const isIneligible =
    (locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no") ||
    (locatedCanada.toLowerCase() === "yes" && authorizedCanada.toLowerCase() === "no");

  if (isIneligible && iRainValue) {
    try {
      const eligibilityResult = await checkApplicantEligibilityAndGetAffectedApplications(
        iRainValue,
        locatedCanada,
        authorizedCanada,
        eligibleMoveCanada,
      );

      if (eligibilityResult.affectedApplications.length > 0) {
        // Update all affected applications to ineligible
        await markApplicationsAsIneligible(
          eligibilityResult.affectedApplications.map((app) => app.id),
        );

        // Send cancellation emails for applications with scheduled meetings
        const applicantFullName = [pending.firstName, pending.familyName].filter(Boolean).join(" ").trim() || pending.email;

        for (const app of eligibilityResult.affectedApplications) {
          if (app.hadMeetingScheduled && app.referrerEmail) {
            try {
              // Get referrer details for the email
              const referrer = app.referrerIrref ? await getReferrerByIrref(app.referrerIrref) : null;
              const referrerName = referrer?.record?.name || undefined;
              const companyName = referrer?.record?.company || undefined;

              // Generate portal link for referrer
              let portalUrl: string | undefined;
              if (app.referrerIrref) {
                try {
                  const tokenVersion = await ensureReferrerPortalTokenVersion(app.referrerIrref);
                  portalUrl = buildReferrerPortalLink(app.referrerIrref, tokenVersion);
                } catch {
                  // Ignore portal link errors
                }
              }

              // Send cancellation email to applicant
              const applicantTemplate = meetingCancelledToApplicant({
                applicantName: applicantFullName,
                referrerName,
                companyName,
                position: app.position,
                reason: finalLocale === "fr"
                  ? "Votre profil ne répond plus aux critères d'éligibilité."
                  : "Your profile no longer meets the eligibility requirements.",
                locale: finalLocale,
              });
              await sendMail({
                to: pending.email,
                subject: applicantTemplate.subject,
                html: applicantTemplate.html,
                text: applicantTemplate.text,
              });

              // Send cancellation email to referrer
              const referrerTemplate = meetingCancelledToReferrer({
                referrerName,
                applicantName: applicantFullName,
                companyName,
                position: app.position,
                cancelledDueToAction: "the applicant's profile no longer meets eligibility requirements",
                portalUrl,
              });
              await sendMail({
                to: app.referrerEmail,
                subject: referrerTemplate.subject,
                html: referrerTemplate.html,
                text: referrerTemplate.text,
              });
            } catch (emailErr) {
              console.error("Error sending meeting cancellation emails:", emailErr);
            }
          }
        }
      }
    } catch (eligibilityErr) {
      // Log but don't fail the update - eligibility handling is best-effort
      console.error("Error handling eligibility update for applications:", eligibilityErr);
    }
  }

  const updateRequestApplicationId = pending.updateRequestApplicationId?.trim();
  const updateRequestTokenHash = pending.updateRequestTokenHash?.trim().toLowerCase();
  const updateRequestPurpose = (pending.updateRequestPurpose || "").trim().toLowerCase();

  if (updateRequestApplicationId && updateRequestTokenHash) {
    try {
      const application = await getApplicationById(updateRequestApplicationId);
      if (application?.record && application.record.archived?.toLowerCase() !== "true") {
        const storedHash = (application.record.updateRequestTokenHash || "").trim().toLowerCase();
        const purpose = (application.record.updateRequestPurpose || updateRequestPurpose || "").trim().toLowerCase();
        const shouldHandleUpdate = (!purpose || purpose === "info") && storedHash === updateRequestTokenHash;

        if (shouldHandleUpdate) {
          const actionEntry: ActionLogEntry = {
            action: "APPLICANT_UPDATED",
            timestamp: new Date().toISOString(),
            performedBy: "applicant",
          };
          const updatedActionHistory = appendActionHistoryEntry(
            application.record.actionHistory,
            actionEntry,
          );

          await updateApplicationAdmin(application.record.id, {
            status: isIneligible ? undefined : "info updated",
            actionHistory: updatedActionHistory,
            updateRequestTokenHash: "",
            updateRequestExpiresAt: "",
            updateRequestPurpose: "",
          });

          if (!isIneligible && application.record.referrerIrref) {
            const referrer = await getReferrerByIrref(application.record.referrerIrref);
            if (referrer?.record?.email && referrer.record.archived?.toLowerCase() !== "true") {
              const referrerLocale = referrer.record.locale?.toLowerCase() === "fr" ? "fr" : "en";
              let portalUrl: string | undefined;
              try {
                const tokenVersion = await ensureReferrerPortalTokenVersion(application.record.referrerIrref);
                portalUrl = buildReferrerPortalLink(application.record.referrerIrref, tokenVersion);
              } catch {
                // Ignore portal link errors
              }

              const applicantName = [pending.firstName, pending.familyName]
                .filter(Boolean)
                .join(" ")
                .trim();

              const template = applicantUpdatedToReferrer({
                referrerName: referrer.record.name || undefined,
                applicantName: applicantName || undefined,
                applicantEmail: pending.email || applicant.record.email || undefined,
                position: application.record.position || undefined,
                applicationId: application.record.id,
                portalUrl,
                locale: referrerLocale,
              });

              await sendMail({
                to: referrer.record.email,
                subject: template.subject,
                html: template.html,
                text: template.text,
              });
            }
          }
        }
      }
    } catch (infoUpdateErr) {
      console.error("Error updating application after info request:", infoUpdateErr);
    }
  }

  // Send appropriate email based on eligibility
  const emailTemplate = isIneligible
    ? applicantIneligibleNotification({
        firstName,
        iRain: iRainValue,
        applicantKey: applicantSecret,
        locale: finalLocale,
      })
    : applicantProfileUpdateConfirmed({
        firstName,
        iRain: iRainValue,
        applicantKey: applicantSecret,
        locale: finalLocale,
      });

  await sendMail({
    to: pending.email || payload.email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  if (isGetRequest) {
    const successTranslations = {
      en: {
        pageTitle: 'Profile Updated',
        heading: 'Profile Updated!',
        description: 'Your iRefair profile has been successfully updated. You can close this page.',
        footer: "You'll receive a confirmation email shortly.",
      },
      fr: {
        pageTitle: 'Profil mis à jour',
        heading: 'Profil mis à jour!',
        description: 'Votre profil iRefair a été mis à jour avec succès. Vous pouvez fermer cette page.',
        footer: 'Vous recevrez bientôt un courriel de confirmation.',
      },
    };

    const ineligibleTranslations = {
      en: {
        pageTitle: 'Profile Updated',
        heading: 'Profile Updated',
        description: "Your iRefair profile has been updated. However, based on the information you provided, we're unable to match you with referrers at this time.",
        footer: 'Check your email for more details about your eligibility status.',
      },
      fr: {
        pageTitle: 'Profil mis à jour',
        heading: 'Profil mis à jour',
        description: "Votre profil iRefair a été mis à jour. Cependant, selon les informations fournies, nous ne sommes pas en mesure de vous jumeler avec des parrains pour le moment.",
        footer: 'Consultez votre courriel pour plus de détails sur votre statut d\'éligibilité.',
      },
    };

    const pageHtml = isIneligible ? ineligiblePageHtml : successPageHtml;
    const t = isIneligible ? ineligibleTranslations[finalLocale] : successTranslations[finalLocale];
    const resultHtml = pageHtml
      .replace("{{lang}}", finalLocale)
      .replace("{{pageTitle}}", t.pageTitle)
      .replace("{{heading}}", t.heading)
      .replace("{{description}}", t.description)
      .replace("{{footer}}", t.footer)
      .replace("{{iRain}}", escapeHtml(iRainValue));
    return new NextResponse(resultHtml, {
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
