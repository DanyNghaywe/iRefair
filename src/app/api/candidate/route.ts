import { NextResponse } from "next/server";
import { sendMail } from "@/lib/mailer";
import { generateIRAIN, upsertCandidateRow } from "@/lib/sheets";
import { jobOpeningsUrl } from "@/lib/urls";

type CandidatePayload = {
  firstName?: string;
  middleName?: string;
  familyName?: string;
  email?: string;
  language?: string;
  phone?: string;
  locatedCanada?: string;
  province?: string;
  authorizedCanada?: string;
  eligibleMoveCanada?: string;
  industryType?: string;
  industryOther?: string;
  employmentStatus?: string;
  countryOfOrigin?: string;
  languages?: string;
  languagesOther?: string;
};

type EmailLanguage = "en" | "fr";

const subject = "We have received your referral request - iRefair";
const updatedSubject = "We updated your referral request - iRefair";
const ineligibleSubject = "About your referral request - iRefair";

const subjectFr = "Nous avons bien recu votre demande de recommandation - iRefair";
const updatedSubjectFr = "Nous avons mis a jour votre demande de recommandation - iRefair";
const ineligibleSubjectFr = "A propos de votre demande de recommandation - iRefair";

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
      <div style="margin:0 0 8px 0;"><a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">View live openings</a></div>
      <div style="font-size:13px;color:#68707f;">Quick notes on companies, what they need, and links to apply.</div>
    </td></tr>
  </table>
</body></html>`;

const textTemplate = `Hi {{firstName}},

Thanks for submitting your referral request to iRefair.

{{statusNote}}

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

See companies hiring in Canada right now: ${jobOpeningsUrl}

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
      <div style="border:1px solid #e6e8ee;border-radius:10px;padding:14px 16px;margin:10px 0 14px 0;color:#2f3b4b;background:#fafbfe;font-size:14px;line-height:1.6;">
        Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it. We appreciate you taking the time to reach out.
      </div>
      <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">If you become eligible later, we would be happy to hear from you again.</p>
      <div style="text-align:center;margin:6px 0 6px 0;"><a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">Explore current openings</a></div>
      <div style="font-size:13px;color:#68707f;text-align:center;">Browse live roles and requirements any time.</div>
    </td></tr>
  </table>
</body></html>`;

const ineligibleTextTemplate = `Hi {{firstName}},

Thanks for your interest in iRefair.

We reviewed the details you shared. Because you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now.

{{statusNote}}

iRAIN: {{iRain}}

If you become eligible later, we would be happy to hear from you again.

You can also browse current openings and requirements: ${jobOpeningsUrl}

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
      <div style="margin:0 0 8px 0;"><a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">Voir les offres en direct</a></div>
      <div style="font-size:13px;color:#68707f;">Notes rapides sur les entreprises, leurs besoins et des liens pour postuler.</div>
    </td></tr>
  </table>
</body></html>`;

const textTemplateFr = `Bonjour {{firstName}},

Merci d'avoir soumis votre demande de recommandation a iRefair.

{{statusNote}}

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

Decouvrez les entreprises qui recrutent actuellement au Canada : ${jobOpeningsUrl}

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
      <div style="border:1px solid #e6e8ee;border-radius:10px;padding:14px 16px;margin:10px 0 14px 0;color:#2f3b4b;background:#fafbfe;font-size:14px;line-height:1.6;">
        Notre programme soutient actuellement les candidats situes au Canada et disposant d'une autorisation de travail. Si votre situation change, repondez a cet e-mail ou soumettez une nouvelle demande et nous reevaluerons avec plaisir. Merci d'avoir pris le temps de nous ecrire.
      </div>
      <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;">Si votre situation evolue, nous serons heureux de revoir votre demande.</p>
      <div style="text-align:center;margin:6px 0 6px 0;"><a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;font-weight:700;text-decoration:none;border:1px solid #2f5fb3;">Consulter les offres en cours</a></div>
      <div style="font-size:13px;color:#68707f;text-align:center;">Parcourez les roles disponibles et leurs besoins a tout moment.</div>
    </td></tr>
  </table>
</body></html>`;

const ineligibleTextTemplateFr = `Bonjour {{firstName}},

Merci pour votre interet pour iRefair.

Nous avons examine les informations fournies. Comme vous avez indique ne pas etre au Canada et ne pas pouvoir vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'etes donc pas eligible a notre programme pour l'instant.

{{statusNote}}

Votre iRAIN : {{iRain}}

Si votre situation evolue, nous serons heureux de revoir votre demande.

Vous pouvez aussi consulter les roles ouverts : ${jobOpeningsUrl}

- L'equipe iRefair`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? "");
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export async function POST(request: Request) {
  try {
    const body: CandidatePayload = await request.json();
    const firstName = sanitize(body.firstName);
    const middleName = sanitize(body.middleName);
    const familyName = sanitize(body.familyName);
    const email = sanitize(body.email);
    const phone = sanitize(body.phone);
    const locatedCanada = sanitize(body.locatedCanada);
    const province = sanitize(body.province);
    const authorizedCanada = sanitize(body.authorizedCanada);
    const eligibleMoveCanada = sanitize(body.eligibleMoveCanada);
    const countryOfOrigin = sanitize(body.countryOfOrigin);
    const industryType = sanitize(body.industryType);
    const industryOther = sanitize(body.industryOther);
    const employmentStatus = sanitize(body.employmentStatus);
    const languagesOther = sanitize(body.languagesOther);
    const language = sanitize(body.language).toLowerCase();
    const locale: EmailLanguage = language === "fr" ? "fr" : "en";

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

    const iRain = await generateIRAIN();
    const isIneligible = locatedCanada.toLowerCase() === "no" && eligibleMoveCanada.toLowerCase() === "no";

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
      const languagesRaw = sanitize(body.languages);
      const baseList = languagesRaw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && item.toLowerCase() !== "other");
      const all = languagesOther ? [...baseList, languagesOther.trim()] : baseList;
      const combined = all.filter(Boolean).join(", ");
      return combined || notProvided;
    })();

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

    const finalIRain = upsertResult.id;
    const shouldIncludeStatusNote = upsertResult.wasUpdated && !isIneligible;
    const statusNoteHtml = shouldIncludeStatusNote
      ? locale === "fr"
        ? `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#2f4760;background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:10px 12px;">Nous avons mis a jour votre demande avec les dernieres informations fournies. Votre iRAIN reste <strong style="color:#0f2d46;">${finalIRain}</strong>.</p>`
        : `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#2f4760;background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:10px 12px;">We updated your referral request with the latest details you shared. Your iRAIN remains <strong style="color:#0f2d46;">${finalIRain}</strong>.</p>`
      : "";
    const statusNoteText = shouldIncludeStatusNote
      ? locale === "fr"
        ? "Nous avons mis a jour votre demande avec les dernieres informations fournies."
        : "We updated your referral request with the latest details you shared."
      : "";

    const values = {
      iRain: finalIRain,
      firstName,
      location: locationSnapshot,
      authorization: authorizationSnapshot,
      industry: industrySnapshot,
      languages: languagesSnapshot,
    };

    const htmlValues = { ...values, statusNote: statusNoteHtml };
    const textValues = { ...values, statusNote: statusNoteText };

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
