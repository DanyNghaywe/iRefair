import { NextRequest, NextResponse } from 'next/server';

import { callChatGPT, getOpenAIConfig, type ChatMessage } from '@/lib/chatgpt';
import { requireFounder } from '@/lib/founderAuth';
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimit';

const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant for iRefair. Keep responses concise and plain text.';

type ChatRequestBody = {
  prompt?: unknown;
  system?: unknown;
  messages?: Array<{
    role?: unknown;
    content?: unknown;
  }>;
};

export async function POST(request: NextRequest) {
  const disabledInProd = ['true', '1', 'yes'].includes((process.env.CHATGPT_PROXY_DISABLED || '').toLowerCase());
  if (process.env.NODE_ENV === 'production' && disabledInProd) {
    return NextResponse.json({ ok: false, error: 'ChatGPT proxy is disabled.' }, { status: 403 });
  }

  const proxySecret = process.env.CHATGPT_PROXY_SECRET;
  const proxyHeader = request.headers.get('x-irefair-chatgpt-secret')?.trim();
  const proxyAuthorized = Boolean(proxySecret && proxyHeader && proxyHeader === proxySecret);
  if (!proxyAuthorized) {
    try {
      requireFounder(request);
    } catch {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const rate = await rateLimit(request, { keyPrefix: 'chatgpt', ...RATE_LIMITS.chatgpt });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

  const statusOnly = request.nextUrl.searchParams.get('statusOnly') === 'true';
  const { configured, model } = getOpenAIConfig();

  if (statusOnly) {
    return NextResponse.json({ ok: configured, model });
  }

  if (!configured) {
    return NextResponse.json({ ok: false, error: 'ChatGPT API key is not configured.' }, { status: 500 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const messages = normalizeMessages(body);
  if (!messages) {
    return NextResponse.json(
      { ok: false, error: 'Provide a prompt or messages array with content.' },
      { status: 400 },
    );
  }

  try {
    const result = await callChatGPT(messages);
    return NextResponse.json({ ok: true, reply: result.text, model: result.model });
  } catch (error) {
    console.error('ChatGPT call failed', error);
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Unable to reach ChatGPT.'
        : error instanceof Error
          ? error.message
          : 'Unable to reach ChatGPT.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function normalizeMessages(body: ChatRequestBody): ChatMessage[] | null {
  const systemPrompt =
    typeof body.system === 'string' && body.system.trim().length ? body.system.trim() : DEFAULT_SYSTEM_PROMPT;

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    const normalized = body.messages
      .map((message) => {
        if (!message) return null;
        const content = typeof message.content === 'string' ? message.content.trim() : '';
        if (!content) return null;
        const roleValue = typeof message.role === 'string' ? message.role : null;
        const role: ChatMessage['role'] =
          roleValue === 'system' || roleValue === 'assistant' ? roleValue : 'user';
        return { role, content };
      })
      .filter(Boolean) as ChatMessage[];

    if (normalized.length > 0) {
      if (normalized[0].role !== 'system') {
        normalized.unshift({ role: 'system', content: systemPrompt });
      }
      return normalized;
    }
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return null;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];
}
