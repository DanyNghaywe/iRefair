import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

import { uploadFileToDrive } from '@/lib/drive';
import { applicationSubmittedToReferrer, applicationConfirmationToApplicant } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { hashApplicantSecret } from '@/lib/applicantUpdateToken';
import {
  appendApplicationRow,
  findApplicantByIdentifier,
  findDuplicateApplication,
  findReferrerByIrcrn,
  findReferrerByIrcrnStrict,
  generateSubmissionId,
  isIrain,
  isIrcrn,
  ReferrerLookupError,
} from '@/lib/sheets';
import { ensureResumeLooksLikeCv, scanBufferForViruses } from '@/lib/fileScan';
import { ensureReferrerPortalTokenVersion, buildReferrerPortalLink } from '@/lib/referrerPortalLink';

export const runtime = 'nodejs';

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB

const normalize = (value?: FormDataEntryValue | string | null) =>
  typeof value === 'string' ? value.trim() : '';

const isAllowedResume = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const typeAllowed = file.type ? ALLOWED_RESUME_TYPES.includes(file.type) : false;
  const extensionAllowed = extension ? ALLOWED_RESUME_EXTENSIONS.includes(extension) : false;
  return typeAllowed || extensionAllowed;
};

export async function POST(request: Request) {
  const rate = await rateLimit(request, { keyPrefix: 'apply', ...RATE_LIMITS.apply });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  try {
    const form = await request.formData();
    const honeypotEntry = form.get('website');
    const honeypot =
      typeof honeypotEntry === 'string' ? honeypotEntry.trim() : honeypotEntry ? '1' : '';
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }
    const applicantId = normalize(form.get('applicantId'));
    const applicantKey = normalize(form.get('applicantKey'));
    const iCrn = normalize(form.get('iCrn'));
    const position = normalize(form.get('position'));
    const referenceNumberInput = normalize(form.get('referenceNumber'));
    const referenceNumber =
      referenceNumberInput &&
      referenceNumberInput.toLowerCase() !== position.toLowerCase()
        ? referenceNumberInput
        : '';
    const resumeEntry = form.get('resume');

    if (!applicantId || !applicantKey || !iCrn || !position) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Please provide your iRAIN (or legacy applicant ID), applicant key, iRCRN, and the position you are applying for.',
        },
        { status: 400 },
      );
    }

    const strictMode = ['true', '1', 'yes'].includes(
      (process.env.STRICT_REFERRAL_LINKING || '').toLowerCase(),
    );
    if (strictMode && !isIrcrn(iCrn)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid iRCRN format. Please use the iRCRN########## code.' },
        { status: 400 },
      );
    }

    if (!(resumeEntry instanceof File) || resumeEntry.size === 0) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: 'Please upload your resume (PDF or DOC/DOCX, max 10MB).' },
        { status: 400 },
      );
    }

    if (!isAllowedResume(resumeEntry) || resumeEntry.size > MAX_RESUME_SIZE) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: 'Please upload a PDF or DOC/DOCX file under 10MB.' },
        { status: 400 },
      );
    }

    const applicantRecord = await findApplicantByIdentifier(applicantId);
    if (!applicantRecord) {
      return NextResponse.json(
        { ok: false, error: 'We could not find an applicant with that ID.' },
        { status: 404 },
      );
    }
    const storedKeyHash = applicantRecord.record.applicantSecretHash?.trim().toLowerCase();
    const providedKeyHash = applicantKey ? hashApplicantSecret(applicantKey) : '';
    const keyMatches =
      storedKeyHash &&
      providedKeyHash &&
      storedKeyHash.length === providedKeyHash.length &&
      timingSafeEqual(Buffer.from(storedKeyHash, 'hex'), Buffer.from(providedKeyHash, 'hex'));
    if (!keyMatches) {
      return NextResponse.json({ ok: false, error: 'Invalid applicant credentials.' }, { status: 401 });
    }
    if (applicantRecord.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json(
        { ok: false, error: 'This applicant profile has been archived and can no longer submit applications.' },
        { status: 403 },
      );
    }
    if (strictMode && !isIrain(applicantRecord.record.id)) {
      return NextResponse.json(
        { ok: false, error: 'Applicant record is missing a valid iRAIN. Please update the applicant record.' },
        { status: 409 },
      );
    }

    // Check for duplicate application
    const existingApplicationId = await findDuplicateApplication(
      applicantRecord.record.id || applicantId,
      iCrn,
      position,
    );
    if (existingApplicationId) {
      return NextResponse.json(
        {
          ok: false,
          error: `You have already applied for this position at this company (Application ID: ${existingApplicationId}).`,
        },
        { status: 409 },
      );
    }

    let referrer = null;
    if (strictMode) {
      try {
        referrer = await findReferrerByIrcrnStrict(iCrn);
      } catch (error) {
        if (error instanceof ReferrerLookupError) {
          return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }
        throw error;
      }
    } else {
      referrer =
        (await findReferrerByIrcrn(iCrn)) ||
        (process.env.APPLICATION_FALLBACK_REFERRER_EMAIL
          ? {
              irref: 'fallback',
              name: process.env.APPLICATION_FALLBACK_REFERRER_NAME || 'Referrer',
              email: process.env.APPLICATION_FALLBACK_REFERRER_EMAIL,
            }
          : null);
    }

    if (!referrer) {
      return NextResponse.json(
        { ok: false, error: 'We could not find a referrer for that company yet.' },
        { status: 404 },
      );
    }

    const id = await generateSubmissionId('APP');
    const fileBuffer = Buffer.from(await resumeEntry.arrayBuffer());

    const scan = await scanBufferForViruses(fileBuffer, resumeEntry.name);
    if (!scan.ok) {
      const message = scan.message || 'Your file failed virus scanning.';
      return NextResponse.json({ ok: false, field: 'resume', error: message }, { status: 400 });
    }

    const resumeCheck = await ensureResumeLooksLikeCv(
      fileBuffer,
      resumeEntry.type,
      resumeEntry.name,
    );
    if (!resumeCheck.ok) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: resumeCheck.message || 'Please upload a complete resume (PDF/DOCX).' },
        { status: 400 },
      );
    }

    const upload = await uploadFileToDrive({
      buffer: fileBuffer,
      name: `${id}-${resumeEntry.name}`,
      mimeType: resumeEntry.type || 'application/octet-stream',
      folderId: process.env.GDRIVE_FOLDER_ID || '',
    });

    const resumeFileId = upload.fileId;

    const applicant = applicantRecord.record;
    const applicantName = [applicant.firstName, applicant.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Check if applicant is ineligible based on location and work authorization
    const locatedCanada = applicant.locatedCanada?.toLowerCase() || '';
    const authorizedCanada = applicant.authorizedCanada?.toLowerCase() || '';
    const eligibleMoveCanada = applicant.eligibleMoveCanada?.toLowerCase() || '';
    const isIneligible =
      (locatedCanada === 'no' && eligibleMoveCanada === 'no') ||
      (locatedCanada === 'yes' && authorizedCanada === 'no');
    // Generate portal link for the referrer (skip for fallback referrer)
    let portalUrl: string | undefined;
    if (referrer.irref && referrer.irref !== 'fallback') {
      try {
        const tokenVersion = await ensureReferrerPortalTokenVersion(referrer.irref);
        portalUrl = buildReferrerPortalLink(referrer.irref, tokenVersion);
      } catch (err) {
        console.warn('Failed to generate referrer portal link:', err);
      }
    }

    const template = applicationSubmittedToReferrer({
      referrerName: referrer.name,
      applicantName: applicantName || undefined,
      applicantEmail: applicant.email,
      applicantPhone: applicant.phone,
      applicantId: applicant.id || applicantId,
      iCrn,
      companyName: referrer.company,
      position,
      resumeFileName: resumeEntry.name,
      referenceNumber,
      portalUrl,
    });

    await sendMail({
      to: referrer.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // Send confirmation email to applicant
    if (applicant.email) {
      const applicantTemplate = applicationConfirmationToApplicant({
        applicantName: applicantName || undefined,
        applicantEmail: applicant.email,
        applicantId: applicant.id || applicantId,
        iCrn,
        position,
        referenceNumber: referenceNumber || undefined,
        resumeFileName: resumeEntry.name,
        submissionId: id,
      });

      await sendMail({
        to: applicant.email,
        subject: applicantTemplate.subject,
        html: applicantTemplate.html,
        text: applicantTemplate.text,
      });
    }

    await appendApplicationRow({
      id,
      applicantId: applicant.id || applicantId,
      iCrn,
      position,
      referenceNumber,
      resumeFileName: resumeEntry.name,
      resumeFileId,
      referrerIrref: referrer.irref,
      referrerEmail: referrer.email,
      status: isIneligible ? 'ineligible' : undefined,
    });

    return NextResponse.json({
      ok: true,
      id,
      candidate: {
        id: applicantRecord.record.id,
        legacyApplicantId: applicantRecord.record.legacyApplicantId,
        rowIndex: applicantRecord.rowIndex,
      },
    });
  } catch (error) {
    console.error('Error submitting application', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to submit your application right now. Please try again shortly.' },
      { status: 500 },
    );
  }
}
