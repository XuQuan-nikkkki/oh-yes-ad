export type AppRoleCode =
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "HR"
  | "FINANCE"
  | "STAFF";

type RoleRelation = {
  role?: {
    code?: string | null;
  } | null;
};

type HasRoles = {
  roles?: RoleRelation[] | null;
};

export const CRM_MANAGER_ROLES: readonly AppRoleCode[] = [
  "ADMIN",
  "PROJECT_MANAGER",
];
export const PROJECT_RESOURCE_MANAGER_ROLES: readonly AppRoleCode[] = [
  "ADMIN",
  "PROJECT_MANAGER",
];

export const extractRoleCodes = (input: HasRoles | null | undefined) => {
  if (!input?.roles || !Array.isArray(input.roles)) return [] as string[];
  return input.roles
    .map((item) => item?.role?.code)
    .filter((code): code is string => Boolean(code));
};

export const canManageCrmResources = (roleCodes: readonly string[]) =>
  roleCodes.some((roleCode) => CRM_MANAGER_ROLES.includes(roleCode as AppRoleCode));

export const canManageCrmResourcesByRoles = (input: HasRoles | null | undefined) =>
  canManageCrmResources(extractRoleCodes(input));

export const canManageProjectResources = (roleCodes: readonly string[]) =>
  roleCodes.some((roleCode) =>
    PROJECT_RESOURCE_MANAGER_ROLES.includes(roleCode as AppRoleCode),
  );

export const canManageProjectResourcesByRoles = (
  input: HasRoles | null | undefined,
) => canManageProjectResources(extractRoleCodes(input));
