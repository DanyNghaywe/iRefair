import { NextRequest, NextResponse } from 'next/server';

import { getApplicationById, findApplicantByIdentifier } from '@/lib/sheets';
import { hashOpaqueToken, isExpired } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

/**
 * GET /api/applicant/data?updateToken=xxx&appId=yyy
 *
 * Returns applicant data for prefilling the update form.
 * Validates the updateToken against the application's stored hash.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const updateToken = searchParams.get('updateToken')?.trim() || '';
  const appId = searchParams.get('appId')?.trim() || '';

  if (!updateToken || !appId) {
    return NextResponse.json(
      { ok: false, error: 'Missing updateToken or appId' },
      { status: 400 }
    );
  }

  try {
    // Get the application to validate the token
    const application = await getApplicationById(appId);
    if (!application?.record) {
      return NextResponse.json(
        { ok: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const storedHash = application.record.updateRequestTokenHash || '';
    const storedExpiry = application.record.updateRequestExpiresAt || '';

    // Validate token hasn't expired
    if (isExpired(storedExpiry)) {
      return NextResponse.json(
        { ok: false, error: 'Update link has expired' },
        { status: 410 }
      );
    }

    // Validate token hash matches
    const providedHash = hashOpaqueToken(updateToken);
    if (!storedHash || storedHash !== providedHash) {
      return NextResponse.json(
        { ok: false, error: 'Invalid update token' },
        { status: 401 }
      );
    }

    // Token is valid - now get the applicant data
    const applicantId = application.record.applicantId;
    if (!applicantId) {
      return NextResponse.json(
        { ok: false, error: 'No applicant linked to this application' },
        { status: 404 }
      );
    }

    const applicant = await findApplicantByIdentifier(applicantId);
    if (!applicant?.record) {
      return NextResponse.json(
        { ok: false, error: 'Applicant not found' },
        { status: 404 }
      );
    }

    // Return applicant data (excluding sensitive fields)
    const { record } = applicant;
    const updatePurpose = application.record.updateRequestPurpose || 'cv';

    return NextResponse.json({
      ok: true,
      updatePurpose,
      data: {
        firstName: record.firstName || '',
        middleName: record.middleName || '',
        familyName: record.familyName || '',
        email: record.email || '',
        phone: record.phone || '',
        locatedCanada: record.locatedCanada || '',
        province: record.province || '',
        authorizedCanada: record.authorizedCanada || '',
        eligibleMoveCanada: record.eligibleMoveCanada || '',
        countryOfOrigin: record.countryOfOrigin || '',
        languages: record.languages || '',
        languagesOther: record.languagesOther || '',
        industryType: record.industryType || '',
        industryOther: record.industryOther || '',
        employmentStatus: record.employmentStatus || '',
        resumeFileName: record.resumeFileName || '',
      },
    });
  } catch (error) {
    console.error('Error fetching applicant data:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch applicant data' },
      { status: 500 }
    );
  }
}
