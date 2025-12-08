import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { generateSubmissionId, upsertCandidateRow } from '@/lib/sheets';

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

type EmailLanguage = 'en' | 'fr';

const subject = 'We’ve received your referral request – iRefair';
const updatedSubject = 'We updated your referral request - iRefair';
const jobOpeningsUrl =
  'https://docs.google.com/document/d/1z6s9qb7G_7NUKlgar0eCzFfFvhfe4tW6L45S1wFvuQk/edit?tab=t.0';
const ineligibleSubject = 'About your referral request - iRefair';

const subjectFr = 'Nous avons bien reçu votre demande de recommandation – iRefair';
const updatedSubjectFr = 'Nous avons mis à jour votre demande de recommandation - iRefair';
const ineligibleSubjectFr = 'À propos de votre demande de recommandation - iRefair';

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>We’ve received your referral request – iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#041923;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:0;line-height:0;">
      Thanks for sharing your background. We’ll match you with referrers when they’re available.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#041923;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-radius:24px;background:radial-gradient(circle at top left, #1d728f 0, #041923 50%, #020b10 100%);box-shadow:0 18px 40px rgba(0,0,0,0.6);overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
            <tr>
              <td style="padding:22px 28px 10px 28px;text-align:left;">
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#f5fbff;">
                  iRefair
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(217,240,255,0.75);margin-top:4px;">
                  Referral request received
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:rgba(227,242,255,0.8);margin-top:6px;">
                  Request ID: <strong>{{requestId}}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 16px 28px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius:18px;background:rgba(2,16,24,0.96);border:1px solid rgba(255,255,255,0.06);">
                  <tr>
                    <td style="padding:22px 24px 6px 24px;">
                      <h1 style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;line-height:1.4;font-weight:700;color:#f5fbff;">
                        Hi {{firstName}}, we’ve got your details. ✨
                      </h1>
                      <p style="margin:12px 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        Thanks for submitting your referral request to <strong>iRefair</strong>.
                        We’ll review your profile and start looking for referrers who can help with roles that match your experience and preferences.
                      </p>
                      {{statusNote}}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px 4px 24px;">
                      <p style="margin:0 0 6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:rgba(158,206,231,0.9);">
                        Quick snapshot
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Location</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{location}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Work authorization</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{authorization}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Industry focus</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{industry}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Languages</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{languages}}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 24px 16px 24px;">
                      <p style="margin:0 0 6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:rgba(158,206,231,0.9);">
                        What happens next
                      </p>
                      <ol style="margin:0;padding-left:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(227,242,255,0.9);">
                        <li>We review your profile for clarity and completeness.</li>
                        <li>We look for referrers whose teams and roles match what you’re targeting.</li>
                        <li>When there’s a potential match, we’ll contact you before any intro is made.</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px 22px 24px;">
                      <p style="margin:0 0 10px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        If anything changes (new resume, updated targets, different locations), just reply to this email
                        and we’ll update your details on our side.
                      </p>
                      <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        Thanks again for trusting iRefair with your search. 💼
                      </p>
                      <div style="margin:16px 0 0 0;">
                        <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#7de3ff;border:1px solid #c7f3ff;color:#041923;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                          See who's hiring in Canada right now
                        </a>
                        <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.6;color:rgba(205,228,244,0.9);">
                          Quick company notes, what they need, and links to apply.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px 28px;text-align:center;">
                <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:1.6;color:rgba(201,223,237,0.7);">
                  You’re receiving this because you submitted a referral request on iRefair.<br />
                  If this wasn’t you, you can safely ignore this message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const textTemplate = `Hi {{firstName}},

Thanks for submitting your referral request to iRefair.

{{statusNote}}

Request ID: {{requestId}}

Here's a quick snapshot of what you shared:
- Location: {{location}}
- Work authorization: {{authorization}}
- Industry focus: {{industry}}
- Languages: {{languages}}

What happens next:
1) We review your profile for clarity and completeness.
2) We look for referrers whose teams and roles match what you're targeting.
3) When there's a potential match, we'll contact you before any intro is made.

If anything changes (new resume, updated targets, different locations), just reply to this email and we'll update your details.

Before you go, visit this live list of companies hiring in Canada right now (quick company notes, what they need, and links to apply):
${jobOpeningsUrl}

- The iRefair team
`;

const ineligibleHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>About your referral request - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#041923;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:0;line-height:0;">
      We are sorry, but we cannot proceed with your referral request right now.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#041923;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-radius:24px;background:radial-gradient(circle at top left, #1d728f 0, #041923 50%, #020b10 100%);box-shadow:0 18px 40px rgba(0,0,0,0.6);overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
            <tr>
              <td style="padding:22px 28px 10px 28px;text-align:left;">
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#f5fbff;">
                  iRefair
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(217,240,255,0.75);margin-top:4px;">
                  Referral request update
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:rgba(227,242,255,0.8);margin-top:6px;">
                  Request ID: <strong>{{requestId}}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 16px 28px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius:18px;background:rgba(2,16,24,0.96);border:1px solid rgba(255,255,255,0.06);">
                  <tr>
                    <td style="padding:22px 24px 12px 24px;">
                      <h1 style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;line-height:1.4;font-weight:700;color:#f5fbff;">
                        Hi {{firstName}}, thank you for your interest in iRefair.
                      </h1>
                      <p style="margin:12px 0 12px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        We reviewed the details you shared. Because you indicated that you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now. We are sorry about this.
                      </p>
                      {{statusNote}}
                      <p style="margin:0 0 12px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it.
                      </p>
                      <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        Thank you for understanding.<br />
                        The iRefair team
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const ineligibleTextTemplate = `Hi {{firstName}},

Thanks for your interest in iRefair.

We reviewed the details you shared. Because you indicated that you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. We are sorry about this.
This means you are not eligible for our referral program right now.

{{statusNote}}

Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it.

Request ID: {{requestId}}

Thank you for understanding.
- The iRefair team
`;

const htmlTemplateFr = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Nous avons bien reçu votre demande de recommandation – iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#041923;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:0;line-height:0;">
      Merci d'avoir partagé votre parcours. Nous vous mettrons en relation avec des référents lorsqu'ils seront disponibles.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#041923;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-radius:24px;background:radial-gradient(circle at top left, #1d728f 0, #041923 50%, #020b10 100%);box-shadow:0 18px 40px rgba(0,0,0,0.6);overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
            <tr>
              <td style="padding:22px 28px 10px 28px;text-align:left;">
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#f5fbff;">
                  iRefair
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(217,240,255,0.75);margin-top:4px;">
                  Demande de recommandation reçue
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:rgba(227,242,255,0.8);margin-top:6px;">
                  ID de demande : <strong>{{requestId}}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 16px 28px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius:18px;background:rgba(2,16,24,0.96);border:1px solid rgba(255,255,255,0.06);">
                  <tr>
                    <td style="padding:22px 24px 6px 24px;">
                      <h1 style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;line-height:1.4;font-weight:700;color:#f5fbff;">
                        Bonjour {{firstName}}, nous avons bien reçu vos informations. ✨
                      </h1>
                      <p style="margin:12px 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        Merci d'avoir soumis votre demande de recommandation à <strong>iRefair</strong>.
                        Nous examinerons votre profil et commencerons à rechercher des référents dont les rôles correspondent à votre expérience et à vos préférences.
                      </p>
                      {{statusNote}}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px 4px 24px;">
                      <p style="margin:0 0 6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:rgba(158,206,231,0.9);">
                        Résumé express
                      </p>
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Localisation</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{location}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Autorisation de travail</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{authorization}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Secteur</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{industry}}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:#e5f6ff;">
                            <strong>Langues</strong>
                          </td>
                          <td align="right" style="padding:6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:rgba(220,238,255,0.9);">
                            {{languages}}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 24px 16px 24px;">
                      <p style="margin:0 0 6px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.17em;text-transform:uppercase;color:rgba(158,206,231,0.9);">
                        Prochaines étapes
                      </p>
                      <ol style="margin:0;padding-left:18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(227,242,255,0.9);">
                        <li>Nous examinons votre profil pour en vérifier la clarté et l'exhaustivité.</li>
                        <li>Nous recherchons des référents dont les équipes et les rôles correspondent à vos objectifs.</li>
                        <li>Lorsqu'il y a une correspondance potentielle, nous vous contactons avant toute introduction.</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 24px 22px 24px;">
                      <p style="margin:0 0 10px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        Si quelque chose change (nouveau CV, objectifs mis à jour, autres lieux), répondez simplement à cet e-mail
                        et nous mettrons vos informations à jour.
                      </p>
                      <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        Merci encore de faire confiance à iRefair pour votre recherche. 💼
                      </p>
                      <div style="margin:16px 0 0 0;">
                        <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#7de3ff;border:1px solid #c7f3ff;color:#041923;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,0.35);">
                          Voir qui recrute actuellement au Canada
                        </a>
                        <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.6;color:rgba(205,228,244,0.9);">
                          Notes rapides par entreprise, besoins et liens pour postuler.
                        </p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px 28px;text-align:center;">
                <p style="margin:10px 0 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;line-height:1.6;color:rgba(201,223,237,0.7);">
                  Vous recevez ce message car vous avez soumis une demande de recommandation sur iRefair.<br />
                  Si ce n'était pas vous, vous pouvez ignorer ce message.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const textTemplateFr = `Bonjour {{firstName}},

