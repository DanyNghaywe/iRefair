/**
 * Timezone helpers for formatting meeting date/time.
 */

/**
 * Common timezones including all Canadian timezones and frequently used international ones.
 */
export const COMMON_TIMEZONES: string[] = [
  // Canadian timezones
  'America/St_Johns', // Newfoundland
  'America/Halifax', // Atlantic
  'America/Moncton', // Atlantic (New Brunswick)
  'America/Toronto', // Eastern
  'America/Montreal', // Eastern (Quebec)
  'America/Winnipeg', // Central
  'America/Regina', // Central (Saskatchewan - no DST)
  'America/Edmonton', // Mountain
  'America/Calgary', // Mountain
  'America/Vancouver', // Pacific
  'America/Whitehorse', // Pacific (Yukon)
  'America/Yellowknife', // Mountain (NWT)
  'America/Iqaluit', // Eastern (Nunavut)

  // US timezones
  'America/New_York', // Eastern
  'America/Chicago', // Central
  'America/Denver', // Mountain
  'America/Phoenix', // Mountain (Arizona - no DST)
  'America/Los_Angeles', // Pacific
  'America/Anchorage', // Alaska
  'Pacific/Honolulu', // Hawaii

  // European timezones
  'Europe/London', // GMT/BST
  'Europe/Paris', // CET
  'Europe/Berlin', // CET
  'Europe/Amsterdam', // CET
  'Europe/Madrid', // CET
  'Europe/Rome', // CET
  'Europe/Zurich', // CET
  'Europe/Brussels', // CET
  'Europe/Vienna', // CET
  'Europe/Warsaw', // CET
  'Europe/Stockholm', // CET
  'Europe/Oslo', // CET
  'Europe/Copenhagen', // CET
  'Europe/Helsinki', // EET
  'Europe/Athens', // EET
  'Europe/Moscow', // MSK

  // Asia/Pacific timezones
  'Asia/Dubai', // GST
  'Asia/Kolkata', // IST
  'Asia/Singapore', // SGT
  'Asia/Hong_Kong', // HKT
  'Asia/Tokyo', // JST
  'Asia/Seoul', // KST
  'Asia/Shanghai', // CST
  'Australia/Sydney', // AEST
  'Australia/Melbourne', // AEST
  'Australia/Brisbane', // AEST (no DST)
  'Australia/Perth', // AWST
  'Pacific/Auckland', // NZST

  // UTC
  'UTC',
];

/**
 * Format meeting date, time, and timezone into a professional string.
 * Example output: "Friday, January 3, 2025 at 2:30 PM (Eastern Time)"
 *
 * @param date - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format (24-hour or 12-hour with AM/PM)
 * @param timezone - IANA timezone string (e.g., 'America/Toronto')
 * @returns Formatted date/time string
 */
export function formatMeetingDateTime(date: string, time: string, timezone: string): string {
  if (!date || !time || !timezone) {
    return '';
  }

  try {
    // Parse the date and time
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
      return `${date} at ${time} (${timezone})`;
    }

    // Parse time - handle both 24-hour and 12-hour formats
    let hours: number;
    let minutes: number;
    const timeUpper = time.toUpperCase();

    if (timeUpper.includes('AM') || timeUpper.includes('PM')) {
      // 12-hour format like "2:30 PM" or "02:30PM"
      const match = timeUpper.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
      if (!match) {
        return `${date} at ${time} (${timezone})`;
      }
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const isPM = match[3] === 'PM';

      if (hours === 12) {
        hours = isPM ? 12 : 0;
      } else if (isPM) {
        hours += 12;
      }
    } else {
      // 24-hour format like "14:30"
      const [h, m] = time.split(':').map(Number);
      hours = h ?? 0;
      minutes = m ?? 0;
    }

    // Create a date in the specified timezone
    // Note: We construct the date in UTC and then format it in the target timezone
    const dateObj = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Use Intl.DateTimeFormat for professional formatting
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    });

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone,
    });

    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'long',
      timeZone: timezone,
    });

    const formattedDate = dateFormatter.format(dateObj);
    const formattedTime = timeFormatter.format(dateObj);

    // Extract just the timezone name from the full format
    const tzParts = tzFormatter.formatToParts(dateObj);
    const timeZoneName = tzParts.find((part) => part.type === 'timeZoneName')?.value || timezone;

    return `${formattedDate} at ${formattedTime} (${timeZoneName})`;
  } catch {
    // Fallback for invalid timezone or date
    return `${date} at ${time} (${timezone})`;
  }
}
