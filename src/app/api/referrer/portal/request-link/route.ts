import { NextRequest, NextResponse } from 'next/server';
import { getReferrerByEmail, hasApprovedCompany } from '@/lib/sheets';
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
      return NextResponse.json(
        { ok: false, error: 'No referrer account found for this email.' },
        { status: 404 },
      );
    }

    if (referrer.record.archived?.toLowerCase() === 'true') {
      return NextResponse.json(
        { ok: false, error: 'This referrer account has been archived and cannot access the portal.' },
        { status: 403 },
      );
    }

    const accepted = await hasApprovedCompany(referrer.record.irref);
    if (!accepted) {
      return NextResponse.json(
        { ok: false, error: 'This referrer account is not accepted yet.' },
        { status: 403 },
      );
    }

    const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrer.record.irref);
    const portalLink = buildReferrerPortalLink(referrer.record.irref, portalTokenVersion);

    await sendReferrerPortalLinkEmail({
      to: email,
      name: referrer.record.name,
      irref: referrer.record.irref,
      link: portalLink,
    });

    return NextResponse.json({ ok: true, message: 'Portal access email sent.' });
  } catch (err) {
    console.error('Error sending referrer portal link:', err);
    return NextResponse.json(
      { ok: false, error: 'Unable to send link. Please try again later.' },
      { status: 500 }
    );
  }
}
