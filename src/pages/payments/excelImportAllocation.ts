export type HistoricalInvoiceCandidate = {
  invoiceId: string;
  monthKey: string;
  totalAmount: number;
  paidAmount: number;
};

export type HistoricalPaymentAllocation = {
  invoiceId: string;
  monthKey: string;
  amount: number;
};

export type HistoricalPaymentAllocationPlan = {
  coveredByExisting: number;
  allocations: HistoricalPaymentAllocation[];
  unallocatedAmount: number;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const resolveHistoricalInvoicePaidAmount = ({
  totalAmount,
  persistedPaidAmount,
  persistedBalanceDue,
  directPaymentTotal,
}: {
  totalAmount: number;
  persistedPaidAmount: number;
  persistedBalanceDue: number | null;
  directPaymentTotal: number;
}) => {
  const paidFromBalance = persistedBalanceDue === null
    ? 0
    : Math.max(Number(totalAmount || 0) - Number(persistedBalanceDue || 0), 0);
  return roundCurrency(Math.max(
    Number(persistedPaidAmount || 0),
    Number(directPaymentTotal || 0),
    paidFromBalance,
  ));
};

export const planHistoricalPaymentAllocations = ({
  sourceAmount,
  sourceMonthKey,
  invoices,
}: {
  sourceAmount: number;
  sourceMonthKey: string;
  invoices: HistoricalInvoiceCandidate[];
}): HistoricalPaymentAllocationPlan => {
  const normalizedSourceAmount = Math.max(roundCurrency(sourceAmount), 0);
  const orderedInvoices = [...invoices]
    .filter((invoice) => invoice.monthKey >= sourceMonthKey)
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey));
  const sourceInvoice = orderedInvoices.find((invoice) => invoice.monthKey === sourceMonthKey);
  const coveredByExisting = Math.min(
    normalizedSourceAmount,
    Math.max(roundCurrency(sourceInvoice?.paidAmount || 0), 0),
  );
  let remaining = roundCurrency(normalizedSourceAmount - coveredByExisting);
  const allocations: HistoricalPaymentAllocation[] = [];

  for (const invoice of orderedInvoices) {
    if (remaining <= 0) break;
    const availableBalance = Math.max(
      roundCurrency(Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)),
      0,
    );
    if (availableBalance <= 0) continue;

    const amount = Math.min(remaining, availableBalance);
    allocations.push({
      invoiceId: invoice.invoiceId,
      monthKey: invoice.monthKey,
      amount,
    });
    remaining = roundCurrency(remaining - amount);
  }

  return {
    coveredByExisting,
    allocations,
    unallocatedAmount: Math.max(remaining, 0),
  };
};
