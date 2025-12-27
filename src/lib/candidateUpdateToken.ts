import crypto from "crypto";

export type CandidateUpdatePayload = {
  email: string;
  rowIndex: number;
  exp: number;
};

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getSecret() {
  const secret = process.env.CANDIDATE_TOKEN_SECRET || process.env.FOUNDER_AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing CANDIDATE_TOKEN_SECRET or FOUNDER_AUTH_SECRET.");
  }
  return secret;
}

export function createCandidateUpdateToken(payload: CandidateUpdatePayload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${signature}`;
}

export function verifyCandidateUpdateToken(token: string): CandidateUpdatePayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    throw new Error("Invalid signature");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString()) as CandidateUpdatePayload;
  if (!payload?.email || typeof payload.exp !== "number" || typeof payload.rowIndex !== "number") {
    throw new Error("Invalid payload");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}

export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createCandidateSecret(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashCandidateSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}
