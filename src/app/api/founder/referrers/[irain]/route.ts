import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { getReferrerByIrref, updateReferrerFields } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

type PatchBody = {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  company?: string;
  companyIndustry?: string;
  careersPortal?: string;
  workType?: string;
  linkedin?: string;
  status?: string;
  ownerNotes?: string;
  tags?: string;
  lastContactedAt?: string;
  nextActionAt?: string;
};

type ReferrerRecord = {
  irref: string;
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIrcrn?: string;
  companyApproval?: string;
  companyIndustry: string;
  careersPortal?: string;
  workType: string;
  linkedin: string;
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  missingFields: string[];
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
    const referrer = await getReferrerByIrref(params.irain);
    if (!referrer) {
      return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
    }

    const record = referrer.record;
    const missingFields: string[] = [];
    if (!record.email) missingFields.push('Email');
    if (!record.phone) missingFields.push('Phone');
    if (!record.company) missingFields.push('Company');
    if (!record.careersPortal) missingFields.push('Careers Portal');

    const item: ReferrerRecord = {
      ...record,
      missingFields,
    };

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    console.error('Error fetching referrer', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to load referrer right now.' },
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
    'name',
    'email',
    'phone',
    'country',
    'company',
    'companyIndustry',
    'careersPortal',
    'workType',
    'linkedin',
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
    const result = await updateReferrerFields(params.irain, patch);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    console.error('Error updating referrer admin fields', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update referrer.' },
      { status: 500 },
    );
  }
}
