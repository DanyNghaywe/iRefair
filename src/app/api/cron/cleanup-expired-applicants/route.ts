import { NextRequest, NextResponse } from 'next/server';

import { cleanupExpiredPendingApplicants } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await cleanupExpiredPendingApplicants();
    return NextResponse.json({
      ok: true,
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Error cleaning up expired applicants:', error);
    return NextResponse.json(
      { ok: false, error: 'Cleanup failed' },
      { status: 500 },
    );
  }
}
