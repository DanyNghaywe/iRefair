import { type CompanyRow } from '@/lib/hiringCompanies';
import { google } from 'googleapis';
import { randomUUID } from 'crypto';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

type SubmissionPrefix = 'CAND' | 'REF' | 'APP';
export const LEGACY_APPLICANT_ID_HEADER = 'Legacy Applicant ID';
export const APPLICANT_SECRET_HASH_HEADER = 'Applicant Secret Hash';
export const APPLICANT_UPDATE_TOKEN_HASH_HEADER = 'Update Token Hash';
export const APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER = 'Update Token Expires At';
export const APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER = 'Update Pending Payload';
export const APPLICANT_REGISTRATION_STATUS_HEADER = 'Registration Status';

const APPLICANT_SECURITY_COLUMNS = [
  APPLICANT_SECRET_HASH_HEADER,
  APPLICANT_UPDATE_TOKEN_HASH_HEADER,
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER,
  APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER,
  APPLICANT_REGISTRATION_STATUS_HEADER,
];

export const APPLICANT_HEADERS = [
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
  LEGACY_APPLICANT_ID_HEADER,
];
export const APPLICANT_SHEET_NAME = 'Applicants';
const APPLICANT_EMAIL_COLUMN_INDEX = 5; // zero-based (Column F)
const LEGACY_APPLICANT_ID_COLUMN_INDEX = APPLICANT_HEADERS.length - 1;
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
export const REFERRER_PORTAL_TOKEN_VERSION_HEADER = 'Portal Token Version';
export const REFERRER_PENDING_UPDATES_HEADER = 'Pending Updates';
export const ADMIN_TRACKING_COLUMNS = ['Status', 'Owner Notes', 'Tags', 'Last Contacted At', 'Next Action At'];
const REFERRER_SECURITY_COLUMNS = [REFERRER_PORTAL_TOKEN_VERSION_HEADER, REFERRER_PENDING_UPDATES_HEADER];
export const APPLICATION_ADMIN_COLUMNS = [
  'Status',
  'Owner Notes',
  'Meeting Date',
  'Meeting Time',
  'Meeting Timezone',
  'Meeting URL',
  'Action History',
  'Reschedule Token Hash',
  'Reschedule Token Expires At',
  'Update Request Token Hash',
  'Update Request Expires At',
  'Update Request Purpose',
];

export const ARCHIVE_COLUMNS = ['Archived', 'ArchivedAt', 'ArchivedBy'];

// Referrer Companies sheet - stores company data separately from referrer profile
// Allows one referrer to have multiple companies, each with separate approval
export const REFERRER_COMPANIES_SHEET_NAME = 'Referrer Companies';
export const REFERRER_COMPANIES_HEADERS = [
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

const IRCRN_REGEX = /^iRCRN(\d{10})$/i;
const IRAIN_REGEX = /^iRAIN(\d{10})$/i;
const IRREF_REGEX = /^iRREF(\d{10})$/i;
const REFERRER_LEGACY_PREFIX = 'Referrers_Legacy_';

export function isIrain(value: string) {
  return IRAIN_REGEX.test(value.trim());
}

export function isLegacyApplicantId(value: string) {
  return /^CAND-/i.test(value.trim());
}

export function isIrcrn(value: string) {
  return IRCRN_REGEX.test(value.trim());
}

export function isIrref(value: string) {
  return IRREF_REGEX.test(value.trim());
}

/**
 * Normalize legacy status phrases to consistent lowercase values.
 * Legacy stored phrases:
 * - "Wants to meet" -> "meeting requested"
 * - "Not a good fit" -> "not a good fit"
 * - "CV not matching requirements" -> "cv mismatch"
 * - "CV needs adjustments" -> "cv update requested"
 * - "CV missing information" -> "info requested"
 * - "He interviewed" -> "interviewed"
 * - "He got the job" -> "job offered"
 *
 * New statuses will be stored as readable lowercase values like:
 * 'new', 'meeting scheduled', 'needs reschedule', 'interviewed', 'job offered', etc.
 */
export function normalizeStatus(raw?: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  // Map legacy phrases to normalized values
  const legacyMap: Record<string, string> = {
    'wants to meet': 'meeting requested',
    'not a good fit': 'not a good fit',
    'cv not matching requirements': 'cv mismatch',
    'cv needs adjustments': 'cv update requested',
    'cv missing information': 'info requested',
    'he interviewed': 'interviewed',
    'he got the job': 'job offered',
    'hired': 'job offered', // backward compatibility
  };

  const lowerTrimmed = trimmed.toLowerCase();
  if (legacyMap[lowerTrimmed]) {
    return legacyMap[lowerTrimmed];
  }

  return lowerTrimmed;
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

const CANDIDATE_LAST_COLUMN_LETTER = toColumnLetter(APPLICANT_HEADERS.length - 1);
const LEGACY_CANDIDATE_ID_COLUMN_LETTER = toColumnLetter(LEGACY_APPLICANT_ID_COLUMN_INDEX);

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
  'Applicant ID',
  'iRCRN',
  'Position',
  'Reference Number',
  'Resume File Name',
  'Resume File ID',
  'Resume URL',
  'Referrer iRREF',
  'Referrer Email',
  'Referrer Company ID',
];
export const APPLICATION_SHEET_NAME = 'Applications';

type ApplicantRow = {
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
  legacyApplicantId?: string;
  applicantSecretHash?: string;
  updateTokenHash?: string;
  updateTokenExpiresAt?: string;
  updatePendingPayload?: string;
  registrationStatus?: string;
  resumeFileName?: string;
  resumeFileId?: string;
  resumeUrl?: string;
  archived?: string;
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
  portalTokenVersion?: string;
};

// Referrer Company - links a referrer to a company (many-to-many relationship)
export type ReferrerCompanyRow = {
  id: string; // Unique ID for this referrer-company relationship
  referrerIrref: string; // Foreign key to Referrers sheet
  companyName: string;
  companyIrcrn?: string; // Generated on approval
  companyApproval?: 'pending' | 'approved' | 'denied' | '';
  companyIndustry: string;
  careersPortal?: string;
  workType: string;
};

export type ReferrerCompanyRecord = ReferrerCompanyRow & {
  timestamp: string;
  archived?: string;
  archivedAt?: string;
  archivedBy?: string;
};

// Full referrer record type (matches what getReferrerByIrref returns)
export type ReferrerRecord = {
  irref: string;
  timestamp: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  company: string;
  companyIrcrn: string;
  companyApproval: string;
  companyIndustry: string;
  careersPortal: string;
  workType: string;
  linkedin: string;
  portalTokenVersion: string;
  pendingUpdates: string;
  status: string;
  ownerNotes: string;
  tags: string;
  lastContactedAt: string;
  nextActionAt: string;
  archived: string;
  archivedAt: string;
  archivedBy: string;
};

type ApplicationRow = {
  id: string;
  applicantId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
  resumeFileId?: string;
  referrerIrref?: string;
  referrerEmail?: string;
  referrerCompanyId?: string;
  status?: string;
};

let sheetsClient: ReturnType<typeof google.sheets> | null = null;
const headersInitialized = new Set<string>();
const headersCache = new Map<string, string[]>();

/**
 * Get cached headers for a sheet, or fetch them if not cached.
 * This reduces redundant API calls when listing data.
 */
async function getCachedHeaders(sheetName: string): Promise<string[]> {
  const cached = headersCache.get(sheetName);
  if (cached) return cached;

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });
  const headers = (headerRow.data.values?.[0] ?? []).map((v) => String(v));
  if (headers.length) {
    headersCache.set(sheetName, headers);
  }
  return headers;
}

/**
 * Fetch sheet data with headers in a single API call.
 * Returns both headers and data rows, using cached headers when available.
 */
async function getSheetDataWithHeaders(sheetName: string): Promise<{
  headers: string[];
  rows: string[][];
}> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  // Get headers (from cache if available) to determine column range
  const headers = await getCachedHeaders(sheetName);
  if (!headers.length) {
    return { headers: [], rows: [] };
  }

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const allRows = existing.data.values ?? [];
  // Update cache with fresh headers from the response
  const freshHeaders = (allRows[0] ?? []).map((v) => String(v));
  if (freshHeaders.length) {
    headersCache.set(sheetName, freshHeaders);
  }

  return {
    headers: freshHeaders.length ? freshHeaders : headers,
    rows: allRows.slice(1),
  };
}
const SHEET_BY_PREFIX: Record<SubmissionPrefix, string> = {
  CAND: APPLICANT_SHEET_NAME,
  REF: REFERRER_SHEET_NAME,
  APP: APPLICATION_SHEET_NAME,
};

export type ApplicantLookupResult = {
  rowIndex: number;
  record: ApplicantRow & { timestamp: string; legacyApplicantId: string };
};

/**
 * Unescape a value that was escaped by escapeSheetsFormula() when writing to sheets.
 * Removes the leading single quote that was added to prevent formula injection.
 */
function unescapeSheetsFormula(value: string): string {
  if (!value) return value;
  // If value starts with ' followed by a formula character, remove the quote
  if (/^'[=+\-@]/.test(value)) {
    return value.slice(1);
  }
  return value;
}

function cellValue(row: (string | number | null | undefined)[], index: number) {
  const value = row[index];
  if (value === undefined || value === null) return '';
  return unescapeSheetsFormula(String(value).trim());
}

function buildApplicantRecordFromRow(row: (string | number | null | undefined)[]): ApplicantRow & {
  timestamp: string;
  legacyApplicantId: string;
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
    legacyApplicantId: cellValue(row, LEGACY_APPLICANT_ID_COLUMN_INDEX),
  };
}

