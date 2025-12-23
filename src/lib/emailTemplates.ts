import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';

type TemplateResult = {
  subject: string;
  text: string;
  html: string;
};

const baseStyles = {
  body: "font-family: system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color: #0f172a; line-height: 1.6;",
  card: "background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;",
  heading: "margin: 0 0 12px 0; font-size: 18px; color: #0f172a;",
  paragraph: "margin: 0 0 12px 0;",
  footer: "margin-top: 18px; color: #64748b; font-size: 13px;",
};

export function meetFounderInvite(referrerName: string, irref: string, link?: string): TemplateResult {
  const subject = "Invitation: Meet the Founder at iRefair";
  const normalizedLink = link ? normalizeHttpUrl(link) : null;
  const joinLink = normalizedLink || "Schedule link not provided yet — we will follow up with a calendar invitation.";
  const greeting = referrerName ? `Hi ${referrerName},` : "Hi there,";
  const greetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : "Hi there,";
  const safeIrref = escapeHtml(irref);
  const joinLinkHtml = normalizedLink
    ? `<a href="${escapeHtml(normalizedLink)}" target="_blank" rel="noreferrer">${escapeHtml(normalizedLink)}</a>`
    : escapeHtml(joinLink);

  const text = `${greeting}

Thank you for being part of the iRefair community (iRREF ${irref}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.

Meet link: ${joinLink}

If the link is unavailable, reply with your availability and we will send you a calendar invite.

— Founder, iRefair`;

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">Invitation to meet</h2>
    <p style="${baseStyles.paragraph}">${greetingHtml}</p>
    <p style="${baseStyles.paragraph}">Thank you for being part of the iRefair community (iRREF ${safeIrref}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.</p>
    <p style="${baseStyles.paragraph}"><strong>Meet link:</strong><br>${joinLinkHtml}</p>
    <p style="${baseStyles.paragraph}">If the link is unavailable, reply with your availability and we will send you a calendar invite.</p>
    <p style="${baseStyles.paragraph}">— Founder, iRefair</p>
    <div style="${baseStyles.footer}">This invite was sent via the iRefair founder console.</div>
  </div>
</div>`;

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

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">Request for updated resume</h2>
    <p style="${baseStyles.paragraph}">${greetingHtml}</p>
    <p style="${baseStyles.paragraph}">Thanks for being part of iRefair (iRAIN ${safeIrain}). Could you reply to this email with your latest resume or CV? This will help us share the most up-to-date profile with referrers.</p>
    <p style="${baseStyles.paragraph}">— Founder, iRefair</p>
    <div style="${baseStyles.footer}">This request was sent via the iRefair founder console.</div>
  </div>
</div>`;

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
  const safePosition = position ? escapeHtml(position) : "";
  const text = `Hello ${introCandidate} and ${introReferrer},

I'm connecting you via iRefair for the role/context noted below.

- Candidate iRAIN: ${irain}
- Company iRCRN: ${ircrn}
- Position / Context: ${position || "Not specified"}

Please take the conversation forward and let us know if you need anything else.

— Founder, iRefair`;

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">Introduction via iRefair</h2>
    <p style="${baseStyles.paragraph}">Hello ${introCandidateHtml} and ${introReferrerHtml},</p>
    <p style="${baseStyles.paragraph}">I'm connecting you via iRefair for the role/context noted below.</p>
    <ul style="padding-left:18px; margin: 0 0 12px 0; color:#0f172a;">
      <li><strong>Candidate iRAIN:</strong> ${safeIrain}</li>
      <li><strong>Company iRCRN:</strong> ${safeIrcrn}</li>
      <li><strong>Position / Context:</strong> ${safePosition || "Not specified"}</li>
    </ul>
    <p style="${baseStyles.paragraph}">Please take the conversation forward and let us know if you need anything else.</p>
    <p style="${baseStyles.paragraph}">— Founder, iRefair</p>
    <div style="${baseStyles.footer}">This intro was sent via the iRefair founder console.</div>
  </div>
</div>`;

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

  const subject = `New application for ${iCrn} (${position || 'Application'})`;
  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const displayResumeName = resumeFileName || 'View CV';
  const safeGreetingHtml = referrerName ? `Hi ${escapeHtml(referrerName)},` : 'Hi,';
  const normalizedResumeUrl = resumeUrl ? normalizeHttpUrl(resumeUrl) : null;
  const safeResumeUrl = normalizedResumeUrl || '';
  const safeDisplayResumeName = escapeHtml(displayResumeName);
  const safeCandidateId = escapeHtml(candidateId);
  const safeIrcrn = escapeHtml(iCrn);
  const safePosition = position ? escapeHtml(position) : '';
  const safeReferenceNumber = referenceNumber ? escapeHtml(referenceNumber) : '';
  const safeCandidateName = candidateName ? escapeHtml(candidateName) : '';
  const safeCandidateEmail = candidateEmail ? escapeHtml(candidateEmail) : '';
  const safeCandidatePhone = candidatePhone ? escapeHtml(candidatePhone) : '';
  const safeResumeUrlHtml = safeResumeUrl ? escapeHtml(safeResumeUrl) : '';
  const approveLink = feedbackApproveUrl ? normalizeHttpUrl(feedbackApproveUrl) : null;
  const declineLink = feedbackDeclineUrl ? normalizeHttpUrl(feedbackDeclineUrl) : null;
  const safeApproveUrlHtml = approveLink ? escapeHtml(approveLink) : '';
  const safeDeclineUrlHtml = declineLink ? escapeHtml(declineLink) : '';
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
    `- CV: ${safeResumeUrl || 'Not provided'}`,
    textCtas ? '' : null,
    textCtas || null,
    '',
    'Thanks for the quick review!',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">New application for ${safeIrcrn}</h2>
    <p style="${baseStyles.paragraph}">${safeGreetingHtml}</p>
    <p style="${baseStyles.paragraph}">A candidate just applied. Details below:</p>
    <ul style="padding-left:18px; margin: 0 0 12px 0; color:#0f172a;">
      <li><strong>Candidate ID:</strong> ${safeCandidateId}</li>
      ${safePosition ? `<li><strong>Position:</strong> ${safePosition}</li>` : ''}
      ${safeReferenceNumber ? `<li><strong>Reference Number:</strong> ${safeReferenceNumber}</li>` : ''}
      ${safeCandidateName ? `<li><strong>Name:</strong> ${safeCandidateName}</li>` : ''}
      ${safeCandidateEmail ? `<li><strong>Email:</strong> ${safeCandidateEmail}</li>` : ''}
      ${safeCandidatePhone ? `<li><strong>Phone:</strong> ${safeCandidatePhone}</li>` : ''}
    </ul>
    <p style="${baseStyles.paragraph}"><strong>CV:</strong> ${
      safeResumeUrlHtml
        ? `<a href="${safeResumeUrlHtml}" target="_blank" rel="noreferrer">${safeDisplayResumeName}</a>`
        : 'Not provided'
    }</p>
    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:14px;">
      ${
        safeResumeUrlHtml
          ? `<a href="${safeResumeUrlHtml}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">View CV</a>`
          : ''
      }
      ${
        approveLink
          ? `<a href="${safeApproveUrlHtml}" style="display:inline-block;padding:12px 16px;border-radius:10px;border:1px solid #0f172a;color:#0f172a;text-decoration:none;font-weight:700;">Approve / Proceed</a>`
          : ''
      }
      ${
        declineLink
          ? `<a href="${safeDeclineUrlHtml}" style="display:inline-block;padding:12px 16px;border-radius:10px;border:1px solid #e11d48;color:#e11d48;text-decoration:none;font-weight:700;">Decline / Pause</a>`
          : ''
      }
    </div>
    <div style="${baseStyles.footer}">This was sent via the iRefair application form.</div>
  </div>
</div>`;

  return { subject, text: textLines, html };
}
