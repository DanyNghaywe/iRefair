type FounderSession = {
  email: string;
  exp: number;
};

export const FOUNDER_SESSION_COOKIE = "irefair_founder";

const base64UrlEncodeFromBytes = (bytes: Uint8Array) => {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const base64UrlDecodeToString = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  return binary;
};

const constantTimeCompare = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

export async function verifySessionEdge(token: string): Promise<FounderSession | null> {
  const secret = process.env.FOUNDER_AUTH_SECRET;
  if (!secret) return null;

  const [body, providedSignature] = token.split(".");
  if (!body || !providedSignature) return null;
  if (typeof crypto === "undefined" || !crypto.subtle) return null;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const signatureEncoded = base64UrlEncodeFromBytes(new Uint8Array(signatureBuffer));
  if (!constantTimeCompare(signatureEncoded, providedSignature)) return null;

  try {
    const payloadBinary = base64UrlDecodeToString(body);
    const parsed = JSON.parse(payloadBinary) as FounderSession;
    if (!parsed || typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}
