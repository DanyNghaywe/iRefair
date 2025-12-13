import { companies } from '@/lib/hiringCompanies';
import { google } from 'googleapis';
import { randomUUID } from 'crypto';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

type SubmissionPrefix = 'CAND' | 'REF' | 'APP';
export const LEGACY_CANDIDATE_ID_HEADER = 'Legacy Candidate ID';

export const CANDIDATE_HEADERS = [
  'iRAIN',
  'Timestamp',
  'First Name',
  'Middle Name',
  'Family Name',
  'Email',
  'Phone',
  'Located in Canada',
  'Province',
  'Work Authorization',
  'Eligible to Move (6 Months)',
  'Country of Origin',
  'Languages',
  'Languages Other',
  'Industry Type',
  'Industry Other',
  'Employment Status',
  LEGACY_CANDIDATE_ID_HEADER,
];
export const CANDIDATE_SHEET_NAME = 'Candidates';
const CANDIDATE_EMAIL_COLUMN_INDEX = 5; // zero-based (Column F)
const LEGACY_CANDIDATE_ID_COLUMN_INDEX = CANDIDATE_HEADERS.length - 1;
export const REFERRER_SHEET_NAME = 'Referrers';
export const REFERRER_HEADERS = [
  'iRAIN',
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'Country',
  'Company',
  'Company Industry',
  'Work Type',
  'LinkedIn',
];

const IRCRN_REGEX = /^iRCRN(\d{10})$/i;
const IRAIN_REGEX = /^iRAIN(\d{10})$/i;
const REFERRER_LEGACY_PREFIX = 'Referrers_Legacy_';

export function isIrain(value: string) {
  return IRAIN_REGEX.test(value.trim());
}

export function isLegacyCandidateId(value: string) {
  return /^CAND-/i.test(value.trim());
}

