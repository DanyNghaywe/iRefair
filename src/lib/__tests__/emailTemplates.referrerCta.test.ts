import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { referrerAlreadyExistsEmail, referrerNewCompanyEmail } from '@/lib/emailTemplates';
import { resetProcessEnv } from './testUtils';

const ORIGINAL_ENV = { ...process.env };

describe('referrer duplicate-submission CTA templates', () => {
  beforeEach(() => {
    resetProcessEnv(ORIGINAL_ENV);
  });

  afterEach(() => {
    resetProcessEnv(ORIGINAL_ENV);
  });

  it('uses meet-founder CTA for already-exists emails', () => {
    process.env.FOUNDER_MEET_LINK = 'https://meet.example.com/founder';

    const template = referrerAlreadyExistsEmail({
      name: 'Jane',
      iRref: 'iRREF0000000001',
      locale: 'en',
    });

    expect(template.html).toContain('Meet the founder');
    expect(template.html).toContain('https://meet.example.com/founder');
    expect(template.html).not.toContain('Contact Admin');
    expect(template.html).not.toContain('mailto:irefair@andbeyondca.com');
    expect(template.text).toContain('Meet the founder: https://meet.example.com/founder');
  });

  it('uses meet-founder CTA for new-company emails', () => {
    process.env.FOUNDER_MEET_LINK = 'https://meet.example.com/founder';

    const template = referrerNewCompanyEmail({
      name: 'Jane',
      iRref: 'iRREF0000000001',
      newCompany: 'Acme',
      locale: 'en',
    });

    expect(template.html).toContain('Meet the founder');
    expect(template.html).toContain('https://meet.example.com/founder');
    expect(template.html).not.toContain('Contact Admin');
    expect(template.html).not.toContain('mailto:irefair@andbeyondca.com');
    expect(template.text).toContain('Meet the founder: https://meet.example.com/founder');
  });
});
