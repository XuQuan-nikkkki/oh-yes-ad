export const AUTH_SESSION_COOKIE = "ohyes_auth";

export type AuthSession = {
  employeeId: string;
  phone: string;
  name: string;
};

export function encodeAuthSession(session: AuthSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function decodeAuthSession(value: string): AuthSession | null {
  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as Partial<AuthSession>;
    if (!parsed.employeeId || !parsed.phone || !parsed.name) {
      return null;
    }
    return {
      employeeId: parsed.employeeId,
      phone: parsed.phone,
      name: parsed.name,
    };
  } catch {
    return null;
  }
}

export function shouldUseSecureCookie(req: Request): boolean {
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}
