/**
 * Script to clear all test data from Applicants, Referrers, and Applications sheets.
 * Keeps the header rows intact.
 *
 * Usage: npx tsx scripts/clear-test-data.ts
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
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
      // Remove surrounding quotes if present
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

const SHEETS_TO_CLEAR = ['Applicants', 'Referrers', 'Applications'];

async function main() {
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

  // Get spreadsheet metadata to find sheet IDs
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetMap = new Map<string, number>();
  for (const sheet of doc.data.sheets ?? []) {
    const title = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    if (title && sheetId != null) {
      sheetMap.set(title, sheetId);
    }
  }

  for (const sheetName of SHEETS_TO_CLEAR) {
    const sheetId = sheetMap.get(sheetName);
    if (sheetId === undefined) {
      console.log(`Sheet "${sheetName}" not found, skipping.`);
      continue;
    }

    // Get current row count
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });
    const rowCount = response.data.values?.length ?? 0;

    if (rowCount <= 1) {
      console.log(`Sheet "${sheetName}" has no data rows to clear.`);
      continue;
    }

    // Delete all rows except the header (row 1)
    // We delete from row index 1 (0-indexed, so row 2 in sheets) to the end
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: 1, // Row 2 (0-indexed)
                endIndex: rowCount,
              },
            },
          },
        ],
      },
    });

    console.log(`Cleared ${rowCount - 1} rows from "${sheetName}".`);
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
