/**
 * Remove legacy OFFER_JOB entries from Applications -> Action History.
 *
 * Usage:
 *   npx tsx scripts/remove-offer-job-history.ts --apply
 *   npx tsx scripts/remove-offer-job-history.ts --dry-run
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      let value = trimmed.slice(eqIndex + 1);
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found, continue with existing env vars
  }
}

loadEnv();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_NAME = 'Applications';
const TARGET_ACTION = 'OFFER_JOB';

function toColumnLetter(index: number) {
  let n = index;
  let letters = '';
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const dryRun = process.argv.includes('--dry-run');

  if (!apply && !dryRun) {
    console.log('No mode provided. Use --apply to write changes or --dry-run to preview.');
    process.exit(1);
  }

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing Google Sheets credentials. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY.',
    );
  }
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_NAME,
  });

  const rows = response.data.values ?? [];
  if (rows.length <= 1) {
    console.log('No application rows found.');
    return;
  }

  const headers = rows[0].map((cell) => String(cell || '').trim());
  const actionHistoryIndex = headers.findIndex((value) => value.toLowerCase() === 'action history');
  const idIndex = headers.findIndex((value) => value.toLowerCase() === 'id');

  if (actionHistoryIndex === -1) {
    throw new Error('Action History column not found.');
  }

  const updates: { range: string; values: string[][] }[] = [];
  let touchedRows = 0;
  let removedEntries = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const actionRaw = String(row[actionHistoryIndex] || '').trim();
    if (!actionRaw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(actionRaw);
    } catch {
      const rowId = idIndex !== -1 ? String(row[idIndex] || '').trim() : `row ${i + 1}`;
      console.log(`Skipping ${rowId}: Action History is not valid JSON.`);
      continue;
    }

    if (!Array.isArray(parsed)) continue;
    const originalLength = parsed.length;
    const filtered = parsed.filter(
      (entry) => !entry || typeof entry !== 'object' || (entry as { action?: string }).action !== TARGET_ACTION,
    );

    if (filtered.length === originalLength) continue;

    touchedRows += 1;
    removedEntries += originalLength - filtered.length;

    if (apply) {
      const colLetter = toColumnLetter(actionHistoryIndex);
      const rowNumber = i + 1;
      const range = `${SHEET_NAME}!${colLetter}${rowNumber}`;
      updates.push({
        range,
        values: [[JSON.stringify(filtered)]],
      });
    }
  }

  console.log(`Found ${touchedRows} rows with ${TARGET_ACTION} entries (${removedEntries} entries total).`);

  if (!apply) {
    console.log('Dry run only. No changes written.');
    return;
  }

  if (updates.length === 0) {
    console.log('No updates to apply.');
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates,
    },
  });

  console.log(`Updated ${updates.length} rows.`);
}

main().catch((error) => {
  console.error('Failed to remove OFFER_JOB action history:', error);
  process.exit(1);
});
