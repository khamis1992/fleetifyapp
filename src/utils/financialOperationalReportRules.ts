export type ReceivableInvoiceLine = {
  id: string;
  customerId?: string | null;
  customerName?: string | null;
  invoiceNumber: string;
  dueDate: string;
  balanceDue: number;
  asOfDate?: string;
};

export type BankReconciliationReportLine = {
  id: string;
  source: "payment" | "bank_transaction" | "statement_line";
  amount: number;
  status: "reconciled" | "unmatched" | "needs_review" | "duplicate" | "ignored";
  ageDays?: number;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

function daysPastDue(dueDate: string, asOfDate: string) {
  const due = new Date(`${dueDate}T00:00:00Z`);
  const asOf = new Date(`${asOfDate}T00:00:00Z`);
  if (Number.isNaN(due.getTime()) || Number.isNaN(asOf.getTime())) return 0;
  return Math.max(0, Math.round((asOf.getTime() - due.getTime()) / 86_400_000));
}

function agingBucket(ageDays: number) {
  if (ageDays <= 0) return "current";
  if (ageDays <= 30) return "1_30";
  if (ageDays <= 60) return "31_60";
  if (ageDays <= 90) return "61_90";
  return "over_90";
}

export function buildReceivablesAgingReport(lines: ReceivableInvoiceLine[], asOfDate: string) {
  const buckets = {
    current: 0,
    "1_30": 0,
    "31_60": 0,
    "61_90": 0,
    over_90: 0,
  };

  const invoiceLines = lines.map((line) => {
    const ageDays = daysPastDue(line.dueDate, line.asOfDate || asOfDate);
    const bucket = agingBucket(ageDays) as keyof typeof buckets;
    const amount = toMoney(line.balanceDue);
    buckets[bucket] = toMoney(buckets[bucket] + amount);

    return {
      ...line,
      balanceDue: amount,
      ageDays,
      bucket,
    };
  });

  const totalOutstanding = toMoney(Object.values(buckets).reduce((sum, amount) => sum + amount, 0));

  return {
    reportType: "receivables_aging" as const,
    asOfDate,
    buckets,
    totalOutstanding,
    invoiceCount: invoiceLines.length,
    criticalOverdueAmount: buckets.over_90,
    lines: invoiceLines,
  };
}

export function buildBankReconciliationSummary(lines: BankReconciliationReportLine[]) {
  const summary = {
    reconciled: { count: 0, amount: 0 },
    unmatched: { count: 0, amount: 0 },
    needs_review: { count: 0, amount: 0 },
    duplicate: { count: 0, amount: 0 },
    ignored: { count: 0, amount: 0 },
  };

  for (const line of lines) {
    const status = line.status in summary ? line.status : "needs_review";
    summary[status].count += 1;
    summary[status].amount = toMoney(summary[status].amount + Math.abs(Number(line.amount || 0)));
  }

  const totalAmount = toMoney(Object.values(summary).reduce((sum, item) => sum + item.amount, 0));
  const unreconciledAmount = toMoney(summary.unmatched.amount + summary.needs_review.amount + summary.duplicate.amount);
  const reconciliationRate = totalAmount > 0 ? toMoney((summary.reconciled.amount / totalAmount) * 100) : 100;

  return {
    reportType: "bank_reconciliation" as const,
    summary,
    totalAmount,
    unreconciledAmount,
    reconciliationRate,
    isHealthy: unreconciledAmount <= 0.01,
  };
}
