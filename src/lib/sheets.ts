import { companies, type CompanyRow } from '@/lib/hiringCompanies';
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
  'iRREF',
  'Timestamp',
  'Name',
  'Email',
  'Phone',
  'Country',
  'Company',
  'Company iRCRN',
  'Company Approval',
  'Company Industry',
  'Careers Portal',
  'Work Type',
  'LinkedIn',
];
export const MATCH_SHEET_NAME = 'Matches';
export const MATCH_HEADERS = [
  'Match ID',
  'Created At',
  'Candidate iRAIN',
  'Referrer iRREF',
  'Company iRCRN',
  'Position / Context',
  'Stage',
  'Notes',
  'Intro Sent At',
];
export const ADMIN_TRACKING_COLUMNS = ['Status', 'Owner Notes', 'Tags', 'Last Contacted At', 'Next Action At'];
export const APPLICATION_ADMIN_COLUMNS = ['Status', 'Owner Notes'];

const IRCRN_REGEX = /^iRCRN(\d{10})$/i;
const IRAIN_REGEX = /^iRAIN(\d{10})$/i;
const IRREF_REGEX = /^iRREF(\d{10})$/i;
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
export const APPLICATION_HEADERS = [
  'ID',
  'Timestamp',
  'Candidate ID',
  'iRCRN',
  'Position',
  'Reference Number',
  'Resume File Name',
  'Resume URL',
  'Referrer iRREF',
  'Referrer Email',
];
export const APPLICATION_SHEET_NAME = 'Applications';

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
  iRref: string; // iRefair referrer ID, e.g. iRREF0000000016
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIrcrn?: string;
  companyApproval?: string;
  companyIndustry: string;
  careersPortal?: string;
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
  resumeUrl?: string;
  referrerIrref?: string;
  referrerEmail?: string;
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

export async function ensureHeaders(
  sheetName: string,
  headers: string[],
  force = false,
): Promise<{ created: boolean }> {
  if (!force && headersInitialized.has(sheetName)) {
    await ensureAdminColumnsForSheet(sheetName);
    return { created: false };
  }
  const spreadsheetId = getSpreadsheetIdOrThrow();
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
                    hideGridlines: true,
                  },
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
      firstRow.length >= headers.length && headers.every((value, index) => value === headers[index]);
    const hasHeaderContent = firstRow.some((value) => String(value ?? '').trim() !== '');

    if (!headersMatch && rows.length) {
      if (!hasHeaderContent && dataRows <= 2) {
        firstRow = [];
        await writeHeaders();
        needsFormatting = true;
      } else {
        console.warn(
          'Referrer sheet headers do not match expected format; preserving existing headers to avoid data loss.',
        );
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
  await ensureAdminColumnsForSheet(sheetName);
  return { created: createdSheet };
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

async function getMaxIrcrnFromReferrers(spreadsheetId: string) {
  const sheets = getSheetsClient();
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${REFERRER_SHEET_NAME}!1:1`,
    });
    const headers = existing.data.values?.[0] ?? [];
    const headerMap = buildHeaderMap(headers);
    const lastCol = toColumnLetter(headers.length - 1);
    const rows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${REFERRER_SHEET_NAME}!A:${lastCol}`,
      majorDimension: 'ROWS',
    });
    const values = rows.data.values ?? [];
    let max = 0;
    for (let i = 1; i < values.length; i++) {
      const row = values[i] ?? [];
      const value = getHeaderValue(headerMap, row, 'Company iRCRN');
      const match = IRCRN_REGEX.exec(String(value).trim());
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
      `Unable to read iRCRN values from referrers sheet. Original error: ${message}`,
    );
  }
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

