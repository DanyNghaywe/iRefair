import { NextRequest, NextResponse } from 'next/server';

import { downloadFileFromDrive } from '@/lib/drive';
import { requireFounder } from '@/lib/founderAuth';
import { getApplicationById } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sanitizeFilename(name: string) {
  const trimmed = name.trim() || 'resume';
  return trimmed.replace(/[\r\n"]/g, '').replace(/[<>:\/\\|?*]/g, '_');
}

function resolveContentType(mimeType: string) {
  return mimeType === 'application/pdf' ? 'application/pdf' : 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const applicationId = request.nextUrl.searchParams.get('applicationId') || '';
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 });
  }

  const application = await getApplicationById(applicationId);
  if (!application?.record?.candidateId) {
    return NextResponse.json({ ok: false, error: 'Application not found.' }, { status: 404 });
  }

  const resumeFileId = application.record.resumeFileId?.trim();
  if (!resumeFileId) {
    return NextResponse.json({ ok: false, error: 'Resume not available.' }, { status: 404 });
  }

  try {
    const { buffer, mimeType, name } = await downloadFileFromDrive(resumeFileId);
    const filename = sanitizeFilename(application.record.resumeFileName || name || 'resume');
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': resolveContentType(mimeType),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error downloading resume', error);
    return NextResponse.json({ ok: false, error: 'Unable to download resume.' }, { status: 500 });
  }
}
