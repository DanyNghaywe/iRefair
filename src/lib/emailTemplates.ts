import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';
import { formatMeetingDateTime } from '@/lib/timezone';
import { jobOpeningsUrl } from '@/lib/urls';

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
                Sent by iRefair · Connecting talent with opportunity
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
  isUpdate?: boolean;
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
    isUpdate = false,
    statusNote,
    locale = 'en',
  } = params;

  const subject = t(
    'Referral request received - iRefair',
    'Demande de recommandation reçue - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(firstName)},`;
  const thankYou = t('thank you for registering.', 'merci de vous être inscrit.', locale);

  const eyebrowText = t('REFERRAL REQUEST RECEIVED', 'DEMANDE DE RECOMMANDATION REÇUE', locale);
  const iRainLabel = t('iRAIN', 'iRAIN', locale);

  const mainText1 = t(
    "We've received your referral request. We'll review your profile and reach out when we have a referrer who matches the teams and roles you're targeting.",
    "Nous avons reçu votre demande de recommandation. Nous examinerons votre profil et vous contacterons lorsque nous aurons un recommandateur qui correspond aux équipes et aux rôles que vous ciblez.",
    locale
  );

  const whatHappensTitle = t('WHAT HAPPENS NEXT', 'PROCHAINES ÉTAPES', locale);
  const step1 = t(
    "We review your details and iRAIN to understand where you can help.",
    "Nous examinons vos détails et votre iRAIN pour comprendre où vous pouvez aider.",
    locale
  );
  const step2 = t(
    "We keep you on our radar for teams, industries, and regions that match your snapshot.",
    "Nous vous gardons sur notre radar pour les équipes, les industries et les régions qui correspondent à votre profil.",
    locale
  );
  const step3 = t(
    "When there is a fit, we'll reach out before sharing any applicant details.",
    "Quand il y a une correspondance, nous vous contacterons avant de partager les détails du candidat.",
    locale
  );

  const snapshotTitle = t('SNAPSHOT YOU SHARED', 'PROFIL QUE VOUS AVEZ PARTAGÉ', locale);
  const locationLabel = t('Location', 'Emplacement', locale);
  const authorizationLabel = t('Work Authorization', 'Autorisation de travail', locale);
  const industryLabel = t('Industry', 'Industrie', locale);
  const languagesLabel = t('Languages', 'Langues', locale);

  const ctaText = t(
    'Want to see companies hiring in Canada right now?',
    'Vous voulez voir les entreprises qui embauchent au Canada en ce moment?',
    locale
  );
  const ctaButton = t('View live openings', 'Voir les offres en direct', locale);
  const replyText = t(
    'Reply to update your availability/details',
    'Répondre pour mettre à jour votre disponibilité/détails',
    locale
  );

  // Use the imported jobOpeningsUrl - normalize it for email safety
  const openingsUrl = normalizeHttpUrl(jobOpeningsUrl) || 'https://irefair.com/hiring-companies';

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
      <li>${escapeHtml(step1)}</li>
      <li>${escapeHtml(step2)}</li>
      <li>${escapeHtml(step3)}</li>
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
    <div style="text-align:center;margin:0 0 4px 0;font-size:13px;">
      <a href="mailto:info@andbeyondca.com" style="color:#2f5fb3;text-decoration:underline;font-weight:600;">${escapeHtml(replyText)}</a>
    </div>
  `;

  const preheader = t(
    'Thank you for registering with iRefair. Your iRAIN is saved; we will reach out when we have a match.',
    'Merci de vous être inscrit avec iRefair. Votre iRAIN est enregistré; nous vous contacterons lorsque nous aurons une correspondance.',
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
${t('View openings', 'Voir les offres', locale)}: ${openingsUrl}

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
    "If you move to Canada or change your relocation plans, contact us at info@andbeyondca.com and we'll update your profile.",
    "Si vous déménagez au Canada ou changez vos plans de relocalisation, contactez-nous à info@andbeyondca.com et nous mettrons à jour votre profil.",
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
    "This confirmation link will expire in 24 hours.",
    "Ce lien de confirmation expirera dans 24 heures.",
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
    roles,
    regions,
    type,
    slots,
    locale = 'en',
    portalUrl,
  } = params;

  const subject = t(
    'Referral offer received - iRefair',
    'Offre de recommandation reçue - iRefair',
    locale
  );

  const greeting = `${t('Hi', 'Bonjour', locale)} ${escapeHtml(name)},`;
  const thankYou = t(
    'thank you for offering to refer applicants.',
    'merci d\'offrir de recommander des candidats.',
    locale
  );

  const eyebrowText = t('REFERRAL OFFER RECEIVED', 'OFFRE DE RECOMMANDATION REÇUE', locale);
  const iRrefLabel = t('iRREF', 'iRREF', locale);

  const mainText1 = t(
    "We appreciate your willingness to refer applicants. We'll reach out when we have someone who might be a good fit for your company.",
    "Nous apprécions votre volonté de recommander des candidats. Nous vous contacterons lorsque nous aurons quelqu'un qui pourrait convenir à votre entreprise.",
    locale
  );

  const mainText2 = t(
    "Thank you for contributing to the community and helping others find work in Canada.",
    "Merci de contribuer à la communauté et d'aider les autres à trouver du travail au Canada.",
    locale
  );

  const whatHappensTitle = t('WHAT HAPPENS NEXT', 'PROCHAINES ÉTAPES', locale);
  const step1 = t(
    "We review your company and industry to understand where you can help.",
    "Nous examinons votre entreprise et votre secteur pour comprendre où vous pouvez aider.",
    locale
  );
  const step2 = t(
    "We keep you on our radar for applicants who match your snapshot.",
    "Nous vous gardons sur notre radar pour les candidats qui correspondent à votre profil.",
    locale
  );
  const step3 = t(
    "When there is a fit, we'll reach out before sharing any applicant details.",
    "Quand il y a une correspondance, nous vous contacterons avant de partager les détails du candidat.",
    locale
  );

  const snapshotTitle = t('SNAPSHOT YOU SHARED', 'PROFIL QUE VOUS AVEZ PARTAGÉ', locale);
  const companyLabel = t('Company', 'Entreprise', locale);
  const careersLabel = t('Careers Portal', 'Portail de carrières', locale);
  const industryLabel = t('Industry', 'Industrie', locale);
  const rolesLabel = t('Roles', 'Rôles', locale);
  const regionsLabel = t('Regions', 'Régions', locale);
  const typeLabel = t('Type', 'Type', locale);
  const slotsLabel = t('Slots', 'Emplacements', locale);

  const ctaText1 = t(
    'Want to meet with the founder?',
    'Vous souhaitez rencontrer le fondateur?',
    locale
  );
  const ctaButton1 = t('Schedule a call', 'Planifier un appel', locale);
  const ctaText2 = t(
    'Need to update your details?',
    'Besoin de mettre à jour vos détails?',
    locale
  );
  const replyText = t('Reply to this email', 'Répondre à cet e-mail', locale);

  const portalCtaText = t(
    'Access your referrer portal',
    'Accéder à votre portail de recommandateur',
    locale
  );
  const portalCtaButton = t('Open portal', 'Ouvrir le portail', locale);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

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

  const viewCareersPortalText = t('View Careers Portal', 'Voir le portail de carrières', locale);

  const careersPortalValue = careersPortal
    ? button(viewCareersPortalText, normalizeHttpUrl(careersPortal) || careersPortal, 'outline')
    : escapeHtml(t('Not provided', 'Non fourni', locale));

  const snapshot = snapshotCard(snapshotTitle, [
    [companyLabel, escapeHtml(company)],
    [careersLabel, careersPortalValue],
    [industryLabel, escapeHtml(industry)],
    [typeLabel, escapeHtml(type)],
  ]);

  const cta = `
    ${normalizedPortalUrl ? `
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
        ${escapeHtml(portalCtaText)}
      </p>
      <div style="text-align:center;margin:0 0 16px 0;">
        ${button(portalCtaButton, normalizedPortalUrl, 'primary')}
      </div>
      ${divider}
    ` : ''}
    ${normalizedMeetLink ? `
      <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
        ${escapeHtml(ctaText1)}
      </p>
      <div style="text-align:center;margin:0 0 16px 0;">
        ${button(ctaButton1, normalizedMeetLink, 'outline')}
      </div>
    ` : ''}
    <p style="margin:0 0 8px 0;font-size:14px;line-height:1.7;color:#3b4251;text-align:center;">
      ${escapeHtml(ctaText2)}
    </p>
    <div style="text-align:center;margin:0 0 4px 0;font-size:13px;">
      <a href="mailto:info@andbeyondca.com" style="color:#2f5fb3;text-decoration:underline;font-weight:600;">${escapeHtml(replyText)}</a>
    </div>
  `;

  const preheader = t(
    'Thank you for offering to refer applicants. Your iRREF is saved; we will reach out when we have a match.',
    'Merci d\'offrir de recommander des candidats. Votre iRREF est enregistré; nous vous contacterons lorsque nous aurons une correspondance.',
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
  `;

  const html = emailWrapper(fullContent, preheader, customHeader);

  const text = `${greeting} ${thankYou}

${mainText1}

${mainText2}

${iRrefLabel}: ${iRref}

${whatHappensTitle}
1) ${step1}
2) ${step2}
3) ${step3}

${snapshotTitle}
- ${companyLabel}: ${company}
- ${careersLabel}: ${careersPortal || t('Not provided', 'Non fourni', locale)}
- ${industryLabel}: ${industry}
- ${rolesLabel}: ${roles}
- ${regionsLabel}: ${regions}
- ${typeLabel}: ${type}
- ${slotsLabel}: ${slots}

${normalizedPortalUrl ? `${portalCtaText}\n${portalCtaButton}: ${normalizedPortalUrl}\n\n` : ''}${normalizedMeetLink ? `${ctaText1}\n${ctaButton1}: ${normalizedMeetLink}\n\n` : ''}${ctaText2}
${replyText}: info@andbeyondca.com

- ${t('The iRefair team', 'L\'équipe iRefair', locale)}`;

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
  const contactEmail = 'info@andbeyondca.com';

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

export function meetFounderInvite(referrerName: string, irref: string, link?: string, portalUrl?: string): TemplateResult {
  const subject = "Invitation: Meet the Founder at iRefair";
  const normalizedLink = link ? normalizeHttpUrl(link) : null;
  const joinLink = normalizedLink || "Schedule link not provided yet - we will follow up with a calendar invitation.";
  const greeting = referrerName ? `Hi ${referrerName},` : "Hi there,";
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : "Hi there,";
  const safeIrref = escapeHtml(irref);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const text = `${greeting}

Thank you for being part of the iRefair community (iRREF ${irref}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.

Meet link: ${joinLink}

If the link is unavailable, reply with your availability and we will send you a calendar invite.
${normalizedPortalUrl ? `\nAccess your referrer portal: ${normalizedPortalUrl}\n` : ''}
- Founder, iRefair`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">You're invited to meet!</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">A quick call to discuss collaboration</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thank you for being part of the iRefair community. I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.
    </p>

    ${divider}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
      ${infoRow('Your iRREF', safeIrref)}
    </table>

    ${divider}

    ${normalizedLink ? `
      <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">Join the meeting:</p>
      <p style="margin: 0 0 24px 0;">
        ${button('Join Meeting', normalizedLink, 'primary')}
      </p>
    ` : `
      <p style="margin: 0 0 16px 0; color: ${colors.muted}; font-size: 14px; background: ${colors.background}; padding: 16px; border-radius: 10px;">
        Schedule link not provided yet - reply with your availability and we'll send you a calendar invite.
      </p>
    `}

    ${normalizedPortalUrl ? `
      ${divider}
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 15px; text-align: center;">Access your referrer portal</p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button('Open portal', normalizedPortalUrl, 'outline')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>Founder, iRefair</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">FOUNDER MEETING INVITATION</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRREF: <strong style="color:#1f2a37;">${safeIrref}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, `You're invited to meet with the iRefair founder`, customHeader);

  return { subject, text, html };
}

export function resumeRequest(applicantName: string, irain: string): TemplateResult {
  const subject = "Please share your updated resume (iRefair)";
  const greeting = applicantName ? `Hi ${applicantName},` : "Hi there,";
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : "Hi there,";
  const safeIrain = escapeHtml(irain);

  const text = `${greeting}

Thanks for being part of iRefair (iRAIN ${irain}). Could you reply to this email with your latest resume or CV? This will help us share the most up-to-date profile with referrers.

- Founder, iRefair`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Resume update request</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Help us keep your profile current</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thanks for being part of iRefair! To help connect you with the best opportunities, could you reply to this email with your latest resume or CV?
    </p>

    ${divider}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
      ${infoRow('Your iRAIN', safeIrain)}
    </table>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">How to submit:</p>
      <p style="margin: 0; color: ${colors.muted}; font-size: 14px; line-height: 1.5;">
        Simply reply to this email with your resume attached (PDF preferred). We'll update your profile right away.
      </p>
    </div>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>Founder, iRefair</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">RESUME UPDATE REQUEST</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">${safeIrain}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, `Please share your updated resume`, customHeader);

  return { subject, text, html };
}

export function matchIntro(
  applicantName: string,
  referrerName: string,
  irain: string,
  ircrn: string,
  position: string,
): TemplateResult {
  const subject = "Introduction via iRefair";
  const introApplicant = applicantName || "Applicant";
  const introReferrer = referrerName || "Referrer";
  const introApplicantHtml = escapeHtml(introApplicant);
  const introReferrerHtml = escapeHtml(introReferrer);
  const safeIrain = escapeHtml(irain);
  const safeIrcrn = escapeHtml(ircrn);
  const safePosition = position ? escapeHtml(position) : "Not specified";

  const text = `Hello ${introApplicant} and ${introReferrer},

I'm connecting you via iRefair for the role/context noted below.

- Applicant iRAIN: ${irain}
- Company iRCRN: ${ircrn}
- Position / Context: ${position || "Not specified"}

Please take the conversation forward and let us know if you need anything else.

- Founder, iRefair`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">You've been connected!</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">A new introduction via iRefair</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Hello <strong>${introApplicantHtml}</strong> and <strong>${introReferrerHtml}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      I'm connecting you for the opportunity below. Please take the conversation forward - I'm confident this could be a great match!
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Connection Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Position', safePosition)}
        ${infoRow('Applicant iRAIN', safeIrain)}
        ${infoRow('Company iRCRN', safeIrcrn)}
      </table>
    </div>

    ${divider}

    <p style="margin: 0 0 8px 0; color: ${colors.muted}; font-size: 14px;">
      <strong>Next steps:</strong> Reply-all to this email to start the conversation.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best of luck,<br>
      <strong>Founder, iRefair</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">MATCH INTRODUCTION</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">${safeIrain}</strong> • iRCRN: <strong style="color:#1f2a37;">${safeIrcrn}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, `You've been connected: ${introApplicant} meet ${introReferrer}`, customHeader);

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
  } = params;

  const displayCompany = companyName || iCrn;
  const subject = `New application for ${position} at ${displayCompany}`;
  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const displayResumeName = resumeFileName || 'Resume';
  const safeGreetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const safeApplicantId = escapeHtml(applicantId);
  const safeIrcrn = escapeHtml(iCrn);
  const safeCompanyName = companyName ? escapeHtml(companyName) : '';
  const safePosition = position ? escapeHtml(position) : '';
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : 'Not provided';
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safeApplicantPhone = applicantPhone ? escapeHtml(applicantPhone) : '';
  const approveLink = feedbackApproveUrl ? normalizeHttpUrl(feedbackApproveUrl) : null;
  const declineLink = feedbackDeclineUrl ? normalizeHttpUrl(feedbackDeclineUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const textCtas = [
    feedbackApproveUrl ? `Approve: ${feedbackApproveUrl}` : null,
    feedbackDeclineUrl ? `Decline: ${feedbackDeclineUrl}` : null,
    portalUrl ? `Your Referrer Portal: ${portalUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const textLines = [
    greeting,
    '',
    `An applicant just applied for ${position} at ${displayCompany}.`,
    `- Applicant ID: ${applicantId}`,
    companyName ? `- Company: ${companyName}` : null,
    `- Company iRCRN: ${iCrn}`,
    position ? `- Position: ${position}` : null,
    referenceNumber ? `- Reference Number: ${referenceNumber}` : null,
    applicantName ? `- Name: ${applicantName}` : null,
    applicantEmail ? `- Email: ${applicantEmail}` : null,
    applicantPhone ? `- Phone: ${applicantPhone}` : null,
    `- CV: ${normalizedResumeUrl || 'Not provided'}`,
    textCtas ? '' : null,
    textCtas || null,
    '',
    'Thanks for the quick review!',
  ]
    .filter(Boolean)
    .join('\n');

  const safeDisplayCompany = escapeHtml(displayCompany);
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">New application received!</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">An applicant is interested in ${safePosition} at ${safeDisplayCompany}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${safeGreetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Great news! An applicant just applied through iRefair. Here are the details:
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Applicant Information</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Name', safeApplicantName)}
        ${safeApplicantEmail ? infoRow('Email', `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${safeApplicantPhone ? infoRow('Phone', safeApplicantPhone) : ''}
        ${infoRow('Applicant ID', safeApplicantId)}
      </table>
    </div>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Application Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${safePosition ? infoRow('Position', safePosition) : ''}
        ${safeCompanyName ? infoRow('Company', safeCompanyName) : ''}
        ${infoRow('Company iRCRN', safeIrcrn)}
        ${safeReferenceNumber ? infoRow('Reference #', safeReferenceNumber) : ''}
        ${infoRow('Resume', normalizedResumeUrl ? `<a href="${escapeHtml(normalizedResumeUrl)}" target="_blank" style="color: ${colors.primary};">${escapeHtml(displayResumeName)}</a>` : '<span style="color: ' + colors.muted + ';">Not provided</span>')}
      </table>
    </div>

    ${divider}

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        ${normalizedResumeUrl ? `<td style="padding-right: 12px;">${button('View Resume', normalizedResumeUrl, 'secondary')}</td>` : ''}
        ${approveLink ? `<td style="padding-right: 12px;">${button('Approve', approveLink, 'primary')}</td>` : ''}
        ${declineLink ? `<td>${button('Decline', declineLink, 'danger')}</td>` : ''}
      </tr>
    </table>

    ${normalizedPortalUrl ? `
    <p style="margin: 24px 0 12px 0; color: ${colors.muted}; font-size: 14px;">
      Manage all your applications in your <a href="${escapeHtml(normalizedPortalUrl)}" style="color: ${colors.primary};">Referrer Portal</a>.
    </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.muted}; font-size: 14px;">
      Thank you for your quick review!
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">NEW APPLICATION RECEIVED</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">${safeCompanyName ? `Company: <strong style="color:#1f2a37;">${safeCompanyName}</strong> &bull; ` : ''}iRCRN: <strong style="color:#1f2a37;">${safeIrcrn}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, `New application for ${position} at ${displayCompany}`, customHeader);

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
  } = params;

  const subject = `Application received: ${position}`;
  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const safeGreetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeApplicantId = escapeHtml(applicantId);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = escapeHtml(position);
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeResumeName = resumeFileName ? escapeHtml(resumeFileName) : '';
  const safeSubmissionId = escapeHtml(submissionId);

  const text = `${greeting}

Thank you for submitting your application through iRefair!

Here's a summary of what you submitted:

- Submission ID: ${submissionId}
- Your iRAIN: ${applicantId}
- Company (iRCRN): ${iCrn}
- Position: ${position}${referenceNumber ? `\n- Reference Number: ${referenceNumber}` : ''}${resumeFileName ? `\n- Resume: ${resumeFileName}` : ''}

What happens next?
1. Your application has been forwarded to a referrer at the company
2. They will review your profile and resume
3. If there's a match, you'll be connected via email

Keep this email for your records. You can use the same iRAIN and Applicant Key to apply to other companies.

Good luck!
- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Application received! 🎉</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">We've forwarded your application to a referrer</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${safeGreetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thank you for submitting your application through iRefair! Here's a summary of what you submitted:
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Application Summary</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Submission ID', safeSubmissionId)}
        ${infoRow('Your iRAIN', safeApplicantId)}
        ${infoRow('Company (iRCRN)', safeIrcrn)}
        ${infoRow('Position', safePosition)}
        ${safeReferenceNumber ? infoRow('Reference #', safeReferenceNumber) : ''}
        ${safeResumeName ? infoRow('Resume', safeResumeName) : ''}
      </table>
    </div>

    ${divider}

    <div style="background: linear-gradient(135deg, rgba(61, 139, 253, 0.08), rgba(122, 215, 227, 0.08)); padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 15px; font-weight: 700;">What happens next?</p>
      <ol style="margin: 0; padding-left: 20px; color: ${colors.ink}; font-size: 14px; line-height: 1.8;">
        <li>Your application has been forwarded to a referrer at the company</li>
        <li>They will review your profile and resume</li>
        <li>If there's a match, you'll be connected via email</li>
      </ol>
    </div>

    <p style="margin: 16px 0; color: ${colors.muted}; font-size: 14px; line-height: 1.6;">
      <strong>Tip:</strong> Keep this email for your records. You can use the same iRAIN and Applicant Key to apply to other companies on iRefair.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Good luck! 🤞<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">APPLICATION RECEIVED</div>
      <div style="font-size:13px;color:#1f2a37;margin-top:10px;">iRAIN: <strong style="color:#1f2a37;">${safeApplicantId}</strong></div>
    </div>
  `;

  const html = emailWrapper(content, `Your application for ${position} has been received`, customHeader);

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
  } = params;

  const formattedDateTime = formatMeetingDateTime(meetingDate, meetingTime, meetingTimezone);
  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeReferrerName = referrerName ? escapeHtml(referrerName) : 'a referrer';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const normalizedMeetingUrl = normalizeHttpUrl(meetingUrl);
  const rescheduleUrl = `${BASE_URL}/api/referrer/reschedule?token=${encodeURIComponent(rescheduleToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = `Meeting scheduled: ${position || 'Interview'}`;

  const text = `${greeting}

Great news! ${referrerName || 'A referrer'} at ${companyName || 'the company'} would like to meet with you regarding ${position || 'your application'}.

Meeting Details:
- When: ${formattedDateTime}
- Join link: ${normalizedMeetingUrl || 'Link will be provided'}

Please join on time. If you need to reschedule, use this link: ${rescheduleUrl}

Good luck with your meeting!
- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Meeting scheduled!</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">You have an upcoming interview</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Great news! <strong>${safeReferrerName}</strong> at <strong>${safeCompanyName}</strong> would like to meet with you regarding <strong>${safePosition}</strong>.
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Meeting Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('When', `<strong>${escapeHtml(formattedDateTime)}</strong>`)}
      </table>
    </div>

    ${normalizedMeetingUrl ? `
      <p style="margin: 24px 0 16px 0; text-align: center;">
        ${button('Join Meeting', normalizedMeetingUrl, 'primary')}
      </p>
    ` : `
      <p style="margin: 16px 0; color: ${colors.muted}; font-size: 14px; background: ${colors.background}; padding: 16px; border-radius: 10px;">
        The meeting link will be provided separately.
      </p>
    `}

    ${divider}

    <p style="margin: 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
      Need to reschedule? <a href="${escapeHtml(rescheduleUrl)}" style="color: ${colors.primary};">Request a new time</a>
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Good luck!<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">MEETING SCHEDULED</div>
    </div>
  `;

  const html = emailWrapper(content, `Meeting scheduled for ${formattedDateTime}`, customHeader);

  return { subject, text, html };
}

type MeetingCancelledParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  reason?: string;
};

export function meetingCancelledToApplicant(params: MeetingCancelledParams): TemplateResult {
  const { applicantName, referrerName, companyName, position, reason } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeReferrerName = referrerName ? escapeHtml(referrerName) : 'The referrer';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'your application';
  const safeReason = reason ? escapeHtml(reason) : '';

  const subject = `Meeting cancelled: ${position || 'Interview'}`;

  const text = `${greeting}

Unfortunately, your scheduled meeting with ${referrerName || 'the referrer'} at ${companyName || 'the company'} regarding ${position || 'your application'} has been cancelled.${reason ? `\n\nReason: ${reason}` : ''}

If appropriate, a new meeting may be scheduled. We'll keep you posted.

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Meeting cancelled</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Your scheduled meeting has been cancelled</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Unfortunately, your scheduled meeting with <strong>${safeReferrerName}</strong> at <strong>${safeCompanyName}</strong> regarding <strong>${safePosition}</strong> has been cancelled.
    </p>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0;">
        <p style="margin: 0; color: ${colors.muted}; font-size: 14px;">
          <strong>Reason:</strong> ${safeReason}
        </p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      If appropriate, a new meeting may be scheduled. We'll keep you posted.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">MEETING CANCELLED</div>
    </div>
  `;

  const html = emailWrapper(content, `Your meeting has been cancelled`, customHeader);

  return { subject, text, html };
}

type RejectionParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
};

export function rejectionToApplicant(params: RejectionParams): TemplateResult {
  const { applicantName, referrerName, companyName, position } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';

  const subject = `Application update: ${position || 'Your application'}`;

  const text = `${greeting}

Thank you for your interest in ${position || 'the position'} at ${companyName || 'the company'}.

After careful review, we've decided not to move forward with your application at this time. This decision doesn't reflect on your qualifications - it simply means we're pursuing applicants whose experience more closely matches our current needs.

We encourage you to continue exploring opportunities on iRefair. The right match is out there!

Best of luck in your job search.
- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Application update</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Regarding your application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thank you for your interest in <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      After careful review, we've decided not to move forward with your application at this time. This decision doesn't reflect on your qualifications - it simply means we're pursuing applicants whose experience more closely matches our current needs.
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      We encourage you to continue exploring opportunities on iRefair. The right match is out there!
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best of luck in your job search,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">APPLICATION UPDATE</div>
    </div>
  `;

  const html = emailWrapper(content, `Update on your application`, customHeader);

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
  } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeFeedback = feedback ? escapeHtml(feedback) : '';

  const updateUrl = includeUpdateLink && updateToken && applicationId
    ? `${BASE_URL}/applicant?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`
    : null;

  const subject = `CV feedback: ${position || 'Your application'}`;

  const meetingCancelledText = meetingWasCancelled
    ? '\n\nNote: Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.'
    : '';

  const text = `${greeting}

Thank you for applying to ${position || 'the position'} at ${companyName || 'the company'}.

After reviewing your CV, we found that it doesn't quite match the requirements for this role.${feedback ? `\n\nFeedback: ${feedback}` : ''}${meetingCancelledText}
${updateUrl ? `\nIf you'd like to update your CV and resubmit, you can do so here: ${updateUrl}\n\nThis link expires in 7 days.` : ''}

Don't be discouraged - there are many opportunities on iRefair that may be a better fit!

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">CV feedback</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Regarding your application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thank you for applying to <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      After reviewing your CV, we found that it doesn't quite match the requirements for this role.
    </p>

    ${safeFeedback ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Feedback:</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeFeedback}</p>
      </div>
    ` : ''}

    ${meetingWasCancelled ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Note:</strong> Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.
        </p>
      </div>
    ` : ''}

    ${updateUrl ? `
      ${divider}
      <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
        If you'd like to update your CV and resubmit, click the button below:
      </p>
      <p style="margin: 0 0 8px 0; text-align: center;">
        ${button('Update your CV / details', updateUrl, 'primary')}
      </p>
      <p style="margin: 8px 0 0 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
        This link expires in 7 days.
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Don't be discouraged - there are many opportunities on iRefair that may be a better fit!
    </p>

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">CV FEEDBACK</div>
    </div>
  `;

  const html = emailWrapper(content, `Feedback on your CV`, customHeader);

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
  } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeFeedback = feedback ? escapeHtml(feedback) : '';

  const updateUrl = `${BASE_URL}/applicant?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = `Action needed: Update your CV`;

  const meetingCancelledText = meetingWasCancelled
    ? '\n\nNote: Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.'
    : '';

  const text = `${greeting}

The referrer reviewing your application for ${position || 'the position'} at ${companyName || 'the company'} has requested that you update your CV.${feedback ? `\n\nFeedback: ${feedback}` : ''}${meetingCancelledText}

Please update your CV here: ${updateUrl}

This link expires in 7 days.

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">CV update requested</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Action needed for your application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      The referrer reviewing your application for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong> has requested that you update your CV.
    </p>

    ${safeFeedback ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Feedback:</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeFeedback}</p>
      </div>
    ` : ''}

    ${meetingWasCancelled ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Note:</strong> Your previously scheduled meeting has been cancelled. Once you update your CV, the referrer will review it and schedule a new meeting with you.
        </p>
      </div>
    ` : ''}

    ${divider}

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">Update your CV to continue:</p>
    <p style="margin: 0 0 8px 0; text-align: center;">
      ${button('Update your CV / details', updateUrl, 'primary')}
    </p>
    <p style="margin: 8px 0 0 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
      This link expires in 7 days.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">ACTION NEEDED</div>
    </div>
  `;

  const html = emailWrapper(content, `Action needed: Update your CV`, customHeader);

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
  } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeRequestedInfo = requestedInfo ? escapeHtml(requestedInfo) : '';

  const updateUrl = `${BASE_URL}/applicant?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = `Action needed: Additional information requested`;

  const meetingCancelledText = meetingWasCancelled
    ? '\n\nNote: Your previously scheduled meeting has been cancelled. Once you provide the requested information, the referrer will review it and schedule a new meeting with you.'
    : '';

  const text = `${greeting}

The referrer reviewing your application for ${position || 'the position'} at ${companyName || 'the company'} has requested additional information.${requestedInfo ? `\n\nRequested: ${requestedInfo}` : ''}${meetingCancelledText}

Please provide the information here: ${updateUrl}

This link expires in 7 days.

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Information requested</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Action needed for your application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      The referrer reviewing your application for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong> has requested additional information.
    </p>

    ${safeRequestedInfo ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Requested information:</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeRequestedInfo}</p>
      </div>
    ` : ''}

    ${meetingWasCancelled ? `
      <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>Note:</strong> Your previously scheduled meeting has been cancelled. Once you provide the requested information, the referrer will review it and schedule a new meeting with you.
        </p>
      </div>
    ` : ''}

    ${divider}

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">Provide the information to continue:</p>
    <p style="margin: 0 0 8px 0; text-align: center;">
      ${button('Update your CV / details', updateUrl, 'primary')}
    </p>
    <p style="margin: 8px 0 0 0; color: ${colors.muted}; font-size: 13px; text-align: center;">
      This link expires in 7 days.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">INFORMATION REQUEST</div>
    </div>
  `;

  const html = emailWrapper(content, `Action needed: Additional information requested`, customHeader);

  return { subject, text, html };
}

type InterviewCompletedParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
};

export function interviewCompletedToApplicant(params: InterviewCompletedParams): TemplateResult {
  const { applicantName, companyName, position } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';

  const subject = `Interview completed: ${position || 'Your application'}`;

  const text = `${greeting}

