import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

type ScanResult =
  | { ok: true; skipped?: boolean; message?: string }
  | { ok: false; message?: string };

const DEFAULT_TIMEOUT_MS = 8000;
const POLL_DELAY_MS = 2000;
const MAX_POLLS = 4;
const MIN_TEXT_LENGTH = 400;
const MAX_EXTRACTION_CHARS = 200_000;
const PARSE_TIMEOUT_MS = 3000;
const KEYWORDS = [
  'experience',
  'education',
  'skills',
  'summary',
  'professional',
  'employment',
  'project',
  'career',
  'work',
  'profile',
];
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/;

export async function scanBufferForViruses(
  buffer: Buffer,
  filename: string,
): Promise<ScanResult> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return { ok: true, skipped: true };
  }

  try {
    const form = new FormData();
    const uint8 = Uint8Array.from(buffer);
    form.append('file', new Blob([uint8.buffer]), filename || 'upload.bin');

    const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: { 'x-apikey': apiKey },
      body: form,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      return { ok: false, message: `Virus scan upload failed (${uploadRes.status}): ${text}` };
    }

    const uploadData = (await uploadRes.json()) as { data?: { id?: string } };
    const analysisId = uploadData?.data?.id;
    if (!analysisId) {
      return { ok: false, message: 'Virus scan service did not return an analysis ID.' };
    }

    let stats: { malicious?: number; suspicious?: number } = {};
    for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
      const analysisRes = await fetch(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          headers: { 'x-apikey': apiKey },
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        },
      );

      if (!analysisRes.ok) continue;
      const analysis = (await analysisRes.json()) as {
        data?: { attributes?: { status?: string; stats?: typeof stats } };
      };
      stats = analysis.data?.attributes?.stats || {};
      const status = analysis.data?.attributes?.status;
      if (status === 'completed') break;
    }

    const malicious = stats.malicious ?? 0;
    const suspicious = stats.suspicious ?? 0;
    if (malicious > 0 || suspicious > 0) {
      return { ok: false, message: 'File flagged by antivirus scan.' };
    }

    return { ok: true };
  } catch (error) {
    const name = (error as Error | undefined)?.name;
    if (name === 'AbortError' || name === 'TimeoutError') {
      console.warn('VirusTotal scan timeout; skipping', error);
      return { ok: true, skipped: true, message: 'Virus scan skipped (timeout).' };
    }
    console.error('VirusTotal scan error', error);
    return { ok: false, message: 'Virus scan failed (service unavailable).' };
  }
}

type ExtractResult =
  | { ok: true; text: string }
  | { ok: false; skipped?: boolean; error?: string };

const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

function hasPdfMagic(buffer: Buffer) {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString('utf8') === '%PDF';
}

function hasZipMagic(buffer: Buffer) {
  if (buffer.length < 4) return false;
  return ZIP_SIGNATURES.some((signature) => buffer.subarray(0, 4).equals(signature));
}

function hasDocxEntry(buffer: Buffer) {
  return buffer.includes(Buffer.from('word/document.xml'));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const parsed = await withTimeout(
      pdfParse(buffer),
      PARSE_TIMEOUT_MS,
      'PDF parsing timed out.'
    );
    const text = (parsed?.text || '').slice(0, MAX_EXTRACTION_CHARS);
    return { ok: true, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF parsing failed.';
    return { ok: false, error: message };
  }
}

async function extractDocxText(buffer: Buffer): Promise<ExtractResult> {
  try {
    const result = await withTimeout(
      mammoth.extractRawText({ buffer }),
      PARSE_TIMEOUT_MS,
      'DOCX parsing timed out.'
    );
    const text = (result?.value || '').slice(0, MAX_EXTRACTION_CHARS);
    return { ok: true, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DOCX parsing failed.';
    return { ok: false, error: message };
  }
}

async function extractText(buffer: Buffer, mimeType?: string, filename?: string): Promise<ExtractResult> {
  const lowerName = filename?.toLowerCase() || '';
  const lowerMime = mimeType?.toLowerCase() || '';

  const isPdf = lowerMime.includes('pdf') || lowerName.endsWith('.pdf');
  const isDocx =
    lowerMime.includes('openxmlformats-officedocument.wordprocessingml.document') ||
    lowerName.endsWith('.docx');
  const isDoc = lowerMime.includes('msword') || lowerName.endsWith('.doc');

  if (isPdf) {
    if (!hasPdfMagic(buffer)) {
      return { ok: false, error: 'Invalid PDF file.' };
    }
    return extractPdfText(buffer);
  }

  if (isDocx) {
    if (!hasZipMagic(buffer) || !hasDocxEntry(buffer)) {
      return { ok: false, error: 'Invalid DOCX file.' };
    }
    return extractDocxText(buffer);
  }

  if (isDoc) {
    // Legacy .doc not supported for text extraction here.
    return { ok: false, skipped: true };
  }

  return { ok: false, skipped: true };
}

export async function ensureResumeLooksLikeCv(
  buffer: Buffer,
  mimeType?: string,
  filename?: string,
): Promise<ScanResult> {
  const extraction = await extractText(buffer, mimeType, filename);
  if (!extraction.ok) {
    if (extraction.skipped) {
      console.warn('Resume text extraction unavailable; skipping CV heuristic');
      return {
        ok: true,
        skipped: true,
        message: 'Text extraction unavailable; CV heuristic skipped.',
      };
    }
    return { ok: false, message: extraction.error || 'Unable to read resume.' };
  }

  const text = extraction.text;
  if (!text) {
    console.warn('Resume text extraction unavailable; skipping CV heuristic');
    return {
      ok: true,
      skipped: true,
      message: 'Text extraction unavailable; CV heuristic skipped.',
    };
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      message: 'Your CV seems too short. Please upload a full resume (PDF/DOCX).',
    };
  }

  const matches = KEYWORDS.filter((keyword) => normalized.toLowerCase().includes(keyword));
  const hasContact = EMAIL_REGEX.test(normalized) || PHONE_REGEX.test(normalized);

  if (matches.length < 2 || !hasContact) {
    return {
      ok: false,
      message:
        'We could not verify this looks like a resume. Please include contact details and common sections (Experience, Education, Skills).',
    };
  }

  return { ok: true };
}
