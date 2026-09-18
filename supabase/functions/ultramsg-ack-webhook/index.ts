import { createServiceClient, jsonResponse } from "../_shared/agent.ts";
import { parseUltramsgAcknowledgement } from "./webhook.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabase = createServiceClient();
  try {
    const suppliedSecret = new URL(req.url).searchParams.get("secret") || "";
    const { data: verified, error: verifyError } = await supabase.rpc(
      "verify_ultramsg_webhook_secret_v1",
      { p_supplied_secret: suppliedSecret },
    );
    if (verifyError || verified !== true) {
      return jsonResponse({ success: false, error: "Unauthorized webhook" }, 401);
    }

    const receivedAt = new Date();
    const payload = await parsePayload(req);
    const acknowledgement = parseUltramsgAcknowledgement(payload, receivedAt);
    if (!acknowledgement) {
      return jsonResponse({ success: true, ignored: true });
    }

    const { data: job, error: jobError } = await supabase
      .from("legal_notice_agent_jobs")
      .select("*")
      .eq("provider", "ultramsg")
      .eq("provider_message_id", acknowledgement.messageId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) return jsonResponse({ success: true, ignored: true });
    if (job.status === "read") return jsonResponse({ success: true, duplicate: true });
    if (job.status === "delivered" && acknowledgement.status === "delivered") {
      return jsonResponse({ success: true, duplicate: true });
    }

    const providerEventAt = new Date(acknowledgement.eventAt);
    const sentAt = new Date(job.sent_at);
    const timestampIsPlausible = !Number.isNaN(providerEventAt.getTime())
      && !Number.isNaN(sentAt.getTime())
      && providerEventAt.getTime() >= sentAt.getTime() - 5 * 60 * 1000
      && providerEventAt.getTime() <= receivedAt.getTime() + 5 * 60 * 1000;
    const acknowledgedAt = timestampIsPlausible
      ? providerEventAt.toISOString()
      : receivedAt.toISOString();

    // This JSON lives in the legacy public contract-documents bucket, so it is
    // deliberately limited to non-personal verification facts. The protected
    // job ledger retains the exact message, recipient and raw provider event.
    const evidence = {
      schema: "fleetify.formal-notice-delivery-proof.v1",
      job_id: job.id,
      message_sha256: job.message_sha256,
      provider: job.provider,
      provider_message_id: job.provider_message_id,
      provider_status: acknowledgement.status,
      sent_at: job.sent_at,
      provider_event_at: acknowledgement.eventAt,
      acknowledged_at: acknowledgedAt,
      provider_timestamp_accepted: timestampIsPlausible,
      recorded_at: receivedAt.toISOString(),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(evidence, null, 2));
    const filePath = [
      "legal-notices",
      job.id,
      `delivery-${acknowledgement.status}.json`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from("contract-documents")
      .upload(filePath, bytes, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: false,
      });
    const uploadMessage = String(uploadError?.message || "").toLowerCase();
    if (uploadError && !uploadMessage.includes("already") && !uploadMessage.includes("duplicate")) {
      throw uploadError;
    }

    let { data: proofDocument, error: proofLookupError } = await supabase
      .from("contract_documents")
      .select("id")
      .eq("company_id", job.company_id)
      .eq("contract_id", job.contract_id)
      .eq("file_path", filePath)
      .maybeSingle();
    if (proofLookupError) throw proofLookupError;

    if (!proofDocument) {
      const { data, error } = await supabase
        .from("contract_documents")
        .insert({
          company_id: job.company_id,
          contract_id: job.contract_id,
          document_name: `إثبات وصول إعذار واتساب — ${job.contract_number}`,
          document_type: "formal_notice_proof",
          file_path: filePath,
          file_size: bytes.byteLength,
          mime_type: "application/json",
          original_filename: `formal-notice-${job.id}-${acknowledgement.status}.json`,
          processing_status: "complete",
          notes: `Ultramsg ${acknowledgement.status}; message ${job.provider_message_id}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      proofDocument = data;
    }

    const { error: finalizeError } = await supabase.rpc(
      "finalize_automatic_formal_notice_delivery_v1",
      {
        p_job_id: job.id,
        p_provider_status: acknowledgement.status,
        p_event_at: acknowledgedAt,
        p_proof_document_id: proofDocument.id,
        p_provider_payload: payload,
      },
    );
    if (finalizeError) throw finalizeError;

    await supabase.from("ai_agent_reviews").insert({
      company_id: job.company_id,
      agent_type: "formal_notice",
      entity_type: "contracts",
      entity_id: job.contract_id,
      verdict: acknowledgement.status,
      confidence: 1,
      summary: acknowledgement.status === "read"
        ? `ثبتت قراءة إعذار واتساب للعقد ${job.contract_number}`
        : `ثبت وصول إعذار واتساب للعقد ${job.contract_number}`,
      details: {
        job_id: job.id,
        proof_document_id: proofDocument.id,
        provider_message_id: job.provider_message_id,
        acknowledged_at: acknowledgedAt,
        provider_event_at: acknowledgement.eventAt,
        provider_timestamp_accepted: timestampIsPlausible,
      },
      model: "deterministic",
    });

    return jsonResponse({
      success: true,
      jobId: job.id,
      status: acknowledgement.status,
      proofDocumentId: proofDocument.id,
    });
  } catch (error) {
    console.error("ultramsg-ack-webhook failed", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

async function parsePayload(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const value = await req.json();
    return isRecord(value) ? value : { value };
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  const value = Object.fromEntries(params.entries());
  return Object.keys(value).length > 0 ? value : { raw: text };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
