function getInvoicePaymentMismatch(invoice, linkedPaid) {
  const recordedPaid = Number(invoice.paid_amount || 0);
  const totalAmount = Number(invoice.total_amount || 0);
  const recordedBalance = Number(invoice.balance_due || 0);
  // Cancellation removes the collectible balance, not the historical receipt
  // audit. Still detect corrupt paid caches, overpayments and nonzero balances.
  const expectedBalance = invoice.status === 'cancelled'
    ? 0 : Number(Math.max(totalAmount - linkedPaid, 0).toFixed(2));
  if (Math.abs(linkedPaid - recordedPaid) <= 0.01
    && Math.abs(expectedBalance - recordedBalance) <= 0.01
    && linkedPaid - totalAmount <= 0.01) return null;
  return {
    invoice_id: invoice.id, invoice_number: invoice.invoice_number,
    total_amount: totalAmount, linked_paid: linkedPaid, recorded_paid: recordedPaid,
    expected_balance: expectedBalance, recorded_balance: recordedBalance,
  };
}
module.exports = { getInvoicePaymentMismatch };
