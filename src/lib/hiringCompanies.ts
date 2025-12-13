export type CompanyRow = {
  code: string;
  name: string;
  industry: string;
  careersUrl?: string;
};

export const companies: CompanyRow[] = [
  {
    code: 'iRCRN0000000001',
    name: 'Whish Money Canada',
    industry: 'FinTech',
  },
  {
    code: 'iRCRN0000000002',
    name: 'Primerica',
    industry: 'Financial services and Insurance',
    careersUrl: 'https://primerica.wd1.myworkdayjobs.com/PRI',
  },
  {
    code: 'iRCRN0000000003',
    name: 'Dayforce',
    industry: 'Technology',
    careersUrl: 'https://jobs.dayforcehcm.com/en-US/mydayforce/alljobs',
  },
  {
    code: 'iRCRN0000000004',
    name: 'Scotia Bank',
    industry: 'Finance, Consulting',
    careersUrl: 'https://jobs.scotiabank.com/search/?createNewAlert=false&q=&locationsearch=canada',
  },
  {
    code: 'iRCRN0000000005',
    name: 'Nextcare',
    industry: 'Healthcare',
  },
  {
    code: 'iRCRN0000000007',
    name: 'Kuehne+Nagel',
    industry: 'Logistics',
    careersUrl: 'https://jobs.kuehne-nagel.com/global/en',
  },
  {
    code: 'iRCRN0000000008',
    name: 'T360 Pay',
    industry: 'Technology, Finance',
    careersUrl: 'https://t360pay.com/contact-us/',
  },
  {
    code: 'iRCRN0000000011',
    name: 'KPMG',
    industry: 'Consulting, Compliance / Audit',
    careersUrl: 'https://careers.kpmg.ca/professionals/jobs?page=1',
  },
  {
    code: 'iRCRN0000000012',
    name: 'Maples Group',
    industry: 'Finance, Compliance / Audit',
    careersUrl:
      'https://maplesgroupcareers.ttcportals.com/search/jobs?ns_page=financial&cfm3=The%20Maples%20Group%20(Financial%20Services)',
  },
  {
    code: 'iRCRN0000000013',
    name: 'CLV Group Inc.',
    industry: 'Rental',
    careersUrl: 'https://clvgroup.bamboohr.com/careers',
  },
  {
    code: 'iRCRN0000000015',
    name: 'Sobencom',
    industry: 'Healthcare',
  },
];

// Produce the next referrer iRAIN using the same iRCRN########### pattern as companies.
export function getNextReferrerIRain(): string {
  if (!companies.length) {
    // Fallback starting value if ever needed
    return 'iRCRN0000000001';
  }

  const prefixLength = 5; // "iRCRN".length
  let maxNumeric = 0;
  let numericLength = 0;
  let prefix = companies[0].code.slice(0, prefixLength);

  for (const company of companies) {
    const code = company.code;
    if (!code || code.length <= prefixLength) continue;

    const numericPart = code.slice(prefixLength);
    const parsed = parseInt(numericPart, 10);
    if (Number.isNaN(parsed)) continue;

    if (parsed > maxNumeric) {
      maxNumeric = parsed;
      numericLength = numericPart.length;
      prefix = code.slice(0, prefixLength);
    }
  }

  const nextNumeric = String(maxNumeric + 1).padStart(numericLength || 11, '0');
  return `${prefix}${nextNumeric}`;
}
