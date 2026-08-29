import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};
const allowedOrigins = new Set([
  "https://www.alaraf.online",
  "https://alaraf.online",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const requestUrl = new URL(req.url);
  const token = requestUrl.searchParams.get("token")?.trim() || "";
  const wantsJson = requestUrl.searchParams.get("format") === "json"
    || (req.headers.get("accept") || "").includes("application/json");
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return endpointResponse(req, wantsJson, "الرابط غير صالح أو ناقص.", false, 400, "invalid_token");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false } },
  );

  if (req.method === "GET") {
    const resolution = await resolveToken(supabase, token);
    if (!resolution.valid) {
      return endpointResponse(
        req,
        wantsJson,
        messageForReason(resolution.reason),
        false,
        410,
        String(resolution.reason || "invalid_or_expired"),
      );
    }
    if (wantsJson) {
      return jsonResponse(req, {
        success: true,
        valid: true,
        contractNumber: String(resolution.contractNumber || ""),
        reason: String(resolution.reason || "missing"),
        expiresAt: String(resolution.expiresAt || ""),
        maxFileBytes: MAX_FILE_BYTES,
      });
    }
    return uploadForm(token, String(resolution.contractNumber || ""));
  }
  if (req.method !== "POST") {
    return endpointResponse(req, wantsJson, "الطريقة غير مدعومة.", false, 405, "method_not_allowed");
  }

  const claimNonce = crypto.randomUUID();
  const { data: claim, error: claimError } = await supabase.rpc(
    "claim_missing_contract_pdf_upload_token_v1",
    { p_token: token, p_claim_nonce: claimNonce },
  );
  if (claimError || claim?.claimed !== true || claim?.valid !== true) {
    const reason = String(claim?.reason || claimError?.message || "claim_failed");
    return endpointResponse(req, wantsJson, messageForReason(reason), false, 409, reason);
  }

  let storagePath: string | null = null;
  let documentId: string | null = null;
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      throw new UploadError("يجب اختيار ملف PDF من النموذج.", 400);
    }
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES + 1024 * 1024) {
      throw new UploadError("حجم الطلب أكبر من الحد المسموح.", 413);
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new UploadError("لم يتم اختيار ملف.", 400);
    if (file.size < 5 || file.size > MAX_FILE_BYTES) {
      throw new UploadError("حجم الملف غير مسموح. الحد الأقصى 15 ميجابايت.", 413);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== "%PDF-") throw new UploadError("الملف ليس PDF صالحاً.", 415);

    const companyId = requireUuid(claim.companyId, "companyId");
    const contractId = requireUuid(claim.contractId, "contractId");
    storagePath = `${companyId}/${contractId}/secure-upload/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("contract-documents")
      .upload(storagePath, bytes, {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: document, error: documentError } = await supabase
      .from("contract_documents")
      .insert({
        company_id: companyId,
        contract_id: contractId,
        document_type: "signed_contract",
        document_name: `نسخة عقد مرفوعة من الرابط الآمن - ${new Date().toISOString().slice(0, 10)}`,
        file_path: storagePath,
        file_size: file.size,
        mime_type: "application/pdf",
        is_required: true,
        notes: "Secure one-use missing-contract-PDF upload; identity verification pending",
        legal_identity_match_status: "pending",
        legal_evidence_state: "active",
      })
      .select("id,company_id,contract_id,file_path,legal_identity_match_status")
      .single();
    if (documentError || !document) throw documentError || new Error("Document row was not created");
    documentId = String(document.id);

    const { data: consumed, error: consumeError } = await supabase.rpc(
      "consume_missing_contract_pdf_upload_token_v1",
      { p_token: token, p_claim_nonce: claimNonce, p_document_id: documentId },
    );
    if (consumeError || consumed?.consumed !== true) {
      throw consumeError || new Error("Upload token was not consumed");
    }

    await supabase.from("contract_operations_log").insert({
      company_id: companyId,
      contract_id: contractId,
      operation_type: "signed_contract_pdf_secure_upload_received",
      operation_details: {
        request_id: claim.requestId,
        document_id: documentId,
        file_size: file.size,
        source: "upload-missing-contract-pdf",
        identity_status: "pending",
      },
      notes: "استلم النظام نسخة PDF عبر رابط آمن مؤقت؛ لن تُغلق المطالبة قبل نجاح مطابقة الهوية.",
      performed_by: null,
    });

    return endpointResponse(
      req,
      wantsJson,
      "تم استلام الملف. سيجري النظام مطابقة هوية المستأجر تلقائياً، ولن تُستخدم النسخة قانونياً إلا بعد نجاح المطابقة.",
      true,
      200,
      "upload_received",
    );
  } catch (error) {
    // Compensate only artifacts created by this failed request. Never touch a
    // pre-existing user file or a document that another request owns.
    if (documentId) {
      await supabase.from("contract_documents").delete().eq("id", documentId).eq("legal_identity_match_status", "pending");
    }
    if (storagePath) await supabase.storage.from("contract-documents").remove([storagePath]);
    const { error: releaseError } = await supabase.rpc(
      "release_missing_contract_pdf_upload_token_claim_v1",
      { p_token: token, p_claim_nonce: claimNonce },
    );
    if (releaseError) console.error("Could not release failed upload claim", releaseError);
    const status = error instanceof UploadError ? error.status : 500;
    const message = error instanceof UploadError ? error.message : "تعذر حفظ الملف. لم يتم اعتماد أي نسخة؛ حاول مرة أخرى من نفس الرابط.";
    console.error("secure missing-contract PDF upload failed", error);
    return endpointResponse(req, wantsJson, message, false, status, "upload_failed");
  }
});

async function resolveToken(client: ReturnType<typeof createClient>, token: string) {
  const { data, error } = await client.rpc("resolve_missing_contract_pdf_upload_token_v1", { p_token: token });
  if (error) return { valid: false, reason: error.message };
  return data || { valid: false, reason: "not_found" };
}

function uploadForm(token: string, contractNumber: string) {
  const safeContract = escapeHtml(contractNumber);
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>رفع نسخة العقد</title><style>${styles}</style></head><body><main><h1>رفع نسخة العقد الموقعة</h1><p>العقد: <strong>${safeContract}</strong></p><p>ارفع ملف PDF الصحيح فقط. سيطابق النظام هوية المستأجر تلقائياً قبل السماح باستخدامه في الدعوى.</p><form method="post" enctype="multipart/form-data" action="?token=${encodeURIComponent(token)}"><input required type="file" name="file" accept="application/pdf,.pdf"><button type="submit">رفع النسخة والتحقق منها</button></form><small>الرابط مؤقت ويُستخدم مرة واحدة. الحد الأقصى 15 ميجابايت.</small></main></body></html>`, {
    status: 200,
    headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function htmlPage(message: string, success: boolean, status: number) {
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>رفع نسخة العقد</title><style>${styles}</style></head><body><main><h1>${success ? "تم الاستلام" : "تعذر إكمال الطلب"}</h1><p>${escapeHtml(message)}</p></main></body></html>`, {
    status,
    headers: { ...securityHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function endpointResponse(
  req: Request,
  wantsJson: boolean,
  message: string,
  success: boolean,
  status: number,
  reason: string,
) {
  if (!wantsJson) return htmlPage(message, success, status);
  return jsonResponse(req, { success, message, reason }, status);
}

function jsonResponse(
  req: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders,
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  return {
    ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "accept, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function messageForReason(reason: string) {
  if (reason === "already_used") return "استُخدم هذا الرابط مسبقاً.";
  if (reason === "request_closed") return "أُغلق طلب النسخة ولم يعد الرابط مطلوباً.";
  if (reason === "upload_already_in_progress") return "يوجد رفع جارٍ من هذا الرابط؛ انتظر قليلاً.";
  return "انتهت صلاحية الرابط أو تم إلغاؤه.";
}

function requireUuid(value: unknown, name: string) {
  const text = String(value || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`${name} is invalid`);
  }
  return text;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

class UploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const styles = "body{font-family:system-ui;background:#f6f7fb;margin:0;padding:24px;color:#172033}main{max-width:560px;margin:8vh auto;background:white;padding:28px;border-radius:18px;box-shadow:0 12px 40px #17203318}h1{font-size:1.55rem}p{line-height:1.8}form{display:grid;gap:16px;margin:24px 0}input{padding:14px;border:1px solid #cbd2df;border-radius:10px}button{padding:14px;border:0;border-radius:10px;background:#174f7a;color:white;font-weight:700}small{color:#5f6b7a}";
