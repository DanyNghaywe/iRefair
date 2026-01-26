import { NextRequest, NextResponse } from 'next/server';

export function requireCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured.');
    return NextResponse.json(
      { ok: false, error: 'Cron secret not configured' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization')?.trim();
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
