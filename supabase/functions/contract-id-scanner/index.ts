/**
 * Contract ID Scanner Edge Function
 *
 * Scans contract documents for Qatari ID cards and creates *proposals*
 * to update customer data. Nothing is applied automatically — every
 * change requires human review in the contract page.
 *
 * Modes:
 *   - batch:    picks unprocessed image documents (cron, every 15 min)
 *   - document: processes a single contract_documents row (on upload)
 *   - pages:    processes client-rasterized PDF pages [{pageNumber, imageBase64}]
 *
 * Smart name correction pipeline:
 *   1. Arabic normalization (hamza/taa-marbuta/alef-maqsura/diacritics)
 *   2. Levenshtein distance against a common Arabic names dictionary
 *      ("محمممد" -> "محمد", distance 1)
 *   3. LongCat LLM as a judge only when confidence < 90%
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildLongCatHeaders,
  getLongCatApiKey,
  LONGCAT_CHAT_COMPLETIONS_URL,
  LONGCAT_MODEL,
} from "../_shared/longcat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-scanner-secret",
};

const GOOGLE_VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

const SCANNABLE_DOCUMENT_TYPES = [
  "identity",
  "signed_contract_image",
  "signed_contract",
  "id_card",
];

const MIN_PROPOSAL_CONFIDENCE = 0.7;
const LLM_REVIEW_THRESHOLD = 0.9;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedIdData {
  nationalId?: string;
  name?: string;
  nameArabic?: string;
  firstName?: string;
  lastName?: string;
  firstNameArabic?: string;
  lastNameArabic?: string;
  dateOfBirth?: string;
  idExpiry?: string;
  nationality?: string;
  nationalityArabic?: string;
  nameArabicOccurrences?: number;
  nameCrossScriptConsistent?: boolean;
}

interface ProposedChange {
  field: string;
  current_value: string | null;
  proposed_value: string;
  confidence: number;
  method: "ocr" | "normalized" | "dictionary" | "llm";
}

interface ScannerRequest {
  mode?: "batch" | "document" | "pages" | "proposal_evidence";
  limit?: number;
  contractDocumentId?: string;
  proposalId?: string;
  imageBase64?: string;
  evidenceImagePath?: string;
  pages?: Array<{ pageNumber: number; imageBase64: string; evidenceImagePath?: string }>;
}

interface ContractDocumentRow {
  id: string;
  company_id: string;
  contract_id: string;
  document_type: string;
  document_name: string;
  file_path: string | null;
  mime_type: string | null;
}

interface OcrAnnotation {
  description?: string;
  boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> };
}

interface OcrResult {
  text: string;
  annotations: OcrAnnotation[];
}

interface NameEvidence {
  imagePath?: string | null;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: 0 | 90 | 180 | 270;
  } | null;
  label?: string | null;
}

// ---------------------------------------------------------------------------
// Common Arabic first names dictionary (normalized form, no diacritics)
// Used for dictionary-based correction before falling back to the LLM.
// ---------------------------------------------------------------------------
const COMMON_ARABIC_NAMES = [
  "محمد", "احمد", "محمود", "علي", "حسن", "حسين", "عبدالله", "عبدالرحمن",
  "عبدالعزيز", "خالد", "سعيد", "سالم", "سلطان", "فهد", "فيصل", "ناصر",
  "جاسم", "راشد", "رحمد", "طارق", "عمر", "عثمان", "يوسف", "ابراهيم",
  "اسماعيل", "عيسى", "موسى", "ياسر", "عادل", "ماجد", "وليد", "سامي",
  "هاني", "بدر", "حمد", "قاسم", "كريم", "مصطفى",
  "فاطمة", "مريم", "عائشة", "نورة", "حصة", "شيخة", "لطيفة", "موزة",
  "العنود", "جواهر", "سارة", "هند", "اماني", "ريم", "دانة", "غالية",
  "عبدالرحيم", "عبدالكريم", "عبداللطيف", "عبدالحميد", "عبدالوهاب",
  "مبارك", "حمدان", "زايد", "خليفة", "ذياب", "سيف", "نهيان", "طنف",
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await authorize(req);

    const body: ScannerRequest = await req.json().catch(() => ({}));
    const mode = body.mode || "batch";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let result: unknown;

    if (mode === "proposal_evidence") {
      if (!body.proposalId || !body.imageBase64 || !body.evidenceImagePath) {
        throw new Error(
          "proposal_evidence mode requires proposalId, imageBase64 and evidenceImagePath",
        );
      }
      result = await processProposalEvidence(
        supabase,
        body.proposalId,
        body.imageBase64,
        body.evidenceImagePath,
      );
    } else if (mode === "pages") {
      if (!body.contractDocumentId || !body.pages?.length) {
        throw new Error("pages mode requires contractDocumentId and pages[]");
      }
      result = await processRasterizedPages(
        supabase,
        body.contractDocumentId,
        body.pages,
      );
    } else if (mode === "document") {
      if (!body.contractDocumentId) {
        throw new Error("document mode requires contractDocumentId");
      }
      result = await processSingleDocument(supabase, body.contractDocumentId);
    } else {
      result = await processBatch(supabase, Math.min(body.limit || 10, 25));
    }

    return new Response(JSON.stringify({ success: true, ...result as object }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Contract ID Scanner error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---------------------------------------------------------------------------
// Authorization: cron secret OR authenticated user
// ---------------------------------------------------------------------------

async function authorize(req: Request): Promise<void> {
  const secret = req.headers.get("x-scanner-secret");
  const expected = Deno.env.get("CONTRACT_SCANNER_SECRET");
  if (expected && secret === expected) return;

  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) return;

  if (authHeader) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await userClient.auth.getUser();
    if (!error && data?.user) return;
  }

  throw new Error("Unauthorized");
}

async function processProposalEvidence(
  supabase: SupabaseClient,
  proposalId: string,
  imageBase64: string,
  evidenceImagePath: string,
) {
  const { data: proposal, error } = await supabase
    .from("customer_id_scan_proposals")
    .select("id, status, proposed_changes, extracted_data")
    .eq("id", proposalId)
    .in("status", ["pending", "partial"])
    .single();

  if (error || !proposal) throw new Error("Open proposal not found");

  const ocr = await detectTextWithGoogleVision(imageBase64);
  if (!ocr.text) throw new Error("No text detected on the proposal page");

  const changes = Array.isArray(proposal.proposed_changes)
    ? proposal.proposed_changes as ProposedChange[]
    : [];
  const proposedValue = (field: string) =>
    changes.find((change) => change.field === field)?.proposed_value || "";
  const extracted = (proposal.extracted_data || {}) as ExtractedIdData;
  const candidates = [
    `${proposedValue("first_name_ar")} ${proposedValue("last_name_ar")}`.trim(),
    extracted.nameArabic || "",
    `${proposedValue("first_name")} ${proposedValue("last_name")}`.trim(),
    extracted.name || "",
  ].filter(Boolean);

  let crop: NameEvidence["crop"] = null;
  let label: string | null = candidates[0] || null;
  for (const candidate of candidates) {
    crop = findNameEvidenceCrop(ocr.annotations, candidate);
    if (crop) {
      label = candidate;
      break;
    }
  }

  const { error: updateError } = await supabase
    .from("customer_id_scan_proposals")
    .update({
      evidence_image_bucket: "contract-documents",
      evidence_image_path: evidenceImagePath,
      evidence_crop: crop,
      evidence_label: label,
    })
    .eq("id", proposalId);

  if (updateError) throw updateError;
  return { outcome: "evidence_saved", cropFound: !!crop, label };
}

// ---------------------------------------------------------------------------
// Batch mode — pick unprocessed image documents
// ---------------------------------------------------------------------------

async function processBatch(supabase: SupabaseClient, limit: number) {
  const { data: documents, error } = await supabase
    .from("contract_documents")
    .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type")
    .in("document_type", SCANNABLE_DOCUMENT_TYPES)
    .like("mime_type", "image/%")
    .eq("id_scan_status", "pending")
    .not("file_path", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const summary = { processed: 0, proposals: 0, noIdCard: 0, failed: 0 };

  for (const doc of documents || []) {
    const outcome = await scanDocumentImage(supabase, doc);
    summary.processed++;
    if (outcome === "proposal_created") summary.proposals++;
    else if (outcome === "no_id_card") summary.noIdCard++;
    else if (outcome === "failed") summary.failed++;
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Single document mode (on-upload trigger from the client)
// ---------------------------------------------------------------------------

async function processSingleDocument(supabase: SupabaseClient, documentId: string) {
  const { data: doc, error } = await supabase
    .from("contract_documents")
    .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type")
    .eq("id", documentId)
    .single();

  if (error || !doc) throw new Error("Document not found");

  if (!doc.mime_type?.startsWith("image/")) {
    return { outcome: "skipped_not_image" };
  }

  return { outcome: await scanDocumentImage(supabase, doc as ContractDocumentRow) };
}

// ---------------------------------------------------------------------------
// Pages mode — client-rasterized PDF pages
// ---------------------------------------------------------------------------

async function processRasterizedPages(
  supabase: SupabaseClient,
  documentId: string,
  pages: Array<{ pageNumber: number; imageBase64: string; evidenceImagePath?: string }>,
) {
  const { data: doc, error } = await supabase
    .from("contract_documents")
    .select("id, company_id, contract_id, document_type, document_name, file_path, mime_type")
    .eq("id", documentId)
    .single();

  if (error || !doc) throw new Error("Document not found");

  const evidencePages: Array<{
    page: { pageNumber: number; imageBase64: string; evidenceImagePath?: string };
    ocr: OcrResult;
  }> = [];

  for (const page of pages.slice(0, 20)) {
    const ocr = await detectTextWithGoogleVision(page.imageBase64);
    if (ocr.text && looksLikeCustomerIdentityEvidence(ocr.text)) {
      evidencePages.push({ page, ocr });
    }
  }

  if (evidencePages.length === 0) {
    await deletePendingProposal(supabase, doc.id);
    await markDocument(supabase, doc.id, "no_id_card");
    return { outcome: "no_id_card" };
  }

  try {
    // A matching name from the contract party section and the ID-card page
    // becomes repeated evidence; conflicting readings stay low-confidence.
    const combinedText = evidencePages.map(({ ocr }) => ocr.text).join("\n");
    const extracted = extractIdData(combinedText);
    const evidencePage = evidencePages.find(({ ocr }) =>
      extracted.nameArabic &&
      normalizeArabic(ocr.text).includes(normalizeArabic(extracted.nameArabic))
    ) || evidencePages.find(({ ocr }) => looksLikeIdCard(ocr.text)) || evidencePages[0];

    const outcome = await buildAndStoreProposal(
      supabase,
      doc as ContractDocumentRow,
      combinedText,
      evidencePage.page.pageNumber,
      {
        imagePath: evidencePage.page.evidenceImagePath || null,
        crop: null,
        label: extracted.nameArabic || null,
      },
      evidencePage.ocr.annotations,
    );
    if (outcome !== "proposal_created") await deletePendingProposal(supabase, doc.id);
    await markDocument(
      supabase,
      doc.id,
      outcome === "proposal_created" ? "proposal_created" : "no_changes",
    );
    return { outcome, pageNumber: evidencePage.page.pageNumber };
  } catch (error) {
    console.error(`Failed to compare contract and ID names for document ${doc.id}:`, error);
    await markDocument(
      supabase,
      doc.id,
      "failed",
      error instanceof Error ? error.message : String(error),
    );
    return { outcome: "failed" };
  }
}

// ---------------------------------------------------------------------------
// Core: download an image document and scan it
// ---------------------------------------------------------------------------

async function scanDocumentImage(
  supabase: SupabaseClient,
  doc: ContractDocumentRow,
): Promise<"proposal_created" | "no_changes" | "no_id_card" | "failed"> {
  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("contract-documents")
      .download(doc.file_path!);

    if (downloadError || !file) throw downloadError || new Error("Download failed");

    const buffer = await file.arrayBuffer();
    const imageBase64 = arrayBufferToBase64(buffer);

    const ocr = await detectTextWithGoogleVision(imageBase64);
    const text = ocr.text;
    if (!text || !looksLikeCustomerIdentityEvidence(text)) {
      await deletePendingProposal(supabase, doc.id);
      await markDocument(supabase, doc.id, "no_id_card");
      return "no_id_card";
    }

    const outcome = await buildAndStoreProposal(
      supabase,
      doc,
      text,
      null,
      {
        imagePath: doc.file_path,
        crop: null,
        label: null,
      },
      ocr.annotations,
    );
    if (outcome !== "proposal_created") {
      await deletePendingProposal(supabase, doc.id);
    }
    await markDocument(
      supabase,
      doc.id,
      outcome === "proposal_created" ? "proposal_created" : "no_changes",
    );
    return outcome;
  } catch (error) {
    console.error(`❌ Failed to scan document ${doc.id}:`, error);
    await markDocument(
      supabase,
      doc.id,
      "failed",
      error instanceof Error ? error.message : String(error),
    );
    return "failed";
  }
}

// ---------------------------------------------------------------------------
// Google Vision text detection
// ---------------------------------------------------------------------------

async function detectTextWithGoogleVision(imageBase64: string): Promise<OcrResult> {
  const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
  if (!apiKey) throw new Error("Google Vision API key not configured");

  const cleanBase64 = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: cleanBase64 },
          features: [
            { type: "TEXT_DETECTION", maxResults: 50 },
            { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
          ],
          imageContext: { languageHints: ["ar", "en"] },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const annotations = (data.responses?.[0]?.textAnnotations || []) as OcrAnnotation[];
  return {
    text: data.responses?.[0]?.fullTextAnnotation?.text || annotations[0]?.description || "",
    annotations,
  };
}

function normalizeForEvidence(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF0-9A-Za-z]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function annotationBox(annotation: OcrAnnotation) {
  const vertices = annotation.boundingPoly?.vertices || [];
  const xs = vertices.map((v) => Number(v.x || 0));
  const ys = vertices.map((v) => Number(v.y || 0));
  if (xs.length === 0 || ys.length === 0) return null;
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  if (maxX <= minX || maxY <= minY) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function findNameEvidenceCrop(
  annotations: OcrAnnotation[],
  extractedName?: string | null,
): NameEvidence["crop"] {
  if (!extractedName) return null;
  const tokens = normalizeForEvidence(extractedName).split(" ").filter((token) => token.length > 1);
  if (tokens.length === 0) return null;

  const matchedAnnotations = annotations
    .slice(1)
    .filter((annotation) => {
      const text = normalizeForEvidence(annotation.description || "");
      return text && tokens.includes(text);
    });
  const matchedBoxes = matchedAnnotations
    .map(annotationBox)
    .filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;

  if (matchedBoxes.length === 0) return null;
  const minX = Math.min(...matchedBoxes.map((box) => box.x));
  const minY = Math.min(...matchedBoxes.map((box) => box.y));
  const maxX = Math.max(...matchedBoxes.map((box) => box.x + box.width));
  const maxY = Math.max(...matchedBoxes.map((box) => box.y + box.height));
  const padding = 100;
  const firstVertices = matchedAnnotations[0]?.boundingPoly?.vertices || [];
  const topLeft = firstVertices[0];
  const topRight = firstVertices[1];
  const edgeX = Number(topRight?.x || 0) - Number(topLeft?.x || 0);
  const edgeY = Number(topRight?.y || 0) - Number(topLeft?.y || 0);
  const rotation = Math.abs(edgeY) > Math.abs(edgeX)
    ? (edgeY >= 0 ? 270 : 90)
    : (edgeX < 0 ? 180 : 0);
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.max(1, maxX - minX + padding * 2),
    height: Math.max(1, maxY - minY + padding * 2),
    rotation,
  };
}

// ---------------------------------------------------------------------------
// ID card detection — decides whether a page contains a Qatari ID card
// ---------------------------------------------------------------------------

function looksLikeIdCard(text: string): boolean {
  const hasElevenDigitId = /\b\d{11}\b/.test(text);
  const hasIdKeywords =
    /قطر|Qatar|الجنسية|Nationality|بطاقة|CARD|إقامة|Residence|Permit|الشخصية/i.test(
      text,
    );
  return hasElevenDigitId && hasIdKeywords;
}

function looksLikeContractPartyIdentity(text: string): boolean {
  const hasElevenDigitId = /\b\d{11}\b/.test(text);
  const hasPartyLabel = /الطرف\s*الثاني|المستأجر|اسم\s*المستأجر/i.test(text);
  const hasIdentityLabel = /بطاقة|الرقم\s*الشخصي|رقم\s*الهوية|الجنسية/i.test(text);
  return hasElevenDigitId && hasPartyLabel && hasIdentityLabel;
}

function looksLikeCustomerIdentityEvidence(text: string): boolean {
  return looksLikeIdCard(text) || looksLikeContractPartyIdentity(text);
}

// ---------------------------------------------------------------------------
// Structured extraction
// ---------------------------------------------------------------------------

const DATE_VALUE_RE = /^(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})$/;
const DOB_LABEL_RE = /^(?:D\.?O\.?B\.?|Date\s+of\s+Birth|DATE\s+OF\s+BIRTH|تاريخ\s+الميلاد)\s*:?$/i;
const EXPIRY_LABEL_RE = /^(?:Exp(?:iry)?\.?(?:\s+Date)?|الصلاحية|تاريخ\s+الانتهاء|انتهاء\s+البطاقة)\s*:?$/i;

// English -> Arabic mapping for common nationalities (fallback: keep English)
const NATIONALITY_AR_MAP: Record<string, string> = {
  TUNISIA: "تونس", EGYPT: "مصر", JORDAN: "الأردن", SYRIA: "سوريا",
  LEBANON: "لبنان", INDIA: "الهند", PAKISTAN: "باكستان", BANGLADESH: "بنغلاديش",
  PHILIPPINES: "الفلبين", "SRI LANKA": "سريلانكا", NEPAL: "نيبال",
  SUDAN: "السودان", MOROCCO: "المغرب", ALGERIA: "الجزائر", YEMEN: "اليمن",
  IRAQ: "العراق", PALESTINE: "فلسطين", INDONESIA: "إندونيسيا", KENYA: "كينيا",
  ETHIOPIA: "إثيوبيا", UGANDA: "أوغندا", "SAUDI ARABIA": "السعودية",
  QATAR: "قطر", BAHRAIN: "البحرين", KUWAIT: "الكويت", OMAN: "عمان",
  "UNITED ARAB EMIRATES": "الإمارات", UAE: "الإمارات",
  ERITREA: "إريتريا", SOMALIA: "الصومال", DJIBOUTI: "جيبوتي",
  GHANA: "غانا", NIGERIA: "نيجيريا", TANZANIA: "تنزانيا", CHAD: "تشاد",
  MALI: "مالي", SENEGAL: "السنغال", MAURITANIA: "موريتانيا",
  "SOUTH AFRICA": "جنوب أفريقيا", TURKEY: "تركيا", IRAN: "إيران",
  AFGHANISTAN: "أفغانستان", CHINA: "الصين", THAILAND: "تايلاند",
  MALAYSIA: "ماليزيا", "SOUTH KOREA": "كوريا الجنوبية", JAPAN: "اليابان",
};

// Words that are field labels, never values — guards against greedy captures
const ARABIC_LABEL_WORDS = new Set([
  "المهنة", "الاسم", "تاريخ", "الصلاحية", "الجنسية", "الرقم", "الشخصي", "الميلاد",
  "بطاقة", "الهوية", "الإقامة", "اقامة", "رخصة", "جواز", "السفر",
]);

// Arabic gentilic adjective -> country name (تونسي -> تونس)
const AR_GENTILIC_TO_COUNTRY: Record<string, string> = {
  تونسي: "تونس", مصري: "مصر", هندي: "الهند", باكستاني: "باكستان",
  بنغالي: "بنغلاديش", بنغلاديشي: "بنغلاديش", فلبيني: "الفلبين",
  سوري: "سوريا", اردني: "الأردن", أردني: "الأردن", لبناني: "لبنان",
  سوداني: "السودان", مغربي: "المغرب", جزائري: "الجزائر", يمني: "اليمن",
  عراقي: "العراق", فلسطيني: "فلسطين", نيبالي: "نيبال",
  سريلانكي: "سريلانكا", اندونيسي: "إندونيسيا", إندونيسي: "إندونيسيا",
  كيني: "كينيا", اثيوبي: "إثيوبيا", إثيوبي: "إثيوبيا",
  اوغندي: "أوغندا", أوغندي: "أوغندا", قطري: "قطر", سعودي: "السعودية",
  كويتي: "الكويت", بحريني: "البحرين", عماني: "عمان",
  اماراتي: "الإمارات", إماراتي: "الإمارات",
  اريتري: "إريتريا", إريتري: "إريتريا", صومالي: "الصومال",
  جيبوتي: "جيبوتي", غاني: "غانا", نيجيري: "نيجيريا", تنزاني: "تنزانيا",
  تشادي: "تشاد", مالي: "مالي", سنغالي: "السنغال",
  موريتاني: "موريتانيا", تركي: "تركيا", ايراني: "إيران", إيراني: "إيران",
  افغاني: "أفغانستان", أفغاني: "أفغانستان", صيني: "الصين",
  تايلندي: "تايلاند", ماليزي: "ماليزيا", ياباني: "اليابان",
};

/**
 * English field labels that must never be treated as a person's name.
 * Cards read "QID NUMBER", "NAME", "DATE OF BIRTH" etc. — a naive
 * [A-Z\s]+ capture grabs those instead of the actual name.
 */
