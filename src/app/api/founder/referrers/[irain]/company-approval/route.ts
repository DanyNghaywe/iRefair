import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  buildReferrerPortalLink,
  ensureReferrerPortalTokenVersion,
  sendReferrerPortalLinkEmail,
} from '@/lib/referrerPortalLink';
import { normalizePortalTokenVersion } from '@/lib/referrerPortalToken';
import {
  REFERRER_PORTAL_TOKEN_VERSION_HEADER,
  REFERRER_SHEET_NAME,
  ensureColumns,
  getReferrerByIrref,
  updateReferrerCompanyApproval,
  updateRowById,
} from '@/lib/sheets';
import { jobOpeningsUrl } from '@/lib/urls';
import { normalizeHttpUrl } from '@/lib/validation';

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

  const body = await request.json().catch(() => ({} as { approval?: string }));
  const approval = String(body.approval || '').trim().toLowerCase();
  if (!approval || (approval !== 'approved' && approval !== 'denied')) {
    return NextResponse.json(
      { ok: false, error: 'Invalid approval value. Use approved or denied.' },
      { status: 400 },
    );
  }

  const irref = params.irain;

  // A) Load referrer to check previous approval and validate requirements
  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  const prevApproval = (referrer.record.companyApproval || '').trim().toLowerCase();
  const referrerEmail = referrer.record.email?.trim() || '';
  const referrerName = referrer.record.name?.trim() || '';
  const companyName = referrer.record.company?.trim() || '';

  // Validate requirements for approval
  if (approval === 'approved') {
    if (!referrerEmail) {
      return NextResponse.json(
        { ok: false, error: 'Referrer email is missing. Please add the email before approving.' },
        { status: 400 },
      );
    }
    if (!companyName) {
      return NextResponse.json(
        { ok: false, error: 'Company name is missing. Please add the company name before approving.' },
        { status: 400 },
      );
    }
  }

  // B) Perform the update
  try {
    const result = await updateReferrerCompanyApproval(irref, approval);
    if (result.reason === 'not_found') {
      return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
    }

    // C) If newly approved, send portal link email
    if (approval === 'approved' && prevApproval !== 'approved') {
      try {
        const version = await ensureReferrerPortalTokenVersion(irref);
        const link = buildReferrerPortalLink(irref, version);

        await sendReferrerPortalLinkEmail({
          to: referrerEmail,
          name: referrerName,
          irref,
          link,
        });

        return NextResponse.json({
          ok: true,
          approval: result.companyApproval,
          companyIrcrn: result.companyIrcrn,
          portalLinkSent: true,
        });
      } catch (emailError) {
        console.error('Error sending portal link email on approval:', emailError);
        // Still return success for approval, but indicate email failed
        return NextResponse.json({
          ok: true,
          approval: result.companyApproval,
          companyIrcrn: result.companyIrcrn,
          portalLinkSent: false,
          emailError: 'Failed to send portal link email',
        });
      }
    }

    // D) If denied, revoke access by rotating portal token version
    if (approval === 'denied') {
      try {
        const currentVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
        const nextVersion = currentVersion + 1;

        await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PORTAL_TOKEN_VERSION_HEADER]);
        await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
          [REFERRER_PORTAL_TOKEN_VERSION_HEADER]: String(nextVersion),
        });

        return NextResponse.json({
          ok: true,
          approval: result.companyApproval,
          companyIrcrn: result.companyIrcrn,
          portalRevoked: true,
        });
      } catch (revokeError) {
        console.error('Error revoking portal access on denial:', revokeError);
        // Still return success for denial, but indicate revoke failed
        return NextResponse.json({
          ok: true,
          approval: result.companyApproval,
          companyIrcrn: result.companyIrcrn,
          portalRevoked: false,
        });
      }
    }

    // Already approved, no resend
    return NextResponse.json({
      ok: true,
      approval: result.companyApproval,
      companyIrcrn: result.companyIrcrn,
      portalLinkSent: false,
    });
  } catch (error) {
    console.error('Error updating referrer company approval', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update company approval.' },
      { status: 500 },
    );
  }
}
