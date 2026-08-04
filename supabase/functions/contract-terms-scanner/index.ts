/**
 * Contract Terms Scanner
 *
 * Reads the signed contract document (the legal source of truth) stored in
 * the contract documents tab, extracts the written rent terms with OCR +
 * LLM analysis, and stores a pending proposal whenever the stored contract
 * row disagrees with the signed document.
 *
 * Modes:
 *   - { contractId }:          scan the latest signed contract document
 *   - { contractDocumentId }:  scan a specific document row
 *
 * Auth: x-agent-secret (CONTRACT_SCANNER_SECRET) or service-role bearer.
 * Nothing is applied automatically; proposals are human-approved.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import * as pdfjs from "npm:pdfjs-dist@4.2.67/legacy/build/pdf.mjs";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    authorize(req);
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

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
      const proposal = buildProposal(doc, contract, terms);
      await storeProposal(supabase, doc, contract, terms, text, "pending");
      return json({ success: true, ...proposal });
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
    const proposal = buildProposal(doc, contract, terms);
    await storeProposal(supabase, doc, contract, terms, text, "pending");

    return json({ success: true, ...proposal });
  } catch (error) {
    console.error("contract-terms-scanner error:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});

function authorize(req: Request) {
  const secret = req.headers.get("x-agent-secret") || "";
  const expected = Deno.env.get("CONTRACT_SCANNER_SECRET") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("authorization") || "";

  if (expected && secret === expected) return;
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) return;
  throw new Error("Unauthorized contract terms scanner request");
}

async function loadDocument(supabase: SupabaseClient, body: Record<string, unknown>) {
  if (body.contractDocumentId) {
    const { data, error } = await supabase
      .from("contract_documents")
      .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type")
      .eq("id", String(body.contractDocumentId))
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (!body.contractId) throw new Error("contractId or contractDocumentId is required");

  const { data, error } = await supabase
    .from("contract_documents")
    .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type")
    .eq("contract_id", String(body.contractId))
    .in("document_type", SIGNED_DOCUMENT_TYPES)
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

  if (isPdf) return await extractPdfTextLayer(buffer);
  return await detectTextWithGoogleVision(arrayBufferToBase64(buffer));
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
) {
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
  );

  const row = {
    company_id: doc.company_id,
    contract_id: doc.contract_id,
    contract_document_id: doc.id,
    status,
    extracted_terms: proposal.extractedTerms,
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

  const { error } = existing
    ? await supabase.from("contract_terms_scan_proposals").update(row).eq("id", existing.id)
    : await supabase.from("contract_terms_scan_proposals").insert(row);
  if (error) throw error;
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
