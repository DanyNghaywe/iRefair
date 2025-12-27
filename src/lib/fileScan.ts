import { callChatGPT, getOpenAIConfig, type ChatMessage } from '@/lib/chatgpt';

type ScanResult =
  | { ok: true; skipped?: boolean; message?: string }
  | { ok: false; message?: string };

const DEFAULT_TIMEOUT_MS = 8000;
const POLL_DELAY_MS = 2000;
const MAX_POLLS = 4;
const MIN_TEXT_LENGTH = 400;
const MAX_EXTRACTION_CHARS = 200_000;
const PARSE_TIMEOUT_MS = 3000;
const AI_RESUME_CHECK_ENABLED = ['true', '1', 'yes'].includes(
  (process.env.RESUME_AI_CHECK || '').toLowerCase(),
);
const AI_RESUME_TIMEOUT_MS = 8000;
const AI_RESUME_MAX_CHARS = 6000;
const AI_RESUME_PROMPT =
  'You are a strict classifier. Decide if the text is a resume or CV. ' +
  'A resume typically includes contact details and sections like Experience, Education, Skills, or Projects. ' +
  'Reply with exactly YES or NO.';
const AI_RESUME_UNREADABLE_MESSAGE = 'We could not read this resume. Please upload a PDF or DOCX file.';
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

type DomMatrixInit =
  | number[]
  | {
      a?: number;
      b?: number;
      c?: number;
      d?: number;
      e?: number;
      f?: number;
      m11?: number;
      m12?: number;
      m21?: number;
      m22?: number;
      m41?: number;
      m42?: number;
    };

class BasicDOMMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;

  constructor(init?: DomMatrixInit) {
    if (Array.isArray(init)) {
      const [a, b, c, d, e, f] = init;
      this.a = a ?? 1;
      this.b = b ?? 0;
      this.c = c ?? 0;
      this.d = d ?? 1;
      this.e = e ?? 0;
      this.f = f ?? 0;
      return;
    }

    if (init && typeof init === 'object') {
      this.a = init.a ?? init.m11 ?? 1;
      this.b = init.b ?? init.m12 ?? 0;
      this.c = init.c ?? init.m21 ?? 0;
      this.d = init.d ?? init.m22 ?? 1;
      this.e = init.e ?? init.m41 ?? 0;
      this.f = init.f ?? init.m42 ?? 0;
      return;
    }

    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
  }

  static from(value?: DomMatrixInit | BasicDOMMatrix) {
    if (value instanceof BasicDOMMatrix) return new BasicDOMMatrix(value);
    return new BasicDOMMatrix(value);
  }

  multiply(other?: DomMatrixInit | BasicDOMMatrix) {
    const m = BasicDOMMatrix.from(other);
    const a = this.a * m.a + this.c * m.b;
    const b = this.b * m.a + this.d * m.b;
    const c = this.a * m.c + this.c * m.d;
    const d = this.b * m.c + this.d * m.d;
    const e = this.a * m.e + this.c * m.f + this.e;
    const f = this.b * m.e + this.d * m.f + this.f;
    return new BasicDOMMatrix([a, b, c, d, e, f]);
  }

  multiplySelf(other?: DomMatrixInit | BasicDOMMatrix) {
    const next = this.multiply(other);
    this.a = next.a;
    this.b = next.b;
    this.c = next.c;
    this.d = next.d;
    this.e = next.e;
    this.f = next.f;
    return this;
  }

  preMultiplySelf(other?: DomMatrixInit | BasicDOMMatrix) {
    const next = BasicDOMMatrix.from(other).multiply(this);
    this.a = next.a;
    this.b = next.b;
    this.c = next.c;
    this.d = next.d;
    this.e = next.e;
    this.f = next.f;
    return this;
  }

  translate(tx = 0, ty = 0) {
    return this.multiply([1, 0, 0, 1, tx, ty]);
  }

  scale(scaleX = 1, scaleY = scaleX) {
    return this.multiply([scaleX, 0, 0, scaleY, 0, 0]);
  }

  rotate(angle = 0) {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return this.multiply([cos, sin, -sin, cos, 0, 0]);
  }

  invertSelf() {
    const det = this.a * this.d - this.b * this.c;
    if (!det) {
      this.a = 0;
      this.b = 0;
      this.c = 0;
      this.d = 0;
      this.e = 0;
      this.f = 0;
      return this;
    }

    const a = this.d / det;
    const b = -this.b / det;
    const c = -this.c / det;
    const d = this.a / det;
    const e = (this.c * this.f - this.d * this.e) / det;
    const f = (this.b * this.e - this.a * this.f) / det;

    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }

  toFloat32Array() {
    return new Float32Array([
      this.a,
      this.b,
      0,
      0,
      this.c,
      this.d,
      0,
      0,
      0,
      0,
      1,
      0,
      this.e,
      this.f,
      0,
      1,
    ]);
  }

  toFloat64Array() {
    return new Float64Array([
      this.a,
      this.b,
      0,
      0,
      this.c,
      this.d,
      0,
      0,
      0,
      0,
      1,
      0,
      this.e,
      this.f,
      0,
      1,
    ]);
  }
}

class BasicImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = typeof width === 'number' ? width : 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
      return;
    }

    this.data = dataOrWidth;
    this.width = typeof width === 'number' ? width : 0;
    this.height = typeof height === 'number' ? height : 0;
  }
}

class BasicPath2D {
  // Minimal stub for environments without a native Path2D implementation.
  addPath() {}
}

let pdfjsWorkerPromise: Promise<void> | null = null;

async function ensurePdfjsWorker() {
  const existing = (globalThis as { pdfjsWorker?: { WorkerMessageHandler?: unknown } }).pdfjsWorker;
  if (existing?.WorkerMessageHandler) return;

  if (!pdfjsWorkerPromise) {
    pdfjsWorkerPromise = (async () => {
      const workerModule = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
      (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = workerModule;
    })();
  }

  await pdfjsWorkerPromise;
}

async function ensurePdfPolyfills() {
  if (!globalThis.DOMMatrix) {
    globalThis.DOMMatrix = BasicDOMMatrix as unknown as typeof DOMMatrix;
  }
  if (!globalThis.ImageData) {
    globalThis.ImageData = BasicImageData as unknown as typeof ImageData;
  }
  if (!globalThis.Path2D) {
    globalThis.Path2D = BasicPath2D as unknown as typeof Path2D;
  }
}

async function extractPdfTextWithPdfjs(buffer: Buffer): Promise<string> {
  await ensurePdfjsWorker();
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as {
    getDocument: (source: { data: Buffer }) => {
      promise: Promise<{
        numPages: number;
        getPage: (pageNumber: number) => Promise<{
          getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
          cleanup: () => void;
        }>;
        destroy: () => Promise<void>;
      }>;
    };
  };

  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await withTimeout(loadingTask.promise, PARSE_TIMEOUT_MS, 'PDF parsing timed out.');
  let text = '';

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => item.str || '')
        .filter(Boolean)
        .join(' ');
      text += `${pageText}\n\n`;
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return text;
}

async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  let parsedText = '';
  let lastError: unknown;

  try {
    // Dynamic import to avoid build-time canvas dependency issues
    await ensurePdfPolyfills();
    await ensurePdfjsWorker();
    const requireFn = typeof require === 'function' ? require : null;
    let pdfParseModule: unknown;

    if (requireFn) {
      try {
        pdfParseModule = requireFn('pdf-parse');
      } catch {
        pdfParseModule = await import('pdf-parse');
      }
    } else {
      pdfParseModule = await import('pdf-parse');
    }
    // Handle both legacy function export and new PDFParse class API.
    const pdfParseDefault = (pdfParseModule as { default?: unknown }).default;
    const pdfParseFn =
      typeof pdfParseModule === 'function'
        ? pdfParseModule
        : typeof pdfParseDefault === 'function'
          ? pdfParseDefault
          : null;

    if (pdfParseFn) {
      const parsed = await withTimeout<{ text?: string }>(
        (pdfParseFn as (buffer: Buffer) => Promise<{ text?: string }>)(buffer),
        PARSE_TIMEOUT_MS,
        'PDF parsing timed out.'
      );
      parsedText = parsed?.text || '';
    } else {
      const PDFParseCtor =
        (pdfParseModule as { PDFParse?: unknown }).PDFParse ??
        (pdfParseDefault && typeof pdfParseDefault === 'object'
          ? (pdfParseDefault as { PDFParse?: unknown }).PDFParse
          : undefined);

      if (typeof PDFParseCtor !== 'function') {
        throw new Error('PDF parser is not available.');
      }

      const parser = new (PDFParseCtor as new (options: { data: Buffer }) => {
        getText: () => Promise<{ text?: string }>;
        destroy?: () => Promise<void> | void;
      })({ data: buffer });

      try {
        const parsed = await withTimeout<{ text?: string }>(
          parser.getText(),
          PARSE_TIMEOUT_MS,
          'PDF parsing timed out.'
        );
        parsedText = parsed?.text || '';
      } finally {
        try {
          await parser.destroy?.();
        } catch (destroyError) {
          console.warn('PDF parser cleanup failed', destroyError);
        }
      }
    }

  } catch (error) {
    lastError = error;
  }

  if (!parsedText.trim()) {
    try {
      await ensurePdfPolyfills();
      parsedText = await withTimeout(
        extractPdfTextWithPdfjs(buffer),
        PARSE_TIMEOUT_MS,
        'PDF parsing timed out.'
      );
    } catch (error) {
      lastError = lastError ?? error;
    }
  }

  if (parsedText.trim()) {
    const text = parsedText.slice(0, MAX_EXTRACTION_CHARS);
    return { ok: true, text };
  }

  // If module fails to load (canvas issues), skip gracefully
  const message = lastError instanceof Error ? lastError.message : 'PDF parsing failed.';
  if (message.includes('Cannot find module') || message.includes('ERR_MODULE_NOT_FOUND')) {
    console.warn('PDF parsing unavailable in this environment; skipping', lastError);
    return { ok: false, skipped: true };
  }

  return { ok: false, error: message };
}

