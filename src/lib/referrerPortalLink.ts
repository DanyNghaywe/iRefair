/**
 * Helper functions to generate and email referrer portal magic links.
 * Used by both /api/referrer/portal/link and /api/founder/referrers/[irain]/company-approval.
 */

import { sendMail } from '@/lib/mailer';
import {
  REFERRER_PORTAL_TOKEN_VERSION_HEADER,
  REFERRER_SHEET_NAME,
  ensureColumns,
  getReferrerByIrref,
  updateRowById,
} from '@/lib/sheets';
import { createReferrerToken, normalizePortalTokenVersion } from '@/lib/referrerPortalToken';
import { jobOpeningsUrl } from '@/lib/urls';
import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';

/**
 * Get the application base URL from environment variables.
 * Returns absolute URL with https:// if missing.
 */
export function getAppBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_URL;
  if (!base) return 'http://localhost:3000';
  return base.startsWith('http') ? base : `https://${base}`;
}

/**
 * Ensure the referrer has a valid portal token version stored in the sheet.
 * If missing or mismatched, updates the sheet and returns the normalized version.
 */
export async function ensureReferrerPortalTokenVersion(irref: string): Promise<number> {
  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    throw new Error('Referrer not found');
  }

  const storedVersionRaw = referrer.record.portalTokenVersion?.trim() || '';
  const portalTokenVersion = normalizePortalTokenVersion(storedVersionRaw);

  if (!storedVersionRaw || String(portalTokenVersion) !== storedVersionRaw) {
    await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PORTAL_TOKEN_VERSION_HEADER]);
    await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
      [REFERRER_PORTAL_TOKEN_VERSION_HEADER]: String(portalTokenVersion),
    });
  }

  return portalTokenVersion;
}

/**
 * Build the referrer portal link URL with the token.
 * Throws if the resulting URL is invalid.
 */
export function buildReferrerPortalLink(irref: string, version: number): string {
  const token = createReferrerToken(irref, version);
  const portalLinkRaw = `${getAppBaseUrl()}/referrer/portal?token=${encodeURIComponent(token)}`;
  const portalLink = normalizeHttpUrl(portalLinkRaw);
  if (!portalLink) {
    throw new Error('Invalid portal link URL');
  }
  return portalLink;
}

export type SendReferrerPortalLinkEmailParams = {
  to: string;
  name?: string;
  link: string;
  openingsUrl?: string;
};

/**
 * Send the referrer portal link email.
 */
export async function sendReferrerPortalLinkEmail(
  params: SendReferrerPortalLinkEmailParams,
): Promise<void> {
  const { to, name, link } = params;
  const openingsLink = normalizeHttpUrl(params.openingsUrl || jobOpeningsUrl);

  const safeName = escapeHtml(name || 'there');
  const safePortalLink = escapeHtml(link);
  const safeOpeningsLink = openingsLink ? escapeHtml(openingsLink) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iRefair</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 800; color: #0f172a;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #3d8bfd; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                iRefair
              </span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                <tr>
                  <td style="padding: 32px 28px;">
                    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a;">Your Referrer Portal</h1>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px;">Access your candidates and applications</p>

                    <p style="margin: 0 0 16px 0; color: #0f172a; font-size: 15px; line-height: 1.6;">Hi ${safeName},</p>
                    <p style="margin: 0 0 24px 0; color: #0f172a; font-size: 15px; line-height: 1.6;">
                      Here is your iRefair referrer portal link. It lets you view your candidates, CVs, statuses, and send feedback.
                    </p>

                    <p style="margin: 0 0 24px 0; text-align: center;">
                      <a href="${safePortalLink}" target="_blank" style="display: inline-block; padding: 14px 24px; border-radius: 10px; background: #3d8bfd; color: #ffffff; font-weight: 700; text-decoration: none;">Open Your Portal</a>
                    </p>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

                    <div style="background: #f8fafc; padding: 16px; border-radius: 10px;">
                      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">If the button doesn't work, copy and paste this URL:</p>
                      <p style="margin: 0; color: #0f172a; font-size: 13px; word-break: break-all;">${safePortalLink}</p>
                    </div>

                    ${safeOpeningsLink ? `
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                    <p style="margin: 0; color: #64748b; font-size: 14px;">
                      Current openings: <a href="${safeOpeningsLink}" style="color: #3d8bfd;">${safeOpeningsLink}</a>
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 13px;">
                Sent by <strong style="color: #0f172a;">iRefair</strong> · Connecting talent with opportunity
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${name || 'there'},

Here is your iRefair referrer portal link:
${link}

You can view your candidates, CVs, statuses, and send feedback (A–G).

Openings: ${openingsLink || 'Not provided yet'}
`;

  await sendMail({
    to,
    subject: 'Your iRefair referrer portal link',
    html,
    text,
  });
}
