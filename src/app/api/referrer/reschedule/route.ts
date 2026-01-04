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

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - iRefair</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    }
    .icon.warning { background: #fef3c7; }
    .icon.success { background: #d1fae5; }
    .icon.error { background: #fee2e2; }
    h1 {
      font-size: 24px;
      color: #1f2937;
      margin-bottom: 12px;
    }
    p {
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .details {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .details strong {
      color: #374151;
    }
    .btn {
      display: inline-block;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #4f46e5;
      color: white;
    }
    .btn-primary:hover {
      background: #4338ca;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
      margin-left: 12px;
    }
    .btn-secondary:hover {
      background: #d1d5db;
    }
    .buttons {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    form { display: inline; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response(
      htmlPage(
        'Invalid Link',
        `<div class="icon error">❌</div>
        <h1>Invalid Link</h1>
        <p>This reschedule link is missing required information. Please use the link from your email.</p>`,
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Hash the token and look up the application
  const tokenHash = hashOpaqueToken(token);
  const application = await findApplicationByRescheduleTokenHash(tokenHash);

  if (!application) {
    return new Response(
      htmlPage(
        'Link Not Found',
        `<div class="icon error">❌</div>
        <h1>Link Not Found</h1>
        <p>This reschedule link is invalid or has already been used. Please contact the recruiter if you need to reschedule.</p>`,
      ),
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Check expiry
  if (isExpired(application.record.rescheduleTokenExpiresAt)) {
    return new Response(
      htmlPage(
        'Link Expired',
        `<div class="icon error">❌</div>
        <h1>Link Expired</h1>
        <p>This reschedule link has expired. Please contact the recruiter directly to reschedule your meeting.</p>`,
      ),
      { status: 410, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Get meeting details for display
  const meetingDate = application.record.meetingDate || '';
  const meetingTime = application.record.meetingTime || '';
  const meetingTimezone = application.record.meetingTimezone || '';
  const position = application.record.position || 'the position';

  const meetingInfo = meetingDate && meetingTime
    ? `<div class="details">
        <p><strong>Current Meeting:</strong><br/>
        ${meetingDate} at ${meetingTime} (${meetingTimezone || 'TBD'})</p>
        <p><strong>Position:</strong> ${position}</p>
      </div>`
    : `<div class="details">
        <p><strong>Position:</strong> ${position}</p>
      </div>`;

  return new Response(
    htmlPage(
      'Request Reschedule',
      `<div class="icon warning">📅</div>
      <h1>Request to Reschedule</h1>
      <p>Would you like to request a new meeting time? The recruiter will be notified and will reach out with alternative options.</p>
      ${meetingInfo}
      <div class="buttons">
        <form method="POST" action="/api/referrer/reschedule?token=${encodeURIComponent(token)}">
          <button type="submit" class="btn btn-primary">Yes, Request Reschedule</button>
        </form>
        <a href="javascript:window.close()" class="btn btn-secondary">Cancel</a>
      </div>`,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response(
      htmlPage(
        'Invalid Request',
        `<div class="icon error">❌</div>
        <h1>Invalid Request</h1>
        <p>Missing reschedule token.</p>`,
      ),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Hash the token and look up the application
  const tokenHash = hashOpaqueToken(token);
  const application = await findApplicationByRescheduleTokenHash(tokenHash);

  if (!application) {
    return new Response(
      htmlPage(
        'Link Not Found',
        `<div class="icon error">❌</div>
        <h1>Link Not Found</h1>
        <p>This reschedule link is invalid or has already been used.</p>`,
      ),
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    );
  }

  // Check expiry
  if (isExpired(application.record.rescheduleTokenExpiresAt)) {
    return new Response(
      htmlPage(
        'Link Expired',
        `<div class="icon error">❌</div>
        <h1>Link Expired</h1>
        <p>This reschedule link has expired. Please contact the recruiter directly.</p>`,
      ),
      { status: 410, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const applicationRecord = application.record;

  // Build action history entry
  const actionEntry: ActionLogEntry = {
    action: 'RESCHEDULE_REQUESTED',
    timestamp: new Date().toISOString(),
    performedBy: 'applicant',
    notes: 'Applicant requested to reschedule via email link',
    meetingDetails: applicationRecord.meetingDate
      ? {
          date: applicationRecord.meetingDate,
          time: applicationRecord.meetingTime || '',
          timezone: applicationRecord.meetingTimezone || '',
          url: applicationRecord.meetingUrl || '',
        }
      : undefined,
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

  return new Response(
    htmlPage(
      'Reschedule Requested',
      `<div class="icon success">✓</div>
      <h1>Reschedule Requested</h1>
      <p>Your request has been submitted successfully. The recruiter has been notified and will reach out with new meeting options.</p>
      <p style="margin-top: 16px; font-size: 14px; color: #9ca3af;">You can close this window.</p>`,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}
