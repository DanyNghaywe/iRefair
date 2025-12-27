import { NextResponse } from "next/server";
import { ensureResumeLooksLikeCv, scanBufferForViruses } from "@/lib/fileScan";
import { uploadFileToDrive } from "@/lib/drive";
import { sendMail } from "@/lib/mailer";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rateLimit";
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

const subject = "We have received your referral request - iRefair";
const updatedSubject = "We updated your referral request - iRefair";
const ineligibleSubject = "About your referral request - iRefair";

const subjectFr = "Nous avons bien recu votre demande de recommandation - iRefair";
const updatedSubjectFr = "Nous avons mis a jour votre demande de recommandation - iRefair";
const ineligibleSubjectFr = "A propos de votre demande de recommandation - iRefair";
const confirmUpdateSubject = "Confirm your iRefair profile update";
const confirmUpdateSubjectFr = "Confirmez la mise a jour de votre profil iRefair";

const confirmUpdateHtmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm your update</title></head>
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
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">We received a request to update your iRefair profile. Please confirm the update below:</p>
          <p style="margin:0 0 20px 0;"><a href="{{confirmUrl}}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Confirm update</a></p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by iRefair · Connecting talent with opportunity</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const confirmUpdateTextTemplate = `Hi {{firstName}},

We received a request to update your iRefair profile.
Confirm update: {{confirmUrl}}

This link expires in 24 hours. If you did not request this, you can ignore this email.

- The iRefair team`;

const confirmUpdateHtmlTemplateFr = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmez votre mise a jour</title></head>
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
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Nous avons recu une demande de mise a jour de votre profil iRefair. Merci de la confirmer ici :</p>
          <p style="margin:0 0 20px 0;"><a href="{{confirmUrl}}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Confirmer la mise a jour</a></p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Ce lien expire dans 24 heures. Si ce n'etait pas vous, ignorez ce message.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Envoye par iRefair · Connecter les talents aux opportunites</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const confirmUpdateTextTemplateFr = `Bonjour {{firstName}},

Nous avons recu une demande de mise a jour de votre profil iRefair.
Confirmer la mise a jour : {{confirmUrl}}

Ce lien expire dans 24 heures. Si ce n'etait pas vous, ignorez ce message.

- L'equipe iRefair`;

export const runtime = "nodejs";

const safeJobOpeningsUrl = normalizeHttpUrl(jobOpeningsUrl) || "https://irefair.com/hiring-companies";
const UPDATE_TOKEN_TTL_SECONDS = 60 * 60 * 24;

const baseFromEnv =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL;
const appBaseUrl =
  baseFromEnv && baseFromEnv.startsWith("http") ? baseFromEnv : baseFromEnv ? `https://${baseFromEnv}` : "https://irefair.com";

const htmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Referral request received</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <!-- Header with yellow highlight -->
        <tr><td style="padding:0 0 24px 0;border-bottom:4px solid #fbbf24;">
          <span style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;background:linear-gradient(to bottom, transparent 50%, #fef08a 50%);padding:0 4px;">iRefair</span>
        </td></tr>
        <!-- Eyebrow and iRAIN -->
        <tr><td style="padding:24px 0 0 0;">
          <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">REFERRAL REQUEST RECEIVED</p>
          <p style="margin:0 0 24px 0;font-size:14px;color:#0f172a;">iRAIN: <strong style="color:#0f172a;">{{iRain}}</strong></p>
        </td></tr>
        <!-- Main content card -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;">Hi {{firstName}}, thank you for registering.</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">We've received your referral request. We'll review your profile and reach out when we have a referrer who matches the teams and roles you're targeting.</p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Thank you for contributing to the community and helping others find work in Canada. You can reply to this email anytime to adjust your availability or update how you want to help.</p>
          {{statusNote}}
          {{candidateKeySection}}
          <!-- What happens next -->
          <div style="margin:24px 0 0 0;">
            <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">WHAT HAPPENS NEXT</p>
            <ol style="margin:0 0 24px 0;padding-left:20px;font-size:14px;line-height:1.8;color:#0f172a;">
              <li style="padding:4px 0;">We review your details and iRAIN to understand where you can help.</li>
              <li style="padding:4px 0;">We keep you on our radar for teams, industries, and regions that match your snapshot.</li>
              <li style="padding:4px 0;">When there is a fit, we'll reach out before sharing any candidate details.</li>
            </ol>
          </div>
          <!-- Snapshot section -->
          <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;background:#ffffff;">
            <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">SNAPSHOT YOU SHARED</p>
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Location</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{location}}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Work Authorization</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{authorization}}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Industry</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{industry}}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Languages</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{languages}}</td>
              </tr>
            </table>
          </div>
          <!-- CTA -->
          <div style="text-align:center;padding:24px 0 0 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Want to see companies hiring in Canada right now?</p>
            <p style="margin:0 0 16px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">View live openings</a></p>
            <p style="margin:0;"><a href="mailto:info@andbeyondca.com" style="font-size:13px;color:#3d8bfd;text-decoration:none;">Reply to update your availability/details</a></p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0 0;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">You're receiving this because you registered as a candidate on <a href="https://irefair.andbeyondca.com" style="color:#3d8bfd;text-decoration:none;">iRefair</a>.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">If this wasn't you, you can safely ignore this message.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const textTemplate = `Hi {{firstName}},

