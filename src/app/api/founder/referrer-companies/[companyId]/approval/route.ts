import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  buildReferrerPortalLink,
  ensureReferrerPortalTokenVersion,
  sendReferrerPortalLinkEmail,
} from '@/lib/referrerPortalLink';
import {
  getReferrerCompanyById,
  getReferrerByIrref,
  updateCompanyApproval,
  hasApprovedCompany,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> },
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

  const companyId = params.companyId;

  // A) Load company and referrer to check requirements
  const companyResult = await getReferrerCompanyById(companyId);
  if (!companyResult) {
    return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
  }

  const company = companyResult.record;
  const referrer = await getReferrerByIrref(company.referrerIrref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  const prevApproval = (company.companyApproval || '').trim().toLowerCase();
  const referrerEmail = referrer.record.email?.trim() || '';
  const referrerName = referrer.record.name?.trim() || '';
  const companyName = company.companyName?.trim() || '';

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
    const result = await updateCompanyApproval(companyId, approval as 'approved' | 'denied');
    if (!result.success) {
      if (result.reason === 'not_found') {
        return NextResponse.json({ ok: false, error: 'Company not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: false, error: 'Failed to update company approval' }, { status: 500 });
    }

    // C) If newly approved and this is the referrer's first approved company, send portal link email
    if (approval === 'approved' && prevApproval !== 'approved') {
      // Check if this is the first approved company for this referrer
      const hadApprovedCompanyBefore = await hasApprovedCompany(company.referrerIrref);
      // Since we just approved this one, check if there were any before
      // Actually, hasApprovedCompany will now return true since we just approved this one
      // We need to check if this was the first approval - use wasFirstApproval flag
      const isFirstCompanyApproval = result.wasFirstApproval;

      try {
        const version = await ensureReferrerPortalTokenVersion(company.referrerIrref);
        const link = buildReferrerPortalLink(company.referrerIrref, version);

        await sendReferrerPortalLinkEmail({
          to: referrerEmail,
          name: referrerName,
          irref: company.referrerIrref,
          link,
        });

        return NextResponse.json({
          ok: true,
          approval: 'approved',
          companyIrcrn: result.companyIrcrn,
          companyId,
          portalLinkSent: true,
          isFirstCompanyApproval,
        });
      } catch (emailError) {
        console.error('Error sending portal link email on approval:', emailError);
        return NextResponse.json({
          ok: true,
          approval: 'approved',
          companyIrcrn: result.companyIrcrn,
          companyId,
          portalLinkSent: false,
          emailError: 'Failed to send portal link email',
          isFirstCompanyApproval,
        });
      }
    }

    // D) If denied, we don't revoke the entire portal access since they might have other companies
    // Just return success
    if (approval === 'denied') {
      return NextResponse.json({
        ok: true,
        approval: 'denied',
        companyIrcrn: result.companyIrcrn,
        companyId,
      });
    }

    // Already approved, no resend
    return NextResponse.json({
      ok: true,
      approval: 'approved',
      companyIrcrn: result.companyIrcrn,
      companyId,
      portalLinkSent: false,
    });
  } catch (error) {
    console.error('Error updating company approval', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to update company approval.' },
      { status: 500 },
    );
  }
}
