/**
 * Daily Closeout AI Reviewer (Kimi K3)
 *
 * Compares an employee's daily closeout claims with the activity the system
 * actually recorded that day (payments, calls/communications, notes), then
 * asks Kimi to assess consistency and flag discrepancies for the manager.
 *
 * Body: { logId } | { companyId, date?, limit? }
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callKimiJson, KIMI_MODEL } from "../_shared/kimi.ts";
import {
  agentCorsHeaders,
  authorizeAgent,
  createServiceClient,
  jsonResponse,
  storeAgentReview,
} from "../_shared/agent.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  try {
    await authorizeAgent(req);
    const body = await req.json().catch(() => ({}));
    const supabase = createServiceClient();

    if (body.logId) {
      const result = await reviewLog(supabase, body.logId);
      return jsonResponse({ success: true, ...result });
    }

    if (!body.companyId) throw new Error("companyId is required");
    let query = supabase
      .from("employee_daily_workspace_logs")
      .select("id")
      .eq("company_id", body.companyId)
      .order("log_date", { ascending: false })
      .limit(Math.min(Number(body.limit) || 10, 20));
    if (body.date) query = query.eq("log_date", body.date);
    const { data: logs, error } = await query;
    if (error) throw error;

    const summary = { reviewed: 0, consistent: 0, discrepancy: 0, errors: 0 };
    for (const log of logs || []) {
      try {
        const result = await reviewLog(supabase, log.id);
        summary.reviewed++;
        if (result.verdict === "consistent") summary.consistent++;
        else summary.discrepancy++;
      } catch (logError) {
        summary.errors++;
        console.error(`Closeout review failed for ${log.id}:`, logError);
      }
    }
    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

async function reviewLog(supabase: SupabaseClient, logId: string) {
  const { data: log, error } = await supabase
    .from("employee_daily_workspace_logs")
    .select("*")
    .eq("id", logId)
    .single();
  if (error || !log) throw new Error("Daily log not found");

  // Actual recorded activity for that employee on that date.
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("company_id", log.company_id)
    .eq("payment_date", log.log_date)
    .eq("payment_status", "completed");

  const summary = (log.summary || {}) as Record<string, any>;

  const { data: communications, error: communicationsError } = await supabase
    .from("customer_communications")
    .select("id, communication_type")
    .eq("company_id", log.company_id)
    .eq("communication_date", log.log_date);
  if (communicationsError) {
    console.warn("customer_communications unavailable:", communicationsError.message);
  }

  const actualCollected = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const actualCalls = (communicationsError ? [] : communications || []).filter((c) =>
    String(c.communication_type || "").includes("call")
  ).length;

  const claimedCollected = Number(summary.total_collected || 0);
  const claimedCalls = Number(summary.calls_logged || 0);
  const claimedPayments = Number(summary.payments_registered || 0);
  const claimedFollowups = Number(summary.followups_scheduled || 0);
  const claimedCompletedTasks = Number(summary.completed_tasks || 0);

  const deterministicFlags: string[] = [];
  if (claimedCollected > 0 && actualCollected === 0) {
    deterministicFlags.push(`أبلغ عن تحصيل ${claimedCollected} ولا توجد دفعات مسجلة في النظام لهذا اليوم`);
  }
  if (claimedCollected > 0 && actualCollected > 0 &&
    Math.abs(claimedCollected - actualCollected) / Math.max(claimedCollected, actualCollected) > 0.5) {
    deterministicFlags.push(`فرق تحصيل كبير: الإبلاغ ${claimedCollected} مقابل المسجل ${actualCollected}`);
  }
  if (claimedCalls > 0 && actualCalls === 0) {
    deterministicFlags.push(`أبلغ عن ${claimedCalls} مكالمة ولا يوجد سجل مكالمات لهذا اليوم`);
  }

  const ai = await callKimiJson<{
    verdict: "consistent" | "discrepancy" | "needs_review";
    confidence: number;
    summary: string;
    flags: string[];
  }>([
    {
      role: "system",
      content:
        "أنت مراجع إقفالات يومية لموظفي تحصيل في شركة تأجير سيارات. قارن ما أبلغ عنه الموظف مع نشاط النظام الفعلي. أجب JSON فقط: verdict (consistent|discrepancy|needs_review)، confidence (0-1)، summary (جملة عربية للمدير)، flags (مصفوفة فروقات قصيرة). كن منصفاً: نشاط النظام قد لا يلتقط كل شيء، فلا تعتبر كل فرق تلاعباً.",
    },
    {
      role: "user",
      content: [
        `إقفال يوم ${log.log_date} — الحالة: ${log.completion_status || "-"}`,
        `إبلاغ الموظف: مكالمات ${claimedCalls}، دفعات مسجلة ${claimedPayments}، محصل ${claimedCollected}، متابعات ${claimedFollowups}، مهام مكتملة ${claimedCompletedTasks}.`,
        `نشاط النظام: مكالمات مسجلة ${actualCalls}، محصل فعلي ${actualCollected}.`,
        `ملاحظات الموظف: ${log.key_cases || "-"} / ${log.blockers || "-"}`,
        deterministicFlags.length > 0 ? `فحص آلي رصد: ${deterministicFlags.join("؛ ")}` : "الفحص الآلي لم يرصد فروقات صارخة.",
      ].join("\n"),
    },
  ]);

  const verdict = deterministicFlags.length > 0
    ? "discrepancy"
    : ai?.verdict === "consistent" || ai?.verdict === "discrepancy" || ai?.verdict === "needs_review"
    ? ai.verdict
    : "needs_review";

  const result = {
    verdict,
    confidence: Math.min(Math.max(Number(ai?.confidence) || 0.5, 0), 1),
    summary: ai?.summary?.substring(0, 400) ||
      (deterministicFlags.length > 0 ? deterministicFlags[0] : "الإقفال متسق مع نشاط النظام"),
    details: {
      deterministic_flags: deterministicFlags,
      ai_flags: Array.isArray(ai?.flags) ? ai.flags.slice(0, 6) : [],
      claimed: { calls: claimedCalls, payments: claimedPayments, collected: claimedCollected },
      actual: { calls: actualCalls, collected: actualCollected },
    },
  };

  await storeAgentReview(supabase, {
    companyId: log.company_id,
    agentType: "daily_closeout",
    entityType: "employee_daily_workspace_logs",
    entityId: log.id,
    verdict: result.verdict,
    confidence: result.confidence,
    summary: result.summary,
    details: result.details,
    model: KIMI_MODEL,
  });
  return result;
}
