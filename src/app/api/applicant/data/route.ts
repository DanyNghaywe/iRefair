import { NextRequest, NextResponse } from 'next/server';

import {
  findApplicantByIdentifier,
  getApplicationById,
  listApplications,
  normalizeStatus,
} from '@/lib/sheets';
import { hashOpaqueToken, isExpired } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

function timestampToMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

    const normalizedApplicantIds = Array.from(
      new Set(
        [
          applicantId,
          applicant.record.id,
          applicant.record.legacyApplicantId,
        ]
          .map((value) => (value || '').trim())
          .filter(Boolean),
      ),
    );

    const applicationGroups = await Promise.all(
      normalizedApplicantIds.map((id) =>
        listApplications({
          applicantId: id,
          limit: 0,
        }),
      ),
    );

    const applicationMap = new Map<string, (typeof applicationGroups)[number]['items'][number]>();
    for (const group of applicationGroups) {
      for (const item of group.items) {
        if (!item.id || applicationMap.has(item.id)) continue;
        applicationMap.set(item.id, item);
      }
    }

    const applications = Array.from(applicationMap.values())
      .sort((a, b) => timestampToMs(b.timestamp) - timestampToMs(a.timestamp))
      .map((app) => ({
        id: app.id,
        timestamp: app.timestamp || '',
        position: app.position || '',
        iCrn: app.iCrn || '',
        status: normalizeStatus(app.status),
        meetingDate: app.meetingDate || '',
        meetingTime: app.meetingTime || '',
        meetingTimezone: app.meetingTimezone || '',
        meetingUrl: app.meetingUrl || '',
        resumeFileName: app.resumeFileName || '',
        referrerIrref: app.referrerIrref || '',
      }));

    // Return applicant data (excluding sensitive fields)
    const { record } = applicant;
    const updatePurpose = application.record.updateRequestPurpose || 'cv';

    return NextResponse.json({
      ok: true,
      updatePurpose,
      applications,
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
        linkedin: record.linkedin || '',
        resumeFileName: record.resumeFileName || '',
        desiredRole: record.desiredRole || '',
        targetCompanies: record.targetCompanies || '',
        hasPostings: record.hasPostings || '',
        postingNotes: record.postingNotes || '',
        pitch: record.pitch || '',
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
