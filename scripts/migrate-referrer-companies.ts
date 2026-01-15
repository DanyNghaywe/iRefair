/**
 * Migration script to populate the Referrer Companies sheet from existing referrer data.
 *
 * This script:
 * 1. Reads all existing referrers with company data from the Referrers sheet
 * 2. Creates corresponding Referrer Companies records
 * 3. Updates applications with Referrer Company ID based on matching iRCRN
 *
 * Usage: npx tsx scripts/migrate-referrer-companies.ts
 *
 * Options:
 *   --dry-run    Preview changes without writing to sheets
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

const REFERRERS_SHEET = 'Referrers';
const REFERRER_COMPANIES_SHEET = 'Referrer Companies';
const APPLICATIONS_SHEET = 'Applications';

const REFERRER_COMPANIES_HEADERS = [
  'ID',
  'Timestamp',
  'Referrer iRREF',
  'Company Name',
  'Company iRCRN',
  'Company Approval',
  'Company Industry',
  'Careers Portal',
  'Work Type',
  'Archived',
  'ArchivedAt',
  'ArchivedBy',
];

// Generate a unique company ID
function generateCompanyId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `RCMP-${timestamp}-${random}`;
}

// Helper to get value by header name
function getValueByHeader(headers: string[], row: string[], headerName: string): string {
  const index = headers.findIndex((h) => h.toLowerCase() === headerName.toLowerCase());
  return index !== -1 && row[index] ? row[index] : '';
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('=== DRY RUN MODE - No changes will be made ===\n');
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

  // Step 1: Check if Referrer Companies sheet exists
  console.log('Checking for Referrer Companies sheet...');
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = doc.data.sheets?.map((s) => s.properties?.title) || [];

  if (!existingSheets.includes(REFERRER_COMPANIES_SHEET)) {
    console.log('Creating Referrer Companies sheet...');
    if (!isDryRun) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: REFERRER_COMPANIES_SHEET,
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${REFERRER_COMPANIES_SHEET}'!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [REFERRER_COMPANIES_HEADERS],
        },
      });
    }
    console.log('Created Referrer Companies sheet with headers.');
  } else {
    console.log('Referrer Companies sheet already exists.');
  }

  // Step 2: Read existing Referrer Companies to avoid duplicates
  console.log('\nReading existing Referrer Companies...');
  let existingCompanies: string[][] = [];
  let existingCompanyHeaders: string[] = [];
  try {
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${REFERRER_COMPANIES_SHEET}'!A:Z`,
    });
    const values = existingData.data.values || [];
    if (values.length > 0) {
      existingCompanyHeaders = values[0];
      existingCompanies = values.slice(1);
    }
  } catch {
    // Sheet might be empty
  }

  // Build a set of existing (referrerIrref, companyName) pairs to avoid duplicates
  const existingPairs = new Set<string>();
  for (const row of existingCompanies) {
    const irref = getValueByHeader(existingCompanyHeaders, row, 'Referrer iRREF');
    const name = getValueByHeader(existingCompanyHeaders, row, 'Company Name');
    if (irref && name) {
      existingPairs.add(`${irref.toLowerCase()}::${name.toLowerCase()}`);
    }
  }
  console.log(`Found ${existingCompanies.length} existing company records.`);

  // Step 3: Read all referrers
  console.log('\nReading Referrers sheet...');
  const referrersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRERS_SHEET}!A:Z`,
  });
  const referrersData = referrersResponse.data.values || [];

  if (referrersData.length <= 1) {
    console.log('No referrers found. Nothing to migrate.');
    return;
  }

  const referrerHeaders = referrersData[0];
  const referrerRows = referrersData.slice(1);
  console.log(`Found ${referrerRows.length} referrers to process.`);

  // Step 4: Build migration data
  const newCompanyRows: string[][] = [];
  const ircrnToCompanyId = new Map<string, string>();

  for (const row of referrerRows) {
    const irref = getValueByHeader(referrerHeaders, row, 'iRREF');
    const companyName = getValueByHeader(referrerHeaders, row, 'Company');
    const companyIrcrn = getValueByHeader(referrerHeaders, row, 'Company iRCRN');
    const companyApproval = getValueByHeader(referrerHeaders, row, 'Company Approval');
    const companyIndustry = getValueByHeader(referrerHeaders, row, 'Company Industry');
    const careersPortal = getValueByHeader(referrerHeaders, row, 'Careers Portal');
    const workType = getValueByHeader(referrerHeaders, row, 'Work Type');
    const archived = getValueByHeader(referrerHeaders, row, 'Archived');

    // Skip referrers without company data
    if (!irref || !companyName) {
      continue;
    }

    // Skip if this pair already exists
    const pairKey = `${irref.toLowerCase()}::${companyName.toLowerCase()}`;
    if (existingPairs.has(pairKey)) {
      // Map the existing iRCRN if we have one
      if (companyIrcrn) {
        const existingRow = existingCompanies.find(
          (r) =>
            getValueByHeader(existingCompanyHeaders, r, 'Referrer iRREF').toLowerCase() === irref.toLowerCase() &&
            getValueByHeader(existingCompanyHeaders, r, 'Company Name').toLowerCase() === companyName.toLowerCase(),
        );
        if (existingRow) {
          const existingId = getValueByHeader(existingCompanyHeaders, existingRow, 'ID');
          if (existingId && companyIrcrn) {
            ircrnToCompanyId.set(companyIrcrn, existingId);
          }
        }
      }
      continue;
    }

    // Create a new company record
    const companyId = generateCompanyId();
    const timestamp = new Date().toISOString();

    newCompanyRows.push([
      companyId,
      timestamp,
      irref,
      companyName,
      companyIrcrn || '',
      companyApproval || 'pending',
      companyIndustry || '',
      careersPortal || '',
      workType || '',
      archived || '',
      '', // ArchivedAt
      '', // ArchivedBy
    ]);

    // Track iRCRN to company ID mapping for updating applications
    if (companyIrcrn) {
      ircrnToCompanyId.set(companyIrcrn, companyId);
    }
  }

  console.log(`\nWill create ${newCompanyRows.length} new company records.`);

  if (newCompanyRows.length > 0) {
    console.log('\nSample company records to create:');
    for (const row of newCompanyRows.slice(0, 5)) {
      console.log(`  - ${row[3]} (${row[2]}) - iRCRN: ${row[4] || 'none'} - Status: ${row[5]}`);
    }
    if (newCompanyRows.length > 5) {
      console.log(`  ... and ${newCompanyRows.length - 5} more`);
    }
  }

  // Step 5: Append new company rows
  if (!isDryRun && newCompanyRows.length > 0) {
    console.log('\nAppending company records...');
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${REFERRER_COMPANIES_SHEET}'!A:L`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: newCompanyRows,
      },
    });
    console.log(`Created ${newCompanyRows.length} company records.`);
  }

  // Step 6: Update applications with Referrer Company ID
  console.log('\nReading Applications sheet...');
  const appsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATIONS_SHEET}!A:Z`,
  });
  const appsData = appsResponse.data.values || [];

  if (appsData.length <= 1) {
    console.log('No applications found. Nothing to update.');
    return;
  }

  const appHeaders = appsData[0];

  // Check if Referrer Company ID column exists
  let companyIdColIndex = appHeaders.findIndex(
    (h) => h.toLowerCase() === 'referrer company id',
  );

  if (companyIdColIndex === -1) {
    // Add the column
    console.log('Adding Referrer Company ID column to Applications sheet...');
    if (!isDryRun) {
      appHeaders.push('Referrer Company ID');
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${APPLICATIONS_SHEET}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [appHeaders],
        },
      });
    }
    companyIdColIndex = appHeaders.length - 1;
  }

  const appRows = appsData.slice(1);
  const ircrnColIndex = appHeaders.findIndex((h) => h.toLowerCase() === 'ircrn');

  let updatedCount = 0;
  const updates: { row: number; companyId: string }[] = [];

  for (let i = 0; i < appRows.length; i++) {
    const row = appRows[i];
    const icrn = ircrnColIndex !== -1 ? row[ircrnColIndex] || '' : '';
    const existingCompanyId = row[companyIdColIndex] || '';

    if (icrn && !existingCompanyId && ircrnToCompanyId.has(icrn)) {
      const companyId = ircrnToCompanyId.get(icrn)!;
      updates.push({ row: i + 2, companyId }); // +2 for header and 1-indexing
      updatedCount++;
    }
  }

  console.log(`Found ${updatedCount} applications to update with company IDs.`);

  if (!isDryRun && updates.length > 0) {
    console.log('Updating applications...');

    // Batch update for efficiency
    const colLetter = String.fromCharCode(65 + companyIdColIndex); // A=65
    const batchData = updates.map((u) => ({
      range: `${APPLICATIONS_SHEET}!${colLetter}${u.row}`,
      values: [[u.companyId]],
    }));

    // Process in batches of 100
    for (let i = 0; i < batchData.length; i += 100) {
      const batch = batchData.slice(i, i + 100);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: batch,
        },
      });
      console.log(`  Updated ${Math.min(i + 100, batchData.length)} / ${batchData.length} applications...`);
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Company records created: ${isDryRun ? `${newCompanyRows.length} (dry run)` : newCompanyRows.length}`);
  console.log(`Applications updated: ${isDryRun ? `${updatedCount} (dry run)` : updatedCount}`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
