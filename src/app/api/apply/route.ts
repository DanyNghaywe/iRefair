import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

import { uploadFileToDrive } from '@/lib/drive';
import { applicationSubmittedToReferrer, applicationConfirmationToCandidate } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { hashCandidateSecret } from '@/lib/candidateUpdateToken';
import {
  appendApplicationRow,
  findCandidateByIdentifier,
  findReferrerByIrcrn,
  findReferrerByIrcrnStrict,
  generateSubmissionId,
  isIrain,
  isIrcrn,
  ReferrerLookupError,
} from '@/lib/sheets';
import { ensureResumeLooksLikeCv, scanBufferForViruses } from '@/lib/fileScan';

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
    const candidateId = normalize(form.get('candidateId'));
    const candidateKey = normalize(form.get('candidateKey'));
    const iCrn = normalize(form.get('iCrn'));
    const position = normalize(form.get('position'));
    const referenceNumberInput = normalize(form.get('referenceNumber'));
    const referenceNumber =
      referenceNumberInput &&
      referenceNumberInput.toLowerCase() !== position.toLowerCase()
        ? referenceNumberInput
        : '';
    const resumeEntry = form.get('resume');

    if (!candidateId || !candidateKey || !iCrn || !position) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Please provide your iRAIN (or legacy candidate ID), candidate key, iRCRN, and the position you are applying for.',
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

    const candidateRecord = await findCandidateByIdentifier(candidateId);
    if (!candidateRecord) {
      return NextResponse.json(
        { ok: false, error: 'We could not find a candidate with that ID.' },
        { status: 404 },
      );
    }
    const storedKeyHash = candidateRecord.record.candidateSecretHash?.trim().toLowerCase();
    const providedKeyHash = candidateKey ? hashCandidateSecret(candidateKey) : '';
    const keyMatches =
      storedKeyHash &&
      providedKeyHash &&
      storedKeyHash.length === providedKeyHash.length &&
      timingSafeEqual(Buffer.from(storedKeyHash, 'hex'), Buffer.from(providedKeyHash, 'hex'));
    if (!keyMatches) {
      return NextResponse.json({ ok: false, error: 'Invalid candidate credentials.' }, { status: 401 });
    }
    if (strictMode && !isIrain(candidateRecord.record.id)) {
      return NextResponse.json(
        { ok: false, error: 'Candidate record is missing a valid iRAIN. Please update the candidate record.' },
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

    const candidate = candidateRecord.record;
    const candidateName = [candidate.firstName, candidate.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const feedbackRecipient =
      process.env.APPLICATION_FEEDBACK_EMAIL ||
      process.env.SMTP_FROM_EMAIL ||
      process.env.SMTP_USER ||
      referrer.email;
    const feedbackSubject = encodeURIComponent(
      `Feedback: ${candidate.id || candidateId} for ${iCrn}`,
    );
    const approveBody = encodeURIComponent('Approved / interested. Notes: ');
    const declineBody = encodeURIComponent('Decline / not a fit. Notes: ');
    const feedbackApproveUrl = `mailto:${feedbackRecipient}?subject=${feedbackSubject}&body=${approveBody}`;
    const feedbackDeclineUrl = `mailto:${feedbackRecipient}?subject=${feedbackSubject}&body=${declineBody}`;

    const template = applicationSubmittedToReferrer({
      referrerName: referrer.name,
      candidateName: candidateName || undefined,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      candidateId: candidate.id || candidateId,
      iCrn,
      position,
      resumeFileName: resumeEntry.name,
      referenceNumber,
      feedbackApproveUrl,
      feedbackDeclineUrl,
    });

    await sendMail({
      to: referrer.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    // Send confirmation email to candidate
    if (candidate.email) {
      const candidateTemplate = applicationConfirmationToCandidate({
        candidateName: candidateName || undefined,
        candidateEmail: candidate.email,
        candidateId: candidate.id || candidateId,
        iCrn,
        position,
        referenceNumber: referenceNumber || undefined,
        resumeFileName: resumeEntry.name,
        submissionId: id,
      });

      await sendMail({
        to: candidate.email,
        subject: candidateTemplate.subject,
        html: candidateTemplate.html,
        text: candidateTemplate.text,
      });
    }

    await appendApplicationRow({
      id,
      candidateId: candidate.id || candidateId,
      iCrn,
      position,
      referenceNumber,
      resumeFileName: resumeEntry.name,
      resumeFileId,
      referrerIrref: referrer.irref,
      referrerEmail: referrer.email,
    });

    return NextResponse.json({
      ok: true,
      id,
      candidate: {
        id: candidateRecord.record.id,
        legacyCandidateId: candidateRecord.record.legacyCandidateId,
        rowIndex: candidateRecord.rowIndex,
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
