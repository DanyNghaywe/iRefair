import { NextRequest, NextResponse } from 'next/server';

import {
  findApplicantByIdentifier,
  getApplicationById,
  getReferrerByIrref,
  updateApplicationAdmin,
  normalizeStatus,
} from '@/lib/sheets';
import { normalizePortalTokenVersion, verifyReferrerToken } from '@/lib/referrerPortalToken';
import { sendMail } from '@/lib/mailer';
import { getReferrerPortalToken } from '@/lib/referrerPortalAuth';
import { isValidTimezone, formatMeetingDateTime } from '@/lib/timezone';
import { createOpaqueToken, hashOpaqueToken } from '@/lib/tokens';
import { appendActionHistoryEntry, type ActionLogEntry } from '@/lib/actionHistory';
import {
  meetingInviteToApplicant,
  meetingCancelledToApplicant,
  rejectionToApplicant,
  cvMismatchToApplicant,
  cvUpdateRequestToApplicant,
  infoRequestToApplicant,
  interviewCompletedToApplicant,
  jobOfferToApplicant,
  meetingScheduledToReferrer,
  meetingCancelledToReferrer,
} from '@/lib/emailTemplates';
import { normalizeHttpUrl } from '@/lib/validation';
import { escapeHtml } from '@/lib/validation';

export const dynamic = 'force-dynamic';

type FeedbackAction =
  | 'SCHEDULE_MEETING'
  | 'CANCEL_MEETING'
  | 'REJECT'
  | 'RESCIND_REJECTION'
  | 'CV_MISMATCH'
  | 'REQUEST_CV_UPDATE'
  | 'REQUEST_INFO'
  | 'MARK_INTERVIEWED'
  | 'OFFER_JOB';

const VALID_ACTIONS: FeedbackAction[] = [
  'SCHEDULE_MEETING',
  'CANCEL_MEETING',
  'REJECT',
  'RESCIND_REJECTION',
  'CV_MISMATCH',
  'REQUEST_CV_UPDATE',
  'REQUEST_INFO',
  'MARK_INTERVIEWED',
  'OFFER_JOB',
];

type FeedbackPayload = {
  token?: string;
  applicationId?: string;
  action?: string;
  notes?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingTimezone?: string;
  meetingUrl?: string;
  includeUpdateLink?: boolean;
};

function normalizeAction(action: string): FeedbackAction | null {
  const upper = action.trim().toUpperCase().replace(/-/g, '_');
  return VALID_ACTIONS.includes(upper as FeedbackAction) ? (upper as FeedbackAction) : null;
}

