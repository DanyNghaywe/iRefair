import { NextResponse } from 'next/server';
import { appendApplicationRow, generateSubmissionId } from '@/lib/sheets';

type ApplyPayload = {
  iRain?: string;
  iCrn?: string;
  position?: string;
  referenceNumber?: string;
  resumeFileName?: string;
};

const normalize = (value?: string) => (typeof value === 'string' ? value.trim() : '');

export async function POST(request: Request) {
  try {
    const body: ApplyPayload = await request.json();
    const iRain = normalize(body?.iRain);
    const iCrn = normalize(body?.iCrn);
    const position = normalize(body?.position);
    const referenceNumber = normalize(body?.referenceNumber);
    const resumeFileName = normalize(body?.resumeFileName);

    if (!iRain || !iCrn || !position) {
      return NextResponse.json(
        { ok: false, error: 'Please provide your iRAIN, iRCRN, and the position you are applying for.' },
        { status: 400 },
      );
    }

    const id = await generateSubmissionId('APP');
    await appendApplicationRow({
      id,
      iRain,
      iCrn,
      position,
      referenceNumber,
      resumeFileName,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Error submitting application', error);
    return NextResponse.json(
      { ok: false, error: 'Unable to submit your application right now. Please try again shortly.' },
      { status: 500 },
    );
  }
}