function toColumnLetter(index: number) {
  let n = index;
  let letters = '';
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

const CANDIDATE_LAST_COLUMN_LETTER = toColumnLetter(CANDIDATE_HEADERS.length - 1);
const LEGACY_CANDIDATE_ID_COLUMN_LETTER = toColumnLetter(LEGACY_CANDIDATE_ID_COLUMN_INDEX);

function formatIrainNumber(value: number) {
  return `iRAIN${String(value).padStart(10, '0')}`;
}

export async function applyProSheetFormatting(sheetName: string, headers: string[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const sheets = getSheetsClient();
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = doc.data.sheets?.find((sheet) => sheet.properties?.title === sheetName);
  const sheetId = targetSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error(`Unable to find sheet "${sheetName}" for formatting.`);
  }

  const headerRange = {
    sheetId,
    startRowIndex: 0,
    endRowIndex: 1,
    startColumnIndex: 0,
    endColumnIndex: headers.length,
  };

  const dataRange = {
    sheetId,
    startRowIndex: 1,
    endRowIndex: 2000,
    startColumnIndex: 0,
    endColumnIndex: headers.length,
  };

  const allRowsRange = {
    sheetId,
    startRowIndex: 0,
    endRowIndex: 2000,
    startColumnIndex: 0,
    endColumnIndex: headers.length,
  };

  const bandingRange = {
    sheetId,
    startRowIndex: 0,
    endRowIndex: 2000,
    startColumnIndex: 0,
    endColumnIndex: headers.length,
  };

  const linkHeaderKeywords = ['linkedin', 'portfolio', 'cv', 'resume', 'url'];
  const columnWidthRequests = headers.map((header, index) => {
    const lower = header.toLowerCase();
    let pixelSize = 160;
    if (lower === 'irain') pixelSize = 170;
    else if (lower.includes('timestamp')) pixelSize = 190;
    else if (lower.includes('email')) pixelSize = 280;
    else if (lower.includes('company')) pixelSize = 220;
    else if (
      linkHeaderKeywords.some((keyword) => lower.includes(keyword)) ||
      lower.includes('linkedin')
    )
      pixelSize = 340;
    else if (
      lower.includes('current title') ||
      lower.includes('current role') ||
      lower.includes('target role')
    )
      pixelSize = 220;

    return {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: index,
          endIndex: index + 1,
        },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    };
  });

  const linkFormatRequests = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) =>
      linkHeaderKeywords.some((keyword) => header.toLowerCase().includes(keyword)),
    )
    .map(({ index }) => ({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: 2000,
          startColumnIndex: index,
          endColumnIndex: index + 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              foregroundColor: { red: 0.047, green: 0.274, blue: 0.576 },
              underline: true,
            },
            horizontalAlignment: 'LEFT',
          },
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment)',
      },
    }));

  const bandingMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const bandingSheet = bandingMeta.data.sheets?.find((sheet) => sheet.properties?.sheetId === sheetId);
  const deleteBandingRequests =
    bandingSheet?.bandedRanges?.map((band) => ({
      deleteBanding: { bandedRangeId: band.bandedRangeId },
    })) ?? [];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        ...deleteBandingRequests,
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1,
                hideGridlines: true,
              },
            },
            fields: 'gridProperties.frozenRowCount,gridProperties.hideGridlines',
          },
        },
        {
          repeatCell: {
            range: headerRange,
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.945, green: 0.961, blue: 0.976 },
                textFormat: {
                  bold: true,
                  fontSize: 11,
                  foregroundColor: { red: 0.059, green: 0.09, blue: 0.165 },
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP',
              },
            },
            fields:
              'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment,wrapStrategy)',
          },
        },
        {
          updateBorders: {
            range: headerRange,
            bottom: {
              style: 'SOLID_MEDIUM',
              color: { red: 0.8, green: 0.82, blue: 0.85 },
            },
          },
        },
        {
          repeatCell: {
            range: dataRange,
            cell: {
              userEnteredFormat: {
                textFormat: { fontSize: 10 },
                verticalAlignment: 'TOP',
                wrapStrategy: 'WRAP',
              },
            },
            fields: 'userEnteredFormat(textFormat,verticalAlignment,wrapStrategy)',
          },
        },
        {
          updateBorders: {
            range: allRowsRange,
            top: { style: 'SOLID', color: { red: 0.85, green: 0.87, blue: 0.9 } },
            bottom: { style: 'SOLID', color: { red: 0.85, green: 0.87, blue: 0.9 } },
            left: { style: 'SOLID', color: { red: 0.85, green: 0.87, blue: 0.9 } },
            right: { style: 'SOLID', color: { red: 0.85, green: 0.87, blue: 0.9 } },
            innerHorizontal: { style: 'SOLID', color: { red: 0.9, green: 0.92, blue: 0.95 } },
            innerVertical: { style: 'SOLID', color: { red: 0.9, green: 0.92, blue: 0.95 } },
          },
        },
        {
          addBanding: {
            bandedRange: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 2000,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              rowProperties: {
                headerColor: { red: 0.945, green: 0.961, blue: 0.976 },
                firstBandColor: { red: 1, green: 1, blue: 1 },
                secondBandColor: { red: 0.98, green: 0.984, blue: 0.992 },
              },
            },
          },
        },
        {
          setBasicFilter: {
            filter: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 2000,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
            },
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 0,
              endIndex: 1,
            },
            properties: { pixelSize: 36 },
            fields: 'pixelSize',
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: 1,
              endIndex: 2000,
            },
            properties: { pixelSize: 28 },
            fields: 'pixelSize',
          },
        },
        ...columnWidthRequests,
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1,
              endRowIndex: 2000,
              startColumnIndex: 0,
              endColumnIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'TEXT' },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
        ...linkFormatRequests,
        {
          addProtectedRange: {
            protectedRange: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              warningOnly: true,
            },
          },
        },
      ],
    },
  });
}
const APPLICATION_HEADERS = [
  'ID',
  'Timestamp',
  'Candidate ID',
  'iRCRN',
  'Position',
  'Reference Number',
  'Resume File Name',
];
const APPLICATION_SHEET_NAME = 'Applications';

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
  eligibleMoveCanada: string;
  countryOfOrigin: string;
  languages: string;
  languagesOther: string;
  industryType: string;
  industryOther: string;
  employmentStatus: string;
  legacyCandidateId?: string;
};

type ReferrerRow = {
  iRain: string; // iRefair referrer ID, e.g. iRAIN0000000016
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIndustry: string;
  workType: string;
  linkedin: string;
};

type ApplicationRow = {
  id: string;
  candidateId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
};

let sheetsClient: ReturnType<typeof google.sheets> | null = null;
const headersInitialized = new Set<string>();
const SHEET_BY_PREFIX: Record<SubmissionPrefix, string> = {
  CAND: CANDIDATE_SHEET_NAME,
  REF: REFERRER_SHEET_NAME,
  APP: APPLICATION_SHEET_NAME,
};

