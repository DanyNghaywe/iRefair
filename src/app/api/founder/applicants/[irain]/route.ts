import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { deleteApplicantByIrain, getApplicantByIrain, updateApplicantFields } from '@/lib/sheets';

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
    const result = await deleteApplicantByIrain(params.irain);
    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: 'Unable to delete applicant.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting applicant', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to delete applicant.' },
      { status: 500 },
    );
  }
}
