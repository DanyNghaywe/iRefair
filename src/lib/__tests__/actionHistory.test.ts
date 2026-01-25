import { appendActionHistoryEntry, parseActionHistory } from '../actionHistory';

describe('parseActionHistory', () => {
  it('returns an empty array for invalid input', () => {
    expect(parseActionHistory()).toEqual([]);
    expect(parseActionHistory('')).toEqual([]);
    expect(parseActionHistory('not-json')).toEqual([]);
    expect(parseActionHistory('{}')).toEqual([]);
  });

  it('filters out entries missing required fields', () => {
    const raw = JSON.stringify([
      {
        action: 'SCHEDULE_MEETING',
        timestamp: '2025-01-01T00:00:00Z',
        performedBy: 'applicant',
      },
      {
        action: 'REQUEST_INFO',
        timestamp: '2025-01-01T00:00:00Z',
      },
      null,
    ]);

    expect(parseActionHistory(raw)).toEqual([
      {
        action: 'SCHEDULE_MEETING',
        timestamp: '2025-01-01T00:00:00Z',
        performedBy: 'applicant',
      },
    ]);
  });
});

describe('appendActionHistoryEntry', () => {
  it('appends to existing history', () => {
    const entry1 = {
      action: 'SCHEDULE_MEETING',
      timestamp: '2025-01-01T00:00:00Z',
      performedBy: 'applicant',
    };
    const entry2 = {
      action: 'REQUEST_INFO',
      timestamp: '2025-01-02T00:00:00Z',
      performedBy: 'IR123',
    };

    const existing = JSON.stringify([entry1]);
    const updated = appendActionHistoryEntry(existing, entry2);

    expect(parseActionHistory(updated)).toEqual([entry1, entry2]);
  });

  it('handles empty history input', () => {
    const entry = {
      action: 'APPLICANT_UPDATED',
      timestamp: '2025-01-03T00:00:00Z',
      performedBy: 'applicant',
    };

    const updated = appendActionHistoryEntry(undefined, entry);

    expect(parseActionHistory(updated)).toEqual([entry]);
  });
});