Thank you for completing your interview for ${position || 'the position'} at ${companyName || 'the company'}.

The referrer will be reviewing your interview and will follow up with next steps. We'll keep you posted on any updates.

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Interview completed</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Thank you for your time</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thank you for completing your interview for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      The referrer will be reviewing your interview and will follow up with next steps. We'll keep you posted on any updates.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">INTERVIEW COMPLETED</div>
    </div>
  `;

  const html = emailWrapper(content, `Your interview has been completed`, customHeader);

  return { subject, text, html };
}

type JobOfferParams = {
  applicantName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  message?: string;
};

export function jobOfferToApplicant(params: JobOfferParams): TemplateResult {
  const { applicantName, companyName, position, message } = params;

  const greeting = applicantName ? `Hi ${applicantName},` : 'Hi,';
  const greetingHtml = applicantName ? `Hi ${escapeHtml(applicantName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeMessage = message ? escapeHtml(message) : '';

  const subject = `${companyName || 'Company'} - Job Offer for ${position || 'your application'}`;

  const text = `${greeting}

We are pleased to inform you that ${companyName || 'the company'} would like to offer you the position of ${position || 'the role you applied for'}.${message ? `\n\n${message}` : ''}

The referrer or hiring team will be in touch with the formal offer details.

Best regards,
The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Job Offer</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Great news about your application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      We are pleased to inform you that <strong>${safeCompanyName}</strong> would like to offer you the position of <strong>${safePosition}</strong>.
    </p>

    ${safeMessage ? `
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(122, 215, 227, 0.08)); padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.success};">
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      The referrer or hiring team will be in touch with the formal offer details.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">JOB OFFER</div>
    </div>
  `;

  const html = emailWrapper(content, `Job Offer - ${safeCompanyName}`, customHeader);

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
};

export function rescheduleRequestToReferrer(params: RescheduleRequestParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    applicantEmail,
    companyName,
    position,
    originalDateTime,
    reason,
    proposedTimes,
    applicationId,
    portalUrl,
  } = params;

  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : 'The applicant';
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeOriginalDateTime = originalDateTime ? escapeHtml(originalDateTime) : '';
  const safeReason = reason ? escapeHtml(reason) : '';
  const safeApplicationId = escapeHtml(applicationId);
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  // Format proposed times for display
  const hasProposedTimes = proposedTimes && proposedTimes.length > 0;
  const proposedTimesText = hasProposedTimes
    ? proposedTimes.map((t, i) => `Option ${i + 1}: ${t.date} at ${t.time}`).join('\n')
    : '';

  const subject = `Reschedule request: ${applicantName || 'Applicant'} for ${position || 'meeting'}`;

  const text = `${greeting}