function buildApplicantRecordFromHeaderMap(
  headerMap: Map<string, number>,
  row: (string | number | null | undefined)[],
): ApplicantRow & { timestamp: string; legacyApplicantId: string } {
  return {
    id: getHeaderValue(headerMap, row, 'iRAIN'),
    timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
    firstName: getHeaderValue(headerMap, row, 'First Name'),
    middleName: getHeaderValue(headerMap, row, 'Middle Name'),
    familyName: getHeaderValue(headerMap, row, 'Family Name'),
    email: getHeaderValue(headerMap, row, 'Email'),
    phone: getHeaderValue(headerMap, row, 'Phone'),
    locatedCanada: getHeaderValue(headerMap, row, 'Located in Canada'),
    province: getHeaderValue(headerMap, row, 'Province'),
    authorizedCanada: getHeaderValue(headerMap, row, 'Work Authorization'),
    eligibleMoveCanada: getHeaderValue(headerMap, row, 'Eligible to Move (6 Months)'),
    countryOfOrigin: getHeaderValue(headerMap, row, 'Country of Origin'),
    languages: getHeaderValue(headerMap, row, 'Languages'),
    languagesOther: getHeaderValue(headerMap, row, 'Languages Other'),
    industryType: getHeaderValue(headerMap, row, 'Industry Type'),
    industryOther: getHeaderValue(headerMap, row, 'Industry Other'),
    employmentStatus: getHeaderValue(headerMap, row, 'Employment Status'),
    legacyApplicantId: getHeaderValue(headerMap, row, LEGACY_APPLICANT_ID_HEADER),
    applicantSecretHash: getHeaderValue(headerMap, row, APPLICANT_SECRET_HASH_HEADER),
    updateTokenHash: getHeaderValue(headerMap, row, APPLICANT_UPDATE_TOKEN_HASH_HEADER),
    updateTokenExpiresAt: getHeaderValue(headerMap, row, APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER),
    updatePendingPayload: getHeaderValue(headerMap, row, APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER),
    registrationStatus: getHeaderValue(headerMap, row, APPLICANT_REGISTRATION_STATUS_HEADER) || undefined,
    resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name') || undefined,
    resumeFileId: getHeaderValue(headerMap, row, 'Resume File ID') || undefined,
    resumeUrl: getHeaderValue(headerMap, row, 'Resume URL') || undefined,
    archived: getHeaderValue(headerMap, row, 'Archived') || undefined,
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

async function appendLegacyApplicantHeaderIfMissing(
  sheetName: string,
  firstRow: string[],
  spreadsheetId: string,
  sheets: ReturnType<typeof getSheetsClient>,
) {
  if (sheetName !== APPLICANT_SHEET_NAME) {
    return { headers: firstRow, appended: false };
  }

  const hasLegacyHeader = firstRow.includes(LEGACY_APPLICANT_ID_HEADER);
  if (!firstRow.length || hasLegacyHeader) {
    return { headers: firstRow, appended: false };
  }

  const nextColumnIndex = firstRow.length;
  const nextColumnLetter = toColumnLetter(nextColumnIndex);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!${nextColumnLetter}1`,
    valueInputOption: 'RAW',
    requestBody: { majorDimension: 'ROWS', values: [[LEGACY_APPLICANT_ID_HEADER]] },
  });

  const updatedHeaders = [...firstRow];
  updatedHeaders[nextColumnIndex] = LEGACY_APPLICANT_ID_HEADER;

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

  const legacyHeaderResult = await appendLegacyApplicantHeaderIfMissing(
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
  // Cache the headers to avoid redundant fetches in list functions
  const finalHeaders = await getCachedHeaders(sheetName);
  if (finalHeaders.length) {
    headersCache.set(sheetName, finalHeaders);
  }
  await ensureAdminColumnsForSheet(sheetName);
  return { created: createdSheet };
}

/**
 * Escape Google Sheets formula injection by prefixing dangerous characters with a single quote.
 * Formulas in Sheets begin with: = + - @
 * If a value (after trimming leading whitespace) starts with one of these, prefix with '.
 */
function escapeSheetsFormula(value: string): string {
  if (!value) return value;
  const trimmed = value.trimStart();
  // Already escaped
  if (trimmed.startsWith("'")) return value;
  // Dangerous formula characters
  if (/^[=+\-@]/.test(trimmed)) return "'" + value;
  return value;
}

/**
 * Sanitize a cell value before writing to Google Sheets.
 * - null/undefined -> ""
 * - number -> as-is
 * - string -> escape formula injection
 */
function sanitizeSheetsCell(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  return escapeSheetsFormula(value);
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
      values: [values.map((value) => sanitizeSheetsCell(value))],
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
  return await fetchMaxIrainFromSheet(APPLICANT_SHEET_NAME, spreadsheetId);
}

async function getMaxExistingIrainNumber(spreadsheetId: string) {
  return fetchMaxIrainFromSheet(APPLICANT_SHEET_NAME, spreadsheetId);
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
  const maxReferrers = await getMaxIrcrnFromReferrers(spreadsheetId);
  const next = maxReferrers + 1;
  return `iRCRN${String(next).padStart(10, '0')}`;
}

export async function appendApplicantRow(row: ApplicantRow) {
  await upsertApplicantRow(row);
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
  await ensureColumns(APPLICATION_SHEET_NAME, ['Resume File ID']);

  // Read current headers from the sheet to handle column reordering
  const headers = await getSheetHeaders(APPLICATION_SHEET_NAME);
  const headerMap = buildHeaderMap(headers);

  // Build row values array by header name (not positional index)
  const rowValues: (string | number | null)[] = new Array(headers.length).fill('');
  const timestamp = new Date().toISOString();

  setByHeader(rowValues, headerMap, 'ID', row.id);
  setByHeader(rowValues, headerMap, 'Timestamp', timestamp);
  setByHeader(rowValues, headerMap, 'Applicant ID', row.applicantId);
  setByHeader(rowValues, headerMap, 'iRCRN', row.iCrn);
  setByHeader(rowValues, headerMap, 'Position', row.position);
  setByHeader(rowValues, headerMap, 'Reference Number', row.referenceNumber);
  setByHeader(rowValues, headerMap, 'Resume File Name', row.resumeFileName);
  setByHeader(rowValues, headerMap, 'Resume URL', '');
  setByHeader(rowValues, headerMap, 'Resume File ID', row.resumeFileId ?? '');
  setByHeader(rowValues, headerMap, 'Referrer iRREF', row.referrerIrref ?? '');
  setByHeader(rowValues, headerMap, 'Referrer Email', row.referrerEmail ?? '');
  setByHeader(rowValues, headerMap, 'Referrer Company ID', row.referrerCompanyId ?? '');
  setByHeader(rowValues, headerMap, 'Status', row.status ?? '');
  setByHeader(rowValues, headerMap, 'Owner Notes', '');

  await appendRow(APPLICATION_SHEET_NAME, rowValues);
}

function buildApplicantRowValues(
  row: ApplicantRow,
  id: string,
  timestamp: string,
  legacyApplicantId?: string,
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
    legacyApplicantId ?? row.legacyApplicantId ?? '',
  ];
}

async function findApplicantRowByEmail(email: string) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const sheets = getSheetsClient();
  const normalizedEmail = email.trim().toLowerCase();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const emailIndex = headerIndex(headers, 'Email');
  const idIndex = headerIndex(headers, 'iRAIN');
  const legacyIndex = headerIndex(headers, LEGACY_APPLICANT_ID_HEADER);
  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const rows = existing.data.values ?? [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const rowEmail = cellValue(row, emailIndex === -1 ? APPLICANT_EMAIL_COLUMN_INDEX : emailIndex).toLowerCase();
    if (rowEmail && rowEmail === normalizedEmail) {
      return {
        rowIndex: index + 1, // 1-based for Google Sheets
        id: cellValue(row, idIndex === -1 ? 0 : idIndex),
        legacyApplicantId: cellValue(row, legacyIndex === -1 ? LEGACY_APPLICANT_ID_COLUMN_INDEX : legacyIndex),
      };
    }
  }

  return null;
}

export async function findApplicantByIdentifier(identifier: string): Promise<ApplicantLookupResult | null> {
  const searchValue = identifier.trim();
  if (!searchValue) return null;

  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  await ensureColumns(APPLICANT_SHEET_NAME, APPLICANT_SECURITY_COLUMNS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const searchByIrain = isIrain(searchValue);
  const normalized = searchValue.toLowerCase();
  const irainIndex = headerIndex(headers, 'iRAIN');
  const legacyIndex = headerIndex(headers, LEGACY_APPLICANT_ID_HEADER);

  const rows = existing.data.values ?? [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const irain = cellValue(row, irainIndex === -1 ? 0 : irainIndex).toLowerCase();
    const legacy = cellValue(row, legacyIndex === -1 ? LEGACY_APPLICANT_ID_COLUMN_INDEX : legacyIndex).toLowerCase();
    const matches = searchByIrain ? irain === normalized : legacy === normalized;
    if (matches) {
      return {
        rowIndex: index + 1,
        record: buildApplicantRecordFromHeaderMap(headerMap, row),
      };
    }
  }

  return null;
}

export async function getApplicantByEmail(email: string): Promise<ApplicantLookupResult | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  await ensureColumns(APPLICANT_SHEET_NAME, APPLICANT_SECURITY_COLUMNS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const emailIndex = headerIndex(headers, 'Email');
  const rows = existing.data.values ?? [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const rowEmail = cellValue(row, emailIndex === -1 ? APPLICANT_EMAIL_COLUMN_INDEX : emailIndex).toLowerCase();
    if (rowEmail && rowEmail === normalizedEmail) {
      return {
        rowIndex: index + 1,
        record: buildApplicantRecordFromHeaderMap(headerMap, row),
      };
    }
  }

  return null;
}

export async function getApplicantByRowIndex(rowIndex: number): Promise<ApplicantLookupResult | null> {
  if (!Number.isFinite(rowIndex) || rowIndex < 2) return null;

  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  await ensureColumns(APPLICANT_SHEET_NAME, APPLICANT_SECURITY_COLUMNS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const rowRange = `${APPLICANT_SHEET_NAME}!A${rowIndex}:${lastCol}${rowIndex}`;

  const rowResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: rowRange,
    majorDimension: 'ROWS',
  });
  const row = rowResponse.data.values?.[0] ?? [];
  if (!row.length) return null;

  return {
    rowIndex,
    record: buildApplicantRecordFromHeaderMap(headerMap, row),
  };
}

/**
 * Find an existing applicant if at least 2 of 3 fields match:
 * - name (firstName + familyName)
 * - email
 * - phone
 */
const normalizePhoneForMatch = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
};

export async function findExistingApplicant(
  firstName: string,
  familyName: string,
  email: string,
  phone: string,
): Promise<ApplicantLookupResult | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhoneForMatch(phone);
  const normalizedFirstName = firstName.trim().toLowerCase();
  const normalizedFamilyName = familyName.trim().toLowerCase();

  // Must have at least 2 fields to match
  const providedFieldCount =
    (normalizedEmail ? 1 : 0) +
    (normalizedPhone.length >= 7 ? 1 : 0) +
    (normalizedFirstName && normalizedFamilyName ? 1 : 0);

  if (providedFieldCount < 2) {
    return null;
  }

  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  await ensureColumns(APPLICANT_SHEET_NAME, APPLICANT_SECURITY_COLUMNS);
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const firstNameIdx = headerIndex(headers, 'First Name');
  const familyNameIdx = headerIndex(headers, 'Family Name');
  const emailIdx = headerIndex(headers, 'Email');
  const phoneIdx = headerIndex(headers, 'Phone');

  const rows = existing.data.values ?? [];
  for (let index = 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    if (!row.length) continue;

    const rowEmail = cellValue(row, emailIdx === -1 ? APPLICANT_EMAIL_COLUMN_INDEX : emailIdx).toLowerCase();
    const rowPhone = normalizePhoneForMatch(cellValue(row, phoneIdx === -1 ? 6 : phoneIdx));
    const rowFirstName = cellValue(row, firstNameIdx === -1 ? 2 : firstNameIdx).toLowerCase();
    const rowFamilyName = cellValue(row, familyNameIdx === -1 ? 4 : familyNameIdx).toLowerCase();

    // Check how many fields match
    let matchCount = 0;

    // Name match (both first and family must match)
    const nameMatches = rowFirstName === normalizedFirstName && rowFamilyName === normalizedFamilyName;
    if (nameMatches && normalizedFirstName && normalizedFamilyName) matchCount++;

    // Email match
    const emailMatches = rowEmail === normalizedEmail && normalizedEmail !== '';
    if (emailMatches) matchCount++;

    // Phone match (only if both have phone numbers with at least 7 digits)
    const phoneMatches = rowPhone === normalizedPhone && normalizedPhone.length >= 7;
    if (phoneMatches) matchCount++;

    // If at least 2 of 3 match, this is an existing candidate
    if (matchCount >= 2) {
      return {
        rowIndex: index + 1, // 1-indexed for Sheets API
        record: buildApplicantRecordFromHeaderMap(headerMap, row),
      };
    }
  }

  return null;
}

export async function upsertApplicantRow(row: ApplicantRow) {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('Missing Google Sheets spreadsheet ID. Please set GOOGLE_SHEETS_SPREADSHEET_ID.');
  }

  const timestamp = new Date().toISOString();
  const existing = await findApplicantRowByEmail(row.email);
  const providedLegacyId = row.legacyApplicantId ?? '';

  if (existing) {
    const isExistingIrain = IRAIN_REGEX.test(existing.id);
    const idToUse = isExistingIrain ? existing.id : row.id;
    const legacyApplicantId =
      (isExistingIrain ? existing.legacyApplicantId : existing.legacyApplicantId || existing.id) ??
      providedLegacyId;
    await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', existing.id, {
      iRAIN: idToUse,
      Timestamp: timestamp,
      'First Name': row.firstName,
      'Middle Name': row.middleName,
      'Family Name': row.familyName,
      Email: row.email,
      Phone: row.phone,
      'Located in Canada': row.locatedCanada,
      Province: row.province,
      'Work Authorization': row.authorizedCanada,
      'Eligible to Move (6 Months)': row.eligibleMoveCanada,
      'Country of Origin': row.countryOfOrigin,
      Languages: row.languages,
      'Languages Other': row.languagesOther,
      'Industry Type': row.industryType,
      'Industry Other': row.industryOther,
      'Employment Status': row.employmentStatus,
      [LEGACY_APPLICANT_ID_HEADER]: legacyApplicantId,
    });

    return { id: idToUse, wasUpdated: true, legacyApplicantId };
  }

  const legacyApplicantId = providedLegacyId;
  await appendRow(
    APPLICANT_SHEET_NAME,
    buildApplicantRowValues(row, row.id, timestamp, legacyApplicantId),
  );
  return { id: row.id, wasUpdated: false, legacyApplicantId };
}

export async function migrateLegacyApplicantIds() {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const values = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!A:${CANDIDATE_LAST_COLUMN_LETTER}`,
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
    const legacyValue = cellValue(row, LEGACY_APPLICANT_ID_COLUMN_INDEX) || currentId;
    const newIrain = formatIrainNumber(nextNumber++);

    updates.push({ rowIndex, from: currentId, to: newIrain, legacy: legacyValue });
    data.push({ range: `${APPLICANT_SHEET_NAME}!A${rowIndex}`, values: [[newIrain]] });
    data.push({
      range: `${APPLICANT_SHEET_NAME}!${LEGACY_CANDIDATE_ID_COLUMN_LETTER}${rowIndex}`,
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
    await applyProSheetFormatting(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  } catch (error) {
    console.error('Applicant sheet formatting failed after migration (non-fatal):', error);
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
  if (sheetName === APPLICANT_SHEET_NAME) {
    return ensureColumns(sheetName, [...ADMIN_TRACKING_COLUMNS, ...APPLICANT_SECURITY_COLUMNS, ...ARCHIVE_COLUMNS]);
  }

  if (sheetName === REFERRER_SHEET_NAME) {
    return ensureColumns(sheetName, [...ADMIN_TRACKING_COLUMNS, ...REFERRER_SECURITY_COLUMNS, ...ARCHIVE_COLUMNS]);
  }

  if (sheetName === APPLICATION_SHEET_NAME) {
    return ensureColumns(sheetName, [...APPLICATION_ADMIN_COLUMNS, ...ARCHIVE_COLUMNS]);
  }

  return { appended: [], headers: [] };
}

export async function ensureColumns(
  sheetName: string,
  requiredHeaders: string[],
): Promise<{ appended: string[]; headers: string[] }> {
  if (!requiredHeaders.length) {
    return { appended: [], headers: headersCache.get(sheetName) ?? [] };
  }

  // Use cached headers if available, otherwise fetch
  const existingHeaders = await getCachedHeaders(sheetName);
  const existingSet = new Set(existingHeaders.map((header) => header.trim()));
  const missing = requiredHeaders.filter((header) => !existingSet.has(header));

  if (!missing.length) {
    return { appended: [], headers: existingHeaders };
  }

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const updatedHeaders = [...existingHeaders, ...missing];
  const headerRange = `${sheetName}!A1:${toColumnLetter(updatedHeaders.length - 1)}1`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: headerRange,
    valueInputOption: 'RAW',
    requestBody: { majorDimension: 'ROWS', values: [updatedHeaders] },
  });

  // Update the cache with new headers
  headersCache.set(sheetName, updatedHeaders);

  try {
    await applyProSheetFormatting(sheetName, updatedHeaders);
  } catch (error) {
    console.error('Sheet formatting failed (non-fatal):', error);
  }

  return { appended: missing, headers: updatedHeaders };
}

type ApplicantListParams = {
  search?: string;
  status?: string;
  eligible?: boolean;
  locatedCanada?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
};

type ReferrerListParams = {
  search?: string;
  status?: string;
  company?: string;
  approval?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
};

type ApplicationListParams = {
  search?: string;
  status?: string;
  ircrn?: string;
  referrerIrref?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
};

type ApplicationListItem = {
  id: string;
  timestamp: string;
  applicantId: string;
  iCrn: string;
  position: string;
  referenceNumber: string;
  resumeFileName: string;
  resumeFileId: string;
  referrerIrref: string;
  referrerEmail: string;
  referrerCompanyId: string;
  status: string;
  ownerNotes: string;
  meetingDate: string;
  meetingTime: string;
  meetingTimezone: string;
  meetingUrl: string;
  actionHistory: string;
  rescheduleTokenHash: string;
  rescheduleTokenExpiresAt: string;
  updateRequestTokenHash: string;
  updateRequestExpiresAt: string;
  updateRequestPurpose: string;
  missingFields: string[];
  archived: string;
  archivedAt: string;
  archivedBy: string;
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

function setByHeader(
  rowValues: (string | number | null)[],
  headerMap: Map<string, number>,
  headerName: string,
  value: string | number | null | undefined,
) {
  const index = headerMap.get(headerName.trim());
  if (index !== undefined && index >= 0 && index < rowValues.length) {
    rowValues[index] = value ?? '';
  }
}

async function getSheetHeaders(sheetName: string): Promise<string[]> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
    majorDimension: 'ROWS',
  });
  const headerRow = response.data.values?.[0] ?? [];
  return headerRow.map((h) => String(h ?? '').trim());
}

function paginate<T>(items: T[], offset?: number, limit?: number) {
  const safeOffset = Number.isFinite(offset) && offset && offset > 0 ? offset : 0;
  if (limit === 0) return items.slice(safeOffset);
  const safeLimit = Number.isFinite(limit) && limit && limit > 0 ? limit : DEFAULT_LIMIT;
  return items.slice(safeOffset, safeOffset + safeLimit);
}

function normalizeSearch(value?: string) {
  return value ? value.trim().toLowerCase() : '';
}

export async function listApplicants(params: ApplicantListParams) {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  // Use cached headers + single data fetch
  const { headers, rows } = await getSheetDataWithHeaders(APPLICANT_SHEET_NAME);
  if (!headers.length) return { total: 0, items: [] as unknown[] };

  const headerMap = buildHeaderMap(headers);
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
        legacyApplicantId: getHeaderValue(headerMap, row, LEGACY_APPLICANT_ID_HEADER),
        status: getHeaderValue(headerMap, row, 'Status'),
        registrationStatus: getHeaderValue(headerMap, row, APPLICANT_REGISTRATION_STATUS_HEADER),
        ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        tags: getHeaderValue(headerMap, row, 'Tags'),
        lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
        nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
        eligibility: {
          eligible,
          reason: eligibilityReason,
        },
        missingFields,
        archived: getHeaderValue(headerMap, row, 'Archived'),
        archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt'),
        archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy'),
      };

      return record;
    })
    .filter((record) => {
      // Filter out archived records by default
      if (!params.includeArchived && record.archived === 'true') return false;

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
  await ensureColumns(REFERRER_SHEET_NAME, ['Company iRCRN', 'Company Approval', REFERRER_PENDING_UPDATES_HEADER]);

  // Use cached headers + single data fetch
  const { headers, rows } = await getSheetDataWithHeaders(REFERRER_SHEET_NAME);
  if (!headers.length) return { total: 0, items: [] as unknown[] };

  const headerMap = buildHeaderMap(headers);

  // Fetch referrer companies to count pending companies per referrer
  await ensureHeaders(REFERRER_COMPANIES_SHEET_NAME, REFERRER_COMPANIES_HEADERS);
  const companiesData = await getSheetDataWithHeaders(REFERRER_COMPANIES_SHEET_NAME);
  const companiesHeaderMap = buildHeaderMap(companiesData.headers);
  const pendingCompanyCountMap = new Map<string, number>();
  const companyNameMap = new Map<string, string[]>();

  const addCompanyName = (referrerIrref: string, companyName: string) => {
    const trimmedName = companyName.trim();
    if (!trimmedName) return;
    const existing = companyNameMap.get(referrerIrref) ?? [];
    const normalizedName = trimmedName.toLowerCase();
    if (!existing.some((value) => value.toLowerCase() === normalizedName)) {
      existing.push(trimmedName);
      companyNameMap.set(referrerIrref, existing);
    }
  };

  for (const companyRow of companiesData.rows) {
    const referrerIrref = getHeaderValue(companiesHeaderMap, companyRow, 'Referrer iRREF').trim().toLowerCase();
    if (!referrerIrref) continue;
    const approval = getHeaderValue(companiesHeaderMap, companyRow, 'Company Approval').toLowerCase();
    const archived = getHeaderValue(companiesHeaderMap, companyRow, 'Archived');

    if (archived === 'true') continue;

    addCompanyName(referrerIrref, getHeaderValue(companiesHeaderMap, companyRow, 'Company Name'));
    if (approval === 'pending' || approval === '') {
      pendingCompanyCountMap.set(referrerIrref, (pendingCompanyCountMap.get(referrerIrref) || 0) + 1);
    }
  }
  const searchTerm = normalizeSearch(params.search);
  const statusFilter = normalizeSearch(params.status);
  const companyFilter = normalizeSearch(params.company);
  const approvalFilter = normalizeSearch(params.approval);

  const items = rows
    .map((row) => {
      const missingFields: string[] = [];
      const irref = getHeaderValue(headerMap, row, 'iRREF');
      const legacyCompany = getHeaderValue(headerMap, row, 'Company');
      if (!getHeaderValue(headerMap, row, 'Email')) missingFields.push('Email');
      if (!getHeaderValue(headerMap, row, 'Phone')) missingFields.push('Phone');
      if (!legacyCompany) missingFields.push('Company');
      if (!getHeaderValue(headerMap, row, 'Careers Portal')) missingFields.push('Careers Portal');

      // Check for pending updates
      const pendingUpdatesRaw = getHeaderValue(headerMap, row, REFERRER_PENDING_UPDATES_HEADER);
      let pendingUpdateCount = 0;
      if (pendingUpdatesRaw) {
        try {
          const updates = JSON.parse(pendingUpdatesRaw);
          if (Array.isArray(updates)) {
            pendingUpdateCount = updates.filter((u: PendingReferrerUpdate) => u.status === 'pending').length;
          }
        } catch {
          // ignore parse errors
        }
      }

      const normalizedIrref = irref.trim().toLowerCase();
      const companies = [...(companyNameMap.get(normalizedIrref) ?? [])];
      const trimmedLegacyCompany = legacyCompany.trim();
      if (trimmedLegacyCompany) {
        const hasLegacy = companies.some((value) => value.toLowerCase() === trimmedLegacyCompany.toLowerCase());
        if (!hasLegacy) {
          companies.push(trimmedLegacyCompany);
        }
      }

      return {
        irref,
        timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
        name: getHeaderValue(headerMap, row, 'Name'),
        email: getHeaderValue(headerMap, row, 'Email'),
        phone: getHeaderValue(headerMap, row, 'Phone'),
        country: getHeaderValue(headerMap, row, 'Country'),
        company: legacyCompany,
        companies,
        companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
        companyApproval: getHeaderValue(headerMap, row, 'Company Approval'),
        companyIndustry: getHeaderValue(headerMap, row, 'Company Industry'),
        careersPortal: getHeaderValue(headerMap, row, 'Careers Portal'),
        workType: getHeaderValue(headerMap, row, 'Work Type'),
        linkedin: getHeaderValue(headerMap, row, 'LinkedIn'),
        portalTokenVersion: getHeaderValue(headerMap, row, REFERRER_PORTAL_TOKEN_VERSION_HEADER),
        pendingUpdates: pendingUpdatesRaw,
        pendingUpdateCount,
        pendingCompanyCount: pendingCompanyCountMap.get(normalizedIrref) || 0,
        status: getHeaderValue(headerMap, row, 'Status'),
        ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        tags: getHeaderValue(headerMap, row, 'Tags'),
        lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
        nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
        missingFields,
        archived: getHeaderValue(headerMap, row, 'Archived'),
        archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt'),
        archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy'),
      };
    })
    .filter((record) => {
      // Filter out archived records by default
      if (!params.includeArchived && record.archived === 'true') return false;

      if (searchTerm) {
        const haystack = [
          record.irref,
          record.email,
          record.name,
          record.phone,
          record.country,
          record.companyIndustry,
          record.workType,
          record.tags,
          record.ownerNotes,
          ...(record.companies ?? []),
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
      if (companyFilter) {
        const companyMatches = (record.companies ?? [])
          .some((company) => company.toLowerCase().includes(companyFilter));
        if (!companyMatches) return false;
      }
      return true;
    });

  const ordered = items.sort((a, b) => {
    // Check if records are "pending" (either first-time approval, pending updates, or pending companies)
    const aIsPending = (a.companyApproval === 'pending' || !a.companyApproval) || (a.pendingUpdateCount && a.pendingUpdateCount > 0) || (a.pendingCompanyCount && a.pendingCompanyCount > 0);
    const bIsPending = (b.companyApproval === 'pending' || !b.companyApproval) || (b.pendingUpdateCount && b.pendingUpdateCount > 0) || (b.pendingCompanyCount && b.pendingCompanyCount > 0);

    // Pending records come first
    if (aIsPending && !bIsPending) return -1;
    if (!aIsPending && bIsPending) return 1;

    // Within same pending status, sort by timestamp (newest first)
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

  // Use cached headers + single data fetch
  const { headers, rows } = await getSheetDataWithHeaders(REFERRER_SHEET_NAME);
  if (!headers.length) return [];

  const headerMap = buildHeaderMap(headers);
  const items: CompanyRow[] = [];

  for (const row of rows) {
    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    if (approval !== 'approved') continue;

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
  archived?: string;
};

type ReferrerLookupErrorCode =
  | 'missing_ircrn'
  | 'invalid_ircrn'
  | 'not_found'
  | 'duplicate'
  | 'missing_email'
  | 'invalid_irref';

export class ReferrerLookupError extends Error {
  code: ReferrerLookupErrorCode;

  constructor(code: ReferrerLookupErrorCode, message: string) {
    super(message);
    this.name = 'ReferrerLookupError';
    this.code = code;
  }
}

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

  const pickRecord = (row: (string | number | null | undefined)[]) => ({
    irref: getHeaderValue(headerMap, row, 'iRREF'),
    name: getHeaderValue(headerMap, row, 'Name'),
    email: getHeaderValue(headerMap, row, 'Email'),
    phone: getHeaderValue(headerMap, row, 'Phone'),
    company: getHeaderValue(headerMap, row, 'Company'),
    companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
    archived: getHeaderValue(headerMap, row, 'Archived'),
  });

  const isApproved = (row: (string | number | null | undefined)[]) => {
    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    return approval === '' || approval === 'approved';
  };

  const isArchived = (row: (string | number | null | undefined)[]) => {
    return getHeaderValue(headerMap, row, 'Archived').toLowerCase() === 'true';
  };

  for (const row of rows) {
    const rowIrcrn = getHeaderValue(headerMap, row, 'Company iRCRN').toLowerCase();
    if (rowIrcrn && rowIrcrn === normalizedIrcrn) {
      if (!isApproved(row) || isArchived(row)) continue;
      const record = pickRecord(row);
      if (record.email) return record;
    }
  }

  return null;
}

export async function findReferrerByIrcrnStrict(ircrn: string): Promise<ReferrerLookupResult> {
  const normalizedIrcrn = ircrn.trim().toLowerCase();
  if (!normalizedIrcrn) {
    throw new ReferrerLookupError('missing_ircrn', 'Missing iRCRN.');
  }
  if (!isIrcrn(ircrn)) {
    throw new ReferrerLookupError('invalid_ircrn', 'Invalid iRCRN format.');
  }

  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ['Company iRCRN', 'Company Approval']);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();
  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) {
    throw new ReferrerLookupError('not_found', 'Referrer sheet is missing headers.');
  }

  const lastCol = toColumnLetter(headers.length - 1);
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${REFERRER_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const headerMap = buildHeaderMap(headers);
  const rows = (existing.data.values ?? []).slice(1);

  const pickRecord = (row: (string | number | null | undefined)[]) => ({
    irref: getHeaderValue(headerMap, row, 'iRREF'),
    name: getHeaderValue(headerMap, row, 'Name'),
    email: getHeaderValue(headerMap, row, 'Email'),
    phone: getHeaderValue(headerMap, row, 'Phone'),
    company: getHeaderValue(headerMap, row, 'Company'),
    companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN'),
    archived: getHeaderValue(headerMap, row, 'Archived'),
  });

  const isApproved = (row: (string | number | null | undefined)[]) => {
    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    return approval === '' || approval === 'approved';
  };

  const isArchived = (row: (string | number | null | undefined)[]) => {
    return getHeaderValue(headerMap, row, 'Archived').toLowerCase() === 'true';
  };

  const matches = rows
    .filter((row) => {
      const rowIrcrn = getHeaderValue(headerMap, row, 'Company iRCRN').toLowerCase();
      return rowIrcrn && rowIrcrn === normalizedIrcrn && isApproved(row) && !isArchived(row);
    })
    .map((row) => pickRecord(row));

  if (!matches.length) {
    throw new ReferrerLookupError('not_found', 'No approved referrer found for this iRCRN.');
  }
  if (matches.length > 1) {
    throw new ReferrerLookupError(
      'duplicate',
      'Multiple referrers found for this iRCRN. Please resolve duplicates in the Referrers sheet.',
    );
  }

  const record = matches[0];
  if (!record.email) {
    throw new ReferrerLookupError('missing_email', 'Referrer is missing an email address.');
  }
  if (!record.irref || !isIrref(record.irref)) {
    throw new ReferrerLookupError('invalid_irref', 'Referrer is missing a valid iRREF.');
  }

  return record;
}

export async function listApplications(
  params: ApplicationListParams,
): Promise<{ total: number; items: ApplicationListItem[] }> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  await ensureColumns(APPLICATION_SHEET_NAME, ['Resume File ID']);

  // Use cached headers + single data fetch
  const { headers, rows } = await getSheetDataWithHeaders(APPLICATION_SHEET_NAME);
  if (!headers.length) return { total: 0, items: [] };

  const headerMap = buildHeaderMap(headers);
  const searchTerm = normalizeSearch(params.search);
  const statusFilter = normalizeSearch(params.status);
  const ircrnFilter = normalizeSearch(params.ircrn);
  const referrerFilter = normalizeSearch(params.referrerIrref);

  const items: ApplicationListItem[] = rows
    .map((row) => {
      const missingFields: string[] = [];
      if (!getHeaderValue(headerMap, row, 'Applicant ID')) missingFields.push('Applicant ID');
      if (!getHeaderValue(headerMap, row, 'iRCRN')) missingFields.push('iRCRN');
      if (!getHeaderValue(headerMap, row, 'Position')) missingFields.push('Position');

      return {
        id: getHeaderValue(headerMap, row, 'ID'),
        timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
        applicantId: getHeaderValue(headerMap, row, 'Applicant ID'),
        iCrn: getHeaderValue(headerMap, row, 'iRCRN'),
        position: getHeaderValue(headerMap, row, 'Position'),
        referenceNumber: getHeaderValue(headerMap, row, 'Reference Number'),
        resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name'),
        resumeFileId: getHeaderValue(headerMap, row, 'Resume File ID'),
        referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
        referrerEmail: getHeaderValue(headerMap, row, 'Referrer Email'),
        referrerCompanyId: getHeaderValue(headerMap, row, 'Referrer Company ID'),
        status: getHeaderValue(headerMap, row, 'Status'),
        ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
        meetingDate: getHeaderValue(headerMap, row, 'Meeting Date'),
        meetingTime: getHeaderValue(headerMap, row, 'Meeting Time'),
        meetingTimezone: getHeaderValue(headerMap, row, 'Meeting Timezone'),
        meetingUrl: getHeaderValue(headerMap, row, 'Meeting URL'),
        actionHistory: getHeaderValue(headerMap, row, 'Action History'),
        rescheduleTokenHash: getHeaderValue(headerMap, row, 'Reschedule Token Hash'),
        rescheduleTokenExpiresAt: getHeaderValue(headerMap, row, 'Reschedule Token Expires At'),
        updateRequestTokenHash: getHeaderValue(headerMap, row, 'Update Request Token Hash'),
        updateRequestExpiresAt: getHeaderValue(headerMap, row, 'Update Request Expires At'),
        updateRequestPurpose: getHeaderValue(headerMap, row, 'Update Request Purpose'),
        missingFields,
        archived: getHeaderValue(headerMap, row, 'Archived'),
        archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt'),
        archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy'),
      };
    })
    .filter((record) => {
      // Filter out archived records by default
      if (!params.includeArchived && record.archived === 'true') return false;

      if (searchTerm) {
        const haystack = [
          record.id,
          record.applicantId,
          record.iCrn,
          record.position,
          record.referenceNumber,
          record.ownerNotes,
          record.referrerEmail,
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
  await ensureColumns(APPLICATION_SHEET_NAME, ['Resume File ID']);
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
          applicantId: getHeaderValue(headerMap, row, 'Applicant ID'),
          iCrn: getHeaderValue(headerMap, row, 'iRCRN'),
          position: getHeaderValue(headerMap, row, 'Position'),
          referenceNumber: getHeaderValue(headerMap, row, 'Reference Number'),
          resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name'),
          resumeFileId: getHeaderValue(headerMap, row, 'Resume File ID'),
          referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
          referrerEmail: getHeaderValue(headerMap, row, 'Referrer Email'),
          status: getHeaderValue(headerMap, row, 'Status'),
          ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
          meetingDate: getHeaderValue(headerMap, row, 'Meeting Date'),
          meetingTime: getHeaderValue(headerMap, row, 'Meeting Time'),
          meetingTimezone: getHeaderValue(headerMap, row, 'Meeting Timezone'),
          meetingUrl: getHeaderValue(headerMap, row, 'Meeting URL'),
          actionHistory: getHeaderValue(headerMap, row, 'Action History'),
          rescheduleTokenHash: getHeaderValue(headerMap, row, 'Reschedule Token Hash'),
          rescheduleTokenExpiresAt: getHeaderValue(headerMap, row, 'Reschedule Token Expires At'),
          updateRequestTokenHash: getHeaderValue(headerMap, row, 'Update Request Token Hash'),
          updateRequestExpiresAt: getHeaderValue(headerMap, row, 'Update Request Expires At'),
          updateRequestPurpose: getHeaderValue(headerMap, row, 'Update Request Purpose'),
          archived: getHeaderValue(headerMap, row, 'Archived'),
          archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt'),
          archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy'),
        },
      };
    }
  }
  return null;
}

export async function findApplicationByRescheduleTokenHash(tokenHash: string) {
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

  const normalizedHash = tokenHash.trim().toLowerCase();
  const values = rows.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const rowHash = getHeaderValue(headerMap, row, 'Reschedule Token Hash').toLowerCase();
    if (rowHash && rowHash === normalizedHash) {
      return {
        rowIndex: i + 1,
        record: {
          id: getHeaderValue(headerMap, row, 'ID'),
          timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
          applicantId: getHeaderValue(headerMap, row, 'Applicant ID'),
          iCrn: getHeaderValue(headerMap, row, 'iRCRN'),
          position: getHeaderValue(headerMap, row, 'Position'),
          referenceNumber: getHeaderValue(headerMap, row, 'Reference Number'),
          resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name'),
          resumeFileId: getHeaderValue(headerMap, row, 'Resume File ID'),
          referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
          referrerEmail: getHeaderValue(headerMap, row, 'Referrer Email'),
          status: getHeaderValue(headerMap, row, 'Status'),
          ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
          meetingDate: getHeaderValue(headerMap, row, 'Meeting Date'),
          meetingTime: getHeaderValue(headerMap, row, 'Meeting Time'),
          meetingTimezone: getHeaderValue(headerMap, row, 'Meeting Timezone'),
          meetingUrl: getHeaderValue(headerMap, row, 'Meeting URL'),
          actionHistory: getHeaderValue(headerMap, row, 'Action History'),
          rescheduleTokenHash: getHeaderValue(headerMap, row, 'Reschedule Token Hash'),
          rescheduleTokenExpiresAt: getHeaderValue(headerMap, row, 'Reschedule Token Expires At'),
          updateRequestTokenHash: getHeaderValue(headerMap, row, 'Update Request Token Hash'),
          updateRequestExpiresAt: getHeaderValue(headerMap, row, 'Update Request Expires At'),
          updateRequestPurpose: getHeaderValue(headerMap, row, 'Update Request Purpose'),
          archived: getHeaderValue(headerMap, row, 'Archived'),
        },
      };
    }
  }
  return null;
}

type AdminPatch = {
  status?: string;
  ownerNotes?: string;
  tags?: string;
  lastContactedAt?: string;
  nextActionAt?: string;
};

type ApplicantPatch = AdminPatch & {
  firstName?: string;
  middleName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
  locatedCanada?: string;
  province?: string;
  workAuthorization?: string;
  eligibleMoveCanada?: string;
  countryOfOrigin?: string;
  languages?: string;
  languagesOther?: string;
  industryType?: string;
  industryOther?: string;
  employmentStatus?: string;
};

type ReferrerPatch = AdminPatch & {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  company?: string;
  companyIndustry?: string;
  careersPortal?: string;
  workType?: string;
  linkedin?: string;
};

type ApplicationAdminPatch = {
  status?: string;
  ownerNotes?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingTimezone?: string;
  meetingUrl?: string;
  actionHistory?: string;
  rescheduleTokenHash?: string;
  rescheduleTokenExpiresAt?: string;
  updateRequestTokenHash?: string;
  updateRequestExpiresAt?: string;
  updateRequestPurpose?: string;
  resumeFileId?: string;
  resumeFileName?: string;
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
        values: [[sanitizeSheetsCell(value)]],
      };
    })
    .filter(Boolean) as { range: string; values: (string | number)[][] }[];

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

