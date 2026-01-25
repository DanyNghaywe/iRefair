import { describe, expect, it } from 'vitest';
import {
  isIrain,
  isIrref,
  isIrcrn,
  isLegacyApplicantId,
  normalizeStatus,
  generateReferrerCompanyId,
  APPLICANT_HEADERS,
  REFERRER_HEADERS,
  REFERRER_COMPANIES_HEADERS,
  APPLICANT_SHEET_NAME,
  REFERRER_SHEET_NAME,
  REFERRER_COMPANIES_SHEET_NAME,
} from '../sheets';

describe('ID Validation Functions', () => {
  describe('isIrain', () => {
    it('validates correct iRAIN format', () => {
      expect(isIrain('iRAIN0000000001')).toBe(true);
      expect(isIrain('iRAIN1234567890')).toBe(true);
      expect(isIrain('irain0000000001')).toBe(true); // case insensitive
      expect(isIrain('IRAIN0000000001')).toBe(true);
    });

    it('rejects invalid iRAIN formats', () => {
      expect(isIrain('')).toBe(false);
      expect(isIrain('iRAIN')).toBe(false);
      expect(isIrain('iRAIN123')).toBe(false); // too short
      expect(isIrain('iRAIN12345678901')).toBe(false); // too long
      expect(isIrain('iRREF0000000001')).toBe(false); // wrong prefix
      expect(isIrain('CAND-12345')).toBe(false);
      expect(isIrain('random')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(isIrain('  iRAIN0000000001  ')).toBe(true);
      expect(isIrain('\tiRAIN0000000001\n')).toBe(true);
    });
  });

  describe('isIrref', () => {
    it('validates correct iRREF format', () => {
      expect(isIrref('iRREF0000000001')).toBe(true);
      expect(isIrref('iRREF1234567890')).toBe(true);
      expect(isIrref('irref0000000001')).toBe(true); // case insensitive
      expect(isIrref('IRREF0000000001')).toBe(true);
    });

    it('rejects invalid iRREF formats', () => {
      expect(isIrref('')).toBe(false);
      expect(isIrref('iRREF')).toBe(false);
      expect(isIrref('iRREF123')).toBe(false); // too short
      expect(isIrref('iRAIN0000000001')).toBe(false); // wrong prefix
      expect(isIrref('CAND-12345')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(isIrref('  iRREF0000000001  ')).toBe(true);
    });
  });

  describe('isIrcrn', () => {
    it('validates correct iRCRN format', () => {
      expect(isIrcrn('iRCRN0000000001')).toBe(true);
      expect(isIrcrn('iRCRN1234567890')).toBe(true);
      expect(isIrcrn('ircrn0000000001')).toBe(true); // case insensitive
      expect(isIrcrn('IRCRN0000000001')).toBe(true);
    });

    it('rejects invalid iRCRN formats', () => {
      expect(isIrcrn('')).toBe(false);
      expect(isIrcrn('iRCRN')).toBe(false);
      expect(isIrcrn('iRCRN123')).toBe(false); // too short
      expect(isIrcrn('iRAIN0000000001')).toBe(false); // wrong prefix
    });

    it('handles whitespace', () => {
      expect(isIrcrn('  iRCRN0000000001  ')).toBe(true);
    });
  });

  describe('isLegacyApplicantId', () => {
    it('validates CAND- prefix', () => {
      expect(isLegacyApplicantId('CAND-12345')).toBe(true);
      expect(isLegacyApplicantId('CAND-1')).toBe(true);
      expect(isLegacyApplicantId('cand-12345')).toBe(true); // case insensitive
      expect(isLegacyApplicantId('CAND-ABC')).toBe(true); // any suffix
    });

    it('rejects non-CAND formats', () => {
      expect(isLegacyApplicantId('')).toBe(false);
      expect(isLegacyApplicantId('iRAIN0000000001')).toBe(false);
      expect(isLegacyApplicantId('12345')).toBe(false);
      expect(isLegacyApplicantId('CANDIDATE-12345')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(isLegacyApplicantId('  CAND-12345  ')).toBe(true);
    });
  });
});

describe('normalizeStatus', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(normalizeStatus(undefined)).toBe('');
    expect(normalizeStatus('')).toBe('');
    expect(normalizeStatus('   ')).toBe('');
  });

  it('maps legacy phrases to normalized values', () => {
    expect(normalizeStatus('Wants to meet')).toBe('meeting requested');
    expect(normalizeStatus('wants to meet')).toBe('meeting requested');
    expect(normalizeStatus('WANTS TO MEET')).toBe('meeting requested');

    expect(normalizeStatus('Not a good fit')).toBe('not a good fit');
    expect(normalizeStatus('CV not matching requirements')).toBe('cv mismatch');
    expect(normalizeStatus('CV needs adjustments')).toBe('cv update requested');
    expect(normalizeStatus('CV missing information')).toBe('info requested');

    expect(normalizeStatus('He interviewed')).toBe('met with referrer');
    expect(normalizeStatus('interviewed')).toBe('met with referrer');

    expect(normalizeStatus('He got the job')).toBe('landed job');
    expect(normalizeStatus('hired')).toBe('landed job');

    expect(normalizeStatus('sent cv to hr')).toBe('submitted cv to hr');
  });

  it('converts non-legacy statuses to lowercase', () => {
    expect(normalizeStatus('New')).toBe('new');
    expect(normalizeStatus('NEW')).toBe('new');
    expect(normalizeStatus('Meeting Scheduled')).toBe('meeting scheduled');
    expect(normalizeStatus('ACTIVE')).toBe('active');
  });

  it('preserves already-normalized values', () => {
    expect(normalizeStatus('new')).toBe('new');
    expect(normalizeStatus('meeting scheduled')).toBe('meeting scheduled');
    expect(normalizeStatus('met with referrer')).toBe('met with referrer');
  });

  it('trims whitespace', () => {
    expect(normalizeStatus('  new  ')).toBe('new');
    expect(normalizeStatus('\twants to meet\n')).toBe('meeting requested');
  });

  it('handles non-string inputs gracefully', () => {
    // @ts-expect-error testing invalid input
    expect(normalizeStatus(null)).toBe('');
    // @ts-expect-error testing invalid input
    expect(normalizeStatus(123)).toBe('');
    // @ts-expect-error testing invalid input
    expect(normalizeStatus({})).toBe('');
  });
});

