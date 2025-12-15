import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { meetFounderInvite } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { getReferrerByIrain, updateReferrerAdmin } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, context: { params: Promise<{ irain: string }> }) {
  const params = await context.params;

  try {
    requireFounder(_request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const referrer = await getReferrerByIrain(params.irain);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }

  if (!referrer.record.email) {
    return NextResponse.json(
      { ok: false, error: 'Referrer email is missing; cannot send invite.' },
      { status: 400 },
    );
  }

  const meetLink =
    process.env.FOUNDER_MEET_LINK ||
    'Scheduling link not configured yet. We will follow up with a calendar invitation.';
  const template = meetFounderInvite(referrer.record.name, referrer.record.irain, meetLink);

  await sendMail({
    to: referrer.record.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  console.log('Founder invite sent', { irain: referrer.record.irain, email: referrer.record.email });

  await updateReferrerAdmin(referrer.record.irain, {
    status: 'meeting invited',
    lastContactedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