export async function updateApplicantFields(irain: string, patch: ApplicantPatch) {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  return updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', irain, {
    'First Name': patch.firstName,
    'Middle Name': patch.middleName,
    'Family Name': patch.familyName,
    Email: patch.email,
    Phone: patch.phone,
    'Located in Canada': patch.locatedCanada,
    Province: patch.province,
    'Work Authorization': patch.workAuthorization,
    'Eligible to Move (6 Months)': patch.eligibleMoveCanada,
    'Country of Origin': patch.countryOfOrigin,
    Languages: patch.languages,
    'Languages Other': patch.languagesOther,
    'Industry Type': patch.industryType,
    'Industry Other': patch.industryOther,
    'Employment Status': patch.employmentStatus,
    Status: patch.status,
    'Owner Notes': patch.ownerNotes,
    Tags: patch.tags,
    'Last Contacted At': patch.lastContactedAt,
    'Next Action At': patch.nextActionAt,
  });
}

export async function updateReferrerFields(irref: string, patch: ReferrerPatch) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);

  return updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
    Name: patch.name,
    Email: patch.email,
    Phone: patch.phone,
    Country: patch.country,
    Company: patch.company,
    'Company Industry': patch.companyIndustry,
    'Careers Portal': patch.careersPortal,
    'Work Type': patch.workType,
    LinkedIn: patch.linkedin,
    Status: patch.status,
    'Owner Notes': patch.ownerNotes,
    Tags: patch.tags,
    'Last Contacted At': patch.lastContactedAt,
    'Next Action At': patch.nextActionAt,
  });
}

