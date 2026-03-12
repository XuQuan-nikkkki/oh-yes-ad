import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, encodeAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { logApiCall } from "@/lib/api-call-log";

export async function POST(req: Request) {
  const startedAt = Date.now();
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    await logApiCall({
      req,
      path: "/api/auth/login",
      method: "POST",
      statusCode: 400,
      errorMessage: "请求体格式错误",
      startedAt,
    });
    return new Response("请求体格式错误", { status: 400 });
  }

  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!phone) {
    await logApiCall({
      req,
      path: "/api/auth/login",
      method: "POST",
      statusCode: 400,
      requestBody: body,
      errorMessage: "手机号不能为空",
      startedAt,
    });
    return new Response("手机号不能为空", { status: 400 });
  }

  if (!password) {
    await logApiCall({
      req,
      path: "/api/auth/login",
      method: "POST",
      statusCode: 400,
      requestBody: body,
      errorMessage: "密码不能为空",
      startedAt,
    });
    return new Response("密码不能为空", { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      fullName: true,
      phone: true,
      password: true,
      roles: {
        select: {
          role: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  });

  if (!employee) {
    await logApiCall({
      req,
      path: "/api/auth/login",
      method: "POST",
      statusCode: 401,
      requestBody: body,
      errorMessage: "用户不存在",
      startedAt,
    });
    return new Response("用户不存在", { status: 401 });
  }

  if (employee.password !== password) {
    await logApiCall({
      req,
      path: "/api/auth/login",
      method: "POST",
      statusCode: 401,
      requestBody: body,
      employeeId: employee.id,
      errorMessage: "密码不正确",
      startedAt,
    });
    return new Response("密码不正确", { status: 401 });
  }

  const response = NextResponse.json({
    id: employee.id,
    name: employee.name,
    fullName: employee.fullName,
    phone: employee.phone,
    roles: employee.roles,
  });

  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: encodeAuthSession({
      employeeId: employee.id,
      phone: employee.phone ?? phone,
      name: employee.name,
    }),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  await logApiCall({
    req,
    path: "/api/auth/login",
    method: "POST",
    statusCode: 200,
    requestBody: body,
    responseBody: {
      id: employee.id,
      name: employee.name,
      phone: employee.phone,
    },
    employeeId: employee.id,
    startedAt,
  });

  return response;
}
