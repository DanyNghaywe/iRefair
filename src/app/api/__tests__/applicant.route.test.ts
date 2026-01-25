import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Store original env
const originalEnv = { ...process.env };

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 10 }),
  rateLimitHeaders: vi.fn().mockReturnValue({}),
  RATE_LIMITS: { applicant: { limit: 10, window: 60 } },
}));

vi.mock('@/lib/sheets', () => ({
  findExistingApplicant: vi.fn(),
  getApplicantByEmail: vi.fn(),
  findApplicantByIdentifier: vi.fn(),
  getApplicationById: vi.fn(),
  generateIRAIN: vi.fn().mockResolvedValue('iRAIN0000000001'),
  upsertApplicantRow: vi.fn().mockResolvedValue({ id: 'iRAIN0000000001', created: true }),
  updateRowById: vi.fn().mockResolvedValue({ updated: true }),
  ensureColumns: vi.fn(),
  cleanupExpiredPendingApplicants: vi.fn().mockResolvedValue({ deleted: 0, errors: 0 }),
  cleanupExpiredPendingUpdates: vi.fn().mockResolvedValue({ cleared: 0, errors: 0 }),
  isIrain: vi.fn((v) => /^iRAIN\d{10}$/i.test(v)),
  APPLICANT_SHEET_NAME: 'Applicants',
  APPLICANT_UPDATE_TOKEN_HASH_HEADER: 'Update Token Hash',
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER: 'Update Token Expires At',
  APPLICANT_UPDATE_PENDING_PAYLOAD_HEADER: 'Update Pending Payload',
  APPLICANT_REGISTRATION_STATUS_HEADER: 'Registration Status',
  APPLICANT_REMINDER_TOKEN_HASH_HEADER: 'Registration Reminder Token Hash',
  APPLICANT_REMINDER_SENT_AT_HEADER: 'Registration Reminder Sent At',
  APPLICANT_LOCALE_HEADER: 'Locale',
  APPLICANT_DESIRED_ROLE_HEADER: 'Desired Role',
  APPLICANT_TARGET_COMPANIES_HEADER: 'Target Companies',
  APPLICANT_HAS_POSTINGS_HEADER: 'Has Postings',
  APPLICANT_POSTING_NOTES_HEADER: 'Posting Notes',
  APPLICANT_PITCH_HEADER: 'Pitch',
  LEGACY_APPLICANT_ID_HEADER: 'Legacy Applicant ID',
}));

vi.mock('@/lib/fileScan', () => ({
  scanBufferForViruses: vi.fn().mockResolvedValue({ ok: true }),
  ensureResumeLooksLikeCv: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/drive', () => ({
  uploadFileToDrive: vi.fn().mockResolvedValue({ fileId: 'file-123' }),
}));

vi.mock('@/lib/mailer', () => ({
  sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
}));

vi.mock('@/lib/emailTemplates', () => ({
  newApplicantRegistrationConfirmation: vi.fn().mockReturnValue({
    subject: 'Confirm Registration',
    html: '<p>Confirm</p>',
    text: 'Confirm',
  }),
  applicantProfileUpdateConfirmation: vi.fn().mockReturnValue({
    subject: 'Confirm Update',
    html: '<p>Confirm Update</p>',
    text: 'Confirm Update',
  }),
}));

vi.mock('@/lib/applicantUpdateToken', () => ({
  createApplicantUpdateToken: vi.fn().mockReturnValue('test-token'),
  hashToken: vi.fn().mockReturnValue('hashed-token'),
}));

vi.mock('@/lib/tokens', () => ({
  hashOpaqueToken: vi.fn().mockReturnValue('hashed-opaque'),
  isExpired: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/validation', () => ({
  normalizeHttpUrl: vi.fn((url) => url),
}));

function createFormDataRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  return new NextRequest('http://localhost:3000/api/applicant', {
    method: 'POST',
    body: formData,
  });
}

function createMockPDFFile(): File {
  const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF magic bytes
  return new File([content], 'resume.pdf', { type: 'application/pdf' });
}

