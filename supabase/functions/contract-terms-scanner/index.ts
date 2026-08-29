/**
 * Contract Terms Scanner
 *
 * Reads the signed contract document (the legal source of truth) stored in
 * the contract documents tab, extracts the written rent terms with OCR +
 * LLM analysis, compares it with the complete billing graph, and either
 * applies one evidence-backed payment-free scenario or assigns financial
 * review with the evidence and blocker attached.
 *
 * Modes:
 *   - { contractId }:          scan the latest signed contract document
 *   - { contractDocumentId }:  scan a specific document row
 *
 * Auth: function-specific Vault identity, authenticated user, or service role.
 * Only verified machine callers may auto-apply a high-confidence scenario.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import * as pdfjs from "npm:pdfjs-dist@4.2.67/legacy/build/pdf.mjs";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";
import {
  AgentInvocationContext,
  authorizeScheduledAgent,
  finishAgentExecution,
} from "../_shared/agent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-id, x-agent-secret",
};

const SIGNED_DOCUMENT_TYPES = ["signed_contract", "signed_contract_image"];
const GOOGLE_VISION_API_URL =
  "https://vision.googleapis.com/v1/images:annotate";
const MIN_TEXT_LAYER_LENGTH = 200;

type SupabaseClient = ReturnType<typeof createClient>;

type ExtractedTerms = {
  monthly_amount: number | null;
  total_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  duration_months: number | null;
  first_period_amount: number | null;
  rent_notes: string | null;
  confidence: number;
  evidence: string[];
};

type BillingGraphSnapshot = {
  activeScheduleCount: number;
  activeInvoiceCount: number;
  missingInvoiceCount: number;
  firstScheduleMonth: string | null;
  lastScheduleMonth: string | null;
  scheduleTotal: number;
  hasPaymentHistory: boolean;
};

type ScheduleSnapshotRow = {
  due_date?: unknown;
  amount?: unknown;
  paid_amount?: unknown;
  paid_date?: unknown;
  status?: unknown;
  invoice_id?: unknown;
};

type InvoiceSnapshotRow = {
  status?: unknown;
  payment_status?: unknown;
  total_amount?: unknown;
};

type ReconciliationScenario = {
  eligible: boolean;
  monthlyAmount: number | null;
  totalAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  installmentCount: number | null;
  firstBillingMonth: string | null;
  lastBillingMonth: string | null;
  reasons: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  let invocation: AgentInvocationContext | null = null;
  let executionFailed = false;
  try {
    const body = await req.json().catch(() => ({}));
    const hasScheduledIdentity = Boolean(
      req.headers.get("x-agent-id") && req.headers.get("x-agent-secret"),
    );
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRoleCaller = Boolean(
      serviceRoleKey && req.headers.get("Authorization") === `Bearer ${serviceRoleKey}`,
    );
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let authorizationCompanyId: string | null = typeof body.companyId === "string"
      ? body.companyId
      : null;
    if (body.contractDocumentId) {
      const { data: document, error: documentError } = await supabase
        .from("contract_documents")
        .select("company_id")
        .eq("id", String(body.contractDocumentId))
        .maybeSingle();
      if (documentError) throw documentError;
      authorizationCompanyId = document?.company_id || null;
    } else if (body.contractId) {
      const { data: contract, error: contractError } = await supabase
        .from("contracts")
        .select("company_id")
        .eq("id", String(body.contractId))
        .maybeSingle();
      if (contractError) throw contractError;
      authorizationCompanyId = contract?.company_id || null;
    }
    invocation = await authorizeScheduledAgent(
      req,
      "contract-terms-scanner",
      authorizationCompanyId,
    );

    const mayAutoApply = (hasScheduledIdentity || isServiceRoleCaller) &&
      body.dryRun !== true && body.autoApply !== false;

    if (body.mode === "batch") {
      if (!body.companyId) {
        return json({ success: false, error: "batch mode requires companyId" }, 400);
      }
      const maxDocs = Math.min(Math.max(Number(body.maxDocuments) || 4, 1), 10);
      const results = await processBatch(
        supabase,
        body.companyId,
        maxDocs,
        mayAutoApply,
        typeof body.contractId === "string" ? body.contractId : null,
      );
      return json({ success: true, ...results });
    }

    // Pages mode: the caller rasterizes the PDF and sends page images.
    if (body.mode === "pages") {
      if (!body.contractDocumentId || !Array.isArray(body.pages) || body.pages.length === 0) {
        return json({ success: false, error: "pages mode requires contractDocumentId and pages[]" }, 400);
      }
      const doc = await loadDocument(supabase, body);
      if (!doc) return json({ success: false, error: "Document not found" }, 404);
      const contract = await loadContract(supabase, doc);
      const text = await ocrRasterizedPages(body.pages);
      if (!text || text.trim().length < MIN_TEXT_LAYER_LENGTH) {
        return json({ success: false, outcome: "ocr_empty", documentId: doc.id });
      }
      const terms = await extractTermsWithLlm(text);
      const graph = await loadBillingGraphSnapshot(supabase, contract);
      const scenario = buildReconciliationScenario(terms, graph);
      const proposal = buildProposal(doc, contract, terms, graph, scenario);
      const proposalId = await storeProposal(
        supabase, doc, contract, terms, text, "pending", graph, scenario,
      );
      const applied = await maybeAutoApply(
        supabase,
        proposalId,
        scenario,
        mayAutoApply,
      );
      return json({ success: true, ...proposal, autoApply: applied });
    }

    const doc = await loadDocument(supabase, body);
    if (!doc) {
      return json({
        success: false,
        error: "No signed contract document found for the given input",
      }, 404);
    }

    const contract = await loadContract(supabase, doc);
    const text = await extractDocumentText(supabase, doc);

    if (!text || text.trim().length < MIN_TEXT_LAYER_LENGTH) {
      await storeProposal(supabase, doc, contract, null, text ?? "", "failed");
      return json({
        success: false,
        outcome: "no_text_layer",
        documentId: doc.id,
        hint:
          "The signed PDF has no usable text layer; rasterized-page OCR is required",
      });
    }

    const terms = await extractTermsWithLlm(text);
    const graph = await loadBillingGraphSnapshot(supabase, contract);
    const scenario = buildReconciliationScenario(terms, graph);
    const proposal = buildProposal(doc, contract, terms, graph, scenario);
    const proposalId = await storeProposal(
      supabase, doc, contract, terms, text, "pending", graph, scenario,
    );
    const applied = await maybeAutoApply(
      supabase,
      proposalId,
      scenario,
      mayAutoApply,
    );

    return json({ success: true, ...proposal, autoApply: applied });
  } catch (error) {
    executionFailed = true;
    console.error("contract-terms-scanner error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json(
      { success: false, error: message },
      message === "Unauthorized" ? 401 : 500,
    );
  } finally {
    if (invocation) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await finishAgentExecution(
        admin, invocation, !executionFailed, {},
        executionFailed ? "contract_terms_scan_failed" : null,
      ).catch(() => undefined);
    }
  }
});

async function loadDocument(supabase: SupabaseClient, body: Record<string, unknown>) {
  if (body.contractDocumentId) {
    const { data, error } = await supabase
      .from("contract_documents")
      .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type, legal_identity_match_status")
      .eq("id", String(body.contractDocumentId))
      .in("document_type", SIGNED_DOCUMENT_TYPES)
      .eq("legal_identity_match_status", "matched")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (!body.contractId) throw new Error("contractId or contractDocumentId is required");

  const { data, error } = await supabase
    .from("contract_documents")
    .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type, legal_identity_match_status")
    .eq("contract_id", String(body.contractId))
    .in("document_type", SIGNED_DOCUMENT_TYPES)
    .eq("legal_identity_match_status", "matched")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadContract(supabase: SupabaseClient, doc: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, contract_number, status, start_date, end_date, monthly_amount, contract_amount, total_paid, balance_due")
    .eq("id", String(doc.contract_id))
    .eq("company_id", String(doc.company_id))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Contract row not found for the scanned document");
  return data;
}

async function extractDocumentText(
  supabase: SupabaseClient,
  doc: Record<string, unknown>,
): Promise<string> {
  const { data: file, error } = await supabase.storage
    .from("contract-documents")
    .download(String(doc.file_path));
  if (error || !file) throw error || new Error("Document download failed");

  const buffer = await file.arrayBuffer();
  const isPdf =
    String(doc.mime_type || "").includes("pdf") ||
    String(doc.file_path || "").toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const textLayer = await extractPdfTextLayer(buffer);
    if (textLayer.trim().length >= MIN_TEXT_LAYER_LENGTH) return textLayer;

    // Scanned PDF: rasterize pages server-side (OffscreenCanvas when the
    // runtime provides it) and OCR the images.
    const pageImages = await rasterizePdfPages(buffer);
    if (pageImages.length > 0) {
      return await ocrRasterizedPages(
        pageImages.map((imageBase64, index) => ({
          pageNumber: index + 1,
          imageBase64,
        })),
      );
    }
    return textLayer;
  }
  return await detectTextWithGoogleVision(arrayBufferToBase64(buffer));
}

/** Best-effort server-side PDF rasterization; empty when OffscreenCanvas is unavailable. */
async function rasterizePdfPages(buffer: ArrayBuffer): Promise<string[]> {
  if (typeof OffscreenCanvas === "undefined") return [];
  try {
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: true,
    });
    const pdf = await task.promise;
    const images: string[] = [];
    const maxPages = Math.min(pdf.numPages, 12);

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = new OffscreenCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const context = canvas.getContext("2d");
      if (!context) break;
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await canvas.convertToBlob({ type: "image/png" });
      images.push(arrayBufferToBase64(await blob.arrayBuffer()));
      page.cleanup();
    }
    await pdf.destroy();
    return images;
  } catch (error) {
    console.warn("server-side PDF rasterization unavailable:", error);
    return [];
  }
}

