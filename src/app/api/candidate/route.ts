import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { generateIRAIN, upsertCandidateRow } from '@/lib/sheets';
import { jobOpeningsUrl } from '@/lib/urls';

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
const ineligibleSubject = 'About your referral request - iRefair';

const subjectFr = 'Nous avons bien reçu votre demande de recommandation – iRefair';
const updatedSubjectFr = 'Nous avons mis à jour votre demande de recommandation - iRefair';
const ineligibleSubjectFr = 'À propos de votre demande de recommandation - iRefair';

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>We received your referral request - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">
      We received your iRefair referral request and saved your iRAIN. We will contact you with next steps.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
            <tr>
              <td style="padding:0;border-top:4px solid #2f5fb3;">
                <div style="padding:24px 28px 18px 28px;">
                  <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">
                    Referral request received
                  </div>
                  <div style="font-size:13px;color:#1f2a37;margin-top:12px;">
                    iRAIN: <strong style="color:#1f2a37;">{{iRain}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 14px 28px;">
                <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
                  Hi {{firstName}}, we have your details.
                </h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Thanks for submitting your referral request to <strong style="color:#1f2a37;">iRefair</strong>.
                  We will review your profile and start looking for referrers who can help with roles that match your experience and preferences.
                </p>
                {{statusNote}}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 8px 28px;">
                <div style="border:1px solid #e6e8ee;border-radius:12px;padding:16px 18px;background:#fafbfe;">
                  <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">
                    Quick snapshot
                  </div>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;width:48%;"><strong>Location</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{location}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;"><strong>Work authorization</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{authorization}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;"><strong>Industry focus</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{industry}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;"><strong>Languages</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{languages}}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 14px 28px;">
                <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">
                  What happens next
                </div>
                <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#3b4251;">
                  <li>We review your profile for clarity and completeness.</li>
                  <li>We look for referrers whose teams and roles match what you are targeting.</li>
                  <li>When there is a potential match, we will contact you before any intro is made.</li>
                </ol>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 26px 28px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  If anything changes (new resume, updated targets, different locations), just reply to this email and we will update your details on our side.
                </p>
                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Thanks again for trusting iRefair with your search.
                </p>
                <div style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#3b4251;text-align:center;">
                  See which companies are hiring in Canada right now:
                </div>
                <div style="text-align:center;margin:0 0 6px 0;">
                  <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2f5fb3;border:1px solid #2f5fb3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 20px rgba(47,95,179,0.18);">
                    View live openings
                  </a>
                </div>
                <p style="margin:8px 0 0 0;font-size:13px;line-height:1.55;color:#3b4251;text-align:center;">
                  Quick notes on companies, what they need, and links to apply.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 20px 26px;text-align:center;">
                <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68707f;">
                  You are receiving this because you submitted a referral request on iRefair.<br />
                  If this was not you, you can safely ignore this message.
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

iRAIN: {{iRain}}

Snapshot
- Location: {{location}}
- Work authorization: {{authorization}}
- Industry focus: {{industry}}
- Languages: {{languages}}

What happens next
1) We review your profile for clarity and completeness.
2) We look for referrers whose teams and roles match what you're targeting.
3) When there's a potential match, we'll contact you before any intro is made.

Need to update anything (new resume, targets, locations)? Just reply to this email and we'll adjust your details.

