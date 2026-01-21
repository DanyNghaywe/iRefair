import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { sendMail } from '@/lib/mailer';
import {
  APPLICANT_PENDING_COMPANY_HEADER,
  APPLICANT_PENDING_POSITION_HEADER,
  APPLICANT_PENDING_REFERENCE_HEADER,
  APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
  APPLICANT_PENDING_CV_REQUEST_NOTE_HEADER,
  APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
  APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
  APPLICANT_SHEET_NAME,
  ensureColumns,
  findApplicantByIdentifier,
  findDuplicateApplicationByCompany,
  findReferrerCompanyByIrcrnStrict,
  ReferrerLookupError,
  updateRowById,
} from '@/lib/sheets';
import { createOpaqueToken, hashOpaqueToken } from '@/lib/tokens';
import { founderCvRequestSentToFounder, founderCvRequestToApplicant } from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';

const CV_REQUEST_TTL_SECONDS = 60 * 60 * 24 * 7;

const baseFromEnv =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL;
const appBaseUrl =
  baseFromEnv && baseFromEnv.startsWith('http')
    ? baseFromEnv
    : baseFromEnv
      ? `https://${baseFromEnv}`
      : 'https://irefair.com';

type RequestBody = {
  companyIrcrn?: string;
  position?: string;
  referenceNumber?: string;
  note?: string;
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
  const note = String(body.note || '').trim();

  if (!companyIrcrn) {
    return NextResponse.json({ ok: false, error: 'Company iRCRN is required.' }, { status: 400 });
  }

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

  if (!applicant.record.email) {
    return NextResponse.json(
      { ok: false, error: 'Applicant email is missing; cannot send request.' },
      { status: 400 },
    );
  }

  const duplicateId = await findDuplicateApplicationByCompany(applicant.record.id, companyIrcrn);
  if (duplicateId) {
    return NextResponse.json(
      { ok: false, error: `An active application already exists (ID: ${duplicateId}).` },
      { status: 409 },
    );
  }

  let companyName = '';
  try {
    const result = await findReferrerCompanyByIrcrnStrict(companyIrcrn);
    companyName = result.company.companyName;
  } catch (error) {
    if (error instanceof ReferrerLookupError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + CV_REQUEST_TTL_SECONDS * 1000).toISOString();
  const requestedAt = new Date().toISOString();

  await ensureColumns(APPLICANT_SHEET_NAME, [
    APPLICANT_PENDING_COMPANY_HEADER,
    APPLICANT_PENDING_POSITION_HEADER,
    APPLICANT_PENDING_REFERENCE_HEADER,
    APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
    APPLICANT_PENDING_CV_REQUEST_NOTE_HEADER,
    APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
    APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
  ]);

  const updateResult = await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', applicant.record.id, {
    [APPLICANT_PENDING_COMPANY_HEADER]: companyIrcrn,
    [APPLICANT_PENDING_POSITION_HEADER]: position,
    [APPLICANT_PENDING_REFERENCE_HEADER]: referenceNumber,
    [APPLICANT_PENDING_CV_REQUESTED_AT_HEADER]: requestedAt,
    [APPLICANT_PENDING_CV_REQUEST_NOTE_HEADER]: note,
    [APPLICANT_PENDING_CV_TOKEN_HASH_HEADER]: tokenHash,
    [APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER]: expiresAt,
  });

  if (!updateResult.updated) {
    return NextResponse.json(
      { ok: false, error: 'Unable to save CV request details.' },
      { status: 500 },
    );
  }

  const uploadUrl = new URL('/update-cv', appBaseUrl);
  uploadUrl.searchParams.set('token', token);
  uploadUrl.searchParams.set('irain', applicant.record.id);

  const applicantName = [applicant.record.firstName, applicant.record.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const applicantLocale = applicant.record.locale?.toLowerCase() === 'fr' ? 'fr' : 'en';

  const applicantTemplate = founderCvRequestToApplicant({
    applicantName: applicantName || undefined,
    applicantId: applicant.record.id,
    companyName,
    companyIrcrn,
    position,
    referenceNumber,
    uploadUrl: uploadUrl.toString(),
    note: note || undefined,
    locale: applicantLocale,
  });

  await sendMail({
    to: applicant.record.email,
    subject: applicantTemplate.subject,
    html: applicantTemplate.html,
    text: applicantTemplate.text,
  });

  const founderRecipients = (process.env.FOUNDER_NOTIFICATION_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (founderRecipients.length > 0) {
    const founderTemplate = founderCvRequestSentToFounder({
      applicantName: applicantName || applicant.record.email || applicant.record.id,
      applicantEmail: applicant.record.email || undefined,
      applicantId: applicant.record.id,
      companyIrcrn,
      position,
      referenceNumber,
      uploadUrl: uploadUrl.toString(),
      note: note || undefined,
    });

    await sendMail({
      to: founderRecipients.join(','),
      subject: founderTemplate.subject,
      html: founderTemplate.html,
      text: founderTemplate.text,
    });
  }

  console.log('Founder CV request sent', {
    irain: applicant.record.id,
    companyIrcrn,
    founderEmail,
  });

  return NextResponse.json({ ok: true, requestedAt, expiresAt });
}