async function fetchMaxIrrefFromSheet(spreadsheetId: string) {
  const sheets = getSheetsClient();
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${REFERRER_SHEET_NAME}!A:A`,
      majorDimension: 'COLUMNS',
    });
    const values = existing.data.values?.[0] ?? [];

    let max = 0;
    for (const value of values) {
      const match = IRREF_REGEX.exec(String(value).trim());
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
      `Unable to read iRREF values from sheet "${REFERRER_SHEET_NAME}". Original error: ${message}`,
    );
  }
}

async function findMaxIrainInSheets(spreadsheetId: string) {
  const candidateMax = await fetchMaxIrainFromSheet(CANDIDATE_SHEET_NAME, spreadsheetId);
  return Math.max(candidateMax, getMaxIrcrnFromCompanies());
}

async function getMaxExistingIrrefNumber(spreadsheetId: string) {
  return await fetchMaxIrrefFromSheet(spreadsheetId);
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
  const next = (await findMaxIrainInSheets(spreadsheetId)) + 1;
  return formatIrainNumber(next);
}

export async function generateIRREF(): Promise<string> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const next = (await getMaxExistingIrrefNumber(spreadsheetId)) + 1;
  return `iRREF${String(next).padStart(10, '0')}`;
}

export async function generateIRCRN(): Promise<string> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const maxCompanies = getMaxIrcrnFromCompanies();
  const maxReferrers = await getMaxIrcrnFromReferrers(spreadsheetId);
  const next = Math.max(maxCompanies, maxReferrers) + 1;
  return `iRCRN${String(next).padStart(10, '0')}`;
}

export async function appendCandidateRow(row: CandidateRow) {
  await upsertCandidateRow(row);
}

export async function appendReferrerRow(row: ReferrerRow) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);

  const timestamp = new Date().toISOString();
  await appendRow(REFERRER_SHEET_NAME, [
    row.iRref,
    timestamp,
    row.name,
    row.email,
    row.phone,
    row.country,
    row.company,
    row.companyIrcrn ?? '',
    row.companyApproval ?? '',
    row.companyIndustry,
    row.careersPortal ?? '',
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
    row.resumeUrl ?? '',
    row.referrerIrref ?? '',
    row.referrerEmail ?? '',
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

async function ensureAdminColumnsForSheet(sheetName: string) {
  if (sheetName === CANDIDATE_SHEET_NAME || sheetName === REFERRER_SHEET_NAME) {
    return ensureColumns(sheetName, ADMIN_TRACKING_COLUMNS);
  }

  if (sheetName === APPLICATION_SHEET_NAME) {
    return ensureColumns(sheetName, APPLICATION_ADMIN_COLUMNS);
  }

  return { appended: [], headers: [] };
}

export async function ensureColumns(
  sheetName: string,
  requiredHeaders: string[],
): Promise<{ appended: string[]; headers: string[] }> {
  if (!requiredHeaders.length) {
    return { appended: [], headers: [] };
  }

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const existingHeaders = (current.data.values?.[0] ?? []).map((value) => String(value));
  const existingSet = new Set(existingHeaders.map((header) => header.trim()));
  const missing = requiredHeaders.filter((header) => !existingSet.has(header));

  if (!missing.length) {
    return { appended: [], headers: existingHeaders };
  }

  const updatedHeaders = [...existingHeaders, ...missing];
  const headerRange = `${sheetName}!A1:${toColumnLetter(updatedHeaders.length - 1)}1`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange,
    valueInputOption: 'RAW',
    requestBody: { majorDimension: 'ROWS', values: [updatedHeaders] },
  });

  try {
    await applyProSheetFormatting(sheetName, updatedHeaders);
  } catch (error) {
    console.error('Sheet formatting failed (non-fatal):', error);
  }

  return { appended: missing, headers: updatedHeaders };
}

type CandidateListParams = {
  search?: string;
  status?: string;
  eligible?: boolean;
  locatedCanada?: string;
  limit?: number;
  offset?: number;
};

type ReferrerListParams = {
  search?: string;
  status?: string;
  company?: string;
  approval?: string;
  limit?: number;
  offset?: number;
};

type ApplicationListParams = {
  search?: string;
  status?: string;
  ircrn?: string;
  referrerIrref?: string;
  limit?: number;
  offset?: number;
};

type ApplicationListItem = {
  id: string;
  timestamp: string;
  candidateId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
  resumeUrl: string;
  referrerIrref: string;
  referrerEmail: string;
  status: string;
  ownerNotes: string;
  missingFields: string[];
};

type MatchListParams = {
  search?: string;
  stage?: string;
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 50;

function headerIndex(headers: string[], name: string) {
  return headers.findIndex((header) => header.trim() === name.trim());
}

function buildHeaderMap(headers: string[]) {
  const map = new Map<string, number>();
  headers.forEach((header, index) => map.set(header, index));
  return map;
}

function getHeaderValue(
  headers: Map<string, number>,
  row: (string | number | null | undefined)[],
  name: string,
) {
  const index = headers.get(name);
  if (index === undefined || index < 0) return '';
  return cellValue(row, index);
}

function paginate<T>(items: T[], offset?: number, limit?: number) {
  const safeOffset = Number.isFinite(offset) && offset && offset > 0 ? offset : 0;
  const safeLimit = Number.isFinite(limit) && limit && limit > 0 ? limit : DEFAULT_LIMIT;
  return items.slice(safeOffset, safeOffset + safeLimit);
}

function normalizeSearch(value?: string) {
  return value ? value.trim().toLowerCase() : '';
}

export async function listCandidates(params: CandidateListParams) {
  await ensureHeaders(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANDIDATE_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return { total: 0, items: [] as unknown[] };

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANDIDATE_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);
  const searchTerm = normalizeSearch(params.search);
  const statusFilter = normalizeSearch(params.status);
  const locationFilter = normalizeSearch(params.locatedCanada);
  const eligibleFilter =
    params.eligible === true ? true : params.eligible === false ? false : undefined;

  const items = rows
    .map((row) => {
      const locatedCanada = getHeaderValue(headerMap, row, 'Located in Canada');
      const eligibleMove = getHeaderValue(headerMap, row, 'Eligible to Move (6 Months)');
      const eligible =
        locatedCanada.trim().toLowerCase() === 'yes' ||
        eligibleMove.trim().toLowerCase() === 'yes';
      const eligibilityReason = eligible
        ? locatedCanada.trim().toLowerCase() === 'yes'
          ? 'In Canada'
          : 'Can move in 6 months'
        : 'Not eligible';

      const missingFields: string[] = [];
      if (!getHeaderValue(headerMap, row, 'Email')) missingFields.push('Email');
      if (!getHeaderValue(headerMap, row, 'Phone')) missingFields.push('Phone');
      if (!locatedCanada) missingFields.push('Located in Canada');
      if (!getHeaderValue(headerMap, row, 'Work Authorization')) {
        missingFields.push('Work Authorization');
      }

      const record = {
        irain: getHeaderValue(headerMap, row, 'iRAIN'),
        timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
        firstName: getHeaderValue(headerMap, row, 'First Name'),
        middleName: getHeaderValue(headerMap, row, 'Middle Name'),
        familyName: getHeaderValue(headerMap, row, 'Family Name'),
        email: getHeaderValue(headerMap, row, 'Email'),
        phone: getHeaderValue(headerMap, row, 'Phone'),
        locatedCanada,
        province: getHeaderValue(headerMap, row, 'Province'),
        workAuthorization: getHeaderValue(headerMap, row, 'Work Authorization'),
        eligibleMoveCanada: eligibleMove,
        countryOfOrigin: getHeaderValue(headerMap, row, 'Country of Origin'),
        languages: getHeaderValue(headerMap, row, 'Languages'),
        languagesOther: getHeaderValue(headerMap, row, 'Languages Other'),
        industryType: getHeaderValue(headerMap, row, 'Industry Type'),
        industryOther: getHeaderValue(headerMap, row, 'Industry Other'),
        employmentStatus: getHeaderValue(headerMap, row, 'Employment Status'),
        legacyCandidateId: getHeaderValue(headerMap, row, LEGACY_CANDIDATE_ID_HEADER),
        status: getHeaderValue(headerMap, row, 'Status'),
        ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        tags: getHeaderValue(headerMap, row, 'Tags'),
        lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
        nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
        eligibility: {
          eligible,
          reason: eligibilityReason,
        },
        missingFields,
      };

      return record;
    })
    .filter((record) => {
      if (searchTerm) {
        const haystack = [
          record.irain,
          record.email,
          record.firstName,
          record.middleName,
          record.familyName,
          record.phone,
          record.province,
          record.languages,
          record.industryType,
          record.countryOfOrigin,
          record.tags,
          record.ownerNotes,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        const matches = haystack.some((value) => value.includes(searchTerm));
        if (!matches) return false;
      }

      if (statusFilter && record.status.toLowerCase() !== statusFilter) return false;
      if (locationFilter && record.locatedCanada.toLowerCase() !== locationFilter) return false;
      if (eligibleFilter !== undefined && record.eligibility.eligible !== eligibleFilter) {
        return false;
      }
      return true;
    });

  return {
    total: items.length,
    items: paginate(items, params.offset, params.limit),
  };
}

export async function listReferrers(params: ReferrerListParams) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ['Company iRCRN', 'Company Approval']);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return { total: 0, items: [] as unknown[] };

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);
  const searchTerm = normalizeSearch(params.search);
  const statusFilter = normalizeSearch(params.status);
  const companyFilter = normalizeSearch(params.company);
  const approvalFilter = normalizeSearch(params.approval);

  const items = rows
    .map((row) => {
      const missingFields: string[] = [];
      if (!getHeaderValue(headerMap, row, 'Email')) missingFields.push('Email');
      if (!getHeaderValue(headerMap, row, 'Phone')) missingFields.push('Phone');
      if (!getHeaderValue(headerMap, row, 'Company')) missingFields.push('Company');
      if (!getHeaderValue(headerMap, row, 'Careers Portal')) missingFields.push('Careers Portal');

      return {
        irref: getHeaderValue(headerMap, row, 'iRREF'),
        timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
        name: getHeaderValue(headerMap, row, 'Name'),
        email: getHeaderValue(headerMap, row, 'Email'),
        phone: getHeaderValue(headerMap, row, 'Phone'),
        country: getHeaderValue(headerMap, row, 'Country'),
        company: getHeaderValue(headerMap, row, 'Company'),
        companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
        companyApproval: getHeaderValue(headerMap, row, 'Company Approval'),
        companyIndustry: getHeaderValue(headerMap, row, 'Company Industry'),
        careersPortal: getHeaderValue(headerMap, row, 'Careers Portal'),
        workType: getHeaderValue(headerMap, row, 'Work Type'),
        linkedin: getHeaderValue(headerMap, row, 'LinkedIn'),
        status: getHeaderValue(headerMap, row, 'Status'),
        ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        tags: getHeaderValue(headerMap, row, 'Tags'),
        lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
        nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
        missingFields,
      };
    })
    .filter((record) => {
      if (searchTerm) {
        const haystack = [
          record.irref,
          record.email,
          record.name,
          record.phone,
          record.country,
          record.company,
          record.companyIndustry,
          record.workType,
          record.tags,
          record.ownerNotes,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        const matches = haystack.some((value) => value.includes(searchTerm));
        if (!matches) return false;
      }

      if (statusFilter && record.status.toLowerCase() !== statusFilter) return false;
      if (approvalFilter) {
        const approvalValue = record.companyApproval.toLowerCase();
        if (approvalFilter === 'approved' && approvalValue === '') {
          // Treat legacy blank approvals as approved for now.
        } else if (approvalValue !== approvalFilter) {
          return false;
        }
      }
      if (companyFilter && record.company.toLowerCase().includes(companyFilter) === false) {
        return false;
      }
      return true;
    });

  const ordered = items.sort((a, b) => {
    const aTime = a.timestamp ? Date.parse(a.timestamp) : 0;
    const bTime = b.timestamp ? Date.parse(b.timestamp) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return (b.irref || '').localeCompare(a.irref || '');
  });

  return {
    total: ordered.length,
    items: paginate(ordered, params.offset, params.limit),
  };
}

export async function listApprovedReferrerCompanies(): Promise<CompanyRow[]> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ['Company iRCRN', 'Company Approval']);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return [];

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);
  const items: CompanyRow[] = [];

  for (const row of rows) {
    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    if (approval && approval !== 'approved') continue;

    const code = getHeaderValue(headerMap, row, 'Company iRCRN');
    const name = getHeaderValue(headerMap, row, 'Company');
    if (!code || !name) continue;

    items.push({
      code,
      name,
      industry: getHeaderValue(headerMap, row, 'Company Industry') || 'Not specified',
      careersUrl: getHeaderValue(headerMap, row, 'Careers Portal') || undefined,
    });
  }

  return items;
}

export async function countRowsInSheet(sheetName: string): Promise<number> {
  await ensureHeaders(sheetName, sheetName === APPLICATION_SHEET_NAME ? APPLICATION_HEADERS : []);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const column = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
    majorDimension: 'COLUMNS',
  });
  const rows = column.data.values?.[0] ?? [];
  const count = Math.max(0, rows.length - 1);
  return count;
}

export async function countApplicationsSince(date: Date): Promise<number> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const column = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATION_SHEET_NAME}!B:B`,
    majorDimension: 'COLUMNS',
  });
  const rows = column.data.values?.[0] ?? [];
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const value = rows[i];
    const ts = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed) && parsed >= date.getTime()) {
      count += 1;
    }
  }
  return count;
}

