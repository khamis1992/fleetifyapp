import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  endOfInvoiceMonth,
  getCurrentInvoiceMonthInQatar,
  normalizeInvoiceMonth,
  summarizeContractSelection,
} from "./invoice-month.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type BackfillRequest = {
  companyId?: string;
  contractIds?: string[];
  throughMonth?: string;
  dryRun?: boolean;
  maxContracts?: number;
  afterContractId?: string;
};

type ContractRow = {
  id: string;
  company_id: string;
  contract_number: string | null;
  customer_id: string | null;
};

type ContractResult = {
  contractId: string;
  contractNumber: string | null;
  schedulesCreated: number;
  invoiceMonthsScanned: number;
  invoicesCreated: number;
  invoicesSkipped: number;
  errors: string[];
};

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") throw new HttpError("Method not allowed", 405);
    authorizeBackfill(req);

    const body = await readJson<BackfillRequest>(req);
    const companyId = String(body.companyId || "").trim();
    if (!companyId) {
      throw new HttpError("companyId is required for historical backfill", 400);
    }

    const throughMonth = normalizeInvoiceMonth(
      body.throughMonth || getCurrentInvoiceMonthInQatar(),
    );
    const dryRun = body.dryRun !== false;
    const maxContracts = clampInt(body.maxContracts, 1, 5_000, 1_000);
    const hasExplicitContractIds = body.contractIds !== undefined;
    if (hasExplicitContractIds && !Array.isArray(body.contractIds)) {
      throw new HttpError("contractIds must be an array", 400, {
        selection: { requested: 0, matched: 0, missing: 0 },
      });
    }
    const contractIds = Array.from(
      new Set((body.contractIds || []).map((id) => String(id).trim()).filter(Boolean)),
    );
    if (hasExplicitContractIds && contractIds.length === 0) {
      throw new HttpError("contractIds must contain at least one valid id", 400, {
        selection: { requested: 0, matched: 0, missing: 0 },
      });
    }
    if (contractIds.some((contractId) => !UUID_PATTERN.test(contractId))) {
      throw new HttpError("contractIds must contain valid UUIDs", 400, {
        selection: {
          requested: contractIds.length,
          matched: 0,
          missing: contractIds.length,
        },
      });
    }
    if (contractIds.length > 200) {
      throw new HttpError("contractIds cannot contain more than 200 unique ids", 400, {
        selection: {
          requested: contractIds.length,
          matched: 0,
          missing: contractIds.length,
        },
      });
    }
    const afterContractId = String(body.afterContractId || "").trim();
    if (afterContractId && !UUID_PATTERN.test(afterContractId)) {
      throw new HttpError("afterContractId must be a valid UUID", 400);
    }
    if (afterContractId && hasExplicitContractIds) {
      throw new HttpError("afterContractId cannot be combined with contractIds", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const contractPage = await loadContracts(
      supabase,
      companyId,
      contractIds,
      maxContracts,
      afterContractId || null,
    );
    const contracts = contractPage.rows;
    if (hasExplicitContractIds) {
      const selection = summarizeContractSelection(
        contractIds,
        contracts.map((contract) => contract.id),
      );
      if (selection.missing > 0) {
        // Do not reveal which IDs belong to another company. Missing,
        // ineligible and wrong-company IDs intentionally share one response.
        throw new HttpError(
          "One or more requested contracts are unavailable or ineligible",
          400,
          {
            selection,
          },
        );
      }
    }

    const results: ContractResult[] = [];
    for (const contract of contracts) {
      const result: ContractResult = {
        contractId: contract.id,
        contractNumber: contract.contract_number,
        schedulesCreated: 0,
        invoiceMonthsScanned: 0,
        invoicesCreated: 0,
        invoicesSkipped: 0,
        errors: [],
      };

      try {
        const { data: scheduleResult, error: scheduleError } = await supabase.rpc(
          "generate_payment_schedules_for_contract",
          { p_contract_id: contract.id, p_dry_run: dryRun },
        );
        if (scheduleError) throw scheduleError;
        assertRpcSuccess(scheduleResult, "payment schedule generation");
        result.schedulesCreated = Number(
          (scheduleResult as { schedules_created?: number } | null)?.schedules_created || 0,
        );

        // A dry run must never create schedules merely to discover months.
        // Existing schedules are still reported; a subsequent explicit
        // dryRun:false request performs the canonical graph bootstrap first.
        const schedules = await loadSchedulesThroughMonth(
          supabase,
          companyId,
          contract.id,
          throughMonth,
        );
        const invoiceMonths = Array.from(new Set(
          schedules
            .filter((schedule) => !isInactiveStatus(schedule.status))
            .map((schedule) => normalizeInvoiceMonth(String(schedule.due_date))),
        )).sort();
        result.invoiceMonthsScanned = invoiceMonths.length;

        if (!dryRun) {
          for (const invoiceMonth of invoiceMonths) {
            try {
              // This service-only RPC locks the contract, checks for an
              // existing positive invoice, and reports whether this caller
              // actually created it. That makes retries and concurrent
              // backfill workers deterministic.
              const { data: rawOutcome, error: invoiceError } = await supabase.rpc(
                "generate_invoice_for_contract_month_outcome",
                { p_contract_id: contract.id, p_invoice_month: invoiceMonth },
              );
              if (invoiceError) throw invoiceError;

              const outcome = rawOutcome && typeof rawOutcome === "object"
                ? rawOutcome as { invoice_id?: unknown; created?: unknown }
                : null;
              if (typeof outcome?.invoice_id !== "string" || !outcome.invoice_id) {
                throw new Error("Atomic invoice generator returned no invoice id");
              }

              if (outcome.created === true) result.invoicesCreated += 1;
              else result.invoicesSkipped += 1;
            } catch (error) {
              // One malformed historical month must not prevent the remaining
              // months for this contract from being repaired.
              result.errors.push(`${invoiceMonth}: ${errorMessage(error)}`);
            }
          }
        }
      } catch (error) {
        result.errors.push(errorMessage(error));
      }

      results.push(result);
    }

    const summary = results.reduce(
      (totals, result) => ({
        contractsProcessed: totals.contractsProcessed + 1,
        schedulesCreated: totals.schedulesCreated + result.schedulesCreated,
        invoiceMonthsScanned: totals.invoiceMonthsScanned + result.invoiceMonthsScanned,
        invoicesCreated: totals.invoicesCreated + result.invoicesCreated,
        invoicesSkipped: totals.invoicesSkipped + result.invoicesSkipped,
        errors: totals.errors + result.errors.length,
      }),
      {
        contractsProcessed: 0,
        schedulesCreated: 0,
        invoiceMonthsScanned: 0,
        invoicesCreated: 0,
        invoicesSkipped: 0,
        errors: 0,
      },
    );

    const partial = summary.errors > 0 || contractPage.truncated;
    return jsonResponse({
      success: !partial,
      status: partial ? "partial" : "completed",
      dryRun,
      companyId,
      throughMonth,
      continuation: {
        truncated: contractPage.truncated,
        nextCursor: contractPage.nextCursor,
      },
      summary,
      results,
    }, partial ? 207 : 200);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error("backfill-historical-invoices failed", error);
    return jsonResponse({
      success: false,
      error: errorMessage(error),
      ...(error instanceof HttpError && error.details ? error.details : {}),
    }, status);
  }
});

