import { supabase } from "@/integrations/supabase/client";
import type { LawsuitPreparationState } from "../store/types";
import type { TaqadiFilingDocument } from "./taqadiAutomation";

export function claimEvidenceIds(state: LawsuitPreparationState): string[] {
  const register = state.financialClaimSource?.claimRegister;
  if (register?.issues.length) throw new Error(register.issues.join("؛ "));
  return [
    ...new Set(
      register?.rows
        .filter((row) => row.status === "ready")
        .flatMap((row) => row.evidence_ids) || []
    ),
  ];
}

/** Resolve only selected evidence, in one signed-URL request, for filing and ZIP. */
export async function resolveClaimEvidenceDocuments(
  state: LawsuitPreparationState
): Promise<TaqadiFilingDocument[]> {
  const documents = claimEvidenceIds(state).map((id) => {
    const doc = state.contractEvidenceDocuments.find((item) => item.id === id);
    if (
      !doc?.file_path ||
      (doc.legal_evidence_state && doc.legal_evidence_state !== "active")
    ) {
      throw new Error(
        "تغير مستند أحد الطلبات؛ حدّث أدلة القضية قبل تجهيز الحافظة"
      );
    }
    return doc;
  });
  if (!documents.length) return [];
  const { data, error } = await supabase.storage
    .from("contract-documents")
    .createSignedUrls(
      documents.map((doc) => doc.file_path!),
      3600
    );
  if (error) throw error;
  return documents.map((doc) => {
    const url = data?.find((item) => item.path === doc.file_path)?.signedUrl;
    if (!url) throw new Error(`تعذر تجهيز مستند الطلب: ${doc.document_name}`);
    return {
      key: "claimEvidence",
      name: doc.document_name,
      sourceDocumentId: doc.id,
      required: true,
      ready: true,
      url,
      mimeType: doc.mime_type,
      htmlContent: null,
    };
  });
}
