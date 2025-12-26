import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { getReferrerByIrref } from '@/lib/sheets';
import {
  buildReferrerPortalLink,
  ensureReferrerPortalTokenVersion,
  sendReferrerPortalLinkEmail,
} from '@/lib/referrerPortalLink';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { irref?: string; email?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* noop */
  }
  const irref = (body.irref || '').trim();
  if (!irref) {
    return NextResponse.json({ ok: false, error: 'Missing iRREF' }, { status: 400 });
  }

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  let portalLink: string;
  try {
    const portalTokenVersion = await ensureReferrerPortalTokenVersion(irref);
    portalLink = buildReferrerPortalLink(irref, portalTokenVersion);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate portal link';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (referrer.record.email) {
    await sendReferrerPortalLinkEmail({
      to: referrer.record.email,
      name: referrer.record.name,
      link: portalLink,
    });
  }

  return NextResponse.json({ ok: true, link: portalLink });
}