Thank you for registering with iRefair!

Your iRAIN is: {{iRain}}

{{candidateKeySection}}

SNAPSHOT YOU SHARED
- Location: {{location}}
- Work Authorization: {{authorization}}
- Industry: {{industry}}
- Languages: {{languages}}

WHAT HAPPENS NEXT
1. We review your details and iRAIN to understand where you can help.
2. We keep you on our radar for teams, industries, and regions that match your snapshot.
3. When there is a fit, we'll reach out before sharing any candidate details.

Ready to apply? View live openings: ${safeJobOpeningsUrl}

- The iRefair team`;

const ineligibleHtmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Referral request update</title></head>
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
          <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600;">Referral request update</p>
          <p style="margin:0 0 20px 0;font-size:13px;color:#0f172a;">iRAIN: <strong>{{iRain}}</strong></p>
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;">Hi {{firstName}}, thank you for your interest in iRefair.</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">We reviewed the details you shared. Because you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now.</p>
          {{statusNote}}
          {{candidateKeySection}}
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;background:#ffffff;font-size:14px;line-height:1.6;color:#64748b;">
            Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it. We appreciate you taking the time to reach out.
          </div>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">If you become eligible later, we would be happy to hear from you again.</p>
          <!-- CTA -->
          <div style="text-align:center;padding:16px 0 0 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 12px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Explore current openings</a></p>
            <p style="margin:0;font-size:13px;color:#94a3b8;">Browse live roles and requirements any time.</p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by iRefair · Connecting talent with opportunity</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const ineligibleTextTemplate = `Hi {{firstName}},

Thanks for your interest in iRefair.

We reviewed the details you shared. Because you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now.

{{statusNote}}

{{candidateKeySection}}

iRAIN: {{iRain}}

If you become eligible later, we would be happy to hear from you again.

You can also browse current openings and requirements: ${safeJobOpeningsUrl}