export type CandidateLookupResult = {
  rowIndex: number;
  record: CandidateRow & { timestamp: string; legacyCandidateId: string };
};

function cellValue(row: (string | number | null | undefined)[], index: number) {
  const value = row[index];
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function buildCandidateRecordFromRow(row: (string | number | null | undefined)[]): CandidateRow & {
  timestamp: string;
  legacyCandidateId: string;
} {
  return {
    id: cellValue(row, 0),
    timestamp: cellValue(row, 1),
    firstName: cellValue(row, 2),
    middleName: cellValue(row, 3),
    familyName: cellValue(row, 4),
    email: cellValue(row, 5),
    phone: cellValue(row, 6),
    locatedCanada: cellValue(row, 7),
    province: cellValue(row, 8),
    authorizedCanada: cellValue(row, 9),
    eligibleMoveCanada: cellValue(row, 10),
    countryOfOrigin: cellValue(row, 11),
    languages: cellValue(row, 12),
    languagesOther: cellValue(row, 13),
    industryType: cellValue(row, 14),
    industryOther: cellValue(row, 15),
    employmentStatus: cellValue(row, 16),
    legacyCandidateId: cellValue(row, LEGACY_CANDIDATE_ID_COLUMN_INDEX),
  };
}

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

async function appendLegacyCandidateHeaderIfMissing(
  sheetName: string,
  firstRow: string[],
  spreadsheetId: string,
  sheets: ReturnType<typeof getSheetsClient>,
) {
  if (sheetName !== CANDIDATE_SHEET_NAME) {
    return { headers: firstRow, appended: false };
  }

  const hasLegacyHeader = firstRow.includes(LEGACY_CANDIDATE_ID_HEADER);
  if (!firstRow.length || hasLegacyHeader) {
    return { headers: firstRow, appended: false };
  }

  const nextColumnIndex = firstRow.length;
  const nextColumnLetter = toColumnLetter(nextColumnIndex);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${nextColumnLetter}1`,
    valueInputOption: 'RAW',
    requestBody: { majorDimension: 'ROWS', values: [[LEGACY_CANDIDATE_ID_HEADER]] },
  });

  const updatedHeaders = [...firstRow];
  updatedHeaders[nextColumnIndex] = LEGACY_CANDIDATE_ID_HEADER;

  return { headers: updatedHeaders, appended: true };
}

async function ensureHeaders(sheetName: string, headers: string[], force = false) {
  if (!force && headersInitialized.has(sheetName)) return;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }
  const sheets = getSheetsClient();
  let createdSheet = false;
  let sheetId: number | undefined;
  let needsFormatting = false;
  let legacyHeaderAppended = false;
  try {
    const doc = await sheets.spreadsheets.get({ spreadsheetId });
    const targetSheet = doc.data.sheets?.find((sheet) => sheet.properties?.title === sheetName);
    sheetId = targetSheet?.properties?.sheetId ?? undefined;
    const exists = Boolean(targetSheet);
    if (!exists) {
      const added = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                  hiddenGridlines: true,
                },
              },
            },
          ],
        },
      });
      sheetId = added.data.replies?.[0]?.addSheet?.properties?.sheetId ?? sheetId;
      createdSheet = true;
      needsFormatting = true;
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
  let firstRow = current.data.values?.[0] ?? [];

  const lastCol = toColumnLetter(headers.length - 1);
  const headerRange = `${sheetName}!A1:${lastCol}1`;
  const writeHeaders = async () =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange,
      valueInputOption: 'RAW',
      requestBody: { majorDimension: 'ROWS', values: [headers] },
    });

  let freezeMissing = false;
  if (sheetName === REFERRER_SHEET_NAME) {
    const fullSheet = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    const rows = fullSheet.data.values ?? [];
    const dataRows = Math.max(rows.length - 1, 0);
    const headersMatch =
      firstRow.length === headers.length && firstRow.every((value, index) => value === headers[index]);

    if (!headersMatch && rows.length) {
      if (dataRows <= 2) {
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });
        firstRow = [];
        await writeHeaders();
        needsFormatting = true;
      } else {
        const now = new Date();
    const backupTitle = `${REFERRER_LEGACY_PREFIX}${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: backupTitle,
                  },
                },
              },
            ],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${backupTitle}!A1:${toColumnLetter((rows[0]?.length ?? 1) - 1)}${rows.length}`,
          valueInputOption: 'RAW',
          requestBody: { majorDimension: 'ROWS', values: rows },
        });

        await sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });
        firstRow = [];
        await writeHeaders();
        needsFormatting = true;
      }
    }

    if (firstRow[0] && IRAIN_REGEX.test(String(firstRow[0]))) {
      if (sheetId === undefined) {
        throw new Error('Unable to shift rows because sheetId could not be determined.');
      }
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: 0,
                  endIndex: 1,
                },
                inheritFromBefore: false,
              },
            },
          ],
        },
      });
      firstRow = [];
      needsFormatting = true;
    }
  }

  const legacyHeaderResult = await appendLegacyCandidateHeaderIfMissing(
    sheetName,
    firstRow,
    spreadsheetId,
    sheets,
  );
  legacyHeaderAppended = legacyHeaderResult.appended;
  firstRow = legacyHeaderResult.headers;

  const brokenIrainHeader = firstRow[0] === 'iRAIN' && firstRow.slice(1).every((cell) => !cell);
  if (brokenIrainHeader) {
    firstRow = [];
  }

  if (firstRow[0] === 'ID' && headers[0] === 'iRAIN') {
    await writeHeaders();
    firstRow = headers;
    needsFormatting = true;
  }

  if (!firstRow.length) {
    await writeHeaders();
    needsFormatting = true;
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = meta.data.sheets?.find((sheet) => sheet.properties?.title === sheetName);
  const frozenRows = targetSheet?.properties?.gridProperties?.frozenRowCount ?? 0;
  const headerNeedsFreeze = frozenRows < 1;
  freezeMissing = freezeMissing || headerNeedsFreeze;

  if (createdSheet || needsFormatting || freezeMissing || legacyHeaderAppended) {
    try {
      await applyProSheetFormatting(sheetName, headers);
    } catch (error) {
      console.error('Sheet formatting failed (non-fatal):', error);
    }
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

function getMaxIrcrnFromCompanies() {
  let max = 0;

  for (const { code } of companies) {
    const match = typeof code === 'string' ? IRCRN_REGEX.exec(code.trim()) : null;
    if (!match) continue;

    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed > max) {
      max = parsed;
    }
  }

  return max;
}

async function fetchMaxIrainFromSheet(sheetName: string, spreadsheetId: string) {
  const sheets = getSheetsClient();

  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      majorDimension: 'COLUMNS',
    });
    const values = existing.data.values?.[0] ?? [];

    let max = 0;
    for (const value of values) {
      const match = IRAIN_REGEX.exec(String(value).trim());
      if (!match) continue;

      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > max) {
        max = parsed;
      }
    }

    return max;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read iRAIN values from sheet "${sheetName}". Original error: ${message}`,
    );
  }
}

