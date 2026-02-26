import crypto from 'crypto';

type TokenPayload = {
  irref: string;
  exp: number; // epoch seconds
  v: number;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getSecret() {
  const secret = process.env.REFERRER_PORTAL_SECRET;
  if (!secret) {
    throw new Error('Missing REFERRER_PORTAL_SECRET env var');
  }
  return secret;
}

export function normalizePortalTokenVersion(value?: string) {
  const parsed = Number.parseInt((value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function createReferrerToken(irref: string, version = 1, ttlSeconds = 7 * 24 * 60 * 60) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: TokenPayload = {
    irref,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    v: version,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${data}.${signature}`;
}

function verifyReferrerTokenInternal(token: string, options?: { allowExpired?: boolean }): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  if (signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString()) as TokenPayload;
  if (!payload.irref || !payload.exp || typeof payload.exp !== 'number') {
    throw new Error('Invalid payload');
  }
  if (!options?.allowExpired && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  if (!payload.v || typeof payload.v !== 'number') {
    return { ...payload, v: 1 };
  }
  return payload;
}

export function verifyReferrerToken(token: string): TokenPayload {
  return verifyReferrerTokenInternal(token);
}

export function verifyReferrerTokenAllowExpired(token: string): TokenPayload {
  return verifyReferrerTokenInternal(token, { allowExpired: true });
}
