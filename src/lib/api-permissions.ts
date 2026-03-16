import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  canManageCrmResourcesByRoles,
  canManageProjectResourcesByRoles,
} from "@/lib/role-permissions";

export const requireCrmWritePermission = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = decodeAuthSession(raw);
  if (!session?.employeeId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      roles: {
        select: {
          role: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!employee) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canManageCrmResourcesByRoles(employee)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export const requireProjectWritePermission = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = decodeAuthSession(raw);
  if (!session?.employeeId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      roles: {
        select: {
          role: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!employee) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canManageProjectResourcesByRoles(employee)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};
