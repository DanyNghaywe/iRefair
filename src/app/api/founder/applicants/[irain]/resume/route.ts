import { NextRequest, NextResponse } from 'next/server';

import { uploadFileToDrive } from '@/lib/drive';
import { scanBufferForViruses, ensureResumeLooksLikeCv } from '@/lib/fileScan';
import { requireFounder } from '@/lib/founderAuth';
import {
  findApplicantByIdentifier,
  updateRowById,
  ensureColumns,
  APPLICANT_SHEET_NAME,
} from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const applicant = await findApplicantByIdentifier(params.irain);
    if (!applicant) {
      return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
    }

    const form = await request.formData();
    const resumeEntry = form.get('resume');

    if (!(resumeEntry instanceof File) || resumeEntry.size === 0) {
      return NextResponse.json(
        { ok: false, error: 'Please upload a resume file.' },
        { status: 400 },
      );
    }

    if (!isAllowedResume(resumeEntry)) {
      return NextResponse.json(
        { ok: false, error: 'Please upload a PDF, DOC, or DOCX file.' },
        { status: 400 },
      );
    }

    if (resumeEntry.size > MAX_RESUME_SIZE) {
      return NextResponse.json(
        { ok: false, error: 'File size exceeds 10MB limit.' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await resumeEntry.arrayBuffer());

    // Virus scan
    const virusScan = await scanBufferForViruses(buffer, resumeEntry.name);
    if (!virusScan.ok) {
      console.error('Resume upload failed virus scan', {
        irain: params.irain,
        message: virusScan.message,
      });
      return NextResponse.json(
        { ok: false, error: 'File failed security scan.' },
        { status: 400 },
      );
    }

    // CV validation
    const cvCheck = await ensureResumeLooksLikeCv(buffer, resumeEntry.type, resumeEntry.name);
    if (!cvCheck.ok) {
      return NextResponse.json(
        { ok: false, error: cvCheck.message || 'File does not appear to be a valid resume.' },
        { status: 400 },
      );
    }

    // Upload to Google Drive
    const folderId = process.env.GDRIVE_FOLDER_ID;
    if (!folderId) {
      console.error('GDRIVE_FOLDER_ID not configured');
      return NextResponse.json(
        { ok: false, error: 'File storage not configured.' },
        { status: 500 },
      );
    }

    const upload = await uploadFileToDrive({
      buffer,
      name: `${applicant.record.id}-${resumeEntry.name}`,
      mimeType: resumeEntry.type || 'application/octet-stream',
      folderId,
    });

    // Update applicant record with resume info
    await ensureColumns(APPLICANT_SHEET_NAME, [
      'Resume File Name',
      'Resume File ID',
      'Resume URL',
    ]);

    await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', applicant.record.id, {
      'Resume File Name': resumeEntry.name,
      'Resume File ID': upload.fileId,
      'Resume URL': upload.webViewLink || '',
    });

    console.log('Resume uploaded by founder', {
      irain: applicant.record.id,
      fileName: resumeEntry.name,
      fileId: upload.fileId,
    });

    return NextResponse.json({
      ok: true,
      resumeFileName: resumeEntry.name,
      resumeFileId: upload.fileId,
      resumeUrl: upload.webViewLink || '',
    });
  } catch (error) {
    console.error('Error uploading resume', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to upload resume.' },
      { status: 500 },
    );
  }
}
