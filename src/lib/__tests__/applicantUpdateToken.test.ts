import { vi } from 'vitest';

import {
  createApplicantSecret,
  createApplicantUpdateToken,
  hashApplicantSecret,
  hashToken,
  verifyApplicantUpdateToken,
} from '../applicantUpdateToken';
import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  process.env.APPLICANT_TOKEN_SECRET = 'test-applicant-secret';
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.useRealTimers();
});

describe('createApplicantUpdateToken/verifyApplicantUpdateToken', () => {
  it('round-trips a valid payload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload = {
      email: 'jane@example.com',
      rowIndex: 12,
      exp: Math.floor(Date.now() / 1000) + 60,
      locale: 'en' as const,
    };

    const token = createApplicantUpdateToken(payload);
    const decoded = verifyApplicantUpdateToken(token);

    expect(decoded).toMatchObject(payload);
  });

  it('rejects expired tokens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload = {
      email: 'jane@example.com',
      rowIndex: 12,
      exp: Math.floor(Date.now() / 1000) - 1,
    };

    const token = createApplicantUpdateToken(payload);

    expect(() => verifyApplicantUpdateToken(token)).toThrow('Token expired');
  });

  it('rejects tampered signatures', () => {
    const payload = {
      email: 'jane@example.com',
      rowIndex: 12,
      exp: Math.floor(Date.now() / 1000) + 60,
    };

    const token = createApplicantUpdateToken(payload);
    const parts = token.split('.');
    const signature = parts[2];
    const lastChar = signature.slice(-1);
    const tamperedSignature = `${signature.slice(0, -1)}${lastChar === 'a' ? 'b' : 'a'}`;

    const tamperedToken = [parts[0], parts[1], tamperedSignature].join('.');

    expect(() => verifyApplicantUpdateToken(tamperedToken)).toThrow('Invalid signature');
  });
});

describe('hashToken', () => {
  it('returns a deterministic SHA-256 hash', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('createApplicantSecret/hashApplicantSecret', () => {
  it('creates a base64url secret and hashes it', () => {
    const secret = createApplicantSecret();

    expect(secret).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(hashApplicantSecret(secret)).toMatch(/^[0-9a-f]{64}$/);
  });
});
