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

export function meetFounderInvite(referrerName: string, irain: string, link?: string): TemplateResult {
  const subject = "Invitation: Meet the Founder at iRefair";
  const joinLink = link || "Schedule link not provided yet — we will follow up with a calendar invitation.";
  const greeting = referrerName ? `Hi ${referrerName},` : "Hi there,";

  const text = `${greeting}

Thank you for being part of the iRefair community (iRAIN ${irain}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.

Meet link: ${joinLink}

If the link is unavailable, reply with your availability and we will send you a calendar invite.

— Founder, iRefair`;

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">Invitation to meet</h2>
    <p style="${baseStyles.paragraph}">${greeting}</p>
    <p style="${baseStyles.paragraph}">Thank you for being part of the iRefair community (iRAIN ${irain}). I'd like to invite you to a brief call to learn more about your referrals and how we can collaborate.</p>
    <p style="${baseStyles.paragraph}"><strong>Meet link:</strong><br>${joinLink}</p>
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

  const text = `${greeting}

Thanks for being part of iRefair (iRAIN ${irain}). Could you reply to this email with your latest resume or CV? This will help us share the most up-to-date profile with referrers.

— Founder, iRefair`;

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">Request for updated resume</h2>
    <p style="${baseStyles.paragraph}">${greeting}</p>
    <p style="${baseStyles.paragraph}">Thanks for being part of iRefair (iRAIN ${irain}). Could you reply to this email with your latest resume or CV? This will help us share the most up-to-date profile with referrers.</p>
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
    <p style="${baseStyles.paragraph}">Hello ${introCandidate} and ${introReferrer},</p>
    <p style="${baseStyles.paragraph}">I'm connecting you via iRefair for the role/context noted below.</p>
    <ul style="padding-left:18px; margin: 0 0 12px 0; color:#0f172a;">
      <li><strong>Candidate iRAIN:</strong> ${irain}</li>
      <li><strong>Company iRCRN:</strong> ${ircrn}</li>
      <li><strong>Position / Context:</strong> ${position || "Not specified"}</li>
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
  resumeUrl: string;
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
  const safeResumeUrl = resumeUrl || '#';
  const displayResumeName = resumeFileName || 'View CV';
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
    `- CV: ${safeResumeUrl}`,
    textCtas ? '' : null,
    textCtas || null,
    '',
    'Thanks for the quick review!',
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<div style="${baseStyles.body}">
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.heading}">New application for ${iCrn}</h2>
    <p style="${baseStyles.paragraph}">${greeting}</p>
    <p style="${baseStyles.paragraph}">A candidate just applied. Details below:</p>
    <ul style="padding-left:18px; margin: 0 0 12px 0; color:#0f172a;">
      <li><strong>Candidate ID:</strong> ${candidateId}</li>
      ${position ? `<li><strong>Position:</strong> ${position}</li>` : ''}
      ${referenceNumber ? `<li><strong>Reference Number:</strong> ${referenceNumber}</li>` : ''}
      ${candidateName ? `<li><strong>Name:</strong> ${candidateName}</li>` : ''}
      ${candidateEmail ? `<li><strong>Email:</strong> ${candidateEmail}</li>` : ''}
      ${candidatePhone ? `<li><strong>Phone:</strong> ${candidatePhone}</li>` : ''}
    </ul>
    <p style="${baseStyles.paragraph}"><strong>CV:</strong> <a href="${safeResumeUrl}" target="_blank" rel="noreferrer">${displayResumeName}</a></p>
    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:14px;">
      <a href="${safeResumeUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">View CV</a>
      ${
        feedbackApproveUrl
          ? `<a href="${feedbackApproveUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;border:1px solid #0f172a;color:#0f172a;text-decoration:none;font-weight:700;">Approve / Proceed</a>`
          : ''
      }
      ${
        feedbackDeclineUrl
          ? `<a href="${feedbackDeclineUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;border:1px solid #e11d48;color:#e11d48;text-decoration:none;font-weight:700;">Decline / Pause</a>`
          : ''
      }
    </div>
    <div style="${baseStyles.footer}">This was sent via the iRefair application form.</div>
  </div>
</div>`;

  return { subject, text: textLines, html };
}
