import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  getReferrerByIrref,
  updatePendingUpdateStatus,
  updateReferrerFields,
  type PendingReferrerUpdate,
} from '@/lib/sheets';

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

  const body = await request.json().catch(() => ({} as { updateId?: string; action?: string }));
  const updateId = String(body.updateId || '').trim();
  const action = String(body.action || '').trim().toLowerCase();

  if (!updateId) {
    return NextResponse.json({ ok: false, error: 'Missing updateId.' }, { status: 400 });
  }

  if (!action || (action !== 'approve' && action !== 'deny')) {
    return NextResponse.json(
      { ok: false, error: 'Invalid action. Use approve or deny.' },
      { status: 400 },
    );
  }

  const irref = params.irain;

  // Load referrer
  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  // Parse pending updates to find the one being actioned
  const pendingUpdatesRaw = referrer.record.pendingUpdates || '';
  let pendingUpdates: PendingReferrerUpdate[] = [];

  if (pendingUpdatesRaw) {
    try {
      pendingUpdates = JSON.parse(pendingUpdatesRaw);
      if (!Array.isArray(pendingUpdates)) {
        pendingUpdates = [];
      }
    } catch {
      return NextResponse.json({ ok: false, error: 'Failed to parse pending updates.' }, { status: 500 });
    }
  }

  const targetUpdate = pendingUpdates.find((u) => u.id === updateId);
  if (!targetUpdate) {
    return NextResponse.json({ ok: false, error: 'Update not found.' }, { status: 404 });
  }

  if (targetUpdate.status !== 'pending') {
    return NextResponse.json(
      { ok: false, error: `Update already ${targetUpdate.status}.` },
      { status: 400 },
    );
  }

  try {
    if (action === 'approve') {
      // Apply the update to the referrer's fields
      await updateReferrerFields(irref, {
        name: targetUpdate.data.name,
        email: targetUpdate.data.email,
        phone: targetUpdate.data.phone,
        country: targetUpdate.data.country,
        company: targetUpdate.data.company,
        companyIndustry: targetUpdate.data.companyIndustry,
        careersPortal: targetUpdate.data.careersPortal,
        workType: targetUpdate.data.workType,
        linkedin: targetUpdate.data.linkedin,
      });
    }

    // Mark the update as approved or denied
    const newStatus = action === 'approve' ? 'approved' : 'denied';
    const result = await updatePendingUpdateStatus(irref, updateId, newStatus);

    if (!result.success) {
      return NextResponse.json({ ok: false, error: 'Failed to update status.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: newStatus,
      updateId,
    });
  } catch (error) {
    console.error('Error processing pending update', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to process pending update.' },
      { status: 500 },
    );
  }
}
