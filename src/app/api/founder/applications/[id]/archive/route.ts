import { NextRequest, NextResponse } from 'next/server';

import { appendActionHistoryEntry, type ActionLogEntry } from '@/lib/actionHistory';
import { requireFounder } from '@/lib/founderAuth';
import {
  founderInitiatedApplicationArchivedToApplicant,
  founderInitiatedApplicationArchivedToFounder,
  founderInitiatedApplicationArchivedToReferrer,
} from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { buildReferrerPortalLink, ensureReferrerPortalTokenVersion } from '@/lib/referrerPortalLink';
import {
  archiveApplicationById,
  findReferrerCompanyByIrcrnStrict,
  getApplicantByIrain,
  getApplicationById,
  getReferrerByIrref,
  ReferrerLookupError,
  updateApplicationAdmin,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type RequestBody = {
  reason?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;

  let founderEmail = '';
  try {
    const founder = requireFounder(request);
    founderEmail = founder.email;
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body: RequestBody = await request.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  if (!reason) {
    return NextResponse.json({ ok: false, error: 'Reason is required.' }, { status: 400 });
  }

  const application = await getApplicationById(params.id);
  if (!application) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  if (application.record.archived === 'true') {
    return NextResponse.json({ ok: false, error: 'Application is already archived.' }, { status: 400 });
  }

  const archiveResult = await archiveApplicationById(application.record.id, founderEmail || 'founder');
  if (!archiveResult.success) {
    if (archiveResult.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }
    if (archiveResult.reason === 'already_archived') {
      return NextResponse.json({ ok: false, error: 'Application is already archived.' }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: 'Unable to archive application.' }, { status: 500 });
  }

  const actionEntry: ActionLogEntry = {
    action: 'ARCHIVED_BY_FOUNDER',
    timestamp: new Date().toISOString(),
    performedBy: 'founder',
    performedByEmail: founderEmail || undefined,
    notes: reason,
  };
  const updatedActionHistory = appendActionHistoryEntry(application.record.actionHistory || '', actionEntry);
  await updateApplicationAdmin(application.record.id, { actionHistory: updatedActionHistory });

  const applicant = application.record.applicantId
    ? await getApplicantByIrain(application.record.applicantId)
    : null;
  const applicantName = applicant
    ? [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' ').trim()
    : '';
  const applicantEmail = applicant?.record.email || '';
  const applicantLocale = applicant?.record.locale?.toLowerCase() === 'fr' ? 'fr' : 'en';

  let referrerIrref = application.record.referrerIrref || '';
  let referrerEmail = application.record.referrerEmail || '';
  let referrerLocale: 'en' | 'fr' = 'en';
  let referrerName = '';

  if (referrerIrref) {
    const referrer = await getReferrerByIrref(referrerIrref);
    if (referrer?.record) {
      referrerEmail = referrerEmail || referrer.record.email || '';
      referrerLocale = referrer.record.locale?.toLowerCase() === 'fr' ? 'fr' : 'en';
      referrerName = referrer.record.name?.trim() || '';
    }
  }

  let companyName = '';
  if (application.record.iCrn) {
    try {
      const company = await findReferrerCompanyByIrcrnStrict(application.record.iCrn);
      companyName = company.company.companyName;
    } catch (error) {
      if (!(error instanceof ReferrerLookupError)) {
        console.warn('Unable to resolve company name for archive email', error);
      }
    }
  }

  let portalUrl: string | undefined;
  if (referrerIrref) {
    try {
      const tokenVersion = await ensureReferrerPortalTokenVersion(referrerIrref);
      portalUrl = buildReferrerPortalLink(referrerIrref, tokenVersion);
    } catch (error) {
      console.warn('Failed to generate referrer portal link for archive email:', error);
    }
  }

  if (applicantEmail) {
    const applicantTemplate = founderInitiatedApplicationArchivedToApplicant({
      applicantName: applicantName || undefined,
      applicantId: application.record.applicantId,
      companyName,
      companyIrcrn: application.record.iCrn,
      position: application.record.position,
      referenceNumber: application.record.referenceNumber,
      submissionId: application.record.id,
      reason,
      locale: applicantLocale,
    });

    await sendMail({
      to: applicantEmail,
      subject: applicantTemplate.subject,
      html: applicantTemplate.html,
      text: applicantTemplate.text,
    });
  }

  if (referrerEmail) {
    const referrerTemplate = founderInitiatedApplicationArchivedToReferrer({
      referrerName: referrerName || undefined,
      applicantName: applicantName || application.record.applicantId,
      applicantEmail: applicantEmail || undefined,
      applicantId: application.record.applicantId,
      companyName,
      iCrn: application.record.iCrn,
      position: application.record.position,
      referenceNumber: application.record.referenceNumber,
      submissionId: application.record.id,
      reason,
      portalUrl,
      locale: referrerLocale,
    });

    await sendMail({
      to: referrerEmail,
      subject: referrerTemplate.subject,
      html: referrerTemplate.html,
      text: referrerTemplate.text,
    });
  }

  const founderRecipients = (process.env.FOUNDER_NOTIFICATION_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (founderRecipients.length > 0) {
    const founderTemplate = founderInitiatedApplicationArchivedToFounder({
      applicantName: applicantName || application.record.applicantId,
      applicantEmail: applicantEmail || undefined,
      applicantId: application.record.applicantId,
      companyName,
      companyIrcrn: application.record.iCrn,
      position: application.record.position,
      referenceNumber: application.record.referenceNumber,
      submissionId: application.record.id,
      reason,
      referrerIrref: referrerIrref || undefined,
      referrerEmail: referrerEmail || undefined,
    });

    await sendMail({
      to: founderRecipients.join(','),
      subject: founderTemplate.subject,
      html: founderTemplate.html,
      text: founderTemplate.text,
    });
  }

  return NextResponse.json({ ok: true });
}
