export type StandardLedgerLine = {
  accountCode: string;
  accountName?: string;
  accountType: string;
  debit: number;
  credit: number;
};

export type StandardReportLine = {
  accountCode: string;
  accountName?: string;
  accountType: string;
  amount: number;
};

export type FinancialReportApprovalInput = {
  sourceFingerprint?: string | null;
  imbalance?: number | null;
  generatedBy?: string | null;
  approverId?: string | null;
  status: string;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

function normalizeAccountType(value: string) {
  return String(value || "").trim().toLowerCase();
}

function lineBalance(line: StandardLedgerLine) {
  const type = normalizeAccountType(line.accountType);
  const debit = Number(line.debit || 0);
  const credit = Number(line.credit || 0);

  if (type === "liability" || type === "equity" || type === "revenue" || type === "income") {
    return toMoney(credit - debit);
  }

  return toMoney(debit - credit);
}

function createReportFingerprint(payload: unknown) {
  const serialized = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 31 + serialized.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildTrialBalanceReport(lines: StandardLedgerLine[]) {
  const totalDebit = toMoney(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const totalCredit = toMoney(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  const imbalance = toMoney(totalDebit - totalCredit);

  return {
    reportType: "trial_balance" as const,
    totalDebit,
    totalCredit,
    imbalance,
    isBalanced: Math.abs(imbalance) <= 0.01,
    lineCount: lines.length,
    sourceFingerprint: createReportFingerprint(lines),
  };
}

export function buildIncomeStatementReport(lines: StandardLedgerLine[]) {
  const revenueLines = lines.filter((line) => {
    const type = normalizeAccountType(line.accountType);
    return type === "revenue" || type === "income";
  });
  const expenseLines = lines.filter((line) => normalizeAccountType(line.accountType) === "expense");

  const revenue = toMoney(revenueLines.reduce((sum, line) => sum + lineBalance(line), 0));
  const expenses = toMoney(expenseLines.reduce((sum, line) => sum + lineBalance(line), 0));
  const netIncome = toMoney(revenue - expenses);

  return {
    reportType: "income_statement" as const,
    revenue,
    expenses,
    netIncome,
    profitMargin: revenue > 0 ? toMoney((netIncome / revenue) * 100) : 0,
    revenueLines: revenueLines.map(toStandardReportLine),
    expenseLines: expenseLines.map(toStandardReportLine),
    sourceFingerprint: createReportFingerprint({ revenueLines, expenseLines }),
  };
}

export function buildBalanceSheetReport(lines: StandardLedgerLine[]) {
  const assetLines = lines.filter((line) => normalizeAccountType(line.accountType) === "asset");
  const liabilityLines = lines.filter((line) => normalizeAccountType(line.accountType) === "liability");
  const equityLines = lines.filter((line) => normalizeAccountType(line.accountType) === "equity");

  const totalAssets = toMoney(assetLines.reduce((sum, line) => sum + lineBalance(line), 0));
  const totalLiabilities = toMoney(liabilityLines.reduce((sum, line) => sum + lineBalance(line), 0));
  const totalEquity = toMoney(equityLines.reduce((sum, line) => sum + lineBalance(line), 0));
  const liabilitiesAndEquity = toMoney(totalLiabilities + totalEquity);
  const imbalance = toMoney(totalAssets - liabilitiesAndEquity);

  return {
    reportType: "balance_sheet" as const,
    totalAssets,
    totalLiabilities,
    totalEquity,
    liabilitiesAndEquity,
    imbalance,
    isBalanced: Math.abs(imbalance) <= 0.01,
    assetLines: assetLines.map(toStandardReportLine),
    liabilityLines: liabilityLines.map(toStandardReportLine),
    equityLines: equityLines.map(toStandardReportLine),
    sourceFingerprint: createReportFingerprint({ assetLines, liabilityLines, equityLines }),
  };
}

export function evaluateFinancialReportApprovalReadiness(input: FinancialReportApprovalInput) {
  if (input.status !== "published") {
    return { canApprove: false, reason: "not_published" as const };
  }

  if (!input.sourceFingerprint?.trim()) {
    return { canApprove: false, reason: "source_fingerprint_required" as const };
  }

  if (Math.abs(Number(input.imbalance || 0)) > 0.01) {
    return { canApprove: false, reason: "report_imbalanced" as const };
  }

  if (input.generatedBy && input.approverId && input.generatedBy === input.approverId) {
    return { canApprove: false, reason: "generator_cannot_approve" as const };
  }

  return { canApprove: true, reason: "ready_to_approve" as const };
}

function toStandardReportLine(line: StandardLedgerLine): StandardReportLine {
  return {
    accountCode: line.accountCode,
    accountName: line.accountName,
    accountType: line.accountType,
    amount: lineBalance(line),
  };
}
