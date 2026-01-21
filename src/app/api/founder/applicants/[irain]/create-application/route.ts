import { NextRequest, NextResponse } from 'next/server';

import { appendActionHistoryEntry, type ActionLogEntry } from '@/lib/actionHistory';
import { requireFounder } from '@/lib/founderAuth';
import { sendMail } from '@/lib/mailer';
import { ensureReferrerPortalTokenVersion, buildReferrerPortalLink } from '@/lib/referrerPortalLink';
import { isExpired } from '@/lib/tokens';
import {
  APPLICANT_PENDING_COMPANY_HEADER,
  APPLICANT_PENDING_POSITION_HEADER,
  APPLICANT_PENDING_REFERENCE_HEADER,
  APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
  APPLICANT_PENDING_CV_REQUEST_NOTE_HEADER,
  APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
  APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
  APPLICANT_SHEET_NAME,
  appendApplicationRow,
  ensureColumns,
  findApplicantByIdentifier,
  findDuplicateApplicationByCompany,
  findReferrerCompanyByIrcrnStrict,
  generateSubmissionId,
  ReferrerLookupError,
  updateApplicationAdmin,
  updateRowById,
} from '@/lib/sheets';
import {
  founderInitiatedApplicationToApplicant,
  founderInitiatedApplicationToFounder,
  founderInitiatedApplicationToReferrer,
} from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';