type ReferrerLookupResult = {
  irref: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  companyIrcrn?: string;
};

export async function findReferrerByIrcrn(ircrn: string): Promise<ReferrerLookupResult | null> {
  const normalizedIrcrn = ircrn.trim().toLowerCase();
  if (!normalizedIrcrn) return null;

  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ['Company iRCRN', 'Company Approval']);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);
  const companyMatch = companies.find((company) => company.code.toLowerCase() === normalizedIrcrn);
  const companyNameLower = companyMatch?.name?.toLowerCase();

  const pickRecord = (row: (string | number | null | undefined)[]) => ({
    irref: getHeaderValue(headerMap, row, 'iRREF'),
    name: getHeaderValue(headerMap, row, 'Name'),
    email: getHeaderValue(headerMap, row, 'Email'),
    phone: getHeaderValue(headerMap, row, 'Phone'),
    company: getHeaderValue(headerMap, row, 'Company'),
    companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
  });

  const isApproved = (row: (string | number | null | undefined)[]) => {
    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    return approval === '' || approval === 'approved';
  };

  for (const row of rows) {
    const rowIrcrn = getHeaderValue(headerMap, row, 'Company iRCRN').toLowerCase();
    if (rowIrcrn && rowIrcrn === normalizedIrcrn) {
      if (!isApproved(row)) continue;
      const record = pickRecord(row);
      if (record.email) return record;
    }
  }

  if (companyNameLower) {
    for (const row of rows) {
      const rowCompany = getHeaderValue(headerMap, row, 'Company').toLowerCase();
      if (rowCompany && rowCompany === companyNameLower) {
        if (!isApproved(row)) continue;
        const record = pickRecord(row);
        if (record.email) return record;
      }
    }
  }

  return null;
}