export async function updateApplicantAdmin(irain: string, patch: AdminPatch) {
  return updateApplicantFields(irain, patch);
}

export async function updateReferrerAdmin(irref: string, patch: AdminPatch) {
  return updateReferrerFields(irref, patch);
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
    'Meeting Date': patch.meetingDate,
    'Meeting Time': patch.meetingTime,
    'Meeting Timezone': patch.meetingTimezone,
    'Meeting URL': patch.meetingUrl,
    'Action History': patch.actionHistory,
    'Reschedule Token Hash': patch.rescheduleTokenHash,
    'Reschedule Token Expires At': patch.rescheduleTokenExpiresAt,
    'Update Request Token Hash': patch.updateRequestTokenHash,
    'Update Request Expires At': patch.updateRequestExpiresAt,
    'Update Request Purpose': patch.updateRequestPurpose,
    'Resume File ID': patch.resumeFileId,
    'Resume File Name': patch.resumeFileName,
  });
}

export async function getApplicantByIrain(irain: string) {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  const headerRow = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!1:1`,
  });
  const headers = headerRow.data.values?.[0] ?? [];
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const lastCol = toColumnLetter(headers.length - 1);
  const rows = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${APPLICANT_SHEET_NAME}!A:${lastCol}`,
    majorDimension: 'ROWS',
  });

  const normalized = irain.trim().toLowerCase();
  const irainIndex = headerIndex(headers, 'iRAIN');
  const values = rows.data.values ?? [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const rawValue = cellValue(row, irainIndex === -1 ? 0 : irainIndex).toLowerCase();
    if (rawValue !== normalized) continue;

    const locatedCanada = getHeaderValue(headerMap, row, 'Located in Canada');
    const eligibleMove = getHeaderValue(headerMap, row, 'Eligible to Move (6 Months)');
    const eligible =
      locatedCanada.trim().toLowerCase() === 'yes' || eligibleMove.trim().toLowerCase() === 'yes';
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

    return {
      rowIndex: i + 1,
      record: {
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
        legacyApplicantId: getHeaderValue(headerMap, row, LEGACY_APPLICANT_ID_HEADER),
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
        resumeFileName: getHeaderValue(headerMap, row, 'Resume File Name') || undefined,
        resumeFileId: getHeaderValue(headerMap, row, 'Resume File ID') || undefined,
        resumeUrl: getHeaderValue(headerMap, row, 'Resume URL') || undefined,
        archived: getHeaderValue(headerMap, row, 'Archived'),
        archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt'),
        archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy'),
      },
    };
  }

  return null;
}