const EN_LABEL_WORDS = new Set([
  "QID", "NUMBER", "NAME", "DATE", "BIRTH", "EXPIRY", "NATIONALITY",
  "OCCUPATION", "CARD", "QATAR", "STATE", "OF", "THE", "RESIDENCE",
  "RESIDENCY", "PERMIT", "ID", "NO", "SERIAL", "TYPE", "EMPLOYER",
  "HOLDER", "HOLDERS", "SIGNATURE", "LICENSE", "LICENCE", "DRIVING",
  "BLOOD", "FIRST", "ISSUE", "VALIDITY", "TEL", "GENERAL", "DIRECTOR",
  "DIRECTORATE", "PASSPORTS", "PASSPORT", "MINISTRY", "INTERIOR",
  "TRAFFIC", "DEPARTMENT", "AUTHORITY", "GR", "NAT", "DOB", "EXP",
  "GENDER", "SEX", "MALE", "FEMALE", "PERSONAL", "ADDRESS",
]);

/**
 * Trim an ALL-CAPS capture to the words before the first label word.
 * Returns undefined when nothing usable remains.
 * "QID NUMBER" -> undefined, "HAMZA QID NUMBER" -> "HAMZA"
 */
function cleanEnglishName(raw: string): string | undefined {
  const words = raw.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const w of words) {
    if (EN_LABEL_WORDS.has(w)) break;
    if (!/^[A-Z][A-Z'.-]*$/.test(w)) break; // stop at non-name tokens
    kept.push(w);
  }
  if (kept.length === 0 || kept.length > 5) return undefined;
  return kept.join(" ");
}
/**
 * A plausible Arabic nationality is a gentilic adjective — these always end
 * with ي (تونسي، مصري، هندي...). This rejects OCR neighbours like "بطاقة"
 * or "المهنة" that sit next to the الجنسية label in flattened text.
 */
function isPlausibleArabicNationality(word: string): boolean {
  if (ARABIC_LABEL_WORDS.has(word)) return false;
  if (word.length < 3 || word.length > 15) return false;
  return word.endsWith("ي");
}

/**
 * Pair a run of date labels with the date values that follow them.
 * Google Vision often reads Qatari ID cards as a block of labels followed by
 * a block of values:
 *   D.O.B.:        تاريخ الميلاد:
 *   Expiry:   ->   الصلاحية:
 *   21/10/2002     21/10/2002
 *   12/05/2026     12/05/2026
 * Pairing by order fixes the classic "DOB extracted as expiry" mixup.
 */
function extractDatesByLabelRuns(
  lines: string[],
): { dateOfBirth?: string; idExpiry?: string } {
  const result: { dateOfBirth?: string; idExpiry?: string } = {};

  interface DateLabel { kind: "dob" | "expiry"; index: number }
  const labels: DateLabel[] = [];
  lines.forEach((line, i) => {
    if (DOB_LABEL_RE.test(line)) labels.push({ kind: "dob", index: i });
    else if (EXPIRY_LABEL_RE.test(line)) labels.push({ kind: "expiry", index: i });
  });

  // Group into runs of (near-)consecutive label lines
  const runs: DateLabel[][] = [];
  for (const label of labels) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && label.index - lastRun[lastRun.length - 1].index <= 1) {
      lastRun.push(label);
    } else {
      runs.push([label]);
    }
  }

  for (const run of runs) {
    const runEnd = run[run.length - 1].index;
    // Collect up to run.length date values within the next 10 lines
    const values: string[] = [];
    for (let i = runEnd + 1; i < Math.min(runEnd + 11, lines.length) && values.length < run.length; i++) {
      if (DATE_VALUE_RE.test(lines[i])) {
        const parsed = parseDate(lines[i]);
        if (parsed) values.push(parsed);
      } else if (values.length > 0) {
        break; // values block ended
      }
    }
    // Pair in order
    run.forEach((label, k) => {
      const value = values[k];
      if (!value) return;
      if (label.kind === "dob" && !result.dateOfBirth) result.dateOfBirth = value;
      if (label.kind === "expiry" && !result.idExpiry) result.idExpiry = value;
    });
  }

  return result;
}

