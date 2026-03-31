import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-session";

export async function POST(req: Request) {
  const requestUrl = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const isSecureRequest =
    forwardedProto === "https" || requestUrl.protocol === "https:";

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest,
    maxAge: 0,
  });
  return response;
}
