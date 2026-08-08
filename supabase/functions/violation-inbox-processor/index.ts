/**
 * Violation Inbox Processor
 *
 * Watches the `moi-inbox` storage bucket: every MOI/Metrash file dropped into
 * `<companyId>/inbox/` is extracted, matched to vehicles and contracts,
 * inserted into penalties, and the assigned employee gets a task — untouched
 * by human hands. Processed files move to `processed/`; unreadable files move
 * to `needs_review/` and open a task.
 *
 * Body: { companyId, limit? }
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

const BUCKET = "moi-inbox";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: agentCorsHeaders });

  try {
    await authorizeAgent(req);
    const body = await req.json().catch(() => ({}));
    if (!body.companyId) throw new Error("companyId is required");

    const supabase = createServiceClient();
    const limit = Math.min(Number(body.limit) || 5, 10);

    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(`${body.companyId}/inbox`, { limit });
    if (error) throw error;

    const summary = { processed: 0, violations: 0, matched: 0, needsReview: 0, failed: 0 };
    for (const file of files || []) {
      if (!file.name || file.name.endsWith("/")) continue;
      try {
        const outcome = await processFile(supabase, body.companyId, file.name);
        summary.processed++;
        summary.violations += outcome.violations;
        summary.matched += outcome.matched;
        if (outcome.needsReview) summary.needsReview++;
      } catch (fileError) {
        summary.failed++;
        console.error(`Inbox file ${file.name} failed:`, fileError);
      }
    }

    return jsonResponse({ success: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, message === "Unauthorized" ? 401 : 500);
  }
});

async function processFile(
  supabase: SupabaseClient,
  companyId: string,
  fileName: string,
): Promise<{ violations: number; matched: number; needsReview: boolean }> {
  const path = `${companyId}/inbox/${fileName}`;
  const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
  if (downloadError || !file) throw downloadError || new Error("download failed");

  const isPdf = file.type === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const extractUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-traffic-violations`;

  let extractResponse: Response;
  if (isPdf) {
    // Text-based MOI PDFs are parsed server-side; scanned PDFs need review.
    const text = await extractPdfText(await file.arrayBuffer());
    if (!text || text.trim().length < 40) {
      await moveFile(supabase, companyId, fileName, "needs_review");
      await openInboxTask(supabase, companyId, fileName, "ملف مخالفات ممسوح بلا نص — يحتاج استيراداً يدوياً");
      return { violations: 0, matched: 0, needsReview: true };
    }
    extractResponse = await fetch(extractUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ text, source: "inbox" }),
    });
  } else {
    const formData = new FormData();
    formData.append("file", file, fileName);
    extractResponse = await fetch(extractUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}` },
      body: formData,
    });
  }

  const extracted = await extractResponse.json();
  const violations = extracted?.violations || extracted?.data?.violations || [];
  if (!extractResponse.ok || violations.length === 0) {
    await moveFile(supabase, companyId, fileName, "needs_review");
    await openInboxTask(supabase, companyId, fileName, "تعذر استخراج مخالفات من الملف — يحتاج مراجعة");
    return { violations: 0, matched: 0, needsReview: true };
  }

  let matched = 0;
  let inserted = 0;
  for (const violation of violations) {
    const result = await matchAndInsert(supabase, companyId, violation);
    if (result === "inserted") inserted++;
    if (result === "inserted" || result === "duplicate") matched++;
  }

  await moveFile(supabase, companyId, fileName, "processed");
  await notifyAssignees(supabase, companyId, inserted, fileName);
  await storeAgentReview(supabase, {
    companyId,
    agentType: "violation_inbox",
    entityType: "storage_objects",
    entityId: null,
    verdict: inserted > 0 ? "imported" : "no_match",
    summary: `استيراد تلقائي: ${inserted} مخالفة من ${violations.length} في الملف ${fileName}`,
    details: { file: fileName, extracted: violations.length, inserted },
  });

  return { violations: inserted, matched, needsReview: false };
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdfjs = await import("npm:pdfjs-dist@4.4.168/legacy/build/pdf.min.mjs");
    const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const parts: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 10); pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      parts.push(content.items.map((item: { str?: string }) => item.str || "").join(" "));
    }
    return parts.join("\n");
  } catch (error) {
    console.warn("Server-side PDF text extraction failed:", error);
    return "";
  }
}

async function matchAndInsert(
  supabase: SupabaseClient,
  companyId: string,
  violation: Record<string, any>,
): Promise<"inserted" | "duplicate" | "unmatched"> {
  const plate = String(violation.plate_number || "").replace(/\s+/g, "");
  if (!plate) return "unmatched";

  const violationNumber = String(violation.violation_number || "").trim();
  if (violationNumber) {
    const { count } = await supabase
      .from("penalties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("penalty_number", violationNumber);
    if ((count || 0) > 0) return "duplicate";
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("company_id", companyId)
    .or(`plate_number.eq.${plate},plate_number.eq.${plate.replace(/[^\d]/g, "")}`)
    .limit(1)
    .maybeSingle();
  if (!vehicle) return "unmatched";

  const violationDate = String(violation.date || new Date().toISOString().slice(0, 10));
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, customer_id, assigned_to_profile_id")
    .eq("company_id", companyId)
    .eq("vehicle_id", vehicle.id)
    .lte("start_date", violationDate)
    .gte("end_date", violationDate)
    .in("status", ["active", "under_legal_procedure"])
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("penalties").insert({
    company_id: companyId,
    vehicle_id: vehicle.id,
    contract_id: contract?.id || null,
    customer_id: contract?.customer_id || null,
    penalty_number: violationNumber || `AUTO-${Date.now()}`,
    violation_type: String(violation.violation_type || "مخالفة مرورية"),
    penalty_date: violationDate,
    location: violation.location || null,
    amount: Number(violation.fine_amount || 0),
    vehicle_plate: plate,
    reason: violation.violation_type || "مخالفة مرورية",
    status: "pending",
    payment_status: "unpaid",
    notes: "استيراد تلقائي من صندوق مخالفات وزارة الداخلية",
  });
  if (error) throw error;
  return "inserted";
}

async function moveFile(
  supabase: SupabaseClient,
  companyId: string,
  fileName: string,
  targetFolder: string,
) {
  await supabase.storage
    .from(BUCKET)
    .move(`${companyId}/inbox/${fileName}`, `${companyId}/${targetFolder}/${Date.now()}-${fileName}`);
}

async function openInboxTask(
  supabase: SupabaseClient,
  companyId: string,
  fileName: string,
  reason: string,
) {
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
    title: "ملف مخالفات يحتاج مراجعة يدوية",
    description: `${reason}\nالملف: ${fileName}`,
    status: "pending",
    priority: "medium",
    assigned_to: manager?.id || null,
    created_by: manager?.id || null,
  });
}

async function notifyAssignees(
  supabase: SupabaseClient,
  companyId: string,
  inserted: number,
  fileName: string,
) {
  if (inserted === 0) return;
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
    title: `استيراد تلقائي: ${inserted} مخالفة جديدة`,
    description: `استورد النظام ${inserted} مخالفة من الملف ${fileName} وطابقها مع العقود. راجع صفحة المخالفات.`,
    status: "pending",
    priority: "low",
    assigned_to: manager?.id || null,
    created_by: manager?.id || null,
  });
}
