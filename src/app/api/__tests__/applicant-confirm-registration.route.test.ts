import { vi } from 'vitest';
import { NextRequest } from 'next/server';

const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

const { getApplicantByEmail, updateRowById, ensureColumns, deleteApplicantByIrain } = vi.hoisted(() => ({
  getApplicantByEmail: vi.fn(),
  updateRowById: vi.fn(),
  ensureColumns: vi.fn(),
  deleteApplicantByIrain: vi.fn(),
}));

const { verifyApplicantUpdateToken, hashToken, createApplicantSecret, hashApplicantSecret } = vi.hoisted(() => ({
  verifyApplicantUpdateToken: vi.fn(),
  hashToken: vi.fn(),
  createApplicantSecret: vi.fn(),
  hashApplicantSecret: vi.fn(),
}));

const { applicantRegistrationConfirmation, applicantIneligibleNotification } = vi.hoisted(() => ({
  applicantRegistrationConfirmation: vi.fn(),
  applicantIneligibleNotification: vi.fn(),
}));

vi.mock('@/lib/mailer', () => ({
  sendMail,
}));

vi.mock('@/lib/sheets', () => ({
  APPLICANT_SECRET_HASH_HEADER: 'Applicant Key Hash',
  APPLICANT_UPDATE_TOKEN_EXPIRES_HEADER: 'Update Token Expires At',
  APPLICANT_UPDATE_TOKEN_HASH_HEADER: 'Update Token Hash',
  APPLICANT_REGISTRATION_STATUS_HEADER: 'Registration Status',
  APPLICANT_REMINDER_TOKEN_HASH_HEADER: 'Registration Reminder Token Hash',
  APPLICANT_REMINDER_SENT_AT_HEADER: 'Registration Reminder Sent At',
  APPLICANT_SHEET_NAME: 'Applicants',
  getApplicantByEmail,
  updateRowById,
  ensureColumns,
  deleteApplicantByIrain,
}));

vi.mock('@/lib/applicantUpdateToken', () => ({
  verifyApplicantUpdateToken,
  hashToken,
  createApplicantSecret,
  hashApplicantSecret,
}));

vi.mock('@/lib/emailTemplates', () => ({
  applicantRegistrationConfirmation,
  applicantIneligibleNotification,
}));

function makeToken(locale: 'en' | 'fr' = 'en') {
  const payload = Buffer.from(JSON.stringify({ locale }), 'utf8').toString('base64url');
  return `header.${payload}.signature`;
}

function createGetRequest(token: string) {
  return new NextRequest(`http://localhost:3000/api/applicant/confirm-registration?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  });
}

function createPostRequest(token: string) {
  return new NextRequest('http://localhost:3000/api/applicant/confirm-registration', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

describe('applicant confirm registration route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyApplicantUpdateToken.mockReturnValue({ email: 'applicant@example.com' });
    hashToken.mockReturnValue('b'.repeat(64));
    createApplicantSecret.mockReturnValue('applicant-secret');
    hashApplicantSecret.mockReturnValue('applicant-secret-hash');
    ensureColumns.mockResolvedValue(undefined);
    updateRowById.mockResolvedValue({ updated: true });
    deleteApplicantByIrain.mockResolvedValue({ deleted: true });
    sendMail.mockResolvedValue({ messageId: 'msg-1' });
    applicantRegistrationConfirmation.mockReturnValue({
      subject: 'subject',
      html: '<p>html</p>',
      text: 'text',
    });
    applicantIneligibleNotification.mockReturnValue({
      subject: 'subject',
      html: '<p>html</p>',
      text: 'text',
    });
  });

  it('renders an already confirmed page on repeated GET confirmation clicks', async () => {
    getApplicantByEmail.mockResolvedValue({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        registrationStatus: '',
        updateTokenHash: '',
        reminderTokenHash: '',
        locatedCanada: 'yes',
        authorizedCanada: 'yes',
        eligibleMoveCanada: '',
      },
    });

    const { GET } = await import('../applicant/confirm-registration/route');
    const response = await GET(createGetRequest(makeToken('en')));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');

    const html = await response.text();
    expect(html).toContain('Account Already Confirmed');
    expect(html).toContain('already confirmed previously');
    expect(html).not.toContain('no longer valid');

    expect(updateRowById).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('returns alreadyConfirmed JSON on repeated POST confirmation', async () => {
    getApplicantByEmail.mockResolvedValue({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        registrationStatus: '',
        updateTokenHash: '',
        reminderTokenHash: '',
        locatedCanada: 'yes',
        authorizedCanada: 'yes',
        eligibleMoveCanada: '',
      },
    });

    const { POST } = await import('../applicant/confirm-registration/route');
    const response = await POST(createPostRequest(makeToken('en')));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, alreadyConfirmed: true });
    expect(updateRowById).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('still returns invalid-link when registration is pending and token hash mismatches', async () => {
    getApplicantByEmail.mockResolvedValue({
      rowIndex: 2,
      record: {
        id: 'iRAIN0000000001',
        registrationStatus: 'Pending Confirmation',
        updateTokenHash: 'a'.repeat(64),
        reminderTokenHash: '',
        updateTokenExpiresAt: '4102444800',
      },
    });

    const { GET } = await import('../applicant/confirm-registration/route');
    const response = await GET(createGetRequest(makeToken('en')));

    expect(response.status).toBe(403);
    const html = await response.text();
    expect(html).toContain('no longer valid');

    expect(updateRowById).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
