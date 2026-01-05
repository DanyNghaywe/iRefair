import { NextRequest, NextResponse } from 'next/server';

import { findApplicationByRescheduleTokenHash } from '@/lib/sheets';
import { hashOpaqueToken, isExpired } from '@/lib/tokens';
import { formatMeetingDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { valid: false, error: 'Missing reschedule token.' },
      { status: 400 },
    );
  }

  // Hash the token and look up the application
  const tokenHash = hashOpaqueToken(token);
  const application = await findApplicationByRescheduleTokenHash(tokenHash);

  if (!application) {
    return NextResponse.json(
      { valid: false, error: 'This reschedule link is invalid or has already been used.' },
      { status: 404 },
    );
  }

  // Check expiry
  if (isExpired(application.record.rescheduleTokenExpiresAt)) {
    return NextResponse.json(
      { valid: false, error: 'This reschedule link has expired. Please contact the recruiter directly to reschedule.' },
      { status: 410 },
    );
  }

  // Get meeting details for display
  const meetingDate = application.record.meetingDate || '';
  const meetingTime = application.record.meetingTime || '';
  const meetingTimezone = application.record.meetingTimezone || '';
  const position = application.record.position || 'the position';

  // Format the meeting datetime for display
  const formattedDateTime = formatMeetingDateTime(meetingDate, meetingTime, meetingTimezone);

  return NextResponse.json({
    valid: true,
    meetingInfo: {
      meetingDate,
      meetingTime,
      meetingTimezone,
      position,
      formattedDateTime,
    },
  });
}
