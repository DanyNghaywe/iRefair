import { NextRequest, NextResponse } from 'next/server';

import {
  findCandidateByIdentifier,
  getApplicationById,
  getReferrerByIrref,
  updateApplicationAdmin,
} from '@/lib/sheets';
import { verifyReferrerToken } from '@/lib/referrerPortalToken';
import { sendMail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

type FeedbackAction = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

const ACTION_LABELS: Record<FeedbackAction, string> = {
  A: 'Wants to meet',
  B: 'Not a good fit',
  C: 'CV not matching requirements',
  D: 'CV needs adjustments',
  E: 'CV missing information',
  F: 'He interviewed',
  G: 'He got the job',
};

function getMeetLink() {
  return (
    process.env.REFERRER_MEET_LINK ||
    process.env.FOUNDER_MEET_LINK ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ''
  );
}

function candidateEmailTemplate(action: FeedbackAction, name: string, position: string, ircrn: string) {
  const meetLink = getMeetLink();
  const subjectMap: Record<FeedbackAction, string> = {
    A: 'Your application: invitation to meet',
    B: 'Update on your application',
    C: 'Update on your application: CV guidance',
    D: 'Update on your application: CV improvements',
    E: 'Update on your application: missing details',
    F: 'Interview update',
    G: 'Congratulations!',
  };

  const greeting = name ? `Hi ${name},` : 'Hello,';
  const context = position ? `Role: ${position}` : ircrn ? `Company iRCRN: ${ircrn}` : '';

  let body = '';
  switch (action) {
    case 'A':
      body = [
        `${greeting}`,
        '',
        'A referrer would like to meet you.',
        meetLink ? `Please book a time here: ${meetLink}` : 'Please reply to this email to schedule a time.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    case 'B':
      body = [
        `${greeting}`,
        '',
        'Thank you for applying. At this time, the referrer feels it is not the right fit.',
        'We appreciate your interest and encourage you to apply to other roles.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    case 'C':
      body = [
        `${greeting}`,
        '',
        'The referrer reviewed your CV and it does not match the requirements for this role.',
        'Please review the role requirements and adjust your CV accordingly before applying again.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    case 'D':
      body = [
        `${greeting}`,
        '',
        'Your CV needs a few adjustments before moving forward.',
        'Please update your CV and re-apply when ready.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    case 'E':
      body = [
        `${greeting}`,
        '',
        'Your CV appears to be missing key information.',
        'Please update your CV (or reply with the missing details) so we can continue.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    case 'F':
      body = [
        `${greeting}`,
        '',
        'The referrer has interviewed you and will follow up with next steps.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    case 'G':
      body = [
        `${greeting}`,
        '',
        'Congratulations on the job!',
        'We’re excited for you and will share next steps shortly.',
        context ? `\n${context}` : '',
      ].join('\n');
      break;
    default:
      body = `${greeting}\n\nUpdate on your application.`;
  }

  return {
    subject: subjectMap[action],
    text: body,
    html: body.replace(/\n/g, '<br/>'),
  };
}

function normalizeAction(action: string): FeedbackAction | null {
  const upper = action.trim().toUpperCase();
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(upper) ? (upper as FeedbackAction) : null;
}

export async function POST(request: NextRequest) {
  let body: { token?: string; applicationId?: string; action?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* noop */
  }

  const token = body.token || '';
  const applicationId = (body.applicationId || '').trim();
  const action = body.action ? normalizeAction(body.action) : null;
  const note = (body.note || '').trim();

  if (!token || !applicationId || !action) {
    return NextResponse.json(
      { ok: false, error: 'Missing token, applicationId, or action (A-G).' },
      { status: 400 },
    );
  }

  let payload;
  try {
    payload = verifyReferrerToken(token);
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
  }

  const referrer = await getReferrerByIrref(payload.irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  const application = await getApplicationById(applicationId);
  if (!application?.record?.candidateId) {
    return NextResponse.json({ ok: false, error: 'Application not found.' }, { status: 404 });
  }

  const candidate = await findCandidateByIdentifier(application.record.candidateId).catch(() => null);

  const status = ACTION_LABELS[action];
  const ownerNotes = [
    `[Referrer ${referrer.record.name || referrer.record.irref}] ${status}`,
    note,
  ]
    .filter(Boolean)
    .join(' — ');

  await updateApplicationAdmin(applicationId, {
    status,
    ownerNotes,
  });

  if (candidate?.record?.email) {
    const candidateName = [candidate.record.firstName, candidate.record.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const template = candidateEmailTemplate(
      action,
      candidateName,
      application.record.position,
      application.record.iCrn,
    );
    await sendMail({
      to: candidate.record.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  if (action === 'G') {
    const rewardRecipient =
      process.env.REFERRAL_REWARD_EMAIL || process.env.FOUNDER_EMAIL || process.env.SMTP_FROM_EMAIL;
    if (rewardRecipient) {
      await sendMail({
        to: rewardRecipient,
        subject: `Referral reward triggered: ${application.record.id}`,
        text: `Candidate ${application.record.candidateId} marked as hired for ${application.record.iCrn} (${application.record.position}). Referrer: ${referrer.record.irref}.`,
        html: `Candidate <strong>${application.record.candidateId}</strong> marked as hired for <strong>${application.record.iCrn}</strong> (${application.record.position}).<br/>Referrer: <strong>${referrer.record.irref}</strong>.`,
      });
    }
  }

  return NextResponse.json({ ok: true, status, ownerNotes });
}
