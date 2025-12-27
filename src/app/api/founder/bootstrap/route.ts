import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import {
  ADMIN_TRACKING_COLUMNS,
  APPLICATION_ADMIN_COLUMNS,
  APPLICATION_HEADERS,
  APPLICATION_SHEET_NAME,
  CANDIDATE_HEADERS,
  CANDIDATE_SHEET_NAME,
  MATCH_HEADERS,
  MATCH_SHEET_NAME,
  REFERRER_HEADERS,
  REFERRER_SHEET_NAME,
  ensureColumns,
  ensureHeaders,
} from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    requireFounder(request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const createdSheets: string[] = [];
  const appendedColumns: Record<string, string[]> = {};

  const trackSheet = async (
    sheetName: string,
    headers: string[],
    adminColumns: string[] = [],
  ) => {
    const { created } = await ensureHeaders(sheetName, headers);
    if (created) {
      createdSheets.push(sheetName);
    }

    if (adminColumns.length) {
      const { appended } = await ensureColumns(sheetName, adminColumns);
      if (appended.length) {
        appendedColumns[sheetName] = appended;
      }
    }
  };

  await trackSheet(CANDIDATE_SHEET_NAME, CANDIDATE_HEADERS, ADMIN_TRACKING_COLUMNS);
  await trackSheet(REFERRER_SHEET_NAME, REFERRER_HEADERS, ADMIN_TRACKING_COLUMNS);
  await trackSheet(APPLICATION_SHEET_NAME, APPLICATION_HEADERS, APPLICATION_ADMIN_COLUMNS);

  const { created: matchCreated } = await ensureHeaders(MATCH_SHEET_NAME, MATCH_HEADERS);
  if (matchCreated) {
    createdSheets.push(MATCH_SHEET_NAME);
  }

  return NextResponse.json({ ok: true, createdSheets, appendedColumns });
}