export async function getReferrerByIrref(irref: string) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, REFERRER_SECURITY_COLUMNS);
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
          portalTokenVersion: getHeaderValue(headerMap, row, REFERRER_PORTAL_TOKEN_VERSION_HEADER),
          pendingUpdates: getHeaderValue(headerMap, row, REFERRER_PENDING_UPDATES_HEADER),
          status: getHeaderValue(headerMap, row, 'Status'),
          ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
          tags: getHeaderValue(headerMap, row, 'Tags'),
          lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
          nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
          archived: getHeaderValue(headerMap, row, 'Archived'),
          archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt'),
          archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy'),
        },
      };
    }
  }
  return null;
}

export async function getReferrerByEmail(email: string) {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, REFERRER_SECURITY_COLUMNS);
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
  const normalizedEmail = email.trim().toLowerCase();
  const emailColIndex = headerMap.get('Email');

  if (emailColIndex === undefined) return null;

  for (let i = 1; i < values.length; i++) {
    const row = values[i] ?? [];
    const value = cellValue(row, emailColIndex).toLowerCase();
    if (value === normalizedEmail) {
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
          portalTokenVersion: getHeaderValue(headerMap, row, REFERRER_PORTAL_TOKEN_VERSION_HEADER),
          pendingUpdates: getHeaderValue(headerMap, row, REFERRER_PENDING_UPDATES_HEADER),
          status: getHeaderValue(headerMap, row, 'Status'),
          ownerNotes: getHeaderValue(headerMap, row, 'Owner Notes'),
          tags: getHeaderValue(headerMap, row, 'Tags'),
          lastContactedAt: getHeaderValue(headerMap, row, 'Last Contacted At'),
          nextActionAt: getHeaderValue(headerMap, row, 'Next Action At'),
          archived: getHeaderValue(headerMap, row, 'Archived'),
        },
      };
    }
  }
  return null;
}

export type PendingReferrerUpdate = {
  id: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
  data: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    company?: string;
    companyIndustry?: string;
    careersPortal?: string;
    workType?: string;
    linkedin?: string;
  };
};