See companies hiring in Canada right now (quick notes and apply links):
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
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">
      Update on your iRefair referral request and your iRAIN details.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
            <tr>
              <td style="padding:0;border-top:4px solid #2f5fb3;">
                <div style="padding:24px 28px 18px 28px;">
                  <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">
                    Referral request update
                  </div>
                  <div style="font-size:13px;color:#1f2a37;margin-top:12px;">
                    iRAIN: <strong style="color:#1f2a37;">{{iRain}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 18px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
                  Hi {{firstName}}, thank you for your interest in iRefair.
                </h1>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  We reviewed the details you shared. Because you indicated that you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now.
                </p>
                {{statusNote}}
                <div style="border:1px solid #e6e8ee;border-radius:10px;padding:14px 16px;margin:10px 0 18px 0;color:#2f3b4b;background:#fafbfe;font-size:14px;line-height:1.7;">
                  Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it. We appreciate you taking the time to reach out.
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Thank you for understanding. If you become eligible later, we would be happy to hear from you again.
                </p>
                <div style="text-align:center;margin:0 0 6px 0;">
                  <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2f5fb3;border:1px solid #2f5fb3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 20px rgba(47,95,179,0.18);">
                    Explore current openings
                  </a>
                </div>
                <p style="margin:8px 0 0 0;font-size:13px;line-height:1.55;color:#3b4251;text-align:center;">
                  Browse live roles and requirements any time.
                </p>
                <p style="margin:14px 0 0 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  The iRefair team
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

const ineligibleTextTemplate = `Hi {{firstName}},

Thanks for your interest in iRefair.

We reviewed the details you shared. Because you indicated that you are not located in Canada and are not able to move and work in Canada within the next 6 months, we cannot move forward with a referral at this time. This means you are not eligible for our referral program right now.

{{statusNote}}

Our program currently supports candidates who are in Canada and have work authorization. If your situation changes, reply to this email or submit a new request and we will gladly revisit it. We appreciate you reaching out.

iRAIN: {{iRain}}

If you become eligible later, we would be happy to hear from you again.

You can also browse current openings and requirements:
${jobOpeningsUrl}

- The iRefair team
`;

const htmlTemplateFr = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Nous avons reçu votre demande de recommandation - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">
      Nous avons bien reçu votre demande iRefair et votre iRAIN est enregistré. Nous vous recontacterons rapidement.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
            <tr>
              <td style="padding:0;border-top:4px solid #2f5fb3;">
                <div style="padding:24px 28px 18px 28px;">
                  <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">
                    Demande de recommandation reçue
                  </div>
                  <div style="font-size:13px;color:#1f2a37;margin-top:12px;">
                    iRAIN : <strong style="color:#1f2a37;">{{iRain}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 14px 28px;">
                <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
                  Bonjour {{firstName}}, nous avons bien reçu vos informations.
                </h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Merci d'avoir soumis votre demande de recommandation à <strong style="color:#1f2a37;">iRefair</strong>.
                  Nous examinerons votre profil et rechercherons des référents dont les rôles correspondent à votre expérience et à vos préférences.
                </p>
                {{statusNote}}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 28px 8px 28px;">
                <div style="border:1px solid #e6e8ee;border-radius:12px;padding:16px 18px;background:#fafbfe;">
                  <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">
                    Résumé express
                  </div>
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;width:48%;"><strong>Localisation</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{location}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;"><strong>Autorisation de travail</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{authorization}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;"><strong>Secteur</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{industry}}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;font-size:14px;color:#1f2a37;"><strong>Langues</strong></td>
                      <td align="right" style="padding:8px 0;font-size:14px;color:#3b4251;">{{languages}}</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 14px 28px;">
                <div style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">
                  Prochaines étapes
                </div>
                <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#3b4251;">
                  <li>Nous examinons votre profil pour en vérifier la clarté et l'exhaustivité.</li>
                  <li>Nous cherchons des référents dont les équipes et les rôles correspondent à vos objectifs.</li>
                  <li>En cas de correspondance potentielle, nous vous contactons avant toute introduction.</li>
                </ol>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 26px 28px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Si quelque chose change (nouveau CV, objectifs mis à jour, autres lieux), répondez simplement à cet e-mail et nous mettrons vos informations à jour.
                </p>
                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Merci encore de faire confiance A� iRefair pour votre recherche.

                </p>

                <div style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#3b4251;text-align:center;">

                  DAccouvrez les entreprises qui recrutent actuellement au Canada :

                </div>

                <div style="text-align:center;margin:0 0 6px 0;">

                  <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2f5fb3;border:1px solid #2f5fb3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 20px rgba(47,95,179,0.18);">

                    Voir les offres en direct

                  </a>

                </div>

                <p style="margin:8px 0 0 0;font-size:13px;line-height:1.55;color:#3b4251;text-align:center;">

                  Notes rapides par entreprise, besoins et liens pour postuler.

                </p>
                </td>
            </tr>
            <tr>
              <td style="padding:0 26px 20px 26px;text-align:center;">
                <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68707f;">
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

Votre iRAIN : {{iRain}}

Résumé partagé
- Localisation : {{location}}
- Autorisation de travail : {{authorization}}
- Secteur : {{industry}}
- Langues : {{languages}}

Prochaines étapes
1) Nous examinons votre profil pour vérifier qu'il est clair et complet.
2) Nous cherchons des référents dont les équipes et les rôles correspondent à vos objectifs.
3) Lorsqu'il y a une correspondance potentielle, nous vous contactons avant toute introduction.

