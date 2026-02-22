/**
 * Helper functions to generate and email referrer portal magic links.
 * Used by both /api/referrer/portal/link and /api/founder/referrers/[irain]/company-approval.
 */

import { sendMail } from '@/lib/mailer';
import { revokeAllReferrerMobileSessions } from '@/lib/referrerMobileAuth';
import {
  REFERRER_PORTAL_TOKEN_VERSION_HEADER,
  REFERRER_SHEET_NAME,
  ensureColumns,
  getReferrerByIrref,
  updateRowById,
} from '@/lib/sheets';
import { createReferrerToken, normalizePortalTokenVersion } from '@/lib/referrerPortalToken';
import { normalizeHttpUrl } from '@/lib/validation';
import { referrerPortalLink } from '@/lib/emailTemplates';

function isMissingReferrerMobileSessionTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeCode = 'code' in error ? (error as { code?: unknown }).code : null;
  if (maybeCode === 'P2021') return true;

  const maybeMessage = 'message' in error ? (error as { message?: unknown }).message : null;
  if (typeof maybeMessage !== 'string') return false;

  const lowered = maybeMessage.toLowerCase();
  return lowered.includes('referrermobilesession') && lowered.includes('does not exist');
}

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
 * Rotate the referrer's portal token version, invalidating previously issued portal/access tokens.
 */
export async function rotateReferrerPortalTokenVersion(irref: string): Promise<number> {
  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    throw new Error('Referrer not found');
  }

  const currentVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  const nextVersion = currentVersion + 1;

  await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PORTAL_TOKEN_VERSION_HEADER]);
  const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
    [REFERRER_PORTAL_TOKEN_VERSION_HEADER]: String(nextVersion),
  });

  if (!result.updated) {
    throw new Error('Unable to rotate portal token version');
  }

  return nextVersion;
}

/**
 * Invalidate all existing referrer portal access, including mobile refresh sessions.
 */
export async function invalidateReferrerPortalAccess(irref: string): Promise<number> {
  const nextVersion = await rotateReferrerPortalTokenVersion(irref);

  try {
    await revokeAllReferrerMobileSessions(irref);
  } catch (error) {
    // Some environments may not have the mobile session table yet; token version rotation still invalidates stateless sessions.
    if (!isMissingReferrerMobileSessionTable(error)) {
      throw error;
    }
    console.warn('Referrer mobile session table missing while invalidating portal access.', { irref, error });
  }

  return nextVersion;
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
  irref: string;
  link: string;
  locale?: 'en' | 'fr';
};

/**
 * Send the referrer portal link email using the centralized template.
 */
export async function sendReferrerPortalLinkEmail(
  params: SendReferrerPortalLinkEmailParams,
): Promise<void> {
  const { to, name, irref, link, locale = 'en' } = params;

  const template = referrerPortalLink({
    name: name || 'there',
    iRref: irref,
    portalUrl: link,
    locale,
  });

  await sendMail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