export async function addPendingUpdate(
  irref: string,
  updateData: PendingReferrerUpdate['data'],
): Promise<{ success: boolean }> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PENDING_UPDATES_HEADER]);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { success: false };
  }

  // Parse existing pending updates
  const existingUpdatesRaw = referrer.record.pendingUpdates || '';
  let pendingUpdates: PendingReferrerUpdate[] = [];

  if (existingUpdatesRaw) {
    try {
      pendingUpdates = JSON.parse(existingUpdatesRaw);
      if (!Array.isArray(pendingUpdates)) {
        pendingUpdates = [];
      }
    } catch {
      pendingUpdates = [];
    }
  }

  // Add new update
  const newUpdate: PendingReferrerUpdate = {
    id: `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: 'pending',
    data: updateData,
  };

  pendingUpdates.push(newUpdate);

  // Store back as JSON
  const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
    [REFERRER_PENDING_UPDATES_HEADER]: JSON.stringify(pendingUpdates),
  });

  return { success: result.updated };
}

export async function updatePendingUpdateStatus(
  irref: string,
  updateId: string,
  newStatus: 'approved' | 'denied',
): Promise<{ success: boolean; update?: PendingReferrerUpdate }> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, [REFERRER_PENDING_UPDATES_HEADER]);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { success: false };
  }

  const existingUpdatesRaw = referrer.record.pendingUpdates || '';
  let pendingUpdates: PendingReferrerUpdate[] = [];

  if (existingUpdatesRaw) {
    try {
      pendingUpdates = JSON.parse(existingUpdatesRaw);
      if (!Array.isArray(pendingUpdates)) {
        return { success: false };
      }
    } catch {
      return { success: false };
    }
  }

  // Find and update the specific update
  const updateIndex = pendingUpdates.findIndex((u) => u.id === updateId);
  if (updateIndex === -1) {
    return { success: false };
  }

  pendingUpdates[updateIndex].status = newStatus;
  const updatedUpdate = pendingUpdates[updateIndex];

  // Store back as JSON
  const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
    [REFERRER_PENDING_UPDATES_HEADER]: JSON.stringify(pendingUpdates),
  });

  return { success: result.updated, update: updatedUpdate };
}

export async function deleteReferrerByIrref(
  irref: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'error' }> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { success: false, reason: 'not_found' };
  }

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  // Get the sheetId for the Referrers sheet
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = doc.data.sheets?.find(
    (sheet) => sheet.properties?.title === REFERRER_SHEET_NAME,
  );
  const sheetId = targetSheet?.properties?.sheetId;

  if (sheetId === undefined) {
    console.error(`Unable to find sheet "${REFERRER_SHEET_NAME}" for deletion.`);
    return { success: false, reason: 'error' };
  }

  try {
    // Delete the row using batchUpdate with deleteDimension
    // rowIndex is 1-indexed, but the API uses 0-indexed startIndex
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: referrer.rowIndex - 1, // Convert to 0-indexed
                endIndex: referrer.rowIndex, // End is exclusive
              },
            },
          },
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting referrer row', error);
    return { success: false, reason: 'error' };
  }
}

export async function deleteApplicantByIrain(
  irain: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'error' }> {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const applicant = await getApplicantByIrain(irain);
  if (!applicant) {
    return { success: false, reason: 'not_found' };
  }

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  // Get the sheetId for the Applicants sheet
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = doc.data.sheets?.find(
    (sheet) => sheet.properties?.title === APPLICANT_SHEET_NAME,
  );
  const sheetId = targetSheet?.properties?.sheetId;

  if (sheetId === undefined) {
    console.error(`Unable to find sheet "${APPLICANT_SHEET_NAME}" for deletion.`);
    return { success: false, reason: 'error' };
  }

  try {
    // Delete the row using batchUpdate with deleteDimension
    // rowIndex is 1-indexed, but the API uses 0-indexed startIndex
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: applicant.rowIndex - 1, // Convert to 0-indexed
                endIndex: applicant.rowIndex, // End is exclusive
              },
            },
          },
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting applicant row', error);
    return { success: false, reason: 'error' };
  }
}

/**
 * Delete all applicants with "Pending Confirmation" status whose confirmation token has expired.
 * Returns the number of deleted records.
 */
export async function cleanupExpiredPendingApplicants(): Promise<{ deleted: number; errors: number }> {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const { headers, rows } = await getSheetDataWithHeaders(APPLICANT_SHEET_NAME);
  if (!headers.length) return { deleted: 0, errors: 0 };

  const headerMap = buildHeaderMap(headers);
  const now = Date.now();

  // Find all expired pending registrations
  const expiredIrains: string[] = [];
  for (const row of rows) {
    const registrationStatus = getHeaderValue(headerMap, row, APPLICANT_REGISTRATION_STATUS_HEADER);
    if (registrationStatus !== 'Pending Confirmation') continue;

    const expiresAtRaw = getHeaderValue(headerMap, row, APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER);
    if (!expiresAtRaw) continue;

    // Parse expiry timestamp
    const expiresAt = Date.parse(expiresAtRaw);
    if (Number.isNaN(expiresAt)) continue;

    if (expiresAt < now) {
      const irain = getHeaderValue(headerMap, row, 'iRAIN');
      if (irain) {
        expiredIrains.push(irain);
      }
    }
  }

  // Delete each expired applicant (in reverse order to avoid row index issues)
  let deleted = 0;
  let errors = 0;
  for (const irain of expiredIrains) {
    const result = await deleteApplicantByIrain(irain);
    if (result.success) {
      deleted++;
    } else {
      errors++;
    }
  }

  return { deleted, errors };
}

/**
 * Clear expired pending update payloads for existing applicants.
 * Unlike new registrations (which are deleted entirely), existing applicants
 * just have their pending update columns cleared when the token expires.
 * Returns the number of cleared records.
 */
export async function cleanupExpiredPendingUpdates(): Promise<{ cleared: number; errors: number }> {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const { headers, rows } = await getSheetDataWithHeaders(APPLICANT_SHEET_NAME);
  if (!headers.length) return { cleared: 0, errors: 0 };

  const headerMap = buildHeaderMap(headers);
  const now = Date.now();

  // Find all existing applicants with expired pending updates
  const expiredIrains: string[] = [];
  for (const row of rows) {
    // Skip new registrations (handled by cleanupExpiredPendingApplicants)
    const registrationStatus = getHeaderValue(headerMap, row, APPLICANT_REGISTRATION_STATUS_HEADER);
    if (registrationStatus === 'Pending Confirmation') continue;

    // Check if there's a pending update payload
    const pendingPayload = getHeaderValue(headerMap, row, APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER);
    if (!pendingPayload) continue;

    // Check if the token has expired
    const expiresAtRaw = getHeaderValue(headerMap, row, APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER);
    if (!expiresAtRaw) continue;

    const expiresAt = Date.parse(expiresAtRaw);
    if (Number.isNaN(expiresAt)) continue;

    if (expiresAt < now) {
      const irain = getHeaderValue(headerMap, row, 'iRAIN');
      if (irain) {
        expiredIrains.push(irain);
      }
    }
  }

  // Clear pending update columns for each expired record
  let cleared = 0;
  let errors = 0;
  for (const irain of expiredIrains) {
    const result = await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', irain, {
      [APPLICANT_UPDATE_TOKEN_HASH_HEADER]: '',
      [APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER]: '',
      [APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER]: '',
    });
    if (result.updated) {
      cleared++;
    } else {
      errors++;
    }
  }

  return { cleared, errors };
}

// ============================================================================
// Archive Functions
// ============================================================================

/**
 * Archive a row by setting the Archived, ArchivedAt, and ArchivedBy columns.
 */
async function archiveRowById(
  sheetName: string,
  idHeaderName: string,
  id: string,
  archivedBy?: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'error' }> {
  const now = new Date().toISOString();
  const result = await updateRowById(sheetName, idHeaderName, id, {
    Archived: 'true',
    ArchivedAt: now,
    ArchivedBy: archivedBy || '',
  });

  if (!result.updated) {
    return { success: false, reason: result.reason === 'not_found' ? 'not_found' : 'error' };
  }
  return { success: true };
}

/**
 * Find all applications linked to an applicant by their Applicant ID.
 */
export async function findApplicationsByApplicantId(
  applicantId: string,
  includeArchived: boolean = false,
): Promise<Array<{ id: string; rowIndex: number }>> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  const { headers, rows } = await getSheetDataWithHeaders(APPLICATION_SHEET_NAME);
  const headerMap = buildHeaderMap(headers);

  const results: Array<{ id: string; rowIndex: number }> = [];
  const searchId = applicantId.trim().toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowApplicantId = getHeaderValue(headerMap, row, 'Applicant ID').toLowerCase();
    const archived = getHeaderValue(headerMap, row, 'Archived');

    if (rowApplicantId === searchId) {
      if (includeArchived || archived !== 'true') {
        results.push({
          id: getHeaderValue(headerMap, row, 'ID'),
          rowIndex: i + 2, // +1 for header, +1 for 1-indexed
        });
      }
    }
  }

  return results;
}

export type EligibilityCheckResult = {
  isIneligible: boolean;
  affectedApplications: Array<{
    id: string;
    status: string;
    hadMeetingScheduled: boolean;
    meetingDate?: string;
    meetingTime?: string;
    meetingTimezone?: string;
    referrerIrref?: string;
    referrerEmail?: string;
    position?: string;
  }>;
};

/**
 * Check if an applicant is ineligible based on their location and work authorization,
 * and return all their active applications that would be affected.
 */
export async function checkApplicantEligibilityAndGetAffectedApplications(
  applicantId: string,
  locatedCanada: string,
  authorizedCanada: string,
  eligibleMoveCanada: string,
): Promise<EligibilityCheckResult> {
  const located = locatedCanada.toLowerCase().trim();
  const authorized = authorizedCanada.toLowerCase().trim();
  const eligibleMove = eligibleMoveCanada.toLowerCase().trim();

  const isIneligible =
    (located === 'no' && eligibleMove === 'no') ||
    (located === 'yes' && authorized === 'no');

  if (!isIneligible) {
    return { isIneligible: false, affectedApplications: [] };
  }

  // Find all active applications for this applicant
  const applications = await findApplicationsByApplicantId(applicantId, false);
  const affectedApplications: EligibilityCheckResult['affectedApplications'] = [];

  for (const app of applications) {
    const appDetails = await getApplicationById(app.id);
    if (!appDetails) continue;

    const status = appDetails.record.status?.toLowerCase().trim() || '';

    // Skip applications already marked as ineligible, rejected, or job offered
    if (status === 'ineligible' || status === 'not a good fit' || status === 'job offered') {
      continue;
    }

    const hadMeetingScheduled = status === 'meeting scheduled' && !!appDetails.record.meetingDate;

    affectedApplications.push({
      id: appDetails.record.id,
      status,
      hadMeetingScheduled,
      meetingDate: appDetails.record.meetingDate || undefined,
      meetingTime: appDetails.record.meetingTime || undefined,
      meetingTimezone: appDetails.record.meetingTimezone || undefined,
      referrerIrref: appDetails.record.referrerIrref || undefined,
      referrerEmail: appDetails.record.referrerEmail || undefined,
      position: appDetails.record.position || undefined,
    });
  }

  return { isIneligible: true, affectedApplications };
}

/**
 * Update multiple applications to ineligible status and clear any meeting info.
 */
export async function markApplicationsAsIneligible(
  applicationIds: string[],
): Promise<void> {
  for (const id of applicationIds) {
    await updateApplicationAdmin(id, {
      status: 'ineligible',
      meetingDate: '',
      meetingTime: '',
      meetingTimezone: '',
      meetingUrl: '',
      rescheduleTokenHash: '',
      rescheduleTokenExpiresAt: '',
    });
  }
}

/**
 * Check if a duplicate application exists for the same applicant, company, and position.
 * Returns the existing application ID if found, null otherwise.
 * Excludes archived applications.
 */
export async function findDuplicateApplication(
  applicantId: string,
  iCrn: string,
  position: string,
): Promise<string | null> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  const { headers, rows } = await getSheetDataWithHeaders(APPLICATION_SHEET_NAME);
  const headerMap = buildHeaderMap(headers);

  const searchApplicantId = applicantId.trim().toLowerCase();
  const searchIcrn = iCrn.trim().toLowerCase();
  const searchPosition = position.trim().toLowerCase();

  for (const row of rows) {
    const rowApplicantId = getHeaderValue(headerMap, row, 'Applicant ID').toLowerCase();
    const rowIcrn = getHeaderValue(headerMap, row, 'iRCRN').toLowerCase();
    const rowPosition = getHeaderValue(headerMap, row, 'Position').toLowerCase();
    const archived = getHeaderValue(headerMap, row, 'Archived');

    if (
      rowApplicantId === searchApplicantId &&
      rowIcrn === searchIcrn &&
      rowPosition === searchPosition &&
      archived !== 'true'
    ) {
      return getHeaderValue(headerMap, row, 'ID');
    }
  }

  return null;
}

/**
 * Find all applications linked to a referrer by their iRREF.
 */
export async function findApplicationsByReferrerIrref(
  referrerIrref: string,
  includeArchived: boolean = false,
): Promise<Array<{ id: string; rowIndex: number }>> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  const { headers, rows } = await getSheetDataWithHeaders(APPLICATION_SHEET_NAME);
  const headerMap = buildHeaderMap(headers);

  const results: Array<{ id: string; rowIndex: number }> = [];
  const searchIrref = referrerIrref.trim().toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowReferrerIrref = getHeaderValue(headerMap, row, 'Referrer iRREF').toLowerCase();
    const archived = getHeaderValue(headerMap, row, 'Archived');

    if (rowReferrerIrref === searchIrref) {
      if (includeArchived || archived !== 'true') {
        results.push({
          id: getHeaderValue(headerMap, row, 'ID'),
          rowIndex: i + 2, // +1 for header, +1 for 1-indexed
        });
      }
    }
  }

  return results;
}

/**
 * Archive an applicant and cascade archive all their applications.
 */
export async function archiveApplicantByIrain(
  irain: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'already_archived' | 'error'; archivedApplications?: number }> {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  await ensureColumns(APPLICANT_SHEET_NAME, ARCHIVE_COLUMNS);
  await ensureColumns(APPLICATION_SHEET_NAME, ARCHIVE_COLUMNS);

  const applicant = await getApplicantByIrain(irain);
  if (!applicant) {
    return { success: false, reason: 'not_found' };
  }

  // Check if already archived
  if (applicant.record.archived === 'true') {
    return { success: false, reason: 'already_archived' };
  }

  try {
    // 1. Find and archive related applications (cascade)
    const relatedApps = await findApplicationsByApplicantId(irain, false);
    for (const app of relatedApps) {
      await archiveRowById(APPLICATION_SHEET_NAME, 'ID', app.id, irain);
    }

    // 2. Archive the applicant
    const result = await archiveRowById(APPLICANT_SHEET_NAME, 'iRAIN', irain);

    return {
      success: result.success,
      reason: result.reason,
      archivedApplications: relatedApps.length,
    };
  } catch (error) {
    console.error('Error archiving applicant', error);
    return { success: false, reason: 'error' };
  }
}

/**
 * Archive a referrer and cascade archive all their applications.
 */
export async function archiveReferrerByIrref(
  irref: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'already_archived' | 'error'; archivedApplications?: number }> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ARCHIVE_COLUMNS);
  await ensureColumns(APPLICATION_SHEET_NAME, ARCHIVE_COLUMNS);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { success: false, reason: 'not_found' };
  }

  // Check if already archived
  if (referrer.record.archived === 'true') {
    return { success: false, reason: 'already_archived' };
  }

  try {
    // 1. Find and archive related applications (cascade)
    const relatedApps = await findApplicationsByReferrerIrref(irref, false);
    for (const app of relatedApps) {
      await archiveRowById(APPLICATION_SHEET_NAME, 'ID', app.id, irref);
    }

    // 2. Archive the referrer
    const result = await archiveRowById(REFERRER_SHEET_NAME, 'iRREF', irref);

    return {
      success: result.success,
      reason: result.reason,
      archivedApplications: relatedApps.length,
    };
  } catch (error) {
    console.error('Error archiving referrer', error);
    return { success: false, reason: 'error' };
  }
}

/**
 * List only archived applicants.
 */
export async function listArchivedApplicants(params: Omit<ApplicantListParams, 'includeArchived'>) {
  const result = await listApplicants({ ...params, includeArchived: true });
  const items = result.items as Array<{ archived?: string }>;
  const archivedItems = items.filter((item) => item.archived === 'true');
  return {
    total: archivedItems.length,
    items: archivedItems,
  };
}

/**
 * List only archived referrers.
 */
export async function listArchivedReferrers(params: Omit<ReferrerListParams, 'includeArchived'>) {
  const result = await listReferrers({ ...params, includeArchived: true });
  const items = result.items as Array<{ archived?: string }>;
  const archivedItems = items.filter((item) => item.archived === 'true');
  return {
    total: archivedItems.length,
    items: archivedItems,
  };
}

/**
 * List only archived applications.
 */
export async function listArchivedApplications(params: Omit<ApplicationListParams, 'includeArchived'>) {
  const result = await listApplications({ ...params, includeArchived: true });
  const archivedItems = result.items.filter((item) => item.archived === 'true');
  return {
    total: archivedItems.length,
    items: archivedItems,
  };
}

// ============================================================================
// Restore Functions
// ============================================================================

/**
 * Restore an archived applicant (does NOT cascade restore applications).
 */
export async function restoreApplicantByIrain(
  irain: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'not_archived' | 'error' }> {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);
  await ensureColumns(APPLICANT_SHEET_NAME, ARCHIVE_COLUMNS);

  const applicant = await getApplicantByIrain(irain);
  if (!applicant) {
    return { success: false, reason: 'not_found' };
  }

  if (applicant.record.archived !== 'true') {
    return { success: false, reason: 'not_archived' };
  }

  try {
    const result = await updateRowById(APPLICANT_SHEET_NAME, 'iRAIN', irain, {
      Archived: '',
      ArchivedAt: '',
      ArchivedBy: '',
    });

    return { success: result.updated, reason: result.reason === 'not_found' ? 'not_found' : undefined };
  } catch (error) {
    console.error('Error restoring applicant', error);
    return { success: false, reason: 'error' };
  }
}

/**
 * Restore an archived referrer (does NOT cascade restore applications).
 */
export async function restoreReferrerByIrref(
  irref: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'not_archived' | 'error' }> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);
  await ensureColumns(REFERRER_SHEET_NAME, ARCHIVE_COLUMNS);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { success: false, reason: 'not_found' };
  }

  if (referrer.record.archived !== 'true') {
    return { success: false, reason: 'not_archived' };
  }

  try {
    const result = await updateRowById(REFERRER_SHEET_NAME, 'iRREF', irref, {
      Archived: '',
      ArchivedAt: '',
      ArchivedBy: '',
    });

    return { success: result.updated, reason: result.reason === 'not_found' ? 'not_found' : undefined };
  } catch (error) {
    console.error('Error restoring referrer', error);
    return { success: false, reason: 'error' };
  }
}

/**
 * Restore an archived application.
 */
export async function restoreApplicationById(
  id: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'not_archived' | 'error' }> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);
  await ensureColumns(APPLICATION_SHEET_NAME, ARCHIVE_COLUMNS);

  const application = await getApplicationById(id);
  if (!application) {
    return { success: false, reason: 'not_found' };
  }

  if (application.record.archived !== 'true') {
    return { success: false, reason: 'not_archived' };
  }

  try {
    const result = await updateRowById(APPLICATION_SHEET_NAME, 'ID', id, {
      Archived: '',
      ArchivedAt: '',
      ArchivedBy: '',
    });

    return { success: result.updated, reason: result.reason === 'not_found' ? 'not_found' : undefined };
  } catch (error) {
    console.error('Error restoring application', error);
    return { success: false, reason: 'error' };
  }
}

// ============================================================================
// Permanent Delete Functions (for archived records only)
// ============================================================================

/**
 * Permanently delete an archived applicant (hard delete from sheet).
 */
export async function permanentlyDeleteApplicant(
  irain: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'not_archived' | 'error' }> {
  await ensureHeaders(APPLICANT_SHEET_NAME, APPLICANT_HEADERS);

  const applicant = await getApplicantByIrain(irain);
  if (!applicant) {
    return { success: false, reason: 'not_found' };
  }

  if (applicant.record.archived !== 'true') {
    return { success: false, reason: 'not_archived' };
  }

  // Use the existing hard delete function
  return deleteApplicantByIrain(irain);
}

/**
 * Permanently delete an archived referrer (hard delete from sheet).
 */
export async function permanentlyDeleteReferrer(
  irref: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'not_archived' | 'error' }> {
  await ensureHeaders(REFERRER_SHEET_NAME, REFERRER_HEADERS);

  const referrer = await getReferrerByIrref(irref);
  if (!referrer) {
    return { success: false, reason: 'not_found' };
  }

  if (referrer.record.archived !== 'true') {
    return { success: false, reason: 'not_archived' };
  }

  // Use the existing hard delete function
  return deleteReferrerByIrref(irref);
}

/**
 * Permanently delete an archived application (hard delete from sheet).
 */
export async function permanentlyDeleteApplication(
  id: string,
): Promise<{ success: boolean; reason?: 'not_found' | 'not_archived' | 'error' }> {
  await ensureHeaders(APPLICATION_SHEET_NAME, APPLICATION_HEADERS);

  const application = await getApplicationById(id);
  if (!application) {
    return { success: false, reason: 'not_found' };
  }

  if (application.record.archived !== 'true') {
    return { success: false, reason: 'not_archived' };
  }

  const spreadsheetId = getSpreadsheetIdOrThrow();
  const sheets = getSheetsClient();

  // Get the sheetId for the Applications sheet
  const doc = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = doc.data.sheets?.find(
    (sheet) => sheet.properties?.title === APPLICATION_SHEET_NAME,
  );
  const sheetId = targetSheet?.properties?.sheetId;

  if (sheetId === undefined) {
    console.error(`Unable to find sheet "${APPLICATION_SHEET_NAME}" for deletion.`);
    return { success: false, reason: 'error' };
  }

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: application.rowIndex - 1,
                endIndex: application.rowIndex,
              },
            },
          },
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error permanently deleting application', error);
    return { success: false, reason: 'error' };
  }
}

// ============================================================================
// Referrer Companies Functions
// ============================================================================

/**
 * Generate a unique ID for a referrer-company relationship.
 * Format: RCMP-{timestamp}-{random}
 */
export function generateReferrerCompanyId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `RCMP-${timestamp}-${random}`;
}

/**
 * Get the maximum iRCRN number from the Referrer Companies sheet.
 */
async function getMaxIrcrnFromReferrerCompanies(spreadsheetId: string): Promise<number> {
  const sheets = getSheetsClient();
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${REFERRER_COMPANIES_SHEET_NAME}'!1:1`,
    });
    const headers = existing.data.values?.[0] ?? [];
    if (!headers.length) return 0;

    const headerMap = buildHeaderMap(headers);
    const lastCol = toColumnLetter(headers.length - 1);
    const rows = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${REFERRER_COMPANIES_SHEET_NAME}'!A:${lastCol}`,
      majorDimension: 'ROWS',
    });
    const values = rows.data.values ?? [];
    let max = 0;
    for (let i = 1; i < values.length; i++) {
      const row = values[i] ?? [];
      const value = getHeaderValue(headerMap, row, 'Company iRCRN');
      const match = /^iRCRN(\d{10})$/i.exec(String(value).trim());
      if (!match) continue;
      const parsed = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > max) {
        max = parsed;
      }
    }
    return max;
  } catch {
    // Sheet might not exist yet
    return 0;
  }
}

