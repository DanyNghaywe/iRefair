import { NextRequest, NextResponse } from 'next/server';
import {
  findApplicantByIdentifier,
  findReferrerCompanyByIrcrn,
  getApplicationById,
  getReferrerByIrref,
  getReferrerCompanyById,
} from '@/lib/sheets';
import { hashOpaqueToken, isExpired } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token')?.trim() || '';
  const appId = searchParams.get('appId')?.trim() || '';
  const irain = searchParams.get('irain')?.trim() || '';

  if (!token || (!appId && !irain)) {
    return NextResponse.json({ ok: false, error: 'Missing parameters' }, { status: 400 });
  }

  if (!appId) {
    const applicant = await findApplicantByIdentifier(irain);
    if (!applicant?.record) {
      return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
    }

    if (applicant.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json({ ok: false, error: 'Applicant is archived' }, { status: 403 });
    }

    const storedHash = applicant.record.pendingCvTokenHash || '';
    const storedExpiry = applicant.record.pendingCvTokenExpiresAt || '';

    if (isExpired(storedExpiry)) {
      return NextResponse.json({ ok: false, error: 'Update link has expired' }, { status: 410 });
    }

    const providedHash = hashOpaqueToken(token);
    if (!storedHash || storedHash !== providedHash) {
      return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
    }

    let companyName = '';
    const pendingIrcrn = applicant.record.pendingCompanyIrcrn || '';
    if (pendingIrcrn) {
      const match = await findReferrerCompanyByIrcrn(pendingIrcrn);
      companyName = match?.company?.companyName || pendingIrcrn;
    }

    return NextResponse.json({
      ok: true,
      data: {
        position: applicant.record.pendingPosition || '',
        companyName,
        referenceNumber: applicant.record.pendingReferenceNumber || '',
        currentCvName: applicant.record.resumeFileName || '',
        requestType: 'founder',
      },
    });
  }

  const application = await getApplicationById(appId);
  if (!application?.record) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  // Validate token
  const storedHash = application.record.updateRequestTokenHash || '';
  const storedExpiry = application.record.updateRequestExpiresAt || '';

  if (isExpired(storedExpiry)) {
    return NextResponse.json({ ok: false, error: 'Update link has expired' }, { status: 410 });
  }

  const providedHash = hashOpaqueToken(token);
  if (!storedHash || storedHash !== providedHash) {
    return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });
  }

  // Get company name from referrer
  let companyName = '';
  if (application.record.referrerCompanyId) {
    const company = await getReferrerCompanyById(application.record.referrerCompanyId);
    companyName = company?.record?.companyName || '';
  }
  if (!companyName && application.record.referrerIrref) {
    const referrer = await getReferrerByIrref(application.record.referrerIrref);
    companyName = referrer?.record?.company || '';
  }

  return NextResponse.json({
    ok: true,
    data: {
      position: application.record.position || '',
      companyName,
      currentCvName: application.record.resumeFileName || '',
      requestType: 'referrer',
    },
  });
}