function authorizeBackfill(req: Request) {
  const configuredSecret = Deno.env.get("INVOICE_GENERATOR_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("authorization") || "";
  const agentSecret = req.headers.get("x-agent-secret") || "";

  if (configuredSecret && agentSecret === configuredSecret) return;
  if (serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`) return;
  throw new HttpError("Unauthorized historical backfill request", 401);
}

async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError("Request body must be valid JSON", 400);
  }
}

async function loadContracts(
  supabase: any,
  companyId: string,
  contractIds: string[],
  maxContracts: number,
  afterContractId: string | null,
): Promise<{ rows: ContractRow[]; truncated: boolean; nextCursor: string | null }> {
  const pageSize = 200;
  const contracts: ContractRow[] = [];
  const requestedRows = maxContracts + 1;
  let cursor = afterContractId;

  while (contracts.length < requestedRows) {
    const limit = Math.min(pageSize, requestedRows - contracts.length);
    let query = supabase
      .from("contracts")
      .select("id, company_id, contract_number, customer_id")
      .eq("company_id", companyId)
      .in("status", ["active", "under_legal_procedure"])
      .not("start_date", "is", null)
      .not("end_date", "is", null)
      .order("id", { ascending: true })
      .limit(limit);
    if (contractIds.length > 0) query = query.in("id", contractIds);
    if (cursor) query = query.gt("id", cursor);

    const { data, error } = await query;
    if (error) throw error;
    const page = (data || []) as ContractRow[];
    contracts.push(...page);
    if (page.length < limit) break;
    const nextCursor = page[page.length - 1]?.id || "";
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("Contract keyset pagination did not advance");
    }
    cursor = nextCursor;
  }

  const truncated = contracts.length > maxContracts;
  const rows = contracts.slice(0, maxContracts);
  return {
    rows,
    truncated,
    nextCursor: truncated ? rows[rows.length - 1]?.id || null : null,
  };
}

async function loadSchedulesThroughMonth(
  supabase: any,
  companyId: string,
  contractId: string,
  throughMonth: string,
) {
  const { data, error } = await supabase
    .from("contract_payment_schedules")
    .select("id, due_date, status")
    .eq("company_id", companyId)
    .eq("contract_id", contractId)
    .lte("due_date", endOfInvoiceMonth(throughMonth))
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

function assertRpcSuccess(result: unknown, operation: string) {
  const payload = result as { success?: boolean; error?: string; message?: string } | null;
  if (payload?.success === false) {
    throw new Error(payload.error || payload.message || `${operation} failed`);
  }
}

function isInactiveStatus(value: unknown) {
  return ["cancelled", "canceled", "void", "voided", "deleted", "inactive"]
    .includes(String(value || "").toLowerCase());
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  const payload = error as { message?: string; details?: string; code?: string } | null;
  return payload?.message || payload?.details || payload?.code || String(error);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
