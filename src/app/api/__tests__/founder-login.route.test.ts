import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { resetProcessEnv } from '@/lib/__tests__/testUtils';

const ORIGINAL_ENV = { ...process.env };

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(() => new Headers()),
  RATE_LIMITS: {
    founderLogin: { limit: 5, windowSeconds: 60 },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.clearAllMocks();

  // Set default env vars
  process.env.FOUNDER_EMAIL = 'admin@example.com';
  process.env.FOUNDER_PASSWORD_HASH = '$2b$10$hashedpassword';
  process.env.FOUNDER_AUTH_SECRET = 'test-secret-that-is-at-least-32-characters-long';
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
});

describe('POST /api/founder/auth/login', () => {
  async function createRequest(body: object): Promise<NextRequest> {
    return new NextRequest('http://localhost:3000/api/founder/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('returns 429 when rate limited', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
      enabled: true,
    });

    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ email: 'test@example.com', password: 'password' });
    const response = await POST(request);

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Too many login attempts');
  });

  it('returns 500 when auth not configured', async () => {
    delete process.env.FOUNDER_EMAIL;

    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    vi.resetModules();
    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ email: 'test@example.com', password: 'password' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('not configured');
  });

  it('returns 400 when email missing', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ password: 'password' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('email and password');
  });

  it('returns 400 when password missing', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ email: 'admin@example.com' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.ok).toBe(false);
  });

  it('returns 401 for wrong email', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ email: 'wrong@example.com', password: 'password' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Invalid email or password');
  });

  it('returns 401 for wrong password', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const bcrypt = await import('bcryptjs');
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ email: 'admin@example.com', password: 'wrongpassword' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.ok).toBe(false);
    expect(data.error).toContain('Invalid email or password');
  });

  it('returns 200 and sets cookie on successful login', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const bcrypt = await import('bcryptjs');
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    const { POST } = await import('../founder/auth/login/route');
    const request = await createRequest({ email: 'admin@example.com', password: 'correctpassword' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);

    // Check cookie was set
    const setCookieHeader = response.headers.get('set-cookie');
    expect(setCookieHeader).toBeTruthy();
    expect(setCookieHeader).toContain('irefair_founder');
    expect(setCookieHeader).toContain('HttpOnly');
  });

  it('normalizes email to lowercase', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const bcrypt = await import('bcryptjs');
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    const { POST } = await import('../founder/auth/login/route');
    // Use uppercase email
    const request = await createRequest({ email: 'ADMIN@EXAMPLE.COM', password: 'correctpassword' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  it('trims whitespace from email', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    (rateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      allowed: true,
      enabled: true,
    });

    const bcrypt = await import('bcryptjs');
    (bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    const { POST } = await import('../founder/auth/login/route');
    // Email with whitespace
    const request = await createRequest({ email: '  admin@example.com  ', password: 'correctpassword' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });
});
