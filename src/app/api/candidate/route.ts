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
  isIrain,
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

const subject = "We have received your referral request - iRefair";
const updatedSubject = "We updated your referral request - iRefair";
const ineligibleSubject = "About your referral request - iRefair";

const subjectFr = "Nous avons bien recu votre demande de recommandation - iRefair";
const updatedSubjectFr = "Nous avons mis a jour votre demande de recommandation - iRefair";
const ineligibleSubjectFr = "A propos de votre demande de recommandation - iRefair";
const confirmUpdateSubject = "Confirm your iRefair profile update";
const confirmUpdateSubjectFr = "Confirmez la mise a jour de votre profil iRefair";

const confirmUpdateHtmlTemplate = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:20px;">
    <tr><td style="padding:6px 0 12px 0;">
      <div style="font-size:20px;font-weight:700;color:#2f5fb3;">iRefair</div>
    </td></tr>
    <tr><td>
      <p style="margin:0 0 10px 0;font-size:15px;color:#1f2a37;">Hi {{firstName}},</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#3b4251;">We received a request to update your iRefair profile. Please confirm the update below:</p>
      <p style="margin:0 0 14px 0;"><a href="{{confirmUrl}}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2f5fb3;color:#fff;text-decoration:none;font-weight:700;">Confirm update</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#5c6675;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>
    </td></tr>
  </table>
</body></html>`;

const confirmUpdateTextTemplate = `Hi {{firstName}},

We received a request to update your iRefair profile.
Confirm update: {{confirmUrl}}

This link expires in 24 hours. If you did not request this, you can ignore this email.

- The iRefair team`;

const confirmUpdateHtmlTemplateFr = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:20px;">
    <tr><td style="padding:6px 0 12px 0;">
      <div style="font-size:20px;font-weight:700;color:#2f5fb3;">iRefair</div>
    </td></tr>
    <tr><td>
      <p style="margin:0 0 10px 0;font-size:15px;color:#1f2a37;">Bonjour {{firstName}},</p>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#3b4251;">Nous avons recu une demande de mise a jour de votre profil iRefair. Merci de la confirmer ici :</p>
      <p style="margin:0 0 14px 0;"><a href="{{confirmUrl}}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2f5fb3;color:#fff;text-decoration:none;font-weight:700;">Confirmer la mise a jour</a></p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#5c6675;">Ce lien expire dans 24 heures. Si ce n'etait pas vous, ignorez ce message.</p>
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

const htmlTemplate = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
    <tr><td style="padding:22px 24px; border-top:4px solid #2f5fb3;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5c6675;margin-top:6px;">Referral request received</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong>{{iRain}}</strong></div>
    </td></tr>
    <tr><td style="padding:22px 24px 10px 24px;">
      <h1 style="margin:0 0 10px 0;font-size:22px;color:#1f2a37;">Hi {{firstName}}, we have your details.</h1>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">Thanks for submitting your referral request to iRefair. We will review your profile and look for referrers whose roles match your experience and preferences.</p>
      {{statusNote}}
      {{candidateKeySection}}
    </td></tr>
    <tr><td style="padding:10px 24px 4px 24px;">
      <div style="border:1px solid #e6e8ee;border-radius:12px;padding:14px 16px;background:#fafbfe;">
        <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">Snapshot</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#1f2a37;">
          <tr><td style="padding:6px 0;width:48%;"><strong>Location</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{location}}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Work authorization</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{authorization}}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Industry focus</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{industry}}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Languages</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{languages}}</td></tr>
        </table>
      </div>
    </td></tr>
    <tr><td style="padding:14px 24px 10px 24px;">
      <div style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">What happens next</div>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#3b4251;">
        <li>We review your profile for clarity and completeness.</li>
        <li>We look for referrers whose teams and roles match what you are targeting.</li>
        <li>When there is a potential match, we will contact you before any intro is made.</li>
      </ol>
    </td></tr>
    <tr><td style="padding:14px 24px 20px 24px;text-align:center;">
      <div style="margin:0 0 8px 0;font-size:14px;color:#3b4251;">See which companies are hiring in Canada right now:</div>
      <div style="margin:0 0 8px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">View live openings</a></div>
      <div style="font-size:13px;color:#68707f;">Quick notes on companies, what they need, and links to apply.</div>
    </td></tr>
  </table>
</body></html>`;

