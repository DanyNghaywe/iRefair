const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ResponsesPayload = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type ChatGPTCallResult = {
  text: string;
  model: string;
  raw: ResponsesPayload;
};

export function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  return {
    apiKey,
    model,
    configured: Boolean(apiKey),
  };
}

export async function callChatGPT(
  messages: ChatMessage[],
  modelOverride?: string,
  options?: { signal?: AbortSignal },
): Promise<ChatGPTCallResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('At least one message is required.');
  }

  const normalizedMessages = messages
    .map((message) => {
      if (!message || typeof message.content !== 'string') return null;
      const content = message.content.trim();
      if (!content) return null;
      const role = message.role;
      if (role === 'system' || role === 'user' || role === 'assistant') {
        return { role, content };
      }
      return { role: 'user' as const, content };
    })
    .filter(Boolean) as ChatMessage[];

  if (!normalizedMessages.length) {
    throw new Error('All ChatGPT messages were empty.');
  }

  const model = modelOverride || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: normalizedMessages.map((message) => ({
        role: message.role,
        content: [{ type: 'input_text', text: message.content }],
      })),
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'ChatGPT request failed.');
  }

  const payload = (await response.json()) as ResponsesPayload;
  const text = extractResponseText(payload);
  if (!text) {
    throw new Error('ChatGPT returned an empty response.');
  }

  return {
    text,
    model,
    raw: payload,
  };
}

function extractResponseText(payload: ResponsesPayload) {
  return (
    payload.output
      ?.flatMap((entry) => entry.content ?? [])
      .map((item) => item?.text ?? '')
      .join('\n')
      .trim() ?? ''
  );
}