type RequestBody = {
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
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
  const companyIrcrn = String(body.companyIrcrn || '').trim();
  const position = String(body.position || '').trim();
  const referenceNumber = String(body.referenceNumber || '').trim();

  const applicant = await findApplicantByIdentifier(params.irain);
  if (!applicant?.record) {
    return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
  }

  if (applicant.record.archived?.toLowerCase() === 'true') {
    return NextResponse.json(
      { ok: false, error: 'This applicant profile has been archived.' },
      { status: 403 },
    );
  }

  if (applicant.record.pendingCvTokenHash && isExpired(applicant.record.pendingCvTokenExpiresAt)) {
    applicant.record.pendingCvTokenHash = '';
    applicant.record.pendingCvTokenExpiresAt = '';
    applicant.record.pendingCvRequestedAt = '';
    try {
      await ensureColumns(APPLICANT_SHEET_NAME, [
        APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
        APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
        APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
      ]);
      await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', applicant.record.id, {
        [APPLICANT_PENDING_CV_REQUESTED_AT_HEADER]: '',
        [APPLICANT_PENDING_CV_TOKEN_HASH_HEADER]: '',
        [APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER]: '',
      });
    } catch (error) {
      console.warn('Failed to clear expired pending CV token', error);
    }
  }

  if (applicant.record.pendingCvTokenHash) {
    return NextResponse.json(
      { ok: false, error: 'A CV request is still pending for this applicant.' },
      { status: 409 },
    );
  }

  const finalCompanyIrcrn = companyIrcrn || applicant.record.pendingCompanyIrcrn || '';
  if (!finalCompanyIrcrn) {
    return NextResponse.json(
      { ok: false, error: 'Company iRCRN is required.' },
      { status: 400 },
    );
  }

  const duplicateId = await findDuplicateApplicationByCompany(applicant.record.id, finalCompanyIrcrn);
  if (duplicateId) {
    return NextResponse.json(
      { ok: false, error: `An active application already exists (ID: ${duplicateId}).` },
      { status: 409 },
    );
  }

  if (!applicant.record.resumeFileId || !applicant.record.resumeFileName) {
    return NextResponse.json(
      { ok: false, error: 'Resume is missing. Request a CV before creating the application.' },
      { status: 409 },
    );
  }

  let companyName = '';
  let referrerIrref = '';
  let referrerEmail = '';
  let referrerLocale = 'en';
  let referrerCompanyId = '';
  try {
    const result = await findReferrerCompanyByIrcrnStrict(finalCompanyIrcrn);
    companyName = result.company.companyName;
    referrerCompanyId = result.company.id;
    referrerIrref = result.referrer.irref;
    referrerEmail = result.referrer.email;
    referrerLocale = result.referrer.locale?.toLowerCase() === 'fr' ? 'fr' : 'en';
  } catch (error) {
    if (error instanceof ReferrerLookupError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }

  const positionValue = position || applicant.record.pendingPosition || '';
  const referenceValue = referenceNumber || applicant.record.pendingReferenceNumber || '';
  const storedPosition = positionValue || 'TBD';
  const storedReference = referenceValue || 'TBD';

  const locatedCanada = applicant.record.locatedCanada?.toLowerCase() || '';
  const authorizedCanada = applicant.record.authorizedCanada?.toLowerCase() || '';
  const eligibleMoveCanada = applicant.record.eligibleMoveCanada?.toLowerCase() || '';
  const isIneligible =
    (locatedCanada === 'no' && eligibleMoveCanada === 'no') ||
    (locatedCanada === 'yes' && authorizedCanada === 'no');

  const applicationId = await generateSubmissionId('APP');

  await appendApplicationRow({
    id: applicationId,
    applicantId: applicant.record.id,
    iCrn: finalCompanyIrcrn,
    position: storedPosition,
    referenceNumber: storedReference,
    resumeFileName: applicant.record.resumeFileName,
    resumeFileId: applicant.record.resumeFileId,
    referrerIrref,
    referrerEmail,
    referrerCompanyId,
    status: isIneligible ? 'ineligible' : 'new',
  });

  const actionEntry: ActionLogEntry = {
    action: 'LINKED_BY_FOUNDER',
    timestamp: new Date().toISOString(),
    performedBy: 'founder',
    performedByEmail: founderEmail || undefined,
  };
  const updatedActionHistory = appendActionHistoryEntry('', actionEntry);
  await updateApplicationAdmin(applicationId, { actionHistory: updatedActionHistory });

  await ensureColumns(APPLICANT_SHEET_NAME, [
    APPLICANT_PENDING_COMPANY_HEADER,
    APPLICANT_PENDING_POSITION_HEADER,
    APPLICANT_PENDING_REFERENCE_HEADER,
    APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
    APPLICANT_PENDING_CV_REQUEST_NOTE_HEADER,
    APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
    APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
  ]);

  await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', applicant.record.id, {
    [APPLICANT_PENDING_COMPANY_HEADER]: '',
    [APPLICANT_PENDING_POSITION_HEADER]: '',
    [APPLICANT_PENDING_REFERENCE_HEADER]: '',
    [APPLICANT_PENDING_CV_REQUESTED_AT_HEADER]: '',
    [APPLICANT_PENDING_CV_REQUEST_NOTE_HEADER]: '',
    [APPLICANT_PENDING_CV_TOKEN_HASH_HEADER]: '',
    [APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER]: '',
  });

  const applicantName = [applicant.record.firstName, applicant.record.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const applicantLocale = applicant.record.locale?.toLowerCase() === 'fr' ? 'fr' : 'en';
  const resumeUrl = applicant.record.resumeFileId
    ? `https://drive.google.com/file/d/${applicant.record.resumeFileId}/view`
    : '';

  let portalUrl: string | undefined;
  if (referrerIrref) {
    try {
      const tokenVersion = await ensureReferrerPortalTokenVersion(referrerIrref);
      portalUrl = buildReferrerPortalLink(referrerIrref, tokenVersion);
    } catch (error) {
      console.warn('Failed to generate referrer portal link:', error);
    }
  }

  const applicantTemplate = founderInitiatedApplicationToApplicant({
    applicantName: applicantName || undefined,
    applicantEmail: applicant.record.email || undefined,
    applicantId: applicant.record.id,
    companyName,
    companyIrcrn: finalCompanyIrcrn,
    position: storedPosition,
    referenceNumber: storedReference,
    submissionId: applicationId,
    locale: applicantLocale,
  });

  if (applicant.record.email) {
    await sendMail({
      to: applicant.record.email,
      subject: applicantTemplate.subject,
      html: applicantTemplate.html,
      text: applicantTemplate.text,
    });
  }

  const referrerTemplate = founderInitiatedApplicationToReferrer({
    referrerName: undefined,
    applicantName: applicantName || undefined,
    applicantEmail: applicant.record.email || undefined,
    applicantPhone: applicant.record.phone || undefined,
    applicantId: applicant.record.id,
    iCrn: finalCompanyIrcrn,
    companyName,
    position: storedPosition,
    referenceNumber: storedReference,
    resumeUrl,
    resumeFileName: applicant.record.resumeFileName || undefined,
    portalUrl,
    locale: referrerLocale as 'en' | 'fr',
  });

  if (referrerEmail) {
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
    const founderTemplate = founderInitiatedApplicationToFounder({
      applicantName: applicantName || applicant.record.email || applicant.record.id,
      applicantEmail: applicant.record.email || undefined,
      applicantId: applicant.record.id,
      companyName,
      companyIrcrn: finalCompanyIrcrn,
      position: storedPosition,
      referenceNumber: storedReference,
      submissionId: applicationId,
      resumeFileName: applicant.record.resumeFileName || undefined,
    });

    await sendMail({
      to: founderRecipients.join(','),
      subject: founderTemplate.subject,
      html: founderTemplate.html,
      text: founderTemplate.text,
    });
  }

  return NextResponse.json({ ok: true, id: applicationId });
}