const textTemplate = `Hi {{firstName}},

Thanks for submitting your referral request to iRefair.

{{statusNote}}

{{candidateKeySection}}

iRAIN: {{iRain}}

Snapshot
- Location: {{location}}
- Work authorization: {{authorization}}
- Industry focus: {{industry}}
- Languages: {{languages}}

What happens next
1) We review your profile for clarity and completeness.
2) We look for referrers whose teams and roles match what you are targeting.
3) When there is a potential match, we will contact you before any intro is made.

See companies hiring in Canada right now: ${safeJobOpeningsUrl}

- The iRefair team`;

const ineligibleHtmlTemplate = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
    <tr><td style="padding:22px 24px; border-top:4px solid #2f5fb3;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5c6675;margin-top:6px;">Referral request update</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong>{{iRain}}</strong></div>
    </td></tr>
    <tr><td style="padding:22px 24px 14px 24px;">
      <h1 style="margin:0 0 12px 0;font-size:22px;color:#1f2a37;">Hi {{firstName}}, thank you for your interest in iRefair.</h1>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">We reviewed the details you shared. Because you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now.</p>
      {{statusNote}}
      {{candidateKeySection}}
      <div style="border:1px solid #e6e8ee;border-radius:10px;padding:14px 16px;margin:10px 0 14px 0;color:#2f3b4b;background:#fafbfe;font-size:14px;line-height:1.6;">
        Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it. We appreciate you taking the time to reach out.
      </div>
      <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">If you become eligible later, we would be happy to hear from you again.</p>
      <div style="text-align:center;margin:6px 0 6px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">Explore current openings</a></div>
      <div style="font-size:13px;color:#68707f;text-align:center;">Browse live roles and requirements any time.</div>
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

const htmlTemplateFr = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
    <tr><td style="padding:22px 24px; border-top:4px solid #2f5fb3;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5c6675;margin-top:6px;">Demande de recommandation recue</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN : <strong>{{iRain}}</strong></div>
    </td></tr>
    <tr><td style="padding:22px 24px 10px 24px;">
      <h1 style="margin:0 0 10px 0;font-size:22px;color:#1f2a37;">Bonjour {{firstName}}, nous avons bien recu vos informations.</h1>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">Merci d'avoir soumis votre demande de recommandation a iRefair. Nous examinerons votre profil et rechercherons des referents dont les roles correspondent a votre experience et a vos preferences.</p>
      {{statusNote}}
      {{candidateKeySection}}
    </td></tr>
    <tr><td style="padding:10px 24px 4px 24px;">
      <div style="border:1px solid #e6e8ee;border-radius:12px;padding:14px 16px;background:#fafbfe;">
        <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">Resume express</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#1f2a37;">
          <tr><td style="padding:6px 0;width:48%;"><strong>Localisation</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{location}}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Autorisation de travail</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{authorization}}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Secteur</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{industry}}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Langues</strong></td><td align="right" style="padding:6px 0;color:#3b4251;">{{languages}}</td></tr>
        </table>
      </div>
    </td></tr>
    <tr><td style="padding:14px 24px 10px 24px;">
      <div style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">Prochaines etapes</div>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#3b4251;">
        <li>Nous examinons votre profil pour verifier la clarte et l'exhaustivite.</li>
        <li>Nous cherchons des referents dont les equipes et les roles correspondent a vos objectifs.</li>
        <li>En cas de correspondance potentielle, nous vous contactons avant toute introduction.</li>
      </ol>
    </td></tr>
    <tr><td style="padding:14px 24px 20px 24px;text-align:center;">
      <div style="margin:0 0 8px 0;font-size:14px;color:#3b4251;">Decouvrez les entreprises qui recrutent actuellement au Canada :</div>
      <div style="margin:0 0 8px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">Voir les offres en direct</a></div>
      <div style="font-size:13px;color:#68707f;">Notes rapides sur les entreprises, leurs besoins et des liens pour postuler.</div>
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

