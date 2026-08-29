import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createServiceClient } from "./agent.ts";

export class PrivilegedAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface PrivilegedCompanyActor {
  userId: string;
  profileCompanyId: string | null;
  isSuperAdmin: boolean;
  roles: string[];
}

export interface ActiveCompanyActor {
  userId: string;
  companyId: string;
}

/** Explicit gateway-independent authentication for read-only/AI endpoints. */
export async function authorizeActiveCompanyUser(
  req: Request,
  admin: SupabaseClient = createServiceClient(),
): Promise<ActiveCompanyActor> {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new PrivilegedAuthError("Authentication required", 401);
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) {
    throw new PrivilegedAuthError("Authentication required", 401);
  }
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("company_id,is_active")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (profileError) throw new PrivilegedAuthError("Authorization lookup failed", 503);
  if (profile?.is_active !== true || !profile.company_id) {
    throw new PrivilegedAuthError("Active company membership required", 403);
  }
  return { userId: authData.user.id, companyId: profile.company_id };
}

/**
 * Authenticate privileged interactive writers with the actual JWT actor.
 * Request-body actor IDs are deliberately ignored: they are audit metadata,
 * never authorization evidence.
 */
export async function authorizePrivilegedCompanyActor(
  req: Request,
  companyId: string,
  allowedCompanyRoles: readonly string[],
  admin: SupabaseClient = createServiceClient(),
): Promise<PrivilegedCompanyActor> {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new PrivilegedAuthError("Authentication required", 401);

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) {
    throw new PrivilegedAuthError("Authentication required", 401);
  }

  const [{ data: profile, error: profileError }, { data: roleRows, error: rolesError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("company_id,is_active")
        .eq("user_id", authData.user.id)
        .maybeSingle(),
      admin
        .from("user_roles")
        .select("role,company_id")
        .eq("user_id", authData.user.id),
    ]);
  if (profileError || rolesError) {
    throw new PrivilegedAuthError("Authorization lookup failed", 503);
  }

  const roles = (roleRows || []).map((row: { role: string }) => row.role);
  const isSuperAdmin = (roleRows || []).some(
    (row: { role: string }) => row.role === "super_admin",
  );
  const hasCompanyRole = profile?.is_active === true &&
    profile.company_id === companyId &&
    (roleRows || []).some((row: { role: string; company_id: string | null }) =>
      row.company_id === companyId && allowedCompanyRoles.includes(row.role)
    );

  if (!isSuperAdmin && !hasCompanyRole) {
    throw new PrivilegedAuthError("Privileged company access required", 403);
  }

  return {
    userId: authData.user.id,
    profileCompanyId: profile?.company_id || null,
    isSuperAdmin,
    roles,
  };
}
