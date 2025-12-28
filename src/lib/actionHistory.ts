/**
 * Action history helpers for tracking referrer portal workflow actions.
 */

export type ActionLogEntry = {
  action: string; // e.g. 'SCHEDULE_MEETING', 'REQUEST_INFO', 'APPLICANT_UPDATED'
  timestamp: string; // ISO
  performedBy: string; // 'applicant' or iRREF
  performedByEmail?: string;
  notes?: string;
  meetingDetails?: {
    date: string;
    time: string;
    timezone: string;
    url: string;
  };
  meta?: Record<string, string>;
};

/**
 * Safely parse action history JSON string to an array of ActionLogEntry.
 * Returns an empty array if parsing fails or input is empty/invalid.
 */
export function parseActionHistory(raw?: string): ActionLogEntry[] {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Basic validation - ensure each entry has required fields
    return parsed.filter(
      (entry): entry is ActionLogEntry =>
        entry &&
        typeof entry === 'object' &&
        typeof entry.action === 'string' &&
        typeof entry.timestamp === 'string' &&
        typeof entry.performedBy === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Append a new action history entry to an existing JSON string.
 * Returns the updated JSON string.
 */
export function appendActionHistoryEntry(
  existingRaw: string | undefined,
  entry: ActionLogEntry,
): string {
  const existing = parseActionHistory(existingRaw);
  existing.push(entry);
  return JSON.stringify(existing);
}