async function extractDocxText(buffer: Buffer): Promise<ExtractResult> {
  try {
    // Dynamic import to avoid build-time issues
    const mammoth = await import('mammoth');
    const result = await withTimeout<{ value?: string }>(
      mammoth.extractRawText({ buffer }),
      PARSE_TIMEOUT_MS,
      'DOCX parsing timed out.'
    );
    const text = (result?.value || '').slice(0, MAX_EXTRACTION_CHARS);
    return { ok: true, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DOCX parsing failed.';
    if (message.includes('Cannot find module')) {
      console.warn('DOCX parsing unavailable in this environment; skipping');
      return { ok: false, skipped: true };
    }
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

async function runResumeAiCheck(text: string): Promise<ScanResult> {
  if (!AI_RESUME_CHECK_ENABLED) {
    return { ok: true, skipped: true };
  }

  const { configured } = getOpenAIConfig();
  if (!configured) {
    console.warn('Resume AI check enabled but OpenAI not configured; skipping');
    return { ok: true, skipped: true };
  }

  const snippet = text.slice(0, AI_RESUME_MAX_CHARS);
  const messages: ChatMessage[] = [
    { role: 'system', content: AI_RESUME_PROMPT },
    { role: 'user', content: `Text:\n${snippet}` },
  ];

  try {
    const result = await callChatGPT(messages, undefined, {
      signal: AbortSignal.timeout(AI_RESUME_TIMEOUT_MS),
    });
    const answer = result.text.trim().toLowerCase();
    const match = answer.match(/^(yes|no)\b/);
    if (!match) {
      console.warn('Resume AI check returned an unexpected response; skipping');
      return { ok: true, skipped: true };
    }

    if (match[1] === 'no') {
      return {
        ok: false,
        message:
          'We could not verify this looks like a resume. Please include contact details and common sections (Experience, Education, Skills).',
      };
    }

    return { ok: true };
  } catch (error) {
    console.warn('Resume AI check failed; skipping', error);
    return { ok: true, skipped: true };
  }
}

export async function ensureResumeLooksLikeCv(
  buffer: Buffer,
  mimeType?: string,
  filename?: string,
): Promise<ScanResult> {
  const extraction = await extractText(buffer, mimeType, filename);
  const aiCheckActive = AI_RESUME_CHECK_ENABLED && getOpenAIConfig().configured;
  if (!extraction.ok) {
    if (extraction.skipped) {
      if (aiCheckActive) {
        return { ok: false, message: AI_RESUME_UNREADABLE_MESSAGE };
      }
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
    if (aiCheckActive) {
      return { ok: false, message: AI_RESUME_UNREADABLE_MESSAGE };
    }
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

  const aiCheck = await runResumeAiCheck(normalized);
  if (!aiCheck.ok) {
    return aiCheck;
  }

  return { ok: true };
}
