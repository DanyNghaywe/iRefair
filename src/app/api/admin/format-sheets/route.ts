import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const token = request.headers.get('x-admin-token');
  const expected = process.env.ADMIN_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    { ok: false, error: 'Sheet formatting endpoint is disabled in SQL-only mode.' },
    { status: 410 },
  );
}
