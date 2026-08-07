import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scannerSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/contract-id-scanner/index.ts'),
  'utf8',
);
const proposalHookSource = readFileSync(
  resolve(process.cwd(), 'src/hooks/useCustomerIdProposals.ts'),
  'utf8',
);

describe('contract ID scanner official-name safety', () => {
  it('rejects identity-number mismatches before proposing customer changes', () => {
    expect(scannerSource).toContain(
      'Scanned identity number does not match the contract customer',
    );
  });

  it('uses repeated Arabic-name evidence and filters authority labels', () => {
    expect(scannerSource).toContain('extractArabicNameCandidates');
    expect(scannerSource).toContain('selectArabicNameConsensus');
    expect(scannerSource).toContain('nameArabicOccurrences');
    expect(scannerSource).toContain('\\u0648\\u0632\\u0627\\u0631\\u0629 \\u0627\\u0644\\u062f\\u0627\\u062e\\u0644\\u064a\\u0629');
    expect(scannerSource).toContain('\\u0625\\u062f\\u0627\\u0631\\u0629 \\u0627\\u0644\\u0645\\u0631\\u0648\\u0631');
  });

  it('compares the signed-contract party name with the ID-card name', () => {
    expect(scannerSource).toContain('looksLikeContractPartyIdentity');
    expect(scannerSource).toContain('looksLikeCustomerIdentityEvidence');
    expect(scannerSource).toContain('const combinedText = evidencePages');
    expect(scannerSource).toContain('الطرف\\s*الثاني|المستأجر|اسم\\s*المستأجر');
  });

  it('never proposes English OCR into canonical customer-name fields', () => {
    expect(scannerSource).toContain('English OCR is supporting evidence only');
    expect(scannerSource).not.toMatch(/field:\s*["']first_name["']/);
    expect(scannerSource).not.toMatch(/field:\s*["']last_name["']/);
  });

  it('synchronizes legacy name fields when an Arabic proposal is accepted', () => {
    expect(proposalHookSource).toContain(
      'if (updateData.first_name_ar) updateData.first_name = updateData.first_name_ar',
    );
    expect(proposalHookSource).toContain(
      'if (updateData.last_name_ar) updateData.last_name = updateData.last_name_ar',
    );
    expect(proposalHookSource).toContain(
      'if (fields.first_name_ar) fields.first_name = fields.first_name_ar',
    );
    expect(proposalHookSource).toContain(
      'if (fields.last_name_ar) fields.last_name = fields.last_name_ar',
    );
  });
});
