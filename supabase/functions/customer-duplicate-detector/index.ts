/**
 * Customer Duplicate Detector
 *
 * Nightly scan for duplicate customers (same national ID, or same normalized
 * Arabic name + phone) and opens merge proposals. A merge is applied only
 * after human acceptance via the review center.
 *
 * Modes:
 *   - { companyId }                          — detect and propose
 *   - { mode: "apply", proposalId, actorId? } — execute an accepted merge
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    if (body.mode === "apply") {
      if (!body.proposalId) throw new Error("proposalId is required");
      const result = await applyMerge(supabase, body.proposalId);
      return jsonResponse({ success: true, ...result });
    }

    if (!body.companyId) throw new Error("companyId is required");
    const result = await detectDuplicates(supabase, body.companyId);
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

function normalizeArabicName(value: string): string {
  return value
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

async function detectDuplicates(supabase: SupabaseClient, companyId: string) {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, first_name_ar, last_name_ar, first_name, last_name, company_name_ar, national_id, phone, customer_type, created_at")
    .eq("company_id", companyId)
    .is("merged_into_customer_id", null);
  if (error) throw error;

  const rows = customers || [];
  let proposed = 0;

  const tryPropose = async (
    primary: (typeof rows)[number],
    duplicate: (typeof rows)[number],
    reason: string,
    confidence: number,
  ) => {
    const { error: insertError } = await supabase
      .from("customer_merge_proposals")
      .insert({
        company_id: companyId,
        primary_customer_id: primary.id,
        duplicate_customer_id: duplicate.id,
        reason,
        confidence,
      });
    if (!insertError) proposed++;
  };

  // 1) Same national ID — strongest signal.
  const byNationalId = new Map<string, typeof rows>();
  for (const customer of rows) {
    const nationalId = String(customer.national_id || "").trim();
    if (!nationalId) continue;
    const bucket = byNationalId.get(nationalId) || [];
    bucket.push(customer);
    byNationalId.set(nationalId, bucket);
  }
  for (const bucket of byNationalId.values()) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    for (const duplicate of sorted.slice(1)) {
      const primaryName = normalizeArabicName(
        `${sorted[0].first_name_ar || ""} ${sorted[0].last_name_ar || ""}`.trim()
        || sorted[0].company_name_ar || "",
      );
      const duplicateName = normalizeArabicName(
        `${duplicate.first_name_ar || ""} ${duplicate.last_name_ar || ""}`.trim()
        || duplicate.company_name_ar || "",
      );
      // Same national ID with clearly different names is a data conflict that
      // needs investigation — never an automatic merge candidate.
      if (primaryName && duplicateName && primaryName !== duplicateName) {
        await openConflictTask(supabase, companyId, sorted[0], duplicate);
        continue;
      }
      await tryPropose(sorted[0], duplicate, "نفس الرقم الشخصي", 0.98);
    }
  }

  // 2) Same normalized Arabic name + same phone.
  const byNamePhone = new Map<string, typeof rows>();
  for (const customer of rows) {
    const name = customer.customer_type === "corporate" || customer.customer_type === "company"
      ? customer.company_name_ar
      : `${customer.first_name_ar || ""} ${customer.last_name_ar || ""}`;
    const phone = String(customer.phone || "").replace(/\D/g, "");
    const key = `${normalizeArabicName(name || "")}|${phone}`;
    if (!key.startsWith("|") && !key.endsWith("|") && phone.length >= 8) {
      const bucket = byNamePhone.get(key) || [];
      bucket.push(customer);
      byNamePhone.set(key, bucket);
    }
  }
  for (const bucket of byNamePhone.values()) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    for (const duplicate of sorted.slice(1)) {
      await tryPropose(sorted[0], duplicate, "نفس الاسم العربي ورقم الهاتف", 0.85);
    }
  }

  await storeAgentReview(supabase, {
    companyId,
    agentType: "customer_merge",
    entityType: "companies",
    entityId: companyId,
    verdict: proposed > 0 ? "proposals_created" : "clean",
    summary: proposed > 0
      ? `كشف التكرار الليلي: ${proposed} مقترح دمج جديد`
      : "كشف التكرار الليلي: لا تكرارات جديدة",
    details: { proposed },
  });

  return { proposed, scanned: rows.length };
}

async function openConflictTask(
  supabase: SupabaseClient,
  companyId: string,
  first: Record<string, any>,
  second: Record<string, any>,
) {
  const name = (c: Record<string, any>) =>
    `${c.first_name_ar || c.first_name || ""} ${c.last_name_ar || c.last_name || ""}`.trim()
    || c.company_name_ar || "عميل";

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("metadata->>finding_key", `national-id-conflict:${second.national_id}`)
    .in("status", ["pending", "in_progress"]);
  if ((count || 0) > 0) return;

  const { data: manager } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["manager", "company_admin", "admin"])
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  await supabase.from("tasks").insert({
    company_id: companyId,
    title: `تعارض رقم شخصي: ${second.national_id}`,
    description: `سجلان يحملان نفس الرقم الشخصي باسمين مختلفين: «${name(first)}» و«${name(second)}». تحقق من الاسم الصحيح أو الرقم الصحيح قبل أي دمج.`,
    status: "pending",
    priority: "high",
    assigned_to: manager?.id || null,
    created_by: manager?.id || null,
    metadata: { finding_key: `national-id-conflict:${second.national_id}`, source: "customer-duplicate-detector" },
  });
}

async function applyMerge(supabase: SupabaseClient, proposalId: string) {
  const { data: proposal, error } = await supabase
    .from("customer_merge_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("status", "pending")
    .single();
  if (error || !proposal) throw new Error("Pending proposal not found");

  const primaryId = proposal.primary_customer_id;
  const duplicateId = proposal.duplicate_customer_id;
  const companyId = proposal.company_id;

  // Re-link every dependent record, then mark the duplicate as merged.
  const relinks: Array<[string, string]> = [
    ["contracts", "customer_id"],
    ["invoices", "customer_id"],
    ["payments", "customer_id"],
    ["penalties", "customer_id"],
    ["customer_communications", "customer_id"],
    ["legal_cases", "client_id"],
  ];

  const moved: Record<string, number> = {};
  const skipped: string[] = [];
  for (const [table, column] of relinks) {
    const { data, error: relinkError } = await supabase
      .from(table)
      .update({ [column]: primaryId })
      .eq(column, duplicateId)
      .eq("company_id", companyId)
      .select("id");
    if (relinkError) {
      // A missing/legacy table must never abort the whole merge — log and skip.
      console.warn(`Merge relink skipped for ${table}:`, relinkError.message);
      skipped.push(table);
      continue;
    }
    moved[table] = (data || []).length;
  }

  if (skipped.length > 0 && skipped.length === relinks.length) {
    throw new Error("تعذر نقل أي سجل — تحقق من بنية قاعدة البيانات");
  }

  const { error: mergeError } = await supabase
    .from("customers")
    .update({ merged_into_customer_id: primaryId, updated_at: new Date().toISOString() })
    .eq("id", duplicateId)
    .eq("company_id", companyId);
  if (mergeError) throw mergeError;

  const { error: statusError } = await supabase
    .from("customer_merge_proposals")
    .update({ status: "accepted", reviewed_at: new Date().toISOString() })
    .eq("id", proposalId);
  if (statusError) throw statusError;

  await storeAgentReview(supabase, {
    companyId,
    agentType: "customer_merge",
    entityType: "customers",
    entityId: primaryId,
    verdict: "merged",
    summary: `دمج العميل المكرر في السجل الأساسي — نُقلت ${Object.values(moved).reduce((a, b) => a + b, 0)} سجلات`,
    details: { moved, skipped_tables: skipped, duplicate_customer_id: duplicateId },
  });

  return { merged: true, moved, skipped };
}
