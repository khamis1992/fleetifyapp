export type AnnualCloseLedgerLine = {
  accountCode: string;
  accountName?: string;
  accountType: string;
  debit: number;
  credit: number;
};

export type AnnualCloseEntryLine = {
  accountCode: string;
  debit: number;
  credit: number;
  description: string;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

function normalizeType(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalBalance(line: AnnualCloseLedgerLine) {
  const type = normalizeType(line.accountType);
  if (type === "revenue" || type === "income" || type === "liability" || type === "equity") {
    return toMoney(Number(line.credit || 0) - Number(line.debit || 0));
  }
  return toMoney(Number(line.debit || 0) - Number(line.credit || 0));
}

export function calculateAnnualNetIncome(lines: AnnualCloseLedgerLine[]) {
  const revenue = toMoney(
    lines
      .filter((line) => ["revenue", "income"].includes(normalizeType(line.accountType)))
      .reduce((sum, line) => sum + normalBalance(line), 0),
  );
  const expenses = toMoney(
    lines
      .filter((line) => normalizeType(line.accountType) === "expense")
      .reduce((sum, line) => sum + normalBalance(line), 0),
  );

  return {
    revenue,
    expenses,
    netIncome: toMoney(revenue - expenses),
  };
}

export function buildAnnualClosingEntry(
  lines: AnnualCloseLedgerLine[],
  retainedEarningsAccountCode: string,
): AnnualCloseEntryLine[] {
  const closingLines: AnnualCloseEntryLine[] = [];

  for (const line of lines) {
    const type = normalizeType(line.accountType);
    if (!["revenue", "income", "expense"].includes(type)) continue;

    const balance = normalBalance(line);
    if (Math.abs(balance) <= 0.01) continue;

    if (type === "expense") {
      closingLines.push({
        accountCode: line.accountCode,
        debit: 0,
        credit: balance,
        description: "Close expense account to retained earnings",
      });
    } else {
      closingLines.push({
        accountCode: line.accountCode,
        debit: balance,
        credit: 0,
        description: "Close revenue account to retained earnings",
      });
    }
  }

  const totals = calculateAnnualNetIncome(lines);
  if (totals.netIncome > 0) {
    closingLines.push({
      accountCode: retainedEarningsAccountCode,
      debit: 0,
      credit: totals.netIncome,
      description: "Transfer annual profit to retained earnings",
    });
  } else if (totals.netIncome < 0) {
    closingLines.push({
      accountCode: retainedEarningsAccountCode,
      debit: Math.abs(totals.netIncome),
      credit: 0,
      description: "Transfer annual loss to retained earnings",
    });
  }

  return closingLines;
}

export function buildOpeningBalanceLines(lines: AnnualCloseLedgerLine[]): AnnualCloseEntryLine[] {
  return lines
    .filter((line) => ["asset", "liability", "equity"].includes(normalizeType(line.accountType)))
    .map((line) => {
      const balance = normalBalance(line);
      if (Math.abs(balance) <= 0.01) return null;

      if (normalizeType(line.accountType) === "asset") {
        return {
          accountCode: line.accountCode,
          debit: Math.max(balance, 0),
          credit: Math.max(-balance, 0),
          description: "Opening balance carried from prior fiscal year",
        };
      }

      return {
        accountCode: line.accountCode,
        debit: Math.max(-balance, 0),
        credit: Math.max(balance, 0),
        description: "Opening balance carried from prior fiscal year",
      };
    })
    .filter((line): line is AnnualCloseEntryLine => Boolean(line));
}

export function isBalancedAnnualEntry(lines: AnnualCloseEntryLine[]) {
  const totalDebit = toMoney(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const totalCredit = toMoney(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  return {
    totalDebit,
    totalCredit,
    imbalance: toMoney(totalDebit - totalCredit),
    isBalanced: Math.abs(totalDebit - totalCredit) <= 0.01,
  };
}