/**
 * Generate a new iRCRN, checking both legacy Referrers sheet and new Referrer Companies sheet.
 */
export async function generateIRCRNForCompany(): Promise<string> {
  const spreadsheetId = getSpreadsheetIdOrThrow();
  const maxReferrers = await getMaxIrcrnFromReferrers(spreadsheetId);
  const maxCompanies = await getMaxIrcrnFromReferrerCompanies(spreadsheetId);
  const next = Math.max(maxReferrers, maxCompanies) + 1;
  return `iRCRN${String(next).padStart(10, '0')}`;
}

/**
 * Create a new referrer-company relationship.
 */
export async function appendReferrerCompanyRow(row: ReferrerCompanyRow): Promise<void> {
  await ensureHeaders(REFERRER_COMPANIES_SHEET_NAME, REFERRER_COMPANIES_HEADERS);

  const timestamp = new Date().toISOString();
  await appendRow(REFERRER_COMPANIES_SHEET_NAME, [
    row.id,
    timestamp,
    row.referrerIrref,
    row.companyName,
    row.companyIrcrn ?? '',
    row.companyApproval ?? 'pending',
    row.companyIndustry,
    row.careersPortal ?? '',
    row.workType,
    '', // Archived
    '', // ArchivedAt
    '', // ArchivedBy
  ]);
}

/**
 * Get all companies for a referrer by their iRREF.
 */
