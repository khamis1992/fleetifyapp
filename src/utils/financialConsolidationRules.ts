export type TrialBalanceLine = {
  companyId: string;
  companyName?: string;
  accountCode: string;
  accountName?: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense" | string;
  debit: number;
  credit: number;
  currency?: string | null;
};

export type CurrencyRate = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

export type ConsolidationElimination = {
  accountCode: string;
  debit?: number;
  credit?: number;
  reason: string;
};

export type ConsolidatedAccountLine = {
  accountCode: string;
  accountName?: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
  sourceCompanies: string[];
  eliminations: ConsolidationElimination[];
};

export type ConsolidationApprovalReadinessInput = {
  status: string;
  imbalance: number;
  companyCount: number;
  missingCurrencyRates?: string[];
  unreviewedEliminationCount?: number;
  createdBy?: string | null;
  approverId?: string | null;
};

const toMoney = (value: number) => Number(Number(value || 0).toFixed(2));

function normalizeCurrency(value?: string | null): string {
  return String(value || "QAR").trim().toUpperCase();
}

function convertAmount(amount: number, fromCurrency: string | null | undefined, targetCurrency: string, rates: CurrencyRate[]) {
  const source = normalizeCurrency(fromCurrency);
  const target = normalizeCurrency(targetCurrency);
  if (source === target) return toMoney(amount);

  const rate = rates.find(
    (item) => normalizeCurrency(item.fromCurrency) === source && normalizeCurrency(item.toCurrency) === target,
  );

  if (!rate || rate.rate <= 0) {
    throw new Error(`Missing consolidation currency rate: ${source}->${target}`);
  }

  return toMoney(amount * rate.rate);
}

export function consolidateTrialBalance(
  lines: TrialBalanceLine[],
  options: {
    targetCurrency?: string;
    currencyRates?: CurrencyRate[];
    eliminations?: ConsolidationElimination[];
  } = {},
) {
  const targetCurrency = normalizeCurrency(options.targetCurrency);
  const rates = options.currencyRates || [];
  const eliminations = options.eliminations || [];
  const accounts = new Map<string, ConsolidatedAccountLine>();

  for (const line of lines) {
    const key = line.accountCode.trim();
    if (!key) continue;

    const existing = accounts.get(key) || {
      accountCode: key,
      accountName: line.accountName,
      accountType: line.accountType,
      debit: 0,
      credit: 0,
      balance: 0,
      sourceCompanies: [],
      eliminations: [],
    };

    existing.debit = toMoney(existing.debit + convertAmount(line.debit, line.currency, targetCurrency, rates));
    existing.credit = toMoney(existing.credit + convertAmount(line.credit, line.currency, targetCurrency, rates));
    if (!existing.sourceCompanies.includes(line.companyId)) {
      existing.sourceCompanies.push(line.companyId);
    }

    accounts.set(key, existing);
  }

  for (const elimination of eliminations) {
    const key = elimination.accountCode.trim();
    const existing = accounts.get(key) || {
      accountCode: key,
      accountType: "elimination",
      debit: 0,
      credit: 0,
      balance: 0,
      sourceCompanies: [],
      eliminations: [],
    };

    existing.debit = toMoney(existing.debit + Number(elimination.debit || 0));
    existing.credit = toMoney(existing.credit + Number(elimination.credit || 0));
    existing.eliminations.push(elimination);
    accounts.set(key, existing);
  }

  const consolidatedLines = [...accounts.values()]
    .map((line) => ({
      ...line,
      debit: toMoney(line.debit),
      credit: toMoney(line.credit),
      balance: toMoney(line.debit - line.credit),
      sourceCompanies: line.sourceCompanies.sort(),
    }))
    .sort((left, right) => left.accountCode.localeCompare(right.accountCode));

  const totalDebit = toMoney(consolidatedLines.reduce((sum, line) => sum + line.debit, 0));
  const totalCredit = toMoney(consolidatedLines.reduce((sum, line) => sum + line.credit, 0));
  const imbalance = toMoney(totalDebit - totalCredit);

  return {
    targetCurrency,
    lines: consolidatedLines,
    totalDebit,
    totalCredit,
    imbalance,
    isBalanced: Math.abs(imbalance) <= 0.01,
    companyCount: new Set(lines.map((line) => line.companyId)).size,
    eliminationCount: eliminations.length,
  };
}

export function evaluateConsolidationApprovalReadiness(input: ConsolidationApprovalReadinessInput) {
  if (input.status !== "calculated") {
    return { canApprove: false, reason: "not_calculated" as const };
  }

  if (input.companyCount < 2) {
    return { canApprove: false, reason: "multiple_companies_required" as const };
  }

  if (Math.abs(toMoney(input.imbalance)) > 0.01) {
    return { canApprove: false, reason: "consolidation_imbalanced" as const };
  }

  if ((input.missingCurrencyRates || []).length > 0) {
    return { canApprove: false, reason: "missing_currency_rates" as const };
  }

  if (Number(input.unreviewedEliminationCount || 0) > 0) {
    return { canApprove: false, reason: "unreviewed_eliminations" as const };
  }

  if (input.createdBy && input.approverId && input.createdBy === input.approverId) {
    return { canApprove: false, reason: "creator_cannot_approve" as const };
  }

  return { canApprove: true, reason: "ready_to_approve" as const };
}
