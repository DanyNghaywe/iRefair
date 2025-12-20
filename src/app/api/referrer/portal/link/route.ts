import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { sendMail } from '@/lib/mailer';
import { getReferrerByIrref } from '@/lib/sheets';
import { createReferrerToken } from '@/lib/referrerPortalToken';
import { jobOpeningsUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

function appBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL;
  if (!base) return 'http://localhost:3000';
  return base.startsWith('http') ? base : `https://${base}`;
}

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

  const token = createReferrerToken(irref);
  const portalLink = `${appBaseUrl()}/referrer/portal?token=${encodeURIComponent(token)}`;

  if (referrer.record.email) {
    const html = `
      <p>Hi ${referrer.record.name || 'there'},</p>
      <p>Here is your iRefair referrer portal link. It lets you view your candidates, CVs, statuses, and send feedback (A–G).</p>
      <p><a href="${portalLink}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2f5fb3;color:#fff;text-decoration:none;font-weight:700;">Open your portal</a></p>
      <p>If the button doesn't work, paste this URL in your browser:<br/><code>${portalLink}</code></p>
      <hr/>
      <p>Current openings (public): <a href="${jobOpeningsUrl}">${jobOpeningsUrl}</a></p>
    `;
    const text = `Hi ${referrer.record.name || 'there'},

Here is your iRefair referrer portal link:
${portalLink}

You can view your candidates, CVs, statuses, and send feedback (A–G).

Openings: ${jobOpeningsUrl}
`;
    await sendMail({
      to: referrer.record.email,
      subject: 'Your iRefair referrer portal link',
      html,
      text,
    });
  }

  return NextResponse.json({ ok: true, link: portalLink });
}
