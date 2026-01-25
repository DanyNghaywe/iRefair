import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { resetProcessEnv } from '../../../lib/__tests__/testUtils';
import { POST } from '../chatgpt/route';

const { callChatGPT, getOpenAIConfig } = vi.hoisted(() => ({
  callChatGPT: vi.fn(),
  getOpenAIConfig: vi.fn(),
}));

const { requireFounder } = vi.hoisted(() => ({
  requireFounder: vi.fn(),
}));

const { rateLimit, rateLimitHeaders } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(),
}));

vi.mock('@/lib/chatgpt', () => ({
  callChatGPT,
  getOpenAIConfig,
}));

vi.mock('@/lib/founderAuth', () => ({
  requireFounder,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit,
  rateLimitHeaders,
  RATE_LIMITS: {
    chatgpt: {
      limit: 5,
      windowSeconds: 60,
    },
  },
}));

const ORIGINAL_ENV = { ...process.env };

const makeRequest = (url: string, init?: RequestInit) => new NextRequest(url, init);

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  requireFounder.mockReset();
  rateLimit.mockReset();
  rateLimitHeaders.mockReset();
  getOpenAIConfig.mockReset();
  callChatGPT.mockReset();

  requireFounder.mockReturnValue({ email: 'founder@example.com', exp: Math.floor(Date.now() / 1000) + 1000 });
  rateLimit.mockResolvedValue({
    allowed: true,
    limit: 5,
    remaining: 4,
    reset: Math.floor(Date.now() / 1000) + 60,
    retryAfter: 0,
    enabled: true,
  });
  rateLimitHeaders.mockReturnValue(new Headers({ 'x-ratelimit-limit': '5' }));
  getOpenAIConfig.mockReturnValue({ configured: true, model: 'gpt-4.1-mini' });
});

describe('POST /api/chatgpt', () => {
  it('returns 401 when unauthorized', async () => {
    requireFounder.mockImplementation(() => {
      throw new Error('Unauthorized');
    });

    const request = makeRequest('http://localhost/api/chatgpt', { method: 'POST' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Unauthorized' });
  });

  it('returns configuration on statusOnly=true', async () => {
    const request = makeRequest('http://localhost/api/chatgpt?statusOnly=true', { method: 'POST' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, model: 'gpt-4.1-mini' });
    expect(callChatGPT).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const request = makeRequest('http://localhost/api/chatgpt', {
      method: 'POST',
      body: 'not-json',
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'Invalid JSON payload.' });
  });

  it('calls ChatGPT with a prompt and returns the reply', async () => {
    callChatGPT.mockResolvedValue({ text: 'Hello there', model: 'gpt-4.1-mini' });

    const request = makeRequest('http://localhost/api/chatgpt', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hi' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      reply: 'Hello there',
      model: 'gpt-4.1-mini',
    });
    expect(callChatGPT).toHaveBeenCalledOnce();
  });
});
