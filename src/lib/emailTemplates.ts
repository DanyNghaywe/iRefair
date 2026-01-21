import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';
import { formatMeetingDateTime } from '@/lib/timezone';
import { jobOpeningsUrl, applyUrl } from '@/lib/urls';

type TemplateResult = {
  subject: string;
  text: string;
  html: string;
};

// Brand colors from the app (matching referrer template)
const colors = {
  primary: '#2f5fb3',      // Blue accent (iRefair brand blue)
  primaryDark: '#2563eb',  // Darker blue for hover states
  secondary: '#f47c5d',    // Coral accent
  ink: '#1f2a37',          // Dark text
  muted: '#3b4251',        // Gray text
  mutedLight: '#5c6675',   // Lighter gray text
  line: '#e6e9f0',         // Border color
  background: '#f8fafc',   // Light gray background
  backgroundAlt: '#fafbfe', // Alternative background
  white: '#ffffff',
  success: '#10b981',      // Green
  error: '#e11d48',        // Red
};

// Reusable email wrapper (matching referrer template style)
// Accepts optional customHeader to replace the default header with eyebrow/metadata
const emailWrapper = (content: string, preheader?: string, customHeader?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iRefair</title>
</head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f6f7fb;">${preheader}</div>` : ''}

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;box-shadow:0 14px 38px rgba(15,35,70,0.08);overflow:hidden;border:1px solid #e7e9f0;">
          <tr>
            <td style="padding:0;border-top:4px solid ${colors.primary};">
              ${customHeader || `<div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
                <div style="font-size:22px;font-weight:700;color:${colors.primary};">iRefair</div>
              </div>`}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 10px 28px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0 26px 20px 26px;text-align:center;">
              <p style="margin:10px 0 0 0;font-size:12px;line-height:1.6;color:#68707f;">
                Sent by iRefair - Connecting talent with opportunity
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// Reusable button component (matching referrer template style)
// Text is wrapped in a span to prevent Outlook from overriding visited link colors
const button = (text: string, url: string, variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary') => {
  const styles = {
    primary: { bg: colors.primary, color: '#ffffff', border: `1px solid ${colors.primary}`, shadow: '0 8px 18px rgba(47,95,179,0.16)' },
    secondary: { bg: colors.ink, color: '#ffffff', border: `1px solid ${colors.ink}`, shadow: '0 8px 18px rgba(15,35,70,0.12)' },
    outline: { bg: 'transparent', color: colors.ink, border: `2px solid ${colors.line}`, shadow: 'none' },
    danger: { bg: 'transparent', color: colors.error, border: `2px solid ${colors.error}`, shadow: 'none' },
  };
  const s = styles[variant];

  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" style="display:inline-block;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:${s.bg};border:${s.border};box-shadow:${s.shadow};"><span style="color:${s.color};text-decoration:none;">${escapeHtml(text)}</span></a>`;
};

// Reusable info row (matching referrer template style)
const infoRow = (label: string, value: string, showBorder = true) => `
  <tr>
    <td style="padding:10px 0;${showBorder ? 'border-bottom:1px solid #eceff5;' : ''}font-size:14px;color:#1f2a37;width:46%;">
      <strong>${escapeHtml(label)}</strong>
    </td>
    <td align="right" style="padding:10px 0;${showBorder ? 'border-bottom:1px solid #eceff5;' : ''}font-size:14px;color:#3b4251;">
      ${value}
    </td>
  </tr>`;

// Reusable divider (matching referrer template style)
const divider = `<hr style="border:none;border-top:1px solid #e6e8ee;margin:20px 0;">`;

// Reusable eyebrow label (matching referrer template style)
const eyebrow = (text: string) => `<div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">${escapeHtml(text)}</div>`;

// Snapshot card component (matching referrer template style)
const snapshotCard = (title: string, rows: Array<[string, string]>) => `
  <div style="border:1px solid #e6e8ee;border-radius:12px;padding:16px 18px;background:#fafbfe;">
    ${eyebrow(title)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${rows.map(([label, value], idx) =>
        infoRow(label, value, idx < rows.length - 1)
      ).join('')}
    </table>
  </div>
`;

// Applicant key section (secure credential display with warning)
const applicantKeySection = (key?: string, locale: 'en' | 'fr' = 'en') => {
  if (!key) return '';

  const title = locale === 'fr' ? 'Votre clé de candidat' : 'Your Applicant Key';
  const warning = locale === 'fr'
    ? 'Gardez ceci privé. Vous en aurez besoin pour postuler avec votre iRAIN.'
    : 'Keep this private. You\'ll need it to apply with your iRAIN.';

  return `
    <div style="margin:20px 0;padding:16px;border-radius:12px;border:1px solid #e6e8ee;background:#fff8dc;">
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#1f2a37;">
        ${escapeHtml(title)}: <code style="background:#fef3c7;padding:2px 6px;border-radius:4px;font-family:monospace;">${escapeHtml(key)}</code>
      </p>
      <p style="margin:0;font-size:13px;color:#5c6675;">
        ${escapeHtml(warning)}
      </p>
    </div>
  `;
};

// Helper to get localized text
const t = (en: string, fr: string, locale: 'en' | 'fr' = 'en') => (locale === 'fr' ? fr : en);

// ============================================================================
// CANDIDATE EMAIL TEMPLATES
// ============================================================================

type ApplicantRegistrationParams = {
  firstName: string;
  iRain: string;
  location: string;
  authorization: string;
  industry: string;
  languages: string;
  applicantKey?: string;
  statusNote?: string;
  locale?: 'en' | 'fr';
};

export function applicantRegistrationConfirmation(params: ApplicantRegistrationParams): TemplateResult {
  const {
    firstName,
    iRain,
    location,
    authorization,
    industry,
    languages,
    applicantKey,
    statusNote,
    locale = 'en',
  } = params;

  const subject = t(
    'Referral request received - iRefair',
    'Demande de recommandation reçue - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;
  const thankYou = t("we've got your details.", 'nous avons bien reçu vos informations.', locale);

  const eyebrowText = t('REFERRAL REQUEST RECEIVED', 'DEMANDE DE RECOMMANDATION REÇUE', locale);
  const iRainLabel = t('iRAIN', 'iRAIN', locale);

  const mainText1 = t(
    "You're now registered with iRefair. Your iRAIN and Applicant Key are your credentials to apply for jobs through our referral network.",
    "Vous êtes maintenant inscrit chez iRefair. Votre iRAIN et votre clé de candidat sont vos identifiants pour postuler à des emplois via notre réseau de recommandation.",
    locale
  );

  // Use the imported URLs - normalize them for email safety
  const openingsUrl = normalizeHttpUrl(jobOpeningsUrl) || 'https://irefair.com/hiring-companies';
  const applyPageUrl = normalizeHttpUrl(applyUrl) || 'https://irefair.com/apply';

  const whatHappensTitle = t('HOW TO APPLY', 'COMMENT POSTULER', locale);
  const step1 = t(
    "Browse our hiring companies page to find companies and their iRCRN codes.",
    "Parcourez notre page des entreprises qui recrutent pour trouver des entreprises et leurs codes iRCRN.",
    locale
  );
  const step2 = t(
    "When you find a role you're interested in, go to the Apply page.",
    "Lorsque vous trouvez un poste qui vous intéresse, rendez-vous sur la page Postuler.",
    locale
  );
  const step3 = t(
    "Submit your application using your iRAIN, Applicant Key, and a tailored CV.",
    "Soumettez votre candidature en utilisant votre iRAIN, votre clé de candidat et un CV adapté.",
    locale
  );
  const step1Html = t(
    `Browse our <a href="${openingsUrl}" style="color:${colors.primary};text-decoration:underline;">hiring companies page</a> to find companies and their iRCRN codes.`,
    `Parcourez notre <a href="${openingsUrl}" style="color:${colors.primary};text-decoration:underline;">page des entreprises qui recrutent</a> pour trouver des entreprises et leurs codes iRCRN.`,
    locale
  );
  const step2Html = t(
    `When you find a role you're interested in, go to the <a href="${applyPageUrl}" style="color:${colors.primary};text-decoration:underline;">Apply page</a>.`,
    `Lorsque vous trouvez un poste qui vous intéresse, rendez-vous sur la <a href="${applyPageUrl}" style="color:${colors.primary};text-decoration:underline;">page Postuler</a>.`,
    locale
  );
  const step3Html = t(
    "Submit your application using your iRAIN, Applicant Key, and a tailored CV.",
    "Soumettez votre candidature en utilisant votre iRAIN, votre clé de candidat et un CV adapté.",
    locale
  );

  const snapshotTitle = t('SNAPSHOT YOU SHARED', 'PROFIL QUE VOUS AVEZ PARTAGÉ', locale);
  const locationLabel = t('Location', 'Emplacement', locale);
  const authorizationLabel = t('Work Authorization', 'Autorisation de travail', locale);
  const industryLabel = t('Industry', 'Industrie', locale);
  const languagesLabel = t('Languages', 'Langues', locale);

  const ctaText = t(
    'Ready to apply? Browse hiring companies and find your next opportunity.',
    'Prêt à postuler? Parcourez les entreprises qui recrutent et trouvez votre prochaine opportunité.',
    locale
  );
  const ctaButton = t('Browse hiring companies', 'Parcourir les entreprises', locale);

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting} ${thankYou}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    ${statusNote ? `<p style="margin:14px 0;font-size:14px;color:#1f2a37;"><strong>${escapeHtml(statusNote)}</strong></p>` : ''}
    ${applicantKeySection(applicantKey, locale)}
  `;

  const whatHappensNext = `
    <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">${escapeHtml(whatHappensTitle)}</div>
    <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#3b4251;">
      <li>${step1Html}</li>
      <li>${step2Html}</li>
      <li>${step3Html}</li>
    </ol>
  `;

  const snapshot = snapshotCard(snapshotTitle, [
    [locationLabel, escapeHtml(location)],
    [authorizationLabel, escapeHtml(authorization)],
    [industryLabel, escapeHtml(industry)],
    [languagesLabel, escapeHtml(languages)],
  ]);

  const cta = `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
      ${escapeHtml(ctaText)}
    </p>
    <div style="text-align:center;margin:0 0 12px 0;">
      ${button(ctaButton, openingsUrl, 'primary')}
    </div>
  `;

  const preheader = t(
    "You're registered! Use your iRAIN and Applicant Key to start applying for jobs.",
    "Vous êtes inscrit! Utilisez votre iRAIN et votre clé de candidat pour commencer à postuler.",
    locale
  );

  // Custom header with eyebrow and iRAIN display
  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRainLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRain)}</strong></div>
    </div>
  `;

  // Combine all content sections for the email body
  const fullContent = `
    ${content}
    <div style="padding:6px 0 8px 0;">
      ${whatHappensNext}
    </div>
    <div style="padding:10px 0 8px 0;">
      ${snapshot}
    </div>
    <div style="padding:16px 0 4px 0;">
      ${cta}
    </div>
  `;

  // Build full HTML using the improved wrapper with custom header
  const html = emailWrapper(fullContent, preheader, customHeader);

  const text = `${greeting} ${thankYou}

${mainText1}

${iRainLabel}: ${iRain}

${statusNote || ''}

${applicantKey ? `${t('Your Applicant Key', 'Votre clé de candidat', locale)}: ${applicantKey}\n${t('Keep this private. You\'ll need it to apply with your iRAIN.', 'Gardez ceci privé. Vous en aurez besoin pour postuler avec votre iRAIN.', locale)}\n` : ''}

${whatHappensTitle}
1) ${step1}
2) ${step2}
3) ${step3}

${snapshotTitle}
- ${locationLabel}: ${location}
- ${authorizationLabel}: ${authorization}
- ${industryLabel}: ${industry}
- ${languagesLabel}: ${languages}

${ctaText}
${t('Browse companies', 'Parcourir les entreprises', locale)}: ${openingsUrl}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type ApplicantIneligibleParams = {
  firstName: string;
  iRain: string;
  applicantKey?: string;
  locale?: 'en' | 'fr';
};

export function applicantIneligibleNotification(params: ApplicantIneligibleParams): TemplateResult {
  const { firstName, iRain, applicantKey, locale = 'en' } = params;

  const subject = t(
    'Referral request update - iRefair',
    'Mise à jour de la demande de recommandation - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;

  const eyebrowText = t('REFERRAL REQUEST UPDATE', 'MISE À JOUR DE LA DEMANDE', locale);
  const iRainLabel = t('iRAIN', 'iRAIN', locale);

  const mainText1 = t(
    "Thank you for registering with iRefair. Based on the information you provided, you're currently outside Canada and not planning to relocate.",
    "Merci de vous être inscrit avec iRefair. Sur la base des informations que vous avez fournies, vous êtes actuellement en dehors du Canada et ne prévoyez pas de déménager.",
    locale
  );

  const mainText2 = t(
    "Most of the opportunities we work with require applicants to be in Canada or have plans to relocate. This means we won't be able to match you with referrers at this time.",
    "La plupart des opportunités avec lesquelles nous travaillons nécessitent que les candidats soient au Canada ou prévoient de déménager. Cela signifie que nous ne pourrons pas vous mettre en relation avec des recommandateurs pour le moment.",
    locale
  );

  const futureTitle = t('IF YOUR SITUATION CHANGES', 'SI VOTRE SITUATION CHANGE', locale);
  const futureText = t(
    "If you move to Canada or change your relocation plans, contact us at irefair.andbeyondconsulting@gmail.com and we'll update your profile.",
    "Si vous déménagez au Canada ou changez vos plans de relocalisation, contactez-nous à irefair.andbeyondconsulting@gmail.com et nous mettrons à jour votre profil.",
    locale
  );

  const ctaText = t(
    'You can still browse companies hiring in Canada:',
    'Vous pouvez toujours parcourir les entreprises qui embauchent au Canada:',
    locale
  );
  const ctaButton = t('View job openings', 'Voir les offres d\'emploi', locale);

  const openingsUrl = normalizeHttpUrl(jobOpeningsUrl) || 'https://irefair.com/hiring-companies';

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText2)}
    </p>
    ${applicantKeySection(applicantKey, locale)}
    <div style="margin:20px 0;padding:16px;border-radius:12px;background:#f0f9ff;border-left:4px solid ${colors.primary};">
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#1f2a37;">${escapeHtml(futureTitle)}</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#3b4251;">${escapeHtml(futureText)}</p>
    </div>
    <p style="margin:20px 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
      ${escapeHtml(ctaText)}
    </p>
    <div style="text-align:center;margin:0 0 4px 0;">
      ${button(ctaButton, openingsUrl, 'primary')}
    </div>
  `;

  const preheader = t(
    'Update on your iRefair registration. Your location eligibility has been noted.',
    'Mise à jour de votre inscription iRefair. Votre éligibilité de localisation a été notée.',
    locale
  );

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRainLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRain)}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText1}

${mainText2}

${iRainLabel}: ${iRain}

${applicantKey ? `${t('Your Applicant Key', 'Votre clé de candidat', locale)}: ${applicantKey}\n${t('Keep this private. You\'ll need it to apply with your iRAIN.', 'Gardez ceci privé. Vous en aurez besoin pour postuler avec votre iRAIN.', locale)}\n` : ''}

${futureTitle}
${futureText}

${ctaText}
${t('View openings', 'Voir les offres', locale)}: ${openingsUrl}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type NewApplicantRegistrationConfirmationParams = {
  firstName: string;
  confirmUrl: string;
  locale?: 'en' | 'fr';
};