/** Plausibility: a person on a rental contract is an adult; RP expiry 2010+ */
function isPlausibleDob(isoDate: string): boolean {
  const year = parseInt(isoDate.substring(0, 4));
  return year >= 1920 && year <= 2015;
}

function isPlausibleExpiry(isoDate: string): boolean {
  const year = parseInt(isoDate.substring(0, 4));
  return year >= 2010 && year <= 2100;
}

/**
 * Extract structured ID data from raw OCR text.
 * Uses line-aware label/value pairing first, flat regexes as fallback.
 */
function sanitizeArabicNameCandidate(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  const stopPhrases = [
    "\u062f\u0648\u0644\u0629 \u0642\u0637\u0631",
    "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062f\u0627\u062e\u0644\u064a\u0629",
    "\u0648\u0632\u0627\u0631\u0629",
    "\u0627\u0644\u062f\u0627\u062e\u0644\u064a\u0629",
    "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    "\u0627\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
    "\u0627\u0644\u062c\u0646\u0633\u064a\u0629",
    "\u0627\u0644\u0645\u0647\u0646\u0629",
    "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u064a\u0644\u0627\u062f",
  ];
  let end = normalized.length;
  for (const phrase of stopPhrases) {
    const index = normalized.indexOf(phrase);
    if (index >= 0) end = Math.min(end, index);
  }
  return normalized.slice(0, end).trim().replace(/[\s:،,.-]+$/g, "");
}

