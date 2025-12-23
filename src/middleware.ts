import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FOUNDER_SESSION_COOKIE, verifySessionEdge } from "@/lib/founderAuthEdge";
import { REFERRER_PORTAL_COOKIE } from "@/lib/referrerPortalAuth";

type ReferrerTokenPayload = {
  irref: string;
  exp: number;
};

const encoder = new TextEncoder();
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

function base64UrlToUint8Array(value: string) {
  const padded = `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64Url(value: string) {
  return new TextDecoder().decode(base64UrlToUint8Array(value));
}

function applySecurityHeaders(res: NextResponse, referrerPolicy: string) {
  res.headers.set("Referrer-Policy", referrerPolicy);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value);
  });
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return res;
}

async function verifyReferrerTokenEdge(token: string): Promise<ReferrerTokenPayload | null> {
  const secret = process.env.REFERRER_PORTAL_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToUint8Array(signature),
    encoder.encode(data),
  );

  if (!isValid) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ReferrerTokenPayload;
    if (!payload?.irref || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  const isFounderUI = p.startsWith("/founder");
  const isFounderAPI = p.startsWith("/api/founder");
  const isReferrerPortal = p.startsWith("/referrer/portal");
  const isReferrerPortalApi = p.startsWith("/api/referrer/portal");
  const referrerPolicy = isReferrerPortal || isReferrerPortalApi ? "no-referrer" : "strict-origin-when-cross-origin";

  if (p === "/referrer/portal") {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return applySecurityHeaders(NextResponse.next(), referrerPolicy);

    const payload = await verifyReferrerTokenEdge(token);
    const url = req.nextUrl.clone();
    url.search = "";
    const res = applySecurityHeaders(NextResponse.redirect(url), referrerPolicy);

    if (payload) {
      const maxAge = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);
      res.cookies.set(REFERRER_PORTAL_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge,
        path: "/",
      });
    }

    return res;
  }

  if (!isFounderUI && !isFounderAPI) return applySecurityHeaders(NextResponse.next(), referrerPolicy);

  // ✅ ALWAYS allow login UI + auth endpoints
  if (p === "/founder/login" || p.startsWith("/api/founder/auth")) {
    return applySecurityHeaders(NextResponse.next(), referrerPolicy);
  }

  const token = req.cookies.get(FOUNDER_SESSION_COOKIE)?.value;
  const session = token ? await verifySessionEdge(token) : null;

  if (!session) {
    if (isFounderAPI) {
      const res = NextResponse.json(
        { ok: false, error: "MW_UNAUTHORIZED" },
        { status: 401 }
      );
      res.headers.set("x-irefair-auth", "blocked-by-middleware");
      return applySecurityHeaders(res, referrerPolicy);
    }

    const url = req.nextUrl.clone();
    url.pathname = "/founder/login";
    return applySecurityHeaders(NextResponse.redirect(url), referrerPolicy);
  }

  return applySecurityHeaders(NextResponse.next(), referrerPolicy);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