function getStatusForAction(action: FeedbackAction): string {
  switch (action) {
    case 'SCHEDULE_MEETING':
      return 'meeting scheduled';
    case 'CANCEL_MEETING':
      return 'new';
    case 'REJECT':
      return 'not a good fit';
    case 'RESCIND_REJECTION':
      return 'new';
    case 'CV_MISMATCH':
      return 'cv mismatch';
    case 'REQUEST_CV_UPDATE':
      return 'cv update requested';
    case 'REQUEST_INFO':
      return 'info requested';
    case 'MARK_INTERVIEWED':
      return 'interviewed';
    case 'OFFER_JOB':
      return 'job offered';
    default:
      return 'new';
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: FeedbackPayload = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const token = getReferrerPortalToken(request, body.token);
  const applicationId = (body.applicationId || '').trim();
  const action = body.action ? normalizeAction(body.action) : null;
  const notes = (body.notes || '').trim();

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing authentication token.' }, { status: 401 });
  }

  if (!applicationId) {
    return NextResponse.json({ ok: false, error: 'Missing applicationId.' }, { status: 400 });
  }

  if (!action) {
    return NextResponse.json(
      { ok: false, error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  // Verify referrer token
  let payload;
  try {
    payload = verifyReferrerToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token.' }, { status: 401 });
  }

  // Load referrer
  const referrer = await getReferrerByIrref(payload.irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found.' }, { status: 404 });
  }

  const expectedVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  if (payload.v !== expectedVersion) {
    return NextResponse.json({ ok: false, error: 'Session expired. Please refresh your portal link.' }, { status: 403 });
  }
  if (referrer.record.archived?.toLowerCase() === 'true') {
    return NextResponse.json(
      { ok: false, error: 'This referrer account has been archived and portal access is no longer available.' },
      { status: 403 },
    );
  }

  // Load application
  const application = await getApplicationById(applicationId);
  if (!application?.record?.applicantId) {
    return NextResponse.json({ ok: false, error: 'Application not found.' }, { status: 404 });
  }

  const applicationRecord = application.record;

  // Verify ownership
  const normalizedPayloadIrref = payload.irref.trim().toLowerCase();
  const normalizedApplicationIrref = (applicationRecord.referrerIrref || '').trim().toLowerCase();
  if (!normalizedApplicationIrref || normalizedApplicationIrref !== normalizedPayloadIrref) {
    return NextResponse.json({ ok: false, error: 'You do not have permission to update this application.' }, { status: 403 });
  }

  // Get normalized current status
  const currentStatus = normalizeStatus(applicationRecord.status);

  // Load applicant
  const applicant = await findApplicantByIdentifier(applicationRecord.applicantId).catch((err) => {
    console.error('[OFFER_JOB] Error loading applicant:', err);
    return null;
  });
  console.log('[OFFER_JOB] Looking up applicantId:', applicationRecord.applicantId);
  console.log('[OFFER_JOB] Applicant found:', !!applicant);
  console.log('[OFFER_JOB] Applicant email:', applicant?.record?.email || '(none)');
  const applicantName = applicant
    ? [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' ').trim()
    : '';
  const applicantEmail = applicant?.record?.email || '';
  const referrerName = referrer.record.name || '';
  const referrerEmail = referrer.record.email || '';
  const companyName = referrer.record.company || '';
  const referrerLocale = referrer.record.locale?.toLowerCase() === 'fr' ? 'fr' : 'en';
  const position = applicationRecord.position || '';

  // Business rule validations
  if (currentStatus === 'job offered') {
    if (action !== 'OFFER_JOB') {
      return NextResponse.json(
        { ok: false, error: 'This application already has a job offer.' },
        { status: 400 },
      );
    }
    // Idempotent OFFER_JOB - just return success
    return NextResponse.json({ ok: true, status: 'job offered' });
  }

  if (currentStatus === 'not a good fit') {
    if (action !== 'RESCIND_REJECTION') {
      return NextResponse.json(
        { ok: false, error: 'This application has already been rejected.' },
        { status: 400 },
      );
    }
  }

  if (currentStatus === 'cv mismatch') {
    if (action !== 'RESCIND_REJECTION') {
      return NextResponse.json(
        { ok: false, error: 'This application has been marked as CV mismatch.' },
        { status: 400 },
      );
    }
  }

  if (action === 'RESCIND_REJECTION' && currentStatus !== 'not a good fit' && currentStatus !== 'cv mismatch') {
    return NextResponse.json(
      { ok: false, error: 'Can only rescind rejection when application is rejected or marked as CV mismatch.' },
      { status: 400 },
    );
  }

  if (action === 'OFFER_JOB' && currentStatus !== 'interviewed') {
    return NextResponse.json(
      { ok: false, error: 'Cannot offer job until the applicant has been interviewed.' },
      { status: 400 },
    );
  }

  if (action === 'CANCEL_MEETING' && currentStatus !== 'meeting scheduled') {
    return NextResponse.json(
      { ok: false, error: 'No meeting is currently scheduled to cancel.' },
      { status: 400 },
    );
  }

  if (action === 'MARK_INTERVIEWED') {
    if (currentStatus !== 'meeting scheduled' && currentStatus !== 'meeting requested') {
      return NextResponse.json(
        { ok: false, error: 'Can only mark as interviewed after a meeting was scheduled or requested.' },
        { status: 400 },
      );
    }
  }

  // Action-specific validations and processing
  const patch: Record<string, string | undefined> = {};
  let opaqueToken: string | undefined;
  let rescheduleToken: string | undefined;
  let updateToken: string | undefined;

  if (action === 'SCHEDULE_MEETING') {
    const meetingDate = (body.meetingDate || '').trim();
    const meetingTime = (body.meetingTime || '').trim();
    const meetingTimezone = (body.meetingTimezone || '').trim();
    const meetingUrl = (body.meetingUrl || '').trim();

    if (!meetingDate || !meetingTime || !meetingTimezone) {
      return NextResponse.json(
        { ok: false, error: 'Meeting date, time, and timezone are required.' },
        { status: 400 },
      );
    }

    if (!isValidTimezone(meetingTimezone)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid timezone. Please select from the provided list.' },
        { status: 400 },
      );
    }

    if (!meetingUrl) {
      return NextResponse.json(
        { ok: false, error: 'Meeting URL is required.' },
        { status: 400 },
      );
    }

    const normalizedMeetingUrl = normalizeHttpUrl(meetingUrl);
    if (!normalizedMeetingUrl || !isValidUrl(normalizedMeetingUrl)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid meeting URL.' },
        { status: 400 },
      );
    }

    // Generate reschedule token
    rescheduleToken = createOpaqueToken();
    const rescheduleHash = hashOpaqueToken(rescheduleToken);
    const rescheduleExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    patch.meetingDate = meetingDate;
    patch.meetingTime = meetingTime;
    patch.meetingTimezone = meetingTimezone;
    patch.meetingUrl = normalizedMeetingUrl;
    patch.rescheduleTokenHash = rescheduleHash;
    patch.rescheduleTokenExpiresAt = rescheduleExpiry;
    // Clear any update request tokens
    patch.updateRequestTokenHash = '';
    patch.updateRequestExpiresAt = '';
    patch.updateRequestPurpose = '';
  }

  if (action === 'CANCEL_MEETING') {
    // Clear meeting fields
    patch.meetingDate = '';
    patch.meetingTime = '';
    patch.meetingTimezone = '';
    patch.meetingUrl = '';
    patch.rescheduleTokenHash = '';
    patch.rescheduleTokenExpiresAt = '';
  }

  // Track if we're cancelling a meeting due to a status change
  let meetingWasCancelled = false;

  if (action === 'REQUEST_CV_UPDATE' || action === 'REQUEST_INFO' || (action === 'CV_MISMATCH' && body.includeUpdateLink)) {
    opaqueToken = createOpaqueToken();
    updateToken = opaqueToken;
    const updateHash = hashOpaqueToken(opaqueToken);
    const updateExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const purpose = action === 'REQUEST_INFO' ? 'info' : 'cv';

    patch.updateRequestTokenHash = updateHash;
    patch.updateRequestExpiresAt = updateExpiry;
    patch.updateRequestPurpose = purpose;

    // If any of these actions occur while meeting is scheduled, cancel the meeting
    if (currentStatus === 'meeting scheduled') {
      patch.meetingDate = '';
      patch.meetingTime = '';
      patch.meetingTimezone = '';
      patch.meetingUrl = '';
      patch.rescheduleTokenHash = '';
      patch.rescheduleTokenExpiresAt = '';
      meetingWasCancelled = true;
    }
  }

  // Track if meeting was cancelled due to rejection or CV mismatch (for referrer email)
  let meetingCancelledDueToRejection = false;

  // If rejecting or marking CV mismatch (without update link) while meeting is scheduled, cancel the meeting
  if (currentStatus === 'meeting scheduled' && (action === 'REJECT' || (action === 'CV_MISMATCH' && !body.includeUpdateLink))) {
    patch.meetingDate = '';
    patch.meetingTime = '';
    patch.meetingTimezone = '';
    patch.meetingUrl = '';
    patch.rescheduleTokenHash = '';
    patch.rescheduleTokenExpiresAt = '';
    meetingCancelledDueToRejection = true;
  }

  // Set new status
  const newStatus = getStatusForAction(action);
  patch.status = newStatus;

  // Build action history entry
  const actionEntry: ActionLogEntry = {
    action,
    timestamp: new Date().toISOString(),
    performedBy: payload.irref,
    performedByEmail: referrerEmail,
    notes: notes || undefined,
  };

  if (action === 'SCHEDULE_MEETING') {
    actionEntry.meetingDetails = {
      date: body.meetingDate || '',
      time: body.meetingTime || '',
      timezone: body.meetingTimezone || '',
      url: patch.meetingUrl || '',
    };
  }

  const updatedActionHistory = appendActionHistoryEntry(applicationRecord.actionHistory, actionEntry);
  patch.actionHistory = updatedActionHistory;

  // Update application
  await updateApplicationAdmin(applicationId, patch);

  // Send emails
  console.log('[OFFER_JOB] About to send email. applicantEmail:', applicantEmail || '(empty)');
  if (applicantEmail) {
    console.log('[OFFER_JOB] Entering email block for action:', action);
    try {
      let template;

      switch (action) {
        case 'SCHEDULE_MEETING':
          template = meetingInviteToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
            meetingDate: body.meetingDate || '',
            meetingTime: body.meetingTime || '',
            meetingTimezone: body.meetingTimezone || '',
            meetingUrl: patch.meetingUrl || '',
            rescheduleToken: rescheduleToken || '',
            applicationId,
          });
          break;

        case 'CANCEL_MEETING':
          template = meetingCancelledToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
            reason: notes,
          });
          break;

        case 'REJECT':
          template = rejectionToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
          });
          break;

        case 'CV_MISMATCH':
          template = cvMismatchToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
            feedback: notes,
            includeUpdateLink: body.includeUpdateLink,
            updateToken,
            applicationId,
            meetingWasCancelled,
          });
          break;

        case 'REQUEST_CV_UPDATE':
          template = cvUpdateRequestToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
            feedback: notes,
            updateToken: updateToken || '',
            applicationId,
            meetingWasCancelled,
          });
          break;

        case 'REQUEST_INFO':
          template = infoRequestToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
            requestedInfo: notes,
            updateToken: updateToken || '',
            applicationId,
            meetingWasCancelled,
          });
          break;

        case 'MARK_INTERVIEWED':
          template = interviewCompletedToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
          });
          break;

        case 'OFFER_JOB':
          template = jobOfferToApplicant({
            applicantName,
            referrerName,
            companyName,
            position,
            message: notes,
          });
          break;
      }

      console.log('[OFFER_JOB] Template created:', !!template, 'Subject:', template?.subject);
      if (template) {
        console.log('[OFFER_JOB] Sending email to:', applicantEmail);
        await sendMail({
          to: applicantEmail,
          replyTo: referrerEmail || undefined,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
        console.log('[OFFER_JOB] Email sent successfully');
      } else {
        console.log('[OFFER_JOB] No template created for action:', action);
      }
    } catch (emailError) {
      console.error('[OFFER_JOB] Error sending applicant email:', emailError);
      // Continue - don't fail the action if email fails
    }
  } else {
    console.log('[OFFER_JOB] Skipping email - no applicant email found');
  }

  // Send confirmation email to referrer for meeting schedule/cancel
  if (referrerEmail) {
    try {
      let referrerTemplate;
      const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://irefair.com'}/referrer/portal`;

      if (action === 'SCHEDULE_MEETING') {
        referrerTemplate = meetingScheduledToReferrer({
          referrerName,
          applicantName,
          companyName,
          position,
          meetingDate: body.meetingDate || '',
          meetingTime: body.meetingTime || '',
          meetingTimezone: body.meetingTimezone || '',
          meetingUrl: patch.meetingUrl,
          portalUrl,
          locale: referrerLocale,
        });
      } else if (action === 'CANCEL_MEETING') {
        referrerTemplate = meetingCancelledToReferrer({
          referrerName,
          applicantName,
          companyName,
          position,
          reason: notes,
          portalUrl,
          locale: referrerLocale,
        });
      } else if (meetingWasCancelled) {
        // Meeting was cancelled due to REQUEST_CV_UPDATE, REQUEST_INFO, or CV_MISMATCH with update link
        const actionDescriptions: Record<string, string> = {
          REQUEST_CV_UPDATE: 'requested a CV update',
          REQUEST_INFO: 'requested additional information',
          CV_MISMATCH: 'marked the CV as a mismatch',
        };
        referrerTemplate = meetingCancelledToReferrer({
          referrerName,
          applicantName,
          companyName,
          position,
          cancelledDueToAction: actionDescriptions[action] || 'changed the application status',
          portalUrl,
          locale: referrerLocale,
        });
      } else if (meetingCancelledDueToRejection) {
        // Meeting was cancelled due to REJECT or CV_MISMATCH without update link
        const actionDescriptions: Record<string, string> = {
          REJECT: 'rejected the application',
          CV_MISMATCH: 'marked the CV as a mismatch',
        };
        referrerTemplate = meetingCancelledToReferrer({
          referrerName,
          applicantName,
          companyName,
          position,
          cancelledDueToAction: actionDescriptions[action] || 'changed the application status',
          portalUrl,
          locale: referrerLocale,
        });
      }

      if (referrerTemplate) {
        await sendMail({
          to: referrerEmail,
          subject: referrerTemplate.subject,
          text: referrerTemplate.text,
          html: referrerTemplate.html,
        });
      }
    } catch (emailError) {
      console.error('Error sending referrer email:', emailError);
      // Continue - don't fail the action if email fails
    }
  }

  // Referral reward notification for OFFER_JOB
  if (action === 'OFFER_JOB') {
    const rewardRecipient =
      process.env.REFERRAL_REWARD_EMAIL || process.env.FOUNDER_EMAIL || process.env.SMTP_FROM_EMAIL;
    if (rewardRecipient) {
      try {
        const safeApplicantId = escapeHtml(applicationRecord.applicantId);
        const safeIrcrn = escapeHtml(applicationRecord.iCrn);
        const safePosition = escapeHtml(position);
        const safeIrref = escapeHtml(referrer.record.irref);
        await sendMail({
          to: rewardRecipient,
          subject: `Referral reward triggered: ${applicationId}`,
          text: `Applicant ${applicationRecord.applicantId} offered job for ${applicationRecord.iCrn} (${position}). Referrer: ${referrer.record.irref}.`,
          html: `Applicant <strong>${safeApplicantId}</strong> offered job for <strong>${safeIrcrn}</strong> (${safePosition}).<br/>Referrer: <strong>${safeIrref}</strong>.`,
        });
      } catch (rewardError) {
        console.error('Error sending reward notification:', rewardError);
      }
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
