import { NextRequest, NextResponse } from 'next/server';

import { downloadFileFromDrive } from '@/lib/drive';
import { normalizePortalTokenVersion, verifyReferrerToken } from '@/lib/referrerPortalToken';
import { getReferrerPortalToken } from '@/lib/referrerPortalAuth';
import { getApplicationById, getReferrerByIrref } from '@/lib/sheets';

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
  const applicationId = request.nextUrl.searchParams.get('applicationId') || '';
  if (!applicationId) {
    return NextResponse.json({ ok: false, error: 'Missing applicationId' }, { status: 400 });
  }

  const token = getReferrerPortalToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyReferrerToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
  }

  const referrer = await getReferrerByIrref(payload.irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }
  if (referrer.record.archived?.toLowerCase() === 'true') {
    return NextResponse.json(
      { ok: false, error: 'This referrer account has been archived and portal access is no longer available.' },
      { status: 403 },
    );
  }
  const expectedVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  if (payload.v !== expectedVersion) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const application = await getApplicationById(applicationId);
  if (!application?.record?.applicantId) {
    return NextResponse.json({ ok: false, error: 'Application not found.' }, { status: 404 });
  }

  const normalizedPayloadIrref = payload.irref.trim().toLowerCase();
  const normalizedApplicationIrref = (application.record.referrerIrref || '').trim().toLowerCase();
  if (!normalizedApplicationIrref || normalizedApplicationIrref !== normalizedPayloadIrref) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  // Use ONLY application-specific CV (from /apply submission)
  const resumeFileId = application.record.resumeFileId?.trim();
  const resumeFileName = application.record.resumeFileName;

  if (!resumeFileId) {
    return NextResponse.json({ ok: false, error: 'Resume not available.' }, { status: 404 });
  }

  try {
    const { buffer, mimeType, name } = await downloadFileFromDrive(resumeFileId);
    const filename = sanitizeFilename(resumeFileName || name || 'resume');
    const body = new Uint8Array(buffer);
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