export async function listApplications(
  params: ApplicationListParams,
): Promise<{ total: number; items: ApplicationListItem[] }> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATION_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return { total: 0, items: [] };

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATION_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);
  const searchTerm = normalizeSearch(params.search);
  const statusFilter = normalizeSearch(params.status);
  const ircrnFilter = normalizeSearch(params.ircrn);
  const referrerFilter = normalizeSearch(params.referrerIrref);

  const items: ApplicationListItem[] = rows
    .map((row) => {
      const missingFields: string[] = [];
      if (!getHeaderValue(headerMap, row, 'Candidate ID')) missingFields.push('Candidate ID');
      if (!getHeaderValue(headerMap, row, 'iRCRN')) missingFields.push('iRCRN');
      if (!getHeaderValue(headerMap, row, 'Position')) missingFields.push('Position');

      return {
        id: getHeaderValue(headerMap, row, 'ID'),
        timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
        candidateId: getHeaderValue(headerMap, row, 'Candidate ID'),
        iCrn: getHeaderValue(headerMap, row, 'iRCRN'),
        position: getHeaderValue(headerMap, row, 'Position'),
        referenceNumber: getHeaderValue(headerMap, row, 'Reference Number'),
        resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name'),
        resumeUrl: getHeaderValue(headerMap, row, 'Resume URL'),
        referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
        referrerEmail: getHeaderValue(headerMap, row, 'Referrer Email'),
        status: getHeaderValue(headerMap, row, 'Status'),
        ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        missingFields,
      };
    })
    .filter((record) => {
      if (searchTerm) {
        const haystack = [
          record.id,
          record.candidateId,
          record.iCrn,
          record.position,
          record.referenceNumber,
          record.ownerNotes,
          record.referrerEmail,
          record.resumeUrl,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        const matches = haystack.some((value) => value.includes(searchTerm));
        if (!matches) return false;
      }

      if (statusFilter && record.status.toLowerCase() !== statusFilter) return false;
      if (ircrnFilter && record.iCrn.toLowerCase() !== ircrnFilter) return false;
      if (referrerFilter && record.referrerIrref.toLowerCase() !== referrerFilter) return false;
      return true;
    });

  return {
    total: items.length,
    items: paginate(items, params.offset, params.limit),
  };
}