const ineligibleHtmlTemplateFr = `<html><body style="font-family:Arial, sans-serif; color:#1f2a37; background:#f6f7fb; padding:20px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e6e8ee;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
    <tr><td style="padding:22px 24px; border-top:4px solid #2f5fb3;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#5c6675;margin-top:6px;">Mise a jour de la demande</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN : <strong>{{iRain}}</strong></div>
    </td></tr>
    <tr><td style="padding:22px 24px 14px 24px;">
      <h1 style="margin:0 0 12px 0;font-size:22px;color:#1f2a37;">Bonjour {{firstName}}, merci pour votre interet pour iRefair.</h1>
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;">Nous avons examine les informations fournies. Comme vous n'etes pas au Canada et ne pouvez pas vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'etes donc pas eligible a notre programme pour l'instant.</p>
      {{statusNote}}
      {{candidateKeySection}}
      <div style="border:1px solid #e6e8ee;border-radius:10px;padding:14px 16px;margin:10px 0 14px 0;color:#2f3b4b;background:#fafbfe;font-size:14px;line-height:1.6;">
        Notre programme soutient actuellement les candidats situes au Canada et disposant d'une autorisation de travail. Si votre situation change, repondez a cet e-mail ou soumettez une nouvelle demande et nous reevaluerons avec plaisir. Merci d'avoir pris le temps de nous ecrire.
      </div>
      <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">Si votre situation evolue, nous serons heureux de revoir votre demande.</p>
      <div style="text-align:center;margin:6px 0 6px 0;"><a href="${safeJobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">Consulter les offres en cours</a></div>
      <div style="font-size:13px;color:#68707f;text-align:center;">Parcourez les roles disponibles et leurs besoins a tout moment.</div>
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

    const existingCandidate = await getCandidateByEmail(email);
    const existingId = existingCandidate?.record.id || "";
    const shouldAssignNewIrain = Boolean(existingCandidate) && !isIrain(existingId);
    const iRain = shouldAssignNewIrain || !existingCandidate ? await generateIRAIN() : existingId;
    const legacyCandidateId = shouldAssignNewIrain
      ? existingCandidate?.record.legacyCandidateId || existingId || undefined
      : undefined;
    const isIneligible = locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no";
    let resumeFileId: string | undefined;
    let resumeFileName: string | undefined;

    if (resumeEntry instanceof File && resumeEntry.size > 0) {
      if (resumeEntry.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { ok: false, error: "Please upload a PDF or DOC/DOCX file under 10MB." },
          { status: 400 },
        );
      }
      const fileBuffer = Buffer.from(await resumeEntry.arrayBuffer());
      const virusScan = await scanBufferForViruses(fileBuffer, resumeEntry.name);
      if (!virusScan.ok) {
        return NextResponse.json(
          { ok: false, error: virusScan.message || "Your file failed virus scanning." },
          { status: 400 },
        );
      }

      const resumeCheck = await ensureResumeLooksLikeCv(fileBuffer, resumeEntry.type, resumeEntry.name);
      if (!resumeCheck.ok) {
        return NextResponse.json(
          { ok: false, error: resumeCheck.message || "Please upload a complete resume (PDF/DOCX)." },
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

    if (existingCandidate) {
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

      const updateResult = await updateRowById(CANDIDATE_SHEET_NAME, "Email", email, {
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

    const html = fillTemplate(
      isIneligible
        ? locale === "fr"
          ? ineligibleHtmlTemplateFr
          : ineligibleHtmlTemplate
        : locale === "fr"
          ? htmlTemplateFr
          : htmlTemplate,
      htmlValues,
    );
    const text = fillTemplate(
      isIneligible
        ? locale === "fr"
          ? ineligibleTextTemplateFr
          : ineligibleTextTemplate
        : locale === "fr"
          ? textTemplateFr
          : textTemplate,
      textValues,
    );
    const emailSubject =
      locale === "fr"
        ? isIneligible
          ? ineligibleSubjectFr
          : upsertResult.wasUpdated
            ? updatedSubjectFr
            : subjectFr
        : isIneligible
          ? ineligibleSubject
          : upsertResult.wasUpdated
            ? updatedSubject
            : subject;

    await sendMail({
      to: email,
      subject: emailSubject,
      html,
      text,
    });

    return NextResponse.json({ ok: true, updated: upsertResult.wasUpdated, iRain: finalIRain });
  } catch (error) {
    console.error("Candidate email API error", error);
    return NextResponse.json({ ok: false, error: "Failed to send email" }, { status: 500 });
  }
}
