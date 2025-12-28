type RateLimitConfig = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
  enabled: boolean;
};

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_WINDOW_SECONDS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 60);
const DEFAULT_LIMIT = parsePositiveInt(process.env.RATE_LIMIT_MAX, 10);

export const RATE_LIMITS = {
  applicant: {
    limit: parsePositiveInt(process.env.RATE_LIMIT_APPLICANT_MAX, DEFAULT_LIMIT),
    windowSeconds: parsePositiveInt(process.env.RATE_LIMIT_APPLICANT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  },
  referrer: {
    limit: parsePositiveInt(process.env.RATE_LIMIT_REFERRER_MAX, DEFAULT_LIMIT),
    windowSeconds: parsePositiveInt(process.env.RATE_LIMIT_REFERRER_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  },
  apply: {
    limit: parsePositiveInt(process.env.RATE_LIMIT_APPLY_MAX, DEFAULT_LIMIT),
    windowSeconds: parsePositiveInt(process.env.RATE_LIMIT_APPLY_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  },
  chatgpt: {
    limit: parsePositiveInt(process.env.RATE_LIMIT_CHATGPT_MAX, 5),
    windowSeconds: parsePositiveInt(process.env.RATE_LIMIT_CHATGPT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  },
  founderLogin: {
    limit: parsePositiveInt(process.env.RATE_LIMIT_FOUNDER_LOGIN_MAX, 5),
    windowSeconds: parsePositiveInt(process.env.RATE_LIMIT_FOUNDER_LOGIN_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  },
};

export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded =
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    headers.get('x-client-ip') ||
    headers.get('x-forwarded-for') ||
    headers.get('x-vercel-forwarded-for');
  if (!forwarded) return 'unknown';
  const [first] = forwarded.split(',');
  return first?.trim() || 'unknown';
}

const upstashPipeline = async (commands: Array<Array<string | number>>) => {
  if (!REST_URL || !REST_TOKEN) {
    throw new Error('Rate limit store not configured.');
  }
  const url = `${REST_URL.replace(/\/$/, '')}/pipeline`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upstash pipeline failed: ${response.status} ${text}`);
  }
  return (await response.json()) as Array<{ result?: number; error?: string }>;
};

export async function rateLimit(request: Request, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const limit = config.limit;
  const windowSeconds = config.windowSeconds;

  if (!REST_URL || !REST_TOKEN || limit <= 0 || windowSeconds <= 0) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: now + windowSeconds,
      retryAfter: 0,
      enabled: false,
    };
  }

  const key = `ratelimit:${config.keyPrefix}:${getClientIp(request)}`;

  try {
    const data = await upstashPipeline([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds],
    ]);
    const count = Number(data?.[0]?.result ?? 0);
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return {
      allowed,
      limit,
      remaining,
      reset: now + windowSeconds,
      retryAfter: allowed ? 0 : windowSeconds,
      enabled: true,
    };
  } catch (error) {
    console.error('Rate limit check failed', error);
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: now + windowSeconds,
      retryAfter: 0,
      enabled: false,
    };
  }
}

export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  headers.set('X-RateLimit-Reset', String(result.reset));
  if (!result.allowed && result.retryAfter > 0) {
    headers.set('Retry-After', String(result.retryAfter));
  }
  return headers;
}
