import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SENSITIVE_KEYS = new Set(["password", "oldPassword", "newPassword", "token"]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    Object.entries(obj).forEach(([key, current]) => {
      if (SENSITIVE_KEYS.has(key)) {
        next[key] = "***";
        return;
      }
      next[key] = redact(current);
    });

    return next;
  }

  return value;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

type ApiCallLogPayload = {
  req: Request;
  path: string;
  method: string;
  statusCode: number;
  requestBody?: unknown;
  responseBody?: unknown;
  errorMessage?: string;
  employeeId?: string;
  startedAt: number;
};

export async function logApiCall(payload: ApiCallLogPayload) {
  try {
    await prisma.apiCallLog.create({
      data: {
        path: payload.path,
        method: payload.method,
        statusCode: payload.statusCode,
        requestBody:
          payload.requestBody === undefined
            ? undefined
            : (redact(payload.requestBody) as Prisma.InputJsonValue),
        responseBody:
          payload.responseBody === undefined
            ? undefined
            : (redact(payload.responseBody) as Prisma.InputJsonValue),
        errorMessage: payload.errorMessage,
        employeeId: payload.employeeId,
        ip: getClientIp(payload.req),
        userAgent: payload.req.headers.get("user-agent"),
        durationMs: Date.now() - payload.startedAt,
      },
    });
  } catch {
    // Avoid breaking business APIs because logging failed.
  }
}
