import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import { appendReferrerRow, generateIRREF } from '@/lib/sheets';
import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';
import { referrerRegistrationConfirmation } from '@/lib/emailTemplates';

type ReferrerPayload = {
  name?: string;
  email?: string;
  language?: string;
  phone?: string;
  country?: string;
  company?: string;
  companyIndustry?: string;
  companyIndustryOther?: string;
  careersPortal?: string;
  workType?: string;
  referralType?: string;
  roles?: string;
  regions?: string;
  monthlySlots?: string;
  linkedin?: string;
  website?: string;
};

type EmailLanguage = 'en' | 'fr';

function sanitize(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function resolveIndustry(industry: string, industryOther: string, fallback: string) {
  const lowered = industry.toLowerCase();
  if (lowered === 'other') return industryOther || fallback;
  return industry || fallback;
}

export async function POST(request: Request) {
  const rate = await rateLimit(request, { keyPrefix: 'referrer', ...RATE_LIMITS.referrer });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  try {
    const body: ReferrerPayload = await request.json();
    const honeypot = sanitize(body.website);
    if (honeypot) {
      return NextResponse.json({ ok: true });
    }
    const name = sanitize(body.name);
    const email = sanitize(body.email);
    const phone = sanitize(body.phone);
    const country = sanitize(body.country);
    const company = sanitize(body.company);
    const companyIndustry = sanitize(body.companyIndustry);
    const companyIndustryOther = sanitize(body.companyIndustryOther);
    const careersPortalInput = sanitize(body.careersPortal);
    const workType = sanitize(body.workType);
    const referralType = sanitize(body.referralType || body.workType);
    const roles = sanitize(body.roles);
    const regions = sanitize(body.regions);
    const monthlySlots = sanitize(body.monthlySlots);
    const linkedinInput = sanitize(body.linkedin);
    const language = sanitize(body.language).toLowerCase();
    const locale: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    const fallbackName = name || (locale === 'fr' ? 'vous' : 'there');

    if (!email) {
      return NextResponse.json({ ok: false, error: 'Missing required field: email.' }, { status: 400 });
    }

    const careersPortalUrl = careersPortalInput ? normalizeHttpUrl(careersPortalInput) : null;
    if (careersPortalInput && !careersPortalUrl) {
      return NextResponse.json({ ok: false, error: 'Invalid careers portal URL.' }, { status: 400 });
    }

    const linkedinUrl = linkedinInput ? normalizeHttpUrl(linkedinInput) : null;
    if (linkedinInput && !linkedinUrl) {
      return NextResponse.json({ ok: false, error: 'Invalid LinkedIn URL.' }, { status: 400 });
    }

    const careersPortal = careersPortalUrl || '';
    const linkedin = linkedinUrl || '';

    const iRref = await generateIRREF();

    const companyIndustryResolved = resolveIndustry(companyIndustry, companyIndustryOther, '');

    await appendReferrerRow({
      iRref,
      name,
      email,
      phone,
      country,
      company,
      companyApproval: 'pending',
      companyIndustry: resolveIndustry(companyIndustry, companyIndustryOther, companyIndustry),
      careersPortal,
      workType,
      linkedin,
    });

    const emailTemplate = referrerRegistrationConfirmation({
      name: fallbackName,
      iRref,
      company,
      careersPortal: careersPortalUrl || undefined,
      industry: companyIndustryResolved,
      roles,
      regions,
      type: referralType || workType,
      slots: monthlySlots,
      locale,
    });

    await sendMail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    return NextResponse.json({ ok: true, iRref });
  } catch (error) {
    console.error('Referrer email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
