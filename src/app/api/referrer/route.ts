import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { appendReferrerRow, generateIRAIN } from '@/lib/sheets';

type ReferrerPayload = {
  name?: string;
  email?: string;
  language?: string;
  phone?: string;
  country?: string;
  company?: string;
  companyIndustry?: string;
  companyIndustryOther?: string;
  careersPortal?: string;
  workType?: string;
  referralType?: string;
  roles?: string;
  regions?: string;
  monthlySlots?: string;
  linkedin?: string;
};

type EmailLanguage = 'en' | 'fr';

const subject = 'Thanks for offering referrals (iRAIN saved) - iRefair';
const subjectFr = "Merci d'offrir des recommandations (iRAIN enregistr\u00e9) - iRefair";

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Thanks for offering referrals - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">
      Thanks for offering referrals with iRefair. Your iRAIN is saved; we will reach out when we have a match.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
            <tr>
              <td style="padding:0;border-top:4px solid #2f5fb3;">
                <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
                  <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">Referral offer received</div>
                  <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">{{iRain}}</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 10px 28px;">
                <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">Hi {{name}}, thank you for offering referrals.</h1>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  We appreciate your willingness to refer candidates. We'll reach out when we have someone who matches the teams and roles you cover.
                </p>
                <p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Thank you for contributing to the community and helping others find work in Canada. You can reply to this email anytime to adjust your availability or update how you want to help.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 28px 18px 28px;">
                <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">What happens next</div>
                <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#3b4251;">
                  <li>We review your details and iRAIN to understand where you can help.</li>
                  <li>We keep you on our radar for teams, industries, and regions that match your snapshot.</li>
                  <li>When there is a fit, we'll reach out before sharing any candidate details.</li>
                </ol>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 8px 28px;">
                <div style="border:1px solid #e6e8ee;border-radius:12px;padding:16px 18px;background:#fafbfe;">
                  <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">Snapshot you shared</div>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;width:46%;"><strong>Company</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{company}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Careers Portal</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{careersPortal}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Industry</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{companyIndustry}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Roles you cover</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{roles}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Regions</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{regions}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Referral type</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{referralType}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;font-size:14px;color:#1f2a37;"><strong>Monthly slots</strong></td>
                      <td align="right" style="padding:10px 0;font-size:14px;color:#3b4251;">{{monthlySlots}}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 14px 28px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">Want to learn how we work or discuss how you can best support candidates?</p>
                <div style="text-align:center;margin:0 0 12px 0;">
                  <a href="https://calendly.com/mbissani/30min" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2f5fb3;border:1px solid #2f5fb3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 18px rgba(47,95,179,0.16);">Meet the founder</a>
                </div>
                <div style="text-align:center;margin:0 0 4px 0;font-size:13px;">
                  <a href="mailto:info@andbeyondca.com" style="color:#2f5fb3;text-decoration:underline;font-weight:600;">Reply to update your availability/details</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 20px 26px;text-align:center;">
                <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68707f;">
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

iRAIN: {{iRain}}

Thank you for contributing to the community and helping others find work in Canada. You can reply to this email anytime to adjust your availability or update how you want to help.

What happens next
1) We review your details and iRAIN to understand where you can help.
2) We keep you on our radar for teams, industries, and regions that match your snapshot.
3) When there is a fit, we'll reach out before sharing any candidate details.

Snapshot you shared
- Company: {{company}}
- Careers portal: {{careersPortal}}
- Industry: {{companyIndustry}}
- Roles you cover: {{roles}}
- Regions: {{regions}}
- Referral type: {{referralType}}
- Monthly slots: {{monthlySlots}}

Want to connect?
- Meet the founder: https://calendly.com/mbissani/30min
- Reply to update your availability/details: info@andbeyondca.com

