import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('chatgpt', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getOpenAIConfig', () => {
    it('returns configured: false when no API key is set', async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_MODEL;

      const { getOpenAIConfig } = await import('../chatgpt');
      const config = getOpenAIConfig();

      expect(config.configured).toBe(false);
      expect(config.apiKey).toBe('');
      expect(config.model).toBe('gpt-4.1-mini');
    });

    it('returns configured: true when API key is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { getOpenAIConfig } = await import('../chatgpt');
      const config = getOpenAIConfig();

      expect(config.configured).toBe(true);
      expect(config.apiKey).toBe('sk-test-key');
    });

    it('uses custom model from env', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.OPENAI_MODEL = 'gpt-4-turbo';

      const { getOpenAIConfig } = await import('../chatgpt');
      const config = getOpenAIConfig();

      expect(config.model).toBe('gpt-4-turbo');
    });

    it('uses default model when OPENAI_MODEL is not set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      delete process.env.OPENAI_MODEL;

      const { getOpenAIConfig } = await import('../chatgpt');
      const config = getOpenAIConfig();

      expect(config.model).toBe('gpt-4.1-mini');
    });
  });

  describe('callChatGPT', () => {
    it('throws error when API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const { callChatGPT } = await import('../chatgpt');

      await expect(
        callChatGPT([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('OPENAI_API_KEY is not configured.');
    });

    it('throws error for empty messages array', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { callChatGPT } = await import('../chatgpt');

      await expect(callChatGPT([])).rejects.toThrow('At least one message is required.');
    });

    it('throws error when all messages are empty', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { callChatGPT } = await import('../chatgpt');

      await expect(
        callChatGPT([{ role: 'user', content: '   ' }])
      ).rejects.toThrow('All ChatGPT messages were empty.');
    });

    it('throws error when messages have null content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const { callChatGPT } = await import('../chatgpt');

      await expect(
        // @ts-expect-error testing invalid input
        callChatGPT([{ role: 'user', content: null }])
      ).rejects.toThrow('All ChatGPT messages were empty.');
    });

    it('makes API request with correct payload', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [{
            content: [{ type: 'text', text: 'Hello there!' }]
          }]
        })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      const result = await callChatGPT([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Say hello' }
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-test-key'
          }
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4.1-mini');
      expect(callBody.input).toHaveLength(2);
      expect(callBody.input[0].role).toBe('system');
      expect(callBody.input[1].role).toBe('user');

      expect(result.text).toBe('Hello there!');
      expect(result.model).toBe('gpt-4.1-mini');
    });

    it('uses modelOverride when provided', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [{ content: [{ type: 'text', text: 'Response' }] }]
        })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      await callChatGPT(
        [{ role: 'user', content: 'Test' }],
        'gpt-4-turbo'
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4-turbo');
    });

    it('throws error on API failure', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Rate limit exceeded')
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      await expect(
        callChatGPT([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('throws error on empty response', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ output: [] })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      await expect(
        callChatGPT([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('ChatGPT returned an empty response.');
    });

    it('passes abort signal to fetch', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const controller = new AbortController();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [{ content: [{ text: 'Response' }] }]
        })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      await callChatGPT(
        [{ role: 'user', content: 'Test' }],
        undefined,
        { signal: controller.signal }
      );

      expect(mockFetch.mock.calls[0][1].signal).toBe(controller.signal);
    });

    it('filters out messages with invalid content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [{ content: [{ text: 'Response' }] }]
        })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      await callChatGPT([
        { role: 'user', content: '' }, // Empty - filtered
        { role: 'user', content: 'Valid message' },
        // @ts-expect-error testing invalid input
        { role: 'user', content: null }, // Null - filtered
      ]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input).toHaveLength(1);
      expect(callBody.input[0].content[0].text).toBe('Valid message');
    });

    it('normalizes unknown roles to user', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [{ content: [{ text: 'Response' }] }]
        })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      await callChatGPT([
        // @ts-expect-error testing invalid role
        { role: 'function', content: 'Some content' }
      ]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input[0].role).toBe('user');
    });

    it('concatenates multiple content items in response', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [
            { content: [{ text: 'First line' }] },
            { content: [{ text: 'Second line' }] }
          ]
        })
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      const result = await callChatGPT([{ role: 'user', content: 'Test' }]);

      expect(result.text).toBe('First line\nSecond line');
    });

    it('returns raw payload in result', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const responsePayload = {
        output: [{ content: [{ text: 'Response' }] }]
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responsePayload)
      });
      global.fetch = mockFetch;

      const { callChatGPT } = await import('../chatgpt');

      const result = await callChatGPT([{ role: 'user', content: 'Test' }]);

      expect(result.raw).toEqual(responsePayload);
    });
  });
});
