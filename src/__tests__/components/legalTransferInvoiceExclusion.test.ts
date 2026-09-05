import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const wizardSource = readFileSync(
  resolve(process.cwd(), 'src/components/contracts/LegalTransferReadinessWizard.tsx'),
  'utf8',
);

describe('legal transfer invoice exclusion', () => {
  it('provides a per-invoice exclusion action and required reason', () => {
    expect(wizardSource).toContain("{isExcluded ? 'إعادة للمطالبة' : 'استبعاد'}");
    expect(wizardSource).toContain('سبب الاستبعاد');
    expect(wizardSource).toContain('hasMissingExclusionReason');
  });

  it('calculates the legal invoice balance from included invoices only', () => {
    expect(wizardSource).toContain(
      "invoices.filter((invoice) => !excludedInvoiceIds.has(invoice.id))",
    );
    expect(wizardSource).toContain("callRpc<LegalClaimStatement>('calculate_legal_claim_statement_v4'");
    expect(wizardSource).toContain('p_excluded_invoice_ids: Array.from(excludedInvoiceIds)');
    expect(wizardSource).toContain('claimStatement.total.toFixed(2)');
    expect(wizardSource).toContain('assertLegalReadinessClaim(data, claimScope, businessDate)');
  });

  it('persists included and excluded invoice evidence in the readiness audit', () => {
    expect(wizardSource).toContain('included_invoice_ids: includedInvoices.map');
    expect(wizardSource).toContain('excluded_invoices: excludedInvoiceAudit');
    expect(wizardSource).toContain('excluded_invoice_balance: excludedInvoiceOutstanding');
    expect(wizardSource).toContain('الفواتير المستبعدة من المطالبة');
  });

  it('supports a locked traffic-violations-only claim scope', () => {
    expect(wizardSource).toContain("changeClaimScope('traffic_violations_only')");
    expect(wizardSource).toContain('مخالفات مرورية فقط');
    expect(wizardSource).toContain("claimScope === 'traffic_violations_only'");
    expect(wizardSource).toContain("complete_legal_transfer_readiness_v2");
    expect(wizardSource).toContain('p_claim_scope: claimScope');
    expect(wizardSource).toContain('claimScope,');
  });
});
