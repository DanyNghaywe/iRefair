/**
 * Token helpers for generating and hashing opaque tokens
 * used in reschedule and update request flows.
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Create a cryptographically secure opaque token.
 * Returns a 48-character hex string (24 bytes).
 */
export function createOpaqueToken(): string {
  return randomBytes(24).toString('hex');
}

/**
 * Hash an opaque token using SHA-256.
 * Returns a 64-character hex string.
 */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Check if an ISO date string has expired.
 * Returns true if the date is in the past or invalid, false otherwise.
 * Returns true if no date is provided (undefined/empty).
 */
export function isExpired(iso?: string): boolean {
  if (!iso || typeof iso !== 'string') {
    return true;
  }

  const trimmed = iso.trim();
  if (!trimmed) {
    return true;
  }

  const expiresAt = new Date(trimmed);
  if (isNaN(expiresAt.getTime())) {
    return true;
  }

  return expiresAt.getTime() <= Date.now();
}
