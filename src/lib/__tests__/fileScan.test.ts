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
});

describe('scanBufferForViruses', () => {
  it('returns skipped=true when VIRUSTOTAL_API_KEY is not set', async () => {
    delete process.env.VIRUSTOTAL_API_KEY;

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uploads file to VirusTotal and polls for results', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    // Mock upload response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    // Mock analysis poll response (completed, clean)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          attributes: {
            status: 'completed',
            stats: { malicious: 0, suspicious: 0 },
          },
        },
      }),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns ok=false when malicious content detected', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          attributes: {
            status: 'completed',
            stats: { malicious: 3, suspicious: 0 },
          },
        },
      }),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('malicious content');
    const result = await scanBufferForViruses(buffer, 'virus.exe');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('File flagged by antivirus scan.');
  });

  it('returns ok=false when suspicious content detected', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          attributes: {
            status: 'completed',
            stats: { malicious: 0, suspicious: 2 },
          },
        },
      }),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('suspicious content');
    const result = await scanBufferForViruses(buffer, 'sus.exe');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('File flagged by antivirus scan.');
  });

  it('skips scan on rate limit (429)', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.message).toContain('429');

    consoleSpy.mockRestore();
  });

  it('skips scan on server error (5xx)', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service unavailable',
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    consoleSpy.mockRestore();
  });

  it('skips scan on timeout (408)', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 408,
      text: async () => 'Request timeout',
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    consoleSpy.mockRestore();
  });

  it('returns error when upload fails with non-transient status', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('400');
  });

  it('returns error when upload returns 401 unauthorized', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'invalid-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('401');
  });

  it('returns error when no analysis ID returned', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('analysis ID');
  });

  it('returns error when response has no data', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('analysis ID');
  });

  it('skips scan gracefully on network timeout', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    const timeoutError = new Error('Timeout');
    timeoutError.name = 'TimeoutError';
    mockFetch.mockRejectedValueOnce(timeoutError);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.message).toContain('timeout');

    consoleSpy.mockRestore();
  });

  it('skips scan gracefully on AbortError', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    consoleSpy.mockRestore();
  });

  it('skips scan gracefully on general network error', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.message).toContain('service unavailable');

    consoleSpy.mockRestore();
  });

  it('skips scan during polling on rate limit', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    consoleSpy.mockRestore();
  });

  it('returns error during polling on non-transient status', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('404');
  });

  it('polls multiple times until completed', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'test-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    // First poll - queued
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { attributes: { status: 'queued', stats: {} } },
      }),
    });

    // Second poll - completed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          attributes: {
            status: 'completed',
            stats: { malicious: 0, suspicious: 0 },
          },
        },
      }),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    const result = await scanBufferForViruses(buffer, 'test.pdf');

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('sends correct headers and body to VirusTotal', async () => {
    process.env.VIRUSTOTAL_API_KEY = 'my-secret-api-key';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'analysis-123' } }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { attributes: { status: 'completed', stats: {} } },
      }),
    });

    const { scanBufferForViruses } = await import('../fileScan');
    const buffer = Buffer.from('test content');
    await scanBufferForViruses(buffer, 'myfile.pdf');

    // Check upload call
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://www.virustotal.com/api/v3/files',
      expect.objectContaining({
        method: 'POST',
        headers: { 'x-apikey': 'my-secret-api-key' },
      })
    );

    // Check analysis poll call
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://www.virustotal.com/api/v3/analyses/analysis-123',
      expect.objectContaining({
        headers: { 'x-apikey': 'my-secret-api-key' },
      })
    );
  });
});

describe('ensureResumeLooksLikeCv - file validation', () => {
  it('returns error for invalid PDF magic bytes', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.from('not a pdf file');
    const result = await ensureResumeLooksLikeCv(buffer, 'application/pdf', 'fake.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid PDF');
  });

  it('returns error for invalid DOCX structure (no ZIP magic)', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.from('not a docx file');
    const result = await ensureResumeLooksLikeCv(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'fake.docx'
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid DOCX');
  });

  it('returns error for ZIP without word/document.xml entry', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    // ZIP magic bytes but no docx entry
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const buffer = Buffer.concat([zipHeader, Buffer.from('some other content')]);

    const result = await ensureResumeLooksLikeCv(
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'notreally.docx'
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid DOCX');
  });

  it('skips validation for legacy .doc files gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.from('legacy doc content');
    const result = await ensureResumeLooksLikeCv(buffer, 'application/msword', 'old.doc');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    consoleSpy.mockRestore();
  });

  it('skips validation for unsupported file types', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.from('some random content');
    const result = await ensureResumeLooksLikeCv(buffer, 'text/plain', 'notes.txt');

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);

    consoleSpy.mockRestore();
  });

  it('detects PDF from extension when mime type not provided', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    // Invalid PDF (no magic bytes) but .pdf extension
    const buffer = Buffer.from('not valid pdf content');
    const result = await ensureResumeLooksLikeCv(buffer, '', 'resume.pdf');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid PDF');
  });

  it('detects DOCX from extension when mime type not provided', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.from('not valid docx content');
    const result = await ensureResumeLooksLikeCv(buffer, '', 'resume.docx');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid DOCX');
  });

  it('handles empty buffer', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.alloc(0);
    const result = await ensureResumeLooksLikeCv(buffer, 'application/pdf', 'empty.pdf');

    expect(result.ok).toBe(false);
  });

  it('handles very small buffer', async () => {
    const { ensureResumeLooksLikeCv } = await import('../fileScan');
    const buffer = Buffer.from('ab');
    const result = await ensureResumeLooksLikeCv(buffer, 'application/pdf', 'tiny.pdf');

    expect(result.ok).toBe(false);
  });
});