- The iRefair team`;

const htmlTemplateFr = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Merci d'offrir des recommandations - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">
      Merci d'offrir des recommandations avec iRefair. Votre iRAIN est enregistr&eacute;; nous vous contacterons d&egrave;s qu'il y a une correspondance.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
            <tr>
              <td style="padding:0;border-top:4px solid #2f5fb3;">
                <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
                  <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">Offre de recommandation re&ccedil;ue</div>
                  <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN : <strong style="color:#1f2a37;">{{iRain}}</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 10px 28px;">
                <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">Bonjour {{name}}, merci de proposer des recommandations.</h1>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Nous appr&eacute;cions votre volont&eacute; de recommander des candidats. Nous vous contacterons lorsqu'un candidat correspondra aux &eacute;quipes et aux r&ocirc;les que vous couvrez.
                </p>
                <p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Merci de contribuer &agrave; la communaut&eacute; et d'aider d'autres personnes &agrave; trouver un emploi au Canada. Vous pouvez r&eacute;pondre &agrave; cet e-mail &agrave; tout moment pour ajuster votre disponibilit&eacute; ou mettre &agrave; jour vos modalit&eacute;s.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 28px 18px 28px;">
                <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">Prochaines &eacute;tapes</div>
                <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#3b4251;">
                  <li>Nous passons en revue vos informations et votre iRAIN pour voir o&ugrave; vous pouvez aider.</li>
                  <li>Nous vous gardons en t&ecirc;te pour les &eacute;quipes, secteurs et r&eacute;gions correspondant &agrave; votre profil.</li>
                  <li>En cas d'ad&eacute;quation, nous vous contactons avant de partager tout d&eacute;tail sur un candidat.</li>
                </ol>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 8px 28px;">
                <div style="border:1px solid #e6e8ee;border-radius:12px;padding:16px 18px;background:#fafbfe;">
                  <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">R&eacute;sum&eacute; partag&eacute;</div>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;width:46%;"><strong>Entreprise</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{company}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Portail carrières</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{careersPortal}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Secteur</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{companyIndustry}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>R&ocirc;les couverts</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{roles}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>R&eacute;gions</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{regions}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#1f2a37;"><strong>Type de recommandation</strong></td>
                      <td align="right" style="padding:10px 0;border-bottom:1px solid #eceff5;font-size:14px;color:#3b4251;">{{referralType}}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;font-size:14px;color:#1f2a37;"><strong>Slots mensuels</strong></td>
                      <td align="right" style="padding:10px 0;font-size:14px;color:#3b4251;">{{monthlySlots}}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 14px 28px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">Vous souhaitez en savoir plus sur notre fonctionnement ou comment mieux soutenir les candidats ?</p>
                <div style="text-align:center;margin:0 0 12px 0;">
                  <a href="https://calendly.com/mbissani/30min" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2f5fb3;border:1px solid #2f5fb3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 18px rgba(47,95,179,0.16);">Rencontrer la fondatrice</a>
                </div>
                <div style="text-align:center;margin:0 0 4px 0;font-size:13px;">
                  <a href="mailto:info@andbeyondca.com" style="color:#2f5fb3;text-decoration:underline;font-weight:600;">R&eacute;pondez pour mettre &agrave; jour vos disponibilit&eacute;s/d&eacute;tails</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 20px 26px;text-align:center;">
                <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68707f;">
                  Vous recevez ce message car vous avez propos&eacute; des recommandations sur iRefair.<br />
                  Si ce n'&eacute;tait pas vous, vous pouvez ignorer ce message.
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

Merci de proposer des recommandations. Nous vous contacterons quand nous aurons un candidat correspondant aux &eacute;quipes et aux r&ocirc;les que vous couvrez.

iRAIN : {{iRain}}

Merci de contribuer &agrave; la communaut&eacute; et d'aider d'autres personnes &agrave; trouver un emploi au Canada. Vous pouvez r&eacute;pondre &agrave; cet e-mail &agrave; tout moment pour ajuster votre disponibilit&eacute; ou mettre &agrave; jour vos modalit&eacute;s.

Prochaines &eacute;tapes
1) Nous passons en revue vos informations et votre iRAIN pour identifier o&ugrave; vous pouvez aider.
2) Nous vous gardons en t&ecirc;te pour les &eacute;quipes, secteurs et r&eacute;gions correspondant &agrave; votre profil.
3) En cas d'ad&eacute;quation, nous vous contactons avant de partager des d&eacute;tails sur un candidat.

R&eacute;sum&eacute; partag&eacute;
- Entreprise : {{company}}
- Portail carrières : {{careersPortal}}
- Secteur : {{companyIndustry}}
- R&ocirc;les couverts : {{roles}}
- R&eacute;gions : {{regions}}
- Type de recommandation : {{referralType}}
- Slots mensuels : {{monthlySlots}}

Envie d'&eacute;changer ?
- Rencontrez la fondatrice : https://calendly.com/mbissani/30min
- R&eacute;pondez pour mettre &agrave; jour vos disponibilit&eacute;s/d&eacute;tails : info@andbeyondca.com

- L'&eacute;quipe iRefair`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function resolveIndustry(industry: string, industryOther: string, fallback: string) {
  const lowered = industry.toLowerCase();
  if (lowered === 'other') return industryOther || fallback;
  return industry || fallback;
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
  const careersPortal = sanitize(body.careersPortal);
  const workType = sanitize(body.workType);
  const referralType = sanitize(body.referralType || body.workType);
  const roles = sanitize(body.roles);
  const regions = sanitize(body.regions);
  const monthlySlots = sanitize(body.monthlySlots);
    const linkedin = sanitize(body.linkedin);
    const language = sanitize(body.language).toLowerCase();
    const locale: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    const notProvidedText = locale === 'fr' ? 'Non fourni' : 'Not provided';
    const notProvidedHtml =
      locale === 'fr'
        ? '<span style="color:#8a93a5;font-style:italic;">Non fourni</span>'
        : '<span style="color:#8a93a5;font-style:italic;">Not provided</span>';
    const fallbackName = name || (locale === 'fr' ? 'vous' : 'there');

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Missing required field: email.' }, { status: 400 });
    }

    const iRain = await generateIRAIN();

    const companyIndustryText = resolveIndustry(companyIndustry, companyIndustryOther, notProvidedText);
    const companyIndustryHtml = resolveIndustry(companyIndustry, companyIndustryOther, notProvidedHtml);
    const careersPortalHtml = careersPortal
      ? `<a href="${careersPortal}" target="_blank" rel="noreferrer">${careersPortal}</a>`
      : notProvidedHtml;

    const textValues = {
      iRain,
      irain: iRain,
      name: fallbackName,
      company: company || notProvidedText,
      companyIndustry: companyIndustryText,
      roles: roles || notProvidedText,
      regions: regions || notProvidedText,
      referralType: referralType || workType || notProvidedText,
      careersPortal: careersPortal || notProvidedText,
      monthlySlots: monthlySlots || notProvidedText,
    };

    const htmlValues = {
      ...textValues,
      company: company || notProvidedHtml,
      companyIndustry: companyIndustryHtml,
      roles: roles || notProvidedHtml,
      regions: regions || notProvidedHtml,
      referralType: referralType || workType || notProvidedHtml,
      careersPortal: careersPortalHtml,
      monthlySlots: monthlySlots || notProvidedHtml,
    };

    const html = fillTemplate(locale === 'fr' ? htmlTemplateFr : htmlTemplate, htmlValues);
    const text = fillTemplate(locale === 'fr' ? textTemplateFr : textTemplate, textValues);

    await appendReferrerRow({
      iRain,
      name,
      email,
      phone,
      country,
      company,
      companyIndustry: resolveIndustry(companyIndustry, companyIndustryOther, companyIndustry),
      careersPortal,
      workType,
      linkedin,
    });

    const subjectLine = locale === 'fr' ? subjectFr : subject;
    await sendMail({
      to: email,
      subject: subjectLine,
      html,
      text,
    });

    return NextResponse.json({ ok: true, iRain });
  } catch (error) {
    console.error('Referrer email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
