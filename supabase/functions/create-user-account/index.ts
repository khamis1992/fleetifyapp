import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authorizePrivilegedCompanyActor,
  PrivilegedAuthError,
} from "../_shared/privileged-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIVILEGED_ROLES = new Set(["super_admin", "company_admin"]);

type AccountRequest = {
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  email?: string;
  company_id?: string;
  roles?: string[];
  temporary_password?: string;
};

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  let createdAuthUserId: string | null = null;

  try {
    const body = await readJson<AccountRequest>(req);
    const employeeId = requireUuid(body.employee_id, "employee_id");
    const companyId = requireUuid(body.company_id, "company_id");
    const email = requireEmail(body.email);
    const roles = normalizeRoles(body.roles);
    const actor = await authorizePrivilegedCompanyActor(
      req,
      companyId,
      ["company_admin"],
      admin,
    );
    if (!actor.isSuperAdmin && roles.some((role) => PRIVILEGED_ROLES.has(role))) {
      throw new RequestError("Only a super administrator can grant an administrator role", 403);
    }

    const { data: employee, error: employeeError } = await admin
      .from("employees")
      .select("id,company_id,user_id,email")
      .eq("id", employeeId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (employeeError) throw employeeError;
    if (!employee) throw new RequestError("Employee was not found in the selected company", 404);
    if (employee.email && String(employee.email).trim().toLowerCase() !== email) {
      throw new RequestError("Employee email does not match the requested account email", 409);
    }

    let userId = typeof employee.user_id === "string" ? employee.user_id : "";
    let linkedExistingUser = Boolean(userId);
    if (!userId) {
      const { data: existingProfile, error: existingProfileError } = await admin
        .from("profiles")
        .select("user_id,company_id")
        .eq("email", email)
        .maybeSingle();
      if (existingProfileError) throw existingProfileError;
      if (existingProfile?.user_id) {
        if (existingProfile.company_id && existingProfile.company_id !== companyId) {
          throw new RequestError(
            "The existing account belongs to another company; use the audited transfer workflow",
            409,
          );
        }
        userId = existingProfile.user_id;
        linkedExistingUser = true;
      }
    }

    let temporaryPassword: string | null = null;
    if (userId) {
      const { data: existingAuth, error: existingAuthError } =
        await admin.auth.admin.getUserById(userId);
      if (existingAuthError || !existingAuth?.user) {
        throw new RequestError("Linked authentication account was not found", 409);
      }
      if (String(existingAuth.user.email || "").toLowerCase() !== email) {
        throw new RequestError("Linked authentication email does not match", 409);
      }
      // Never reset an existing account's password through an account-linking
      // request. Password recovery is a separate user-owned workflow.
      temporaryPassword = null;
    } else {
      temporaryPassword = validateOrGeneratePassword(body.temporary_password);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          first_name: cleanName(body.first_name || body.first_name_ar),
          last_name: cleanName(body.last_name || body.last_name_ar),
        },
      });
      if (createError || !created?.user) {
        throw createError || new Error("Authentication user was not created");
      }
      userId = created.user.id;
      createdAuthUserId = userId;
    }

    // Execute all database mutations in one authenticated SECURITY DEFINER RPC.
    // If this fails, a newly-created Auth user is removed as compensation.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );
    const { data: finalized, error: finalizeError } = await userClient.rpc(
      "finalize_user_account_creation_v1",
      {
        p_employee_id: employeeId,
        p_company_id: companyId,
        p_user_id: userId,
        p_email: email,
        p_first_name: cleanName(body.first_name || body.first_name_ar),
        p_last_name: cleanName(body.last_name || body.last_name_ar),
        p_first_name_ar: cleanName(body.first_name_ar || body.first_name),
        p_last_name_ar: cleanName(body.last_name_ar || body.last_name),
        p_roles: roles,
      },
    );
    if (finalizeError || finalized?.success !== true) {
      throw finalizeError || new Error(String(finalized?.error || "Account database finalization failed"));
    }

    createdAuthUserId = null;
    const passwordExpiresAt = temporaryPassword
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    return json({
      success: true,
      user_id: userId,
      temporary_password: temporaryPassword,
      password_expires_at: passwordExpiresAt,
      linked_existing_user: linkedExistingUser,
    });
  } catch (error) {
    if (createdAuthUserId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(createdAuthUserId);
      if (cleanupError) console.error("create-user-account compensation failed", cleanupError.message);
    }
    const status = error instanceof PrivilegedAuthError || error instanceof RequestError
      ? error.status
      : 500;
    console.error("create-user-account failed", error instanceof Error ? error.message : String(error));
    return json({ success: false, error: errorMessage(error) }, status);
  }
});

async function readJson<T>(req: Request): Promise<T> {
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as T;
  } catch {
    throw new RequestError("Request body must be a JSON object", 400);
  }
}

function requireUuid(value: unknown, field: string): string {
  const normalized = String(value || "").trim();
  if (!UUID_PATTERN.test(normalized)) throw new RequestError(`${field} must be a valid UUID`, 400);
  return normalized;
}

function requireEmail(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
    throw new RequestError("A valid email is required", 400);
  }
  return normalized;
}

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) throw new RequestError("At least one role is required", 400);
  const roles = [...new Set(value.map((role) => String(role || "").trim()).filter(Boolean))];
  if (roles.length === 0 || roles.length > 10) {
    throw new RequestError("Between 1 and 10 unique roles are required", 400);
  }
  return roles;
}

function cleanName(value: unknown): string {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!name || name.length > 120) throw new RequestError("First and last names are required", 400);
  return name;
}

function validateOrGeneratePassword(value: unknown): string {
  const supplied = typeof value === "string" ? value : "";
  if (supplied) {
    if (supplied.length < 12 || supplied.length > 128) {
      throw new RequestError("Temporary password must be between 12 and 128 characters", 400);
    }
    return supplied;
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected account creation failure";
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
