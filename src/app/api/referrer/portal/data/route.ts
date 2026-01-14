import { NextRequest, NextResponse } from 'next/server';

import {
  findApplicantByIdentifier,
  getReferrerByIrref,
  listApplications,
  listReferrerCompanies,
  normalizeStatus,
} from '@/lib/sheets';
import { parseActionHistory } from '@/lib/actionHistory';
import { normalizePortalTokenVersion, verifyReferrerToken } from '@/lib/referrerPortalToken';
import { getReferrerPortalToken } from '@/lib/referrerPortalAuth';

export const dynamic = 'force-dynamic';

async function buildItems(referrerIrref: string) {
  const apps = await listApplications({ referrerIrref, limit: 0 });

  // Get all companies for this referrer for lookup
  const companies = await listReferrerCompanies(referrerIrref);
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  const items = await Promise.all(
    apps.items.map(async (app) => {
      const applicant = app.applicantId
        ? await findApplicantByIdentifier(app.applicantId).catch(() => null)
        : null;
      const applicantName = applicant
        ? [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' ').trim()
        : '';
      const resumeDownloadUrl = app.resumeFileId
        ? `/api/referrer/portal/resume?applicationId=${encodeURIComponent(app.id)}`
        : '';

      // Get company info - try referrerCompanyId first, then fall back to iCrn lookup
      let companyName = '';
      let companyId = '';
      if (app.referrerCompanyId) {
        const company = companyMap.get(app.referrerCompanyId);
        if (company) {
          companyName = company.companyName;
          companyId = company.id;
        }
      }
      // If no company found via ID, try matching by iCrn
      if (!companyName && app.iCrn) {
        const matchedCompany = companies.find((c) => c.companyIrcrn === app.iCrn);
        if (matchedCompany) {
          companyName = matchedCompany.companyName;
          companyId = matchedCompany.id;
        }
      }

      return {
        id: app.id,
        applicantId: app.applicantId,
        applicantName,
        applicantEmail: applicant?.record.email || '',
        applicantPhone: applicant?.record.phone || '',
        position: app.position,
        iCrn: app.iCrn,
        companyId,
        companyName,
        resumeFileName: app.resumeFileName,
        resumeDownloadUrl,
        status: normalizeStatus(app.status),
        ownerNotes: app.ownerNotes || '',
        meetingDate: app.meetingDate || '',
        meetingTime: app.meetingTime || '',
        meetingTimezone: app.meetingTimezone || '',
        meetingUrl: app.meetingUrl || '',
        // Additional applicant details for expanded view
        countryOfOrigin: applicant?.record.countryOfOrigin || '',
        languages: applicant?.record.languages || '',
        languagesOther: applicant?.record.languagesOther || '',
        locatedCanada: applicant?.record.locatedCanada || '',
        province: applicant?.record.province || '',
        authorizedCanada: applicant?.record.authorizedCanada || '',
        eligibleMoveCanada: applicant?.record.eligibleMoveCanada || '',
        industryType: applicant?.record.industryType || '',
        industryOther: applicant?.record.industryOther || '',
        employmentStatus: applicant?.record.employmentStatus || '',
        // Action history for timeline display
        actionHistory: parseActionHistory(app.actionHistory),
      };
    }),
  );

  // Build companies list for filter (only approved companies)
  const approvedCompanies = companies
    .filter((c) => c.companyApproval === 'approved')
    .map((c) => ({
      id: c.id,
      name: c.companyName,
      ircrn: c.companyIrcrn || '',
    }));

  return { total: apps.total, items, companies: approvedCompanies };
}

export async function GET(request: NextRequest) {
  const token = getReferrerPortalToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyReferrerToken(token);
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid or expired token' }, { status: 401 });
  }

  const referrer = await getReferrerByIrref(payload.irref);
  if (!referrer) {
    return NextResponse.json({ ok: false, error: 'Referrer not found' }, { status: 404 });
  }
  const expectedVersion = normalizePortalTokenVersion(referrer.record.portalTokenVersion);
  if (payload.v !== expectedVersion) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  if (referrer.record.archived?.toLowerCase() === 'true') {
    return NextResponse.json(
      { ok: false, error: 'This referrer account has been archived and portal access is no longer available.' },
      { status: 403 },
    );
  }

  const data = await buildItems(payload.irref);
  return NextResponse.json({
    ok: true,
    referrer: {
      irref: payload.irref,
      name: referrer.record.name,
      email: referrer.record.email,
      company: referrer.record.company,
    },
    ...data,
  });
}