async function findMaxIrainInSheets(spreadsheetId: string) {
  const [candidateMax, referrerMax] = await Promise.all([
    fetchMaxIrainFromSheet(CANDIDATE_SHEET_NAME, spreadsheetId),
    fetchMaxIrainFromSheet(REFERRER_SHEET_NAME, spreadsheetId),
  ]);

  return Math.max(candidateMax, referrerMax);
}

async function getMaxExistingIrainNumber(spreadsheetId: string) {
  const maxIrcrn = getMaxIrcrnFromCompanies();
  const maxIrainFromSheets = await findMaxIrainInSheets(spreadsheetId);
  return Math.max(maxIrcrn, maxIrainFromSheets);
}

function getSpreadsheetIdOrThrow() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }
  return spreadsheetId;
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

export async function generateIRAIN(): Promise<string> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const next = (await getMaxExistingIrainNumber(spreadsheetId)) + 1;
  return formatIrainNumber(next);
}

export async function appendCandidateRow(row: CandidateRow) {
  await upsertCandidateRow(row);
}

export async function appendReferrerRow(row: ReferrerRow) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);

  const timestamp = new Date().toISOString();
  await appendRow(REFERRER_SHEET_NAME, [
    row.iRain,
    timestamp,
    row.name,
    row.email,
    row.phone,
    row.country,
    row.company,
    row.companyIndustry,
    row.workType,
    row.linkedin,
  ]);
}

export async function appendApplicationRow(row: ApplicationRow) {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  const timestamp = new Date().toISOString();
  await appendRow(APPLICATION_SHEET_NAME, [
    row.id,
    timestamp,
    row.candidateId,
    row.iCrn,
    row.position,
    row.referenceNumber,
    row.resumeFileName,
  ]);
}

