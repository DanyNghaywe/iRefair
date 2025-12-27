import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export const FOUNDER_SESSION_COOKIE = "irefair_founder";

export type FounderSession = {
  email: string;
  exp: number;
};

const base64UrlEncode = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const base64UrlEncodeFromBytes = (bytes: Uint8Array) => {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecode = (value: string) =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const base64UrlDecodeToString = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  return binary;
};

export const signSession = (
  payload: FounderSession,
  secret: string,
): string => {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest();
  const signatureEncoded = base64UrlEncode(signature);
  return `${body}.${signatureEncoded}`;
};

export const verifySession = (
  token: string,
  secret?: string,
): FounderSession | null => {
  const secretToUse = secret || process.env.FOUNDER_AUTH_SECRET;
  if (!secretToUse) return null;

  const [body, providedSignature] = token.split(".");
  if (!body || !providedSignature) return null;

  try {
    const expectedSignature = createHmac("sha256", secretToUse).update(body).digest();
    const provided = base64UrlDecode(providedSignature);
    if (expectedSignature.length !== provided.length) return null;
    if (!timingSafeEqual(expectedSignature, provided)) return null;

    const parsed = JSON.parse(base64UrlDecode(body).toString()) as FounderSession;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
};

export async function verifySessionEdge(token: string): Promise<FounderSession | null> {
  const secret = process.env.FOUNDER_AUTH_SECRET;
  if (!secret) return null;

  const [body, providedSignature] = token.split(".");
  if (!body || !providedSignature) return null;

  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const signatureEncoded = base64UrlEncodeFromBytes(new Uint8Array(signatureBuffer));
  if (signatureEncoded !== providedSignature) return null;

  try {
    const payloadBinary = base64UrlDecodeToString(body);
    const parsed = JSON.parse(payloadBinary) as FounderSession;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const getFounderFromRequest = (
  request: NextRequest,
): FounderSession | null => {
  const secret = process.env.FOUNDER_AUTH_SECRET;
  if (!secret) return null;

  const token = request.cookies.get(FOUNDER_SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifySession(token, secret);
};

export const requireFounder = (request: NextRequest): FounderSession => {
  const founder = getFounderFromRequest(request);
  if (!founder) {
    throw new Error("Unauthorized");
  }
  return founder;
};
