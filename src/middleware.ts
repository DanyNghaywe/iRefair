import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionEdge } from "@/lib/founderAuth";

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  const isFounderUI = p.startsWith("/founder");
  const isFounderAPI = p.startsWith("/api/founder");

  if (!isFounderUI && !isFounderAPI) return NextResponse.next();

  // ✅ ALWAYS allow login UI + auth endpoints
  if (p === "/founder/login" || p.startsWith("/api/founder/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("irefair_founder")?.value;
  const session = token ? await verifySessionEdge(token) : null;

  if (!session) {
    if (isFounderAPI) {
      const res = NextResponse.json(
        { ok: false, error: "MW_UNAUTHORIZED" },
        { status: 401 }
      );
      res.headers.set("x-irefair-auth", "blocked-by-middleware");
      return res;
    }

    const url = req.nextUrl.clone();
    url.pathname = "/founder/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/founder/:path*", "/api/founder/:path*"],
};
