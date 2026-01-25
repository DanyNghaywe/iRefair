import {
  COMMON_TIMEZONES,
  isValidTimezone,
  getAllTimezoneOptions,
  formatMeetingDateTime,
} from '../timezone';

describe('COMMON_TIMEZONES', () => {
  it('contains Canadian timezones', () => {
    expect(COMMON_TIMEZONES).toContain('America/Toronto');
    expect(COMMON_TIMEZONES).toContain('America/Vancouver');
    expect(COMMON_TIMEZONES).toContain('America/Montreal');
    expect(COMMON_TIMEZONES).toContain('America/Calgary');
    expect(COMMON_TIMEZONES).toContain('America/Edmonton');
    expect(COMMON_TIMEZONES).toContain('America/Winnipeg');
    expect(COMMON_TIMEZONES).toContain('America/Halifax');
    expect(COMMON_TIMEZONES).toContain('America/St_Johns');
  });

  it('contains US timezones', () => {
    expect(COMMON_TIMEZONES).toContain('America/New_York');
    expect(COMMON_TIMEZONES).toContain('America/Chicago');
    expect(COMMON_TIMEZONES).toContain('America/Los_Angeles');
    expect(COMMON_TIMEZONES).toContain('America/Denver');
  });

  it('contains European timezones', () => {
    expect(COMMON_TIMEZONES).toContain('Europe/London');
    expect(COMMON_TIMEZONES).toContain('Europe/Paris');
    expect(COMMON_TIMEZONES).toContain('Europe/Berlin');
  });

  it('contains UTC', () => {
    expect(COMMON_TIMEZONES).toContain('UTC');
  });
});

describe('isValidTimezone', () => {
  it('returns true for valid IANA timezones', () => {
    expect(isValidTimezone('America/Toronto')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
  });

  it('returns false for invalid timezones', () => {
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    expect(isValidTimezone('Fake')).toBe(false);
    expect(isValidTimezone('not-a-timezone')).toBe(false);
  });

  it('returns false for empty or null input', () => {
    expect(isValidTimezone('')).toBe(false);
    // @ts-expect-error testing invalid input
    expect(isValidTimezone(null)).toBe(false);
    // @ts-expect-error testing invalid input
    expect(isValidTimezone(undefined)).toBe(false);
  });

  it('returns false for non-string input', () => {
    // @ts-expect-error testing invalid input
    expect(isValidTimezone(123)).toBe(false);
    // @ts-expect-error testing invalid input
    expect(isValidTimezone({})).toBe(false);
  });
});

describe('getAllTimezoneOptions', () => {
  it('returns array of timezone options', () => {
    const options = getAllTimezoneOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
  });

  it('each option has value and label properties', () => {
    const options = getAllTimezoneOptions();
    for (const option of options) {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
    }
  });

  it('options are sorted alphabetically by label', () => {
    const options = getAllTimezoneOptions();
    const labels = options.map((o) => o.label);
    const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sortedLabels);
  });
});

describe('formatMeetingDateTime', () => {
  it('formats meeting date and time correctly', () => {
    const result = formatMeetingDateTime('2025-01-15', '14:30', 'America/Toronto');
    expect(result).toContain('2025');
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('at');
  });

  it('returns empty string for missing date', () => {
    expect(formatMeetingDateTime('', '14:30', 'America/Toronto')).toBe('');
  });

  it('returns empty string for missing time', () => {
    expect(formatMeetingDateTime('2025-01-15', '', 'America/Toronto')).toBe('');
  });

  it('returns empty string for missing timezone', () => {
    expect(formatMeetingDateTime('2025-01-15', '14:30', '')).toBe('');
  });

  it('handles 12-hour time format with AM', () => {
    const result = formatMeetingDateTime('2025-01-15', '9:30 AM', 'America/Toronto');
    expect(result).toContain('January');
  });

  it('handles 12-hour time format with PM', () => {
    const result = formatMeetingDateTime('2025-01-15', '2:30 PM', 'America/Toronto');
    expect(result).toContain('January');
  });

  it('handles 12:00 PM (noon) correctly', () => {
    const result = formatMeetingDateTime('2025-01-15', '12:00 PM', 'America/Toronto');
    expect(result).toContain('January');
  });

  it('handles 12:00 AM (midnight) correctly', () => {
    const result = formatMeetingDateTime('2025-01-15', '12:00 AM', 'America/Toronto');
    expect(result).toContain('January');
  });

  it('handles 24-hour time format', () => {
    const result = formatMeetingDateTime('2025-01-15', '14:30', 'America/Toronto');
    expect(result).toContain('January');
  });

  it('returns fallback for invalid date format', () => {
    const result = formatMeetingDateTime('invalid-date', '14:30', 'America/Toronto');
    expect(result).toContain('invalid-date');
    expect(result).toContain('14:30');
  });

  it('returns fallback for invalid time format', () => {
    const result = formatMeetingDateTime('2025-01-15', 'invalid-time', 'America/Toronto');
    expect(result).toContain('2025-01-15');
    expect(result).toContain('invalid-time');
  });

  it('includes timezone name in output', () => {
    const result = formatMeetingDateTime('2025-01-15', '14:30', 'America/Toronto');
    // Should contain some form of timezone indicator
    expect(result).toMatch(/\(.*\)/);
  });
});
