import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToDrive } from '@/lib/drive';
import {
  getApplicationById,
  getReferrerByIrref,
  updateApplicationAdmin,
  findApplicantByIdentifier,
} from '@/lib/sheets';
import { hashOpaqueToken, isExpired } from '@/lib/tokens';
import { ensureResumeLooksLikeCv, scanBufferForViruses } from '@/lib/fileScan';
import { sendMail } from '@/lib/mailer';
import { applicantUpdatedToReferrer } from '@/lib/emailTemplates';
import { appendActionHistoryEntry, type ActionLogEntry } from '@/lib/actionHistory';
import { ensureReferrerPortalTokenVersion, buildReferrerPortalLink } from '@/lib/referrerPortalLink';
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_RESUME_EXTENSIONS = ['pdf', 'doc', 'docx'];
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB

const isAllowedResume = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const typeAllowed = file.type ? ALLOWED_RESUME_TYPES.includes(file.type) : false;
  const extensionAllowed = extension ? ALLOWED_RESUME_EXTENSIONS.includes(extension) : false;
  return typeAllowed || extensionAllowed;
};

export async function POST(request: NextRequest) {
  const rate = await rateLimit(request, { keyPrefix: 'update-cv', ...RATE_LIMITS.apply });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  try {
    const form = await request.formData();
    const token = (form.get('token') as string)?.trim() || '';
    const appId = (form.get('appId') as string)?.trim() || '';
    const resumeEntry = form.get('resume');

    // Validate required fields
    if (!token || !appId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Get and validate application
    const application = await getApplicationById(appId);
    if (!application?.record) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }

    // Check if application is archived
    if (application.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json(
        { ok: false, error: 'This application has been archived and can no longer be updated.' },
        { status: 403 },
      );
    }

    // Check if the applicant is archived
    if (application.record.applicantId) {
      const applicant = await findApplicantByIdentifier(application.record.applicantId).catch(() => null);
      if (applicant?.record.archived?.toLowerCase() === 'true') {
        return NextResponse.json(
          { ok: false, error: 'This applicant profile has been archived and can no longer update their CV.' },
          { status: 403 },
        );
      }
    }

    // Validate token
    const storedHash = application.record.updateRequestTokenHash || '';
    const storedExpiry = application.record.updateRequestExpiresAt || '';

    if (isExpired(storedExpiry)) {
      return NextResponse.json({ ok: false, error: 'Update link has expired' }, { status: 410 });
    }

    const providedHash = hashOpaqueToken(token);
    if (!storedHash || storedHash !== providedHash) {
      return NextResponse.json({ ok: false, error: 'Invalid update token' }, { status: 401 });
    }

    // Validate resume file
    if (!(resumeEntry instanceof File) || resumeEntry.size === 0) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: 'Please upload your CV (PDF or DOC/DOCX, max 10MB).' },
        { status: 400 },
      );
    }

    if (!isAllowedResume(resumeEntry) || resumeEntry.size > MAX_RESUME_SIZE) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: 'Please upload a PDF or DOC/DOCX file under 10MB.' },
        { status: 400 },
      );
    }

    // Scan for viruses
    const fileBuffer = Buffer.from(await resumeEntry.arrayBuffer());
    const virusScan = await scanBufferForViruses(fileBuffer, resumeEntry.name);
    if (!virusScan.ok) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: virusScan.message || 'File rejected by security scan.' },
        { status: 400 },
      );
    }

    // Validate CV content
    const cvCheck = await ensureResumeLooksLikeCv(fileBuffer, resumeEntry.type, resumeEntry.name);
    if (!cvCheck.ok) {
      return NextResponse.json(
        { ok: false, field: 'resume', error: cvCheck.message || 'The file does not appear to be a valid CV/resume.' },
        { status: 400 },
      );
    }

    // Upload to Google Drive
    const upload = await uploadFileToDrive({
      buffer: fileBuffer,
      name: `${appId}-${resumeEntry.name}`,
      mimeType: resumeEntry.type || 'application/octet-stream',
      folderId: process.env.GDRIVE_FOLDER_ID || '',
    });

    // Build action history entry
    const actionEntry: ActionLogEntry = {
      action: 'CV_UPDATED',
      timestamp: new Date().toISOString(),
      performedBy: 'applicant',
    };
    const updatedActionHistory = appendActionHistoryEntry(application.record.actionHistory, actionEntry);

    // Update application record
    await updateApplicationAdmin(appId, {
      resumeFileId: upload.fileId,
      resumeFileName: resumeEntry.name,
      updateRequestTokenHash: '',
      updateRequestExpiresAt: '',
      updateRequestPurpose: '',
      status: 'cv updated',
      actionHistory: updatedActionHistory,
    });

    // Notify referrer
    const referrerIrref = application.record.referrerIrref;
    if (referrerIrref) {
      try {
        const applicant = await findApplicantByIdentifier(application.record.applicantId).catch(() => null);
        const referrer = await getReferrerByIrref(referrerIrref);

        if (referrer?.record?.email) {
          const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrerIrref);
          const portalUrl = buildReferrerPortalLink(referrerIrref, portalTokenVersion);

          const applicantName = applicant
            ? [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' ')
            : undefined;

          const template = applicantUpdatedToReferrer({
            referrerName: referrer.record.name || undefined,
            applicantName: applicantName || undefined,
            applicantEmail: applicant?.record?.email,
            position: application.record.position || undefined,
            applicationId: appId,
            updatedFields: ['their CV'],
            resumeUrl: `https://drive.google.com/file/d/${upload.fileId}/view`,
            portalUrl,
          });

          await sendMail({
            to: referrer.record.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
          });
        }
      } catch (emailError) {
        console.error('Failed to send referrer notification email:', emailError);
        // Don't fail the request if email fails - CV was still updated successfully
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating CV:', error);
    return NextResponse.json(
      { ok: false, error: 'An error occurred while updating your CV. Please try again.' },
      { status: 500 },
    );
  }
}