export async function getApplicationById(id: string) {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATION_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICATION_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const values = rows.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const value = cellValue(row, 0).toLowerCase();
    if (value === id.trim().toLowerCase()) {
      return {
        rowIndex: i + 1,
        record: {
          id: getHeaderValue(headerMap, row, 'ID'),
          timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
          candidateId: getHeaderValue(headerMap, row, 'Candidate ID'),
          iCrn: getHeaderValue(headerMap, row, 'iRCRN'),
          position: getHeaderValue(headerMap, row, 'Position'),
          referenceNumber: getHeaderValue(headerMap, row, 'Reference Number'),
          resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name'),
          resumeUrl: getHeaderValue(headerMap, row, 'Resume URL'),
          referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
          referrerEmail: getHeaderValue(headerMap, row, 'Referrer Email'),
          status: getHeaderValue(headerMap, row, 'Status'),
          ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        },
      };
    }
  }
  return null;
}

export async function listMatches(params: MatchListParams) {
  await ensureHeaders(MATCH_SHEET_NAME, MATCH_HEADERS);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MATCH_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return { total: 0, items: [] as unknown[] };

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MATCH_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);
  const searchTerm = normalizeSearch(params.search);
  const stageFilter = normalizeSearch(params.stage);

  const items = rows
    .map((row) => {
      const missingFields: string[] = [];
      if (!getHeaderValue(headerMap, row, 'Candidate iRAIN')) missingFields.push('Candidate iRAIN');
      if (!getHeaderValue(headerMap, row, 'Referrer iRREF')) missingFields.push('Referrer iRREF');
      if (!getHeaderValue(headerMap, row, 'Company iRCRN')) missingFields.push('Company iRCRN');

      return {
        matchId: getHeaderValue(headerMap, row, 'Match ID'),
        createdAt: getHeaderValue(headerMap, row, 'Created At'),
        candidateIrain: getHeaderValue(headerMap, row, 'Candidate iRAIN'),
        referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
        companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
        positionContext: getHeaderValue(headerMap, row, 'Position / Context'),
        stage: getHeaderValue(headerMap, row, 'Stage'),
        notes: getHeaderValue(headerMap, row, 'Notes'),
        introSentAt: getHeaderValue(headerMap, row, 'Intro Sent At'),
        missingFields,
      };
    })
    .filter((record) => {
      if (searchTerm) {
        const haystack = [
          record.matchId,
          record.candidateIrain,
          record.referrerIrref,
          record.companyIrcrn,
          record.positionContext,
          record.stage,
          record.notes,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        const matches = haystack.some((value) => value.includes(searchTerm));
        if (!matches) return false;
      }

      if (stageFilter && record.stage.toLowerCase() !== stageFilter) return false;
      return true;
    });

  return {
    total: items.length,
    items: paginate(items, params.offset, params.limit),
  };
}

