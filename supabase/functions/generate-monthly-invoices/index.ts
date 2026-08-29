import {
  getDefaultScheduledInvoiceMonth,
  getInvoiceMonthBounds,
  normalizeInvoiceMonth,
} from "./invoice-month.ts";
import {
  type AgentInvocationContext,
  authorizeScheduledAgent,
  createServiceClient,
  finishAgentExecution,
} from "../_shared/agent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

type GeneratorRequest = {
  targetMonth?: string;
  companyId?: string;
  sendNotifications?: boolean;
  afterContractId?: string;
  batchSize?: number;
};

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 200;

type Contract = {
  id: string;
  company_id: string;
  customer_id: string;
  contract_number: string;
};

type GenerationResults = {
  success: number;
  failed: number;
  skipped: number;
  notificationFailed: number;
  errors: string[];
};

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseClient = createServiceClient();
  let invocation: AgentInvocationContext | null = null;
  let executionFailed = false;
  let executionSummary: Record<string, unknown> = {};
  try {
    const body = await readJson<GeneratorRequest>(req);
    if (typeof body.companyId !== "string" || !body.companyId) {
      throw new HttpError("companyId is required", 400);
    }
    invocation = await authorizeScheduledAgent(
      req,
      "generate-monthly-invoices",
      body.companyId,
    );
    const invoiceMonth = normalizeInvoiceMonth(
      body.targetMonth || getDefaultScheduledInvoiceMonth(),
    );
    const { monthStart } = getInvoiceMonthBounds(invoiceMonth);
    const batchSize = parseBatchSize(body.batchSize);
    const afterContractId = parseCursor(body.afterContractId, "afterContractId");

    const contractBatch = await loadEligibleContracts(
      supabaseClient,
      monthStart,
      body.companyId,
      afterContractId,
      batchSize,
    );
    const contracts = contractBatch.contracts;
    const results: GenerationResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      notificationFailed: 0,
      errors: [],
    };

    console.log(
      `Generating canonical invoices for ${invoiceMonth}; ${contracts.length} contracts in this bounded batch`,
    );

    for (const contract of contracts) {
      try {
        // The service-only outcome RPC locks the contract before checking for
        // an existing invoice. Concurrent workers therefore cannot both claim
        // creation or send duplicate customer notifications.
        const { data: rawOutcome, error: generationError } = await supabaseClient.rpc(
          "generate_invoice_for_contract_month_outcome",
          {
            p_contract_id: contract.id,
            p_invoice_month: monthStart,
          },
        );

        if (generationError) {
          throw generationError;
        }

        const outcome = rawOutcome && typeof rawOutcome === "object"
          ? rawOutcome as { invoice_id?: unknown; created?: unknown }
          : null;
        const invoiceId = typeof outcome?.invoice_id === "string"
          ? outcome.invoice_id
          : "";
        if (!invoiceId) {
          throw new Error("Atomic invoice generator returned no invoice id");
        }
        if (outcome?.created !== true) {
          results.skipped += 1;
          continue;
        }

        results.success += 1;

        if (body.sendNotifications !== false) {
          const notificationSent = await notifyCustomer(
            supabaseClient,
            contract,
            invoiceId,
          );
          if (!notificationSent) results.notificationFailed += 1;
        }
      } catch (error) {
        const message = errorMessage(error);
        console.error(`Invoice generation failed for ${contract.contract_number}:`, error);
        results.failed += 1;
        results.errors.push(`${contract.contract_number}: ${message}`);
      }
    }

    executionSummary = {
      targetMonth: invoiceMonth,
      contractsProcessed: contracts.length,
      created: results.success,
      failed: results.failed,
      skipped: results.skipped,
    };
    return jsonResponse({
      success: results.failed === 0,
      targetMonth: invoiceMonth,
      contractsProcessed: contracts.length,
      results,
      continuation: {
        hasMore: contractBatch.hasMore,
        afterContractId: contractBatch.nextAfterContractId,
        batchSize,
      },
    });
  } catch (error) {
    executionFailed = true;
    console.error("generate-monthly-invoices failed:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({ success: false, error: errorMessage(error) }, status);
  } finally {
    if (invocation) {
      try {
        await finishAgentExecution(
          supabaseClient,
          invocation,
          !executionFailed,
          executionSummary,
          executionFailed ? "INVOICE_GENERATION_FAILURE" : null,
        );
      } catch (finishError) {
        console.error("Could not close invoice generator execution", finishError);
      }
    }
  }
});

