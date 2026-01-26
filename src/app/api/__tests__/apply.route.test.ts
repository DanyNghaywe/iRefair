import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import type * as Sheets from '@/lib/sheets';

// Store original env
const originalEnv = { ...process.env };

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 10 }),
  rateLimitHeaders: vi.fn().mockReturnValue({}),
  RATE_LIMITS: { apply: { limit: 10, window: 60 } },
}));

vi.mock('@/lib/sheets', () => ({
  findApplicantByIdentifier: vi.fn(),
  findReferrerByIrcrn: vi.fn(),
  findReferrerCompanyByIrcrnStrict: vi.fn(),
  findDuplicateApplication: vi.fn(),
  appendApplicationRow: vi.fn(),
  generateSubmissionId: vi.fn().mockResolvedValue('APP-001'),
  isIrain: vi.fn((v) => /^iRAIN\d{10}$/i.test(String(v).trim())),
  isIrcrn: vi.fn((v) => /^iRCRN\d{10}$/i.test(String(v).trim())),
  ReferrerLookupError: class ReferrerLookupError extends Error {},
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
  applicationSubmittedToReferrer: vi.fn().mockReturnValue({
    subject: 'New Application',
    html: '<p>New application</p>',
    text: 'New application',
  }),
  applicationConfirmationToApplicant: vi.fn().mockReturnValue({
    subject: 'Application Submitted',
    html: '<p>Your application</p>',
    text: 'Your application',
  }),
}));

vi.mock('@/lib/applicantUpdateToken', () => ({
  hashApplicantSecret: vi.fn().mockReturnValue('hashed-secret'),
}));

vi.mock('@/lib/referrerPortalLink', () => ({
  ensureReferrerPortalTokenVersion: vi.fn().mockResolvedValue(1),
  buildReferrerPortalLink: vi.fn().mockReturnValue('https://example.com/portal'),
}));

type ApplicantLookup = Awaited<ReturnType<typeof Sheets.findApplicantByIdentifier>>;
type ReferrerCompanyLookup = Awaited<ReturnType<typeof Sheets.findReferrerCompanyByIrcrnStrict>>;

function createFormDataRequest(fields: Record<string, string | File>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  return new NextRequest('http://localhost:3000/api/apply', {
    method: 'POST',
    body: formData,
  });
}

function createMockPDFFile(): File {
  const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF magic bytes
  return new File([content], 'resume.pdf', { type: 'application/pdf' });
}