describe('generateReferrerCompanyId', () => {
  it('generates ID with RCMP prefix', () => {
    const id = generateReferrerCompanyId();
    expect(id).toMatch(/^RCMP-/);
  });

  it('includes timestamp in ID', () => {
    const before = Date.now();
    const id = generateReferrerCompanyId();
    const after = Date.now();

    const parts = id.split('-');
    expect(parts).toHaveLength(3);

    const timestamp = parseInt(parts[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('includes random suffix', () => {
    const id = generateReferrerCompanyId();
    const parts = id.split('-');
    expect(parts[2]).toMatch(/^[a-z0-9]+$/);
    expect(parts[2].length).toBeGreaterThanOrEqual(4);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateReferrerCompanyId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('Sheet Constants', () => {
  describe('APPLICANT_HEADERS', () => {
    it('contains required fields', () => {
      expect(APPLICANT_HEADERS).toContain('iRAIN');
      expect(APPLICANT_HEADERS).toContain('Timestamp');
      expect(APPLICANT_HEADERS).toContain('First Name');
      expect(APPLICANT_HEADERS).toContain('Family Name');
      expect(APPLICANT_HEADERS).toContain('Email');
      expect(APPLICANT_HEADERS).toContain('Phone');
    });

    it('has iRAIN as first column', () => {
      expect(APPLICANT_HEADERS[0]).toBe('iRAIN');
    });

    it('contains legacy ID field', () => {
      expect(APPLICANT_HEADERS).toContain('Legacy Applicant ID');
    });
  });

  describe('REFERRER_HEADERS', () => {
    it('contains required fields', () => {
      expect(REFERRER_HEADERS).toContain('iRREF');
      expect(REFERRER_HEADERS).toContain('Timestamp');
      expect(REFERRER_HEADERS).toContain('Name');
      expect(REFERRER_HEADERS).toContain('Email');
      expect(REFERRER_HEADERS).toContain('Company');
      expect(REFERRER_HEADERS).toContain('Company iRCRN');
    });

    it('has iRREF as first column', () => {
      expect(REFERRER_HEADERS[0]).toBe('iRREF');
    });
  });

  describe('REFERRER_COMPANIES_HEADERS', () => {
    it('contains required fields', () => {
      expect(REFERRER_COMPANIES_HEADERS).toContain('ID');
      expect(REFERRER_COMPANIES_HEADERS).toContain('Timestamp');
      expect(REFERRER_COMPANIES_HEADERS).toContain('Referrer iRREF');
      expect(REFERRER_COMPANIES_HEADERS).toContain('Company Name');
      expect(REFERRER_COMPANIES_HEADERS).toContain('Company iRCRN');
      expect(REFERRER_COMPANIES_HEADERS).toContain('Company Approval');
    });

    it('contains archive columns', () => {
      expect(REFERRER_COMPANIES_HEADERS).toContain('Archived');
      expect(REFERRER_COMPANIES_HEADERS).toContain('ArchivedAt');
      expect(REFERRER_COMPANIES_HEADERS).toContain('ArchivedBy');
    });
  });

  describe('Sheet Names', () => {
    it('has correct applicant sheet name', () => {
      expect(APPLICANT_SHEET_NAME).toBe('Applicants');
    });

    it('has correct referrer sheet name', () => {
      expect(REFERRER_SHEET_NAME).toBe('Referrers');
    });

    it('has correct referrer companies sheet name', () => {
      expect(REFERRER_COMPANIES_SHEET_NAME).toBe('Referrer Companies');
    });
  });
});