function buildCandidateRowValues(
  row: CandidateRow,
  id: string,
  timestamp: string,
  legacyCandidateId?: string,
) {
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
    row.eligibleMoveCanada,
    row.countryOfOrigin,
    row.languages,
    row.languagesOther,
    row.industryType,
    row.industryOther,
    row.employmentStatus,
    legacyCandidateId ?? row.legacyCandidateId ?? '',
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
    range: `${CANDIDATE_SHEET_NAME}!A:${CANDIDATE_LAST_COLUMN_LETTER}`,
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
        legacyCandidateId: String(row[LEGACY_CANDIDATE_ID_COLUMN_INDEX] ?? '').trim(),
      };
    }
  }

  return null;
}

export async function findCandidateByIdentifier(identifier: string): Promise<CandidateLookupResult | null> {
  const searchValue = identifier.trim();
  if (!searchValue) return null;

  await ensureHeaders(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const searchByIrain = isIrain(searchValue);
  const normalized = searchValue.toLowerCase();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANDIDATE_SHEET_NAME}!A:${CANDIDATE_LAST_COLUMN_LETTER}`,
    majorDimension: 'ROWS',
  });

  const rows = existing.data.values ?? [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const irain = cellValue(row, 0).toLowerCase();
    const legacy = cellValue(row, LEGACY_CANDIDATE_ID_COLUMN_INDEX).toLowerCase();
    const matches = searchByIrain ? irain === normalized : legacy === normalized;
    if (matches) {
      return {
        rowIndex: index + 1,
        record: buildCandidateRecordFromRow(row),
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
  const providedLegacyId = row.legacyCandidateId ?? '';

  if (existing) {
    const isExistingIrain = IRAIN_REGEX.test(existing.id);
    const idToUse = isExistingIrain ? existing.id : row.id;
    const legacyCandidateId =
      (isExistingIrain ? existing.legacyCandidateId : existing.legacyCandidateId || existing.id) ??
      providedLegacyId;
    const range = `${CANDIDATE_SHEET_NAME}!A${existing.rowIndex}:${CANDIDATE_LAST_COLUMN_LETTER}${existing.rowIndex}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [buildCandidateRowValues(row, idToUse, timestamp, legacyCandidateId)],
      },
    });

    return { id: idToUse, wasUpdated: true, legacyCandidateId };
  }

  const legacyCandidateId = providedLegacyId;
  await appendRow(
    CANDIDATE_SHEET_NAME,
    buildCandidateRowValues(row, row.id, timestamp, legacyCandidateId),
  );
  return { id: row.id, wasUpdated: false, legacyCandidateId };
}

export async function migrateLegacyCandidateIds() {
  await ensureHeaders(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const values = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANDIDATE_SHEET_NAME}!A:${CANDIDATE_LAST_COLUMN_LETTER}`,
    majorDimension: 'ROWS',
  });

  const rows = values.data.values ?? [];
  const startingMax = await getMaxExistingIrainNumber(spreadsheetId);
  let nextNumber = startingMax + 1;

  const updates: { rowIndex: number; from: string; to: string; legacy: string }[] = [];
  const data: { range: string; values: (string | number | null)[][] }[] = [];

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const currentId = cellValue(row, 0);
    if (!currentId || IRAIN_REGEX.test(currentId)) continue;

    const rowIndex = index + 1;
    const legacyValue = cellValue(row, LEGACY_CANDIDATE_ID_COLUMN_INDEX) || currentId;
    const newIrain = formatIrainNumber(nextNumber++);

    updates.push({ rowIndex, from: currentId, to: newIrain, legacy: legacyValue });
    data.push({ range: `${CANDIDATE_SHEET_NAME}!A${rowIndex}`, values: [[newIrain]] });
    data.push({
      range: `${CANDIDATE_SHEET_NAME}!${LEGACY_CANDIDATE_ID_COLUMN_LETTER}${rowIndex}`,
      values: [[legacyValue]],
    });
  }

  if (data.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data,
      },
    });
  }

  try {
    await applyProSheetFormatting(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);
  } catch (error) {
    console.error('Candidate sheet formatting failed after migration (non-fatal):', error);
  }

  return {
    migrated: updates.length,
    updates,
    sequenceStart: startingMax + 1,
    sequenceEnd: nextNumber - 1,
  };
}

export async function formatSheet(sheetName: string, headers: string[]) {
  await ensureHeaders(sheetName, headers, true);
  await applyProSheetFormatting(sheetName, headers);
}
