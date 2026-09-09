import assert from 'node:assert/strict';
import { it } from 'node:test';
import { getInvoicePaymentMismatch } from '../../scripts/utils/invoice-payment-mismatch.cjs';
const invoice = { id: 'test', invoice_number: 'TEST', total_amount: 1700, paid_amount: 500, balance_due: 1200, status: 'sent' };
it('compares active invoice balances against counted receipts', () => {
  assert.equal(getInvoicePaymentMismatch(invoice, 500), null);
  assert.equal(getInvoicePaymentMismatch({ ...invoice, balance_due: 0 }, 500).expected_balance, 1200);
});
it('does not recreate a collectible balance for a cancelled invoice', () => {
  assert.equal(getInvoicePaymentMismatch({ ...invoice, status: 'cancelled', balance_due: 0 }, 500), null);
  assert.equal(getInvoicePaymentMismatch({ ...invoice, status: 'cancelled', paid_amount: 0, balance_due: 0 }, 0), null);
});
it('still reports receipt, balance and overpayment corruption on cancelled invoices', () => {
  assert.ok(getInvoicePaymentMismatch({ ...invoice, status: 'cancelled', balance_due: 0 }, 0));
  assert.ok(getInvoicePaymentMismatch({ ...invoice, status: 'cancelled' }, 500));
  assert.ok(getInvoicePaymentMismatch({ ...invoice, status: 'cancelled', paid_amount: 1800, balance_due: 0 }, 1800));
});
