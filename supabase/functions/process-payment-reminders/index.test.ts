import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/process-payment-reminders/index.ts"),
  "utf8",
);
const sharedAgent = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/agent.ts"),
  "utf8",
);
const automatedWorkflows = readFileSync(
  resolve(process.cwd(), "docs/AUTOMATED_WORKFLOWS_SETUP.md"),
  "utf8",
);
const githubActions = readFileSync(
  resolve(process.cwd(), "docs/GITHUB_ACTIONS_SETUP.md"),
  "utf8",
);
const supabaseConfig = readFileSync(
  resolve(process.cwd(), "supabase/config.toml"),
  "utf8",
);

describe("process-payment-reminders safety", () => {
  it("accepts only governed per-agent POST automation requests", () => {
    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('authorizeScheduledAgent');
    expect(source).toContain('"payment-reminder-agent"');
    expect(source).toContain('companyId is required');
    expect(sharedAgent).toContain('req.headers.get("x-agent-secret")');
    expect(sharedAgent).toContain('req.headers.get("x-agent-id")');
    expect(source).toContain('finishAgentExecution');
    expect(source).not.toContain('PAYMENT_REMINDERS_SECRET');
    expect(source).not.toContain('INVOICE_GENERATOR_SECRET');
    expect(source).not.toContain("SUPABASE_ANON_KEY");
    expect(supabaseConfig).toMatch(
      /\[functions\.process-payment-reminders\]\s*verify_jwt\s*=\s*false/,
    );
  });

  it("selects collectible active invoices in one bounded keyset batch", () => {
    expect(source).toContain('.in("payment_status", COLLECTIBLE_PAYMENT_STATUSES)');
    expect(source).toMatch(
      /COLLECTIBLE_PAYMENT_STATUSES\s*=\s*\[[\s\S]*"unpaid"[\s\S]*"partial"[\s\S]*"partial_paid"[\s\S]*"partially_paid"[\s\S]*\]/,
    );
    expect(source).toContain('.in("status", ACTIVE_INVOICE_STATUSES)');
    expect(source).toMatch(
      /ACTIVE_INVOICE_STATUSES\s*=\s*\[[\s\S]*"approved"[\s\S]*"sent"[\s\S]*"overdue"[\s\S]*"pending"[\s\S]*"unpaid"[\s\S]*\]/,
    );
    expect(source).not.toContain('.eq("status", "unpaid")');
    expect(source).toContain('if (error) throw error;');
    expect(source).toContain('.order("id", { ascending: true })');
    expect(source).toContain('.limit(batchSize + 1)');
    expect(source).toContain('query.gt("id", afterInvoiceId)');
    expect(source).toContain('page.slice(0, batchSize)');
    expect(source).toContain("Invoice reminder continuation cursor did not advance");
    expect(source).not.toContain('while (true)');
  });

  it("returns independent continuation cursors for upcoming and overdue streams", () => {
    expect(source).toContain('upcomingAfterInvoiceId?: string');
    expect(source).toContain('overdueAfterInvoiceId?: string');
    expect(source).toContain('processUpcoming?: boolean');
    expect(source).toContain('processOverdue?: boolean');
    expect(source).toContain('upcoming: {');
    expect(source).toContain('overdue: {');
    expect(source).toContain('afterInvoiceId: upcomingBatch.nextAfterInvoiceId');
    expect(source).toContain('afterInvoiceId: overdueBatch.nextAfterInvoiceId');
    expect(source).toContain('MAX_BATCH_SIZE = 200');
  });

  it("checks WhatsApp failures and reports partial execution as HTTP 207", () => {
    expect(source).toContain('functions.invoke("send-whatsapp-reminders"');
    expect(source).toContain("if (data?.success !== true)");
    expect(source).toContain("const hasErrors = results.errors.length > 0");
    expect(source).toContain("success: !hasErrors");
    expect(source).toContain("hasErrors ? 207 : 200");
  });

  it("uses a short Arabic invoice-month label in customer messages", () => {
    expect(source).toContain('formatArabicInvoiceMonthLabel(invoice.due_date)');
    expect(source).not.toContain('`رقم الفاتورة: ${invoice.invoice_number || "-"}`');
  });

  it("claims a bounded cadence stage before sending to prevent duplicate messages", () => {
    expect(source).toContain('getOverdueReminderType(daysOverdue)');
    expect(source).toContain('"pre_due_3d"');
    expect(source).toContain('claim_automated_invoice_reminder_delivery');
    expect(source).toContain('complete_automated_invoice_reminder_delivery');
    expect(source).toContain('body: { test: true, phone, message }');
    expect(source).toContain("Delivery has been confirmed by the provider");
    expect(source).toContain("must never be converted to `failed`");
  });

  it("is reminders-only and never mutates accounting documents or late fees", () => {
    expect(source).toContain("late_fee_candidates");
    expect(source).not.toContain('.from("late_fees")');
    expect(source).not.toContain('.from("late_fee_rules")');
    expect(source).not.toContain(".update(");
    expect(source).not.toContain(".insert(");
    expect(source).not.toContain("late_fees_applied");
  });

  it("marks legacy external-secret workflow examples as retired", () => {
    for (const document of [automatedWorkflows, githubActions]) {
      expect(document).toContain("20260828113000_agent_failure_containment_and_escalation");
      expect(document).toContain("لا تستخدم أمثلة الأسرار المشتركة");
    }

    expect(automatedWorkflows).not.toContain("Bearer YOUR_ANON_KEY");
    expect(automatedWorkflows).toContain("process-payment-reminders --no-verify-jwt");
  });
});