Merci d'avoir soumis votre demande de recommandation à iRefair.

{{statusNote}}

Identifiant de demande : {{requestId}}

Résumé de ce que vous avez partagé :
- Localisation : {{location}}
- Autorisation de travail : {{authorization}}
- Secteur : {{industry}}
- Langues : {{languages}}

Prochaines étapes :
1) Nous examinons votre profil pour vérifier qu'il est clair et complet.
2) Nous cherchons des référents dont les équipes et les rôles correspondent à vos objectifs.
3) Lorsqu'il y a une correspondance potentielle, nous vous contactons avant toute introduction.

Si quelque chose change (nouveau CV, objectifs différents, autres lieux), répondez simplement à cet e-mail et nous mettrons vos informations à jour.

Avant de partir, consultez cette liste en direct des entreprises qui recrutent actuellement au Canada (notes rapides, besoins et liens pour postuler) :
${jobOpeningsUrl}

- L'équipe iRefair
`;

const ineligibleHtmlTemplateFr = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>À propos de votre demande de recommandation - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#041923;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:0;line-height:0;">
      Nous sommes désolés, mais nous ne pouvons pas donner suite à votre demande de recommandation pour l'instant.
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#041923;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-radius:24px;background:radial-gradient(circle at top left, #1d728f 0, #041923 50%, #020b10 100%);box-shadow:0 18px 40px rgba(0,0,0,0.6);overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
            <tr>
              <td style="padding:22px 28px 10px 28px;text-align:left;">
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:700;color:#f5fbff;">
                  iRefair
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(217,240,255,0.75);margin-top:4px;">
                  Mise à jour de la demande de recommandation
                </div>
                <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:rgba(227,242,255,0.8);margin-top:6px;">
                  ID de demande : <strong>{{requestId}}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 16px 28px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-radius:18px;background:rgba(2,16,24,0.96);border:1px solid rgba(255,255,255,0.06);">
                  <tr>
                    <td style="padding:22px 24px 12px 24px;">
                      <h1 style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;line-height:1.4;font-weight:700;color:#f5fbff;">
                        Bonjour {{firstName}}, merci de votre intérêt pour iRefair.
                      </h1>
                      <p style="margin:12px 0 12px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        Nous avons examiné les informations fournies. Comme vous avez indiqué ne pas être au Canada et ne pas pouvoir vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'êtes donc pas éligible à notre programme de recommandation pour l'instant. Nous sommes désolés.
                      </p>
                      {{statusNote}}
                      <p style="margin:0 0 12px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">
                        Notre programme soutient actuellement les candidats situés au Canada et disposant d'une autorisation de travail. Si votre situation change, répondez à cet e-mail ou soumettez une nouvelle demande et nous réévaluerons avec plaisir.
                      </p>
                      <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(205,228,244,0.9);">
                        Merci de votre compréhension.<br />
                        L'équipe iRefair
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const ineligibleTextTemplateFr = `Bonjour {{firstName}},

Merci de votre intérêt pour iRefair.

Nous avons examiné les informations fournies. Comme vous avez indiqué ne pas être au Canada et ne pas pouvoir vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Cela signifie que vous n'êtes pas éligible à notre programme de recommandation pour l'instant.

{{statusNote}}

