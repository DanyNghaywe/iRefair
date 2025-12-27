import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { resumeRequest } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import { findCandidateByIdentifier, updateCandidateAdmin } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, context: { params: Promise<{ irain: string }> }) {
  const params = await context.params;

  try {
    requireFounder(_request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const candidate = await findCandidateByIdentifier(params.irain);
  if (!candidate) {
    return NextResponse.json({ ok: false, error: 'Candidate not found' }, { status: 404 });
  }

  if (!candidate.record.email) {
    return NextResponse.json(
      { ok: false, error: 'Candidate email is missing; cannot send request.' },
      { status: 400 },
    );
  }

  const template = resumeRequest(
    [candidate.record.firstName, candidate.record.familyName].filter(Boolean).join(' '),
    candidate.record.id,
  );

  await sendMail({
    to: candidate.record.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  console.log('Resume request sent', { irain: candidate.record.id, email: candidate.record.email });

  await updateCandidateAdmin(candidate.record.id, {
    status: 'resume requested',
    lastContactedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
