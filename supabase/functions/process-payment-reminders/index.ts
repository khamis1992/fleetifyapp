import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getOverdueReminderType } from "./reminder-cadence.ts";
import { formatArabicInvoiceMonthLabel } from "../_shared/invoice-label.ts";
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

const ACTIVE_INVOICE_STATUSES = [
  "approved",
  "sent",
  "overdue",
  "pending",
  "unpaid",
];
const COLLECTIBLE_PAYMENT_STATUSES = [
  "unpaid",
  "partial",
  "partial_paid",
  "partially_paid",
];
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 200;
type SupabaseClient = ReturnType<typeof createClient>;

type PaymentReminderRequest = {
  companyId?: string;
  upcomingAfterInvoiceId?: string;
  overdueAfterInvoiceId?: string;
  processUpcoming?: boolean;
  processOverdue?: boolean;
  batchSize?: number;
};

type ReminderInvoice = {
  id: string;
  company_id: string;
  invoice_number: string | null;
  due_date: string | null;
  total_amount: number | null;
  balance_due: number | null;
  customers: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
};

type ReminderResults = {
  upcoming_invoices_found: number;
  overdue_invoices_found: number;
  reminders_sent: number;
  overdue_notices_sent: number;
  late_fee_candidates: number;
  skipped_no_phone: number;
  skipped_zero_balance: number;
  skipped_cadence: number;
  skipped_already_claimed: number;
  errors: string[];
};

