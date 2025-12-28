import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { resumeRequest } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { findApplicantByIdentifier, updateApplicantAdmin } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, context: { params: Promise<{ irain: string }> }) {
  const params = await context.params;

  try {
    requireFounder(_request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const applicant = await findApplicantByIdentifier(params.irain);
  if (!applicant) {
    return NextResponse.json({ ok: false, error: 'Applicant not found' }, { status: 404 });
  }

  if (!applicant.record.email) {
    return NextResponse.json(
      { ok: false, error: 'Applicant email is missing; cannot send request.' },
      { status: 400 },
    );
  }

  const template = resumeRequest(
    [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' '),
    applicant.record.id,
  );

  await sendMail({
    to: applicant.record.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  console.log('Resume request sent', { irain: applicant.record.id, email: applicant.record.email });

  await updateApplicantAdmin(applicant.record.id, {
    status: 'resume requested',
    lastContactedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
