import { NextRequest, NextResponse } from 'next/server';
import { getReferrerByEmail } from '@/lib/sheets';
import {
  buildReferrerPortalLink,
  ensureReferrerPortalTokenVersion,
  sendReferrerPortalLinkEmail,
} from '@/lib/referrerPortalLink';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting (consider Redis for production with multiple instances)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(email);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  // Allow 3 requests per hour per email
  if (limit) {
    if (now < limit.resetAt) {
      if (limit.count >= 3) return false;
      limit.count++;
      return true;
    }
  }

  rateLimitMap.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 });
  return true;
}

export async function POST(request: NextRequest) {
  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
  }

  // Basic email validation
  if (!email.includes('@') || email.length < 3) {
    return NextResponse.json({ ok: false, error: 'Invalid email address' }, { status: 400 });
  }

  // Rate limiting
  if (!checkRateLimit(email)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again in an hour.' },
      { status: 429 }
    );
  }

  try {
    // Look up referrer by email
    const referrer = await getReferrerByEmail(email);
    if (!referrer) {
      // SECURITY: Don't reveal whether email exists or not
      // Return success even if email not found (prevent email enumeration)
      console.log(`Portal link requested for non-existent email: ${email}`);
      return NextResponse.json({ ok: true });
    }

    // SECURITY: Silently skip archived referrers (same as non-existent email handling)
    if (referrer.record.archived?.toLowerCase() === 'true') {
      console.log(`Portal link requested for archived referrer: ${referrer.record.irref} (${email})`);
      return NextResponse.json({ ok: true });
    }

    const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrer.record.irref);
    const portalLink = buildReferrerPortalLink(referrer.record.irref, portalTokenVersion);

    await sendReferrerPortalLinkEmail({
      to: email,
      name: referrer.record.name,
      irref: referrer.record.irref,
      link: portalLink,
    });

    console.log(`Portal link sent to referrer: ${referrer.record.irref} (${email})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error sending referrer portal link:', err);
    return NextResponse.json(
      { ok: false, error: 'Unable to send link. Please try again later.' },
      { status: 500 }
    );
  }
}
