import { NextRequest, NextResponse } from 'next/server';

import { requireCronAuth } from '@/lib/cronAuth';
import { cleanupExpiredPendingApplicants } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResponse = requireCronAuth(request);
  if (authResponse) return authResponse;

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
