import { NextResponse } from 'next/server';
import { migrateLegacyApplicantIds } from '@/lib/sheets';

const ADMIN_HEADER = 'x-admin-token';

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = request.headers.get(ADMIN_HEADER);

  if (!adminToken || providedToken !== adminToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await migrateLegacyApplicantIds();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('Applicant ID migration failed', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to migrate applicant IDs. Check server logs for details.' },
      { status: 500 },
    );
  }
}
