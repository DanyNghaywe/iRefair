const { google } = require('googleapis');

const REFERRER_SHEET_NAME = 'Referrers';

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Sheets credentials');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function deduplicateReferrers() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
  }

  const sheets = getSheetsClient();

  console.log('📊 Fetching all referrers...');

  // Get sheet ID first
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = doc.data.sheets?.find((sheet) => sheet.properties?.title === REFERRER_SHEET_NAME);
  const sheetId = targetSheet?.properties?.sheetId;

  if (!sheetId) {
    throw new Error(`Sheet "${REFERRER_SHEET_NAME}" not found`);
  }

  // Get all data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    console.log('✅ No referrers found');
    return;
  }

  const headers = rows[0];
  const emailIndex = headers.indexOf('Email');
  const iRrefIndex = headers.indexOf('iRREF');
  const timestampIndex = headers.indexOf('Timestamp');
  const nameIndex = headers.indexOf('Name');

  if (emailIndex === -1 || iRrefIndex === -1) {
    throw new Error('Required columns not found');
  }

  // Parse all referrer records (skip header row)
  const referrers = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const email = (row[emailIndex] || '').trim().toLowerCase();
    if (!email) continue; // Skip rows without email

    referrers.push({
      rowIndex: i + 1, // 1-indexed for Google Sheets
      iRref: row[iRrefIndex] || '',
      timestamp: row[timestampIndex] || '',
      email,
      name: row[nameIndex] || '',
    });
  }

  console.log(`📋 Found ${referrers.length} referrers`);

  // Group by email
  const emailGroups = new Map();
  for (const referrer of referrers) {
    if (!emailGroups.has(referrer.email)) {
      emailGroups.set(referrer.email, []);
    }
    emailGroups.get(referrer.email).push(referrer);
  }

  // Find duplicates
  const duplicates = [];
  for (const [email, records] of emailGroups) {
    if (records.length > 1) {
      duplicates.push({ email, records });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicate emails found!');
    return;
  }

  console.log(`\n🔍 Found ${duplicates.length} emails with duplicates:\n`);

  // Display duplicates and decide which to keep
  const rowsToDelete = [];
  for (const { email, records } of duplicates) {
    console.log(`📧 Email: ${email}`);
    console.log(`   Found ${records.length} entries:`);

    // Sort by timestamp (most recent first) to keep the oldest one (first registered)
    records.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Keep the first (oldest) record, delete the rest
    const toKeep = records[0];
    const toDelete = records.slice(1);

    console.log(`   ✅ KEEPING: Row ${toKeep.rowIndex} - ${toKeep.iRref} - ${toKeep.name} (${toKeep.timestamp})`);
    for (const record of toDelete) {
      console.log(`   ❌ DELETING: Row ${record.rowIndex} - ${record.iRref} - ${record.name} (${record.timestamp})`);
      rowsToDelete.push(record.rowIndex);
    }
    console.log();
  }

  console.log(`\n🗑️  Total rows to delete: ${rowsToDelete.length}`);

  if (rowsToDelete.length === 0) {
    console.log('✅ Nothing to delete');
    return;
  }

  // Sort in descending order to delete from bottom to top (to preserve row indices)
  rowsToDelete.sort((a, b) => b - a);

  console.log('\n⚠️  Deleting duplicate rows...');

  // Delete rows in batches
  const deleteRequests = rowsToDelete.map((rowIndex) => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIndex - 1, // Convert to 0-indexed
        endIndex: rowIndex, // Exclusive end
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: deleteRequests,
    },
  });

  console.log(`\n✅ Successfully deleted ${rowsToDelete.length} duplicate referrer entries!`);
  console.log(`📊 ${duplicates.length} emails now have unique entries`);
}

// Run the script
deduplicateReferrers()
  .then(() => {
    console.log('\n✨ Deduplication complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
