import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

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
  } catch (error: any) {
    throw new Error(
      `Unable to access Google Sheet. Check GOOGLE_SHEETS_SPREADSHEET_ID and share the sheet with the service account. Original error: ${error?.message ?? error}`,
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

export function generateSubmissionId(prefix: 'CAND' | 'REF') {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

export async function appendCandidateRow(row: CandidateRow) {
  await ensureHeaders('Candidates', [
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
  ]);

  const timestamp = new Date().toISOString();
  await appendRow('Candidates', [
    row.id,
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
  ]);
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
