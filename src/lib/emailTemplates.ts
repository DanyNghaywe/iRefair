import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';
import { formatMeetingDateTime } from '@/lib/timezone';

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

type CandidateConfirmationParams = {
  candidateName?: string;
  candidateEmail: string;
  candidateId: string;
  iCrn: string;
  position: string;
  referenceNumber?: string;
  resumeFileName?: string;
  submissionId: string;
};

export function applicationConfirmationToCandidate(params: CandidateConfirmationParams): TemplateResult {
  const {
    candidateName,
    candidateId,
    iCrn,
    position,
    referenceNumber,
    resumeFileName,
    submissionId,
  } = params;

  const subject = `Application received: ${position}`;
  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const safeGreetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCandidateId = escapeHtml(candidateId);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = escapeHtml(position);
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeResumeName = resumeFileName ? escapeHtml(resumeFileName) : '';
  const safeSubmissionId = escapeHtml(submissionId);

  const text = `${greeting}

Thank you for submitting your application through iRefair!

Here's a summary of what you submitted:

- Submission ID: ${submissionId}
- Your iRAIN: ${candidateId}
- Company (iRCRN): ${iCrn}
- Position: ${position}${referenceNumber ? `\n- Reference Number: ${referenceNumber}` : ''}${resumeFileName ? `\n- Resume: ${resumeFileName}` : ''}

What happens next?
1. Your application has been forwarded to a referrer at the company
2. They will review your profile and resume
3. If there's a match, you'll be connected via email

Keep this email for your records. You can use the same iRAIN and Candidate Key to apply to other companies.

Good luck!
— The iRefair Team`;

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
        ${infoRow('Your iRAIN', safeCandidateId)}
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
      <strong>Tip:</strong> Keep this email for your records. You can use the same iRAIN and Candidate Key to apply to other companies on iRefair.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Good luck! 🤞<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const html = emailWrapper(content, `Your application for ${position} has been received`);

  return { subject, text, html };
}

// ============================================================================
// REFERRER PORTAL EMAIL TEMPLATES
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://irefair.com';