- The iRefair team`;

const htmlTemplateFr = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demande de recommandation recue</title></head>
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
          <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600;">Demande de recommandation recue</p>
          <p style="margin:0 0 20px 0;font-size:13px;color:#0f172a;">iRAIN : <strong>{{iRain}}</strong></p>
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;">Bonjour {{firstName}}, nous avons bien recu vos informations.</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Merci d'avoir soumis votre demande de recommandation a iRefair. Nous examinerons votre profil et rechercherons des referents dont les roles correspondent a votre experience et a vos preferences.</p>
          {{statusNote}}
          {{candidateKeySection}}
          <!-- Snapshot -->
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;background:#ffffff;">
            <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600;">Resume express</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#0f172a;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Localisation</strong></td><td align="right" style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">{{location}}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Autorisation de travail</strong></td><td align="right" style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">{{authorization}}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Secteur</strong></td><td align="right" style="padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b;">{{industry}}</td></tr>
              <tr><td style="padding:8px 0;"><strong>Langues</strong></td><td align="right" style="padding:8px 0;color:#64748b;">{{languages}}</td></tr>
            </table>
          </div>
          <!-- What happens next -->
          <div style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600;">Prochaines etapes</div>
          <ol style="margin:0 0 24px 0;padding-left:18px;font-size:14px;line-height:1.7;color:#64748b;">
            <li>Nous examinons votre profil pour verifier la clarte et l'exhaustivite.</li>
            <li>Nous cherchons des referents dont les equipes et les roles correspondent a vos objectifs.</li>
            <li>En cas de correspondance potentielle, nous vous contactons avant toute introduction.</li>
          </ol>
          <!-- CTA -->
          <div style="text-align:center;padding:16px 0 0 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#64748b;">Decouvrez les entreprises qui recrutent actuellement au Canada :</p>
            <p style="margin:0 0 12px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Voir les offres en direct</a></p>
            <p style="margin:0;font-size:13px;color:#94a3b8;">Notes rapides sur les entreprises, leurs besoins et des liens pour postuler.</p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Envoye par iRefair · Connecter les talents aux opportunites</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const textTemplateFr = `Bonjour {{firstName}},

Merci d'avoir soumis votre demande de recommandation a iRefair.

{{statusNote}}

{{candidateKeySection}}

Votre iRAIN : {{iRain}}

Resume partage
- Localisation : {{location}}
- Autorisation de travail : {{authorization}}
- Secteur : {{industry}}
- Langues : {{languages}}

Prochaines etapes
1) Nous verifions que votre profil est clair et complet.
2) Nous cherchons des referents dont les equipes et les roles correspondent a vos objectifs.
3) Lorsqu'il y a une correspondance potentielle, nous vous contactons avant toute introduction.

Decouvrez les entreprises qui recrutent actuellement au Canada : ${safeJobOpeningsUrl}

- L'equipe iRefair`;

const ineligibleHtmlTemplateFr = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mise a jour de la demande</title></head>
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
          <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-weight:600;">Mise a jour de la demande</p>
          <p style="margin:0 0 20px 0;font-size:13px;color:#0f172a;">iRAIN : <strong>{{iRain}}</strong></p>
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#0f172a;">Bonjour {{firstName}}, merci pour votre interet pour iRefair.</h1>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Nous avons examine les informations fournies. Comme vous n'etes pas au Canada et ne pouvez pas vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'etes donc pas eligible a notre programme pour l'instant.</p>
          {{statusNote}}
          {{candidateKeySection}}
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;background:#ffffff;font-size:14px;line-height:1.6;color:#64748b;">
            Notre programme soutient actuellement les candidats situes au Canada et disposant d'une autorisation de travail. Si votre situation change, repondez a cet e-mail ou soumettez une nouvelle demande et nous reevaluerons avec plaisir. Merci d'avoir pris le temps de nous ecrire.
          </div>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Si votre situation evolue, nous serons heureux de revoir votre demande.</p>
          <!-- CTA -->
          <div style="text-align:center;padding:16px 0 0 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 12px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Consulter les offres en cours</a></p>
            <p style="margin:0;font-size:13px;color:#94a3b8;">Parcourez les roles disponibles et leurs besoins a tout moment.</p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Envoye par iRefair · Connecter les talents aux opportunites</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const ineligibleTextTemplateFr = `Bonjour {{firstName}},

Merci pour votre interet pour iRefair.

Nous avons examine les informations fournies. Comme vous avez indique ne pas etre au Canada et ne pas pouvoir vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'etes donc pas eligible a notre programme pour l'instant.

{{statusNote}}

{{candidateKeySection}}

Votre iRAIN : {{iRain}}

Si votre situation evolue, nous serons heureux de revoir votre demande.

Vous pouvez aussi consulter les roles ouverts : ${safeJobOpeningsUrl}

- L'equipe iRefair`;

// Templates for existing candidates (already have an iRAIN)
const existingCandidateSubject = "You already have an iRAIN (profile updated) - iRefair";
const existingCandidateSubjectFr = "Vous avez deja un iRAIN (profil mis a jour) - iRefair";

const existingCandidateHtmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profile updated</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <!-- Header with yellow highlight -->
        <tr><td style="padding:0 0 24px 0;border-bottom:4px solid #fbbf24;">
          <span style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;background:linear-gradient(to bottom, transparent 50%, #fef08a 50%);padding:0 4px;">iRefair</span>
        </td></tr>
        <!-- Eyebrow and iRAIN -->
        <tr><td style="padding:24px 0 0 0;">
          <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">PROFILE UPDATED</p>
          <p style="margin:0 0 24px 0;font-size:14px;color:#0f172a;">iRAIN: <strong style="color:#0f172a;">{{iRain}}</strong></p>
        </td></tr>
        <!-- Main content card -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;">Hi {{firstName}}, you already have an iRAIN.</h1>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#64748b;">Good news — you're already registered with iRefair! Your iRAIN is:</p>
          <div style="background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:16px;margin:0 0 20px 0;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:0.02em;">{{iRain}}</p>
          </div>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">We've updated your profile with the latest information you shared. You can use this iRAIN along with your Candidate Key to apply to companies on iRefair.</p>
          {{candidateKeySection}}
          <!-- What happens next -->
          <div style="margin:24px 0 0 0;">
            <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">WHAT HAPPENS NEXT</p>
            <ol style="margin:0 0 24px 0;padding-left:20px;font-size:14px;line-height:1.8;color:#0f172a;">
              <li style="padding:4px 0;">We review your updated details to understand where you can help.</li>
              <li style="padding:4px 0;">We keep you on our radar for teams, industries, and regions that match your snapshot.</li>
              <li style="padding:4px 0;">When there is a fit, we'll reach out before sharing any candidate details.</li>
            </ol>
          </div>
          <!-- Snapshot section -->
          <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;background:#ffffff;">
            <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">YOUR UPDATED SNAPSHOT</p>
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Location</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{location}}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Work Authorization</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{authorization}}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Industry</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{industry}}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Languages</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{languages}}</td>
              </tr>
            </table>
          </div>
          <!-- CTA -->
          <div style="text-align:center;padding:24px 0 0 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Ready to apply to companies?</p>
            <p style="margin:0 0 16px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">View live openings</a></p>
            <p style="margin:0;"><a href="mailto:info@andbeyondca.com" style="font-size:13px;color:#3d8bfd;text-decoration:none;">Reply to update your availability/details</a></p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0 0;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">You're receiving this because you updated your profile on <a href="https://irefair.andbeyondca.com" style="color:#3d8bfd;text-decoration:none;">iRefair</a>.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">If this wasn't you, please contact us immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const existingCandidateTextTemplate = `Hi {{firstName}},

Good news — you're already registered with iRefair!

Your iRAIN is: {{iRain}}

We've updated your profile with the latest information you shared. You can use this iRAIN along with your Candidate Key to apply to companies on iRefair.

{{candidateKeySection}}

YOUR UPDATED SNAPSHOT
- Location: {{location}}
- Work Authorization: {{authorization}}
- Industry: {{industry}}
- Languages: {{languages}}

WHAT HAPPENS NEXT
1. We review your updated details to understand where you can help.
2. We keep you on our radar for teams, industries, and regions that match your snapshot.
3. When there is a fit, we'll reach out before sharing any candidate details.

Ready to apply? View live openings: ${safeJobOpeningsUrl}

