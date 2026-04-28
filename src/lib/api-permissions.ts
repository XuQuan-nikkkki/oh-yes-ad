import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, decodeAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import {
  canManageCrmResourcesByRoles,
  canManageLeaveRecordsByRoles,
  canManageProjectResourcesByRoles,
  canManageWorkdayAdjustmentsByRoles,
  extractRoleCodes,
} from "@/lib/role-permissions";

export const requireAuthenticatedEmployee = async () => {
  const raw = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;
  if (!raw) {
    return { response: new Response("Unauthorized", { status: 401 }) };
  }

  const session = decodeAuthSession(raw);
  if (!session?.employeeId) {
    return { response: new Response("Unauthorized", { status: 401 }) };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      id: true,
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
    return { response: new Response("Unauthorized", { status: 401 }) };
  }

  return { employee, session, response: null };
};

export const requireCrmWritePermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) return response;

  if (!canManageCrmResourcesByRoles(employee)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export const requireProjectWritePermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) return response;

  if (!canManageProjectResourcesByRoles(employee)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export const requireFinanceOrAdminPermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) return response;

  const roleCodes = extractRoleCodes(employee);
  if (!roleCodes.includes("FINANCE") && !roleCodes.includes("ADMIN")) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export const requireWorkdayAdjustmentWritePermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) return response;

  if (!canManageWorkdayAdjustmentsByRoles(employee)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export const requireLeaveRecordWritePermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) return response;

  if (!canManageLeaveRecordsByRoles(employee)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
};

export const requireAdminPermission = async () => {
  const { employee, response } = await requireAuthenticatedEmployee();
  if (response) {
    return { response, employee: null };
  }

  const roleCodes = extractRoleCodes(employee);
  if (!roleCodes.includes("ADMIN")) {
    return {
      response: new Response("Forbidden", { status: 403 }),
      employee: null,
    };
  }

  return { response: null, employee };
};
