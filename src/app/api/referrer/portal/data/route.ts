import { NextRequest, NextResponse } from 'next/server';

import { findCandidateByIdentifier, getReferrerByIrref, listApplications } from '@/lib/sheets';
import { verifyReferrerToken } from '@/lib/referrerPortalToken';

export const dynamic = 'force-dynamic';

async function buildItems(referrerIrref: string) {
  const apps = await listApplications({ referrerIrref, limit: 0 });
  const items = await Promise.all(
    apps.items.map(async (app) => {
      const candidate = app.candidateId
        ? await findCandidateByIdentifier(app.candidateId).catch(() => null)
        : null;
      const candidateName = candidate
        ? [candidate.record.firstName, candidate.record.familyName].filter(Boolean).join(' ').trim()
        : '';
      return {
        id: app.id,
        candidateId: app.candidateId,
        candidateName,
        candidateEmail: candidate?.record.email || '',
        candidatePhone: candidate?.record.phone || '',
        position: app.position,
        iCrn: app.iCrn,
        resumeFileName: app.resumeFileName,
        resumeUrl: app.resumeUrl,
        status: app.status || '',
        ownerNotes: app.ownerNotes || '',
      };
    }),
  );
  return { total: apps.total, items };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyReferrerToken(token);
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
  }

  const referrer = await getReferrerByIrref(payload.irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  const data = await buildItems(payload.irref);
  return NextResponse.json({
    ok: true,
    referrer: {
      irref: payload.irref,
      name: referrer.record.name,
      email: referrer.record.email,
      company: referrer.record.company,
    },
    ...data,
  });
}
