import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { sendMail } from "@/lib/mailer";
import {
  APPLICANT_SECRET_HASH_HEADER,
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
  APPLICANT_UPDATE_TOKEN_HASH_HEADER,
  APPLICANT_REGISTRATION_STATUS_HEADER,
  APPLICANT_REMINDER_TOKEN_HASH_HEADER,
  APPLICANT_REMINDER_SENT_AT_HEADER,
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
import { applicantRegistrationConfirmation, applicantIneligibleNotification } from "@/lib/emailTemplates";

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
    <p class="footer">{{needHelp}} <a href="mailto:irefair@andbeyondca.com">{{contactSupport}}</a></p>
  </div>
</body>
</html>`;

export const runtime = "nodejs";

type Locale = "en" | "fr";
type ConfirmRegistrationVariant =
  | "confirmed"
  | "confirmed_ineligible"
  | "already_confirmed"
  | "already_confirmed_ineligible";

const supportEmail = "irefair@andbeyondca.com";

const errorPageTranslations: Record<Locale, { pageTitle: string; heading: string; description: string; needHelp: string; contactSupport: string }> = {
  en: {
    pageTitle: "Registration Failed",
    heading: "Registration Failed",
    description: "We couldn't complete your registration.",
    needHelp: "Need help?",
    contactSupport: "Contact support",
  },
  fr: {
    pageTitle: "Échec de l'inscription",
    heading: "Échec de l'inscription",
    description: "Nous n'avons pas pu compléter votre inscription.",
    needHelp: "Besoin d'aide?",
    contactSupport: "Contacter le support",
  },
};

const resultTranslations: Record<ConfirmRegistrationVariant, Record<Locale, { pageTitle: string; heading: string; description: string; footer: string }>> = {
  already_confirmed_ineligible: {
    en: {
      pageTitle: "Already Confirmed",
      heading: "Account Already Confirmed",
      description:
        "This account was already confirmed previously. Your iRefair profile is already created, but based on your information, we're unable to match you with referrers at this time.",
      footer: "Please check the confirmation email you already received for your account details.",
    },
    fr: {
      pageTitle: "Déjà confirmé",
      heading: "Compte déjà confirmé",
      description:
        "Ce compte a déjà été confirmé auparavant. Votre profil iRefair est déjà créé, mais en fonction des informations que vous avez fournies, nous ne sommes pas en mesure de vous jumeler avec des recommandateurs pour le moment.",
      footer: "Veuillez consulter le courriel de confirmation que vous avez déjà reçu pour les détails de votre compte.",
    },
  },
  already_confirmed: {
    en: {
      pageTitle: "Already Confirmed",
      heading: "Account Already Confirmed",
      description: "This account was already confirmed previously. Your iRefair profile is already active.",
      footer: "Please use the iRAIN and Applicant Key from your confirmation email to access your account.",
    },
    fr: {
      pageTitle: "Déjà confirmé",
      heading: "Compte déjà confirmé",
      description: "Ce compte a déjà été confirmé auparavant. Votre profil iRefair est déjà actif.",
      footer: "Veuillez utiliser le iRAIN et la clé candidat de votre courriel de confirmation pour accéder à votre compte.",
    },
  },
  confirmed_ineligible: {
    en: {
      pageTitle: "Profile Created",
      heading: "Profile Created",
      description:
        "Your iRefair profile has been created. However, based on the information you provided, we're unable to match you with referrers at this time.",
      footer: "Check your email for more details about your eligibility status.",
    },
    fr: {
      pageTitle: "Profil créé",
      heading: "Profil créé",
      description:
        "Votre profil iRefair a été créé. Cependant, en fonction des informations que vous avez fournies, nous ne sommes pas en mesure de vous jumeler avec des recommandateurs pour le moment.",
      footer: "Consultez votre courriel pour plus de détails sur votre statut d'éligibilité.",
    },
  },
  confirmed: {
    en: {
      pageTitle: "Registration Confirmed",
      heading: "Registration Confirmed!",
      description: "Your iRefair profile has been successfully activated. You can now apply for referral opportunities.",
      footer: "You'll receive a confirmation email shortly with your credentials.",
    },
    fr: {
      pageTitle: "Inscription confirmée",
      heading: "Inscription confirmée!",
      description: "Votre profil iRefair a été activé avec succès. Vous pouvez maintenant postuler pour des opportunités de recommandation.",
      footer: "Vous recevrez bientôt un courriel de confirmation avec vos identifiants.",
    },
  },
};

function getLocaleFromToken(token: string): Locale {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      return payload.locale === 'fr' ? 'fr' : 'en';
    }
  } catch {}
  return 'en';
}

function isMobileRequest(request: NextRequest) {
  const mode = (request.nextUrl.searchParams.get("mode") || "").trim().toLowerCase();
  const client = (request.headers.get("x-irefair-client") || "").trim().toLowerCase();
  return mode === "mobile" || client === "ios" || client === "ios-app";
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function errorResponse(
  message: string,
  status: number,
  isGetRequest: boolean,
  locale: Locale = "en",
  mobileMode = false,
) {
  if (mobileMode) {
    const t = errorPageTranslations[locale];
    const plainMessage = stripHtmlTags(message);
    return NextResponse.json(
      {
        ok: false,
        variant: "error",
        locale,
        pageTitle: t.pageTitle,
        heading: t.heading,
        description: t.description,
        errorMessage: plainMessage,
        supportPrompt: t.needHelp,
        supportLabel: t.contactSupport,
        supportEmail,
        error: plainMessage,
      },
      { status },
    );
  }

  if (isGetRequest) {
    const t = errorPageTranslations[locale];
    const html = errorPageHtml
      .replace('{{lang}}', locale)
      .replace('{{pageTitle}}', t.pageTitle)
      .replace('{{heading}}', t.heading)
      .replace('{{description}}', t.description)
      .replace('{{needHelp}}', t.needHelp)
      .replace('{{contactSupport}}', t.contactSupport)
      .replace('{{errorMessage}}', message);
    return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return NextResponse.json({ ok: false, error: message }, { status });
}

function resultResponse({
  variant,
  locale,
  iRainValue,
  isGetRequest,
  mobileMode,
  mobilePayload,
  postPayload,
}: {
  variant: ConfirmRegistrationVariant;
  locale: Locale;
  iRainValue: string;
  isGetRequest: boolean;
  mobileMode: boolean;
  mobilePayload?: Record<string, unknown>;
  postPayload?: Record<string, unknown>;
}) {
  const t = resultTranslations[variant][locale];

  if (mobileMode) {
    return NextResponse.json({
      ok: true,
      variant,
      locale,
      pageTitle: t.pageTitle,
      heading: t.heading,
      description: t.description,
      footer: t.footer,
      iRain: iRainValue,
      ...(mobilePayload || {}),
    });
  }

  if (isGetRequest) {
    const pageHtml = variant.includes("ineligible") ? ineligiblePageHtml : successPageHtml;
    const resultHtml = pageHtml
      .replace("{{lang}}", locale)
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

  return NextResponse.json({ ok: true, ...(postPayload || {}) });
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
  const mobileMode = isMobileRequest(request);
  const token = await readToken(request);
  if (!token) {
    // No token means we can't determine locale, default to English
    const msg = "Missing confirmation token. Please use the link from your email.";
    return errorResponse(msg, 400, isGetRequest, "en", mobileMode);
  }

  const locale = getLocaleFromToken(token);

  let payload;
  try {
    payload = verifyApplicantUpdateToken(token);
  } catch {
    const msg = locale === 'fr'
      ? 'Ce lien de confirmation est invalide ou a expiré. Veuillez vous inscrire à nouveau <a href="/applicant" style="text-decoration:underline;">ici</a>.'
      : 'This confirmation link is invalid or has expired. Please register again <a href="/applicant" style="text-decoration:underline;">here</a>.';
    return errorResponse(msg, 401, isGetRequest, locale, mobileMode);
  }

  const tokenHash = hashToken(token);

  // Look up applicant by email
  const applicant = await getApplicantByEmail(payload.email);
  if (!applicant) {
    const msg = locale === 'fr'
      ? 'Nous n\'avons pas trouvé votre inscription. Veuillez vous inscrire à nouveau <a href="/applicant" style="text-decoration:underline;">ici</a>.'
      : 'We couldn\'t find your registration. Please register again <a href="/applicant" style="text-decoration:underline;">here</a>.';
    return errorResponse(msg, 404, isGetRequest, locale, mobileMode);
  }

  // Check if already confirmed before validating stored token hashes.
  // Tokens are cleared after first confirmation, so repeat clicks should
  // render an "already confirmed" state instead of "invalid link".
  const registrationStatus = applicant.record.registrationStatus?.trim() || "";
  if (registrationStatus !== "Pending Confirmation") {
    // Already confirmed - show appropriate page based on eligibility
    const iRainValue = applicant.record.id || "";
    const locatedCanada = applicant.record.locatedCanada || "";
    const authorizedCanada = applicant.record.authorizedCanada || "";
    const eligibleMoveCanada = applicant.record.eligibleMoveCanada || "";
    const wasIneligible =
      (locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no") ||
      (locatedCanada.toLowerCase() === "yes" && authorizedCanada.toLowerCase() === "no");
    const variant: ConfirmRegistrationVariant = wasIneligible ? "already_confirmed_ineligible" : "already_confirmed";

    return resultResponse({
      variant,
      locale,
      iRainValue,
      isGetRequest,
      mobileMode,
      mobilePayload: { alreadyConfirmed: true, ineligible: wasIneligible },
      postPayload: { alreadyConfirmed: true },
    });
  }

  const storedTokenHash = applicant.record.updateTokenHash?.trim() || "";
  const storedReminderTokenHash = applicant.record.reminderTokenHash?.trim() || "";

  // Verify token hash matches EITHER the original token OR the reminder token
  const matchesOriginal = safeCompareHash(storedTokenHash, tokenHash);
  const matchesReminder = safeCompareHash(storedReminderTokenHash, tokenHash);

  if (!matchesOriginal && !matchesReminder) {
    const msg = locale === 'fr'
      ? 'Ce lien de confirmation n\'est plus valide. Veuillez vous inscrire à nouveau <a href="/applicant" style="text-decoration:underline;">ici</a>.'
      : 'This confirmation link is no longer valid. Please register again <a href="/applicant" style="text-decoration:underline;">here</a>.';
    return errorResponse(msg, 403, isGetRequest, locale, mobileMode);
  }

  // Check token expiry
  const storedExpiry = parseExpiry(applicant.record.updateTokenExpiresAt);
  if (!storedExpiry || storedExpiry < Date.now()) {
    // Delete the expired pending registration
    if (applicant.record.id) {
      await deleteApplicantByIrain(applicant.record.id);
    }
    const msg = locale === 'fr'
      ? 'Ce lien de confirmation a expiré. Veuillez vous inscrire à nouveau <a href="/applicant" style="text-decoration:underline;">ici</a>.'
      : 'This confirmation link has expired. Please register again <a href="/applicant" style="text-decoration:underline;">here</a>.';
    return errorResponse(msg, 403, isGetRequest, locale, mobileMode);
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
    APPLICANT_REMINDER_TOKEN_HASH_HEADER,
    APPLICANT_REMINDER_SENT_AT_HEADER,
  ];
  await ensureColumns(APPLICANT_SHEET_NAME, requiredColumns);

  // Update applicant: clear both tokens, set secret, clear registration status and reminder fields
  const updates: Record<string, string> = {
    [APPLICANT_SECRET_HASH_HEADER]: applicantSecretHash,
    [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: "",
    [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: "",
    [APPLICANT_REGISTRATION_STATUS_HEADER]: "",
    [APPLICANT_REMINDER_TOKEN_HASH_HEADER]: "",
    [APPLICANT_REMINDER_SENT_AT_HEADER]: "",
  };

  const updateResult = await updateRowById(APPLICANT_SHEET_NAME, "Email", payload.email, updates);
  if (!updateResult.updated) {
    const msg = locale === 'fr'
      ? "Nous n'avons pas pu compléter votre inscription. Veuillez réessayer ou contacter le support."
      : "We couldn't complete your registration. Please try again or contact support.";
    return errorResponse(msg, 500, isGetRequest, locale, mobileMode);
  }

  const iRainValue = applicant.record.id || "";
  const firstName = applicant.record.firstName || "there";

  // Build profile snapshot for confirmation email
  const notProvided = locale === 'fr' ? "Non fourni" : "Not provided";
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
        const label = locale === 'fr' ? "Admissible à déménager/travailler dans 6 mois" : "Eligible to move/work in 6 months";
        return `${label}: ${eligibleMoveCanada}`;
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

  // Check eligibility based on stored applicant data
  const locatedCanada = applicant.record.locatedCanada || "";
  const authorizedCanada = applicant.record.authorizedCanada || "";
  const eligibleMoveCanada = applicant.record.eligibleMoveCanada || "";

  const isIneligible =
    (locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no") ||
    (locatedCanada.toLowerCase() === "yes" && authorizedCanada.toLowerCase() === "no");

  // Send appropriate email based on eligibility
  const emailTemplate = isIneligible
    ? applicantIneligibleNotification({
        firstName,
        iRain: iRainValue,
        applicantKey: applicantSecret,
        locale,
      })
    : applicantRegistrationConfirmation({
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

  return resultResponse({
    variant: isIneligible ? "confirmed_ineligible" : "confirmed",
    locale,
    iRainValue,
    isGetRequest,
    mobileMode,
    mobilePayload: { alreadyConfirmed: false, ineligible: isIneligible },
  });
}

export async function GET(request: NextRequest) {
  return handleConfirm(request, true);
}

export async function POST(request: NextRequest) {
  return handleConfirm(request, false);
}