export function newApplicantRegistrationConfirmation(params: NewApplicantRegistrationConfirmationParams): TemplateResult {
  const { firstName, confirmUrl, locale = 'en' } = params;

  const subject = t(
    'Confirm your registration - iRefair',
    'Confirmez votre inscription - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;

  const mainText1 = t(
    "Thanks for signing up with iRefair! To complete your registration and activate your profile, please confirm your email address by clicking the button below.",
    "Merci de vous être inscrit(e) sur iRefair! Pour finaliser votre inscription et activer votre profil, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.",
    locale
  );

  const securityNote = t(
    "This helps us verify your email and keep your account secure.",
    "Cela nous aide à vérifier votre e-mail et à sécuriser votre compte.",
    locale
  );

  const expiryNote = t(
    "This confirmation link will expire in 7 days.",
    "Ce lien de confirmation expirera dans 7 jours.",
    locale
  );

  const ignoreText = t(
    "If you didn't sign up for iRefair, you can safely ignore this email.",
    "Si vous ne vous êtes pas inscrit(e) sur iRefair, vous pouvez ignorer cet e-mail en toute sécurité.",
    locale
  );

  const ctaButton = t('Confirm my registration', 'Confirmer mon inscription', locale);

  const normalizedConfirmUrl = normalizeHttpUrl(confirmUrl) || confirmUrl;

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#5c6675;">
      ${escapeHtml(securityNote)}
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${button(ctaButton, normalizedConfirmUrl, 'primary')}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;text-align:center;color:#5c6675;">
      ${escapeHtml(expiryNote)}
    </p>
    ${divider}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#68707f;">
      ${escapeHtml(ignoreText)}
    </p>
  `;

  const preheader = t(
    'Please confirm your email to complete your iRefair registration.',
    'Veuillez confirmer votre e-mail pour finaliser votre inscription iRefair.',
    locale
  );

  const eyebrowText = t('REGISTRATION CONFIRMATION', 'CONFIRMATION D\'INSCRIPTION', locale);

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
    </div>
  `;

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText1}

${securityNote}

${ctaButton}: ${normalizedConfirmUrl}

${expiryNote}

${ignoreText}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type ApplicantRegistrationReminderParams = {
  firstName: string;
  confirmUrl: string;
  expiresAt: string;
  locale?: 'en' | 'fr';
};

export function applicantRegistrationReminder(params: ApplicantRegistrationReminderParams): TemplateResult {
  const { firstName, confirmUrl, expiresAt, locale = 'en' } = params;

  const subject = t(
    'Reminder: Complete your registration - iRefair',
    'Rappel: Complétez votre inscription - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;

  const mainText1 = t(
    "We noticed you haven't completed your iRefair registration yet. Your confirmation link is about to expire!",
    "Nous avons remarqué que vous n'avez pas encore complété votre inscription iRefair. Votre lien de confirmation est sur le point d'expirer!",
    locale
  );

  const mainText2 = t(
    "To activate your profile and start exploring referral opportunities, please confirm your email address by clicking the button below.",
    "Pour activer votre profil et commencer à explorer les opportunités de recommandation, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.",
    locale
  );

  const expiryNote = t(
    `This link will expire on ${expiresAt}.`,
    `Ce lien expirera le ${expiresAt}.`,
    locale
  );

  const ignoreText = t(
    "If you no longer wish to register, you can safely ignore this email.",
    "Si vous ne souhaitez plus vous inscrire, vous pouvez ignorer cet e-mail en toute sécurité.",
    locale
  );

  const ctaButton = t('Complete my registration', 'Compléter mon inscription', locale);

  const normalizedConfirmUrl = normalizeHttpUrl(confirmUrl) || confirmUrl;

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText2)}
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${button(ctaButton, normalizedConfirmUrl, 'primary')}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;text-align:center;color:#e11d48;font-weight:600;">
      ${escapeHtml(expiryNote)}
    </p>
    ${divider}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#68707f;">
      ${escapeHtml(ignoreText)}
    </p>
  `;

  const preheader = t(
    'Your registration link is about to expire - complete your iRefair profile now!',
    'Votre lien d\'inscription est sur le point d\'expirer - complétez votre profil iRefair maintenant!',
    locale
  );

  const eyebrowText = t('REGISTRATION REMINDER', 'RAPPEL D\'INSCRIPTION', locale);

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#e11d48;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
    </div>
  `;

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText1}

${mainText2}

${ctaButton}: ${normalizedConfirmUrl}

${expiryNote}

${ignoreText}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type ApplicantProfileUpdateConfirmationParams = {
  firstName: string;
  confirmUrl: string;
  locale?: 'en' | 'fr';
};

export function applicantProfileUpdateConfirmation(params: ApplicantProfileUpdateConfirmationParams): TemplateResult {
  const { firstName, confirmUrl, locale = 'en' } = params;

  const subject = t(
    'Confirm your profile update - iRefair',
    'Confirmez la mise à jour de votre profil - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;

  const mainText1 = t(
    "We received a request to update your applicant profile. To confirm this change, please click the button below.",
    "Nous avons reçu une demande de mise à jour de votre profil de candidat. Pour confirmer ce changement, veuillez cliquer sur le bouton ci-dessous.",
    locale
  );

  const securityNote = t(
    "This is a security measure to ensure that only you can modify your profile.",
    "Il s'agit d'une mesure de sécurité pour garantir que vous seul pouvez modifier votre profil.",
    locale
  );

  const expiryNote = t(
    "This confirmation link will expire in 7 days.",
    "Ce lien de confirmation expirera dans 7 jours.",
    locale
  );

  const ignoreText = t(
    "If you didn't request this update, you can safely ignore this email.",
    "Si vous n'avez pas demandé cette mise à jour, vous pouvez ignorer cet e-mail en toute sécurité.",
    locale
  );

  const ctaButton = t('Confirm profile update', 'Confirmer la mise à jour', locale);

  const normalizedConfirmUrl = normalizeHttpUrl(confirmUrl) || confirmUrl;

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#5c6675;">
      ${escapeHtml(securityNote)}
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${button(ctaButton, normalizedConfirmUrl, 'primary')}
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;text-align:center;color:#5c6675;">
      ${escapeHtml(expiryNote)}
    </p>
    ${divider}
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#68707f;">
      ${escapeHtml(ignoreText)}
    </p>
  `;

  const preheader = t(
    'Please confirm your profile update request.',
    'Veuillez confirmer votre demande de mise à jour de profil.',
    locale
  );

  const eyebrowText = t('PROFILE UPDATE CONFIRMATION', 'CONFIRMATION DE MISE À JOUR DU PROFIL', locale);

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
    </div>
  `;

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText1}

${securityNote}

${ctaButton}: ${normalizedConfirmUrl}

${expiryNote}

${ignoreText}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type ApplicantProfileUpdateConfirmedParams = {
  firstName: string;
  iRain: string;
  applicantKey?: string;
  locale?: 'en' | 'fr';
};

export function applicantProfileUpdateConfirmed(params: ApplicantProfileUpdateConfirmedParams): TemplateResult {
  const { firstName, iRain, applicantKey, locale = 'en' } = params;

  const subject = t(
    'Profile updated successfully - iRefair',
    'Profil mis à jour avec succès - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;

  const eyebrowText = t('PROFILE UPDATED', 'PROFIL MIS À JOUR', locale);
  const iRainLabel = t('iRAIN', 'iRAIN', locale);

  const mainText = t(
    "Your profile has been successfully updated. We've saved your changes and will use this updated information when matching you with referrers.",
    "Votre profil a été mis à jour avec succès. Nous avons enregistré vos modifications et utiliserons ces informations mises à jour pour vous mettre en relation avec des recommandateurs.",
    locale
  );

  const thankYouText = t(
    "Thank you for keeping your information current!",
    "Merci de maintenir vos informations à jour!",
    locale
  );

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText)}
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(thankYouText)}
    </p>
    ${applicantKeySection(applicantKey, locale)}
  `;

  const preheader = t(
    'Your profile update has been confirmed.',
    'Votre mise à jour de profil a été confirmée.',
    locale
  );

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRainLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRain)}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText}

${thankYouText}

${iRainLabel}: ${iRain}

${applicantKey ? `${t('Your Applicant Key', 'Votre clé de candidat', locale)}: ${applicantKey}\n${t('Keep this private. You\'ll need it to apply with your iRAIN.', 'Gardez ceci privé. Vous en aurez besoin pour postuler avec votre iRAIN.', locale)}\n` : ''}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

// ============================================================================
// REFERRER EMAIL TEMPLATES
// ============================================================================

type ReferrerRegistrationParams = {
  name: string;
  iRref: string;
  company: string;
  careersPortal?: string;
  industry: string;
  roles: string;
  regions: string;
  type: string;
  slots: string;
  locale?: 'en' | 'fr';
  portalUrl?: string;
};

export function referrerRegistrationConfirmation(params: ReferrerRegistrationParams): TemplateResult {
  const {
    name,
    iRref,
    company,
    careersPortal,
    industry,
    type,
    locale = 'en',
  } = params;

  const subject = t(
    `Thanks for offering referrals (${iRref} saved) - iRefair`,
    `Merci d'offrir des recommandations (${iRref} enregistré) - iRefair`,
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(name)},`;
  const thankYou = t(
    'thank you for offering referrals.',
    'merci d\'offrir des recommandations.',
    locale
  );

  const eyebrowText = t('THANKS FOR OFFERING REFERRALS', 'MERCI D\'OFFRIR DES RECOMMANDATIONS', locale);
  const iRrefLabel = t('iRREF', 'iRREF', locale);

  const mainText1 = t(
    "We appreciate your willingness to refer candidates. We'll reach out when we have someone who matches the teams and roles you cover.",
    "Nous apprécions votre volonté de recommander des candidats. Nous vous contacterons lorsque nous aurons quelqu'un qui correspond aux équipes et aux rôles que vous couvrez.",
    locale
  );

  const mainText2 = t(
    "Thank you for contributing to the community and helping others find work in Canada. You can reply to this email anytime to adjust your availability or update how you want to help.",
    "Merci de contribuer à la communauté et d'aider les autres à trouver du travail au Canada. Vous pouvez répondre à cet e-mail à tout moment pour ajuster votre disponibilité ou mettre à jour la façon dont vous souhaitez aider.",
    locale
  );

  const whatHappensTitle = t('WHAT HAPPENS NEXT', 'PROCHAINES ÉTAPES', locale);
  const step1 = t(
    "We review your details and iRREF to understand where you can help.",
    "Nous examinons vos détails et votre iRREF pour comprendre où vous pouvez aider.",
    locale
  );
  const step2 = t(
    "We keep you on our radar for teams, industries, and regions that match your snapshot.",
    "Nous vous gardons sur notre radar pour les équipes, industries et régions qui correspondent à votre profil.",
    locale
  );
  const step3 = t(
    "When an applicant applies to your company, you'll receive their details to review and refer.",
    "Lorsqu'un candidat postule auprès de votre entreprise, vous recevrez ses informations pour examen et recommandation.",
    locale
  );

  const snapshotTitle = t('SNAPSHOT YOU SHARED', 'PROFIL QUE VOUS AVEZ PARTAGÉ', locale);
  const companyLabel = t('Company', 'Entreprise', locale);
  const careersLabel = t('Careers Portal', 'Portail de carrières', locale);
  const industryLabel = t('Industry', 'Industrie', locale);
  const typeLabel = t('Referral type', 'Type de recommandation', locale);

  const notProvided = t('Not provided', 'Non fourni', locale);

  const ctaText1 = t(
    'Want to learn how we work or discuss how you can best support candidates?',
    'Vous voulez savoir comment nous travaillons ou discuter de la meilleure façon de soutenir les candidats?',
    locale
  );
  const ctaButton1 = t('Meet the founder', 'Rencontrer le fondateur', locale);

  const footerText1 = t(
    "You're receiving this because you offered to refer candidates on iRefair.",
    "Vous recevez ceci parce que vous avez offert de recommander des candidats sur iRefair.",
    locale
  );
  const footerText2 = t(
    "If this wasn't you, you can safely ignore this message.",
    "Si ce n'était pas vous, vous pouvez ignorer ce message en toute sécurité.",
    locale
  );

  const replyText = t(
    "Feel free to reply to this email if you have any questions.",
    "N'hésitez pas à répondre à cet e-mail si vous avez des questions.",
    locale
  );

  const meetLink = process.env.FOUNDER_MEET_LINK || '';
  const normalizedMeetLink = meetLink ? normalizeHttpUrl(meetLink) : null;

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting} ${thankYou}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 10px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText2)}
    </p>
  `;

  const whatHappensNext = `
    <div style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5c6675;font-weight:700;">${escapeHtml(whatHappensTitle)}</div>
    <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:#3b4251;">
      <li>${escapeHtml(step1)}</li>
      <li>${escapeHtml(step2)}</li>
      <li>${escapeHtml(step3)}</li>
    </ol>
  `;

  const careersPortalValue = careersPortal
    ? `<a href="${normalizeHttpUrl(careersPortal) || escapeHtml(careersPortal)}" style="color:#2f5fb3;text-decoration:underline;">${escapeHtml(careersPortal)}</a>`
    : escapeHtml(notProvided);

  const snapshot = snapshotCard(snapshotTitle, [
    [companyLabel, escapeHtml(company || notProvided)],
    [careersLabel, careersPortalValue],
    [industryLabel, escapeHtml(industry || notProvided)],
    [typeLabel, escapeHtml(type || notProvided)],
  ]);

  const cta = normalizedMeetLink ? `
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
      ${escapeHtml(ctaText1)}
    </p>
    <div style="text-align:center;margin:0 0 16px 0;">
      ${button(ctaButton1, normalizedMeetLink, 'primary')}
    </div>
  ` : '';

  const footer = `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e6e9f0;font-size:12px;line-height:1.6;color:#5c6675;">
      <p style="margin:0 0 8px 0;">${escapeHtml(footerText1)}</p>
      <p style="margin:0;">${escapeHtml(footerText2)}</p>
    </div>
  `;

  const preheader = t(
    'Thank you for offering referrals. Your iRREF is saved; we will reach out when we have a match.',
    'Merci d\'offrir des recommandations. Votre iRREF est enregistré; nous vous contacterons lorsque nous aurons une correspondance.',
    locale
  );

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRrefLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRref)}</strong></div>
    </div>
  `;

  const fullContent = `
    ${content}
    <div style="padding:6px 0 8px 0;">
      ${whatHappensNext}
    </div>
    <div style="padding:10px 0 8px 0;">
      ${snapshot}
    </div>
    <div style="padding:16px 0 4px 0;">
      ${cta}
    </div>
    ${footer}
  `;

  const html = emailWrapper(fullContent, preheader, customHeader);

  const text = `${greeting} ${thankYou}

${mainText1}

${mainText2}

${whatHappensTitle}
1) ${step1}
2) ${step2}
3) ${step3}

${snapshotTitle}
- ${companyLabel}: ${company || notProvided}
- ${careersLabel}: ${careersPortal || notProvided}
- ${industryLabel}: ${industry || notProvided}
- ${typeLabel}: ${type || notProvided}

${normalizedMeetLink ? `${ctaText1}\n${ctaButton1}: ${normalizedMeetLink}\n\n` : ''}${replyText}

