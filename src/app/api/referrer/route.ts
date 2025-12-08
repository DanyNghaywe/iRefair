import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { appendReferrerRow, generateSubmissionId } from '@/lib/sheets';

type ReferrerPayload = {
  name?: string;
  email?: string;
  language?: string;
  targetRoles?: string;
  regions?: string;
  referralType?: string;
  monthlySlots?: string;
  phone?: string;
  country?: string;
  company?: string;
  companyIndustry?: string;
  companyIndustryOther?: string;
  workType?: string;
  constraints?: string;
};

type EmailLanguage = 'en' | 'fr';

const subject = 'Thanks for offering referrals – iRefair';
const jobOpeningsUrl =
  'https://docs.google.com/document/d/1z6s9qb7G_7NUKlgar0eCzFfFvhfe4tW6L45S1wFvuQk/edit?tab=t.0';
const subjectFr = "Merci d'offrir des recommandations – iRefair";

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Thanks for offering referrals – iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f8fb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f8fb;padding:28px 12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;width:100%;border-radius:20px;background:#ffffff;box-shadow:0 18px 50px rgba(15,52,96,0.08);overflow:hidden;border:1px solid #e1e8f0;">
            <tr>
              <td style="padding:0;">
                <div style="background:linear-gradient(120deg,#e7f4ff,#fdfefe);padding:22px 26px 16px 26px;border-bottom:1px solid #e6edf5;">
                  <div style="font-size:22px;font-weight:700;color:#0f2d46;">
                    iRefair
                  </div>
                  <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#4f6b85;margin-top:6px;">
                    Referral offer received
                  </div>
                  <div style="font-size:12px;color:#33506a;margin-top:8px;">
                    Request ID: <strong style="color:#0f2d46;">{{requestId}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 26px 8px 26px;">
                <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.5;font-weight:700;color:#0f2d46;">Hi {{name}}, thank you for offering referrals.</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#2f4760;">
                  We appreciate your willingness to refer candidates. We'll reach out when we have someone who matches the teams and roles you cover.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#2f4760;">
                  You can reply to this email anytime to adjust your availability or update the roles/regions you support.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 26px 14px 26px;">
                <div style="background:linear-gradient(135deg,#ecf7ff,#fdfaf3);border:1px solid #e1edf6;border-radius:14px;padding:16px 18px;">
                  <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:#0f8ba7;border:1px solid #0e7a95;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 24px rgba(15,52,96,0.16);">
                    See who’s hiring in Canada right now
                  </a>
                  <p style="margin:10px 0 0 0;font-size:13px;line-height:1.6;color:#2f4760;">
                    Quick company notes, what they need, and links to apply.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 26px 20px 26px;">
                <div style="background:#f2f7fb;border:1px solid #dfe9f2;border-radius:14px;padding:16px 18px;">
                  <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4d6c82;">
                    Snapshot you shared
                  </div>
                  <div style="margin-top:2px;line-height:1.6;font-size:13px;color:#2f4760;">
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Roles you cover:</strong> {{targetRoles}}</div>
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Regions:</strong> {{regions}}</div>
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Referral type:</strong> {{referralType}}</div>
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Monthly slots:</strong> {{monthlySlots}}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 20px 26px;text-align:center;">
                <p style="margin:10px 0 0 0;font-size:11px;line-height:1.6;color:#4f6b85;">
                  You're receiving this because you offered to refer candidates on iRefair.<br />
                  If this wasn't you, you can safely ignore this message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const textTemplate = `Hi {{name}},

Thank you for offering referrals. We'll reach out when we have a candidate who matches the teams and roles you cover.

Request ID: {{requestId}}

Snapshot you shared:
- Roles you cover: {{targetRoles}}
- Regions: {{regions}}
- Referral type: {{referralType}}
- Monthly slots: {{monthlySlots}}

See who’s hiring in Canada right now (quick company notes, what they need, links to apply):
${jobOpeningsUrl}

Reply to this email anytime to adjust your availability or update the roles/regions you support.

— The iRefair team`;

const htmlTemplateFr = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Merci d'offrir des recommandations – iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f8fb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f8fb;padding:28px 12px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;width:100%;border-radius:20px;background:#ffffff;box-shadow:0 18px 50px rgba(15,52,96,0.08);overflow:hidden;border:1px solid #e1e8f0;">
            <tr>
              <td style="padding:0;">
                <div style="background:linear-gradient(120deg,#e7f4ff,#fdfefe);padding:22px 26px 16px 26px;border-bottom:1px solid #e6edf5;">
                  <div style="font-size:22px;font-weight:700;color:#0f2d46;">
                    iRefair
                  </div>
                  <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#4f6b85;margin-top:6px;">
                    Offre de recommandation reçue
                  </div>
                  <div style="font-size:12px;color:#33506a;margin-top:8px;">
                    ID de demande : <strong style="color:#0f2d46;">{{requestId}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 26px 8px 26px;">
                <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.5;font-weight:700;color:#0f2d46;">Bonjour {{name}}, merci de proposer des recommandations.</h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#2f4760;">
                  Nous apprécions votre volonté de recommander des candidats. Nous vous contacterons lorsqu'un candidat correspondra aux équipes et aux rôles que vous couvrez.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#2f4760;">
                  Vous pouvez répondre à cet e-mail à tout moment pour ajuster votre disponibilité ou mettre à jour les rôles/régions que vous couvrez.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 26px 14px 26px;">
                <div style="background:linear-gradient(135deg,#ecf7ff,#fdfaf3);border:1px solid #e1edf6;border-radius:14px;padding:16px 18px;">
                  <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 16px;border-radius:12px;background:#0f8ba7;border:1px solid #0e7a95;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 24px rgba(15,52,96,0.16);">
                    Découvrez qui recrute actuellement au Canada
                  </a>
                  <p style="margin:10px 0 0 0;font-size:13px;line-height:1.6;color:#2f4760;">
                    Notes rapides par entreprise, besoins et liens pour postuler.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 26px 20px 26px;">
                <div style="background:#f2f7fb;border:1px solid #dfe9f2;border-radius:14px;padding:16px 18px;">
                  <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4d6c82;">
                    Résumé partagé
                  </div>
                  <div style="margin-top:2px;line-height:1.6;font-size:13px;color:#2f4760;">
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Rôles que vous couvrez :</strong> {{targetRoles}}</div>
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Régions :</strong> {{regions}}</div>
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Type de recommandation :</strong> {{referralType}}</div>
                    <div style="margin:6px 0;"><strong style="color:#0f2d46;">Nombre de recommandations par mois :</strong> {{monthlySlots}}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 20px 26px;text-align:center;">
                <p style="margin:10px 0 0 0;font-size:11px;line-height:1.6;color:#4f6b85;">
                  Vous recevez ce message car vous avez proposé des recommandations sur iRefair.<br />
                  Si ce n'était pas vous, vous pouvez ignorer ce message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const textTemplateFr = `Bonjour {{name}},

Merci de proposer des recommandations. Nous vous contacterons quand nous aurons un candidat correspondant aux équipes et aux rôles que vous couvrez.

ID de demande : {{requestId}}

Résumé partagé :
- Rôles que vous couvrez : {{targetRoles}}
- Régions : {{regions}}
- Type de recommandation : {{referralType}}
- Nombre de recommandations par mois : {{monthlySlots}}

Découvrez qui recrute actuellement au Canada (notes rapides, besoins, liens pour postuler) :
${jobOpeningsUrl}

Répondez à cet e-mail à tout moment pour ajuster votre disponibilité ou mettre à jour les rôles/régions que vous couvrez.

— L'équipe iRefair`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export async function POST(request: Request) {
  try {
    const body: ReferrerPayload = await request.json();
    const name = sanitize(body.name);
    const email = sanitize(body.email);
    const phone = sanitize(body.phone);
    const country = sanitize(body.country);
    const company = sanitize(body.company);
    const companyIndustry = sanitize(body.companyIndustry);
    const companyIndustryOther = sanitize(body.companyIndustryOther);
    const workType = sanitize(body.workType);
    const constraints = sanitize(body.constraints);
    const language = sanitize(body.language).toLowerCase();
    const locale: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    const notProvided = locale === 'fr' ? 'Non fourni' : 'Not provided';
    const fallbackName = name || (locale === 'fr' ? 'à vous' : 'there');

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Missing required field: email.' }, { status: 400 });
    }

    const requestId = await generateSubmissionId('REF');

    const values = {
      requestId,
      name: fallbackName,
      targetRoles: sanitize(body.targetRoles) || notProvided,
      regions: sanitize(body.regions) || notProvided,
      referralType: sanitize(body.referralType) || notProvided,
      monthlySlots: sanitize(body.monthlySlots) || notProvided,
    };

    const html = fillTemplate(locale === 'fr' ? htmlTemplateFr : htmlTemplate, values);
    const text = fillTemplate(locale === 'fr' ? textTemplateFr : textTemplate, values);

    await appendReferrerRow({
      id: requestId,
      name,
      email,
      phone,
      country,
      company,
      companyIndustry,
      companyIndustryOther,
      workType,
      targetRoles: sanitize(body.targetRoles),
      regions: sanitize(body.regions),
      referralType: sanitize(body.referralType),
      monthlySlots: sanitize(body.monthlySlots),
      constraints,
    });

    const subjectLine = locale === 'fr' ? subjectFr : subject;
    await sendMail({
      to: email,
      subject: subjectLine,
      html,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Referrer email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
