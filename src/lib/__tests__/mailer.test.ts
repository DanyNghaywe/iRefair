import { vi } from 'vitest';
import { resetProcessEnv } from './testUtils';

// Mock nodemailer before importing mailer
const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

// Import after mocking
import { sendMail } from '../mailer';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
  vi.clearAllMocks();

  // Reset the cached transporter by clearing the module cache
  vi.resetModules();

  // Set default env vars
  process.env.GMAIL_USER = 'test@gmail.com';
  process.env.GMAIL_APP_PASSWORD = 'test-app-password';
});

afterEach(() => {
  resetProcessEnv(ORIGINAL_ENV);
});

describe('sendMail', () => {
  it('throws error when GMAIL credentials not configured', async () => {
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;

    // Need to re-import to clear transporter cache
    vi.resetModules();
    const { sendMail: freshSendMail } = await import('../mailer');

    await expect(
      freshSendMail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      })
    ).rejects.toThrow('GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set');
  });

  it('throws error when only GMAIL_USER is configured', async () => {
    process.env.GMAIL_USER = 'test@gmail.com';
    delete process.env.GMAIL_APP_PASSWORD;

    vi.resetModules();
    const { sendMail: freshSendMail } = await import('../mailer');

    await expect(
      freshSendMail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      })
    ).rejects.toThrow('GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set');
  });

  it('creates transporter with Gmail service', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();

    // Re-mock after resetModules
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: 'test@gmail.com',
        pass: 'test-app-password',
      },
    });
  });

  it('sends email with correct parameters', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      })
    );
  });

  it('uses default from name when SMTP_FROM_NAME not set', async () => {
    delete process.env.SMTP_FROM_NAME;

    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'iRefair <test@gmail.com>',
      })
    );
  });

  it('uses custom from name when SMTP_FROM_NAME is set', async () => {
    process.env.SMTP_FROM_NAME = 'Custom Name';

    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Custom Name <test@gmail.com>',
      })
    );
  });

  it('includes X-Entity-Ref-ID header', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Entity-Ref-ID': expect.any(String),
        }),
      })
    );
  });

  it('handles cc recipients', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
      cc: ['cc1@example.com', 'cc2@example.com'],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: ['cc1@example.com', 'cc2@example.com'],
      })
    );
  });

  it('uses replyTo when provided', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
      replyTo: 'reply@example.com',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'reply@example.com',
      })
    );
  });

  it('uses GMAIL_USER as default replyTo', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<test-message-id@gmail.com>',
      response: '250 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'test@gmail.com',
      })
    );
  });

  it('returns messageId and response on success', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<unique-message-id@gmail.com>',
      response: '250 2.0.0 OK',
    });

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    const result = await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(result.messageId).toBe('<unique-message-id@gmail.com>');
    expect(result.response).toBe('250 2.0.0 OK');
  });

  it('throws on send failure', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { sendMail: freshSendMail } = await import('../mailer');

    await expect(
      freshSendMail({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      })
    ).rejects.toThrow('SMTP connection failed');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logs message ID on success', async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: '<logged-message-id@gmail.com>',
      response: '250 OK',
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.resetModules();
    vi.doMock('nodemailer', () => ({
      default: {
        createTransport: mockCreateTransport,
      },
    }));

    const { sendMail: freshSendMail } = await import('../mailer');

    await freshSendMail({
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[MAILER]'),
      expect.any(String),
      expect.stringContaining('To:'),
      'recipient@example.com'
    );

    consoleSpy.mockRestore();
  });
});