type MeetingInviteParams = {
  candidateName?: string;
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

export function meetingInviteToCandidate(params: MeetingInviteParams): TemplateResult {
  const {
    candidateName,
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
  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
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
— The iRefair Team`;

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

  const html = emailWrapper(content, `Meeting scheduled for ${formattedDateTime}`);

  return { subject, text, html };
}

type MeetingCancelledParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  reason?: string;
};

export function meetingCancelledToCandidate(params: MeetingCancelledParams): TemplateResult {
  const { candidateName, referrerName, companyName, position, reason } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeReferrerName = referrerName ? escapeHtml(referrerName) : 'The referrer';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'your application';
  const safeReason = reason ? escapeHtml(reason) : '';

  const subject = `Meeting cancelled: ${position || 'Interview'}`;

  const text = `${greeting}

Unfortunately, your scheduled meeting with ${referrerName || 'the referrer'} at ${companyName || 'the company'} regarding ${position || 'your application'} has been cancelled.${reason ? `\n\nReason: ${reason}` : ''}

If appropriate, a new meeting may be scheduled. We'll keep you posted.

— The iRefair Team`;

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

  const html = emailWrapper(content, `Your meeting has been cancelled`);

  return { subject, text, html };
}

type RejectionParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
};

export function rejectionToCandidate(params: RejectionParams): TemplateResult {
  const { candidateName, referrerName, companyName, position } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';

  const subject = `Application update: ${position || 'Your application'}`;

  const text = `${greeting}

Thank you for your interest in ${position || 'the position'} at ${companyName || 'the company'}.

After careful review, we've decided not to move forward with your application at this time. This decision doesn't reflect on your qualifications — it simply means we're pursuing candidates whose experience more closely matches our current needs.

We encourage you to continue exploring opportunities on iRefair. The right match is out there!

Best of luck in your job search.
— The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Application update</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">Regarding your application</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Thank you for your interest in <strong>${safePosition}</strong> at <strong>${safeCompanyName}</strong>.
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      After careful review, we've decided not to move forward with your application at this time. This decision doesn't reflect on your qualifications — it simply means we're pursuing candidates whose experience more closely matches our current needs.
    </p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      We encourage you to continue exploring opportunities on iRefair. The right match is out there!
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best of luck in your job search,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const html = emailWrapper(content, `Update on your application`);

  return { subject, text, html };
}

type CvMismatchParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  feedback?: string;
  includeUpdateLink?: boolean;
  updateToken?: string;
  applicationId?: string;
};

export function cvMismatchToCandidate(params: CvMismatchParams): TemplateResult {
  const {
    candidateName,
    companyName,
    position,
    feedback,
    includeUpdateLink,
    updateToken,
    applicationId,
  } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeFeedback = feedback ? escapeHtml(feedback) : '';

  const updateUrl = includeUpdateLink && updateToken && applicationId
    ? `${BASE_URL}/candidate?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`
    : null;

  const subject = `CV feedback: ${position || 'Your application'}`;

  const text = `${greeting}

Thank you for applying to ${position || 'the position'} at ${companyName || 'the company'}.

After reviewing your CV, we found that it doesn't quite match the requirements for this role.${feedback ? `\n\nFeedback: ${feedback}` : ''}
${updateUrl ? `\nIf you'd like to update your CV and resubmit, you can do so here: ${updateUrl}\n\nThis link expires in 7 days.` : ''}

Don't be discouraged — there are many opportunities on iRefair that may be a better fit!

— The iRefair Team`;

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
      Don't be discouraged — there are many opportunities on iRefair that may be a better fit!
    </p>

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Best regards,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const html = emailWrapper(content, `Feedback on your CV`);

  return { subject, text, html };
}

type CvUpdateRequestParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  feedback?: string;
  updateToken: string;
  applicationId: string;
};

export function cvUpdateRequestToCandidate(params: CvUpdateRequestParams): TemplateResult {
  const {
    candidateName,
    companyName,
    position,
    feedback,
    updateToken,
    applicationId,
  } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeFeedback = feedback ? escapeHtml(feedback) : '';

  const updateUrl = `${BASE_URL}/candidate?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = `Action needed: Update your CV`;

  const text = `${greeting}

The referrer reviewing your application for ${position || 'the position'} at ${companyName || 'the company'} has requested that you update your CV.${feedback ? `\n\nFeedback: ${feedback}` : ''}

Please update your CV here: ${updateUrl}

This link expires in 7 days.

— The iRefair Team`;

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

  const html = emailWrapper(content, `Action needed: Update your CV`);

  return { subject, text, html };
}

type InfoRequestParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  requestedInfo?: string;
  updateToken: string;
  applicationId: string;
};

export function infoRequestToCandidate(params: InfoRequestParams): TemplateResult {
  const {
    candidateName,
    companyName,
    position,
    requestedInfo,
    updateToken,
    applicationId,
  } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeRequestedInfo = requestedInfo ? escapeHtml(requestedInfo) : '';

  const updateUrl = `${BASE_URL}/candidate?updateToken=${encodeURIComponent(updateToken)}&appId=${encodeURIComponent(applicationId)}`;

  const subject = `Action needed: Additional information requested`;

  const text = `${greeting}

The referrer reviewing your application for ${position || 'the position'} at ${companyName || 'the company'} has requested additional information.${requestedInfo ? `\n\nRequested: ${requestedInfo}` : ''}

Please provide the information here: ${updateUrl}

This link expires in 7 days.

— The iRefair Team`;

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

  const html = emailWrapper(content, `Action needed: Additional information requested`);

  return { subject, text, html };
}

type InterviewCompletedParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
};

