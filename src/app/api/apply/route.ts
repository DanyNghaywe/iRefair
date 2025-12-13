import { NextResponse } from 'next/server';
import {
  appendApplicationRow,
  findCandidateByIdentifier,
  generateSubmissionId,
} from '@/lib/sheets';

type ApplyPayload = {
  candidateId?: string;
  iCrn?: string;
  position?: string;
  referenceNumber?: string;
  resumeFileName?: string;
};

const normalize = (value?: string) => (typeof value === 'string' ? value.trim() : '');

export async function POST(request: Request) {
  try {
    const body: ApplyPayload = await request.json();
    const candidateId = normalize(body?.candidateId);
    const iCrn = normalize(body?.iCrn);
    const position = normalize(body?.position);
    const referenceNumber = normalize(body?.referenceNumber);
    const resumeFileName = normalize(body?.resumeFileName);

    if (!candidateId || !iCrn || !position) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Please provide your iRAIN (or legacy candidate ID), iRCRN, and the position you are applying for.',
        },
        { status: 400 },
      );
    }

    const candidateRecord = await findCandidateByIdentifier(candidateId);
    if (!candidateRecord) {
      return NextResponse.json(
        { ok: false, error: 'We could not find a candidate with that ID.' },
        { status: 404 },
      );
    }

    const id = await generateSubmissionId('APP');
    await appendApplicationRow({
      id,
      candidateId: candidateRecord.record.id || candidateId,
      iCrn,
      position,
      referenceNumber,
      resumeFileName,
    });

    return NextResponse.json({
      ok: true,
      id,
      candidate: {
        id: candidateRecord.record.id,
        legacyCandidateId: candidateRecord.record.legacyCandidateId,
        rowIndex: candidateRecord.rowIndex,
      },
    });
  } catch (error) {
    console.error('Error submitting application', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to submit your application right now. Please try again shortly.' },
      { status: 500 },
    );
  }
}