Notre programme soutient actuellement les candidats situés au Canada et disposant d'une autorisation de travail. Si votre situation change, répondez à cet e-mail ou soumettez une nouvelle demande et nous réévaluerons avec plaisir.

Identifiant de demande : {{requestId}}

Merci de votre compréhension.
- L'équipe iRefair
`;

function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
}

function sanitize(value: unknown) {
  if (value === undefined || value === null) return '';
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
    const locale: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    if (!firstName || !email) {
      return NextResponse.json({ ok: false, error: 'Missing required fields: firstName and email.' }, { status: 400 });
    }

    const notProvided = locale === 'fr' ? 'Non fourni' : 'Not provided';
    const normalizeYesNo = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return '';
      const lowered = trimmed.toLowerCase();
      if (lowered === 'yes') return locale === 'fr' ? 'Oui' : 'Yes';
      if (lowered === 'no') return locale === 'fr' ? 'Non' : 'No';
      return trimmed;
    };

    const generatedRequestId = await generateSubmissionId('CAND');
    const isIneligible =
      locatedCanada.toLowerCase() === 'no' && eligibleMoveCanada.toLowerCase() === 'no';

    const locationSnapshot = (() => {
      if (locatedCanada === 'Yes') return province ? `Canada — ${province}` : 'Canada';
      if (locatedCanada === 'No' && countryOfOrigin) return countryOfOrigin;
      return countryOfOrigin || notProvided;
    })();

    const authorizationSnapshot = (() => {
      if (locatedCanada === 'Yes') return normalizeYesNo(authorizedCanada) || notProvided;
      if (locatedCanada === 'No') {
        const eligibility = normalizeYesNo(eligibleMoveCanada) || eligibleMoveCanada;
        if (eligibility) {
          return locale === 'fr'
            ? `Éligible pour s'installer/travailler dans 6 mois : ${eligibility}`
            : `Eligible to move/work in 6 months: ${eligibility}`;
        }
        return notProvided;
      }
      const fallback = normalizeYesNo(authorizedCanada) || normalizeYesNo(eligibleMoveCanada);
      return fallback || notProvided;
    })();

    const industrySnapshot = (() => {
      if (industryType === 'Other' && industryOther) return industryOther;
      return industryType || notProvided;
    })();

    const languagesSnapshot = (() => {
      const languagesRaw = sanitize(body.languages);

      const baseList = languagesRaw
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item && item.toLowerCase() !== 'other');

      const all = languagesOther ? [...baseList, languagesOther.trim()] : baseList;
      const combined = all.filter(Boolean).join(', ');
      return combined || notProvided;
    })();

    const upsertResult = await upsertCandidateRow({
      id: generatedRequestId,
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

    const finalRequestId = upsertResult.id;
    const shouldIncludeStatusNote = upsertResult.wasUpdated && !isIneligible;
    const statusNoteHtml = shouldIncludeStatusNote
      ? locale === 'fr'
        ? `<p style="margin:0 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">Nous avons mis à jour votre demande de recommandation avec les dernières informations fournies. Votre identifiant de demande reste <strong>${finalRequestId}</strong>.</p>`
        : `<p style="margin:0 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:rgba(227,242,255,0.88);">We updated your referral request with the latest details you shared. Your Request ID remains <strong>${finalRequestId}</strong>.</p>`
      : '';
    const statusNoteText = shouldIncludeStatusNote
      ? locale === 'fr'
        ? 'Nous avons mis à jour votre demande de recommandation avec les dernières informations fournies.'
        : 'We updated your referral request with the latest details you shared.'
      : '';

    const values = {
      requestId: finalRequestId,
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
        ? locale === 'fr'
          ? ineligibleHtmlTemplateFr
          : ineligibleHtmlTemplate
        : locale === 'fr'
          ? htmlTemplateFr
          : htmlTemplate,
      htmlValues,
    );
    const text = fillTemplate(
      isIneligible
        ? locale === 'fr'
          ? ineligibleTextTemplateFr
          : ineligibleTextTemplate
        : locale === 'fr'
          ? textTemplateFr
          : textTemplate,
      textValues,
    );
    const emailSubject =
      locale === 'fr'
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

    return NextResponse.json({ ok: true, updated: upsertResult.wasUpdated, requestId: finalRequestId });
  } catch (error) {
    console.error('Candidate email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