export function interviewCompletedToCandidate(params: InterviewCompletedParams): TemplateResult {
  const { candidateName, companyName, position } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';

  const subject = `Interview completed: ${position || 'Your application'}`;

  const text = `${greeting}

Thank you for completing your interview for ${position || 'the position'} at ${companyName || 'the company'}.

The referrer will be reviewing your interview and will follow up with next steps. We'll keep you posted on any updates.

— The iRefair Team`;

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

  const html = emailWrapper(content, `Your interview has been completed`);

  return { subject, text, html };
}

type JobOfferParams = {
  candidateName?: string;
  referrerName?: string;
  companyName?: string;
  position?: string;
  message?: string;
};

export function jobOfferToCandidate(params: JobOfferParams): TemplateResult {
  const { candidateName, companyName, position, message } = params;

  const greeting = candidateName ? `Hi ${candidateName},` : 'Hi,';
  const greetingHtml = candidateName ? `Hi ${escapeHtml(candidateName)},` : 'Hi,';
  const safeCompanyName = companyName ? escapeHtml(companyName) : 'the company';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeMessage = message ? escapeHtml(message) : '';

  const subject = `Congratulations! Job offer for ${position || 'your application'}`;

  const text = `${greeting}

Congratulations! We're thrilled to inform you that ${companyName || 'the company'} would like to offer you the position of ${position || 'the role you applied for'}!${message ? `\n\n${message}` : ''}

The referrer or hiring team will be in touch with the formal offer details.

This is a huge milestone — well done!

— The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Congratulations! 🎉</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">You got the job!</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      We're thrilled to inform you that <strong>${safeCompanyName}</strong> would like to offer you the position of <strong>${safePosition}</strong>!
    </p>

    ${safeMessage ? `
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(122, 215, 227, 0.08)); padding: 20px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.success};">
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeMessage}</p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      The referrer or hiring team will be in touch with the formal offer details.
    </p>
    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      This is a huge milestone — well done!
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Congratulations again,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const html = emailWrapper(content, `Congratulations! You got the job!`);

  return { subject, text, html };
}

type RescheduleRequestParams = {
  referrerName?: string;
  candidateName?: string;
  candidateEmail?: string;
  companyName?: string;
  position?: string;
  originalDateTime?: string;
  reason?: string;
  applicationId: string;
};

export function rescheduleRequestToReferrer(params: RescheduleRequestParams): TemplateResult {
  const {
    referrerName,
    candidateName,
    candidateEmail,
    companyName,
    position,
    originalDateTime,
    reason,
    applicationId,
  } = params;

  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const safeCandidateName = candidateName ? escapeHtml(candidateName) : 'The candidate';
  const safeCandidateEmail = candidateEmail ? escapeHtml(candidateEmail) : '';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeOriginalDateTime = originalDateTime ? escapeHtml(originalDateTime) : '';
  const safeReason = reason ? escapeHtml(reason) : '';
  const safeApplicationId = escapeHtml(applicationId);

  const subject = `Reschedule request: ${candidateName || 'Candidate'} for ${position || 'meeting'}`;

  const text = `${greeting}

${candidateName || 'The candidate'} has requested to reschedule their meeting for ${position || 'the position'}.${originalDateTime ? `\n\nOriginal time: ${originalDateTime}` : ''}${reason ? `\nReason: ${reason}` : ''}

Application ID: ${applicationId}${candidateEmail ? `\nCandidate email: ${candidateEmail}` : ''}

Please log in to your portal to reschedule the meeting.

— The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Reschedule request</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">A candidate needs to reschedule</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      <strong>${safeCandidateName}</strong> has requested to reschedule their meeting for <strong>${safePosition}</strong>.
    </p>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Application ID', safeApplicationId)}
        ${safeCandidateEmail ? infoRow('Candidate email', `<a href="mailto:${safeCandidateEmail}" style="color: ${colors.primary};">${safeCandidateEmail}</a>`) : ''}
        ${safeOriginalDateTime ? infoRow('Original time', safeOriginalDateTime) : ''}
      </table>
    </div>

    ${safeReason ? `
      <div style="background: ${colors.background}; padding: 16px; border-radius: 12px; margin: 16px 0; border-left: 4px solid ${colors.secondary};">
        <p style="margin: 0 0 8px 0; color: ${colors.ink}; font-size: 14px; font-weight: 600;">Reason:</p>
        <p style="margin: 0; color: ${colors.ink}; font-size: 14px; line-height: 1.6;">${safeReason}</p>
      </div>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Please log in to your portal to reschedule the meeting.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const html = emailWrapper(content, `Reschedule request from ${candidateName || 'a candidate'}`);

  return { subject, text, html };
}