async function extractPdfTextLayer(buffer: ArrayBuffer): Promise<string> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  const parts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 40);

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(`--- page ${pageNumber} ---\n${pageText}`);
  }
  await pdf.destroy();
  return parts.join("\n");
}

async function ocrRasterizedPages(
  pages: Array<{ pageNumber: number; imageBase64: string }>,
): Promise<string> {
  const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const parts: string[] = [];
  for (const page of ordered.slice(0, 20)) {
    const text = await detectTextWithGoogleVision(page.imageBase64);
    parts.push(`--- page ${page.pageNumber} ---\n${text}`);
  }
  return parts.join("\n");
}

async function detectTextWithGoogleVision(imageBase64: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY is not configured");

  const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Vision error: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  return payload?.responses?.[0]?.fullTextAnnotation?.text ?? "";
}

async function extractTermsWithLlm(rawText: string): Promise<ExtractedTerms> {
  const apiKey = getLongCatApiKey();
  if (!apiKey) throw new Error("LONGCAT_API_KEY is not configured");

  const systemPrompt = [
    "You are a forensic contract analyst for a Qatari car-rental company.",
    "Read the signed rental contract text and extract the FINANCIAL TERMS exactly as written.",
    "Answer with strict JSON only, no prose, using these keys:",
    "monthly_amount (number|null), total_amount (number|null),",
    "start_date (YYYY-MM-DD|null), end_date (YYYY-MM-DD|null),",
    "duration_months (number|null), first_period_amount (number|null),",
    "rent_notes (string|null: any rent change / escalation written in the contract),",
    "confidence (0..1), evidence (array of short verbatim quotes, Arabic or English).",
    "Amounts are Qatari Riyal. Arabic-Indic digits must be converted.",
    "If a value is not written in the document, use null. Never guess.",
  ].join(" ");

  const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: buildLongCatHeaders(apiKey),
    body: JSON.stringify({
      model: LONGCAT_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText.slice(0, 24000) },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`LLM extraction failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    monthly_amount: toNumberOrNull(parsed.monthly_amount),
    total_amount: toNumberOrNull(parsed.total_amount),
    start_date: toDateOrNull(parsed.start_date),
    end_date: toDateOrNull(parsed.end_date),
    duration_months: toNumberOrNull(parsed.duration_months),
    first_period_amount: toNumberOrNull(parsed.first_period_amount),
    rent_notes: typeof parsed.rent_notes === "string" ? parsed.rent_notes : null,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    evidence: Array.isArray(parsed.evidence)
      ? parsed.evidence.map((quote: unknown) => String(quote)).slice(0, 8)
      : [],
  };
}

function buildProposal(
  doc: Record<string, unknown>,
  contract: Record<string, unknown>,
  terms: ExtractedTerms,
  graph?: BillingGraphSnapshot,
  scenario?: ReconciliationScenario,
) {
  const current = {
    monthly_amount: Number(contract.monthly_amount ?? 0),
    contract_amount: Number(contract.contract_amount ?? 0),
    start_date: contract.start_date,
    end_date: contract.end_date,
  };

  const changes: Array<Record<string, unknown>> = [];
  if (
    terms.monthly_amount !== null &&
    terms.monthly_amount > 0 &&
    Math.abs(terms.monthly_amount - current.monthly_amount) > 0.01
  ) {
    changes.push({
      field: "monthly_amount",
      from: current.monthly_amount,
      to: terms.monthly_amount,
    });
  }
  if (
    terms.total_amount !== null &&
    terms.total_amount > 0 &&
    Math.abs(terms.total_amount - current.contract_amount) > 0.01
  ) {
    changes.push({
      field: "contract_amount",
      from: current.contract_amount,
      to: terms.total_amount,
    });
  }
  if (terms.start_date && terms.start_date !== current.start_date) {
    changes.push({ field: "start_date", from: current.start_date, to: terms.start_date });
  }
  if (terms.end_date && terms.end_date !== current.end_date) {
    changes.push({ field: "end_date", from: current.end_date, to: terms.end_date });
  }
  if (graph && graph.missingInvoiceCount > 0) {
    changes.push({
      field: "billing_graph",
      issue: "active_schedules_missing_invoices",
      missingInvoices: graph.missingInvoiceCount,
      scenario,
    });
  }

  return {
    documentId: doc.id,
    contractId: contract.id,
    contractNumber: contract.contract_number,
    extractedTerms: terms,
    currentTerms: current,
    proposedChanges: changes,
    outcome: changes.length === 0 ? "matches_document" : "proposal_created",
  };
}

async function storeProposal(
  supabase: SupabaseClient,
  doc: Record<string, unknown>,
  contract: Record<string, unknown>,
  terms: ExtractedTerms | null,
  rawText: string,
  status: "pending" | "failed",
  graph?: BillingGraphSnapshot,
  scenario?: ReconciliationScenario,
): Promise<string | null> {
  const proposal = buildProposal(
    doc,
    contract,
    terms ?? {
      monthly_amount: null,
      total_amount: null,
      start_date: null,
      end_date: null,
      duration_months: null,
      first_period_amount: null,
      rent_notes: null,
      confidence: 0,
      evidence: [],
    },
    graph,
    scenario,
  );

  const row = {
    company_id: doc.company_id,
    contract_id: doc.contract_id,
    contract_document_id: doc.id,
    status,
    extracted_terms: {
      ...proposal.extractedTerms,
      billing_graph: graph ?? null,
      billing_scenario: scenario ?? null,
    },
    current_terms: proposal.currentTerms,
    proposed_changes: proposal.proposedChanges,
    raw_text: rawText.slice(0, 20000),
    overall_confidence: terms?.confidence ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("contract_terms_scan_proposals")
    .select("id")
    .eq("contract_document_id", String(doc.id))
    .eq("status", "pending")
    .maybeSingle();

  const { data: saved, error } = existing
    ? await supabase
        .from("contract_terms_scan_proposals")
        .update(row)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await supabase
        .from("contract_terms_scan_proposals")
        .insert(row)
        .select("id")
        .single();
  if (error) throw error;
  return saved?.id ?? existing?.id ?? null;
}

/**
 * Nightly batch: contracts whose stored amount disagrees with the canonical
 * billing-month graph AND have a signed document get scanned. High-confidence
 * self-consistent extractions are applied automatically through the gated
 * apply command; everything else stays pending for human review.
 */
async function processBatch(
  supabase: SupabaseClient,
  companyId: string,
  maxDocuments: number,
  autoApply: boolean,
  targetContractId: string | null,
) {
  const { data: candidates, error } = await supabase.rpc(
    "contract_terms_scan_batch_candidates_v4",
    {
      p_company_id: companyId,
      p_limit: maxDocuments,
      p_contract_id: targetContractId,
    },
  );
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  let appliedCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  for (const candidate of candidates ?? []) {
    try {
      const { data: doc } = await supabase
        .from("contract_documents")
        .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type, legal_identity_match_status")
        .eq("id", candidate.document_id)
        .eq("legal_identity_match_status", "matched")
        .single();
      if (!doc) {
        failedCount += 1;
        continue;
      }

      const contract = await loadContract(supabase, doc);
      const text = await extractDocumentText(supabase, doc);
      if (!text || text.trim().length < MIN_TEXT_LAYER_LENGTH) {
        failedCount += 1;
        results.push({
          contractId: doc.contract_id,
          outcome: "no_text_layer",
        });
        continue;
      }

      const terms = await extractTermsWithLlm(text);
      const graph = await loadBillingGraphSnapshot(supabase, contract);
      const scenario = buildReconciliationScenario(terms, graph);
      const proposal = buildProposal(doc, contract, terms, graph, scenario);
      const proposalId = await storeProposal(
        supabase, doc, contract, terms, text, "pending", graph, scenario,
      );
      const applied = await maybeAutoApply(
        supabase, proposalId, scenario, autoApply,
      );

      if (applied.applied) appliedCount += 1;
      else pendingCount += 1;
      results.push({
        contractId: doc.contract_id,
        contractNumber: contract.contract_number,
        outcome: applied.applied ? "auto_applied" : proposal.outcome,
        extractedMonthly: terms.monthly_amount,
        extractedTotal: terms.total_amount,
        confidence: terms.confidence,
        triggerReason: candidate.trigger_reason,
        scenario,
        applyResult: applied.applied ? applied.result : undefined,
        skippedReason: applied.applied ? undefined : applied.reason,
      });
    } catch (error) {
      failedCount += 1;
      results.push({
        contractId: candidate.contract_id,
        outcome: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    scanned: (candidates ?? []).length,
    autoApplied: appliedCount,
    pendingReview: pendingCount,
    failed: failedCount,
    results,
  };
}

/**
 * Auto-apply only when the extraction is high-confidence, internally
 * consistent (monthly x duration ~= total), and evidenced by verbatim quotes.
 * Anything weaker stays pending — the agent never guesses financial terms.
 */
async function maybeAutoApply(
  supabase: SupabaseClient,
  proposalId: string | null,
  scenario: ReconciliationScenario,
  autoApply: boolean,
): Promise<{ applied: boolean; reason?: string; result?: unknown }> {
  if (!autoApply) return { applied: false, reason: "auto_apply_disabled" };
  if (!proposalId) return { applied: false, reason: "no_proposal" };

  if (!scenario.eligible) {
    const reason = scenario.reasons.join("; ") ||
      "confidence_or_consistency_below_threshold";
    await ensureFinancialReviewTask(supabase, proposalId, reason, scenario);
    return { applied: false, reason };
  }

  const { data, error } = await supabase.rpc(
    "apply_autonomous_contract_reconciliation_v1",
    {
      p_proposal_id: proposalId,
      p_scenario: scenario,
    },
  );
  if (error) {
    const reason = `apply_failed: ${error.message}`;
    await ensureFinancialReviewTask(supabase, proposalId, reason, scenario);
    return { applied: false, reason };
  }
  return { applied: true, result: data };
}

async function loadBillingGraphSnapshot(
  supabase: SupabaseClient,
  contract: Record<string, unknown>,
): Promise<BillingGraphSnapshot> {
  const inactive = new Set([
    "cancelled", "canceled", "void", "voided", "deleted", "inactive",
  ]);
  const [{ data: schedules, error: scheduleError },
    { data: invoices, error: invoiceError },
    { data: payments, error: paymentError }] = await Promise.all([
    supabase
      .from("contract_payment_schedules")
      .select("due_date,amount,paid_amount,paid_date,status,invoice_id")
      .eq("company_id", String(contract.company_id))
      .eq("contract_id", String(contract.id)),
    supabase
      .from("invoices")
      .select("id,status,payment_status,total_amount")
      .eq("company_id", String(contract.company_id))
      .eq("contract_id", String(contract.id)),
    supabase
      .from("payments")
      .select("id,payment_status")
      .eq("company_id", String(contract.company_id))
      .eq("contract_id", String(contract.id))
      .limit(1),
  ]);
  if (scheduleError) throw scheduleError;
  if (invoiceError) throw invoiceError;
  if (paymentError) throw paymentError;

  const activeSchedules = (schedules as ScheduleSnapshotRow[] ?? []).filter((schedule) =>
    !inactive.has(String(schedule.status ?? "").toLowerCase())
  );
  const activeInvoices = (invoices as InvoiceSnapshotRow[] ?? []).filter((invoice) =>
    Number(invoice.total_amount ?? 0) > 0.01 &&
    !inactive.has(String(invoice.status ?? "").toLowerCase()) &&
    !inactive.has(String(invoice.payment_status ?? "").toLowerCase())
  );
  const months = activeSchedules
    .map((schedule) => monthKey(schedule.due_date))
    .filter((month): month is string => Boolean(month))
    .sort();

  return {
    activeScheduleCount: activeSchedules.length,
    activeInvoiceCount: activeInvoices.length,
    missingInvoiceCount: activeSchedules.filter((schedule) => !schedule.invoice_id).length,
    firstScheduleMonth: months[0] ?? null,
    lastScheduleMonth: months.at(-1) ?? null,
    scheduleTotal: activeSchedules.reduce(
      (total, schedule) => total + Number(schedule.amount ?? 0), 0,
    ),
    hasPaymentHistory: Boolean(payments?.length) || activeSchedules.some(
      (schedule) => Number(schedule.paid_amount ?? 0) > 0.01 || Boolean(schedule.paid_date),
    ),
  };
}

function buildReconciliationScenario(
  terms: ExtractedTerms,
  graph: BillingGraphSnapshot,
): ReconciliationScenario {
  const reasons: string[] = [];
  const monthly = terms.monthly_amount;
  const duration = terms.duration_months !== null &&
      Number.isInteger(terms.duration_months) && terms.duration_months > 0
    ? terms.duration_months
    : null;
  const startDate = terms.start_date;
  const endDate = terms.end_date;
  const firstBillingMonth = graph.firstScheduleMonth ??
    (startDate ? addMonths(monthKey(startDate), 1) : null);
  const lastBillingMonth = firstBillingMonth && duration
    ? addMonths(firstBillingMonth, duration - 1)
    : null;
  const calculatedTotal = monthly && duration ? roundMoney(monthly * duration) : null;
  const total = terms.total_amount && terms.total_amount > 0
    ? roundMoney(terms.total_amount)
    : calculatedTotal;

  if (!monthly || monthly <= 0) reasons.push("signed monthly amount is missing");
  if (!startDate || !endDate) reasons.push("signed contract period is incomplete");
  if (!duration) reasons.push("signed installment duration is missing");
  if (terms.confidence < 0.9 || terms.evidence.length === 0) {
    reasons.push("signed-document evidence is below the autonomous threshold");
  }
  if (terms.first_period_amount !== null && monthly !== null &&
      Math.abs(terms.first_period_amount - monthly) > 0.01) {
    reasons.push("a partial first period requires a dedicated financial schedule");
  }
  if (terms.total_amount && calculatedTotal && monthly &&
      Math.abs(terms.total_amount - calculatedTotal) > Math.max(1, monthly * 0.02)) {
    reasons.push("written total does not equal monthly amount multiplied by duration");
  }
  const signedStartMonth = monthKey(startDate);
  const signedEndMonth = monthKey(endDate);
  if (firstBillingMonth && signedStartMonth && firstBillingMonth < signedStartMonth) {
    reasons.push("first billing month precedes the signed period");
  }
  if (lastBillingMonth && signedEndMonth && lastBillingMonth > signedEndMonth) {
    reasons.push("installment graph extends beyond the signed period");
  }
  if (graph.hasPaymentHistory) {
    reasons.push("protected payment history requires financial review");
  }

  return {
    eligible: reasons.length === 0,
    monthlyAmount: monthly,
    totalAmount: total,
    startDate,
    endDate,
    installmentCount: duration,
    firstBillingMonth,
    lastBillingMonth,
    reasons,
  };
}

async function ensureFinancialReviewTask(
  supabase: SupabaseClient,
  proposalId: string,
  blocker: string,
  scenario: ReconciliationScenario,
) {
  const { error } = await supabase.rpc(
    "upsert_contract_reconciliation_review_task_v1",
    {
      p_proposal_id: proposalId,
      p_blocker: blocker.slice(0, 2000),
      p_scenario: scenario,
    },
  );
  if (error) {
    console.error("Unable to assign contract reconciliation review", {
      proposalId,
      error: error.message,
    });
  }
}

function monthKey(value: unknown): string | null {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-01` : null;
}

function addMonths(value: string | null, months: number): string | null {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toDateOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
