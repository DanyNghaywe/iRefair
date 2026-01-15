import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mailer';
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';
import {
  appendReferrerRow,
  generateIRREF,
  getReferrerByEmail,
  addPendingUpdate,
  // New multi-company functions
  appendReferrerCompanyRow,
  generateReferrerCompanyId,
  findReferrerCompanyByName,
  listReferrerCompanies,
  updateReferrerCompanyFields,
} from '@/lib/sheets';
import { escapeHtml, normalizeHttpUrl } from '@/lib/validation';
import {
  referrerRegistrationConfirmation,
  referrerAlreadyExistsEmail,
  referrerNewCompanyEmail,
} from '@/lib/emailTemplates';
import { buildReferrerPortalLink, ensureReferrerPortalTokenVersion } from '@/lib/referrerPortalLink';

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

    // Check if referrer already exists with this email
    const existingReferrer = await getReferrerByEmail(email);
    if (existingReferrer) {
      // Block archived referrers from re-registering or updating
      if (existingReferrer.record.archived?.toLowerCase() === 'true') {
        return NextResponse.json(
          { ok: false, error: 'This referrer account has been archived and can no longer be used.' },
          { status: 403 },
        );
      }

      const referrerIrref = existingReferrer.record.irref;
      const companyIndustryResolved = resolveIndustry(companyIndustry, companyIndustryOther, companyIndustry);

      // Check if this company already exists for the referrer
      const existingCompany = company ? await findReferrerCompanyByName(referrerIrref, company) : null;

      if (existingCompany) {
        // Same company name - update the existing company record directly
        // No need for "Pending Updates" since the company section already shows this
        await updateReferrerCompanyFields(existingCompany.id, {
          companyIndustry: companyIndustryResolved,
          careersPortal,
          workType,
        });

        // Only create a pending update for non-company profile fields if they changed
        const profileUpdates: Record<string, string> = {};
        const existingRecord = existingReferrer.record;
        if (name && name !== existingRecord.name) profileUpdates.name = name;
        if (phone && phone !== existingRecord.phone) profileUpdates.phone = phone;
        if (country && country !== existingRecord.country) profileUpdates.country = country;
        if (linkedin && linkedin !== existingRecord.linkedin) profileUpdates.linkedin = linkedin;

        if (Object.keys(profileUpdates).length > 0) {
          await addPendingUpdate(referrerIrref, profileUpdates);
        }

        // Generate portal link for existing referrer
        const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrerIrref);
        const portalUrl = buildReferrerPortalLink(referrerIrref, portalTokenVersion);

        // Send email informing them they already have an iRREF
        const emailTemplate = referrerAlreadyExistsEmail({
          name: fallbackName,
          iRref: referrerIrref,
          locale,
          portalUrl,
        });

        await sendMail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        return NextResponse.json({ ok: true, iRref: referrerIrref, isExisting: true });
      } else if (company) {
        // Different company name - create a new company record (pending approval)
        const companyId = generateReferrerCompanyId();
        await appendReferrerCompanyRow({
          id: companyId,
          referrerIrref,
          companyName: company,
          companyApproval: 'pending',
          companyIndustry: companyIndustryResolved,
          careersPortal,
          workType,
        });

        // Generate portal link for existing referrer
        const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrerIrref);
        const portalUrl = buildReferrerPortalLink(referrerIrref, portalTokenVersion);

        // Send email about new company added (pending approval)
        const emailTemplate = referrerNewCompanyEmail({
          name: fallbackName,
          iRref: referrerIrref,
          newCompany: company,
          locale,
          portalUrl,
        });

        await sendMail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        return NextResponse.json({
          ok: true,
          iRref: referrerIrref,
          isExisting: true,
          newCompanyAdded: true,
          companyId,
        });
      } else {
        // No company provided - just update referrer info
        await addPendingUpdate(referrerIrref, {
          name,
          email,
          phone,
          country,
          linkedin,
        });

        const portalTokenVersion = await ensureReferrerPortalTokenVersion(referrerIrref);
        const portalUrl = buildReferrerPortalLink(referrerIrref, portalTokenVersion);

        const emailTemplate = referrerAlreadyExistsEmail({
          name: fallbackName,
          iRref: referrerIrref,
          locale,
          portalUrl,
        });

        await sendMail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        return NextResponse.json({ ok: true, iRref: referrerIrref, isExisting: true });
      }
    }

    const iRref = await generateIRREF();

    const companyIndustryResolved = resolveIndustry(companyIndustry, companyIndustryOther, '');

    // Create the referrer row (still includes company for backward compatibility)
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

    // Also create a company record in the new Referrer Companies sheet
    let companyId: string | undefined;
    if (company) {
      companyId = generateReferrerCompanyId();
      await appendReferrerCompanyRow({
        id: companyId,
        referrerIrref: iRref,
        companyName: company,
        companyApproval: 'pending',
        companyIndustry: companyIndustryResolved,
        careersPortal,
        workType,
      });
    }

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

    return NextResponse.json({ ok: true, iRref, companyId });
  } catch (error) {
    console.error('Referrer email API error', error);
    return NextResponse.json({ ok: false, error: 'Failed to send email' }, { status: 500 });
  }
}