${footerText1}
${footerText2}`;

  return { subject, html, text };
}

type ReferrerAlreadyExistsParams = {
  name: string;
  iRref: string;
  locale?: 'en' | 'fr';
  portalUrl?: string;
};

export function referrerAlreadyExistsEmail(params: ReferrerAlreadyExistsParams): TemplateResult {
  const { name, iRref, locale = 'en', portalUrl } = params;

  const subject = t(
    'Your iRREF is already registered - iRefair',
    'Votre iRREF est déjà enregistré - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(name)},`;
  const eyebrowText = t('REFERRER ALREADY REGISTERED', 'RÉFÉRENT DÉJÀ ENREGISTRÉ', locale);
  const iRrefLabel = t('iRREF', 'iRREF', locale);

  const mainText1 = t(
    "We received your referrer form submission. However, we found that you already have an iRREF registered with this email address.",
    "Nous avons reçu votre formulaire de recommandateur. Cependant, nous avons constaté que vous avez déjà un iRREF enregistré avec cette adresse e-mail.",
    locale
  );

  const mainText2 = t(
    "Our admin team will review the information you submitted. If you intended to update your details, we'll update your existing record accordingly.",
    "Notre équipe d'administration examinera les informations que vous avez soumises. Si vous avez l'intention de mettre à jour vos détails, nous mettrons à jour votre dossier existant en conséquence.",
    locale
  );

  const mainText3 = t(
    "If you have any questions or need immediate assistance with updating your information, please don't hesitate to contact our admin team directly.",
    "Si vous avez des questions ou si vous avez besoin d'une assistance immédiate pour mettre à jour vos informations, n'hésitez pas à contacter notre équipe d'administration directement.",
    locale
  );

  const contactLabel = t('Contact Admin', 'Contacter l\'administrateur', locale);
  const contactEmail = 'irefair.andbeyondconsulting@gmail.com';

  const portalCtaText = t(
    'Access your referrer portal',
    'Accéder à votre portail de recommandateur',
    locale
  );
  const portalCtaButton = t('Open portal', 'Ouvrir le portail', locale);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText2)}
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText3)}
    </p>
    ${normalizedPortalUrl ? `
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
        ${escapeHtml(portalCtaText)}
      </p>
      <div style="text-align:center;margin:0 0 20px 0;">
        ${button(portalCtaButton, normalizedPortalUrl, 'primary')}
      </div>
      ${divider}
    ` : ''}
    <div style="text-align:center;margin:0 0 20px 0;">
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;">
        ${escapeHtml(contactLabel)}:
      </p>
      <a href="mailto:${contactEmail}" style="display:inline-block;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:transparent;color:#1f2a37;border:2px solid #e6e9f0;">${contactEmail}</a>
    </div>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRrefLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRref)}</strong></div>
    </div>
  `;

  const preheader = t(
    'You already have an iRREF registered with this email. Our admin team will review your submission.',
    'Vous avez déjà un iRREF enregistré avec cet e-mail. Notre équipe d\'administration examinera votre soumission.',
    locale
  );

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText1}

${mainText2}

${mainText3}

${iRrefLabel}: ${iRref}

${normalizedPortalUrl ? `${portalCtaText}\n${portalCtaButton}: ${normalizedPortalUrl}\n\n` : ''}${contactLabel}: ${contactEmail}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type ReferrerNewCompanyParams = {
  name: string;
  iRref: string;
  newCompany: string;
  locale?: 'en' | 'fr';
  portalUrl?: string;
};

export function referrerNewCompanyEmail(params: ReferrerNewCompanyParams): TemplateResult {
  const { name, iRref, newCompany, locale = 'en', portalUrl } = params;

  const subject = t(
    'New company added to your referrer account - iRefair',
    'Nouvelle entreprise ajoutée à votre compte de recommandateur - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(name)},`;
  const eyebrowText = t('NEW COMPANY ADDED', 'NOUVELLE ENTREPRISE AJOUTÉE', locale);
  const iRrefLabel = t('iRREF', 'iRREF', locale);
  const companyLabel = t('New Company', 'Nouvelle entreprise', locale);

  const mainText1 = t(
    `We received your referrer form submission with a new company: ${newCompany}. This company has been added to your existing referrer account.`,
    `Nous avons reçu votre formulaire de recommandateur avec une nouvelle entreprise: ${newCompany}. Cette entreprise a été ajoutée à votre compte de recommandateur existant.`,
    locale
  );

  const mainText2 = t(
    "This new company is currently pending approval. Our admin team will review and approve it shortly. Once approved, candidates can apply through this company.",
    "Cette nouvelle entreprise est en attente d'approbation. Notre équipe d'administration l'examinera et l'approuvera sous peu. Une fois approuvée, les candidats pourront postuler via cette entreprise.",
    locale
  );

  const mainText3 = t(
    "If you have any questions or need immediate assistance, please don't hesitate to contact our admin team directly.",
    "Si vous avez des questions ou si vous avez besoin d'une assistance immédiate, n'hésitez pas à contacter notre équipe d'administration directement.",
    locale
  );

  const contactLabel = t('Contact Admin', 'Contacter l\'administrateur', locale);
  const contactEmail = 'irefair.andbeyondconsulting@gmail.com';

  const portalCtaText = t(
    'Access your referrer portal',
    'Accéder à votre portail de recommandateur',
    locale
  );
  const portalCtaButton = t('Open portal', 'Ouvrir le portail', locale);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText1)}
    </p>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText2)}
    </p>
    <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText3)}
    </p>
    ${normalizedPortalUrl ? `
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
        ${escapeHtml(portalCtaText)}
      </p>
      <div style="text-align:center;margin:0 0 20px 0;">
        ${button(portalCtaButton, normalizedPortalUrl, 'primary')}
      </div>
      ${divider}
    ` : ''}
    <div style="text-align:center;margin:0 0 20px 0;">
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;">
        ${escapeHtml(contactLabel)}:
      </p>
      <a href="mailto:${contactEmail}" style="display:inline-block;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:transparent;color:#1f2a37;border:2px solid #e6e9f0;">${contactEmail}</a>
    </div>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRrefLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRref)}</strong></div>
      <div style="font-size:13px;color:#1f2a37;margin-top:6px;">${companyLabel}: <strong style="color:#1f2a37;">${escapeHtml(newCompany)}</strong></div>
    </div>
  `;

  const preheader = t(
    `New company "${newCompany}" has been added to your referrer account and is pending approval.`,
    `La nouvelle entreprise "${newCompany}" a été ajoutée à votre compte de recommandateur et est en attente d'approbation.`,
    locale
  );

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText1}

${mainText2}

${mainText3}

${iRrefLabel}: ${iRref}
${companyLabel}: ${newCompany}

${normalizedPortalUrl ? `${portalCtaText}\n${portalCtaButton}: ${normalizedPortalUrl}\n\n` : ''}${contactLabel}: ${contactEmail}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

type ReferrerPortalLinkParams = {
  name: string;
  iRref: string;
  portalUrl: string;
  locale?: 'en' | 'fr';
};

export function referrerPortalLink(params: ReferrerPortalLinkParams): TemplateResult {
  const { name, iRref, portalUrl, locale = 'en' } = params;

  const subject = t(
    'Your referrer portal access - iRefair',
    'Accès à votre portail de recommandateur - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(name)},`;

  const eyebrowText = t('REFERRER PORTAL ACCESS', 'ACCÈS AU PORTAIL', locale);
  const iRrefLabel = t('iRREF', 'iRREF', locale);

  const mainText = t(
    "Here's your secure link to access your referrer portal. Use this link to manage your referrals, review applicants, and update your availability.",
    "Voici votre lien sécurisé pour accéder à votre portail de recommandateur. Utilisez ce lien pour gérer vos recommandations, examiner les candidats et mettre à jour votre disponibilité.",
    locale
  );

  const securityNote = t(
    "Keep this link private - it provides direct access to your portal.",
    "Gardez ce lien privé - il donne un accès direct à votre portail.",
    locale
  );

  const ctaButton = t('Open your portal', 'Ouvrir votre portail', locale);
  const fallbackText = t(
    "If the button doesn't work, copy and paste this URL into your browser:",
    "Si le bouton ne fonctionne pas, copiez et collez cette URL dans votre navigateur:",
    locale
  );

  const jobOpeningsText = t(
    'Want to see live job openings?',
    'Vous souhaitez voir les offres d\'emploi en direct?',
    locale
  );
  const jobOpeningsButton = t('View openings', 'Voir les offres', locale);

  const normalizedPortalUrl = normalizeHttpUrl(portalUrl) || portalUrl;
  const openingsUrl = normalizeHttpUrl(jobOpeningsUrl) || 'https://irefair.com/hiring-companies';

  const content = `
    <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.5;font-weight:700;color:#1f2a37;">
      ${greeting}
    </h1>
    <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#3b4251;">
      ${escapeHtml(mainText)}
    </p>
    <div style="text-align:center;margin:24px 0;">
      ${button(ctaButton, normalizedPortalUrl, 'primary')}
    </div>
    <div style="margin:20px 0;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e6e9f0;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#5c6675;">${escapeHtml(fallbackText)}</p>
      <p style="margin:0;font-size:12px;font-family:monospace;color:#1f2a37;word-break:break-all;background:#ffffff;padding:8px;border-radius:6px;">${escapeHtml(normalizedPortalUrl)}</p>
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#68707f;">
      ${escapeHtml(securityNote)}
    </p>
    ${divider}
    <p style="margin:16px 0 8px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
      ${escapeHtml(jobOpeningsText)}
    </p>
    <div style="text-align:center;margin:0 0 4px 0;">
      ${button(jobOpeningsButton, openingsUrl, 'outline')}
    </div>
  `;

  const preheader = t(
    'Access your referrer portal to manage referrals and review applicants.',
    'Accédez à votre portail de recommandateur pour gérer les recommandations et examiner les candidats.',
    locale
  );

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${escapeHtml(eyebrowText)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${iRrefLabel}: <strong style="color:#1f2a37;">${escapeHtml(iRref)}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, preheader, customHeader);

  const text = `${greeting}

${mainText}

${ctaButton}: ${normalizedPortalUrl}

${securityNote}

${jobOpeningsText}
${jobOpeningsButton}: ${openingsUrl}

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

  return { subject, html, text };
}

// ============================================================================
// EXISTING TEMPLATES (from original emailTemplates.ts)
// ============================================================================

export function meetFounderInvite(referrerName: string, irref: string, link?: string, portalUrl?: string, locale: 'en' | 'fr' = 'en'): TemplateResult {
  const subject = t(
    'Invitation: Meet the Founder at iRefair',
    'Invitation: Rencontrez le fondateur d\'iRefair',
    locale
  );
  const normalizedLink = link ? normalizeHttpUrl(link) : null;
  const joinLinkText = normalizedLink || t(
    'Schedule link not provided yet - we will follow up with a calendar invitation.',
    'Le lien n\'est pas encore disponible - nous vous enverrons une invitation calendrier.',
    locale
  );
  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi there,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi there,', 'Bonjour,', locale);
  const safeIrref = escapeHtml(irref);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const mainText = t(
    `Thank you for being part of the iRefair community (iRREF ${irref}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.`,
    `Merci de faire partie de la communauté iRefair (iRREF ${irref}). J'aimerais vous inviter à un bref appel pour en savoir plus sur vos recommandations et comment nous pouvons collaborer.`,
    locale
  );

  const meetLinkLabel = t('Meet link', 'Lien de réunion', locale);
  const unavailableLinkText = t(
    'If the link is unavailable, reply with your availability and we will send you a calendar invite.',
    'Si le lien n\'est pas disponible, répondez avec vos disponibilités et nous vous enverrons une invitation calendrier.',
    locale
  );
  const portalAccessText = t('Access your referrer portal', 'Accédez à votre portail de parrain', locale);
  const signoff = t('Founder, iRefair', 'Fondateur, iRefair', locale);

  const text = `${greeting}

${mainText}

${meetLinkLabel}: ${joinLinkText}

${unavailableLinkText}
${normalizedPortalUrl ? `\n${portalAccessText}: ${normalizedPortalUrl}\n` : ''}
- ${signoff}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('You\'re invited to meet!', 'Vous êtes invité à une rencontre!', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('A quick call to discuss collaboration', 'Un bref appel pour discuter de collaboration', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        'Thank you for being part of the iRefair community. I\'d like to invite you to a brief call to learn more about your referrals and how we can collaborate.',
        'Merci de faire partie de la communauté iRefair. J\'aimerais vous inviter à un bref appel pour en savoir plus sur vos recommandations et comment nous pouvons collaborer.',
        locale
      )}
    </p>

    ${divider}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
      ${infoRow(t('Your iRREF', 'Votre iRREF', locale), safeIrref)}
    </table>

    ${divider}

    ${normalizedLink ? `
      <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">${t('Join the meeting:', 'Rejoindre la réunion:', locale)}</p>
      <p style="margin: 0 0 24px 0;">
        ${button(t('Join Meeting', 'Rejoindre la réunion', locale), normalizedLink, 'primary')}
      </p>
    ` : `
      <p style="margin: 0 0 16px 0; color: ${colors.muted}; font-size: 14px; background: ${colors.background}; padding: 16px; border-radius: 10px;">
        ${t(
          'Schedule link not provided yet - reply with your availability and we\'ll send you a calendar invite.',
          'Le lien n\'est pas encore disponible - répondez avec vos disponibilités et nous vous enverrons une invitation calendrier.',
          locale
        )}
      </p>
    `}

    ${normalizedPortalUrl ? `
      ${divider}
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 15px; text-align: center;">${t('Access your referrer portal', 'Accédez à votre portail de parrain', locale)}</p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'outline')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best regards,', 'Cordialement,', locale)}<br>
      <strong>${t('Founder, iRefair', 'Fondateur, iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('FOUNDER MEETING INVITATION', 'INVITATION À RENCONTRER LE FONDATEUR', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRREF: <strong style="color:#1f2a37;">${safeIrref}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('You\'re invited to meet with the iRefair founder', 'Vous êtes invité à rencontrer le fondateur d\'iRefair', locale), customHeader);

  return { subject, text, html };
}

export function resumeRequest(applicantName: string, irain: string, locale: 'en' | 'fr' = 'en'): TemplateResult {
  const subject = t(
    'Please share your updated resume (iRefair)',
    'Veuillez partager votre CV mis à jour (iRefair)',
    locale
  );
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi there,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi there,', 'Bonjour,', locale);
  const safeIrain = escapeHtml(irain);

  const text = `${greeting}

${t(
  `Thanks for being part of iRefair (iRAIN ${irain}). Could you reply to this email with your latest resume or CV? This will help us share the most up-to-date profile with referrers.`,
  `Merci de faire partie d'iRefair (iRAIN ${irain}). Pourriez-vous répondre à ce courriel avec votre CV le plus récent? Cela nous aidera à partager le profil le plus à jour avec les parrains.`,
  locale
)}

- ${t('Founder, iRefair', 'Fondateur, iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Resume update request', 'Demande de mise à jour du CV', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Help us keep your profile current', 'Aidez-nous à garder votre profil à jour', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        'Thanks for being part of iRefair! To help connect you with the best opportunities, could you reply to this email with your latest resume or CV?',
        'Merci de faire partie d\'iRefair! Pour vous aider à trouver les meilleures opportunités, pourriez-vous répondre à ce courriel avec votre CV le plus récent?',
        locale
      )}
    </p>

    ${divider}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
      ${infoRow(t('Your iRAIN', 'Votre iRAIN', locale), safeIrain)}
    </table>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('How to submit:', 'Comment soumettre:', locale)}</p>
      <p style="margin: 0; color: ${colors.muted}; font-size: 14px; line-height: 1.5;">
        ${t(
          'Simply reply to this email with your resume attached (PDF preferred). We\'ll update your profile right away.',
          'Répondez simplement à ce courriel avec votre CV en pièce jointe (PDF de préférence). Nous mettrons à jour votre profil immédiatement.',
          locale
        )}
      </p>
    </div>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('Founder, iRefair', 'Fondateur, iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('RESUME UPDATE REQUEST', 'DEMANDE DE MISE À JOUR DU CV', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">${safeIrain}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('Please share your updated resume', 'Veuillez partager votre CV mis à jour', locale), customHeader);

  return { subject, text, html };
}

type FounderCvRequestParams = {
  applicantName?: string;
  applicantId: string;
  companyName?: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  uploadUrl: string;
  note?: string;
  locale?: 'en' | 'fr';
};

