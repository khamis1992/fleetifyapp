/**
 * Nightly Operations Auditor
 *
 * Cross-checks contracts x invoices x payments x schedules every night and
 * opens a task ONLY when a real discrepancy exists (deduplicated per finding
 * per day). Findings that qualify as safe repairs are left for the
 * safe-auto-repair agent; everything else becomes a human task.
 *
 * Body: { companyId }
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  agentCorsHeaders,
  AgentInvocationContext,
  authorizeScheduledAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  storeAgentReview,
} from "../_shared/agent.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  let invocation: AgentInvocationContext | null = null;
  let executionFailed = false;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.companyId) throw new Error("companyId is required");
    invocation = await authorizeScheduledAgent(req, "nightly-ops-auditor", body.companyId);

    const supabase = createServiceClient();
    const findings = await collectFindings(supabase, body.companyId);

    let tasksCreated = 0;
    for (const finding of findings) {
      const created = await openFindingTask(supabase, body.companyId, finding);
      if (created) tasksCreated++;
    }

    await storeAgentReview(supabase, {
      companyId: body.companyId,
      agentType: "ops_audit",
      entityType: "companies",
      entityId: body.companyId,
      verdict: findings.length === 0 ? "clean" : "findings",
      summary: findings.length === 0
        ? "التدقيق الليلي: لا فروقات حقيقية"
        : `التدقيق الليلي: ${findings.length} ملاحظة، فُتحت ${tasksCreated} مهمة`,
      details: { findings: findings.slice(0, 20), tasks_created: tasksCreated },
    });

    return jsonResponse({ success: true, findings: findings.length, tasksCreated });
  } catch (error) {
    executionFailed = true;
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  } finally {
    if (invocation) {
      await finishAgentExecution(
        createServiceClient(), invocation, !executionFailed, {},
        executionFailed ? "nightly_ops_audit_failed" : null,
      ).catch(() => undefined);
    }
  }
});

interface Finding {
  key: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  safeRepairType?: string;
  entityId?: string;
  entityType?: string;
}

async function collectFindings(supabase: SupabaseClient, companyId: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1) Legal cases whose claim drifts from invoice balances + late fees.
  const { data: cases } = await supabase
    .from("legal_cases")
    .select("id, case_number, case_value, contract_id, contracts(late_fine_amount)")
    .eq("company_id", companyId)
    .in("case_status", ["open", "active", "pending", "under_review"]);
  for (const legalCase of cases || []) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("balance_due, status")
      .eq("company_id", companyId)
      .eq("contract_id", legalCase.contract_id);
    const balance = (invoices || [])
      .filter((i) => !["cancelled", "canceled", "void", "voided", "deleted"].includes(String(i.status || "").toLowerCase()))
      .reduce((sum, i) => sum + Math.max(Number(i.balance_due || 0), 0), 0);
    const expected = balance + Number((legalCase.contracts as any)?.late_fine_amount || 0);
    const claim = Number(legalCase.case_value || 0);
    if (expected > 0 && Math.abs(claim - expected) > Math.max(expected * 0.05, 50)) {
      findings.push({
        key: `legal-claim-drift:${legalCase.id}`,
        title: `فارق مبلغ المطالبة في القضية ${legalCase.case_number}`,
        description: `مبلغ المطالبة ${claim} يختلف عن رصيد الفواتير + الغرامات ${expected}. راجع قبل أي إجراء قضائي.`,
        priority: "urgent",
        entityId: legalCase.id,
        entityType: "legal_cases",
      });
    }
  }

  // 2) Active contracts missing monthly rent.
  const { data: rentless } = await supabase
    .from("contracts")
    .select("id, contract_number")
    .eq("company_id", companyId)
    .eq("status", "active")
    .or("monthly_amount.is.null,monthly_amount.eq.0");
  for (const contract of rentless || []) {
    findings.push({
      key: `missing-rent:${contract.id}`,
      title: `عقد نشط بلا إيجار شهري: ${contract.contract_number}`,
      description: "العقد نشط لكن قيمة الإيجار الشهري صفرية أو فارغة. راجع مستند العقد أو حدّث القيمة.",
      priority: "high",
      entityId: contract.id,
      entityType: "contracts",
    });
  }

  // 3) Invoice balance drift (total - paid != balance_due) — safe-repair candidate.
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_amount, paid_amount, balance_due, status")
    .eq("company_id", companyId)
    .not("status", "in", '("cancelled","canceled","void","voided","deleted")')
    .order("updated_at", { ascending: false })
    .limit(400);
  for (const invoice of invoices || []) {
    const expected = Math.max(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0), 0);
    if (Math.abs(Number(invoice.balance_due || 0) - expected) > 0.02) {
      findings.push({
        key: `invoice-drift:${invoice.id}`,
        title: `رصيد غير متسق للفاتورة ${invoice.invoice_number}`,
        description: `المتبقي المسجل ${invoice.balance_due} بينما الإجمالي - المدفوع = ${expected}. مرشحة للإصلاح الذاتي الآمن.`,
        priority: "medium",
        safeRepairType: "invoice_balance_drift",
        entityId: invoice.id,
        entityType: "invoices",
      });
    }
  }

  // 4) Completed payments linked to nothing.
  const { data: orphanPayments } = await supabase
    .from("payments")
    .select("id, payment_number, amount")
    .eq("company_id", companyId)
    .eq("payment_status", "completed")
    .is("invoice_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  for (const payment of orphanPayments || []) {
    const { count } = await supabase
      .from("payment_allocations")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", payment.id)
      .eq("is_active", true);
    if ((count || 0) === 0) {
      findings.push({
        key: `orphan-payment:${payment.id}`,
        title: `دفعة مكتملة بلا ربط: ${payment.payment_number || payment.id}`,
        description: `دفعة بقيمة ${payment.amount} مكتملة لكنها غير مرتبطة بفاتورة أو تخصيص. راجع التخصيص.`,
        priority: "high",
        entityId: payment.id,
        entityType: "payments",
      });
    }
  }

  // 5) Schedule total vs contract amount mismatch (rent conflict).
  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, contract_number, contract_amount, monthly_amount")
    .eq("company_id", companyId)
    .eq("status", "active")
    .gt("monthly_amount", 0);
  for (const contract of contracts || []) {
    const { data: schedules } = await supabase
      .from("contract_payment_schedules")
      .select("amount, status")
      .eq("company_id", companyId)
      .eq("contract_id", contract.id);
    const activeSchedules = (schedules || []).filter((s) =>
      !["cancelled", "canceled", "deleted"].includes(String(s.status || "").toLowerCase())
    );
    if (activeSchedules.length === 0) continue;
    const scheduleTotal = activeSchedules.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const contractAmount = Number(contract.contract_amount || 0);
    if (contractAmount > 0 && Math.abs(scheduleTotal - contractAmount) > Math.max(contractAmount * 0.03, 100)) {
      findings.push({
        key: `schedule-mismatch:${contract.id}`,
        title: `جدول سداد لا يطابق قيمة العقد ${contract.contract_number}`,
        description: `إجمالي الجدول ${scheduleTotal.toFixed(2)} مقابل قيمة العقد ${contractAmount}. راجع الإيجار والجدول.`,
        priority: "high",
        entityId: contract.id,
        entityType: "contracts",
      });
    }
  }

  return findings;
}

async function openFindingTask(
  supabase: SupabaseClient,
  companyId: string,
  finding: Finding,
): Promise<boolean> {
  // One open task per finding — re-open only after the previous one is closed.
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("metadata->>finding_key", finding.key)
    .in("status", ["pending", "in_progress"]);
  if ((count || 0) > 0) return false;

  const { data: manager } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["manager", "company_admin", "admin"])
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("tasks").insert({
    company_id: companyId,
    title: finding.title,
    description: finding.description,
    status: "pending",
    priority: finding.priority,
    assigned_to: manager?.id || null,
    created_by: manager?.id || null,
    metadata: { finding_key: finding.key, source: "nightly-ops-auditor", safe_repair_type: finding.safeRepairType || null },
  });
  if (error) {
    console.error("Failed to open finding task:", error);
    return false;
  }
  return true;
}