${applicantName || 'The applicant'} has requested to reschedule their meeting for ${position || 'the position'}.${originalDateTime ? `\n\nOriginal time: ${originalDateTime}` : ''}${reason ? `\nReason: ${reason}` : ''}${hasProposedTimes ? `\n\nProposed alternative times:\n${proposedTimesText}` : ''}

Application ID: ${applicationId}${applicantEmail ? `\nApplicant email: ${applicantEmail}` : ''}

${normalizedPortalUrl ? `Open your portal to reschedule the meeting: ${normalizedPortalUrl}` : 'Please log in to your portal to reschedule the meeting.'}

- The iRefair Team`;

  // Build proposed times HTML
  const proposedTimesHtml = hasProposedTimes
    ? `
      <div style="background: #e8f5e9; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid #4caf50;">
        <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Suggested alternative times:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${proposedTimes.map((t, i) => `
            <tr>
              <td style="padding: 6px 0; color: ${colors.muted}; font-size: 13px; width: 70px;">Option ${i + 1}</td>
              <td style="padding: 6px 0; color: ${colors.ink}; font-size: 14px; font-weight: 500;">${escapeHtml(t.date)} at ${escapeHtml(t.time)}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Reschedule request</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">An applicant needs to reschedule</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      <strong>${safeApplicantName}</strong> has requested to reschedule their meeting for <strong>${safePosition}</strong>.
    </p>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Application ID', safeApplicationId)}
        ${safeApplicantEmail ? infoRow('Applicant email', `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${safeOriginalDateTime ? infoRow('Original time', safeOriginalDateTime) : ''}
      </table>
    </div>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Reason:</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
      </div>
    ` : ''}

    ${proposedTimesHtml}

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        Open your portal to reschedule the meeting
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button('Open portal', normalizedPortalUrl, 'primary')}
      </p>
    ` : `
      <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
        Please log in to your portal to reschedule the meeting.
      </p>
    `}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">RESCHEDULE REQUEST</div>
    </div>
  `;

  const html = emailWrapper(content, `Reschedule request from ${applicantName || 'a applicant'}`, customHeader);

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
  } = params;

  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : 'The applicant';
  const safeApplicantEmail = applicantEmail ? escapeHtml(applicantEmail) : '';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeApplicationId = escapeHtml(applicationId);
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const updatedFieldsList = updatedFields && updatedFields.length > 0
    ? updatedFields.map((f) => escapeHtml(f)).join(', ')
    : 'their profile';

  const subject = `Applicant updated: ${applicantName || 'Application'} for ${position || 'your review'}`;

  const text = `${greeting}

${applicantName || 'The applicant'} has updated ${updatedFields && updatedFields.length > 0 ? updatedFields.join(', ') : 'their profile'} for their application to ${position || 'the position'}.

Application ID: ${applicationId}${applicantEmail ? `\nApplicant email: ${applicantEmail}` : ''}${resumeUrl ? `\nUpdated resume: ${resumeUrl}` : ''}

${normalizedPortalUrl ? `Open your portal to review the updates: ${normalizedPortalUrl}` : 'Please log in to your portal to review the updates.'}

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Applicant updated</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">New information available for review</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      <strong>${safeApplicantName}</strong> has updated <strong>${updatedFieldsList}</strong> for their application to <strong>${safePosition}</strong>.
    </p>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Application ID', safeApplicationId)}
        ${safeApplicantEmail ? infoRow('Applicant email', `<a href="mailto:${safeApplicantEmail}" style="color: ${colors.primary};">${safeApplicantEmail}</a>`) : ''}
        ${updatedFields && updatedFields.length > 0 ? infoRow('Updated fields', updatedFieldsList) : ''}
      </table>
    </div>

    ${normalizedResumeUrl ? `
      <p style="margin: 16px 0; text-align: center;">
        ${button('View Updated Resume', normalizedResumeUrl, 'outline')}
      </p>
    ` : ''}

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        Open your portal to review the updates
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button('Open portal', normalizedPortalUrl, 'primary')}
      </p>
    ` : `
      <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
        Please log in to your portal to review the updates.
      </p>
    `}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">APPLICATION UPDATED</div>
    </div>
  `;

  const html = emailWrapper(content, `${applicantName || 'A applicant'} has updated their application`, customHeader);

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
  } = params;

  const formattedDateTime = formatMeetingDateTime(meetingDate, meetingTime, meetingTimezone);
  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : 'The applicant';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const normalizedMeetingUrl = meetingUrl ? normalizeHttpUrl(meetingUrl) : null;
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const subject = `Meeting confirmed: ${applicantName || 'Applicant'} for ${position || 'Interview'}`;

  const text = `${greeting}

You have scheduled a meeting with ${applicantName || 'an applicant'} for ${position || 'the position'} at ${companyName || 'the company'}.

Meeting Details:
- When: ${formattedDateTime}
- Join link: ${normalizedMeetingUrl || 'Not provided'}

${normalizedPortalUrl ? `Manage this application in your portal: ${normalizedPortalUrl}` : ''}

The applicant has been notified and will receive the meeting details.

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Meeting confirmed</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Your meeting has been scheduled</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      You have scheduled a meeting with <strong>${safeApplicantName}</strong> for <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Meeting Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('When', `<strong>${escapeHtml(formattedDateTime)}</strong>`)}
        ${normalizedMeetingUrl ? infoRow('Join link', `<a href="${escapeHtml(normalizedMeetingUrl)}" style="color: ${colors.primary};">${escapeHtml(normalizedMeetingUrl)}</a>`, false) : ''}
      </table>
    </div>

    <p style="margin: 16px 0; color: ${colors.success}; font-size: 14px; background: #ecfdf5; padding: 12px 16px; border-radius: 10px; text-align: center;">
      ✓ The applicant has been notified and will receive the meeting details.
    </p>

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        Manage this application in your portal
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button('Open portal', normalizedPortalUrl, 'primary')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">MEETING CONFIRMED</div>
    </div>
  `;

  const html = emailWrapper(content, `Meeting scheduled for ${formattedDateTime}`, customHeader);

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
};

