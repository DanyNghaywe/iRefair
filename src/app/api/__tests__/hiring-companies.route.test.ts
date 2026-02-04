import { vi } from 'vitest';

import { GET } from '../hiring-companies/route';

const { listApprovedCompanies } = vi.hoisted(() => ({
  listApprovedCompanies: vi.fn(),
}));

const { normalizeHttpUrl } = vi.hoisted(() => ({
  normalizeHttpUrl: vi.fn(),
}));

vi.mock('@/lib/sheets', () => ({
  listApprovedCompanies,
}));

vi.mock('@/lib/validation', () => ({
  normalizeHttpUrl,
}));

beforeEach(() => {
  listApprovedCompanies.mockReset();
  normalizeHttpUrl.mockReset();
  normalizeHttpUrl.mockImplementation((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  });
});

describe('GET /api/hiring-companies', () => {
  it('returns normalized and sorted companies', async () => {
    listApprovedCompanies.mockResolvedValue([
      { code: 'iRCRN0002', name: 'beta corp', industry: 'Tech', careersUrl: 'beta.com/jobs' },
      { code: 'iRCRN0001', name: 'Alpha Corp', industry: 'Finance', careersUrl: '' },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      companies: [
        { code: 'iRCRN0001', name: 'Alpha Corp', industry: 'Finance', careersUrl: null },
        { code: 'iRCRN0002', name: 'beta corp', industry: 'Tech', careersUrl: 'https://beta.com/jobs' },
      ],
    });
  });

  it('returns a JSON error payload when loading fails', async () => {
    listApprovedCompanies.mockRejectedValue(new Error('sheet unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Failed to load hiring companies. Please try again later.',
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
