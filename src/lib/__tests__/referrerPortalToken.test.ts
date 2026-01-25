import { vi } from 'vitest';

import {
  createReferrerToken,
  normalizePortalTokenVersion,
  verifyReferrerToken,
} from '../referrerPortalToken';
import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  process.env.REFERRER_PORTAL_SECRET = 'test-referrer-secret';
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.useRealTimers();
});

describe('normalizePortalTokenVersion', () => {
  it('parses positive integers and falls back to 1', () => {
    expect(normalizePortalTokenVersion('2')).toBe(2);
    expect(normalizePortalTokenVersion('0')).toBe(1);
    expect(normalizePortalTokenVersion('')).toBe(1);
    expect(normalizePortalTokenVersion('not-a-number')).toBe(1);
  });
});

describe('createReferrerToken/verifyReferrerToken', () => {
  it('round-trips a valid token payload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const token = createReferrerToken('IR123', 2, 60);
    const payload = verifyReferrerToken(token);

    expect(payload.irref).toBe('IR123');
    expect(payload.v).toBe(2);
    expect(payload.exp).toBe(Math.floor(Date.now() / 1000) + 60);
  });

  it('rejects expired tokens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const token = createReferrerToken('IR123', 1, -1);

    expect(() => verifyReferrerToken(token)).toThrow('Token expired');
  });

  it('rejects tampered signatures', () => {
    const token = createReferrerToken('IR123', 1, 60);
    const parts = token.split('.');
    const signature = parts[2];
    const lastChar = signature.slice(-1);
    const tamperedSignature = `${signature.slice(0, -1)}${lastChar === 'a' ? 'b' : 'a'}`;
    const tamperedToken = [parts[0], parts[1], tamperedSignature].join('.');

    expect(() => verifyReferrerToken(tamperedToken)).toThrow('Invalid signature');
  });
});