Si quelque chose change (nouveau CV, objectifs différents, autres lieux), répondez simplement à cet e-mail et nous mettrons vos informations à jour.

Découvrez les entreprises qui recrutent actuellement au Canada (notes rapides, besoins et liens pour postuler) :

- L'équipe iRefair
`;

const ineligibleHtmlTemplateFr = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>À propos de votre demande de recommandation - iRefair</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">
      Mise à jour sur votre demande de recommandation iRefair et votre iRAIN.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
            <tr>
              <td style="padding:0;border-top:4px solid #2f5fb3;">
                <div style="padding:24px 28px 18px 28px;">
                  <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">
                    Mise à jour de la demande de recommandation
                  </div>
                  <div style="font-size:13px;color:#1f2a37;margin-top:12px;">
                    iRAIN : <strong style="color:#1f2a37;">{{iRain}}</strong>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 18px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
                  Bonjour {{firstName}}, merci de votre intérêt pour iRefair.
                </h1>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Nous avons examiné les informations fournies. Comme vous avez indiqué ne pas être au Canada et ne pas pouvoir vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'êtes donc pas éligible à notre programme de recommandation pour l'instant.
                </p>
                {{statusNote}}
                <div style="border:1px solid #e6e8ee;border-radius:10px;padding:14px 16px;margin:10px 0 18px 0;color:#2f3b4b;background:#fafbfe;font-size:14px;line-height:1.7;">
                  Notre programme soutient actuellement les candidats situés au Canada et disposant d'une autorisation de travail. Si votre situation change, répondez à cet e-mail ou soumettez une nouvelle demande et nous réévaluerons avec plaisir. Merci d'avoir pris le temps de nous écrire.
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  Merci de votre comprAchension. Si votre situation Acvolue, nous serons heureux de revoir votre demande.
                </p>
                <div style="text-align:center;margin:0 0 6px 0;">
                  <a href="${jobOpeningsUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2f5fb3;border:1px solid #2f5fb3;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;box-shadow:0 8px 20px rgba(47,95,179,0.18);">
                    Consulter les offres en cours
                  </a>
                </div>
                <p style="margin:8px 0 0 0;font-size:13px;line-height:1.55;color:#3b4251;text-align:center;">
                  Parcourez les rA''les disponibles et leurs besoins A� tout moment.
                </p>
                <p style="margin:14px 0 0 0;font-size:14px;line-height:1.7;color:#3b4251;">
                  L'équipe iRefair
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

const ineligibleTextTemplateFr = `Bonjour {{firstName}},

Merci de votre intérêt pour iRefair.

Nous avons examiné les informations fournies. Comme vous avez indiqué ne pas être au Canada et ne pas pouvoir vous y installer et y travailler dans les 6 prochains mois, nous ne pouvons pas poursuivre une recommandation pour le moment. Vous n'êtes donc pas éligible à notre programme de recommandation pour l'instant.

{{statusNote}}

Notre programme soutient actuellement les candidats situés au Canada et disposant d'une autorisation de travail. Si votre situation change, répondez à cet e-mail ou soumettez une nouvelle demande et nous réévaluerons avec plaisir. Merci d'avoir pris le temps de nous écrire.

Votre iRAIN : {{iRain}}

Si votre situation évolue, nous serons heureux de revoir votre demande.


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

    const iRain = await generateIRAIN();
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
      ? locale === 'fr'
        ? `<p style="margin:0 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#2f4760;background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:10px 12px;">Nous avons mis à jour votre demande de recommandation avec les dernières informations fournies. Votre iRAIN reste <strong style="color:#0f2d46;">${finalIRain}</strong>.</p>`
        : `<p style="margin:0 0 14px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#2f4760;background:#eef4fb;border:1px solid #dfe7f2;border-radius:10px;padding:10px 12px;">We updated your referral request with the latest details you shared. Your iRAIN remains <strong style="color:#0f2d46;">${finalIRain}</strong>.</p>`
      : '';
    const statusNoteText = shouldIncludeStatusNote
      ? locale === 'fr'
        ? 'Nous avons mis à jour votre demande de recommandation avec les dernières informations fournies.'
        : 'We updated your referral request with the latest details you shared.'
      : '';

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

    return NextResponse.json({ ok: true, updated: upsertResult.wasUpdated, iRain: finalIRain });
  } catch (error) {
    console.error('Candidate email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}