describe('POST /api/applicant', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns 429 when rate limited', async () => {
    const { rateLimit } = await import('@/lib/rateLimit');
    vi.mocked(rateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0, limit: 10 });

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Too many requests');
  });

  it('returns ok:true for honeypot submissions', async () => {
    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      website: 'spam-content', // Honeypot field
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      email: 'john@example.com',
      // Missing firstName
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Missing required fields');
  });

  it('returns 400 when resume is missing for new applicant', async () => {
    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      // Missing resume
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe('resume');
  });

  it('returns 400 for invalid resume file type', async () => {
    const { POST } = await import('../applicant/route');
    const invalidFile = new File(['content'], 'resume.exe', { type: 'application/octet-stream' });
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: invalidFile,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe('resume');
  });

  it('returns 400 when virus scan fails', async () => {
    const { scanBufferForViruses } = await import('@/lib/fileScan');
    vi.mocked(scanBufferForViruses).mockResolvedValueOnce({ ok: false, message: 'Malware detected' });

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe('resume');
  });

  it('returns 400 when file does not look like a CV', async () => {
    const { ensureResumeLooksLikeCv } = await import('@/lib/fileScan');
    vi.mocked(ensureResumeLooksLikeCv).mockResolvedValueOnce({ ok: false, message: 'Not a valid CV' });

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe('resume');
  });

  it('creates new applicant with pending confirmation status', async () => {
    const { POST } = await import('../applicant/route');
    const { sendMail } = await import('@/lib/mailer');

    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.needsEmailConfirm).toBe(true);

    expect(sendMail).toHaveBeenCalled();
  });

  it('returns 403 for archived applicants', async () => {
    const { findExistingApplicant } = await import('@/lib/sheets');
    vi.mocked(findExistingApplicant).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'john@example.com',
        firstName: 'John',
        familyName: 'Doe',
        archived: 'true',
      },
    } as any);

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('archived');
  });

  it('handles update request token validation', async () => {
    const { getApplicationById } = await import('@/lib/sheets');
    vi.mocked(getApplicationById).mockResolvedValueOnce({
      record: {
        id: 'APP-001',
        applicantId: 'iRAIN0000000001',
        updateRequestTokenHash: 'hashed-opaque',
        updateRequestExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        updateRequestPurpose: 'info',
      },
    } as any);

    const { findApplicantByIdentifier } = await import('@/lib/sheets');
    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'john@example.com',
        firstName: 'John',
        familyName: 'Doe',
      },
    } as any);

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      updateRequestToken: 'valid-token',
      updateRequestApplicationId: 'APP-001',
      // No resume required for 'info' purpose
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('returns 410 for expired update request', async () => {
    const { getApplicationById } = await import('@/lib/sheets');
    vi.mocked(getApplicationById).mockResolvedValueOnce({
      record: {
        id: 'APP-001',
        applicantId: 'iRAIN0000000001',
        updateRequestTokenHash: 'hashed-opaque',
        updateRequestExpiresAt: new Date(Date.now() - 86400000).toISOString(),
      },
    } as any);

    const { isExpired } = await import('@/lib/tokens');
    vi.mocked(isExpired).mockReturnValueOnce(true);

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      updateRequestToken: 'valid-token',
      updateRequestApplicationId: 'APP-001',
    });

    const response = await POST(request);
    expect(response.status).toBe(410);

    const body = await response.json();
    expect(body.error).toContain('expired');
  });

  it('returns 404 for non-existent application in update request', async () => {
    const { getApplicationById } = await import('@/lib/sheets');
    vi.mocked(getApplicationById).mockResolvedValueOnce(null);

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      updateRequestToken: 'valid-token',
      updateRequestApplicationId: 'APP-999',
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it('returns 403 for archived application in update request', async () => {
    const { getApplicationById } = await import('@/lib/sheets');
    vi.mocked(getApplicationById).mockResolvedValueOnce({
      record: {
        id: 'APP-001',
        applicantId: 'iRAIN0000000001',
        archived: 'true',
      },
    } as any);

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      updateRequestToken: 'valid-token',
      updateRequestApplicationId: 'APP-001',
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('archived');
  });

  it('returns 400 when update request token is provided without application ID', async () => {
    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      updateRequestToken: 'valid-token',
      // Missing updateRequestApplicationId
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('update request');
  });

  it('triggers background cleanup of expired applicants', async () => {
    const { cleanupExpiredPendingApplicants, cleanupExpiredPendingUpdates } = await import('@/lib/sheets');

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'John',
      email: 'john@example.com',
      resume: createMockPDFFile(),
    });

    await POST(request);

    // Wait for background cleanup to be called
    await new Promise((r) => setTimeout(r, 10));

    expect(cleanupExpiredPendingApplicants).toHaveBeenCalled();
    expect(cleanupExpiredPendingUpdates).toHaveBeenCalled();
  });

  it('handles locale parameter correctly', async () => {
    const { newApplicantRegistrationConfirmation } = await import('@/lib/emailTemplates');

    const { POST } = await import('../applicant/route');
    const request = createFormDataRequest({
      firstName: 'Jean',
      email: 'jean@example.com',
      resume: createMockPDFFile(),
      language: 'fr',
    });

    await POST(request);

    expect(newApplicantRegistrationConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'fr' })
    );
  });
});