- The iRefair team`;

const existingCandidateHtmlTemplateFr = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profil mis a jour</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <!-- Header with yellow highlight -->
        <tr><td style="padding:0 0 24px 0;border-bottom:4px solid #fbbf24;">
          <span style="font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;background:linear-gradient(to bottom, transparent 50%, #fef08a 50%);padding:0 4px;">iRefair</span>
        </td></tr>
        <!-- Eyebrow and iRAIN -->
        <tr><td style="padding:24px 0 0 0;">
          <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">PROFIL MIS A JOUR</p>
          <p style="margin:0 0 24px 0;font-size:14px;color:#0f172a;">iRAIN : <strong style="color:#0f172a;">{{iRain}}</strong></p>
        </td></tr>
        <!-- Main content card -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;">Bonjour {{firstName}}, vous avez deja un iRAIN.</h1>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#64748b;">Bonne nouvelle — vous etes deja inscrit sur iRefair ! Votre iRAIN est :</p>
          <div style="background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:16px;margin:0 0 20px 0;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:0.02em;">{{iRain}}</p>
          </div>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#64748b;">Nous avons mis a jour votre profil avec les dernieres informations partagees. Vous pouvez utiliser cet iRAIN avec votre Cle Candidat pour postuler aux entreprises sur iRefair.</p>
          {{candidateKeySection}}
          <!-- What happens next -->
          <div style="margin:24px 0 0 0;">
            <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">PROCHAINES ETAPES</p>
            <ol style="margin:0 0 24px 0;padding-left:20px;font-size:14px;line-height:1.8;color:#0f172a;">
              <li style="padding:4px 0;">Nous examinons vos informations mises a jour pour mieux vous accompagner.</li>
              <li style="padding:4px 0;">Nous vous gardons dans notre radar pour les equipes et regions correspondantes.</li>
              <li style="padding:4px 0;">Lorsqu'il y a une correspondance, nous vous contactons avant tout partage.</li>
            </ol>
          </div>
          <!-- Snapshot section -->
          <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;background:#ffffff;">
            <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">VOTRE PROFIL MIS A JOUR</p>
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Localisation</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{location}}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Autorisation de travail</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{authorization}}</td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Secteur</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{industry}}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#0f172a;font-weight:600;">Langues</td>
                <td style="padding:12px 16px;color:#64748b;text-align:right;">{{languages}}</td>
              </tr>
            </table>
          </div>
          <!-- CTA -->
          <div style="text-align:center;padding:24px 0 0 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 16px 0;font-size:14px;color:#64748b;">Pret a postuler ?</p>
            <p style="margin:0 0 16px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:14px 28px;border-radius:10px;background:#3d8bfd;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Voir les offres en direct</a></p>
            <p style="margin:0;"><a href="mailto:info@andbeyondca.com" style="font-size:13px;color:#3d8bfd;text-decoration:none;">Repondez pour mettre a jour vos disponibilites</a></p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0 0;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:12px;color:#64748b;">Vous recevez ceci car vous avez mis a jour votre profil sur <a href="https://irefair.andbeyondca.com" style="color:#3d8bfd;text-decoration:none;">iRefair</a>.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">Si ce n'etait pas vous, veuillez nous contacter immediatement.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const existingCandidateTextTemplateFr = `Bonjour {{firstName}},

Bonne nouvelle — vous etes deja inscrit sur iRefair !

Votre iRAIN est : {{iRain}}

Nous avons mis a jour votre profil avec les dernieres informations partagees. Vous pouvez utiliser cet iRAIN avec votre Cle Candidat pour postuler aux entreprises sur iRefair.

{{candidateKeySection}}

VOTRE PROFIL MIS A JOUR
- Localisation : {{location}}
- Autorisation de travail : {{authorization}}
- Secteur : {{industry}}
- Langues : {{languages}}

PROCHAINES ETAPES
1. Nous examinons vos informations mises a jour pour mieux vous accompagner.
2. Nous vous gardons dans notre radar pour les equipes et regions correspondantes.
3. Lorsqu'il y a une correspondance, nous vous contactons avant tout partage.

Pret a postuler ? Voir les offres en direct : ${safeJobOpeningsUrl}

