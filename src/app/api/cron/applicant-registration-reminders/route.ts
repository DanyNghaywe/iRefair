import { NextRequest, NextResponse } from 'next/server';

import { requireCronAuth } from '@/lib/cronAuth';
import { sendMail } from '@/lib/mailer';
import { applicantRegistrationReminder } from '@/lib/emailTemplates';
import {
  APPLICANT_REMINDER_TOKEN_HASH_HEADER,
  APPLICANT_REMINDER_SENT_AT_HEADER,
  APPLICANT_SHEET_NAME,
  ensureColumns,
  findApplicantsNeedingRegistrationReminder,
  updateRowById,
} from '@/lib/sheets';
import { createApplicantUpdateToken, hashToken } from '@/lib/applicantUpdateToken';

export const dynamic = 'force-dynamic';

const baseFromEnv =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL;
const appBaseUrl =
  baseFromEnv && baseFromEnv.startsWith('http') ? baseFromEnv : baseFromEnv ? `https://${baseFromEnv}` : 'https://irefair.com';

export async function GET(request: NextRequest) {
  const authResponse = requireCronAuth(request);
  if (authResponse) return authResponse;

  try {
    // Ensure columns exist
    await ensureColumns(APPLICANT_SHEET_NAME, [
      APPLICANT_REMINDER_TOKEN_HASH_HEADER,
      APPLICANT_REMINDER_SENT_AT_HEADER,
    ]);

    // Find all applicants who need a reminder
    const candidates = await findApplicantsNeedingRegistrationReminder();

    let sent = 0;
    let errors = 0;

    for (const candidate of candidates) {
      let reminderStored = false;
      try {
        // Parse the original expiry date from the stored ISO string
        const expiresAtMs = Date.parse(candidate.updateTokenExpiresAt);
        if (Number.isNaN(expiresAtMs)) {
          console.error(`Invalid expiry for ${candidate.irain}: ${candidate.updateTokenExpiresAt}`);
          errors++;
          continue;
        }

        // Create new reminder token with the SAME expiry as the original token
        const expSeconds = Math.floor(expiresAtMs / 1000);
        const reminderToken = createApplicantUpdateToken({
          email: candidate.email,
          rowIndex: 0, // Not used for lookup - we use email
          exp: expSeconds,
          locale: candidate.locale,
        });
        const reminderTokenHash = hashToken(reminderToken);

        // Update the applicant row with reminder token and sent timestamp
        const reminderSentAt = new Date().toISOString();
        const updateResult = await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', candidate.irain, {
          [APPLICANT_REMINDER_TOKEN_HASH_HEADER]: reminderTokenHash,
          [APPLICANT_REMINDER_SENT_AT_HEADER]: reminderSentAt,
        });

        if (!updateResult.updated) {
          console.error(`Failed to update reminder fields for ${candidate.irain}`);
          errors++;
          continue;
        }
        reminderStored = true;

        // Build confirmation URL with the reminder token
        const confirmUrl = new URL('/api/applicant/confirm-registration', appBaseUrl);
        confirmUrl.searchParams.set('token', reminderToken);

        // Format expiry date for display
        const expiryDate = new Date(expiresAtMs);
        const formattedExpiry = expiryDate.toLocaleDateString(candidate.locale === 'fr' ? 'fr-CA' : 'en-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Send reminder email
        const emailTemplate = applicantRegistrationReminder({
          firstName: candidate.firstName,
          confirmUrl: confirmUrl.toString(),
          expiresAt: formattedExpiry,
          locale: candidate.locale,
        });

        await sendMail({
          to: candidate.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        sent++;
      } catch (err) {
        console.error(`Error sending reminder for ${candidate.irain}:`, err);
        errors++;
        if (reminderStored) {
          const rollback = await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', candidate.irain, {
            [APPLICANT_REMINDER_TOKEN_HASH_HEADER]: '',
            [APPLICANT_REMINDER_SENT_AT_HEADER]: '',
          });
          if (!rollback.updated) {
            console.error(`Failed to clear reminder fields for ${candidate.irain} after send failure`);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      errors,
      total: candidates.length,
    });
  } catch (error) {
    console.error('Error sending registration reminders:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to send reminders' },
      { status: 500 },
    );
  }
}
