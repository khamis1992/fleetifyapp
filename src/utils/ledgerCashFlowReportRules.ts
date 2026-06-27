export type LedgerMovementLine = {
  id: string;
  entryDate: string;
  entryNumber: string;
  accountCode: string;
  accountName?: string;
  description?: string | null;
  debit: number;
  credit: number;
};

export type CashFlowMovementLine = {
  id: string;
  accountCode: string;
  accountType: string;
  cashFlowCategory?: "operating" | "investing" | "financing";
  amount: number;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

function createReportFingerprint(payload: unknown) {
  const serialized = JSON.stringify(payload);
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 31 + serialized.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function inferCashFlowCategory(line: CashFlowMovementLine): "operating" | "investing" | "financing" {
  if (line.cashFlowCategory) return line.cashFlowCategory;

  const accountType = String(line.accountType || "").toLowerCase();
  if (accountType === "asset" && /^(15|16|17|18)/.test(line.accountCode)) return "investing";
  if (accountType === "liability" || accountType === "equity") return "financing";
  return "operating";
}

export function buildGeneralLedgerReport(lines: LedgerMovementLine[], openingBalance = 0) {
  let runningBalance = toMoney(openingBalance);
  const orderedLines = [...lines].sort((left, right) => {
    const dateCompare = left.entryDate.localeCompare(right.entryDate);
    if (dateCompare !== 0) return dateCompare;
    return left.entryNumber.localeCompare(right.entryNumber);
  });

  const movements = orderedLines.map((line) => {
    runningBalance = toMoney(runningBalance + Number(line.debit || 0) - Number(line.credit || 0));
    return {
      ...line,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
      runningBalance,
    };
  });

  const totalDebit = toMoney(movements.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = toMoney(movements.reduce((sum, line) => sum + line.credit, 0));

  return {
    reportType: "general_ledger" as const,
    openingBalance: toMoney(openingBalance),
    totalDebit,
    totalCredit,
    closingBalance: runningBalance,
    movementCount: movements.length,
    movements,
    sourceFingerprint: createReportFingerprint({ openingBalance: toMoney(openingBalance), movements }),
  };
}

export function buildCashFlowReport(
  lines: CashFlowMovementLine[],
  beginningCashBalance: number,
) {
  const categories = {
    operating: 0,
    investing: 0,
    financing: 0,
  };

  const classifiedLines = lines.map((line) => {
    const category = inferCashFlowCategory(line);
    const amount = toMoney(line.amount);
    categories[category] = toMoney(categories[category] + amount);
    return {
      ...line,
      amount,
      cashFlowCategory: category,
    };
  });

  const netCashFlow = toMoney(categories.operating + categories.investing + categories.financing);
  const endingCashBalance = toMoney(beginningCashBalance + netCashFlow);

  return {
    reportType: "cash_flow" as const,
    beginningCashBalance: toMoney(beginningCashBalance),
    operatingCashFlow: categories.operating,
    investingCashFlow: categories.investing,
    financingCashFlow: categories.financing,
    netCashFlow,
    endingCashBalance,
    lineCount: classifiedLines.length,
    lines: classifiedLines,
    sourceFingerprint: createReportFingerprint({ beginningCashBalance: toMoney(beginningCashBalance), classifiedLines }),
  };
}
