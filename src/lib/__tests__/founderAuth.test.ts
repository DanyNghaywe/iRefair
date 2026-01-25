import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  signSession,
  verifySession,
  verifySessionEdge,
  getFounderFromRequest,
  requireFounder,
  FOUNDER_SESSION_COOKIE,
  type FounderSession,
} from '../founderAuth';
import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };
const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long-for-hmac';

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  process.env.FOUNDER_AUTH_SECRET = TEST_SECRET;
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.useRealTimers();
});

describe('signSession', () => {
  it('creates a valid signed token with correct structure', () => {
    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(payload, TEST_SECRET);

    expect(token).toContain('.');
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('encodes payload as base64url', () => {
    const payload: FounderSession = {
      email: 'test@example.com',
      exp: 1704067200,
    };

    const token = signSession(payload, TEST_SECRET);
    const [body] = token.split('.');

    // base64url should not contain + / or =
    expect(body).not.toMatch(/[+/=]/);

    // Decode and verify payload
    const decoded = Buffer.from(
      body.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString();
    const parsed = JSON.parse(decoded);
    expect(parsed.email).toBe('test@example.com');
    expect(parsed.exp).toBe(1704067200);
  });

  it('produces consistent signatures for same payload and secret', () => {
    const payload: FounderSession = {
      email: 'test@example.com',
      exp: 1704067200,
    };

    const token1 = signSession(payload, TEST_SECRET);
    const token2 = signSession(payload, TEST_SECRET);

    expect(token1).toBe(token2);
  });

  it('produces different signatures for different secrets', () => {
    const payload: FounderSession = {
      email: 'test@example.com',
      exp: 1704067200,
    };

    const token1 = signSession(payload, TEST_SECRET);
    const token2 = signSession(payload, 'different-secret-also-32-chars-long');

    expect(token1).not.toBe(token2);
  });
});

describe('verifySession', () => {
  it('verifies a correctly signed token', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    const token = signSession(payload, TEST_SECRET);
    const result = verifySession(token, TEST_SECRET);

    expect(result).not.toBeNull();
    expect(result?.email).toBe('test@example.com');
  });

  it('returns null for missing secret', () => {
    delete process.env.FOUNDER_AUTH_SECRET;

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = signSession(payload, TEST_SECRET);

    // Pass undefined secret and no env var
    const result = verifySession(token, undefined);
    expect(result).toBeNull();
  });

  it('returns null for malformed token (missing parts)', () => {
    expect(verifySession('no-dot-in-token', TEST_SECRET)).toBeNull();
    expect(verifySession('only.', TEST_SECRET)).toBeNull();
    expect(verifySession('.only', TEST_SECRET)).toBeNull();
    expect(verifySession('', TEST_SECRET)).toBeNull();
  });

  it('returns null for tampered signature', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(payload, TEST_SECRET);
    const [body] = token.split('.');
    const tamperedToken = `${body}.tampered-signature`;

    const result = verifySession(tamperedToken, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('returns null for tampered payload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(payload, TEST_SECRET);
    const [, signature] = token.split('.');

    // Create tampered body
    const tamperedPayload = { email: 'hacker@evil.com', exp: payload.exp };
    const tamperedBody = Buffer.from(JSON.stringify(tamperedPayload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const tamperedToken = `${tamperedBody}.${signature}`;
    const result = verifySession(tamperedToken, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('returns null for invalid base64 payload', () => {
    const invalidToken = '!!!invalid-base64!!!.some-signature';
    const result = verifySession(invalidToken, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('returns null for missing required fields', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    // Create token with missing email
    const noEmail = { exp: Math.floor(Date.now() / 1000) + 3600 };
    const body1 = Buffer.from(JSON.stringify(noEmail))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    // Sign it properly
    const { createHmac } = require('crypto');
    const sig1 = createHmac('sha256', TEST_SECRET).update(body1).digest();
    const sigEncoded1 = Buffer.from(sig1)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(verifySession(`${body1}.${sigEncoded1}`, TEST_SECRET)).toBeNull();

    // Create token with missing exp
    const noExp = { email: 'test@example.com' };
    const body2 = Buffer.from(JSON.stringify(noExp))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const sig2 = createHmac('sha256', TEST_SECRET).update(body2).digest();
    const sigEncoded2 = Buffer.from(sig2)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(verifySession(`${body2}.${sigEncoded2}`, TEST_SECRET)).toBeNull();
  });

  it('returns null for expired tokens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) - 1, // Already expired
    };

    const token = signSession(payload, TEST_SECRET);
    const result = verifySession(token, TEST_SECRET);
    expect(result).toBeNull();
  });

  it('uses env secret when not provided explicitly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(payload, TEST_SECRET);
    // Don't pass secret, should use env
    const result = verifySession(token);
    expect(result).not.toBeNull();
    expect(result?.email).toBe('test@example.com');
  });
});

describe('verifySessionEdge', () => {
  it('verifies tokens using Web Crypto API', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const token = signSession(payload, TEST_SECRET);
    const result = await verifySessionEdge(token);

    expect(result).not.toBeNull();
    expect(result?.email).toBe('test@example.com');
  });

  it('returns null when secret is not configured', async () => {
    delete process.env.FOUNDER_AUTH_SECRET;

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = signSession(payload, TEST_SECRET);

    const result = await verifySessionEdge(token);
    expect(result).toBeNull();
  });

  it('returns null for malformed tokens', async () => {
    expect(await verifySessionEdge('no-dot')).toBeNull();
    expect(await verifySessionEdge('')).toBeNull();
  });

  it('handles expired tokens correctly', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) - 1, // Expired
    };

    const token = signSession(payload, TEST_SECRET);
    const result = await verifySessionEdge(token);
    expect(result).toBeNull();
  });
});

describe('getFounderFromRequest', () => {
  function createMockRequest(cookieValue?: string): NextRequest {
    const url = 'http://localhost:3000/api/test';
    const request = new NextRequest(url);

    if (cookieValue) {
      // NextRequest cookies are read-only, so we need to create a new request with cookies
      const headers = new Headers();
      headers.set('cookie', `${FOUNDER_SESSION_COOKIE}=${cookieValue}`);
      return new NextRequest(url, { headers });
    }

    return request;
  }

  it('extracts session from cookie', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = signSession(payload, TEST_SECRET);
    const request = createMockRequest(token);

    const result = getFounderFromRequest(request);
    expect(result).not.toBeNull();
    expect(result?.email).toBe('test@example.com');
  });

  it('returns null when cookie is missing', () => {
    const request = createMockRequest();
    const result = getFounderFromRequest(request);
    expect(result).toBeNull();
  });

  it('returns null when secret is not configured', () => {
    delete process.env.FOUNDER_AUTH_SECRET;

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = signSession(payload, TEST_SECRET);
    const request = createMockRequest(token);

    const result = getFounderFromRequest(request);
    expect(result).toBeNull();
  });
});

describe('requireFounder', () => {
  function createMockRequest(cookieValue?: string): NextRequest {
    const url = 'http://localhost:3000/api/test';
    if (cookieValue) {
      const headers = new Headers();
      headers.set('cookie', `${FOUNDER_SESSION_COOKIE}=${cookieValue}`);
      return new NextRequest(url, { headers });
    }
    return new NextRequest(url);
  }

  it('returns session when valid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = signSession(payload, TEST_SECRET);
    const request = createMockRequest(token);

    const result = requireFounder(request);
    expect(result.email).toBe('test@example.com');
  });

  it('throws Error("Unauthorized") when invalid', () => {
    const request = createMockRequest();

    expect(() => requireFounder(request)).toThrow('Unauthorized');
  });

  it('throws Error("Unauthorized") for expired session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    const payload: FounderSession = {
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) - 1, // Expired
    };
    const token = signSession(payload, TEST_SECRET);
    const request = createMockRequest(token);

    expect(() => requireFounder(request)).toThrow('Unauthorized');
  });
});