export async function listReferrerCompanies(
  referrerIrref: string,
  includeArchived: boolean = false,
): Promise<ReferrerCompanyRecord[]> {
  await ensureHeaders(REFERRER_COMPANIES_SHEET_NAME, REFERRER_COMPANIES_HEADERS);

  const { headers, rows } = await getSheetDataWithHeaders(REFERRER_COMPANIES_SHEET_NAME);
  if (!headers.length) return [];

  const headerMap = buildHeaderMap(headers);
  const normalizedIrref = referrerIrref.trim().toLowerCase();
  const results: ReferrerCompanyRecord[] = [];

  for (const row of rows) {
    const rowIrref = getHeaderValue(headerMap, row, 'Referrer iRREF').toLowerCase();
    if (rowIrref !== normalizedIrref) continue;

    const archived = getHeaderValue(headerMap, row, 'Archived');
    if (!includeArchived && archived === 'true') continue;

    results.push({
      id: getHeaderValue(headerMap, row, 'ID'),
      timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
      referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
      companyName: getHeaderValue(headerMap, row, 'Company Name'),
      companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN') || undefined,
      companyApproval: getHeaderValue(headerMap, row, 'Company Approval') as ReferrerCompanyRecord['companyApproval'],
      companyIndustry: getHeaderValue(headerMap, row, 'Company Industry'),
      careersPortal: getHeaderValue(headerMap, row, 'Careers Portal') || undefined,
      workType: getHeaderValue(headerMap, row, 'Work Type'),
      archived: archived || undefined,
      archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt') || undefined,
      archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy') || undefined,
    });
  }

  return results;
}

/**
 * Get a specific referrer-company relationship by its ID.
 */
export async function getReferrerCompanyById(
  id: string,
): Promise<{ rowIndex: number; record: ReferrerCompanyRecord } | null> {
  await ensureHeaders(REFERRER_COMPANIES_SHEET_NAME, REFERRER_COMPANIES_HEADERS);

  const { headers, rows } = await getSheetDataWithHeaders(REFERRER_COMPANIES_SHEET_NAME);
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const normalizedId = id.trim();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowId = getHeaderValue(headerMap, row, 'ID');
    if (rowId !== normalizedId) continue;

    return {
      rowIndex: i + 2, // +1 for header, +1 for 1-indexed
      record: {
        id: rowId,
        timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
        referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
        companyName: getHeaderValue(headerMap, row, 'Company Name'),
        companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN') || undefined,
        companyApproval: getHeaderValue(headerMap, row, 'Company Approval') as ReferrerCompanyRecord['companyApproval'],
        companyIndustry: getHeaderValue(headerMap, row, 'Company Industry'),
        careersPortal: getHeaderValue(headerMap, row, 'Careers Portal') || undefined,
        workType: getHeaderValue(headerMap, row, 'Work Type'),
        archived: getHeaderValue(headerMap, row, 'Archived') || undefined,
        archivedAt: getHeaderValue(headerMap, row, 'ArchivedAt') || undefined,
        archivedBy: getHeaderValue(headerMap, row, 'ArchivedBy') || undefined,
      },
    };
  }

  return null;
}

/**
 * Find a referrer company by its iRCRN.
 * Returns both the company record and the associated referrer.
 */
export async function findReferrerCompanyByIrcrn(
  ircrn: string,
): Promise<{ company: ReferrerCompanyRecord; referrer: ReferrerRecord } | null> {
  await ensureHeaders(REFERRER_COMPANIES_SHEET_NAME, REFERRER_COMPANIES_HEADERS);

  const { headers, rows } = await getSheetDataWithHeaders(REFERRER_COMPANIES_SHEET_NAME);
  if (!headers.length) return null;

  const headerMap = buildHeaderMap(headers);
  const normalizedIrcrn = ircrn.trim().toLowerCase();

  for (const row of rows) {
    const rowIrcrn = getHeaderValue(headerMap, row, 'Company iRCRN').toLowerCase();
    if (rowIrcrn !== normalizedIrcrn) continue;

    const archived = getHeaderValue(headerMap, row, 'Archived');
    if (archived === 'true') continue;

    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    if (approval !== 'approved' && approval !== '') continue;

    const company: ReferrerCompanyRecord = {
      id: getHeaderValue(headerMap, row, 'ID'),
      timestamp: getHeaderValue(headerMap, row, 'Timestamp'),
      referrerIrref: getHeaderValue(headerMap, row, 'Referrer iRREF'),
      companyName: getHeaderValue(headerMap, row, 'Company Name'),
      companyIrcrn: getHeaderValue(headerMap, row, 'Company iRCRN') || undefined,
      companyApproval: approval as ReferrerCompanyRecord['companyApproval'],
      companyIndustry: getHeaderValue(headerMap, row, 'Company Industry'),
      careersPortal: getHeaderValue(headerMap, row, 'Careers Portal') || undefined,
      workType: getHeaderValue(headerMap, row, 'Work Type'),
      archived: archived || undefined,
    };

    // Fetch the associated referrer
    const referrer = await getReferrerByIrref(company.referrerIrref);
    if (!referrer) continue;
    if (referrer.record.archived === 'true') continue;

    return { company, referrer: referrer.record };
  }

  return null;
}

/**
 * Strict version of findReferrerCompanyByIrcrn that throws on validation errors.
 */
export async function findReferrerCompanyByIrcrnStrict(ircrn: string): Promise<{
  company: ReferrerCompanyRecord;
  referrer: ReferrerRecord;
}> {
  const trimmed = ircrn.trim();
  if (!trimmed) {
    throw new ReferrerLookupError('missing_ircrn', 'Company reference number is required.');
  }

  if (!isIrcrn(trimmed)) {
    throw new ReferrerLookupError('invalid_ircrn', 'Invalid company reference number format.');
  }

  // First check the new Referrer Companies sheet
  const result = await findReferrerCompanyByIrcrn(trimmed);
  if (result) {
    return result;
  }

  // Fallback to legacy Referrers sheet for backward compatibility
  const legacyResult = await findReferrerByIrcrn(trimmed);
  if (legacyResult) {
    // Fetch full referrer record to get all fields
    const fullReferrer = await getReferrerByIrref(legacyResult.irref);
    if (fullReferrer) {
      // Convert legacy result to new format
      return {
        company: {
          id: `legacy-${legacyResult.irref}`, // Synthetic ID for legacy records
          timestamp: fullReferrer.record.timestamp || '',
          referrerIrref: legacyResult.irref,
          companyName: legacyResult.company || '',
          companyIrcrn: legacyResult.companyIrcrn,
          companyApproval: (fullReferrer.record.companyApproval || 'approved') as ReferrerCompanyRecord['companyApproval'],
          companyIndustry: fullReferrer.record.companyIndustry || '',
          careersPortal: fullReferrer.record.careersPortal || undefined,
          workType: fullReferrer.record.workType || '',
        },
        referrer: fullReferrer.record,
      };
    }
  }

  throw new ReferrerLookupError('not_found', 'No approved company found with this reference number.');
}

/**
 * Update the approval status of a company in the Referrer Companies sheet.
 * Generates iRCRN on first approval.
 * Note: This is different from updateReferrerCompanyApproval which operates on the legacy Referrers sheet.
 */
export async function updateCompanyApproval(
  companyId: string,
  approval: 'approved' | 'denied',
): Promise<{
  success: boolean;
  reason?: string;
  companyIrcrn?: string;
  wasFirstApproval?: boolean;
}> {
  const existing = await getReferrerCompanyById(companyId);
  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  const updates: Record<string, string> = {
    'Company Approval': approval,
  };

  let generatedIrcrn: string | undefined;
  let wasFirstApproval = false;

  // Generate iRCRN on first approval if not already set
  if (approval === 'approved' && !existing.record.companyIrcrn) {
    generatedIrcrn = await generateIRCRNForCompany();
    updates['Company iRCRN'] = generatedIrcrn;
    wasFirstApproval = true;
  }

  const result = await updateRowById(REFERRER_COMPANIES_SHEET_NAME, 'ID', companyId, updates);

  if (!result.updated) {
    return { success: false, reason: 'update_failed' };
  }

  return {
    success: true,
    companyIrcrn: generatedIrcrn || existing.record.companyIrcrn,
    wasFirstApproval,
  };
}

/**
 * Update fields of a referrer company.
 */
export async function updateReferrerCompanyFields(
  companyId: string,
  patch: Partial<Omit<ReferrerCompanyRow, 'id' | 'referrerIrref'>>,
): Promise<{ updated: boolean; reason?: string }> {
  const existing = await getReferrerCompanyById(companyId);
  if (!existing) {
    return { updated: false, reason: 'not_found' };
  }

  const updates: Record<string, string> = {};
  if (patch.companyName !== undefined) updates['Company Name'] = patch.companyName;
  if (patch.companyIndustry !== undefined) updates['Company Industry'] = patch.companyIndustry;
  if (patch.careersPortal !== undefined) updates['Careers Portal'] = patch.careersPortal;
  if (patch.workType !== undefined) updates['Work Type'] = patch.workType;

  if (Object.keys(updates).length === 0) {
    return { updated: true }; // Nothing to update
  }

  return updateRowById(REFERRER_COMPANIES_SHEET_NAME, 'ID', companyId, updates);
}

/**
 * Archive a referrer company relationship.
 */
export async function archiveReferrerCompany(
  companyId: string,
  archivedBy?: string,
): Promise<{ success: boolean; reason?: string }> {
  const existing = await getReferrerCompanyById(companyId);
  if (!existing) {
    return { success: false, reason: 'not_found' };
  }

  const now = new Date().toISOString();
  const result = await updateRowById(REFERRER_COMPANIES_SHEET_NAME, 'ID', companyId, {
    Archived: 'true',
    ArchivedAt: now,
    ArchivedBy: archivedBy || '',
  });

  return { success: result.updated, reason: result.reason };
}

/**
 * List all approved companies from the Referrer Companies sheet.
 * This is the new source for the hiring companies list.
 */
export async function listApprovedCompanies(): Promise<CompanyRow[]> {
  await ensureHeaders(REFERRER_COMPANIES_SHEET_NAME, REFERRER_COMPANIES_HEADERS);

  const { headers, rows } = await getSheetDataWithHeaders(REFERRER_COMPANIES_SHEET_NAME);
  if (!headers.length) {
    // Fall back to legacy function if new sheet is empty
    return listApprovedReferrerCompanies();
  }

  const headerMap = buildHeaderMap(headers);
  const items: CompanyRow[] = [];

  for (const row of rows) {
    const approval = getHeaderValue(headerMap, row, 'Company Approval').toLowerCase();
    if (approval !== 'approved') continue;

    const archived = getHeaderValue(headerMap, row, 'Archived');
    if (archived === 'true') continue;

    const code = getHeaderValue(headerMap, row, 'Company iRCRN');
    const name = getHeaderValue(headerMap, row, 'Company Name');
    if (!code || !name) continue;

    items.push({
      code,
      name,
      industry: getHeaderValue(headerMap, row, 'Company Industry') || 'Not specified',
      careersUrl: getHeaderValue(headerMap, row, 'Careers Portal') || undefined,
    });
  }

  // If no items in new sheet, fall back to legacy
  if (items.length === 0) {
    return listApprovedReferrerCompanies();
  }

  // Deduplicate by iRCRN (in case of edge cases)
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

/**
 * Check if a referrer has at least one approved company.
 */
export async function hasApprovedCompany(referrerIrref: string): Promise<boolean> {
  const companies = await listReferrerCompanies(referrerIrref);
  return companies.some((c) => c.companyApproval === 'approved');
}

/**
 * Find an existing company for a referrer by company name (case-insensitive).
 */
export async function findReferrerCompanyByName(
  referrerIrref: string,
  companyName: string,
): Promise<ReferrerCompanyRecord | null> {
  const companies = await listReferrerCompanies(referrerIrref, true); // Include archived
  const normalizedName = companyName.trim().toLowerCase();

  for (const company of companies) {
    if (company.companyName.trim().toLowerCase() === normalizedName) {
      return company;
    }
  }

  return null;
}
