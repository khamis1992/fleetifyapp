/**
 * Journal Entry AI Reviewer (Kimi K3)
 *
 * Pre/posting gate for journal entries:
 *   1) Deterministic checks first: balanced debits/credits, at least two
 *      lines, every account is postable (non-header, level >= 3).
 *   2) Kimi reviews the entry for anomalies: unusual amounts, atypical
 *      account usage, missing descriptions, and explains the entry's impact.
 * The verdict is stored in ai_agent_reviews (agent_type = journal_entry).
 *
 * Modes:
 *   - { journalEntryId }            — review one entry
 *   - { companyId, limit?, status? } — review recent unreviewed entries
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callKimiJson, KIMI_MODEL } from "../_shared/kimi.ts";
import {
  agentCorsHeaders,
  authorizeGovernedAgent,
  createServiceClient,
  finishAgentExecution,
  jsonResponse,
  storeAgentReview,
  type AgentInvocationContext,
} from "../_shared/agent.ts";

interface JournalLine {
  account_id: string;
  debit_amount: number | null;
  credit_amount: number | null;
  line_description: string | null;
}

interface ReviewResult {
  verdict: "balanced_pass" | "warning" | "fail";
  confidence: number;
  summary: string;
  details: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  let invocation: AgentInvocationContext | null = null;
  const supabase = createServiceClient();
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.companyId) throw new Error("companyId is required");
    invocation = await authorizeGovernedAgent(req, "journal-entry-ai-reviewer", body.companyId);

    if (body.journalEntryId) {
      const result = await reviewEntry(supabase, body.companyId, body.journalEntryId);
      await finishAgentExecution(supabase, invocation, true, { reviewed: 1, verdict: result.verdict });
      return jsonResponse({ success: true, ...result });
    }

    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("company_id", body.companyId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(body.limit) || 10, 25));
    if (error) throw error;

    const summary = { reviewed: 0, passed: 0, warnings: 0, failed: 0, errors: 0 };
    for (const entry of entries || []) {
      try {
        const result = await reviewEntry(supabase, body.companyId, entry.id);
        summary.reviewed++;
        if (result.verdict === "balanced_pass") summary.passed++;
        else if (result.verdict === "warning") summary.warnings++;
        else summary.failed++;
      } catch (entryError) {
        summary.errors++;
        console.error(`Journal review failed for ${entry.id}:`, entryError);
      }
    }
    await finishAgentExecution(supabase, invocation, true, summary);
    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (invocation) {
      await finishAgentExecution(supabase, invocation, false, {}, "journal_review_failed")
        .catch(() => undefined);
    }
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

async function reviewEntry(
  supabase: SupabaseClient,
  companyId: string,
  journalEntryId: string,
): Promise<ReviewResult> {
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select("id, company_id, entry_number, entry_date, description, status, total_debit, total_credit")
    .eq("id", journalEntryId)
    .eq("company_id", companyId)
    .single();
  if (error || !entry) throw new Error("Journal entry not found");

  const { data: lines, error: linesError } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit_amount, credit_amount, line_description")
    .eq("journal_entry_id", journalEntryId);
  if (linesError) throw linesError;
  const entryLines = (lines || []) as JournalLine[];

  // --- Deterministic gate ---
  const totalDebit = entryLines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0);
  const totalCredit = entryLines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0);
  const deterministicIssues: string[] = [];

  if (entryLines.length < 2) deterministicIssues.push("القيد يحتوي أقل من سطرين");
  if (Math.abs(totalDebit - totalCredit) > 0.005) {
    deterministicIssues.push(`القيد غير متوازن: مدين ${totalDebit} مقابل دائن ${totalCredit}`);
  }
  if (totalDebit <= 0) deterministicIssues.push("لا توجد مبالغ مدينة في القيد");

  const accountIds = [...new Set(entryLines.map((line) => line.account_id))];
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_code, account_name, is_header, account_level")
    .eq("company_id", entry.company_id)
    .in("id", accountIds);
  const accountMap = new Map((accounts || []).map((a) => [a.id, a]));
  for (const line of entryLines) {
    const account = accountMap.get(line.account_id);
    if (!account) {
      deterministicIssues.push("سطر بحساب غير موجود في شجرة الحسابات");
      break;
    }
    if (account.is_header || Number(account.account_level || 0) < 3) {
      deterministicIssues.push(`الحساب ${account.account_code} حساب رئيسي غير قابل للترحيل`);
    }
  }

  if (deterministicIssues.length > 0) {
    const result: ReviewResult = {
      verdict: "fail",
      confidence: 0.99,
      summary: `قيد ${entry.entry_number}: ${deterministicIssues[0]}`,
      details: { deterministic_issues: deterministicIssues, total_debit: totalDebit, total_credit: totalCredit },
    };
    await storeAgentReview(supabase, {
      companyId: entry.company_id,
      agentType: "journal_entry",
      entityType: "journal_entries",
      entityId: entry.id,
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary,
      details: result.details,
      model: "deterministic",
    });
    return result;
  }

  // --- Model layer: anomaly review ---
  const linesText = entryLines.map((line) => {
    const account = accountMap.get(line.account_id);
    return `- ${account?.account_name || line.account_id} (${account?.account_code || "-"}): مدين ${line.debit_amount || 0} / دائن ${line.credit_amount || 0}${line.line_description ? ` — ${line.line_description}` : ""}`;
  }).join("\n");

  const ai = await callKimiJson<{
    verdict: "pass" | "warning" | "fail";
    confidence: number;
    summary: string;
    impact: string;
    issues: string[];
  }>([
    {
      role: "system",
      content:
        "أنت مدقق قيود محاسبية في شركة تأجير سيارات قطرية. القيد متوازن شكلياً بالفعل. راجع المنطقية: مبالغ غير معتادة، حسابات غير مناسبة للوصف، وصف ناقص، أو أثر غير متوقع على الدخل/النقد/الذمم. أجب JSON فقط: verdict (pass|warning|fail)، confidence (0-1)، summary (جملة عربية)، impact (جملة قصيرة عن أثر القيد)، issues (مصفوفة قصيرة).",
    },
    {
      role: "user",
      content: `قيد ${entry.entry_number} بتاريخ ${entry.entry_date} — الحالة: ${entry.status}\nالوصف: ${entry.description || "(بلا وصف)"}\nالسطور:\n${linesText}`,
    },
  ]);

  const verdictMap: Record<string, ReviewResult["verdict"]> = {
    pass: "balanced_pass",
    warning: "warning",
    fail: "fail",
  };
  const result: ReviewResult = {
    verdict: verdictMap[ai?.verdict || ""] || "warning",
    confidence: Math.min(Math.max(Number(ai?.confidence) || 0.5, 0), 1),
    summary: ai?.summary?.substring(0, 400) || "تعذر تحليل القيد",
    details: {
      impact: ai?.impact || "",
      issues: Array.isArray(ai?.issues) ? ai.issues.slice(0, 6) : [],
      total_debit: totalDebit,
      total_credit: totalCredit,
    },
  };

  await storeAgentReview(supabase, {
    companyId: entry.company_id,
    agentType: "journal_entry",
    entityType: "journal_entries",
    entityId: entry.id,
    verdict: result.verdict,
    confidence: result.confidence,
    summary: result.summary,
    details: result.details,
    model: KIMI_MODEL,
  });
  return result;
}
