/**
 * Temporary script to rotate a referrer's portal token for testing
 * Usage: node --env-file=.env.local -r tsx/cjs scripts/rotate-referrer-token.ts iRREF000000012
 * Or: npx tsx scripts/rotate-referrer-token.ts iRREF000000012 (if .env.local vars are set)
 */

import {
  REFERRER_PORTAL_TOKEN_VERSION_HEADER,
  REFERRER_SHEET_NAME,
  ensureColumns,
  getReferrerByIrref,
  updateRowById,
} from '../src/lib/sheets';
import { normalizePortalTokenVersion } from '../src/lib/referrerPortalToken';

async function main() {
  const irref = process.argv[2];
  if (!irref) {
    console.error('Usage: npx tsx scripts/rotate-referrer-token.ts <iRREF>');
    process.exit(1);
  }

  console.log(`Rotating portal token for ${irref}...`);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    console.error(`Referrer ${irref} not found`);
    process.exit(1);
  }

  const currentVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  const nextVersion = currentVersion + 1;

  console.log(`Current version: ${currentVersion}`);
  console.log(`Next version: ${nextVersion}`);

  await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PORTAL_TOKEN_VERSION_HEADER]);
  const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
    [REFERRER_PORTAL_TOKEN_VERSION_HEADER]: String(nextVersion),
  });

  if (result.updated) {
    console.log(`✓ Successfully rotated token to version ${nextVersion}`);
    console.log(`All tokens with version ${currentVersion} are now invalid.`);
  } else {
    console.error('Failed to update token version');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
