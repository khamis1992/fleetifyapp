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
    expect(wizardSource).toContain('includedInvoiceOutstanding + Number(contract?.late_fine_amount || 0)');
  });

  it('persists included and excluded invoice evidence in the readiness audit', () => {
    expect(wizardSource).toContain('included_invoice_ids: includedInvoices.map');
    expect(wizardSource).toContain('excluded_invoices: excludedInvoiceAudit');
    expect(wizardSource).toContain('excluded_invoice_balance: excludedInvoiceOutstanding');
    expect(wizardSource).toContain('الفواتير المستبعدة من المطالبة');
  });
});
