import { vi } from 'vitest';
import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  mockFetch.mockReset();
  vi.resetModules();
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.useRealTimers();
});

describe('getClientIp', () => {
  function createMockRequest(headers: Record<string, string>): Request {
    return new Request('http://localhost:3000/api/test', {
      headers: new Headers(headers),
    });
  }

  it('extracts IP from cf-connecting-ip header (Cloudflare)', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({ 'cf-connecting-ip': '1.2.3.4' });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('extracts IP from x-real-ip header', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({ 'x-real-ip': '5.6.7.8' });
    expect(getClientIp(request)).toBe('5.6.7.8');
  });

  it('extracts IP from x-client-ip header', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({ 'x-client-ip': '9.10.11.12' });
    expect(getClientIp(request)).toBe('9.10.11.12');
  });

  it('extracts first IP from x-forwarded-for (comma-separated)', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({
      'x-forwarded-for': '13.14.15.16, 17.18.19.20, 21.22.23.24',
    });
    expect(getClientIp(request)).toBe('13.14.15.16');
  });

  it('extracts IP from x-vercel-forwarded-for header', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({
      'x-vercel-forwarded-for': '25.26.27.28',
    });
    expect(getClientIp(request)).toBe('25.26.27.28');
  });

  it('prioritizes cf-connecting-ip over other headers', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({
      'cf-connecting-ip': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'x-forwarded-for': '3.3.3.3',
    });
    expect(getClientIp(request)).toBe('1.1.1.1');
  });

  it('returns "unknown" when no headers present', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({});
    expect(getClientIp(request)).toBe('unknown');
  });

  it('trims whitespace from extracted IP', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({
      'x-forwarded-for': '  1.2.3.4  , 5.6.7.8',
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('returns "unknown" for empty forwarded-for header', async () => {
    const { getClientIp } = await import('../rateLimit');
    const request = createMockRequest({ 'x-forwarded-for': '' });
    expect(getClientIp(request)).toBe('unknown');
  });
});

describe('rateLimit', () => {
  function createMockRequest(ip = '1.2.3.4'): Request {
    return new Request('http://localhost:3000/api/test', {
      headers: new Headers({ 'x-forwarded-for': ip }),
    });
  }

  it('returns allowed=true when Redis is not configured', async () => {
    // Clear Redis env vars before import
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.enabled).toBe(false);
    expect(result.remaining).toBe(10);
  });

  it('returns enabled=false when limit is 0 or negative', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 0,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.enabled).toBe(false);
  });

  it('returns enabled=false when windowSeconds is 0 or negative', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 10,
      windowSeconds: 0,
    });

    expect(result.allowed).toBe(true);
    expect(result.enabled).toBe(false);
  });

  it('allows requests when under limit', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ result: 5 }, { result: 1 }], // count=5
    });

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.enabled).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.limit).toBe(10);
  });

  it('blocks requests after limit exceeded', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ result: 11 }, { result: 1 }], // count=11, over limit of 10
    });

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(false);
    expect(result.enabled).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(60);
  });

  it('handles Redis errors gracefully (fail-open)', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    mockFetch.mockRejectedValueOnce(new Error('Redis connection failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.enabled).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles non-ok response from Redis', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest();
    const result = await rateLimit(request, {
      keyPrefix: 'test',
      limit: 10,
      windowSeconds: 60,
    });

    expect(result.allowed).toBe(true);
    expect(result.enabled).toBe(false);

    consoleSpy.mockRestore();
  });

  it('constructs correct Redis key with IP', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ result: 1 }, { result: 1 }],
    });

    const { rateLimit } = await import('../rateLimit');

    const request = createMockRequest('192.168.1.100');
    await rateLimit(request, {
      keyPrefix: 'applicant',
      limit: 10,
      windowSeconds: 60,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://redis.example.com/pipeline',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('ratelimit:applicant:192.168.1.100'),
      })
    );
  });
});

describe('rateLimitHeaders', () => {
  it('sets X-RateLimit-Limit header', async () => {
    const { rateLimitHeaders } = await import('../rateLimit');
    const result = {
      allowed: true,
      limit: 10,
      remaining: 8,
      reset: 1704067200,
      retryAfter: 0,
      enabled: true,
    };

    const headers = rateLimitHeaders(result);
    expect(headers.get('X-RateLimit-Limit')).toBe('10');
  });

  it('sets X-RateLimit-Remaining header', async () => {
    const { rateLimitHeaders } = await import('../rateLimit');
    const result = {
      allowed: true,
      limit: 10,
      remaining: 8,
      reset: 1704067200,
      retryAfter: 0,
      enabled: true,
    };

    const headers = rateLimitHeaders(result);
    expect(headers.get('X-RateLimit-Remaining')).toBe('8');
  });

  it('sets X-RateLimit-Reset header', async () => {
    const { rateLimitHeaders } = await import('../rateLimit');
    const result = {
      allowed: true,
      limit: 10,
      remaining: 8,
      reset: 1704067200,
      retryAfter: 0,
      enabled: true,
    };

    const headers = rateLimitHeaders(result);
    expect(headers.get('X-RateLimit-Reset')).toBe('1704067200');
  });

  it('sets Retry-After only when blocked', async () => {
    const { rateLimitHeaders } = await import('../rateLimit');

    const blockedResult = {
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1704067200,
      retryAfter: 60,
      enabled: true,
    };

    const blockedHeaders = rateLimitHeaders(blockedResult);
    expect(blockedHeaders.get('Retry-After')).toBe('60');

    const allowedResult = {
      allowed: true,
      limit: 10,
      remaining: 5,
      reset: 1704067200,
      retryAfter: 0,
      enabled: true,
    };

    const allowedHeaders = rateLimitHeaders(allowedResult);
    expect(allowedHeaders.get('Retry-After')).toBeNull();
  });

  it('ensures remaining is never negative', async () => {
    const { rateLimitHeaders } = await import('../rateLimit');
    const result = {
      allowed: false,
      limit: 10,
      remaining: -5, // Shouldn't happen but let's be safe
      reset: 1704067200,
      retryAfter: 60,
      enabled: true,
    };

    const headers = rateLimitHeaders(result);
    expect(headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});

describe('RATE_LIMITS configuration', () => {
  it('has default values for all endpoints', async () => {
    const { RATE_LIMITS } = await import('../rateLimit');

    expect(RATE_LIMITS.applicant).toBeDefined();
    expect(RATE_LIMITS.applicant.limit).toBeGreaterThan(0);
    expect(RATE_LIMITS.applicant.windowSeconds).toBeGreaterThan(0);

    expect(RATE_LIMITS.referrer).toBeDefined();
    expect(RATE_LIMITS.apply).toBeDefined();
    expect(RATE_LIMITS.chatgpt).toBeDefined();
    expect(RATE_LIMITS.founderLogin).toBeDefined();
  });

  it('chatgpt has stricter default limits', async () => {
    const { RATE_LIMITS } = await import('../rateLimit');
    expect(RATE_LIMITS.chatgpt.limit).toBeLessThanOrEqual(RATE_LIMITS.applicant.limit);
  });

  it('founderLogin has stricter default limits', async () => {
    const { RATE_LIMITS } = await import('../rateLimit');
    expect(RATE_LIMITS.founderLogin.limit).toBeLessThanOrEqual(RATE_LIMITS.applicant.limit);
  });
});
