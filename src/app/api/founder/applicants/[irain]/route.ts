import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
  APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
  APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
  APPLICANT_SHEET_NAME,
  archiveApplicantByIrain,
  ensureColumns,
  getApplicantByIrain,
  updateApplicantFields,
  updateRowById,
} from '@/lib/sheets';
import { isExpired } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

type PatchBody = {
  firstName?: string;
  middleName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  locatedCanada?: string;
  province?: string;
  workAuthorization?: string;
  eligibleMoveCanada?: string;
  countryOfOrigin?: string;
  languages?: string;
  languagesOther?: string;
  industryType?: string;
  industryOther?: string;
  employmentStatus?: string;
  status?: string;
  ownerNotes?: string;
  tags?: string;
  lastContactedAt?: string;
  nextActionAt?: string;
};

export async function GET(
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
    const applicant = await getApplicantByIrain(params.irain);
    if (!applicant) {
      return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
    }
    if (applicant.record.pendingCvTokenHash && isExpired(applicant.record.pendingCvTokenExpiresAt)) {
      try {
        await ensureColumns(APPLICANT_SHEET_NAME, [
          APPLICANT_PENDING_CV_REQUESTED_AT_HEADER,
          APPLICANT_PENDING_CV_TOKEN_HASH_HEADER,
          APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER,
        ]);
        const result = await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', applicant.record.id, {
          [APPLICANT_PENDING_CV_REQUESTED_AT_HEADER]: '',
          [APPLICANT_PENDING_CV_TOKEN_HASH_HEADER]: '',
          [APPLICANT_PENDING_CV_TOKEN_EXPIRES_HEADER]: '',
        });
        if (result.updated) {
          applicant.record.pendingCvRequestedAt = '';
          applicant.record.pendingCvTokenHash = '';
          applicant.record.pendingCvTokenExpiresAt = '';
        }
      } catch (error) {
        console.warn('Failed to clear expired pending CV token', error);
      }
    }
    return NextResponse.json({ ok: true, item: applicant.record });
  } catch (error) {
    console.error('Error fetching applicant', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load applicant right now.' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body: PatchBody = await request.json().catch(() => ({}));
  const patch: PatchBody = {};

  const allowedKeys: (keyof PatchBody)[] = [
    'firstName',
    'middleName',
    'familyName',
    'email',
    'phone',
    'locatedCanada',
    'province',
    'workAuthorization',
    'eligibleMoveCanada',
    'countryOfOrigin',
    'languages',
    'languagesOther',
    'industryType',
    'industryOther',
    'employmentStatus',
    'status',
    'ownerNotes',
    'tags',
    'lastContactedAt',
    'nextActionAt',
  ];

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      patch[key] = body[key] ?? '';
    }
  }

  try {
    const result = await updateApplicantFields(params.irain, patch);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    console.error('Error updating applicant admin fields', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update applicant.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const result = await archiveApplicantByIrain(params.irain);
    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
      }
      if (result.reason === 'already_archived') {
        return NextResponse.json({ ok: false, error: 'Applicant is already archived' }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: 'Unable to archive applicant.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, archivedApplications: result.archivedApplications });
  } catch (error) {
    console.error('Error archiving applicant', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to archive applicant.' },
      { status: 500 },
    );
  }
}