function isPlausibleArabicPersonName(value: string): boolean {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 7) return false;
  return words.every((word) =>
    /^[\u0600-\u06FF]+$/.test(word) && !ARABIC_LABEL_WORDS.has(word)
  );
}

function extractArabicNameCandidates(cleanText: string): string[] {
  const candidates: string[] = [];
  const patterns = [
    /الاسم\s*[:\.]?\s*([؀-ۿ][؀-ۿ\s]{3,80}?)(?=\s+[A-Za-z]|\s*\d|$)/g,
    /(?:الطرف\s*الثاني|المستأجر|اسم\s*المستأجر)\s*[:\.]?\s*([؀-ۿ][؀-ۿ\s]{3,80}?)(?=\s*(?:الجنسية|بطاقة|الرقم|رقم|رخصة|جوال|هاتف|العنوان|ويمثل|$))/g,
  ];
  for (const pattern of patterns) {
    for (const match of cleanText.matchAll(pattern)) {
      const candidate = sanitizeArabicNameCandidate(match[1]);
      if (isPlausibleArabicPersonName(candidate)) candidates.push(candidate);
    }
  }
  return candidates;
}

function selectArabicNameConsensus(candidates: string[]): {
  name?: string;
  occurrences: number;
} {
  const grouped = new Map<string, { value: string; count: number }>();
  for (const candidate of candidates) {
    const key = normalizeArabic(candidate);
    const current = grouped.get(key);
    grouped.set(key, {
      value: current?.value || candidate,
      count: (current?.count || 0) + 1,
    });
  }
  const best = [...grouped.values()].sort((a, b) =>
    b.count - a.count || b.value.split(/\s+/).length - a.value.split(/\s+/).length
  )[0];
  return best ? { name: best.value, occurrences: best.count } : { occurrences: 0 };
}