type ReminderBatch = {
  invoices: ReminderInvoice[];
  hasMore: boolean;
  nextAfterInvoiceId: string | null;
};

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
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
    const body = await readJson<PaymentReminderRequest>(req);
    if (typeof body.companyId !== "string" || !body.companyId) {
      throw new HttpError("companyId is required", 400);
    }
    invocation = await authorizeScheduledAgent(
      req,
      "payment-reminder-agent",
      body.companyId,
    );
    const batchSize = parseBatchSize(body.batchSize);
    const processUpcoming = parseProcessFlag(body.processUpcoming, "processUpcoming");
    const processOverdue = parseProcessFlag(body.processOverdue, "processOverdue");
    const upcomingAfterInvoiceId = parseCursor(
      body.upcomingAfterInvoiceId,
      "upcomingAfterInvoiceId",
    );
    const overdueAfterInvoiceId = parseCursor(
      body.overdueAfterInvoiceId,
      "overdueAfterInvoiceId",
    );

    const today = getQatarDateOnly(new Date());
    const threeDaysDate = addCalendarDays(today, 3);
    const results: ReminderResults = {
      upcoming_invoices_found: 0,
      overdue_invoices_found: 0,
      reminders_sent: 0,
      overdue_notices_sent: 0,
      late_fee_candidates: 0,
      skipped_no_phone: 0,
      skipped_zero_balance: 0,
      skipped_cadence: 0,
      skipped_already_claimed: 0,
      errors: [],
    };

    let upcomingBatch: ReminderBatch = emptyReminderBatch();
    if (processUpcoming) {
      try {
        upcomingBatch = await loadReminderInvoiceBatch(
          supabaseClient,
          body.companyId,
          "eq",
          threeDaysDate,
          upcomingAfterInvoiceId,
          batchSize,
        );
        results.upcoming_invoices_found = upcomingBatch.invoices.length;
      } catch (error) {
        results.errors.push(`upcoming_query: ${errorMessage(error)}`);
      }
    }

    let overdueBatch: ReminderBatch = emptyReminderBatch();
    if (processOverdue) {
      try {
        overdueBatch = await loadReminderInvoiceBatch(
          supabaseClient,
          body.companyId,
          "lt",
          today,
          overdueAfterInvoiceId,
          batchSize,
        );
        results.overdue_invoices_found = overdueBatch.invoices.length;
      } catch (error) {
        results.errors.push(`overdue_query: ${errorMessage(error)}`);
      }
    }

    for (const invoice of upcomingBatch.invoices) {
      const outstandingAmount = getOutstandingAmount(invoice);
      if (outstandingAmount <= 0.01) {
        results.skipped_zero_balance += 1;
        continue;
      }

      const customer = invoice.customers;
      if (!customer?.phone) {
        results.skipped_no_phone += 1;
        continue;
      }

      try {
        const customerName = formatCustomerName(customer);
        const sent = await sendClaimedReminder(
          supabaseClient,
          invoice,
          "pre_due_3d",
          today,
          customer.phone,
          [
            "تذكير بالدفع 📢",
            "",
            `عزيزي ${customerName}،`,
            "",
            "لديك فاتورة مستحقة خلال 3 أيام:",
            formatArabicInvoiceMonthLabel(invoice.due_date),
            `المبلغ المستحق: ${outstandingAmount.toFixed(2)} ريال`,
            `تاريخ الاستحقاق: ${invoice.due_date || "-"}`,
            "",
            "يرجى السداد قبل تاريخ الاستحقاق. شكراً لتعاونكم.",
          ].join("\n"),
        );
        if (!sent) {
          results.skipped_already_claimed += 1;
          continue;
        }
        results.reminders_sent += 1;
      } catch (error) {
        results.errors.push(
          `reminder ${invoice.invoice_number || invoice.id}: ${errorMessage(error)}`,
        );
      }
    }

    for (const invoice of overdueBatch.invoices) {
      const outstandingAmount = getOutstandingAmount(invoice);
      if (outstandingAmount <= 0.01) {
        results.skipped_zero_balance += 1;
        continue;
      }

      // This endpoint is deliberately reminders-only. Candidates are reported
      // for the canonical accounting workflow; no fee or document is written.
      results.late_fee_candidates += 1;

      const customer = invoice.customers;
      if (!customer?.phone) {
        results.skipped_no_phone += 1;
        continue;
      }

      try {
        const customerName = formatCustomerName(customer);
        const daysOverdue = getDaysBetween(invoice.due_date, today);
        const reminderType = getOverdueReminderType(daysOverdue);
        if (!reminderType) {
          results.skipped_cadence += 1;
          continue;
        }
        const sent = await sendClaimedReminder(
          supabaseClient,
          invoice,
          reminderType,
          today,
          customer.phone,
          [
            "تنبيه: فاتورة متأخرة ⚠️",
            "",
            `عزيزي ${customerName}،`,
            "",
            "لديك فاتورة متأخرة عن السداد:",
            formatArabicInvoiceMonthLabel(invoice.due_date),
            `المبلغ المستحق: ${outstandingAmount.toFixed(2)} ريال`,
            `عدد أيام التأخير: ${daysOverdue} يوم`,
            "",
            "يرجى السداد أو التواصل معنا لمراجعة الحساب.",
          ].join("\n"),
        );
        if (!sent) {
          results.skipped_already_claimed += 1;
          continue;
        }
        results.overdue_notices_sent += 1;
      } catch (error) {
        results.errors.push(
          `overdue ${invoice.invoice_number || invoice.id}: ${errorMessage(error)}`,
        );
      }
    }

    const hasErrors = results.errors.length > 0;
    executionSummary = {
      remindersSent: results.reminders_sent,
      overdueNoticesSent: results.overdue_notices_sent,
      errors: results.errors.length,
    };
    return jsonResponse({
      success: !hasErrors,
      message: hasErrors
        ? "Payment reminders completed with partial errors"
        : "Payment reminders processed successfully",
      results,
      continuation: {
        batchSize,
        upcoming: {
          hasMore: upcomingBatch.hasMore,
          afterInvoiceId: upcomingBatch.nextAfterInvoiceId,
        },
        overdue: {
          hasMore: overdueBatch.hasMore,
          afterInvoiceId: overdueBatch.nextAfterInvoiceId,
        },
      },
    }, hasErrors ? 207 : 200);
  } catch (error) {
    executionFailed = true;
    const status = error instanceof HttpError ? error.status : 500;
    console.error("process-payment-reminders failed", error);
    return jsonResponse({ success: false, error: errorMessage(error) }, status);
  } finally {
    if (invocation) {
      try {
        await finishAgentExecution(
          supabaseClient,
          invocation,
          !executionFailed,
          executionSummary,
          executionFailed ? "PAYMENT_REMINDER_FAILURE" : null,
        );
      } catch (finishError) {
        console.error("Could not close payment reminder execution", finishError);
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

async function loadReminderInvoiceBatch(
  supabase: SupabaseClient,
  companyId: string,
  dueOperator: "eq" | "lt",
  dueDate: string,
  afterInvoiceId: string | null,
  batchSize: number,
): Promise<ReminderBatch> {
  let query = supabase
    .from("invoices")
    .select(`
      id,
      company_id,
      invoice_number,
      due_date,
      total_amount,
      balance_due,
      customers (first_name, last_name, phone)
    `)
    .in("payment_status", COLLECTIBLE_PAYMENT_STATUSES)
    .in("status", ACTIVE_INVOICE_STATUSES)
    .eq("company_id", companyId)
    .order("id", { ascending: true })
    .limit(batchSize + 1);

  query = dueOperator === "eq"
    ? query.eq("due_date", dueDate)
    : query.lt("due_date", dueDate);
  if (afterInvoiceId) query = query.gt("id", afterInvoiceId);

  const { data, error } = await query;
  if (error) throw error;

  const page = (data || []) as ReminderInvoice[];
  const hasMore = page.length > batchSize;
  const invoices = page.slice(0, batchSize);
  const nextAfterInvoiceId = hasMore
    ? invoices[invoices.length - 1]?.id || null
    : null;

  if (hasMore && !nextAfterInvoiceId) {
    throw new Error("Invoice reminder continuation cursor did not advance");
  }

  return { invoices, hasMore, nextAfterInvoiceId };
}

function emptyReminderBatch(): ReminderBatch {
  return { invoices: [], hasMore: false, nextAfterInvoiceId: null };
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

function parseProcessFlag(value: unknown, field: string): boolean {
  if (value === undefined) return true;
  if (typeof value !== "boolean") {
    throw new HttpError(`${field} must be a boolean`, 400);
  }
  return value;
}

function parseCursor(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 128) {
    throw new HttpError(`${field} must be a valid cursor`, 400);
  }
  return value;
}

async function sendWhatsAppReminder(
  supabase: SupabaseClient,
  phone: string,
  message: string,
) {
  const { data, error } = await supabase.functions.invoke("send-whatsapp-reminders", {
    body: { test: true, phone, message },
  });

  if (error) throw error;
  if (data?.success !== true) {
    throw new Error(
      data?.error || "WhatsApp reminder provider did not confirm delivery",
    );
  }
}

async function sendClaimedReminder(
  supabase: SupabaseClient,
  invoice: ReminderInvoice,
  reminderType: string,
  cadenceDate: string,
  phone: string,
  message: string,
): Promise<boolean> {
  const { data: claimedId, error: claimError } = await supabase.rpc(
    "claim_automated_invoice_reminder_delivery",
    {
      p_company_id: invoice.company_id,
      p_invoice_id: invoice.id,
      p_reminder_type: reminderType,
      p_cadence_date: cadenceDate,
    },
  );
  if (claimError) throw claimError;
  if (typeof claimedId !== "string" || !claimedId) return false;

  try {
    await sendWhatsAppReminder(supabase, phone, message);
  } catch (error) {
    try {
      await completeReminderDelivery(
        supabase,
        claimedId,
        false,
        errorMessage(error),
      );
    } catch (completionError) {
      throw new Error(
        `${errorMessage(error)}; delivery logging failed: ${errorMessage(completionError)}`,
      );
    }
    throw error;
  }

  // Delivery has been confirmed by the provider. A ledger-completion error
  // must never be converted to `failed`, because that would make the claim
  // retryable and could send the customer the same message again.
  try {
    await completeReminderDelivery(supabase, claimedId, true, null);
  } catch (completionError) {
    throw new Error(
      `WhatsApp delivery was confirmed, but the idempotency ledger could not be marked sent: ${errorMessage(completionError)}`,
    );
  }
  return true;
}

async function completeReminderDelivery(
  supabase: SupabaseClient,
  deliveryId: string,
  success: boolean,
  error: string | null,
) {
  const { error: completionError } = await supabase.rpc(
    "complete_automated_invoice_reminder_delivery",
    {
      p_delivery_id: deliveryId,
      p_success: success,
      p_error: error,
    },
  );
  if (completionError) throw completionError;
}

function getOutstandingAmount(invoice: ReminderInvoice): number {
  const value = invoice.balance_due == null
    ? Number(invoice.total_amount || 0)
    : Number(invoice.balance_due);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatCustomerName(customer: ReminderInvoice["customers"]): string {
  return [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "العميل";
}

function getQatarDateOnly(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Qatar",
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Could not resolve Qatar calendar date");
  return `${year}-${month}-${day}`;
}

function addCalendarDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function getDaysBetween(fromDate: string | null, toDate: string): number {
  if (!fromDate) return 0;
  const from = Date.parse(`${fromDate.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

function errorMessage(error: unknown): string {
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
