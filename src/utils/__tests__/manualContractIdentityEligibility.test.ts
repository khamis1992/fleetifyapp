import { describe, expect, it } from 'vitest';
import { getManualContractIdentityEligibility } from '../manualContractIdentityEligibility';

const candidate = { sourceType: 'contract', document_type: 'signed_contract', file_path: 'contract/signed.pdf',
  legal_evidence_state: 'quarantined', legal_identity_match_status: 'unverified',
  legal_identity_details: { reasonCode: 'tenant_name_conflict' } };

describe('manual review eligibility aligned with the RPC', () => {
  it.each(['insufficient_identity_evidence','tenant_name_conflict','low_ocr_confidence','incomplete_scan'])(
    'permits inspection for a recoverable OCR assessment: %s', (reasonCode) => {
      expect(getManualContractIdentityEligibility({ ...candidate, legal_identity_details: { reasonCode } }).eligible).toBe(true);
    },
  );
  it.each(['identity_number_conflict','ambiguous_evidence','unknown_reason',null])(
    'blocks direct review for unsupported quarantine reasons: %s', (reasonCode) => {
      expect(getManualContractIdentityEligibility({ ...candidate, legal_identity_details: { reasonCode } }).eligible).toBe(false);
    },
  );
  it.each([{legal_identity_match_status:'mismatch'}, {legal_evidence_state:'superseded'}, {legal_evidence_state:null},
    {sourceType:'customer'}, {file_path:' '}, {document_type:'identity'}, {legal_identity_details:null}])(
    'rejects ineligible evidence even when a recoverable reason is present: %s', (patch) => {
      expect(getManualContractIdentityEligibility({ ...candidate, ...patch }).eligible).toBe(false);
    },
  );
  it('retains the existing review workflow for active copies with legacy OCR results', () => {
    expect(getManualContractIdentityEligibility({ ...candidate, legal_evidence_state:'active', legal_identity_match_status:'mismatch' }).eligible).toBe(true);
  });
});