async function readJson<T>(req: Request): Promise<T> {
  const rawBody = await req.text();
  if (!rawBody.trim()) return {} as T;

  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new HttpError("Request body must be a JSON object", 400);
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Invalid JSON request body", 400);
  }
}

async function loadEligibleContracts(
  supabase: any,
  monthStart: string,
  companyId?: string,
  afterContractId: string | null = null,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<{
  contracts: Contract[];
  hasMore: boolean;
  nextAfterContractId: string | null;
}> {
  let query = supabase
    .from("contracts")
    .select("id, company_id, customer_id, contract_number")
    .in("status", ["active", "under_legal_procedure"])
    // New contracts begin canonical billing in the month after their start.
    // Start-month legacy graphs are repaired by the targeted audit/backfill
    // path; selecting a target-month starter here would create a false
    // monthly-job failure because it has no target schedule by design.
    .lt("start_date", monthStart)
    .not("end_date", "is", null)
    .gte("end_date", monthStart)
    .order("id", { ascending: true })
    .limit(batchSize + 1);

  if (companyId) query = query.eq("company_id", companyId);
  if (afterContractId) query = query.gt("id", afterContractId);

  const { data, error } = await query;
  if (error) throw error;

  const page = (data || []) as Contract[];
  const hasMore = page.length > batchSize;
  const contracts = page.slice(0, batchSize);
  const nextAfterContractId = hasMore
    ? contracts[contracts.length - 1]?.id || null
    : null;

  if (hasMore && !nextAfterContractId) {
    throw new Error("Contract generation continuation cursor did not advance");
  }

  return { contracts, hasMore, nextAfterContractId };
}

function parseBatchSize(value: unknown): number {
  if (value === undefined) return DEFAULT_BATCH_SIZE;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > MAX_BATCH_SIZE) {
    throw new HttpError(
      `batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`,
      400,
    );
  }
  return Number(value);
}

function parseCursor(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 128) {
    throw new HttpError(`${field} must be a valid cursor`, 400);
  }
  return value;
}

async function notifyCustomer(
  supabase: any,
  contract: Contract,
  invoiceId: string,
): Promise<boolean> {
  const [{ data: invoice, error: invoiceError }, { data: customer, error: customerError }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("invoice_number, total_amount, due_date")
        .eq("id", invoiceId)
        .eq("company_id", contract.company_id)
        .single(),
      supabase
        .from("customers")
        .select("first_name, last_name, phone")
        .eq("id", contract.customer_id)
        .eq("company_id", contract.company_id)
        .single(),
    ]);

  if (invoiceError || customerError || !customer?.phone || !invoice) {
    if (invoiceError || customerError) {
      console.warn("Invoice notification lookup failed", invoiceError || customerError);
    }
    return !invoiceError && !customerError;
  }

  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  const message = [
    `مرحباً ${customerName}،`,
    "",
    "تم إصدار فاتورة الإيجار الشهرية:",
    `رقم الفاتورة: ${invoice.invoice_number}`,
    `المبلغ: ${invoice.total_amount} ريال`,
    `تاريخ الاستحقاق: ${invoice.due_date || "-"}`,
  ].join("\n");

  const { data, error } = await supabase.functions.invoke("send-whatsapp-reminders", {
    body: { test: true, phone: customer.phone, message },
  });

  if (error || data?.success !== true) {
    console.warn(
      `Invoice ${invoice.invoice_number} was created but notification failed`,
      error || data?.error || "Provider did not confirm delivery",
    );
    return false;
  }

  return true;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