describe('POST /api/apply', () => {
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

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Too many requests');
  });

  it('returns ok:true for honeypot submissions', async () => {
    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
      website: 'spam-content',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      // Missing other required fields
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('iRAIN');
  });

  it('returns 400 when resume is missing', async () => {
    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe('resume');
  });

  it('returns 400 for invalid resume file type', async () => {
    const { POST } = await import('../apply/route');
    const invalidFile = new File(['content'], 'resume.exe', { type: 'application/octet-stream' });
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: invalidFile,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.field).toBe('resume');
  });

  it('returns 404 when applicant not found', async () => {
    const { findApplicantByIdentifier } = await import('@/lib/sheets');
    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce(null);

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toContain('could not find an applicant');
  });

  it('returns 401 for invalid applicant credentials', async () => {
    const { findApplicantByIdentifier } = await import('@/lib/sheets');
    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: 'different-hash', // Different from provided
      },
    } as ApplicantLookup);

    const { hashApplicantSecret } = await import('@/lib/applicantUpdateToken');
    vi.mocked(hashApplicantSecret).mockReturnValueOnce('wrong-hash');

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'wrong-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('Invalid applicant credentials');
  });

  it('returns 403 for archived applicants', async () => {
    const { findApplicantByIdentifier } = await import('@/lib/sheets');
    const hashValue = 'hashed-secret';
    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
        archived: 'true',
      },
    } as ApplicantLookup);

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('archived');
  });

  it('returns 409 for duplicate application', async () => {
    const { findApplicantByIdentifier, findDuplicateApplication } = await import('@/lib/sheets');
    const hashValue = 'hashed-secret';

    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
      },
    } as ApplicantLookup);

    vi.mocked(findDuplicateApplication).mockResolvedValueOnce('APP-EXISTING');

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toContain('already applied');
  });

  it('returns 404 when referrer not found', async () => {
    const { findApplicantByIdentifier, findReferrerCompanyByIrcrnStrict, findReferrerByIrcrn } =
      await import('@/lib/sheets');
    const hashValue = 'hashed-secret';

    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
      },
    } as ApplicantLookup);

    vi.mocked(findReferrerCompanyByIrcrnStrict).mockRejectedValueOnce(new Error('Not found'));
    vi.mocked(findReferrerByIrcrn).mockResolvedValueOnce(null);

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toContain('could not find a referrer');
  });

  it('returns 400 when virus scan fails', async () => {
    const { findApplicantByIdentifier, findReferrerCompanyByIrcrnStrict } = await import(
      '@/lib/sheets'
    );
    const hashValue = 'hashed-secret';

    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
      },
    } as ApplicantLookup);

    vi.mocked(findReferrerCompanyByIrcrnStrict).mockResolvedValueOnce({
      referrer: {
        irref: 'iRREF0000000001',
        name: 'Referrer Name',
        email: 'referrer@example.com',
        locale: 'en',
      },
      company: {
        id: 'RCMP-123',
        companyName: 'Test Company',
      },
    } as ReferrerCompanyLookup);

    const { scanBufferForViruses } = await import('@/lib/fileScan');
    vi.mocked(scanBufferForViruses).mockResolvedValueOnce({ ok: false, message: 'Malware detected' });

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.field).toBe('resume');
  });

  it('successfully submits application', async () => {
    const { findApplicantByIdentifier, findReferrerCompanyByIrcrnStrict, appendApplicationRow } =
      await import('@/lib/sheets');
    const { sendMail } = await import('@/lib/mailer');
    const hashValue = 'hashed-secret';

    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
      },
    } as ApplicantLookup);

    vi.mocked(findReferrerCompanyByIrcrnStrict).mockResolvedValueOnce({
      referrer: {
        irref: 'iRREF0000000001',
        name: 'Referrer Name',
        email: 'referrer@example.com',
        locale: 'en',
      },
      company: {
        id: 'RCMP-123',
        companyName: 'Test Company',
      },
    } as ReferrerCompanyLookup);

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('APP-001');

    expect(appendApplicationRow).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledTimes(2); // One to referrer, one to applicant
  });

  it('sends emails to both referrer and applicant', async () => {
    const { findApplicantByIdentifier, findReferrerCompanyByIrcrnStrict } = await import(
      '@/lib/sheets'
    );
    const { sendMail } = await import('@/lib/mailer');
    const hashValue = 'hashed-secret';

    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'applicant@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
      },
    } as ApplicantLookup);

    vi.mocked(findReferrerCompanyByIrcrnStrict).mockResolvedValueOnce({
      referrer: {
        irref: 'iRREF0000000001',
        name: 'Referrer Name',
        email: 'referrer@example.com',
        locale: 'en',
      },
      company: {
        id: 'RCMP-123',
        companyName: 'Test Company',
      },
    } as ReferrerCompanyLookup);

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    await POST(request);

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'referrer@example.com' }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'applicant@example.com' }));
  });

  it('validates iRCRN format in strict mode', async () => {
    process.env.STRICT_REFERRAL_LINKING = 'true';

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'invalid-icrn',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('Invalid iRCRN format');
  });

  it('uses fallback referrer when configured and no referrer found', async () => {
    process.env.APPLICATION_FALLBACK_REFERRER_EMAIL = 'fallback@example.com';
    process.env.APPLICATION_FALLBACK_REFERRER_NAME = 'Fallback Referrer';

    const { findApplicantByIdentifier, findReferrerCompanyByIrcrnStrict, findReferrerByIrcrn } =
      await import('@/lib/sheets');
    const { sendMail } = await import('@/lib/mailer');
    const hashValue = 'hashed-secret';

    vi.mocked(findApplicantByIdentifier).mockResolvedValueOnce({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        email: 'test@example.com',
        firstName: 'John',
        familyName: 'Doe',
        applicantSecretHash: hashValue,
      },
    } as ApplicantLookup);

    vi.mocked(findReferrerCompanyByIrcrnStrict).mockRejectedValueOnce(new Error('Not found'));
    vi.mocked(findReferrerByIrcrn).mockResolvedValueOnce(null);

    const { POST } = await import('../apply/route');
    const request = createFormDataRequest({
      applicantId: 'iRAIN0000000001',
      applicantKey: 'secret-key',
      iCrn: 'iRCRN0000000001',
      position: 'Software Engineer',
      resume: createMockPDFFile(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'fallback@example.com' })
    );
  });
});
