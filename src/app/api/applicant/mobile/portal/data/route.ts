import { NextRequest, NextResponse } from 'next/server';

import { verifyApplicantPortalToken } from '@/lib/applicantPortalToken';
import {
  findApplicantByIdentifier,
  listApplications,
  normalizeStatus,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';

function timestampToMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getApplicantPortalToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return request.nextUrl.searchParams.get('token')?.trim() || '';
}

export async function GET(request: NextRequest) {
  const token = getApplicantPortalToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyApplicantPortalToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
  }

  try {
    const applicant = await findApplicantByIdentifier(payload.irain);
    if (!applicant) {
      return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
    }

    if (applicant.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json(
        { ok: false, error: 'This applicant account has been archived and portal access is no longer available.' },
        { status: 403 },
      );
    }

    const normalizedApplicantIds = Array.from(
      new Set(
        [
          payload.irain,
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

    return NextResponse.json({
      ok: true,
      total: applications.length,
      items: applications,
      applicant: {
        irain: applicant.record.id,
        firstName: applicant.record.firstName || '',
        lastName: applicant.record.familyName || '',
        email: applicant.record.email || '',
      },
    });
  } catch (error) {
    console.error('Failed to load applicant portal data:', {
      irain: payload.irain,
      error,
    });
    return NextResponse.json(
      { ok: false, error: 'Unable to load portal data. Please try again later.' },
      { status: 500 },
    );
  }
}
