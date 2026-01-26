import { NextRequest } from 'next/server';
import {
  getReferrerPortalToken,
  REFERRER_PORTAL_COOKIE,
} from '../referrerPortalAuth';
import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
});

describe('getReferrerPortalToken', () => {
  function createMockRequest(options: {
    cookie?: string;
    authHeader?: string;
    queryToken?: string;
  }): NextRequest {
    const url = new URL('http://localhost:3000/api/referrer/portal/data');

    if (options.queryToken) {
      url.searchParams.set('token', options.queryToken);
    }

    const headers = new Headers();

    if (options.cookie) {
      headers.set('cookie', `${REFERRER_PORTAL_COOKIE}=${options.cookie}`);
    }

    if (options.authHeader) {
      headers.set('authorization', options.authHeader);
    }

    return new NextRequest(url, { headers });
  }

  it('extracts token from cookie', () => {
    const request = createMockRequest({ cookie: 'cookie-token-value' });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('cookie-token-value');
  });

  it('extracts token from Bearer authorization header', () => {
    const request = createMockRequest({ authHeader: 'Bearer auth-header-token' });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('auth-header-token');
  });

  it('handles lowercase bearer in authorization header', () => {
    const request = createMockRequest({ authHeader: 'bearer auth-header-token' });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('auth-header-token');
  });

  it('extracts token from query parameter', () => {
    const request = createMockRequest({ queryToken: 'query-token-value' });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('query-token-value');
  });

  it('uses fallback token when provided and no other source available', () => {
    const request = createMockRequest({});
    const token = getReferrerPortalToken(request, 'fallback-token');
    expect(token).toBe('fallback-token');
  });

  it('prioritizes cookie over authorization header', () => {
    const request = createMockRequest({
      cookie: 'cookie-token',
      authHeader: 'Bearer auth-token',
    });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('cookie-token');
  });

  it('prioritizes authorization header over query parameter', () => {
    const request = createMockRequest({
      authHeader: 'Bearer auth-token',
      queryToken: 'query-token',
    });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('auth-token');
  });

  it('prioritizes fallback over query parameter', () => {
    // Implementation priority: cookie > authHeader > fallback > query
    const request = createMockRequest({ queryToken: 'query-token' });
    const token = getReferrerPortalToken(request, 'fallback-token');
    expect(token).toBe('fallback-token');
  });

  it('uses query parameter when no fallback provided', () => {
    const request = createMockRequest({ queryToken: 'query-token' });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('query-token');
  });

  it('returns empty string when no token source available', () => {
    const request = createMockRequest({});
    const token = getReferrerPortalToken(request);
    expect(token).toBe('');
  });

  it('handles null fallback token', () => {
    const request = createMockRequest({});
    const token = getReferrerPortalToken(request, null);
    expect(token).toBe('');
  });

  it('handles empty string fallback token', () => {
    const request = createMockRequest({});
    const token = getReferrerPortalToken(request, '');
    expect(token).toBe('');
  });

  it('trims whitespace from fallback token', () => {
    const request = createMockRequest({});
    const token = getReferrerPortalToken(request, '  trimmed-token  ');
    expect(token).toBe('trimmed-token');
  });

  it('trims whitespace from Bearer token', () => {
    const request = createMockRequest({ authHeader: 'Bearer   spaced-token  ' });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('spaced-token');
  });

  it('ignores non-Bearer authorization headers', () => {
    const request = createMockRequest({
      authHeader: 'Basic dXNlcjpwYXNz',
      queryToken: 'query-token',
    });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('query-token');
  });

  it('handles empty Bearer token', () => {
    const request = createMockRequest({
      authHeader: 'Bearer ',
      queryToken: 'query-token',
    });
    const token = getReferrerPortalToken(request);
    expect(token).toBe('query-token');
  });
});