type AdminPatch = {
  status?: string;
  ownerNotes?: string;
  tags?: string;
  lastContactedAt?: string;
  nextActionAt?: string;
};

type ApplicationAdminPatch = {
  status?: string;
  ownerNotes?: string;
};

export async function updateRowById(
  sheetName: string,
  idHeaderName: string,
  idValue: string,
  patchByHeaderName: Record<string, string | undefined>,
): Promise<{ updated: boolean; reason?: 'not_found' | 'no_changes' }> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  const headerMap = buildHeaderMap(headers);

  const idIndex = headerIndex(headers, idHeaderName);
  if (idIndex === -1) {
    throw new Error(`Header "${idHeaderName}" not found in sheet ${sheetName}`);
  }

  const idColumn = toColumnLetter(idIndex);
  const column = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${idColumn}:${idColumn}`,
    majorDimension: 'COLUMNS',
  });
  const rows = column.data.values?.[0] ?? [];
  const normalizedId = idValue.trim().toLowerCase();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const value = String(rows[i] ?? '').trim().toLowerCase();
    if (value === normalizedId) {
      rowIndex = i + 1; // 1-based for sheets
      break;
    }
  }

  if (rowIndex === -1) {
    return { updated: false, reason: 'not_found' };
  }

  const updates = Object.entries(patchByHeaderName)
    .filter(([, value]) => value !== undefined)
    .map(([header, value]) => {
      const index = headerMap.get(header);
      if (index === undefined) return null;
      const col = toColumnLetter(index);
      return {
        range: `${sheetName}!${col}${rowIndex}`,
        values: [[value ?? '']],
      };
    })
    .filter(Boolean) as { range: string; values: (string | number | null)[][] }[];

  if (!updates.length) {
    return { updated: false, reason: 'no_changes' };
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates,
    },
  });

  return { updated: true };
}

export async function updateCandidateAdmin(irain: string, patch: AdminPatch) {
  await ensureHeaders(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS);

  return updateRowById(CANDIDATE_SHEET_NAME, 'iRAIN', irain, {
    Status: patch.status,
    'Owner Notes': patch.ownerNotes,
    Tags: patch.tags,
    'Last Contacted At': patch.lastContactedAt,
    'Next Action At': patch.nextActionAt,
  });
}

export async function updateReferrerAdmin(irref: string, patch: AdminPatch) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);

  return updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
    Status: patch.status,
    'Owner Notes': patch.ownerNotes,
    Tags: patch.tags,
    'Last Contacted At': patch.lastContactedAt,
    'Next Action At': patch.nextActionAt,
  });
}

export async function updateReferrerCompanyApproval(irref: string, approval: string) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ['Company iRCRN', 'Company Approval']);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { reason: 'not_found' as const };
  }

  const patch: Record<string, string> = {
    'Company Approval': approval,
  };

  if (approval === 'approved' && !referrer.record.companyIrcrn) {
    patch['Company iRCRN'] = await generateIRCRN();
  }

  const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, patch);
  return {
    reason: result.reason,
    updated: result.updated,
    companyIrcrn: patch['Company iRCRN'] ?? referrer.record.companyIrcrn ?? '',
    companyApproval: approval,
  };
}

export async function updateApplicationAdmin(id: string, patch: ApplicationAdminPatch) {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);

  return updateRowById(APPLICATION_SHEET_NAME, 'ID', id, {
    Status: patch.status,
    'Owner Notes': patch.ownerNotes,
  });
}

type MatchPatch = {
  stage?: string;
  notes?: string;
  introSentAt?: string;
};

export async function updateMatch(matchId: string, patch: MatchPatch) {
  await ensureHeaders(MATCH_SHEET_NAME, MATCH_HEADERS);

  return updateRowById(MATCH_SHEET_NAME, 'Match ID', matchId, {
    Stage: patch.stage,
    Notes: patch.notes,
    'Intro Sent At': patch.introSentAt,
  });
}

export async function getReferrerByIrref(irref: string) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const values = rows.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const value = cellValue(row, 0).toLowerCase();
    if (value === irref.trim().toLowerCase()) {
      return {
        rowIndex: i + 1,
        record: {
          irref: getHeaderValue(headerMap, row, 'iRREF'),
          timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
          name: getHeaderValue(headerMap, row, 'Name'),
          email: getHeaderValue(headerMap, row, 'Email'),
          phone: getHeaderValue(headerMap, row, 'Phone'),
          country: getHeaderValue(headerMap, row, 'Country'),
          company: getHeaderValue(headerMap, row, 'Company'),
          companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
          companyApproval: getHeaderValue(headerMap, row, 'Company Approval'),
          companyIndustry: getHeaderValue(headerMap, row, 'Company Industry'),
          careersPortal: getHeaderValue(headerMap, row, 'Careers Portal'),
          workType: getHeaderValue(headerMap, row, 'Work Type'),
          linkedin: getHeaderValue(headerMap, row, 'LinkedIn'),
          status: getHeaderValue(headerMap, row, 'Status'),
          ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
          tags: getHeaderValue(headerMap, row, 'Tags'),
          lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
          nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
        },
      };
    }
  }
  return null;
}

export async function getMatchById(matchId: string) {
  await ensureHeaders(MATCH_SHEET_NAME, MATCH_HEADERS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MATCH_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MATCH_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const values = rows.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const value = cellValue(row, 0).toLowerCase();
    if (value === matchId.trim().toLowerCase()) {
      return {
        rowIndex: i + 1,
        record: {
          matchId: getHeaderValue(headerMap, row, 'Match ID'),
          createdAt: getHeaderValue(headerMap, row, 'Created At'),
          candidateIrain: getHeaderValue(headerMap, row, 'Candidate iRAIN'),
          referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
          companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
          positionContext: getHeaderValue(headerMap, row, 'Position / Context'),
          stage: getHeaderValue(headerMap, row, 'Stage'),
          notes: getHeaderValue(headerMap, row, 'Notes'),
          introSentAt: getHeaderValue(headerMap, row, 'Intro Sent At'),
        },
      };
    }
  }
  return null;
}
