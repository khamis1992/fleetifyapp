export type RawBankStatementRow = Record<string, unknown>;

export type ParsedBankStatementLine = {
  statementDate: string;
  valueDate?: string | null;
  description: string;
  referenceNumber?: string | null;
  debitAmount: number;
  creditAmount: number;
  amount: number;
  currency: string;
  lineFingerprint: string;
  rawData: RawBankStatementRow;
};

export type BankStatementParseResult = {
  lines: ParsedBankStatementLine[];
  errors: string[];
  totals: {
    rows: number;
    validRows: number;
    debitAmount: number;
    creditAmount: number;
    netAmount: number;
  };
};

const FIELD_ALIASES = {
  statementDate: ["statement_date", "date", "transaction_date", "تاريخ", "تاريخ العملية", "التاريخ"],
  valueDate: ["value_date", "posting_date", "تاريخ القيد", "تاريخ القيمة"],
  description: ["description", "details", "narration", "memo", "الوصف", "البيان", "التفاصيل"],
  referenceNumber: ["reference", "reference_number", "ref", "رقم المرجع", "المرجع", "رقم العملية"],
  debitAmount: ["debit", "withdrawal", "مدين", "سحب", "المسحوبات"],
  creditAmount: ["credit", "deposit", "دائن", "إيداع", "الايداعات", "الإيداعات"],
  amount: ["amount", "net", "المبلغ", "الصافي"],
  currency: ["currency", "العملة"],
} as const;

const toMoney = (value: number) => Number(Number(value || 0).toFixed(3));

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function normalizeFingerprintText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function createBankStatementLineFingerprint(line: Omit<ParsedBankStatementLine, "lineFingerprint">) {
  return stableHash([
    line.statementDate,
    line.valueDate || "",
    normalizeFingerprintText(line.description),
    normalizeFingerprintText(line.referenceNumber),
    toMoney(line.debitAmount).toFixed(3),
    toMoney(line.creditAmount).toFixed(3),
    toMoney(line.amount).toFixed(3),
    normalizeFingerprintText(line.currency),
  ].join("|"));
}

export function createBankStatementImportFingerprint(lines: ParsedBankStatementLine[]) {
  const normalizedLines = lines
    .map((line) => line.lineFingerprint)
    .sort()
    .join("|");
  return stableHash(normalizedLines);
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function getValue(row: RawBankStatementRow, aliases: readonly string[]) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const found = entries.find(([key]) => normalizeHeader(key) === normalizedAlias);
    if (found && found[1] != null && String(found[1]).trim() !== "") return found[1];
  }
  return undefined;
}

function parseMoney(value: unknown) {
  if (typeof value === "number") return toMoney(value);
  const text = String(value ?? "")
    .replace(/[,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? toMoney(parsed) : 0;
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20_000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString().slice(0, 10);
  }

  const text = String(value ?? "").trim();
  if (!text) return "";

  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const slash = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (slash) return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function parseBankStatementRows(rows: RawBankStatementRow[], defaultCurrency = "QAR"): BankStatementParseResult {
  const errors: string[] = [];
  const lines: ParsedBankStatementLine[] = [];

  rows.forEach((row, index) => {
    const statementDate = parseDate(getValue(row, FIELD_ALIASES.statementDate));
    const valueDate = parseDate(getValue(row, FIELD_ALIASES.valueDate));
    const description = String(getValue(row, FIELD_ALIASES.description) ?? "").trim();
    const referenceNumber = String(getValue(row, FIELD_ALIASES.referenceNumber) ?? "").trim() || null;
    const debitAmount = Math.abs(parseMoney(getValue(row, FIELD_ALIASES.debitAmount)));
    const creditAmount = Math.abs(parseMoney(getValue(row, FIELD_ALIASES.creditAmount)));
    const explicitAmount = parseMoney(getValue(row, FIELD_ALIASES.amount));
    const amount = explicitAmount !== 0 ? explicitAmount : toMoney(creditAmount - debitAmount);
    const currency = String(getValue(row, FIELD_ALIASES.currency) ?? defaultCurrency).trim().toUpperCase() || defaultCurrency;

    if (!statementDate) {
      errors.push(`Row ${index + 1}: missing or invalid statement date`);
      return;
    }

    if (!description && !referenceNumber) {
      errors.push(`Row ${index + 1}: description or reference is required`);
      return;
    }

    if (Math.abs(amount) <= 0.001) {
      errors.push(`Row ${index + 1}: amount is zero or invalid`);
      return;
    }

    const parsedLine = {
      statementDate,
      valueDate: valueDate || null,
      description: description || referenceNumber || "Bank statement line",
      referenceNumber,
      debitAmount,
      creditAmount,
      amount,
      currency,
      rawData: row,
    };

    lines.push({
      ...parsedLine,
      lineFingerprint: createBankStatementLineFingerprint(parsedLine),
    });
  });

  return {
    lines,
    errors,
    totals: {
      rows: rows.length,
      validRows: lines.length,
      debitAmount: toMoney(lines.reduce((sum, line) => sum + line.debitAmount, 0)),
      creditAmount: toMoney(lines.reduce((sum, line) => sum + line.creditAmount, 0)),
      netAmount: toMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
    },
  };
}
