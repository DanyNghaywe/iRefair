import { vi } from 'vitest';

import { createOpaqueToken, hashOpaqueToken, isExpired } from '../tokens';

afterEach(() => {
  vi.useRealTimers();
});

describe('createOpaqueToken', () => {
  it('returns a 48-character hex string', () => {
    const token = createOpaqueToken();
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });
});

describe('hashOpaqueToken', () => {
  it('returns a deterministic SHA-256 hash', () => {
    expect(hashOpaqueToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('isExpired', () => {
  it('returns true for empty or invalid inputs', () => {
    expect(isExpired()).toBe(true);
    expect(isExpired('')).toBe(true);
    expect(isExpired('not-a-date')).toBe(true);
  });

  it('checks expiration relative to current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const past = new Date('2024-12-31T23:59:59Z').toISOString();
    const future = new Date('2025-01-01T00:00:01Z').toISOString();

    expect(isExpired(past)).toBe(true);
    expect(isExpired(future)).toBe(false);
  });
});