export function meetingCancelledToReferrer(params: MeetingCancelledToReferrerParams): TemplateResult {
  const {
    referrerName,
    applicantName,
    companyName,
    position,
    reason,
    cancelledDueToAction,
    portalUrl,
  } = params;

  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const safeApplicantName = applicantName ? escapeHtml(applicantName) : 'The applicant';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeReason = reason ? escapeHtml(reason) : '';
  const safeCancelledDueToAction = cancelledDueToAction ? escapeHtml(cancelledDueToAction) : '';
  const normalizedPortalUrl = portalUrl ? normalizeHttpUrl(portalUrl) : null;

  const subject = `Meeting cancelled: ${applicantName || 'Applicant'} for ${position || 'Interview'}`;

  const reasonText = reason
    ? `\n\nReason: ${reason}`
    : cancelledDueToAction
      ? `\n\nThis meeting was cancelled because you ${cancelledDueToAction}.`
      : '';

  const text = `${greeting}

The meeting with ${applicantName || 'the applicant'} for ${position || 'the position'} has been cancelled.${reasonText}

${normalizedPortalUrl ? `Manage this application in your portal: ${normalizedPortalUrl}` : ''}

The applicant has been notified.

- The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Meeting cancelled</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Confirmation of cancellation</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      The meeting with <strong>${safeApplicantName}</strong> for <strong>${safePosition}</strong> has been cancelled.
    </p>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Reason:</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
      </div>
    ` : safeCancelledDueToAction ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.primary};">
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">
          This meeting was cancelled because you <strong>${safeCancelledDueToAction}</strong>.
        </p>
      </div>
    ` : ''}

    <p style="margin: 16px 0; color: ${colors.muted}; font-size: 14px; background: ${colors.background}; padding: 12px 16px; border-radius: 10px; text-align: center;">
      The applicant has been notified of this cancellation.
    </p>

    ${normalizedPortalUrl ? `
      <p style="margin: 16px 0 12px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6; text-align: center;">
        Manage this application in your portal
      </p>
      <p style="margin: 0 0 16px 0; text-align: center;">
        ${button('Open portal', normalizedPortalUrl, 'primary')}
      </p>
    ` : ''}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const customHeader = `
    <div style="padding:22px 28px;background:#f8fafc;border-bottom:1px solid #e6e9f0;">
      <div style="font-size:22px;font-weight:700;color:#2f5fb3;">iRefair</div>
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c6675;margin-top:8px;">MEETING CANCELLED</div>
    </div>
  `;

  const html = emailWrapper(content, `Meeting cancelled: ${applicantName || 'Applicant'}`, customHeader);

  return { subject, text, html };
}
