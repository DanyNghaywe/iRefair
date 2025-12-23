import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  REFERRER_PORTAL_TOKEN_VERSION_HEADER,
  REFERRER_SHEET_NAME,
  ensureColumns,
  getReferrerByIrref,
  updateRowById,
} from '@/lib/sheets';
import { normalizePortalTokenVersion } from '@/lib/referrerPortalToken';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ irain: string }> },
) {
  const params = await context.params;

  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const irref = params.irain;
  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  const currentVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  const nextVersion = currentVersion + 1;

  try {
    await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PORTAL_TOKEN_VERSION_HEADER]);
    const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
      [REFERRER_PORTAL_TOKEN_VERSION_HEADER]: String(nextVersion),
    });
    if (!result.updated) {
      return NextResponse.json({ ok: false, error: 'Unable to rotate token.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, version: nextVersion });
  } catch (error) {
    console.error('Error rotating portal token', error);
    return NextResponse.json({ ok: false, error: 'Unable to rotate token.' }, { status: 500 });
  }
}
