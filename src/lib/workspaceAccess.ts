import type { AuthUser } from '@/lib/auth';

const ELEVATED_ROLES = new Set([
  'super_admin',
  'company_admin',
  'admin',
  'manager',
  'accountant',
  'fleet_manager',
  'legal',
  'legal_manager',
  'hr_manager',
  'sales_manager',
]);

const WORKSPACE_ONLY_PATHS = [
  '/employee-workspace',
  '/mobile/employee',
  '/legal/verify',
];

export function getUserRoles(user: AuthUser | null | undefined): string[] {
  return Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean)
    : [];
}

export function isWorkspaceOnlyEmployee(user: AuthUser | null | undefined): boolean {
  if (!user) return false;

  const roles = getUserRoles(user);
  if (roles.length === 0) return false;

  return !roles.some((role) => ELEVATED_ROLES.has(role));
}

export function canAccessWorkspaceOnlyPath(pathname: string): boolean {
  return WORKSPACE_ONLY_PATHS.some((path) => (
    pathname === path || pathname.startsWith(`${path}/`)
  ));
}
