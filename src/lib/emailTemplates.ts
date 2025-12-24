import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';

type TemplateResult = {
  subject: string;
  text: string;
  html: string;
};

// Brand colors from the app
const colors = {
  primary: '#3d8bfd',      // Blue accent
  primaryDark: '#2563eb',  // Darker blue for hover states
  secondary: '#f47c5d',    // Coral accent
  ink: '#0f172a',          // Dark text
  muted: '#64748b',        // Gray text
  line: '#e2e8f0',         // Border color
  background: '#f8fafc',   // Light gray background
  white: '#ffffff',
  success: '#10b981',      // Green
  error: '#e11d48',        // Red
};

// Reusable email wrapper
const emailWrapper = (content: string, preheader?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>iRefair</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    a { color: ${colors.primary}; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .content-cell { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.white}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}

  <!-- Main container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.white};">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Email body -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; color: ${colors.ink}; letter-spacing: -0.5px;">
                      <span style="display: inline-block; width: 10px; height: 10px; background: ${colors.primary}; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                      iRefair
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.white}; border: 1px solid ${colors.line}; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td class="content-cell" style="padding: 32px 28px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="color: ${colors.muted}; font-size: 13px; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0;">
                      Sent by <strong style="color: ${colors.ink};">iRefair</strong> · Connecting talent with opportunity
                    </p>
                    <p style="margin: 0; color: ${colors.muted};">
                      Questions? Reply to this email or contact us.
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
</html>`;

// Reusable button component
const button = (text: string, url: string, variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary') => {
  const styles = {
    primary: `background-color: ${colors.primary}; color: ${colors.white}; border: none;`,
    secondary: `background-color: ${colors.ink}; color: ${colors.white}; border: none;`,
    outline: `background-color: transparent; color: ${colors.ink}; border: 2px solid ${colors.line};`,
    danger: `background-color: transparent; color: ${colors.error}; border: 2px solid ${colors.error};`,
  };

  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" style="display: inline-block; padding: 14px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; ${styles[variant]}">${escapeHtml(text)}</a>`;
};

// Reusable info row
const infoRow = (label: string, value: string) => `
  <tr>
    <td style="padding: 8px 0; color: ${colors.muted}; font-size: 14px; width: 140px; vertical-align: top;">${escapeHtml(label)}</td>
    <td style="padding: 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 500;">${value}</td>
  </tr>`;

// Reusable divider
const divider = `<hr style="border: none; border-top: 1px solid ${colors.line}; margin: 24px 0;">`;

export function meetFounderInvite(referrerName: string, irref: string, link?: string): TemplateResult {
  const subject = "Invitation: Meet the Founder at iRefair";
  const normalizedLink = link ? normalizeHttpUrl(link) : null;
  const joinLink = normalizedLink || "Schedule link not provided yet — we will follow up with a calendar invitation.";
  const greeting = referrerName ? `Hi ${referrerName},` : "Hi there,";
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : "Hi there,";
  const safeIrref = escapeHtml(irref);

  const text = `${greeting}

Thank you for being part of the iRefair community (iRREF ${irref}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.

Meet link: ${joinLink}

If the link is unavailable, reply with your availability and we will send you a calendar invite.

— Founder, iRefair`;

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
        Schedule link not provided yet — reply with your availability and we'll send you a calendar invite.
      </p>
    `}

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>Founder, iRefair</strong>
    </p>
  `;

  const html = emailWrapper(content, `You're invited to meet with the iRefair founder`);

  return { subject, text, html };
}

export function resumeRequest(candidateName: string, irain: string): TemplateResult {
  const subject = "Please share your updated resume (iRefair)";
  const greeting = candidateName ? `Hi ${candidateName},` : "Hi there,";
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : "Hi there,";
  const safeIrain = escapeHtml(irain);

  const text = `${greeting}

Thanks for being part of iRefair (iRAIN ${irain}). Could you reply to this email with your latest resume or CV? This will help us share the most up-to-date profile with referrers.

— Founder, iRefair`;

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

  const html = emailWrapper(content, `Please share your updated resume`);

  return { subject, text, html };
}

export function matchIntro(
  candidateName: string,
  referrerName: string,
  irain: string,
  ircrn: string,
  position: string,
): TemplateResult {
  const subject = "Introduction via iRefair";
  const introCandidate = candidateName || "Candidate";
  const introReferrer = referrerName || "Referrer";
  const introCandidateHtml = escapeHtml(introCandidate);
  const introReferrerHtml = escapeHtml(introReferrer);
  const safeIrain = escapeHtml(irain);
  const safeIrcrn = escapeHtml(ircrn);
  const safePosition = position ? escapeHtml(position) : "Not specified";

  const text = `Hello ${introCandidate} and ${introReferrer},

I'm connecting you via iRefair for the role/context noted below.

- Candidate iRAIN: ${irain}
- Company iRCRN: ${ircrn}
- Position / Context: ${position || "Not specified"}

Please take the conversation forward and let us know if you need anything else.

— Founder, iRefair`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">You've been connected!</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">A new introduction via iRefair</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Hello <strong>${introCandidateHtml}</strong> and <strong>${introReferrerHtml}</strong>,
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      I'm connecting you for the opportunity below. Please take the conversation forward — I'm confident this could be a great match!
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Connection Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Position', safePosition)}
        ${infoRow('Candidate iRAIN', safeIrain)}
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

  const html = emailWrapper(content, `You've been connected: ${introCandidate} meet ${introReferrer}`);

  return { subject, text, html };
}

