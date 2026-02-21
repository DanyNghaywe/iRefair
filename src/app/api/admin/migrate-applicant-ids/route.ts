import { NextResponse } from 'next/server';

const ADMIN_HEADER = 'x-admin-token';

export async function GET(request: Request) {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = request.headers.get(ADMIN_HEADER);

  if (!adminToken || providedToken !== adminToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    { ok: false, error: 'Applicant ID migration endpoint is disabled in SQL-only mode.' },
    { status: 410 },
  );
}
