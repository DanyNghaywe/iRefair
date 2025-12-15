import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { FOUNDER_SESSION_COOKIE, signSession } from "@/lib/founderAuth";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const { email, password }: LoginPayload = await request.json();

  const envEmail = process.env.FOUNDER_EMAIL;
  const passwordHash = process.env.FOUNDER_PASSWORD_HASH;
  const secret = process.env.FOUNDER_AUTH_SECRET;

  if (!envEmail || !passwordHash || !secret) {
    return NextResponse.json(
      { ok: false, error: "Authentication is not configured." },
      { status: 500 },
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Please provide email and password." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== envEmail.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const token = signSession({ email: envEmail, exp }, secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: FOUNDER_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
