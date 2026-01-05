import { NextRequest, NextResponse } from 'next/server';

import {
  findApplicationByRescheduleTokenHash,
  updateApplicationAdmin,
  getReferrerByIrref,
  findApplicantByIdentifier,
} from '@/lib/sheets';
import { hashOpaqueToken, isExpired } from '@/lib/tokens';
import { appendActionHistoryEntry, type ActionLogEntry } from '@/lib/actionHistory';
import { sendMail } from '@/lib/mailer';
import { rescheduleRequestToReferrer } from '@/lib/emailTemplates';
import { formatMeetingDateTime } from '@/lib/timezone';
import { buildReferrerPortalLink, ensureReferrerPortalTokenVersion } from '@/lib/referrerPortalLink';

export const dynamic = 'force-dynamic';

type ProposedTime = {
  date: string;
  time: string;
};

/**
 * GET: Redirect to the new reschedule page
 * This maintains backward compatibility with existing email links
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    // Redirect to reschedule page which will show the error
    return NextResponse.redirect(`${baseUrl}/reschedule`);
  }

  // Redirect to the new React-based reschedule page
  return NextResponse.redirect(`${baseUrl}/reschedule?token=${encodeURIComponent(token)}`);
}

/**
 * POST: Process the reschedule request
 * Accepts JSON body with optional reason and proposedTimes
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing reschedule token.' },
      { status: 400 },
    );
  }

  // Parse request body (JSON)
  let reason = '';
  let proposedTimes: ProposedTime[] = [];

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
      proposedTimes = Array.isArray(body.proposedTimes)
        ? body.proposedTimes
            .filter((t: unknown): t is ProposedTime =>
              typeof t === 'object' &&
              t !== null &&
              typeof (t as ProposedTime).date === 'string' &&
              typeof (t as ProposedTime).time === 'string' &&
              (t as ProposedTime).date.length > 0 &&
              (t as ProposedTime).time.length > 0
            )
            .slice(0, 3) // Max 3 proposed times
        : [];
    }
  } catch {
    // If JSON parsing fails, continue with empty values
  }

  // Hash the token and look up the application
  const tokenHash = hashOpaqueToken(token);
  const application = await findApplicationByRescheduleTokenHash(tokenHash);

  if (!application) {
    return NextResponse.json(
      { success: false, error: 'This reschedule link is invalid or has already been used.' },
      { status: 404 },
    );
  }

  // Check expiry
  if (isExpired(application.record.rescheduleTokenExpiresAt)) {
    return NextResponse.json(
      { success: false, error: 'This reschedule link has expired. Please contact the recruiter directly.' },
      { status: 410 },
    );
  }

  const applicationRecord = application.record;

  // Build notes with reason and proposed times
  let notes = 'Applicant requested to reschedule via email link';
  if (reason) {
    notes += `. Reason: ${reason}`;
  }
  if (proposedTimes.length > 0) {
    const timesStr = proposedTimes
      .map((t, i) => `Option ${i + 1}: ${t.date} at ${t.time}`)
      .join('; ');
    notes += `. Proposed times: ${timesStr}`;
  }

  // Build action history entry
  const actionEntry: ActionLogEntry = {
    action: 'RESCHEDULE_REQUESTED',
    timestamp: new Date().toISOString(),
    performedBy: 'applicant',
    notes,
    meetingDetails: applicationRecord.meetingDate
      ? {
          date: applicationRecord.meetingDate,
          time: applicationRecord.meetingTime || '',
          timezone: applicationRecord.meetingTimezone || '',
          url: applicationRecord.meetingUrl || '',
        }
      : undefined,
    meta: {
      ...(reason ? { reason } : {}),
      ...(proposedTimes.length > 0 ? { proposedTimes: JSON.stringify(proposedTimes) } : {}),
    },
  };

  const updatedActionHistory = appendActionHistoryEntry(applicationRecord.actionHistory, actionEntry);

  // Update application: set status to 'needs reschedule', clear meeting fields and token
  const patch: Record<string, string> = {
    status: 'needs reschedule',
    meetingDate: '',
    meetingTime: '',
    meetingTimezone: '',
    meetingUrl: '',
    rescheduleTokenHash: '',
    rescheduleTokenExpiresAt: '',
    actionHistory: updatedActionHistory,
  };

  await updateApplicationAdmin(application.record.id, patch);

  // Load referrer and applicant for email
  const referrer = applicationRecord.referrerIrref
    ? await getReferrerByIrref(applicationRecord.referrerIrref).catch(() => null)
    : null;

  const applicant = applicationRecord.applicantId
    ? await findApplicantByIdentifier(applicationRecord.applicantId).catch(() => null)
    : null;

  const applicantName = applicant
    ? [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' ').trim()
    : 'The applicant';
  const applicantEmail = applicant?.record?.email || '';

  const referrerEmail = referrer?.record?.email;
  const referrerName = referrer?.record?.name || '';
  const companyName = referrer?.record?.company || '';
  const position = applicationRecord.position || '';

  // Format original meeting datetime for email
  const originalDateTime = formatMeetingDateTime(
    applicationRecord.meetingDate || '',
    applicationRecord.meetingTime || '',
    applicationRecord.meetingTimezone || '',
  );

  // Send email to referrer
  if (referrerEmail && referrer?.record?.irref) {
    try {
      // Generate portal link for referrer
      const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrer.record.irref);
      const portalUrl = buildReferrerPortalLink(referrer.record.irref, portalTokenVersion);

      const template = rescheduleRequestToReferrer({
        referrerName,
        applicantName,
        applicantEmail,
        companyName,
        position,
        applicationId: application.record.id,
        originalDateTime,
        reason,
        proposedTimes,
        portalUrl,
      });

      await sendMail({
        to: referrerEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    } catch (emailError) {
      console.error('Error sending reschedule notification to referrer:', emailError);
      // Continue - don't fail the reschedule request if email fails
    }
  }

  return NextResponse.json({ success: true });
}
