import { NextRequest, NextResponse } from 'next/server';

import { requireFounder } from '@/lib/founderAuth';
import { matchIntro } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';
import {
  findApplicantByIdentifier,
  getMatchById,
  getReferrerByIrref,
  updateMatch,
} from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  const params = await context.params;

  try {
    requireFounder(_request);
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const match = await getMatchById(params.matchId);
  if (!match) {
    return NextResponse.json({ ok: false, error: 'Match not found' }, { status: 404 });
  }

  const applicant = match.record.applicantIrain
    ? await findApplicantByIdentifier(match.record.applicantIrain)
    : null;
  const referrer = match.record.referrerIrref
    ? await getReferrerByIrref(match.record.referrerIrref)
    : null;

  if (!applicant?.record.email || !referrer?.record.email) {
    return NextResponse.json(
      { ok: false, error: 'Missing applicant or referrer email for intro.' },
      { status: 400 },
    );
  }

  const template = matchIntro(
    [applicant.record.firstName, applicant.record.familyName].filter(Boolean).join(' '),
    referrer.record.name,
    match.record.applicantIrain,
    match.record.companyIrcrn,
    match.record.positionContext,
  );

  await sendMail({
    to: applicant.record.email,
    cc: referrer.record.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  console.log('Match intro sent', {
    matchId: match.record.matchId,
    applicant: applicant.record.email,
    referrer: referrer.record.email,
  });

  await updateMatch(match.record.matchId, {
    stage: 'intro sent',
    introSentAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