export function founderCvRequestToApplicant(params: FounderCvRequestParams): TemplateResult {
  const {
    applicantName,
    applicantId,
    companyName,
    companyIrcrn,
    position,
    referenceNumber,
    uploadUrl,
    note,
    locale = 'en',
  } = params;

  const subject = t(
    'Founder-initiated application: please upload your CV',
    'Candidature initiée par le fondateur : veuillez téléverser votre CV',
    locale,
  );
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantId = escapeHtml(applicantId);
  const safeCompany = companyName ? escapeHtml(companyName) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : '';
  const safePosition = position ? escapeHtml(position) : 'TBD';
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : 'TBD';
  const safeNote = note ? escapeHtml(note) : '';
  const normalizedUploadUrl = normalizeHttpUrl(uploadUrl) || uploadUrl;

  const displayCompany = safeCompany || safeIrcrn || t('the company', "l'entreprise", locale);

  const text = `${greeting}

${t(
  `The iRefair founder is preparing your application and needs your most recent CV. Please upload it using the secure link below.`,
  `Le fondateur iRefair prépare votre candidature et a besoin de votre CV le plus récent. Veuillez le téléverser via le lien sécurisé ci-dessous.`,
  locale,
)}

${t('Upload your CV', 'Téléverser votre CV', locale)}: ${normalizedUploadUrl}

${t('Applicant ID', 'ID du candidat', locale)}: ${applicantId}
${safeCompany ? `${t('Company', 'Entreprise', locale)}: ${companyName}` : ''}${safeIrcrn ? `\n${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: ${companyIrcrn}` : ''}
${t('Position', 'Poste', locale)}: ${safePosition}
${t('Reference #', 'Réf. #', locale)}: ${safeReference}
${note ? `\n${t('Note', 'Note', locale)}: ${note}` : ''}

- ${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('CV upload requested', 'Téléversement de CV demandé', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Founder-initiated application', 'Candidature initiée par le fondateur', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 18px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `The iRefair founder is preparing your application for <strong>${displayCompany}</strong> and needs your most recent CV.`,
        `Le fondateur iRefair prépare votre candidature pour <strong>${displayCompany}</strong> et a besoin de votre CV le plus récent.`,
        locale,
      )}
    </p>

    ${divider}

    ${snapshotCard(t('APPLICATION SNAPSHOT', 'RÉSUMÉ DE LA CANDIDATURE', locale), [
      [t('Applicant ID', 'ID du candidat', locale), safeApplicantId],
      [t('Company', 'Entreprise', locale), safeCompany || safeIrcrn || t('TBD', 'TBD', locale)],
      [t('Company iRCRN', "iRCRN de l'entreprise", locale), safeIrcrn || t('TBD', 'TBD', locale)],
      [t('Position', 'Poste', locale), safePosition],
      [t('Reference #', 'Réf. #', locale), safeReference],
    ])}

    ${safeNote ? `
      <div style="margin: 16px 0 0 0; padding: 14px 16px; border-radius: 12px; border-left: 4px solid ${colors.secondary}; background: ${colors.background};">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${colors.ink};">${t('Note from iRefair', "Note d'iRefair", locale)}</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeNote}</p>
      </div>
    ` : ''}

    <p style="margin: 22px 0 12px 0; text-align: center;">
      ${button(t('Upload CV', 'Téléverser le CV', locale), normalizedUploadUrl, 'primary')}
    </p>

    <p style="margin: 18px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('FOUNDER-INITIATED REQUEST', 'DEMANDE INITIÉE PAR LE FONDATEUR', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${t('Applicant ID', 'ID du candidat', locale)}: <strong style="color:#1f2a37;">${safeApplicantId}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('Upload your CV to proceed', 'Téléversez votre CV pour continuer', locale), customHeader);

  return { subject, text, html };
}

type FounderCvConfirmationParams = {
  applicantName?: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  locale?: 'en' | 'fr';
};

export function founderCvUploadConfirmationToApplicant(params: FounderCvConfirmationParams): TemplateResult {
  const { applicantName, companyIrcrn, position, referenceNumber, locale = 'en' } = params;

  const subject = t(
    'CV received - founder-initiated application',
    'CV reçu - candidature initiée par le fondateur',
    locale,
  );
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safePosition = position ? escapeHtml(position) : 'TBD';
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : 'TBD';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : 'TBD';

  const text = `${greeting}

${t(
  'We received your CV. The iRefair founder has been notified and will create your application next.',
  'Nous avons bien reçu votre CV. Le fondateur iRefair a été notifié et créera votre candidature.',
  locale,
)}

${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: ${safeIrcrn}
${t('Position', 'Poste', locale)}: ${safePosition}
${t('Reference #', 'Réf. #', locale)}: ${safeReference}

- ${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('CV received', 'CV reçu', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Founder-initiated application', 'Candidature initiée par le fondateur', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 18px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        'We received your CV. The iRefair founder has been notified and will create your application next.',
        'Nous avons bien reçu votre CV. Le fondateur iRefair a été notifié et créera votre candidature.',
        locale,
      )}
    </p>

    ${snapshotCard(t('APPLICATION SNAPSHOT', 'RÉSUMÉ DE LA CANDIDATURE', locale), [
      [t('Company iRCRN', "iRCRN de l'entreprise", locale), safeIrcrn],
      [t('Position', 'Poste', locale), safePosition],
      [t('Reference #', 'Réf. #', locale), safeReference],
    ])}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('CV RECEIVED', 'CV REÇU', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Your CV was received', 'Votre CV a été reçu', locale), customHeader);

  return { subject, text, html };
}

type FounderCvFounderNotificationParams = {
  applicantName: string;
  applicantEmail?: string;
  applicantId: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  resumeFileName?: string;
};

export function founderCvReceivedToFounder(params: FounderCvFounderNotificationParams): TemplateResult {
  const {
    applicantName,
    applicantEmail,
    applicantId,
    companyIrcrn,
    position,
    referenceNumber,
    resumeFileName,
  } = params;

  const subject = `CV received: ${applicantName} ready for application`;
  const safeApplicantName = escapeHtml(applicantName);
  const safeApplicantId = escapeHtml(applicantId);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : 'TBD';
  const safePosition = position ? escapeHtml(position) : 'TBD';
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : 'TBD';
  const safeResume = resumeFileName ? escapeHtml(resumeFileName) : 'Updated CV';

  const text = `CV received for a founder-initiated application.

Applicant: ${applicantName}
Applicant ID: ${applicantId}
Applicant email: ${applicantEmail || 'N/A'}
Company iRCRN: ${companyIrcrn || 'TBD'}
Position: ${safePosition}
Reference #: ${safeReference}
Resume: ${resumeFileName || 'Updated CV'}

Create the application from the founder console when ready.`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">CV received</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Founder-initiated application ready</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      <strong>${safeApplicantName}</strong> uploaded a CV. You can now create the application from the founder console.
    </p>

    ${snapshotCard('APPLICATION SNAPSHOT', [
      ['Applicant', safeApplicantName],
      ['Applicant ID', safeApplicantId],
      ['Applicant email', safeApplicantEmail || 'N/A'],
      ['Company iRCRN', safeIrcrn],
      ['Position', safePosition],
      ['Reference #', safeReference],
      ['Resume', safeResume],
    ])}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      The iRefair system
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">FOUNDER-INITIATED CV RECEIVED</div>
    </div>
  `;

  const html = emailWrapper(content, `CV received for ${applicantName}`, customHeader);

  return { subject, text, html };
}

type FounderCvRequestSentParams = {
  applicantName: string;
  applicantEmail?: string;
  applicantId: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  uploadUrl?: string;
  note?: string;
};

export function founderCvRequestSentToFounder(params: FounderCvRequestSentParams): TemplateResult {
  const {
    applicantName,
    applicantEmail,
    applicantId,
    companyIrcrn,
    position,
    referenceNumber,
    uploadUrl,
    note,
  } = params;

  const subject = `CV request sent: ${applicantName}`;
  const safeApplicantName = escapeHtml(applicantName);
  const safeApplicantId = escapeHtml(applicantId);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : 'TBD';
  const safePosition = position ? escapeHtml(position) : 'TBD';
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : 'TBD';
  const safeNote = note ? escapeHtml(note) : '';
  const normalizedUploadUrl = uploadUrl ? normalizeHttpUrl(uploadUrl) || uploadUrl : '';

  const text = `Founder-initiated CV request sent.

Applicant: ${applicantName}
Applicant ID: ${applicantId}
Applicant email: ${applicantEmail || 'N/A'}
Company iRCRN: ${companyIrcrn || 'TBD'}
Position: ${safePosition}
Reference #: ${safeReference}
Upload link: ${normalizedUploadUrl || 'N/A'}
${note ? `Note: ${note}
` : ''}We'll notify you when the CV is uploaded.`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">CV request sent</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Founder-initiated application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      We sent a secure CV upload link to <strong>${safeApplicantName}</strong>. We'll notify you when the CV is uploaded.
    </p>

    ${snapshotCard('REQUEST DETAILS', [
      ['Applicant', safeApplicantName],
      ['Applicant ID', safeApplicantId],
      ['Applicant email', safeApplicantEmail || 'N/A'],
      ['Company iRCRN', safeIrcrn],
      ['Position', safePosition],
      ['Reference #', safeReference],
      ['Upload link', normalizedUploadUrl ? `<a href="${escapeHtml(normalizedUploadUrl)}" style="color:${colors.primary};">${escapeHtml(normalizedUploadUrl)}</a>` : 'N/A'],
    ])}

    ${safeNote ? `
      <div style="margin: 16px 0 0 0; padding: 14px 16px; border-radius: 12px; border-left: 4px solid ${colors.secondary}; background: ${colors.background};">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: ${colors.ink};">Note</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeNote}</p>
      </div>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      The iRefair system
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">FOUNDER-INITIATED CV REQUEST</div>
    </div>
  `;

  const html = emailWrapper(content, `CV request sent for ${applicantName}`, customHeader);

  return { subject, text, html };
}




type FounderInitiatedApplicationApplicantParams = {
  applicantName?: string;
  applicantEmail?: string;
  applicantId: string;
  companyName?: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  submissionId: string;
  locale?: 'en' | 'fr';
};

export function founderInitiatedApplicationToApplicant(
  params: FounderInitiatedApplicationApplicantParams,
): TemplateResult {
  const {
    applicantName,
    applicantId,
    companyName,
    companyIrcrn,
    position,
    referenceNumber,
    submissionId,
    locale = 'en',
  } = params;

  const displayCompany = companyName || companyIrcrn || t('the company', "l'entreprise", locale);
  const subject = t(
    `Founder-initiated application submitted (iRefair): ${displayCompany}`,
    `Candidature initiée par le fondateur (iRefair) : ${displayCompany}`,
    locale,
  );
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantId = escapeHtml(applicantId);
  const safeCompany = displayCompany ? escapeHtml(displayCompany) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : t('TBD', 'TBD', locale);
  const safePosition = position ? escapeHtml(position) : t('TBD', 'TBD', locale);
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : t('TBD', 'TBD', locale);
  const safeSubmissionId = escapeHtml(submissionId);

  const text = `${greeting}

${t(
  `The iRefair founder has created and submitted an application on your behalf for ${displayCompany}.`,
  `Le fondateur iRefair a créé et soumis une candidature en votre nom pour ${displayCompany}.`,
  locale,
)}

${t('Application summary:', 'Résumé de la candidature :', locale)}
- ${t('Submission ID', 'ID de soumission', locale)}: ${submissionId}
- ${t('Your iRAIN', 'Votre iRAIN', locale)}: ${applicantId}
- ${t('Company', 'Entreprise', locale)}: ${displayCompany}
- ${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: ${companyIrcrn || 'TBD'}
- ${t('Position', 'Poste', locale)}: ${position || 'TBD'}
- ${t('Reference #', 'Réf. #', locale)}: ${referenceNumber || 'TBD'}

${t(
  "A referrer at the company will review your profile. If there's a match, you'll be contacted by email.",
  "Un référent de l'entreprise examinera votre profil. S'il y a correspondance, vous serez contacté par courriel.",
  locale,
)}

- ${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Application created', 'Candidature créée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Founder-initiated application', 'Candidature initiée par le fondateur', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `The iRefair founder has created and submitted an application on your behalf for <strong>${safeCompany}</strong>.`,
        `Le fondateur iRefair a créé et soumis une candidature en votre nom pour <strong>${safeCompany}</strong>.`,
        locale,
      )}
    </p>

    ${divider}

    ${snapshotCard(t('APPLICATION SUMMARY', 'RÉSUMÉ DE LA CANDIDATURE', locale), [
      [t('Submission ID', 'ID de soumission', locale), safeSubmissionId],
      [t('Your iRAIN', 'Votre iRAIN', locale), safeApplicantId],
      [t('Company', 'Entreprise', locale), safeCompany],
      [t('Company iRCRN', "iRCRN de l'entreprise", locale), safeIrcrn],
      [t('Position', 'Poste', locale), safePosition],
      [t('Reference #', 'Réf. #', locale), safeReference],
    ])}

    <p style="margin: 18px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        "A referrer at the company will review your profile. If there's a match, you'll be contacted by email.",
        "Un référent de l'entreprise examinera votre profil. S'il y a correspondance, vous serez contacté par courriel.",
        locale,
      )}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('FOUNDER-INITIATED APPLICATION', 'CANDIDATURE INITIÉE PAR LE FONDATEUR', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${t('Your iRAIN', 'Votre iRAIN', locale)}: <strong style="color:#1f2a37;">${safeApplicantId}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('Founder-initiated application submitted', 'Candidature initiée par le fondateur', locale), customHeader);

  return { subject, text, html };
}

type FounderInitiatedApplicationReferrerParams = {
  referrerName?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantId: string;
  iCrn: string;
  companyName?: string;
  position?: string;
  referenceNumber?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function founderInitiatedApplicationToReferrer(
  params: FounderInitiatedApplicationReferrerParams,
): TemplateResult {
  const {
    referrerName,
    applicantName,
    applicantEmail,
    applicantPhone,
    applicantId,
    iCrn,
    companyName,
    position,
    referenceNumber,
    resumeUrl,
    resumeFileName,
    portalUrl,
    locale = 'en',
  } = params;

  const displayCompany = companyName || iCrn;
  const subject = t(
    `Founder-initiated application to review: ${applicantName || 'Applicant'}`,
    `Candidature initiée par le fondateur à examiner : ${applicantName || 'Candidat'}`,
    locale,
  );
  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('The applicant', 'Le candidat', locale);
  const safeApplicantId = escapeHtml(applicantId);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeApplicantPhone = applicantPhone ? escapeHtml(applicantPhone) : '';
  const safeCompanyName = companyName ? escapeHtml(companyName) : escapeHtml(displayCompany);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = position ? escapeHtml(position) : t('TBD', 'TBD', locale);
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : t('TBD', 'TBD', locale);
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;
  const displayResumeName = resumeFileName ? escapeHtml(resumeFileName) : t('Resume', 'CV', locale);

  const text = `${greeting}

${t(
  `The iRefair founder created an application on behalf of ${applicantName || 'an applicant'} at ${displayCompany}.`,
  `Le fondateur iRefair a créé une candidature au nom de ${applicantName || 'un candidat'} chez ${displayCompany}.`,
  locale,
)}

${t('Applicant details:', 'Détails du candidat :', locale)}
- ${t('Name', 'Nom', locale)}: ${applicantName || 'N/A'}
- ${t('Applicant ID', 'ID du candidat', locale)}: ${applicantId}
- ${t('Email', 'Courriel', locale)}: ${applicantEmail || 'N/A'}
- ${t('Phone', 'Téléphone', locale)}: ${applicantPhone || 'N/A'}

${t('Application details:', 'Détails de la candidature :', locale)}
- ${t('Company', 'Entreprise', locale)}: ${displayCompany}
- ${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: ${iCrn}
- ${t('Position', 'Poste', locale)}: ${position || 'TBD'}
- ${t('Reference #', 'Réf. #', locale)}: ${referenceNumber || 'TBD'}
- ${t('Resume', 'CV', locale)}: ${resumeFileName || 'N/A'}

${normalizedPortalUrl
  ? t(`Open your portal to review: ${normalizedPortalUrl}`, `Ouvrez votre portail pour examiner : ${normalizedPortalUrl}`, locale)
  : t('Please log in to your portal to review this application.', 'Veuillez vous connecter à votre portail pour examiner cette candidature.', locale)}

- ${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('New application to review', 'Nouvelle candidature à examiner', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Founder-initiated application', 'Candidature initiée par le fondateur', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `The iRefair founder created an application on behalf of <strong>${safeApplicantName}</strong> at <strong>${safeCompanyName}</strong>.`,
        `Le fondateur iRefair a créé une candidature au nom de <strong>${safeApplicantName}</strong> chez <strong>${safeCompanyName}</strong>.`,
        locale,
      )}
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Applicant Information', 'Information sur le candidat', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Name', 'Nom', locale), safeApplicantName)}
        ${safeApplicantEmail ? infoRow(t('Email', 'Courriel', locale), `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${safeApplicantPhone ? infoRow(t('Phone', 'Téléphone', locale), safeApplicantPhone) : ''}
        ${infoRow(t('Applicant ID', 'ID du candidat', locale), safeApplicantId)}
      </table>
    </div>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Application Details', 'Détails de la candidature', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Company', 'Entreprise', locale), safeCompanyName)}
        ${infoRow(t('Company iRCRN', "iRCRN de l'entreprise", locale), safeIrcrn)}
        ${infoRow(t('Position', 'Poste', locale), safePosition)}
        ${infoRow(t('Reference #', 'Réf. #', locale), safeReference)}
        ${infoRow(t('Resume', 'CV', locale), normalizedResumeUrl ? `<a href="${escapeHtml(normalizedResumeUrl)}" target="_blank" style="color: ${colors.primary};">${displayResumeName}</a>` : `<span style="color: ${colors.muted};">${t('Not provided', 'Non fourni', locale)}</span>`)}
      </table>
    </div>

    ${normalizedResumeUrl ? `
      <p style="margin: 12px 0; text-align: center;">
        ${button(t('View Resume', 'Voir le CV', locale), normalizedResumeUrl, 'secondary')}
      </p>
    ` : ''}

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        ${t('Open your portal to review this application', 'Ouvrez votre portail pour examiner cette candidature', locale)}
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'primary')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('FOUNDER-INITIATED APPLICATION', 'CANDIDATURE INITIÉE PAR LE FONDATEUR', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: <strong style="color:#1f2a37;">${safeIrcrn}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('Founder-initiated application received', 'Candidature initiée par le fondateur', locale), customHeader);

  return { subject, text, html };
}

type FounderInitiatedApplicationFounderParams = {
  applicantName: string;
  applicantEmail?: string;
  applicantId: string;
  companyName?: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  submissionId: string;
  resumeFileName?: string;
};

export function founderInitiatedApplicationToFounder(
  params: FounderInitiatedApplicationFounderParams,
): TemplateResult {
  const {
    applicantName,
    applicantEmail,
    applicantId,
    companyName,
    companyIrcrn,
    position,
    referenceNumber,
    submissionId,
    resumeFileName,
  } = params;

  const subject = `Founder-initiated application created: ${applicantName}`;
  const safeApplicantName = escapeHtml(applicantName);
  const safeApplicantId = escapeHtml(applicantId);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeCompany = companyName ? escapeHtml(companyName) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : 'TBD';
  const safePosition = position ? escapeHtml(position) : 'TBD';
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : 'TBD';
  const safeSubmissionId = escapeHtml(submissionId);
  const safeResume = resumeFileName ? escapeHtml(resumeFileName) : 'Resume';

  const text = `Founder-initiated application created.

Applicant: ${applicantName}
Applicant ID: ${applicantId}
Applicant email: ${applicantEmail || 'N/A'}
Company: ${companyName || 'N/A'}
Company iRCRN: ${companyIrcrn || 'TBD'}
Position: ${position || 'TBD'}
Reference #: ${referenceNumber || 'TBD'}
Submission ID: ${submissionId}
Resume: ${resumeFileName || 'Resume'}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Application created</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Founder-initiated application</p>

    ${snapshotCard('APPLICATION SUMMARY', [
      ['Applicant', safeApplicantName],
      ['Applicant ID', safeApplicantId],
      ['Applicant email', safeApplicantEmail || 'N/A'],
      ['Company', safeCompany || 'N/A'],
      ['Company iRCRN', safeIrcrn],
      ['Position', safePosition],
      ['Reference #', safeReference],
      ['Submission ID', safeSubmissionId],
      ['Resume', safeResume],
    ])}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      The iRefair system
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">FOUNDER-INITIATED APPLICATION CREATED</div>
    </div>
  `;

  const html = emailWrapper(content, `Founder-initiated application for ${applicantName}`, customHeader);

  return { subject, text, html };
}

type FounderInitiatedArchiveApplicantParams = {
  applicantName?: string;
  applicantId: string;
  companyName?: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  submissionId: string;
  reason: string;
  locale?: 'en' | 'fr';
};

export function founderInitiatedApplicationArchivedToApplicant(
  params: FounderInitiatedArchiveApplicantParams,
): TemplateResult {
  const {
    applicantName,
    applicantId,
    companyName,
    companyIrcrn,
    position,
    referenceNumber,
    submissionId,
    reason,
    locale = 'en',
  } = params;

  const displayCompany = companyName || companyIrcrn || t('the company', "l'entreprise", locale);
  const subject = t(
    `Founder-initiated application archived: ${displayCompany}`,
    `Candidature initiée par le fondateur archivée : ${displayCompany}`,
    locale,
  );
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantId = escapeHtml(applicantId);
  const safeCompany = displayCompany ? escapeHtml(displayCompany) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : t('TBD', 'TBD', locale);
  const safePosition = position ? escapeHtml(position) : t('TBD', 'TBD', locale);
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : t('TBD', 'TBD', locale);
  const safeSubmissionId = escapeHtml(submissionId);
  const safeReason = escapeHtml(reason);

  const text = `${greeting}

${t(
  `The iRefair founder archived this founder-initiated application for ${displayCompany}.`,
  `Le fondateur iRefair a archivé cette candidature initiée par le fondateur pour ${displayCompany}.`,
  locale,
)}

${t('Reason:', 'Raison :', locale)} ${reason}

${t('Application summary:', 'Résumé de la candidature :', locale)}
- ${t('Submission ID', 'ID de soumission', locale)}: ${submissionId}
- ${t('Your iRAIN', 'Votre iRAIN', locale)}: ${applicantId}
- ${t('Company', 'Entreprise', locale)}: ${displayCompany}
- ${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: ${companyIrcrn || 'TBD'}
- ${t('Position', 'Poste', locale)}: ${position || 'TBD'}
- ${t('Reference #', 'Réf. #', locale)}: ${referenceNumber || 'TBD'}

- ${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Application archived', 'Candidature archivée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Founder-initiated application archived', 'Candidature initiée par le fondateur archivée', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `The iRefair founder archived this founder-initiated application for <strong>${safeCompany}</strong>.`,
        `Le fondateur iRefair a archivé cette candidature initiée par le fondateur pour <strong>${safeCompany}</strong>.`,
        locale,
      )}
    </p>

    <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
      <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Reason', 'Raison', locale)}</p>
      <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
    </div>

    ${snapshotCard(t('APPLICATION SUMMARY', 'RÉSUMÉ DE LA CANDIDATURE', locale), [
      [t('Submission ID', 'ID de soumission', locale), safeSubmissionId],
      [t('Your iRAIN', 'Votre iRAIN', locale), safeApplicantId],
      [t('Company', 'Entreprise', locale), safeCompany],
      [t('Company iRCRN', "iRCRN de l'entreprise", locale), safeIrcrn],
      [t('Position', 'Poste', locale), safePosition],
      [t('Reference #', 'Réf. #', locale), safeReference],
    ])}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('APPLICATION ARCHIVED', 'CANDIDATURE ARCHIVÉE', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${t('Your iRAIN', 'Votre iRAIN', locale)}: <strong style="color:#1f2a37;">${safeApplicantId}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('Application archived', 'Candidature archivée', locale), customHeader);

  return { subject, text, html };
}

type FounderInitiatedArchiveReferrerParams = {
  referrerName?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantId: string;
  companyName?: string;
  iCrn: string;
  position?: string;
  referenceNumber?: string;
  submissionId: string;
  reason: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function founderInitiatedApplicationArchivedToReferrer(
  params: FounderInitiatedArchiveReferrerParams,
): TemplateResult {
  const {
    referrerName,
    applicantName,
    applicantEmail,
    applicantId,
    companyName,
    iCrn,
    position,
    referenceNumber,
    submissionId,
    reason,
    portalUrl,
    locale = 'en',
  } = params;

  const displayCompany = companyName || iCrn;
  const subject = t(
    `Founder-initiated application archived: ${applicantName || 'Applicant'} at ${displayCompany}`,
    `Candidature initiée par le fondateur archivée : ${applicantName || 'Candidat'} chez ${displayCompany}`,
    locale,
  );
  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('The applicant', 'Le candidat', locale);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeApplicantId = escapeHtml(applicantId);
  const safeCompany = companyName ? escapeHtml(companyName) : escapeHtml(displayCompany);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = position ? escapeHtml(position) : t('TBD', 'TBD', locale);
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : t('TBD', 'TBD', locale);
  const safeSubmissionId = escapeHtml(submissionId);
  const safeReason = escapeHtml(reason);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const text = `${greeting}

${t(
  `The iRefair founder archived this founder-initiated application for ${applicantName || 'an applicant'} at ${displayCompany}.`,
  `Le fondateur iRefair a archivé cette candidature initiée par le fondateur pour ${applicantName || 'un candidat'} chez ${displayCompany}.`,
  locale,
)}

${t('Reason:', 'Raison :', locale)} ${reason}

${t('Application summary:', 'Résumé de la candidature :', locale)}
- ${t('Submission ID', 'ID de soumission', locale)}: ${submissionId}
- ${t('Applicant ID', 'ID du candidat', locale)}: ${applicantId}
- ${t('Company', 'Entreprise', locale)}: ${displayCompany}
- ${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: ${iCrn}
- ${t('Position', 'Poste', locale)}: ${position || 'TBD'}
- ${t('Reference #', 'Réf. #', locale)}: ${referenceNumber || 'TBD'}

${normalizedPortalUrl
  ? t(`Open your portal: ${normalizedPortalUrl}`, `Ouvrez votre portail : ${normalizedPortalUrl}`, locale)
  : t('Please log in to your portal for the latest updates.', 'Veuillez vous connecter à votre portail pour les dernières mises à jour.', locale)}

- ${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Application archived', 'Candidature archivée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Founder-initiated application archived', 'Candidature initiée par le fondateur archivée', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `The iRefair founder archived this founder-initiated application for <strong>${safeApplicantName}</strong> at <strong>${safeCompany}</strong>.`,
        `Le fondateur iRefair a archivé cette candidature initiée par le fondateur pour <strong>${safeApplicantName}</strong> chez <strong>${safeCompany}</strong>.`,
        locale,
      )}
    </p>

    <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
      <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Reason', 'Raison', locale)}</p>
      <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
    </div>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Application Details', 'Détails de la candidature', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Applicant', 'Candidat', locale), safeApplicantName)}
        ${safeApplicantEmail ? infoRow(t('Email', 'Courriel', locale), `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${infoRow(t('Applicant ID', 'ID du candidat', locale), safeApplicantId)}
        ${infoRow(t('Company', 'Entreprise', locale), safeCompany)}
        ${infoRow(t('Company iRCRN', "iRCRN de l'entreprise", locale), safeIrcrn)}
        ${infoRow(t('Position', 'Poste', locale), safePosition)}
        ${infoRow(t('Reference #', 'Réf. #', locale), safeReference)}
        ${infoRow(t('Submission ID', 'ID de soumission', locale), safeSubmissionId)}
      </table>
    </div>

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        ${t('Open your portal for the latest updates', 'Ouvrez votre portail pour les dernières mises à jour', locale)}
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'primary')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('APPLICATION ARCHIVED', 'CANDIDATURE ARCHIVÉE', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${t('Company iRCRN', "iRCRN de l'entreprise", locale)}: <strong style="color:#1f2a37;">${safeIrcrn}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t('Application archived', 'Candidature archivée', locale), customHeader);

  return { subject, text, html };
}

type FounderInitiatedArchiveFounderParams = {
  applicantName: string;
  applicantEmail?: string;
  applicantId: string;
  companyName?: string;
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  submissionId: string;
  reason: string;
  referrerIrref?: string;
  referrerEmail?: string;
};

export function founderInitiatedApplicationArchivedToFounder(
  params: FounderInitiatedArchiveFounderParams,
): TemplateResult {
  const {
    applicantName,
    applicantEmail,
    applicantId,
    companyName,
    companyIrcrn,
    position,
    referenceNumber,
    submissionId,
    reason,
    referrerIrref,
    referrerEmail,
  } = params;

  const subject = `Application archived: ${applicantName}`;
  const safeApplicantName = escapeHtml(applicantName);
  const safeApplicantId = escapeHtml(applicantId);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeCompany = companyName ? escapeHtml(companyName) : '';
  const safeIrcrn = companyIrcrn ? escapeHtml(companyIrcrn) : 'TBD';
  const safePosition = position ? escapeHtml(position) : 'TBD';
  const safeReference = referenceNumber ? escapeHtml(referenceNumber) : 'TBD';
  const safeSubmissionId = escapeHtml(submissionId);
  const safeReason = escapeHtml(reason);
  const safeReferrer = referrerIrref ? escapeHtml(referrerIrref) : '';
  const safeReferrerEmail = referrerEmail ? escapeHtml(referrerEmail) : '';

  const text = `Founder-initiated application archived.

Applicant: ${applicantName}
Applicant ID: ${applicantId}
Applicant email: ${applicantEmail || 'N/A'}
Company: ${companyName || 'N/A'}
Company iRCRN: ${companyIrcrn || 'TBD'}
Position: ${position || 'TBD'}
Reference #: ${referenceNumber || 'TBD'}
Submission ID: ${submissionId}
Referrer iRREF: ${referrerIrref || 'N/A'}
Referrer email: ${referrerEmail || 'N/A'}
Reason: ${reason}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Application archived</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Founder-initiated application correction</p>

    <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 0 0 16px 0; border-left: 4px solid ${colors.secondary};">
      <p style="margin: 0 0 6px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Reason</p>
      <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
    </div>

    ${snapshotCard('APPLICATION SUMMARY', [
      ['Applicant', safeApplicantName],
      ['Applicant ID', safeApplicantId],
      ['Applicant email', safeApplicantEmail || 'N/A'],
      ['Company', safeCompany || 'N/A'],
      ['Company iRCRN', safeIrcrn],
      ['Position', safePosition],
      ['Reference #', safeReference],
      ['Submission ID', safeSubmissionId],
      ['Referrer iRREF', safeReferrer || 'N/A'],
      ['Referrer email', safeReferrerEmail || 'N/A'],
    ])}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      The iRefair system
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">FOUNDER-INITIATED APPLICATION ARCHIVED</div>
    </div>
  `;

  const html = emailWrapper(content, `Application archived for ${applicantName}`, customHeader);

  return { subject, text, html };
}
export function matchIntro(
  applicantName: string,
  referrerName: string,
  irain: string,
  ircrn: string,
  position: string,
  locale: 'en' | 'fr' = 'en',
): TemplateResult {
  const subject = t('Introduction via iRefair', 'Présentation via iRefair', locale);
  const introApplicant = applicantName || t('Applicant', 'Candidat', locale);
  const introReferrer = referrerName || t('Referrer', 'Parrain', locale);
  const introApplicantHtml = escapeHtml(introApplicant);
  const introReferrerHtml = escapeHtml(introReferrer);
  const safeIrain = escapeHtml(irain);
  const safeIrcrn = escapeHtml(ircrn);
  const safePosition = position ? escapeHtml(position) : t('Not specified', 'Non spécifié', locale);

  const text = `${t('Hello', 'Bonjour', locale)} ${introApplicant} ${t('and', 'et', locale)} ${introReferrer},

${t(
  'I\'m connecting you via iRefair for the role/context noted below.',
  'Je vous mets en contact via iRefair pour le poste/contexte indiqué ci-dessous.',
  locale
)}

- ${t('Applicant iRAIN', 'iRAIN du candidat', locale)}: ${irain}
- ${t('Company iRCRN', 'iRCRN de l\'entreprise', locale)}: ${ircrn}
- ${t('Position / Context', 'Poste / Contexte', locale)}: ${position || t('Not specified', 'Non spécifié', locale)}

${t(
  'Please take the conversation forward and let us know if you need anything else.',
  'Veuillez poursuivre la conversation et faites-nous savoir si vous avez besoin de quoi que ce soit.',
  locale
)}

- ${t('Founder, iRefair', 'Fondateur, iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('You\'ve been connected!', 'Vous êtes maintenant en contact!', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('A new introduction via iRefair', 'Une nouvelle présentation via iRefair', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t('Hello', 'Bonjour', locale)} <strong>${introApplicantHtml}</strong> ${t('and', 'et', locale)} <strong>${introReferrerHtml}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        'I\'m connecting you for the opportunity below. Please take the conversation forward - I\'m confident this could be a great match!',
        'Je vous mets en contact pour l\'opportunité ci-dessous. Veuillez poursuivre la conversation - je suis convaincu que cela pourrait être une excellente correspondance!',
        locale
      )}
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Connection Details', 'Détails de la mise en contact', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Position', 'Poste', locale), safePosition)}
        ${infoRow(t('Applicant iRAIN', 'iRAIN du candidat', locale), safeIrain)}
        ${infoRow(t('Company iRCRN', 'iRCRN de l\'entreprise', locale), safeIrcrn)}
      </table>
    </div>

    ${divider}

    <p style="margin: 0 0 8px 0; color: ${colors.muted}; font-size: 14px;">
      <strong>${t('Next steps:', 'Prochaines étapes:', locale)}</strong> ${t('Reply-all to this email to start the conversation.', 'Répondez à tous à ce courriel pour commencer la conversation.', locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best of luck,', 'Bonne chance,', locale)}<br>
      <strong>${t('Founder, iRefair', 'Fondateur, iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('MATCH INTRODUCTION', 'PRÉSENTATION DE CORRESPONDANCE', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">${safeIrain}</strong> - iRCRN: <strong style="color:#1f2a37;">${safeIrcrn}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t(`You've been connected: ${introApplicant} meet ${introReferrer}`, `Vous êtes en contact: ${introApplicant} rencontre ${introReferrer}`, locale), customHeader);

  return { subject, text, html };
}

type ReferrerApplicationParams = {
  referrerName?: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantId: string;
  iCrn: string;
  companyName?: string;
  position: string;
  resumeUrl?: string;
  resumeFileName?: string;
  referenceNumber?: string;
  feedbackApproveUrl?: string;
  feedbackDeclineUrl?: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function applicationSubmittedToReferrer(params: ReferrerApplicationParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    applicantEmail,
    applicantPhone,
    applicantId,
    iCrn,
    companyName,
    position,
    resumeUrl,
    resumeFileName,
    referenceNumber,
    feedbackApproveUrl,
    feedbackDeclineUrl,
    portalUrl,
    locale = 'en',
  } = params;

  const displayCompany = companyName || iCrn;
  const subject = t(
    `New application for ${position} at ${displayCompany}`,
    `Nouvelle candidature pour ${position} chez ${displayCompany}`,
    locale
  );
  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const displayResumeName = resumeFileName || t('Resume', 'CV', locale);
  const safeGreetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const safeApplicantId = escapeHtml(applicantId);
  const safeIrcrn = escapeHtml(iCrn);
  const safeCompanyName = companyName ? escapeHtml(companyName) : '';
  const safePosition = position ? escapeHtml(position) : '';
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('Not provided', 'Non fourni', locale);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeApplicantPhone = applicantPhone ? escapeHtml(applicantPhone) : '';
  const approveLink = feedbackApproveUrl ? normalizeHttpUrl(feedbackApproveUrl) : null;
  const declineLink = feedbackDeclineUrl ? normalizeHttpUrl(feedbackDeclineUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const textCtas = [
    feedbackApproveUrl ? `${t('Approve', 'Approuver', locale)}: ${feedbackApproveUrl}` : null,
    feedbackDeclineUrl ? `${t('Decline', 'Refuser', locale)}: ${feedbackDeclineUrl}` : null,
    portalUrl ? `${t('Your Referrer Portal', 'Votre portail de parrain', locale)}: ${portalUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const textLines = [
    greeting,
    '',
    t(
      `An applicant just applied for ${position} at ${displayCompany}.`,
      `Un candidat vient de postuler pour ${position} chez ${displayCompany}.`,
      locale
    ),
    `- ${t('Applicant ID', 'ID du candidat', locale)}: ${applicantId}`,
    companyName ? `- ${t('Company', 'Entreprise', locale)}: ${companyName}` : null,
    `- ${t('Company iRCRN', 'iRCRN de l\'entreprise', locale)}: ${iCrn}`,
    position ? `- ${t('Position', 'Poste', locale)}: ${position}` : null,
    referenceNumber ? `- ${t('Reference Number', 'Numéro de référence', locale)}: ${referenceNumber}` : null,
    applicantName ? `- ${t('Name', 'Nom', locale)}: ${applicantName}` : null,
    applicantEmail ? `- ${t('Email', 'Courriel', locale)}: ${applicantEmail}` : null,
    applicantPhone ? `- ${t('Phone', 'Téléphone', locale)}: ${applicantPhone}` : null,
    `- ${t('CV', 'CV', locale)}: ${normalizedResumeUrl || t('Not provided', 'Non fourni', locale)}`,
    textCtas ? '' : null,
    textCtas || null,
    '',
    t('Thanks for the quick review!', 'Merci pour votre examen rapide!', locale),
  ]
    .filter(Boolean)
    .join('\n');

  const safeDisplayCompany = escapeHtml(displayCompany);
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('New application received!', 'Nouvelle candidature reçue!', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t(`An applicant is interested in ${safePosition} at ${safeDisplayCompany}`, `Un candidat est intéressé par ${safePosition} chez ${safeDisplayCompany}`, locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${safeGreetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t('Great news! An applicant just applied through iRefair. Here are the details:', 'Bonne nouvelle! Un candidat vient de postuler via iRefair. Voici les détails:', locale)}
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Applicant Information', 'Information sur le candidat', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Name', 'Nom', locale), safeApplicantName)}
        ${safeApplicantEmail ? infoRow(t('Email', 'Courriel', locale), `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${safeApplicantPhone ? infoRow(t('Phone', 'Téléphone', locale), safeApplicantPhone) : ''}
        ${infoRow(t('Applicant ID', 'ID du candidat', locale), safeApplicantId)}
      </table>
    </div>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Application Details', 'Détails de la candidature', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${safePosition ? infoRow(t('Position', 'Poste', locale), safePosition) : ''}
        ${safeCompanyName ? infoRow(t('Company', 'Entreprise', locale), safeCompanyName) : ''}
        ${infoRow(t('Company iRCRN', 'iRCRN de l\'entreprise', locale), safeIrcrn)}
        ${safeReferenceNumber ? infoRow(t('Reference #', 'Réf. #', locale), safeReferenceNumber) : ''}
        ${infoRow(t('Resume', 'CV', locale), normalizedResumeUrl ? `<a href="${escapeHtml(normalizedResumeUrl)}" target="_blank" style="color: ${colors.primary};">${escapeHtml(displayResumeName)}</a>` : `<span style="color: ${colors.muted};">${t('Not provided', 'Non fourni', locale)}</span>`)}
      </table>
    </div>

    ${divider}

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        ${normalizedResumeUrl ? `<td style="padding-right: 12px;">${button(t('View Resume', 'Voir le CV', locale), normalizedResumeUrl, 'secondary')}</td>` : ''}
        ${approveLink ? `<td style="padding-right: 12px;">${button(t('Approve', 'Approuver', locale), approveLink, 'primary')}</td>` : ''}
        ${declineLink ? `<td>${button(t('Decline', 'Refuser', locale), declineLink, 'danger')}</td>` : ''}
      </tr>
    </table>

    ${normalizedPortalUrl ? `
    <p style="margin: 24px 0 12px 0; color: ${colors.muted}; font-size: 14px;">
      ${t(
        `Manage all your applications in your <a href="${escapeHtml(normalizedPortalUrl)}" style="color: ${colors.primary};">Referrer Portal</a>.`,
        `Gérez toutes vos candidatures dans votre <a href="${escapeHtml(normalizedPortalUrl)}" style="color: ${colors.primary};">portail de parrain</a>.`,
        locale
      )}
    </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.muted}; font-size: 14px;">
      ${t('Thank you for your quick review!', 'Merci pour votre examen rapide!', locale)}
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('NEW APPLICATION RECEIVED', 'NOUVELLE CANDIDATURE REÇUE', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${safeCompanyName ? `${t('Company', 'Entreprise', locale)}: <strong style="color:#1f2a37;">${safeCompanyName}</strong> &bull; ` : ''}iRCRN: <strong style="color:#1f2a37;">${safeIrcrn}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t(`New application for ${position} at ${displayCompany}`, `Nouvelle candidature pour ${position} chez ${displayCompany}`, locale), customHeader);

  return { subject, text: textLines, html };
}

type ApplicantConfirmationParams = {
  applicantName?: string;
  applicantEmail: string;
  applicantId: string;
  iCrn: string;
  position: string;
  referenceNumber?: string;
  resumeFileName?: string;
  submissionId: string;
  locale?: 'en' | 'fr';
};

export function applicationConfirmationToApplicant(params: ApplicantConfirmationParams): TemplateResult {
  const {
    applicantName,
    applicantId,
    iCrn,
    position,
    referenceNumber,
    resumeFileName,
    submissionId,
    locale = 'en',
  } = params;

  const subject = t(`Application received: ${position}`, `Candidature reçue: ${position}`, locale);
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeGreetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantId = escapeHtml(applicantId);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = escapeHtml(position);
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeResumeName = resumeFileName ? escapeHtml(resumeFileName) : '';
  const safeSubmissionId = escapeHtml(submissionId);

  const text = `${greeting}

${t('Thank you for submitting your application through iRefair!', 'Merci d\'avoir soumis votre candidature via iRefair!', locale)}

${t("Here's a summary of what you submitted:", 'Voici un résumé de votre soumission:', locale)}

- ${t('Submission ID', 'ID de soumission', locale)}: ${submissionId}
- ${t('Your iRAIN', 'Votre iRAIN', locale)}: ${applicantId}
- ${t('Company (iRCRN)', 'Entreprise (iRCRN)', locale)}: ${iCrn}
- ${t('Position', 'Poste', locale)}: ${position}${referenceNumber ? `\n- ${t('Reference Number', 'Numéro de référence', locale)}: ${referenceNumber}` : ''}${resumeFileName ? `\n- ${t('Resume', 'CV', locale)}: ${resumeFileName}` : ''}

${t('What happens next?', 'Prochaines étapes?', locale)}
1. ${t('Your application has been forwarded to a referrer at the company', 'Votre candidature a été transmise à un parrain de l\'entreprise', locale)}
2. ${t('They will review your profile and resume', 'Ils examineront votre profil et votre CV', locale)}
3. ${t("If there's a match, you'll be connected via email", 'S\'il y a correspondance, vous serez contacté par courriel', locale)}

${t('Keep this email for your records. You can use the same iRAIN and Applicant Key to apply to other companies.', 'Conservez ce courriel pour vos dossiers. Vous pouvez utiliser le même iRAIN et clé de candidat pour postuler à d\'autres entreprises.', locale)}

${t('Good luck!', 'Bonne chance!', locale)}
- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Application received!', 'Candidature reçue!', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t("We've forwarded your application to a referrer", 'Nous avons transmis votre candidature à un parrain', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${safeGreetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t('Thank you for submitting your application through iRefair! Here\'s a summary of what you submitted:', 'Merci d\'avoir soumis votre candidature via iRefair! Voici un résumé de votre soumission:', locale)}
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Application Summary', 'Résumé de la candidature', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Submission ID', 'ID de soumission', locale), safeSubmissionId)}
        ${infoRow(t('Your iRAIN', 'Votre iRAIN', locale), safeApplicantId)}
        ${infoRow(t('Company (iRCRN)', 'Entreprise (iRCRN)', locale), safeIrcrn)}
        ${infoRow(t('Position', 'Poste', locale), safePosition)}
        ${safeReferenceNumber ? infoRow(t('Reference #', 'Réf. #', locale), safeReferenceNumber) : ''}
        ${safeResumeName ? infoRow(t('Resume', 'CV', locale), safeResumeName) : ''}
      </table>
    </div>

    ${divider}

    <div style="background: linear-gradient(135deg, rgba(61, 139, 253, 0.08), rgba(122, 215, 227, 0.08)); padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 15px; font-weight: 700;">${t('What happens next?', 'Prochaines étapes?', locale)}</p>
      <ol style="margin: 0; padding-left: 20px; color: ${colors.ink}; font-size: 14px; line-height: 1.8;">
        <li>${t('Your application has been forwarded to a referrer at the company', 'Votre candidature a été transmise à un parrain de l\'entreprise', locale)}</li>
        <li>${t('They will review your profile and resume', 'Ils examineront votre profil et votre CV', locale)}</li>
        <li>${t("If there's a match, you'll be connected via email", 'S\'il y a correspondance, vous serez contacté par courriel', locale)}</li>
      </ol>
    </div>

    <p style="margin: 16px 0; color: ${colors.muted}; font-size: 14px; line-height: 1.6;">
      <strong>${t('Tip:', 'Conseil:', locale)}</strong> ${t('Keep this email for your records. You can use the same iRAIN and Applicant Key to apply to other companies on iRefair.', 'Conservez ce courriel pour vos dossiers. Vous pouvez utiliser le même iRAIN et clé de candidat pour postuler à d\'autres entreprises sur iRefair.', locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Good luck!', 'Bonne chance!', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('APPLICATION RECEIVED', 'CANDIDATURE REÇUE', locale)}</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">${safeApplicantId}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, t(`Your application for ${position} has been received`, `Votre candidature pour ${position} a été reçue`, locale), customHeader);

  return { subject, text, html };
}

// ============================================================================
// REFERRER PORTAL EMAIL TEMPLATES
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://irefair.com';

type MeetingInviteParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  meetingDate: string;
  meetingTime: string;
  meetingTimezone: string;
  meetingUrl: string;
  rescheduleToken: string;
  applicationId: string;
  locale?: 'en' | 'fr';
};

export function meetingInviteToApplicant(params: MeetingInviteParams): TemplateResult {
  const {
    applicantName,
    referrerName,
    companyName,
    position,
    meetingDate,
    meetingTime,
    meetingTimezone,
    meetingUrl,
    rescheduleToken,
    applicationId,
    locale = 'en',
  } = params;

  const formattedDateTime = formatMeetingDateTime(meetingDate, meetingTime, meetingTimezone);
  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeReferrerName = referrerName ? escapeHtml(referrerName) : t('a referrer', 'un parrain', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const normalizedMeetingUrl = normalizeHttpUrl(meetingUrl);
  const rescheduleUrl = `${BASE_URL}/api/referrer/reschedule?token=${encodeURIComponent(rescheduleToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = t(`Meeting scheduled: ${position || 'Interview'}`, `Réunion planifiée: ${position || 'Entrevue'}`, locale);

  const text = `${greeting}

${t(`Great news! ${referrerName || 'A referrer'} at ${companyName || 'the company'} would like to meet with you regarding ${position || 'your application'}.`, `Bonne nouvelle! ${referrerName || 'Un parrain'} de ${companyName || 'l\'entreprise'} souhaite vous rencontrer concernant ${position || 'votre candidature'}.`, locale)}

${t('Meeting Details:', 'Détails de la réunion:', locale)}
- ${t('When', 'Quand', locale)}: ${formattedDateTime}
- ${t('Join link', 'Lien de connexion', locale)}: ${normalizedMeetingUrl || t('Link will be provided', 'Le lien sera fourni', locale)}

${t('Please join on time. If you need to reschedule, use this link:', 'Veuillez vous connecter à l\'heure. Si vous devez reporter, utilisez ce lien:', locale)} ${rescheduleUrl}

${t('Good luck with your meeting!', 'Bonne chance pour votre réunion!', locale)}
- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Meeting scheduled!', 'Réunion planifiée!', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('You have an upcoming interview', 'Vous avez une entrevue à venir', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`Great news! <strong>${safeReferrerName}</strong> at <strong>${safeCompanyName}</strong> would like to meet with you regarding <strong>${safePosition}</strong>.`, `Bonne nouvelle! <strong>${safeReferrerName}</strong> de <strong>${safeCompanyName}</strong> souhaite vous rencontrer concernant <strong>${safePosition}</strong>.`, locale)}
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Meeting Details', 'Détails de la réunion', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('When', 'Quand', locale), `<strong>${escapeHtml(formattedDateTime)}</strong>`)}
      </table>
    </div>

    ${normalizedMeetingUrl ? `
      <p style="margin: 24px 0 16px 0; text-align: center;">
        ${button(t('Join Meeting', 'Rejoindre la réunion', locale), normalizedMeetingUrl, 'primary')}
      </p>
    ` : `
      <p style="margin: 16px 0; color: ${colors.muted}; font-size: 14px; background: ${colors.background}; padding: 16px; border-radius: 10px;">
        ${t('The meeting link will be provided separately.', 'Le lien de la réunion sera fourni séparément.', locale)}
      </p>
    `}

    ${divider}

    <p style="margin: 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
      ${t('Need to reschedule?', 'Besoin de reporter?', locale)} <a href="${escapeHtml(rescheduleUrl)}" style="color: ${colors.primary};">${t('Request a new time', 'Demander un nouveau moment', locale)}</a>
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Good luck!', 'Bonne chance!', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('MEETING SCHEDULED', 'RÉUNION PLANIFIÉE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t(`Meeting scheduled for ${formattedDateTime}`, `Réunion planifiée pour ${formattedDateTime}`, locale), customHeader);

  return { subject, text, html };
}

type MeetingCancelledParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  reason?: string;
  locale?: 'en' | 'fr';
};

export function meetingCancelledToApplicant(params: MeetingCancelledParams): TemplateResult {
  const { applicantName, referrerName, companyName, position, reason, locale = 'en' } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeReferrerName = referrerName ? escapeHtml(referrerName) : t('The referrer', 'Le parrain', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('your application', 'votre candidature', locale);
  const safeReason = reason ? escapeHtml(reason) : '';

  const subject = t(`Meeting cancelled: ${position || 'Interview'}`, `Réunion annulée: ${position || 'Entrevue'}`, locale);

  const text = `${greeting}

${t(`Unfortunately, your scheduled meeting with ${referrerName || 'the referrer'} at ${companyName || 'the company'} regarding ${position || 'your application'} has been cancelled.`, `Malheureusement, votre réunion prévue avec ${referrerName || 'le parrain'} de ${companyName || 'l\'entreprise'} concernant ${position || 'votre candidature'} a été annulée.`, locale)}${reason ? `\n\n${t('Reason', 'Raison', locale)}: ${reason}` : ''}

${t("If appropriate, a new meeting may be scheduled. We'll keep you posted.", 'Si approprié, une nouvelle réunion pourra être planifiée. Nous vous tiendrons informé.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Meeting cancelled', 'Réunion annulée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Your scheduled meeting has been cancelled', 'Votre réunion prévue a été annulée', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`Unfortunately, your scheduled meeting with <strong>${safeReferrerName}</strong> at <strong>${safeCompanyName}</strong> regarding <strong>${safePosition}</strong> has been cancelled.`, `Malheureusement, votre réunion prévue avec <strong>${safeReferrerName}</strong> de <strong>${safeCompanyName}</strong> concernant <strong>${safePosition}</strong> a été annulée.`, locale)}
    </p>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0;">
        <p style="margin: 0; color: ${colors.muted}; font-size: 14px;">
          <strong>${t('Reason:', 'Raison:', locale)}</strong> ${safeReason}
        </p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t("If appropriate, a new meeting may be scheduled. We'll keep you posted.", 'Si approprié, une nouvelle réunion pourra être planifiée. Nous vous tiendrons informé.', locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best regards,', 'Cordialement,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('MEETING CANCELLED', 'RÉUNION ANNULÉE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Your meeting has been cancelled', 'Votre réunion a été annulée', locale), customHeader);

  return { subject, text, html };
}

type RejectionParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  locale?: 'en' | 'fr';
};

export function rejectionToApplicant(params: RejectionParams): TemplateResult {
  const { applicantName, companyName, position, locale = 'en' } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);

  const subject = t(`Application update: ${position || 'Your application'}`, `Mise à jour de candidature: ${position || 'Votre candidature'}`, locale);

  const text = `${greeting}

${t(`Thank you for your interest in ${position || 'the position'} at ${companyName || 'the company'}.`, `Merci de votre intérêt pour ${position || 'le poste'} chez ${companyName || 'l\'entreprise'}.`, locale)}

${t("After careful review, we've decided not to move forward with your application at this time. This decision doesn't reflect on your qualifications - it simply means we're pursuing applicants whose experience more closely matches our current needs.", "Après examen attentif, nous avons décidé de ne pas poursuivre avec votre candidature pour le moment. Cette décision ne remet pas en cause vos qualifications - elle signifie simplement que nous poursuivons avec des candidats dont l'expérience correspond plus étroitement à nos besoins actuels.", locale)}

${t('We encourage you to continue exploring opportunities on iRefair. The right match is out there!', 'Nous vous encourageons à continuer d\'explorer les opportunités sur iRefair. La bonne correspondance existe!', locale)}

${t('Best of luck in your job search.', 'Bonne chance dans votre recherche d\'emploi.', locale)}
- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Application update', 'Mise à jour de candidature', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Regarding your application', 'Concernant votre candidature', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`Thank you for your interest in <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.`, `Merci de votre intérêt pour <strong>${safePosition}</strong> chez <strong>${safeCompanyName}</strong>.`, locale)}
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t("After careful review, we've decided not to move forward with your application at this time. This decision doesn't reflect on your qualifications - it simply means we're pursuing applicants whose experience more closely matches our current needs.", "Après examen attentif, nous avons décidé de ne pas poursuivre avec votre candidature pour le moment. Cette décision ne remet pas en cause vos qualifications - elle signifie simplement que nous poursuivons avec des candidats dont l'expérience correspond plus étroitement à nos besoins actuels.", locale)}
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t('We encourage you to continue exploring opportunities on iRefair. The right match is out there!', 'Nous vous encourageons à continuer d\'explorer les opportunités sur iRefair. La bonne correspondance existe!', locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best of luck in your job search,', 'Bonne chance dans votre recherche d\'emploi,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('APPLICATION UPDATE', 'MISE À JOUR DE CANDIDATURE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Update on your application', 'Mise à jour de votre candidature', locale), customHeader);

  return { subject, text, html };
}

type CvMismatchParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  feedback?: string;
  includeUpdateLink?: boolean;
  updateToken?: string;
  applicationId?: string;
  meetingWasCancelled?: boolean;
  locale?: 'en' | 'fr';
};

export function cvMismatchToApplicant(params: CvMismatchParams): TemplateResult {
  const {
    applicantName,
    companyName,
    position,
    feedback,
    includeUpdateLink,
    updateToken,
    applicationId,
    meetingWasCancelled,
    locale = 'en',
  } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeFeedback = feedback ? escapeHtml(feedback) : '';

  const updateUrl = includeUpdateLink && updateToken && applicationId
    ? `${BASE_URL}/update-cv?token=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`
    : null;

  const subject = t(`CV review needed: ${position || 'Your application'}`, `Révision du CV requise: ${position || 'Votre candidature'}`, locale);

  const meetingCancelledText = meetingWasCancelled
    ? t('\n\nNote: Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.', '\n\nNote: Votre réunion précédemment planifiée a été annulée. Une fois votre CV mis à jour, le parrain l\'examinera et planifiera une nouvelle réunion avec vous.', locale)
    : '';

  const text = `${greeting}

${t(`Thank you for applying to ${position || 'the position'} at ${companyName || 'the company'}.`, `Merci d'avoir postulé pour ${position || 'le poste'} chez ${companyName || 'l\'entreprise'}.`, locale)}

${t("After reviewing your CV, we found that it doesn't quite match the requirements for this role.", "Après avoir examiné votre CV, nous avons constaté qu'il ne correspond pas tout à fait aux exigences de ce poste.", locale)}${feedback ? `\n\n${t('Feedback', 'Commentaires', locale)}: ${feedback}` : ''}${meetingCancelledText}
${updateUrl ? `\n${t("If you'd like to update your CV and resubmit, you can do so here:", "Si vous souhaitez mettre à jour votre CV et le soumettre à nouveau, vous pouvez le faire ici:", locale)} ${updateUrl}\n\n${t('This link expires in 7 days.', 'Ce lien expire dans 7 jours.', locale)}` : ''}

${t("Don't be discouraged - there are many opportunities on iRefair that may be a better fit!", "Ne vous découragez pas - il existe de nombreuses opportunités sur iRefair qui pourraient mieux vous convenir!", locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('CV feedback', 'Commentaires sur le CV', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Regarding your application', 'Concernant votre candidature', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`Thank you for applying to <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.`, `Merci d'avoir postulé pour <strong>${safePosition}</strong> chez <strong>${safeCompanyName}</strong>.`, locale)}
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t("After reviewing your CV, we found that it doesn't quite match the requirements for this role.", "Après avoir examiné votre CV, nous avons constaté qu'il ne correspond pas tout à fait aux exigences de ce poste.", locale)}
    </p>

    ${safeFeedback ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Feedback:', 'Commentaires:', locale)}</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeFeedback}</p>
      </div>
    ` : ''}

    ${meetingWasCancelled ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>${t('Note:', 'Note:', locale)}</strong> ${t('Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.', 'Votre réunion précédemment planifiée a été annulée. Une fois votre CV mis à jour, le parrain l\'examinera et planifiera une nouvelle réunion avec vous.', locale)}
        </p>
      </div>
    ` : ''}

    ${updateUrl ? `
      ${divider}
      <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
        ${t("If you'd like to update your CV and resubmit, click the button below:", "Si vous souhaitez mettre à jour votre CV et le soumettre à nouveau, cliquez sur le bouton ci-dessous:", locale)}
      </p>
      <p style="margin: 0 0 8px 0; text-align: center;">
        ${button(t('Update your CV / details', 'Mettre à jour votre CV / détails', locale), updateUrl, 'primary')}
      </p>
      <p style="margin: 8px 0 0 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
        ${t('This link expires in 7 days.', 'Ce lien expire dans 7 jours.', locale)}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t("Don't be discouraged - there are many opportunities on iRefair that may be a better fit!", "Ne vous découragez pas - il existe de nombreuses opportunités sur iRefair qui pourraient mieux vous convenir!", locale)}
    </p>

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best regards,', 'Cordialement,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('CV FEEDBACK', 'COMMENTAIRES SUR LE CV', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Feedback on your CV', 'Commentaires sur votre CV', locale), customHeader);

  return { subject, text, html };
}

type CvUpdateRequestParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  feedback?: string;
  updateToken: string;
  applicationId: string;
  meetingWasCancelled?: boolean;
  locale?: 'en' | 'fr';
};

export function cvUpdateRequestToApplicant(params: CvUpdateRequestParams): TemplateResult {
  const {
    applicantName,
    companyName,
    position,
    feedback,
    updateToken,
    applicationId,
    meetingWasCancelled,
    locale = 'en',
  } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeFeedback = feedback ? escapeHtml(feedback) : '';

  const updateUrl = `${BASE_URL}/update-cv?token=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = t('Please update your CV - iRefair', 'Veuillez mettre à jour votre CV - iRefair', locale);

  const meetingCancelledText = meetingWasCancelled
    ? t('\n\nNote: Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.', '\n\nNote: Votre réunion précédemment planifiée a été annulée. Une fois votre CV mis à jour, le parrain l\'examinera et planifiera une nouvelle réunion avec vous.', locale)
    : '';

  const text = `${greeting}

${t(`The referrer reviewing your application for ${position || 'the position'} at ${companyName || 'the company'} has requested that you update your CV.`, `Le parrain qui examine votre candidature pour ${position || 'le poste'} chez ${companyName || 'l\'entreprise'} a demandé que vous mettiez à jour votre CV.`, locale)}${feedback ? `\n\n${t('Feedback', 'Commentaires', locale)}: ${feedback}` : ''}${meetingCancelledText}

${t('Please update your CV here:', 'Veuillez mettre à jour votre CV ici:', locale)} ${updateUrl}

${t('This link expires in 7 days.', 'Ce lien expire dans 7 jours.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('CV update requested', 'Mise à jour du CV demandée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Action needed for your application', 'Action requise pour votre candidature', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`The referrer reviewing your application for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong> has requested that you update your CV.`, `Le parrain qui examine votre candidature pour <strong>${safePosition}</strong> chez <strong>${safeCompanyName}</strong> a demandé que vous mettiez à jour votre CV.`, locale)}
    </p>

    ${safeFeedback ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Feedback:', 'Commentaires:', locale)}</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeFeedback}</p>
      </div>
    ` : ''}

    ${meetingWasCancelled ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>${t('Note:', 'Note:', locale)}</strong> ${t('Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.', 'Votre réunion précédemment planifiée a été annulée. Une fois votre CV mis à jour, le parrain l\'examinera et planifiera une nouvelle réunion avec vous.', locale)}
        </p>
      </div>
    ` : ''}

    ${divider}

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">${t('Update your CV to continue:', 'Mettez à jour votre CV pour continuer:', locale)}</p>
    <p style="margin: 0 0 8px 0; text-align: center;">
      ${button(t('Update your CV / details', 'Mettre à jour votre CV / détails', locale), updateUrl, 'primary')}
    </p>
    <p style="margin: 8px 0 0 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
      ${t('This link expires in 7 days.', 'Ce lien expire dans 7 jours.', locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('ACTION NEEDED', 'ACTION REQUISE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Action needed: Update your CV', 'Action requise: Mettez à jour votre CV', locale), customHeader);

  return { subject, text, html };
}

type InfoRequestParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  requestedInfo?: string;
  updateToken: string;
  applicationId: string;
  meetingWasCancelled?: boolean;
  locale?: 'en' | 'fr';
};

export function infoRequestToApplicant(params: InfoRequestParams): TemplateResult {
  const {
    applicantName,
    companyName,
    position,
    requestedInfo,
    updateToken,
    applicationId,
    meetingWasCancelled,
    locale = 'en',
  } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeRequestedInfo = requestedInfo ? escapeHtml(requestedInfo) : '';

  const updateUrl = `${BASE_URL}/applicant?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = t('Information needed - iRefair', 'Information requise - iRefair', locale);

  const meetingCancelledText = meetingWasCancelled
    ? t('\n\nNote: Your previously scheduled meeting has been cancelled. Once you provide the requested information, the referrer will review it and schedule a new meeting with you.', '\n\nNote: Votre réunion précédemment planifiée a été annulée. Une fois les informations demandées fournies, le parrain les examinera et planifiera une nouvelle réunion avec vous.', locale)
    : '';

  const text = `${greeting}

${t(`The referrer reviewing your application for ${position || 'the position'} at ${companyName || 'the company'} has requested additional information.`, `Le parrain qui examine votre candidature pour ${position || 'le poste'} chez ${companyName || 'l\'entreprise'} a demandé des informations supplémentaires.`, locale)}${requestedInfo ? `\n\n${t('Requested', 'Demandé', locale)}: ${requestedInfo}` : ''}${meetingCancelledText}

${t('Please provide the information here:', 'Veuillez fournir les informations ici:', locale)} ${updateUrl}

${t('This link expires in 7 days.', 'Ce lien expire dans 7 jours.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Information requested', 'Information demandée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Action needed for your application', 'Action requise pour votre candidature', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`The referrer reviewing your application for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong> has requested additional information.`, `Le parrain qui examine votre candidature pour <strong>${safePosition}</strong> chez <strong>${safeCompanyName}</strong> a demandé des informations supplémentaires.`, locale)}
    </p>

    ${safeRequestedInfo ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Requested information:', 'Information demandée:', locale)}</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeRequestedInfo}</p>
      </div>
    ` : ''}

    ${meetingWasCancelled ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>${t('Note:', 'Note:', locale)}</strong> ${t('Your previously scheduled meeting has been cancelled. Once you provide the requested information, the referrer will review it and schedule a new meeting with you.', 'Votre réunion précédemment planifiée a été annulée. Une fois les informations demandées fournies, le parrain les examinera et planifiera une nouvelle réunion avec vous.', locale)}
        </p>
      </div>
    ` : ''}

    ${divider}

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">${t('Provide the information to continue:', 'Fournissez les informations pour continuer:', locale)}</p>
    <p style="margin: 0 0 8px 0; text-align: center;">
      ${button(t('Update your CV / details', 'Mettre à jour votre CV / détails', locale), updateUrl, 'primary')}
    </p>
    <p style="margin: 8px 0 0 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
      ${t('This link expires in 7 days.', 'Ce lien expire dans 7 jours.', locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('INFORMATION REQUEST', 'DEMANDE D\'INFORMATION', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Action needed: Additional information requested', 'Action requise: Informations supplémentaires demandées', locale), customHeader);

  return { subject, text, html };
}

type InterviewCompletedParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  locale?: 'en' | 'fr';
};

export function interviewCompletedToApplicant(params: InterviewCompletedParams): TemplateResult {
  const { applicantName, companyName, position, locale = 'en' } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);

  const subject = t(`Interview completed: ${position || 'Your application'}`, `Entrevue terminée: ${position || 'Votre candidature'}`, locale);

  const text = `${greeting}

${t(`Thank you for completing your interview for ${position || 'the position'} at ${companyName || 'the company'}.`, `Merci d'avoir complété votre entrevue pour ${position || 'le poste'} chez ${companyName || 'l\'entreprise'}.`, locale)}

${t("The referrer will be reviewing your interview and will follow up with next steps. We'll keep you posted on any updates.", "Le parrain examinera votre entrevue et vous informera des prochaines étapes. Nous vous tiendrons informé de toute mise à jour.", locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Interview completed', 'Entrevue terminée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Thank you for your time', 'Merci pour votre temps', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(`Thank you for completing your interview for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.`, `Merci d'avoir complété votre entrevue pour <strong>${safePosition}</strong> chez <strong>${safeCompanyName}</strong>.`, locale)}
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t("The referrer will be reviewing your interview and will follow up with next steps. We'll keep you posted on any updates.", "Le parrain examinera votre entrevue et vous informera des prochaines étapes. Nous vous tiendrons informé de toute mise à jour.", locale)}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best regards,', 'Cordialement,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('INTERVIEW COMPLETED', 'ENTREVUE TERMINÉE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t('Your interview has been completed', 'Votre entrevue est terminée', locale), customHeader);

  return { subject, text, html };
}

type JobOfferParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  message?: string;
  locale?: 'en' | 'fr';
};

export function jobOfferToApplicant(params: JobOfferParams): TemplateResult {
  const { applicantName, companyName, position, message, locale = 'en' } = params;

  const greeting = applicantName
    ? t(`Hi ${applicantName},`, `Bonjour ${applicantName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = applicantName
    ? t(`Hi ${escapeHtml(applicantName)},`, `Bonjour ${escapeHtml(applicantName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', "l'entreprise", locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeMessage = message ? escapeHtml(message) : '';

  const subject = t(
    `${companyName || 'Company'} - Job Offer for ${position || 'your application'}`,
    `${companyName || 'Entreprise'} - Offre d'emploi pour ${position || 'votre candidature'}`,
    locale
  );

  const text = `${greeting}

${t(
  `We are pleased to inform you that ${companyName || 'the company'} would like to offer you the position of ${position || 'the role you applied for'}.`,
  `Nous avons le plaisir de vous informer que ${companyName || "l'entreprise"} souhaite vous offrir le poste de ${position || 'le poste pour lequel vous avez postulé'}.`,
  locale
)}${message ? `\n\n${message}` : ''}

${t(
  'The referrer or hiring team will be in touch with the formal offer details.',
  "Le référent ou l'équipe de recrutement vous contactera avec les détails de l'offre formelle.",
  locale
)}

${t('Best regards,', 'Cordialement,', locale)}
${t('The iRefair Team', "L'équipe iRefair", locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Job Offer', "Offre d'emploi", locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Great news about your application', 'Excellentes nouvelles concernant votre candidature', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `We are pleased to inform you that <strong>${safeCompanyName}</strong> would like to offer you the position of <strong>${safePosition}</strong>.`,
        `Nous avons le plaisir de vous informer que <strong>${safeCompanyName}</strong> souhaite vous offrir le poste de <strong>${safePosition}</strong>.`,
        locale
      )}
    </p>

    ${safeMessage ? `
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(122, 215, 227, 0.08)); padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.success};">
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        'The referrer or hiring team will be in touch with the formal offer details.',
        "Le référent ou l'équipe de recrutement vous contactera avec les détails de l'offre formelle.",
        locale
      )}
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Best regards,', 'Cordialement,', locale)}<br>
      <strong>${t('The iRefair Team', "L'équipe iRefair", locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('JOB OFFER', "OFFRE D'EMPLOI", locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, `${t('Job Offer', "Offre d'emploi", locale)} - ${safeCompanyName}`, customHeader);

  return { subject, text, html };
}

type ProposedTime = {
  date: string;
  time: string;
};

type RescheduleRequestParams = {
  referrerName?: string;
  applicantName?: string;
  applicantEmail?: string;
  companyName?: string;
  position?: string;
  originalDateTime?: string;
  reason?: string;
  proposedTimes?: ProposedTime[];
  applicationId: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function rescheduleRequestToReferrer(params: RescheduleRequestParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    applicantEmail,
    position,
    originalDateTime,
    reason,
    proposedTimes,
    applicationId,
    portalUrl,
    locale = 'en',
  } = params;

  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('The applicant', 'Le candidat', locale);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeOriginalDateTime = originalDateTime ? escapeHtml(originalDateTime) : '';
  const safeReason = reason ? escapeHtml(reason) : '';
  const safeApplicationId = escapeHtml(applicationId);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  // Format proposed times for display
  const hasProposedTimes = proposedTimes && proposedTimes.length > 0;
  const proposedTimesText = hasProposedTimes
    ? proposedTimes.map((pt, i) => `${t('Option', 'Option', locale)} ${i + 1}: ${pt.date} ${t('at', 'à', locale)} ${pt.time}`).join('\n')
    : '';

  const subject = t(
    `Reschedule request: ${applicantName || 'Applicant'} for ${position || 'meeting'}`,
    `Demande de report: ${applicantName || 'Candidat'} pour ${position || 'réunion'}`,
    locale
  );

  const text = `${greeting}

${t(
  `${applicantName || 'The applicant'} has requested to reschedule their meeting for ${position || 'the position'}.`,
  `${applicantName || 'Le candidat'} a demandé de reporter sa réunion pour ${position || 'le poste'}.`,
  locale
)}${originalDateTime ? `\n\n${t('Original time', 'Heure originale', locale)}: ${originalDateTime}` : ''}${reason ? `\n${t('Reason', 'Raison', locale)}: ${reason}` : ''}${hasProposedTimes ? `\n\n${t('Proposed alternative times', 'Horaires alternatifs proposés', locale)}:\n${proposedTimesText}` : ''}

${t('Application ID', 'ID de candidature', locale)}: ${applicationId}${applicantEmail ? `\n${t('Applicant email', 'Courriel du candidat', locale)}: ${applicantEmail}` : ''}

${normalizedPortalUrl
  ? t(`Open your portal to reschedule the meeting: ${normalizedPortalUrl}`, `Ouvrez votre portail pour reporter la réunion: ${normalizedPortalUrl}`, locale)
  : t('Please log in to your portal to reschedule the meeting.', 'Veuillez vous connecter à votre portail pour reporter la réunion.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  // Build proposed times HTML
  const proposedTimesHtml = hasProposedTimes
    ? `
      <div style="background: #e8f5e9; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #4caf50;">
        <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Suggested alternative times:', 'Horaires alternatifs suggérés:', locale)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${proposedTimes.map((pt, i) => `
            <tr>
              <td style="padding: 6px 0; color: ${colors.muted}; font-size: 13px; width: 70px;">${t('Option', 'Option', locale)} ${i + 1}</td>
              <td style="padding: 6px 0; color: ${colors.ink}; font-size: 14px; font-weight: 500;">${escapeHtml(pt.date)} ${t('at', 'à', locale)} ${escapeHtml(pt.time)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Reschedule request', 'Demande de report', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('An applicant needs to reschedule', 'Un candidat doit reporter', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `<strong>${safeApplicantName}</strong> has requested to reschedule their meeting for <strong>${safePosition}</strong>.`,
        `<strong>${safeApplicantName}</strong> a demandé de reporter sa réunion pour <strong>${safePosition}</strong>.`,
        locale
      )}
    </p>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Application ID', 'ID de candidature', locale), safeApplicationId)}
        ${safeApplicantEmail ? infoRow(t('Applicant email', 'Courriel du candidat', locale), `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${safeOriginalDateTime ? infoRow(t('Original time', 'Heure originale', locale), safeOriginalDateTime) : ''}
      </table>
    </div>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Reason:', 'Raison:', locale)}</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
      </div>
    ` : ''}

    ${proposedTimesHtml}

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        ${t('Open your portal to reschedule the meeting', 'Ouvrez votre portail pour reporter la réunion', locale)}
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'primary')}
      </p>
    ` : `
      <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
        ${t('Please log in to your portal to reschedule the meeting.', 'Veuillez vous connecter à votre portail pour reporter la réunion.', locale)}
      </p>
    `}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('RESCHEDULE REQUEST', 'DEMANDE DE REPORT', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t(`Reschedule request from ${applicantName || 'an applicant'}`, `Demande de report de ${applicantName || 'un candidat'}`, locale), customHeader);

  return { subject, text, html };
}

type ApplicantUpdatedParams = {
  referrerName?: string;
  applicantName?: string;
  applicantEmail?: string;
  companyName?: string;
  position?: string;
  applicationId: string;
  updatedFields?: string[];
  resumeUrl?: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function applicantUpdatedToReferrer(params: ApplicantUpdatedParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    applicantEmail,
    position,
    applicationId,
    updatedFields,
    resumeUrl,
    portalUrl,
    locale = 'en',
  } = params;

  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('The applicant', 'Le candidat', locale);
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeApplicationId = escapeHtml(applicationId);
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const updatedFieldsList = updatedFields && updatedFields.length > 0
    ? updatedFields.map((f) => escapeHtml(f)).join(', ')
    : t('their profile', 'leur profil', locale);

  const subject = t(
    `Applicant updated: ${applicantName || 'Application'} for ${position || 'your review'}`,
    `Candidat mis à jour: ${applicantName || 'Candidature'} pour ${position || 'votre examen'}`,
    locale
  );

  const text = `${greeting}

${t(
  `${applicantName || 'The applicant'} has updated ${updatedFields && updatedFields.length > 0 ? updatedFields.join(', ') : 'their profile'} for their application to ${position || 'the position'}.`,
  `${applicantName || 'Le candidat'} a mis à jour ${updatedFields && updatedFields.length > 0 ? updatedFields.join(', ') : 'son profil'} pour sa candidature à ${position || 'le poste'}.`,
  locale
)}

${t('Application ID', 'ID de candidature', locale)}: ${applicationId}${applicantEmail ? `\n${t('Applicant email', 'Courriel du candidat', locale)}: ${applicantEmail}` : ''}${resumeUrl ? `\n${t('Updated resume', 'CV mis à jour', locale)}: ${resumeUrl}` : ''}

${normalizedPortalUrl
  ? t(`Open your portal to review the updates: ${normalizedPortalUrl}`, `Ouvrez votre portail pour examiner les mises à jour: ${normalizedPortalUrl}`, locale)
  : t('Please log in to your portal to review the updates.', 'Veuillez vous connecter à votre portail pour examiner les mises à jour.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Applicant updated', 'Candidat mis à jour', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('New information available for review', 'Nouvelles informations disponibles pour examen', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `<strong>${safeApplicantName}</strong> has updated <strong>${updatedFieldsList}</strong> for their application to <strong>${safePosition}</strong>.`,
        `<strong>${safeApplicantName}</strong> a mis à jour <strong>${updatedFieldsList}</strong> pour sa candidature à <strong>${safePosition}</strong>.`,
        locale
      )}
    </p>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('Application ID', 'ID de candidature', locale), safeApplicationId)}
        ${safeApplicantEmail ? infoRow(t('Applicant email', 'Courriel du candidat', locale), `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${updatedFields && updatedFields.length > 0 ? infoRow(t('Updated fields', 'Champs mis à jour', locale), updatedFieldsList) : ''}
      </table>
    </div>

    ${normalizedResumeUrl ? `
      <p style="margin: 16px 0; text-align: center;">
        ${button(t('View Updated Resume', 'Voir le CV mis à jour', locale), normalizedResumeUrl, 'outline')}
      </p>
    ` : ''}

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        ${t('Open your portal to review the updates', 'Ouvrez votre portail pour examiner les mises à jour', locale)}
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'primary')}
      </p>
    ` : `
      <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
        ${t('Please log in to your portal to review the updates.', 'Veuillez vous connecter à votre portail pour examiner les mises à jour.', locale)}
      </p>
    `}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('APPLICATION UPDATED', 'CANDIDATURE MISE À JOUR', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t(`${applicantName || 'An applicant'} has updated their application`, `${applicantName || 'Un candidat'} a mis à jour sa candidature`, locale), customHeader);

  return { subject, text, html };
}