function extractIdData(text: string): ExtractedIdData {
  const data: ExtractedIdData = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cleanText = text.replace(/\s+/g, " ").trim();

  // --- National ID ---
  const idPatterns = [
    /(?:ID\s*\.\s*(?:No\s*\.\s*?|Number\s*?)?|QID)\s*[:\.]?\s*(\d{11})/i,
    /ID\s*No\s*[:\.]?\s*(\d{11})/i,
    /ID\s*Number\s*[:\.]?\s*(\d{11})/i,
    /(?:رقم\s*(?:البطاقة|الهوية)|QID)\s*[:\.]?\s*(\d{11})/i,
    /(?:إذن\s*إقامة)\s*[:\.]?\s*(\d{11})/i,
    /\b(\d{11})\b/,
  ];
  for (const pattern of idPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      data.nationalId = match[1];
      break;
    }
  }

  // --- Dates: line-aware label/value pairing first ---
  const runDates = extractDatesByLabelRuns(lines);
  if (runDates.dateOfBirth && isPlausibleDob(runDates.dateOfBirth)) {
    data.dateOfBirth = runDates.dateOfBirth;
  }
  if (runDates.idExpiry && isPlausibleExpiry(runDates.idExpiry)) {
    data.idExpiry = runDates.idExpiry;
  }

  // Fallback: flat regexes (inline "D.O.B: 21/10/2002" layouts)
  if (!data.dateOfBirth) {
    const dobPatterns = [
      /(?:D\.?O\.?B\.?|Date\s+of\s+Birth|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
      /(?:D\.?O\.?B\.?|DOB|تاريخ\s+الميلاد)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    ];
    for (const pattern of dobPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const parsed = parseDate(match[1]);
        if (parsed && isPlausibleDob(parsed)) {
          data.dateOfBirth = parsed;
          break;
        }
      }
    }
  }

  if (!data.idExpiry) {
    const expiryPatterns = [
      /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء|الصلاحية)\s*[:\.]?\s*(\d{2}[-/]\d{2}[-/]\d{4})/i,
      /(?:Exp(?:iry|\.?)?(?:\s+Date)?|انتهاء\s+البطاقة|تاريخ\s+الانتهاء|الصلاحية)\s*[:\.]?\s*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    ];
    for (const pattern of expiryPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const parsed = parseDate(match[1]);
        // Guard: never accept an "expiry" that equals the DOB — that is the
        // classic label/value misalignment
        if (parsed && isPlausibleExpiry(parsed) && parsed !== data.dateOfBirth) {
          data.idExpiry = parsed;
          break;
        }
      }
    }
  }

  // --- Nationality (English): non-greedy, stops before the next field label ---
  const natEnMatch = cleanText.match(
    /Nationality\s*[:\.]?\s*([A-Z]{3,}(?:\s[A-Z]{3,})*?)\s*(?=Occupation|Name|Date|D\.?O\.?B|Expiry|الجنسية|المهنة|الاسم|$)/i,
  ) || cleanText.match(/\bNAT\.?\s+([A-Z]{3,}(?:\s[A-Z]{3,})*?)\s*(?=DATE|BLOOD|FIRST|VALIDITY|D\.?O\.?B|Occupation|Name|Expiry|$)/);
  if (natEnMatch) {
    data.nationality = natEnMatch[1].trim();
    const mapped = NATIONALITY_AR_MAP[data.nationality.toUpperCase()];
    if (mapped) data.nationalityArabic = mapped;
  }

  // --- Nationality (Arabic): only accept gentilic adjectives (تونسي، مصري...) ---
  if (!data.nationalityArabic) {
    const arMatches = cleanText.matchAll(/الجنسية\s*[:\s]\s*([؀-ۿ،.]{3,20})/g);
    for (const m of arMatches) {
      // First word only, stripped of trailing punctuation (تونسية، -> تونسية)
      const candidate = m[1].split(/\s+/)[0].replace(/[،.,؛:]+$/g, "").trim();
      // Feminine gentilic -> masculine for the country lookup (تونسية -> تونسي)
      const lookup = candidate.endsWith("ية")
        ? candidate.slice(0, -1) + "ي"
        : candidate;
      if (AR_GENTILIC_TO_COUNTRY[lookup]) {
        data.nationalityArabic = AR_GENTILIC_TO_COUNTRY[lookup];
        break;
      }
      if (isPlausibleArabicNationality(candidate)) {
        data.nationalityArabic = candidate;
        break;
      }
    }
  }

  // --- English name: try every candidate, accept the first that is
  //     actually a name (not field labels like "QID NUMBER") ---
  const nameEnPatterns = [
    /Name\s*[:\.]\s*([A-Z][A-Z\s'.-]{2,60})/g,
    /NAME\s+([A-Z][A-Z\s'.-]{2,60})/g,
  ];
  for (const pattern of nameEnPatterns) {
    for (const match of cleanText.matchAll(pattern)) {
      const cleaned = cleanEnglishName(match[1]);
      if (!cleaned || cleaned.split(/\s+/).length < 2) continue;
      data.name = cleaned;
      const parts = cleaned.split(/\s+/);
      data.firstName = parts[0];
      data.lastName = parts.slice(1).join(" ");
      break;
    }
    if (data.name) break;
  }

  // --- Arabic name: collect every ID-card occurrence and prefer consensus. ---
  const arabicConsensus = selectArabicNameConsensus(extractArabicNameCandidates(cleanText));
  if (arabicConsensus.name) {
    const fullName = arabicConsensus.name;
    data.nameArabic = fullName;
    data.nameArabicOccurrences = arabicConsensus.occurrences;
    const parts = fullName.split(/\s+/).filter(Boolean);
    data.firstNameArabic = parts[0];
    data.lastNameArabic = parts.slice(1).join(" ");
    const englishWordCount = data.name?.split(/\s+/).filter(Boolean).length || 0;
    data.nameCrossScriptConsistent = !englishWordCount ||
      Math.abs(parts.length - englishWordCount) <= 1;
  }

  return data;
}

function parseDate(dateStr: string): string | undefined {
  try {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return undefined;
    let year: number, month: number, day: number;
    if (parts[0].length === 4) {
      [year, month, day] = [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
    } else {
      [day, month, year] = [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
    }
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return undefined;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Smart name correction
// ---------------------------------------------------------------------------

/** Normalize Arabic text for comparison: hamza forms, taa marbuta, diacritics,
 *  and Persian/Urdu letter variants (ی -> ي, ک -> ك) */
function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ْٰـ]/g, "") // diacritics + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ی/g, "ي") // Farsi yeh (U+06CC)
    .replace(/ک/g, "ك") // Keheh (U+06A9)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = temp;
    }
  }
  return dp[n];
}

/**
 * Correct an OCR-extracted Arabic first name.
 * Returns the corrected name, its confidence and the method used.
 * Example: "محمممد" -> { name: "محمد", confidence: 0.9, method: "dictionary" }
 */
async function correctArabicName(
  rawName: string,
): Promise<{ name: string; confidence: number; method: ProposedChange["method"] }> {
  const normalized = normalizeArabic(rawName);
  const parts = normalized.split(" ").filter(Boolean);

  // 1) Dictionary pass on the first name token
  if (parts.length > 0) {
    let best: { name: string; distance: number } | null = null;
    for (const dictName of COMMON_ARABIC_NAMES) {
      const normalizedDict = normalizeArabic(dictName);
      const distance = levenshtein(parts[0], normalizedDict);
      if (best === null || distance < best.distance) {
        best = { name: dictName, distance };
      }
    }
    if (best && best.distance === 0) {
      // Exact dictionary match — high confidence
      return { name: rawName, confidence: 0.95, method: "dictionary" };
    }
    if (best && best.distance <= 2) {
      // Close match ("محمممد" -> "محمد") — fix the first token, keep the rest
      const corrected = [best.name, ...rawName.split(/\s+/).slice(1)].join(" ");
      const confidence = best.distance === 1 ? 0.9 : 0.8;
      if (confidence >= LLM_REVIEW_THRESHOLD) {
        return { name: corrected, confidence, method: "dictionary" };
      }
      // Below threshold — ask the LLM to confirm
      const llmResult = await correctNameWithLLM(rawName, best.name);
      if (llmResult) return llmResult;
      return { name: corrected, confidence, method: "dictionary" };
    }
  }

  // 2) Unknown name — LLM as judge
  const llmResult = await correctNameWithLLM(rawName);
  if (llmResult) return llmResult;

  // 3) Give up — return raw with low confidence (won't be proposed)
  return { name: rawName, confidence: 0.5, method: "ocr" };
}

/** Ask LongCat to correct/validate an OCR'd Arabic name. */
async function correctNameWithLLM(
  rawName: string,
  suggestion?: string,
): Promise<{ name: string; confidence: number; method: "llm" } | null> {
  const apiKey = getLongCatApiKey();
  if (!apiKey) return null;

  try {
    const prompt = suggestion
      ? `استخرج OCR هذا الاسم العربي من بطاقة هوية قطرية: "${rawName}". الاقتراح الأولي للتصحيح هو "${suggestion}". هل الاقتراح صحيح؟ أعد JSON فقط بالشكل: {"correctedName": "...", "confidence": 0.0-1.0}. لا تضف أي نص آخر.`
      : `استخرج OCR هذا الاسم العربي من بطاقة هوية قطرية: "${rawName}". ما الاسم العربي الصحيح المحتمل؟ أعد JSON فقط بالشكل: {"correctedName": "...", "confidence": 0.0-1.0}. إذا كان الاسم صحيحاً أصلاً أعده كما هو بثقة عالية. لا تضف أي نص آخر.`;

    const response = await fetch(LONGCAT_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: buildLongCatHeaders(apiKey),
      body: JSON.stringify({
        model: LONGCAT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    const content: string = result.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.correctedName || typeof parsed.correctedName !== "string") return null;

    const confidence = Math.min(Math.max(Number(parsed.confidence) || 0.7, 0), 1);
    return { name: parsed.correctedName.trim(), confidence, method: "llm" };
  } catch (error) {
    console.warn("⚠️ LLM name correction failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Build proposals by comparing extracted data with the customer record
// ---------------------------------------------------------------------------

async function buildAndStoreProposal(
  supabase: SupabaseClient,
  doc: ContractDocumentRow,
  rawText: string,
  pageNumber: number | null,
  evidence: NameEvidence = {},
  annotations: OcrAnnotation[] = [],
): Promise<"proposal_created" | "no_changes"> {
  // Get the contract's customer
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("customer_id")
    .eq("id", doc.contract_id)
    .single();

  if (contractError || !contract?.customer_id) {
    throw new Error("Contract or customer not found");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, first_name_ar, last_name_ar, national_id, national_id_expiry, nationality, date_of_birth",
    )
    .eq("id", contract.customer_id)
    .single();

  if (customerError || !customer) throw new Error("Customer not found");

  const extracted = extractIdData(rawText);
  const changes: ProposedChange[] = [];
  let evidenceLabel = evidence.label || extracted.nameArabic || extracted.name || null;

  const differs = (current: string | null, proposed?: string) =>
    !!proposed &&
    normalizeArabic(String(current || "")) !== normalizeArabic(proposed);

  // --- Identity confirmation: strong signals that this ID card really
  //     belongs to THIS customer. When confirmed, corroborated fields
  //     (like the English rendering of a matching Arabic name) deserve
  //     high confidence instead of the default medium one.
  const nationalIdMatches =
    !!extracted.nationalId && customer.national_id === extracted.nationalId;
  const arabicNameMatches =
    !!extracted.nameArabic &&
    normalizeArabic(`${customer.first_name_ar || ""} ${customer.last_name_ar || ""}`) ===
      normalizeArabic(extracted.nameArabic);
  if (
    customer.national_id &&
    extracted.nationalId &&
    customer.national_id !== extracted.nationalId
  ) {
    throw new Error("Scanned identity number does not match the contract customer");
  }
  const identityConfirmed = nationalIdMatches ||
    (!customer.national_id && arabicNameMatches);

  // Confidence levels: corroborated by identity confirmation vs raw pattern match
  const CONF_NATIONALITY = identityConfirmed ? 0.9 : 0.85;

  // --- National ID (highest value field) ---
  if (!customer.national_id && extracted.nationalId && identityConfirmed) {
    changes.push({
      field: "national_id",
      current_value: customer.national_id,
      proposed_value: extracted.nationalId!,
      confidence: 0.95,
      method: "ocr",
    });
  }

  // --- ID expiry ---
  if (
    identityConfirmed &&
    extracted.idExpiry &&
    customer.national_id_expiry !== extracted.idExpiry
  ) {
    changes.push({
      field: "national_id_expiry",
      current_value: customer.national_id_expiry,
      proposed_value: extracted.idExpiry,
      confidence: 0.9,
      method: "ocr",
    });
  }

  // --- Date of birth ---
  if (
    identityConfirmed &&
    extracted.dateOfBirth &&
    customer.date_of_birth !== extracted.dateOfBirth
  ) {
    changes.push({
      field: "date_of_birth",
      current_value: customer.date_of_birth,
      proposed_value: extracted.dateOfBirth,
      confidence: 0.9,
      method: "ocr",
    });
  }

  // --- Nationality ---
  const proposedNationality = extracted.nationalityArabic || extracted.nationality;
  if (identityConfirmed && differs(customer.nationality, proposedNationality)) {
    changes.push({
      field: "nationality",
      current_value: customer.nationality,
      proposed_value: proposedNationality!,
      confidence: CONF_NATIONALITY,
      method: "ocr",
    });
  }

  // --- Arabic official name ---
  // Compare the FULL name, not each part: "محمد عزيز / محسن جلالي" and
  // "محمد / عزيز محسن جلالي" are the same person — proposing a reshuffle is noise.
  if (
    identityConfirmed &&
    extracted.nameArabic &&
    isPlausibleArabicPersonName(extracted.nameArabic)
  ) {
    const proposedArabicName = sanitizeArabicNameCandidate(extracted.nameArabic);
    const occurrenceConfidence = (extracted.nameArabicOccurrences || 0) >= 2 ? 0.95 : 0.85;
    const nameConfidence = extracted.nameCrossScriptConsistent === false
      ? Math.min(occurrenceConfidence, 0.75)
      : occurrenceConfidence;
    evidenceLabel = proposedArabicName;
    const currentFullAr = normalizeArabic(
      `${customer.first_name_ar || ""} ${customer.last_name_ar || ""}`,
    );
    const proposedFullAr = normalizeArabic(proposedArabicName);
    const fullNameMatches = currentFullAr === proposedFullAr;

    if (!fullNameMatches && nameConfidence >= MIN_PROPOSAL_CONFIDENCE) {
      const proposedParts = proposedArabicName.split(/\s+/).filter(Boolean);
      const proposedFirstAr = proposedParts[0];
      const proposedLastAr = proposedParts.slice(1).join(" ") || null;

      if (differs(customer.first_name_ar, proposedFirstAr)) {
        changes.push({
          field: "first_name_ar",
          current_value: customer.first_name_ar,
          proposed_value: proposedFirstAr,
          confidence: nameConfidence,
          method: "ocr",
        });
      }
      if (proposedLastAr && differs(customer.last_name_ar, proposedLastAr)) {
        changes.push({
          field: "last_name_ar",
          current_value: customer.last_name_ar,
          proposed_value: proposedLastAr,
          confidence: nameConfidence,
          method: "ocr",
        });
      }
    }
  }

  // English OCR is supporting evidence only. The customer table's canonical
  // individual-name fields are Arabic, so English text must never overwrite them.

  // Keep only confident proposals
  const confidentChanges = changes.filter(
    (c) => c.confidence >= MIN_PROPOSAL_CONFIDENCE,
  );

  if (confidentChanges.length === 0) return "no_changes";

  const overallConfidence =
    confidentChanges.reduce((sum, c) => sum + c.confidence, 0) /
    confidentChanges.length;

  const proposalPayload = {
    company_id: doc.company_id,
    contract_id: doc.contract_id,
    customer_id: customer.id,
    contract_document_id: doc.id,
    page_number: pageNumber,
    status: "pending",
    proposed_changes: confidentChanges,
    extracted_data: extracted,
    raw_text: rawText.substring(0, 5000),
    overall_confidence: overallConfidence,
    evidence_image_bucket: "contract-documents",
    evidence_image_path: evidence.imagePath || doc.file_path,
    evidence_crop: evidence.crop || findNameEvidenceCrop(annotations, evidenceLabel),
    evidence_label: evidenceLabel,
  };

  // Replace any existing pending proposal for this document (re-scan case)
  const { data: existing } = await supabase
    .from("customer_id_scan_proposals")
    .select("id")
    .eq("contract_document_id", doc.id)
    .eq("status", "pending")
    .maybeSingle();

  const { error: writeError } = existing
    ? await supabase
        .from("customer_id_scan_proposals")
        .update(proposalPayload)
        .eq("id", existing.id)
    : await supabase
        .from("customer_id_scan_proposals")
        .insert(proposalPayload);

  if (writeError) {
    console.error("❌ Failed to store proposal:", writeError);
    throw writeError;
  }

  console.log(
    `✅ Proposal created for document ${doc.id}: ${confidentChanges.length} field(s)`,
  );
  return "proposal_created";
}

// ---------------------------------------------------------------------------
// Document status bookkeeping
// ---------------------------------------------------------------------------

/**
 * Remove a stale pending proposal for a document (used when a re-scan
 * concludes there is nothing to propose anymore).
 */
async function deletePendingProposal(
  supabase: SupabaseClient,
  documentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("customer_id_scan_proposals")
    .delete()
    .eq("contract_document_id", documentId)
    .eq("status", "pending");

  if (error) {
    console.warn(`⚠️ Failed to delete stale proposal for ${documentId}:`, error);
  }
}

/**
 * Mark a document's ID-scan state. We only touch id_scan_status (a column
 * dedicated to this feature) — processing_status and ai_match_status belong
 * to other pipelines and must not be modified here.
 */
async function markDocument(
  supabase: SupabaseClient,
  documentId: string,
  scanStatus: string,
  errorMessage?: string,
): Promise<void> {
  const update: Record<string, unknown> = { id_scan_status: scanStatus };
  if (errorMessage) update.processing_error = errorMessage.substring(0, 500);

  const { error } = await supabase
    .from("contract_documents")
    .update(update)
    .eq("id", documentId);

  if (error) {
    console.warn(`⚠️ Failed to update document ${documentId} status:`, error);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