type CandidateUpdatedParams = {
  referrerName?: string;
  candidateName?: string;
  candidateEmail?: string;
  companyName?: string;
  position?: string;
  applicationId: string;
  updatedFields?: string[];
  resumeUrl?: string;
};

export function candidateUpdatedToReferrer(params: CandidateUpdatedParams): TemplateResult {
  const {
    referrerName,
    candidateName,
    candidateEmail,
    position,
    applicationId,
    updatedFields,
    resumeUrl,
  } = params;

  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const safeCandidateName = candidateName ? escapeHtml(candidateName) : 'The candidate';
  const safeCandidateEmail = candidateEmail ? escapeHtml(candidateEmail) : '';
  const safePosition = position ? escapeHtml(position) : 'the position';
  const safeApplicationId = escapeHtml(applicationId);
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;

  const updatedFieldsList = updatedFields && updatedFields.length > 0
    ? updatedFields.map((f) => escapeHtml(f)).join(', ')
    : 'their profile';

  const subject = `Candidate updated: ${candidateName || 'Application'} for ${position || 'your review'}`;

  const text = `${greeting}

${candidateName || 'The candidate'} has updated ${updatedFields && updatedFields.length > 0 ? updatedFields.join(', ') : 'their profile'} for their application to ${position || 'the position'}.

Application ID: ${applicationId}${candidateEmail ? `\nCandidate email: ${candidateEmail}` : ''}${resumeUrl ? `\nUpdated resume: ${resumeUrl}` : ''}

Please log in to your portal to review the updates.

— The iRefair Team`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${colors.ink};">Candidate updated</h1>
    <p style="margin: 0 0 24px 0; color: ${colors.muted}; font-size: 15px;">New information available for review</p>

    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">${greetingHtml}</p>
    <p style="margin: 0 0 16px 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      <strong>${safeCandidateName}</strong> has updated <strong>${updatedFieldsList}</strong> for their application to <strong>${safePosition}</strong>.
    </p>

    <div style="background: ${colors.background}; padding: 20px; border-radius: 12px; margin: 16px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Application ID', safeApplicationId)}
        ${safeCandidateEmail ? infoRow('Candidate email', `<a href="mailto:${safeCandidateEmail}" style="color: ${colors.primary};">${safeCandidateEmail}</a>`) : ''}
        ${updatedFields && updatedFields.length > 0 ? infoRow('Updated fields', updatedFieldsList) : ''}
      </table>
    </div>

    ${normalizedResumeUrl ? `
      <p style="margin: 16px 0; text-align: center;">
        ${button('View Updated Resume', normalizedResumeUrl, 'secondary')}
      </p>
    ` : ''}

    <p style="margin: 16px 0 0 0; color: ${colors.ink}; font-size: 15px; line-height: 1.6;">
      Please log in to your portal to review the updates.
    </p>

    <p style="margin: 24px 0 0 0; color: ${colors.ink}; font-size: 15px;">
      Thank you,<br>
      <strong>The iRefair Team</strong>
    </p>
  `;

  const html = emailWrapper(content, `${candidateName || 'A candidate'} has updated their application`);

  return { subject, text, html };
}

/**
 * Helper to build CC list for referrer-triggered emails to candidates.
 * Includes referrer email and founder email, filtering out empty values.
 */
export function buildReferrerEmailCc(referrerEmail?: string): string[] {
  const founderEmail = process.env.FOUNDER_EMAIL;
  return [referrerEmail, founderEmail].filter((e): e is string => Boolean(e && e.trim()));
}