type MeetingScheduledToReferrerParams = {
  referrerName?: string;
  applicantName?: string;
  companyName?: string;
  position?: string;
  meetingDate: string;
  meetingTime: string;
  meetingTimezone: string;
  meetingUrl?: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function meetingScheduledToReferrer(params: MeetingScheduledToReferrerParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    companyName,
    position,
    meetingDate,
    meetingTime,
    meetingTimezone,
    meetingUrl,
    portalUrl,
    locale = 'en',
  } = params;

  const formattedDateTime = formatMeetingDateTime(meetingDate, meetingTime, meetingTimezone);
  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('The applicant', 'Le candidat', locale);
  const safeCompanyName = companyName ? escapeHtml(companyName) : t('the company', 'l\'entreprise', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const normalizedMeetingUrl = meetingUrl ? normalizeHttpUrl(meetingUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const subject = t(
    `Meeting confirmed: ${applicantName || 'Applicant'} for ${position || 'Interview'}`,
    `Réunion confirmée: ${applicantName || 'Candidat'} pour ${position || 'Entrevue'}`,
    locale
  );

  const text = `${greeting}

${t(
  `You have scheduled a meeting with ${applicantName || 'an applicant'} for ${position || 'the position'} at ${companyName || 'the company'}.`,
  `Vous avez planifié une réunion avec ${applicantName || 'un candidat'} pour ${position || 'le poste'} chez ${companyName || 'l\'entreprise'}.`,
  locale
)}

${t('Meeting Details:', 'Détails de la réunion:', locale)}
- ${t('When', 'Quand', locale)}: ${formattedDateTime}
- ${t('Join link', 'Lien de connexion', locale)}: ${normalizedMeetingUrl || t('Not provided', 'Non fourni', locale)}

${normalizedPortalUrl ? `${t('Manage this application in your portal', 'Gérez cette candidature dans votre portail', locale)}: ${normalizedPortalUrl}` : ''}

${t('The applicant has been notified and will receive the meeting details.', 'Le candidat a été notifié et recevra les détails de la réunion.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Meeting confirmed', 'Réunion confirmée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Your meeting has been scheduled', 'Votre réunion a été planifiée', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `You have scheduled a meeting with <strong>${safeApplicantName}</strong> for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.`,
        `Vous avez planifié une réunion avec <strong>${safeApplicantName}</strong> pour <strong>${safePosition}</strong> chez <strong>${safeCompanyName}</strong>.`,
        locale
      )}
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${t('Meeting Details', 'Détails de la réunion', locale)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow(t('When', 'Quand', locale), `<strong>${escapeHtml(formattedDateTime)}</strong>`)}
        ${normalizedMeetingUrl ? infoRow(t('Join link', 'Lien de connexion', locale), `<a href="${escapeHtml(normalizedMeetingUrl)}" style="color: ${colors.primary};">${escapeHtml(normalizedMeetingUrl)}</a>`, false) : ''}
      </table>
    </div>

    <p style="margin: 16px 0; color: ${colors.success}; font-size: 14px; background: #ecfdf5; padding: 12px 16px; border-radius: 10px; text-align: center;">
      - ${t('The applicant has been notified and will receive the meeting details.', 'Le candidat a été notifié et recevra les détails de la réunion.', locale)}
    </p>

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        ${t('Manage this application in your portal', 'Gérez cette candidature dans votre portail', locale)}
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'primary')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('MEETING CONFIRMED', 'RÉUNION CONFIRMÉE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t(`Meeting scheduled for ${formattedDateTime}`, `Réunion planifiée pour ${formattedDateTime}`, locale), customHeader);

  return { subject, text, html };
}

type MeetingCancelledToReferrerParams = {
  referrerName?: string;
  applicantName?: string;
  companyName?: string;
  position?: string;
  reason?: string;
  cancelledDueToAction?: string;
  portalUrl?: string;
  locale?: 'en' | 'fr';
};

export function meetingCancelledToReferrer(params: MeetingCancelledToReferrerParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    position,
    reason,
    cancelledDueToAction,
    portalUrl,
    locale = 'en',
  } = params;

  const greeting = referrerName
    ? t(`Hi ${referrerName},`, `Bonjour ${referrerName},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const greetingHtml = referrerName
    ? t(`Hi ${escapeHtml(referrerName)},`, `Bonjour ${escapeHtml(referrerName)},`, locale)
    : t('Hi,', 'Bonjour,', locale);
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : t('The applicant', 'Le candidat', locale);
  const safePosition = position ? escapeHtml(position) : t('the position', 'le poste', locale);
  const safeReason = reason ? escapeHtml(reason) : '';
  const safeCancelledDueToAction = cancelledDueToAction ? escapeHtml(cancelledDueToAction) : '';
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const subject = t(
    `Meeting cancelled: ${applicantName || 'Applicant'} for ${position || 'Interview'}`,
    `Réunion annulée: ${applicantName || 'Candidat'} pour ${position || 'Entrevue'}`,
    locale
  );

  const reasonText = reason
    ? `\n\n${t('Reason', 'Raison', locale)}: ${reason}`
    : cancelledDueToAction
      ? `\n\n${t(`This meeting was cancelled because you ${cancelledDueToAction}.`, `Cette réunion a été annulée parce que vous avez ${cancelledDueToAction}.`, locale)}`
      : '';

  const text = `${greeting}

${t(
  `The meeting with ${applicantName || 'the applicant'} for ${position || 'the position'} has been cancelled.`,
  `La réunion avec ${applicantName || 'le candidat'} pour ${position || 'le poste'} a été annulée.`,
  locale
)}${reasonText}

${normalizedPortalUrl ? `${t('Manage this application in your portal', 'Gérez cette candidature dans votre portail', locale)}: ${normalizedPortalUrl}` : ''}

${t('The applicant has been notified.', 'Le candidat a été notifié.', locale)}

- ${t('The iRefair Team', 'L\'équipe iRefair', locale)}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">${t('Meeting cancelled', 'Réunion annulée', locale)}</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">${t('Confirmation of cancellation', 'Confirmation d\'annulation', locale)}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      ${t(
        `The meeting with <strong>${safeApplicantName}</strong> for <strong>${safePosition}</strong> has been cancelled.`,
        `La réunion avec <strong>${safeApplicantName}</strong> pour <strong>${safePosition}</strong> a été annulée.`,
        locale
      )}
    </p>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">${t('Reason:', 'Raison:', locale)}</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
      </div>
    ` : safeCancelledDueToAction ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">
          ${t(
            `This meeting was cancelled because you <strong>${safeCancelledDueToAction}</strong>.`,
            `Cette réunion a été annulée parce que vous avez <strong>${safeCancelledDueToAction}</strong>.`,
            locale
          )}
        </p>
      </div>
    ` : ''}

    <p style="margin: 16px 0; color: ${colors.muted}; font-size: 14px; background: ${colors.background}; padding: 12px 16px; border-radius: 10px; text-align: center;">
      ${t('The applicant has been notified of this cancellation.', 'Le candidat a été notifié de cette annulation.', locale)}
    </p>

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        ${t('Manage this application in your portal', 'Gérez cette candidature dans votre portail', locale)}
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button(t('Open portal', 'Ouvrir le portail', locale), normalizedPortalUrl, 'primary')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      ${t('Thank you,', 'Merci,', locale)}<br>
      <strong>${t('The iRefair Team', 'L\'équipe iRefair', locale)}</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">${t('MEETING CANCELLED', 'RÉUNION ANNULÉE', locale)}</div>
    </div>
  `;

  const html = emailWrapper(content, t(`Meeting cancelled: ${applicantName || 'Applicant'}`, `Réunion annulée: ${applicantName || 'Candidat'}`, locale), customHeader);

  return { subject, text, html };
}
