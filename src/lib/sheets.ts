import { google } from 'googleapis';
import { randomUUID } from 'crypto';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

type SubmissionPrefix = 'CAND' | 'REF';

const CANDIDATE_HEADERS = [
  'ID',
  'Timestamp',
  'First Name',
  'Middle Name',
  'Family Name',
  'Email',
  'Phone',
  'Located in Canada',
  'Province',
  'Work Authorization',
  'Country of Origin',
  'Languages',
  'Languages Other',
  'Industry Type',
  'Industry Other',
  'Employment Status',
];
const CANDIDATE_SHEET_NAME = 'Candidates';
const CANDIDATE_EMAIL_COLUMN_INDEX = 5; // zero-based (Column F)

type CandidateRow = {
  id: string;
  firstName: string;
  middleName: string;
  familyName: string;
  email: string;
  phone: string;
  locatedCanada: string;
  province: string;
  authorizedCanada: string;
  countryOfOrigin: string;
  languages: string;
  languagesOther: string;
  industryType: string;
  industryOther: string;
  employmentStatus: string;
};

type ReferrerRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIndustry: string;
  companyIndustryOther: string;
  workType: string;
  targetRoles: string;
  regions: string;
  referralType: string;
  monthlySlots: string;
  constraints: string;
};

let sheetsClient: ReturnType<typeof google.sheets> | null = null;
const headersInitialized = new Set<string>();
const SHEET_BY_PREFIX: Record<SubmissionPrefix, string> = {
  CAND: 'Candidates',
  REF: 'Referrers',
};

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Sheets credentials. Please set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: SCOPES,
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function ensureHeaders(sheetName: string, headers: string[]) {
  if (headersInitialized.has(sheetName)) return;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }
  const sheets = getSheetsClient();
  try {
    const doc = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = doc.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);
    if (!exists) {
      throw new Error(
        `Sheet "${sheetName}" was not found in spreadsheet ${spreadsheetId}. Please create a tab named "${sheetName}" (case-sensitive).`,
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to access Google Sheet. Check GOOGLE_SHEETS_SPREADSHEET_ID and share the sheet with the service account. Original error: ${message}`,
    );
  }
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const firstRow = current.data.values?.[0] ?? [];
  if (!firstRow.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!1:1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }
  headersInitialized.add(sheetName);
}

async function appendRow(sheetName: string, values: (string | number | null)[]) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values.map((value) => (value === undefined || value === null ? '' : value))],
    },
  });
}

function buildSubmissionId(prefix: SubmissionPrefix) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const unique = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `${prefix}-${date}-${unique}`;
}

async function fetchExistingSubmissionIds(prefix: SubmissionPrefix) {
  const sheetName = SHEET_BY_PREFIX[prefix];
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const sheets = getSheetsClient();
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      majorDimension: 'COLUMNS',
    });
    const firstColumn = existing.data.values?.[0] ?? [];
    return new Set(
      firstColumn
        .map((value) => String(value).trim())
        .filter((value) => value.toUpperCase().startsWith(`${prefix}-`)),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to verify submission ID uniqueness for sheet "${sheetName}". Original error: ${message}`,
    );
  }
}

export async function generateSubmissionId(prefix: SubmissionPrefix) {
  const existingIds = await fetchExistingSubmissionIds(prefix);

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = buildSubmissionId(prefix);
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('Unable to generate unique submission ID after multiple attempts.');
}

export async function appendCandidateRow(row: CandidateRow) {
  await upsertCandidateRow(row);
}

export async function appendReferrerRow(row: ReferrerRow) {
  await ensureHeaders('Referrers', [
    'ID',
    'Timestamp',
    'Name',
    'Email',
    'Phone',
    'Country',
    'Company',
    'Company Industry',
    'Company Industry Other',
    'Work Type',
    'Target Roles',
    'Regions',
    'Referral Type',
    'Monthly Slots',
    'Constraints',
  ]);

  const timestamp = new Date().toISOString();
  await appendRow('Referrers', [
    row.id,
    timestamp,
    row.name,
    row.email,
    row.phone,
    row.country,
    row.company,
    row.companyIndustry,
    row.companyIndustryOther,
    row.workType,
    row.targetRoles,
    row.regions,
    row.referralType,
    row.monthlySlots,
    row.constraints,
  ]);
}

function buildCandidateRowValues(row: CandidateRow, id: string, timestamp: string) {
  return [
    id,
    timestamp,
    row.firstName,
    row.middleName,
    row.familyName,
    row.email,
    row.phone,
    row.locatedCanada,
    row.province,
    row.authorizedCanada,
    row.countryOfOrigin,
    row.languages,
    row.languagesOther,
    row.industryType,
    row.industryOther,
    row.employmentStatus,
  ];
}

async function findCandidateRowByEmail(email: string) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const sheets = getSheetsClient();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANDIDATE_SHEET_NAME}!A:P`,
    majorDimension: 'ROWS',
  });

  const rows = existing.data.values ?? [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const rowEmail = String(row[CANDIDATE_EMAIL_COLUMN_INDEX] ?? '').trim().toLowerCase();
    if (rowEmail && rowEmail === normalizedEmail) {
      return {
        rowIndex: index + 1, // 1-based for Google Sheets
        id: String(row[0] ?? '').trim(),
      };
    }
  }

  return null;
}

export async function upsertCandidateRow(row: CandidateRow) {
  await ensureHeaders(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const sheets = getSheetsClient();
  const timestamp = new Date().toISOString();
  const existing = await findCandidateRowByEmail(row.email);

  if (existing) {
    const idToUse = existing.id || row.id;
    const range = `${CANDIDATE_SHEET_NAME}!A${existing.rowIndex}:P${existing.rowIndex}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [buildCandidateRowValues(row, idToUse, timestamp)] },
    });

    return { id: idToUse, wasUpdated: true };
  }

  await appendRow(CANDIDATE_SHEET_NAME, buildCandidateRowValues(row, row.id, timestamp));
  return { id: row.id, wasUpdated: false };
}
