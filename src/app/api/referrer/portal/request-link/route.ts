import { NextRequest, NextResponse } from 'next/server';
import { getReferrersByEmail, hasApprovedCompany } from '@/lib/sheets';
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
    // Look up all referrer accounts by email.
    const referrers = await getReferrersByEmail(email);
    if (!referrers.length) {
      return NextResponse.json(
        { ok: false, error: 'No referrer account found for this email.' },
        { status: 404 },
      );
    }

    const activeReferrers = referrers.filter(
      (referrer) => referrer.record.archived?.toLowerCase() !== 'true',
    );
    if (!activeReferrers.length) {
      return NextResponse.json(
        { ok: false, error: 'All referrer accounts for this email are archived and cannot access the portal.' },
        { status: 403 },
      );
    }

    const acceptedResults = await Promise.all(
      activeReferrers.map(async (referrer) => ({
        referrer,
        accepted: await hasApprovedCompany(referrer.record.irref),
      })),
    );
    const eligibleReferrers = acceptedResults
      .filter((result) => result.accepted)
      .map((result) => result.referrer);

    if (!eligibleReferrers.length) {
      return NextResponse.json(
        { ok: false, error: 'No accepted referrer account found for this email.' },
        { status: 403 },
      );
    }

    let sentCount = 0;
    for (const referrer of eligibleReferrers) {
      try {
        const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrer.record.irref);
        const portalLink = buildReferrerPortalLink(referrer.record.irref, portalTokenVersion);
        await sendReferrerPortalLinkEmail({
          to: email,
          name: referrer.record.name,
          irref: referrer.record.irref,
          link: portalLink,
        });
        sentCount += 1;
      } catch (error) {
        console.error('Error sending referrer portal link email', {
          email,
          irref: referrer.record.irref,
          error,
        });
      }
    }

    if (sentCount < 1) {
      return NextResponse.json(
        { ok: false, error: 'Unable to send link. Please try again later.' },
        { status: 500 },
      );
    }

    if (sentCount === 1) {
      return NextResponse.json({ ok: true, message: 'Portal access email sent.' });
    }
    return NextResponse.json({
      ok: true,
      message: `Portal access emails sent for ${sentCount} referrer accounts.`,
    });
  } catch (err) {
    console.error('Error sending referrer portal link:', err);
    return NextResponse.json(
      { ok: false, error: 'Unable to send link. Please try again later.' },
      { status: 500 }
    );
  }
}
