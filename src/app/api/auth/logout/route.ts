import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, shouldUseSecureCookie } from "@/lib/auth-session";

export async function POST(req: Request) {
  const isSecureCookie = shouldUseSecureCookie(req);

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie,
    maxAge: 0,
  });
  return response;
}
