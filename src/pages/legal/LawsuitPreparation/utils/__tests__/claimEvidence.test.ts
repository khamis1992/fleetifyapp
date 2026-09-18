import { beforeEach, expect, it, vi } from "vitest";
import { resolveClaimEvidenceDocuments } from "../claimEvidence";
import type { LawsuitPreparationState } from "../../store/types";
const mock = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ createSignedUrls: mock.sign }) } },
}));
const state = () =>
  ({
    financialClaimSource: {
      claimRegister: {
        issues: [],
        rows: [
          { status: "ready", evidence_ids: ["a", "b"] },
          { status: "ready", evidence_ids: ["a"] },
          { status: "excluded", evidence_ids: ["c"] },
        ],
      },
    },
    contractEvidenceDocuments: [
      {
        id: "a",
        document_name: "أ",
        file_path: "a.pdf",
        mime_type: "application/pdf",
        legal_evidence_state: "active",
      },
      {
        id: "b",
        document_name: "ب",
        file_path: "b.pdf",
        mime_type: "application/pdf",
        legal_evidence_state: "active",
      },
    ],
  } as unknown as LawsuitPreparationState);
beforeEach(() => mock.sign.mockReset());
it("packages original and alternative evidence once and signs in one request", async () => {
  mock.sign.mockResolvedValue({
    data: [
      { path: "a.pdf", signedUrl: "https://example.test/a" },
      { path: "b.pdf", signedUrl: "https://example.test/b" },
    ],
    error: null,
  });
  const docs = await resolveClaimEvidenceDocuments(state());
  expect(mock.sign).toHaveBeenCalledWith(["a.pdf", "b.pdf"], 3600);
  expect(docs.map((doc) => doc.sourceDocumentId)).toEqual(["a", "b"]);
});
it("blocks missing or quarantined evidence instead of silently leaving it out", async () => {
  const value = state();
  value.contractEvidenceDocuments[1].legal_evidence_state = "quarantined";
  await expect(resolveClaimEvidenceDocuments(value)).rejects.toThrow(
    "تغير مستند"
  );
  expect(mock.sign).not.toHaveBeenCalled();
});
it("fails when any required URL could not be signed", async () => {
  mock.sign.mockResolvedValue({
    data: [{ path: "a.pdf", signedUrl: "https://example.test/a" }],
    error: null,
  });
  await expect(resolveClaimEvidenceDocuments(state())).rejects.toThrow(
    "تعذر تجهيز"
  );
});
