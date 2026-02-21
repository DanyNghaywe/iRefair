import { vi } from 'vitest';

const { sendMail } = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

const { rateLimit, rateLimitHeaders } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  rateLimitHeaders: vi.fn(),
}));

const {
  appendReferrerRow,
  generateIRREF,
  getReferrerByEmail,
  hasApprovedCompany,
  addPendingUpdate,
  appendReferrerCompanyRow,
  generateReferrerCompanyId,
  findReferrerCompanyByName,
  updateReferrerCompanyFields,
  updateReferrerFields,
} = vi.hoisted(() => ({
  appendReferrerRow: vi.fn(),
  generateIRREF: vi.fn(),
  getReferrerByEmail: vi.fn(),
  hasApprovedCompany: vi.fn(),
  addPendingUpdate: vi.fn(),
  appendReferrerCompanyRow: vi.fn(),
  generateReferrerCompanyId: vi.fn(),
  findReferrerCompanyByName: vi.fn(),
  updateReferrerCompanyFields: vi.fn(),
  updateReferrerFields: vi.fn(),
}));

const { referrerRegistrationConfirmation, referrerAlreadyExistsEmail, referrerNewCompanyEmail } = vi.hoisted(() => ({
  referrerRegistrationConfirmation: vi.fn(),
  referrerAlreadyExistsEmail: vi.fn(),
  referrerNewCompanyEmail: vi.fn(),
}));

const { buildReferrerPortalLink, ensureReferrerPortalTokenVersion } = vi.hoisted(() => ({
  buildReferrerPortalLink: vi.fn(),
  ensureReferrerPortalTokenVersion: vi.fn(),
}));

vi.mock('@/lib/mailer', () => ({
  sendMail,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit,
  rateLimitHeaders,
  RATE_LIMITS: { referrer: { limit: 10, window: 60 } },
}));

vi.mock('@/lib/sheets', () => ({
  appendReferrerRow,
  generateIRREF,
  getReferrerByEmail,
  hasApprovedCompany,
  addPendingUpdate,
  appendReferrerCompanyRow,
  generateReferrerCompanyId,
  findReferrerCompanyByName,
  updateReferrerCompanyFields,
  updateReferrerFields,
}));

vi.mock('@/lib/emailTemplates', () => ({
  referrerRegistrationConfirmation,
  referrerAlreadyExistsEmail,
  referrerNewCompanyEmail,
}));

vi.mock('@/lib/referrerPortalLink', () => ({
  buildReferrerPortalLink,
  ensureReferrerPortalTokenVersion,
}));

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/referrer', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const existingReferrer = {
  rowIndex: 2,
  record: {
    irref: 'iRREF0000000001',
    archived: 'false',
    locale: 'en',
    name: 'Jane Referrer',
    phone: '',
    country: '',
    linkedin: '',
  },
};

const emailTemplate = {
  subject: 'Subject',
  html: '<p>HTML</p>',
  text: 'Text',
};

describe('POST /api/referrer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    rateLimit.mockResolvedValue({ allowed: true, remaining: 10, limit: 10 });
    rateLimitHeaders.mockReturnValue({});

    getReferrerByEmail.mockResolvedValue(existingReferrer);
    hasApprovedCompany.mockResolvedValue(false);
    findReferrerCompanyByName.mockResolvedValue({ id: 'RCOMP-1' });

    generateIRREF.mockResolvedValue('iRREF0000000002');
    generateReferrerCompanyId.mockReturnValue('RCOMP-NEW');

    referrerRegistrationConfirmation.mockReturnValue(emailTemplate);
    referrerAlreadyExistsEmail.mockReturnValue(emailTemplate);
    referrerNewCompanyEmail.mockReturnValue(emailTemplate);

    ensureReferrerPortalTokenVersion.mockResolvedValue(1);
    buildReferrerPortalLink.mockReturnValue('https://example.com/referrer/portal?token=abc');
    sendMail.mockResolvedValue({ messageId: 'msg-1' });
  });

  it('does not include a portal link for duplicate submissions when the referrer is not approved', async () => {
    hasApprovedCompany.mockResolvedValue(false);

    const { POST } = await import('../referrer/route');
    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        name: 'Jane Referrer',
        company: 'Acme',
        language: 'en',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      iRref: 'iRREF0000000001',
      isExisting: true,
    });

    expect(ensureReferrerPortalTokenVersion).not.toHaveBeenCalled();
    expect(buildReferrerPortalLink).not.toHaveBeenCalled();
    expect(referrerAlreadyExistsEmail).toHaveBeenCalledWith({
      name: 'Jane Referrer',
      iRref: 'iRREF0000000001',
      locale: 'en',
      portalUrl: undefined,
    });
  });

  it('includes a portal link for duplicate submissions when the referrer has approved access', async () => {
    hasApprovedCompany.mockResolvedValue(true);
    ensureReferrerPortalTokenVersion.mockResolvedValue(5);
    buildReferrerPortalLink.mockReturnValue('https://example.com/referrer/portal?token=approved');

    const { POST } = await import('../referrer/route');
    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        name: 'Jane Referrer',
        company: 'Acme',
        language: 'en',
      }),
    );

    expect(response.status).toBe(200);
    expect(ensureReferrerPortalTokenVersion).toHaveBeenCalledWith('iRREF0000000001');
    expect(buildReferrerPortalLink).toHaveBeenCalledWith('iRREF0000000001', 5);
    expect(referrerAlreadyExistsEmail).toHaveBeenCalledWith({
      name: 'Jane Referrer',
      iRref: 'iRREF0000000001',
      locale: 'en',
      portalUrl: 'https://example.com/referrer/portal?token=approved',
    });
  });

  it('does not include a portal link in new-company emails when the referrer is not approved', async () => {
    hasApprovedCompany.mockResolvedValue(false);
    findReferrerCompanyByName.mockResolvedValue(null);

    const { POST } = await import('../referrer/route');
    const response = await POST(
      createRequest({
        email: 'jane@example.com',
        name: 'Jane Referrer',
        company: 'NewCo',
        language: 'en',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      iRref: 'iRREF0000000001',
      isExisting: true,
      newCompanyAdded: true,
      companyId: 'RCOMP-NEW',
    });

    expect(ensureReferrerPortalTokenVersion).not.toHaveBeenCalled();
    expect(buildReferrerPortalLink).not.toHaveBeenCalled();
    expect(referrerNewCompanyEmail).toHaveBeenCalledWith({
      name: 'Jane Referrer',
      iRref: 'iRREF0000000001',
      newCompany: 'NewCo',
      locale: 'en',
      portalUrl: undefined,
    });
  });
});
