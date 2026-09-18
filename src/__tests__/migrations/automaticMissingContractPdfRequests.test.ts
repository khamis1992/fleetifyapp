import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const migration = read(
  'supabase/migrations/20260827200727_automatic_missing_contract_pdf_requests.sql',
);
const rollback = read(
  'supabase/rollbacks/20260827200727_automatic_missing_contract_pdf_requests.rollback.sql',
);
const agent = read('supabase/functions/missing-contract-pdf-agent/index.ts');
const message = read('supabase/functions/missing-contract-pdf-agent/message.ts');
const reconciliationAgent = read('automation/contract-reconciliation-agent/run-target.ts');
const selection = read(
  'src/pages/legal/LawsuitPreparation/utils/contractDocumentSelection.ts',
);
const config = read('supabase/config.toml');
const routes = read('src/routes/index.ts');
const uploadPage = read('src/pages/public/ContractPdfUploadPage.tsx');
const uploadEndpoint = read('supabase/functions/upload-missing-contract-pdf/index.ts');

describe('automatic missing contract PDF requests', () => {
  it('uses the three configured recipients and one deduplicated open request', () => {
    expect(migration).toContain("'97466707063'");
    expect(migration).toContain("'97431151919'");
    expect(migration).toContain("'97431411919'");
    expect(migration).toContain('missing_contract_pdf_requests_one_open_idx');
    expect(migration).toContain('missing_contract_pdf_deliveries_request_phone_key');
  });

  it('requires a direct identity match and never accepts plate-only evidence', () => {
    expect(migration).toContain("document.contract_id = p_contract_id");
    expect(migration).toContain("document.legal_identity_match_status = 'matched'");
    expect(migration).not.toContain('contract_documents_effective_contract_v1');
    expect(selection).toContain("document.legal_identity_match_status !== 'matched'");
    expect(selection).toContain("document.legal_identity_match_status !== 'pending'");
    expect(reconciliationAgent).toContain(".eq('legal_identity_match_status', 'matched')");
  });

  it('runs automatically, retries safely, and stores provider evidence', () => {
    expect(migration).toContain("'missing-contract-pdf-agent'");
    expect(migration).toContain("'* * * * *'");
    expect(migration).toContain('agent_secret_missing_contract_pdf');
    expect(agent).toContain('MAX_DELIVERY_ATTEMPTS = 5');
    expect(agent).toContain('provider_message_id: providerMessageId');
    expect(agent).toContain('.from("whatsapp_message_logs")');
    expect(config).toMatch(/\[functions\.missing-contract-pdf-agent\]\s*verify_jwt = false/);
  });

  it('sends a ten-day one-use link to an upload-only public page', () => {
    expect(agent).toContain('p_ttl: "10 days"');
    expect(agent).toContain('/contract-upload?token=');
    expect(agent).not.toContain('/contracts/${contract.id}');
    expect(message).toContain('صلاحية الرابط 10 أيام ويُستخدم مرة واحدة فقط');
    expect(routes).toMatch(/path: '\/contract-upload'[\s\S]*?protected: false[\s\S]*?layout: 'none'/);
    expect(uploadPage).toContain('لا يتيح الرابط دخول النظام أو مشاهدة بيانات العميل');
    expect(uploadPage).not.toContain('customerName');
  });

  it('keeps public token responses minimal and uploaded evidence pending verification', () => {
    expect(uploadEndpoint).toContain('contractNumber: String(resolution.contractNumber || "")');
    expect(uploadEndpoint).toContain('expiresAt: String(resolution.expiresAt || "")');
    expect(uploadEndpoint).not.toContain('customerName:');
    expect(uploadEndpoint).toContain('legal_identity_match_status: "pending"');
    expect(uploadEndpoint).toContain('claim_missing_contract_pdf_upload_token_v1');
    expect(uploadEndpoint).toContain('consume_missing_contract_pdf_upload_token_v1');
    expect(uploadEndpoint).toContain('"https://www.alaraf.online"');
  });

  it('documents the request in the contract and closes it after a matched upload', () => {
    expect(migration).toContain("'signed_contract_pdf_request_queued'");
    expect(agent).toContain('signed_contract_pdf_request_sent');
    expect(migration).toContain("'signed_contract_pdf_request_fulfilled'");
    expect(migration).toContain('trg_fulfill_missing_contract_pdf_request');
    expect(message).toContain('لن يكتمل التحويل القانوني');
  });

  it('repairs the Elias plate-only link without deleting audit evidence', () => {
    expect(migration).toContain('7c0304c2-06f8-475d-b8c6-c689c2f9ec39');
    expect(migration).toContain("legal_identity_match_status = 'mismatch'");
    expect(migration).toContain("'identity_mismatch'");
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.contract_documents/i);
  });

  it('ships a matching rollback', () => {
    expect(rollback).toContain("WHERE job.jobname = 'missing-contract-pdf-agent'");
    expect(rollback).toContain('DROP TABLE IF EXISTS public.missing_contract_pdf_deliveries');
    expect(rollback).toContain('RENAME TO convert_contract_to_legal_v1');
    expect(rollback).toContain('RENAME TO complete_legal_transfer_readiness_v1');
    expect(rollback).toContain('RENAME TO get_legal_transfer_readiness_v1');
  });
});
