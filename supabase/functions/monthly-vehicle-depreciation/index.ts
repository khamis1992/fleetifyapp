import {
  type AgentInvocationContext,
  agentCorsHeaders,
  authorizeScheduledAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
} from "../_shared/agent.ts";
import { authorizePrivilegedCompanyActor } from "../_shared/privileged-admin.ts";

type DepreciationRequest = {
  companyId?: string;
  depreciationMonth?: string;
  maxVehicles?: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VEHICLES = 500;

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: agentCorsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  const supabase = createServiceClient();
  let invocation: AgentInvocationContext | null = null;
  let executionFailed = false;
  let failureCode: string | null = null;
  let summary: Record<string, unknown> = {};

  try {
    const body = await readJson<DepreciationRequest>(req);
    const companyId = requireUuid(body.companyId, "companyId");
    if (!req.headers.get("x-agent-id") && !req.headers.get("x-agent-secret")) {
      await authorizePrivilegedCompanyActor(
        req,
        companyId,
        ["company_admin", "manager", "accountant"],
        supabase,
      );
    }
    invocation = await authorizeScheduledAgent(
      req,
      "monthly-vehicle-depreciation",
      companyId,
    );
    const depreciationDate = normalizeMonth(body.depreciationMonth);
    const maxVehicles = parseMaxVehicles(body.maxVehicles);
    const { data, error } = await supabase.rpc(
      "process_vehicle_depreciation_monthly_agent_v1",
      {
        p_company_id: companyId,
        p_depreciation_date: depreciationDate,
        p_request_id: invocation.requestId,
        p_max_vehicles: maxVehicles,
      },
    );
    if (error) throw error;
    if (!data || typeof data !== "object" || data.success !== true) {
      throw new Error("Atomic depreciation agent returned an invalid outcome");
    }

    summary = {
      depreciationMonth: depreciationDate,
      eligibleVehicles: Number(data.eligibleVehicles || 0),
      created: Number(data.created || 0),
      existing: Number(data.existing || 0),
    };
    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    executionFailed = true;
    failureCode = classifyFailure(error);
    console.error("monthly-vehicle-depreciation failed", error);
    const status = error instanceof HttpError
      ? error.status
      : errorMessage(error) === "Unauthorized"
      ? 401
      : 500;
    return jsonResponse({ success: false, error: errorMessage(error), code: failureCode }, status);
  } finally {
    if (invocation) {
      try {
        await finishAgentExecution(
          supabase,
          invocation,
          !executionFailed,
          summary,
          failureCode,
        );
      } catch (finishError) {
        console.error("Could not close depreciation execution", finishError);
      }
    }
  }
});

async function readJson<T>(req: Request): Promise<T> {
  const raw = await req.text();
  if (!raw.trim()) return {} as T;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as T;
  } catch {
    throw new HttpError("Request body must be a JSON object", 400);
  }
}

function requireUuid(value: unknown, field: string): string {
  const normalized = String(value || "").trim();
  if (!UUID_PATTERN.test(normalized)) throw new HttpError(`${field} must be a valid UUID`, 400);
  return normalized;
}

function normalizeMonth(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }
  const match = String(value).trim().match(/^(\d{4})-(\d{2})(?:-01)?$/);
  if (!match) throw new HttpError("depreciationMonth must be YYYY-MM or YYYY-MM-01", 400);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new HttpError("depreciationMonth is invalid", 400);
  return `${match[1]}-${match[2]}-01`;
}

function parseMaxVehicles(value: unknown): number {
  if (value === undefined) return MAX_VEHICLES;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > MAX_VEHICLES) {
    throw new HttpError(`maxVehicles must be an integer between 1 and ${MAX_VEHICLES}`, 400);
  }
  return Number(value);
}

function classifyFailure(error: unknown): string {
  const message = errorMessage(error);
  if (message.includes("closed accounting period")) return "DEPRECIATION_PERIOD_CLOSED";
  if (message.includes("posting accounts")) return "DEPRECIATION_ACCOUNTS_MISSING";
  if (message.includes("VEHICLE_LIMIT_EXCEEDED")) return "DEPRECIATION_VEHICLE_LIMIT_EXCEEDED";
  if (message === "Unauthorized") return "DEPRECIATION_UNAUTHORIZED";
  return "DEPRECIATION_FAILURE";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const payload = error as { message?: string; details?: string; code?: string } | null;
  return payload?.message || payload?.details || payload?.code || String(error);
}