- L'equipe iRefair`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? "");
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
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
        email,
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
      const confirmTemplate = locale === "fr" ? confirmUpdateHtmlTemplateFr : confirmUpdateHtmlTemplate;
      const confirmTextTemplate = locale === "fr" ? confirmUpdateTextTemplateFr : confirmUpdateTextTemplate;
      const confirmHtml = fillTemplate(confirmTemplate, {
        firstName: escapeHtml(firstName),
        confirmUrl: escapeHtml(confirmUrl.toString()),
      });
      const confirmText = fillTemplate(confirmTextTemplate, {
        firstName,
        confirmUrl: confirmUrl.toString(),
      });
      const confirmSubject = locale === "fr" ? confirmUpdateSubjectFr : confirmUpdateSubject;

      await sendMail({
        to: email,
        subject: confirmSubject,
        html: confirmHtml,
        text: confirmText,
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
    const safeFinalIRain = escapeHtml(finalIRain);
    const shouldIncludeStatusNote = upsertResult.wasUpdated && !isIneligible;
    const statusNoteHtml = shouldIncludeStatusNote
      ? locale === "fr"
        ? `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#2f4760;background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:10px 12px;">Nous avons mis a jour votre demande avec les dernieres informations fournies. Votre iRAIN reste <strong style="color:#0f2d46;">${safeFinalIRain}</strong>.</p>`
        : `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#2f4760;background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:10px 12px;">We updated your referral request with the latest details you shared. Your iRAIN remains <strong style="color:#0f2d46;">${safeFinalIRain}</strong>.</p>`
      : "";
    const statusNoteText = shouldIncludeStatusNote
      ? locale === "fr"
        ? "Nous avons mis a jour votre demande avec les dernieres informations fournies."
        : "We updated your referral request with the latest details you shared."
      : "";

    const candidateKeySectionHtml = buildCandidateKeySectionHtml(candidateSecret);
    const candidateKeySectionText = buildCandidateKeySectionText(candidateSecret);
    const values = {
      iRain: finalIRain,
      firstName,
      location: locationSnapshot,
      authorization: authorizationSnapshot,
      industry: industrySnapshot,
      languages: languagesSnapshot,
      candidateKeySection: candidateKeySectionText,
    };

    const htmlValues = {
      iRain: escapeHtml(finalIRain),
      firstName: escapeHtml(firstName),
      location: escapeHtml(locationSnapshot),
      authorization: escapeHtml(authorizationSnapshot),
      industry: escapeHtml(industrySnapshot),
      languages: escapeHtml(languagesSnapshot),
      statusNote: statusNoteHtml,
      candidateKeySection: candidateKeySectionHtml,
    };
    const textValues = { ...values, statusNote: statusNoteText, candidateKeySection: candidateKeySectionText };

    // Override wasUpdated based on our 2-of-3 detection
    // This is true if we found an existing candidate with matching email (not requiring confirmation)
    const wasUpdated = isExistingCandidate && emailMatchesExisting;

    // Determine which template to use
    let htmlTemplateToUse: string;
    let textTemplateToUse: string;
    let emailSubject: string;

    if (isIneligible) {
      htmlTemplateToUse = locale === "fr" ? ineligibleHtmlTemplateFr : ineligibleHtmlTemplate;
      textTemplateToUse = locale === "fr" ? ineligibleTextTemplateFr : ineligibleTextTemplate;
      emailSubject = locale === "fr" ? ineligibleSubjectFr : ineligibleSubject;
    } else if (wasUpdated) {
      // Existing candidate - use the "you already have an iRAIN" template
      htmlTemplateToUse = locale === "fr" ? existingCandidateHtmlTemplateFr : existingCandidateHtmlTemplate;
      textTemplateToUse = locale === "fr" ? existingCandidateTextTemplateFr : existingCandidateTextTemplate;
      emailSubject = locale === "fr" ? existingCandidateSubjectFr : existingCandidateSubject;
    } else {
      // New candidate
      htmlTemplateToUse = locale === "fr" ? htmlTemplateFr : htmlTemplate;
      textTemplateToUse = locale === "fr" ? textTemplateFr : textTemplate;
      emailSubject = locale === "fr" ? subjectFr : subject;
    }

    const html = fillTemplate(htmlTemplateToUse, htmlValues);
    const text = fillTemplate(textTemplateToUse, textValues);

    await sendMail({
      to: email,
      subject: emailSubject,
      html,
      text,
    });

    return NextResponse.json({ ok: true, updated: wasUpdated, iRain: finalIRain });
  } catch (error) {
    console.error("Candidate email API error", error);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}