type ReferrerApplicationParams = {
  referrerName?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateId: string;
  iCrn: string;
  position: string;
  resumeUrl?: string;
  resumeFileName?: string;
  referenceNumber?: string;
  feedbackApproveUrl?: string;
  feedbackDeclineUrl?: string;
};

export function applicationSubmittedToReferrer(params: ReferrerApplicationParams): TemplateResult {
  const {
    referrerName,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateId,
    iCrn,
    position,
    resumeUrl,
    resumeFileName,
    referenceNumber,
    feedbackApproveUrl,
    feedbackDeclineUrl,
  } = params;

  const subject = `New application for ${position || iCrn}`;
  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const displayResumeName = resumeFileName || 'Resume';
  const safeGreetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const safeCandidateId = escapeHtml(candidateId);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = position ? escapeHtml(position) : '';
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeCandidateName = candidateName ? escapeHtml(candidateName) : 'Not provided';
  const safeCandidateEmail = candidateEmail ? escapeHtml(candidateEmail) : '';
  const safeCandidatePhone = candidatePhone ? escapeHtml(candidatePhone) : '';
  const approveLink = feedbackApproveUrl ? normalizeHttpUrl(feedbackApproveUrl) : null;
  const declineLink = feedbackDeclineUrl ? normalizeHttpUrl(feedbackDeclineUrl) : null;

  const textCtas = [
    feedbackApproveUrl ? `Approve: ${feedbackApproveUrl}` : null,
    feedbackDeclineUrl ? `Decline: ${feedbackDeclineUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const textLines = [
    greeting,
    '',
    `A candidate just applied for ${iCrn}.`,
    `- Candidate ID: ${candidateId}`,
    position ? `- Position: ${position}` : null,
    referenceNumber ? `- Reference Number: ${referenceNumber}` : null,
    candidateName ? `- Name: ${candidateName}` : null,
    candidateEmail ? `- Email: ${candidateEmail}` : null,
    candidatePhone ? `- Phone: ${candidatePhone}` : null,
    `- CV: ${normalizedResumeUrl || 'Not provided'}`,
    textCtas ? '' : null,
    textCtas || null,
    '',
    'Thanks for the quick review!',
  ]
    .filter(Boolean)
    .join('\n');

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">New application received!</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">A candidate is interested in ${safePosition || safeIrcrn}</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${safeGreetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Great news! A candidate just applied through iRefair. Here are the details:
    </p>

    ${divider}

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Candidate Information</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Name', safeCandidateName)}
        ${safeCandidateEmail ? infoRow('Email', `<a href="mailto:${safeCandidateEmail}" style="color: ${colors.primary};">${safeCandidateEmail}</a>`) : ''}
        ${safeCandidatePhone ? infoRow('Phone', safeCandidatePhone) : ''}
        ${infoRow('Candidate ID', safeCandidateId)}
      </table>
    </div>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <p style="margin: 0 0 12px 0; color: ${colors.ink}; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Application Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${safePosition ? infoRow('Position', safePosition) : ''}
        ${infoRow('Company iRCRN', safeIrcrn)}
        ${safeReferenceNumber ? infoRow('Reference #', safeReferenceNumber) : ''}
        ${infoRow('Resume', normalizedResumeUrl ? `<a href="${escapeHtml(normalizedResumeUrl)}" target="_blank" style="color: ${colors.primary};">${escapeHtml(displayResumeName)}</a>` : '<span style="color: ' + colors.muted + ';">Not provided</span>')}
      </table>
    </div>

    ${divider}

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; font-weight: 600;">Take action:</p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        ${normalizedResumeUrl ? `<td style="padding-right: 12px;">${button('View Resume', normalizedResumeUrl, 'secondary')}</td>` : ''}
        ${approveLink ? `<td style="padding-right: 12px;">${button('Approve', approveLink, 'primary')}</td>` : ''}
        ${declineLink ? `<td>${button('Decline', declineLink, 'danger')}</td>` : ''}
      </tr>
    </table>

    <p style="margin: 24px 0 0 0; color: ${colors.muted}; font-size: 14px;">
      Thank you for your quick review!
    </p>
  `;

  const html = emailWrapper(content, `New application for ${position || iCrn}`);

  return { subject, text: textLines, html };
}
