export type BankStatementLine = {
  id?: string;
  bankId?: string | null;
  statementDate: string;
  valueDate?: string | null;
  amount: number;
  currency?: string | null;
  description?: string | null;
  referenceNumber?: string | null;
};

export type BankMatchCandidate = {
  id: string;
  source: "payment" | "bank_transaction";
  bankId?: string | null;
  transactionDate: string;
  amount: number;
  currency?: string | null;
  description?: string | null;
  referenceNumber?: string | null;
  documentNumber?: string | null;
  customerName?: string | null;
};

export type BankMatchStrength = "exact" | "strong" | "possible" | "none";

export type BankMatchDecision = {
  candidateId: string;
  source: BankMatchCandidate["source"];
  score: number;
  strength: BankMatchStrength;
  reasons: string[];
  autoMatch: boolean;
};

const DEFAULT_AMOUNT_TOLERANCE = 0.01;
const STRONG_DATE_WINDOW_DAYS = 2;
const POSSIBLE_DATE_WINDOW_DAYS = 7;

export function normalizeBankReference(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function normalizeBankAmount(value: number | string | null | undefined): number {
  const numeric = typeof value === "number" ? value : Number(String(value || "0").replace(/,/g, ""));
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

export function daysBetweenDates(left: string, right: string): number {
  const leftDate = new Date(`${left}T00:00:00Z`);
  const rightDate = new Date(`${right}T00:00:00Z`);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return Number.MAX_SAFE_INTEGER;
  return Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / 86_400_000));
}

export function scoreBankStatementMatch(
  statementLine: BankStatementLine,
  candidate: BankMatchCandidate,
  amountTolerance = DEFAULT_AMOUNT_TOLERANCE,
): BankMatchDecision {
  const reasons: string[] = [];
  let score = 0;

  const statementAmount = Math.abs(normalizeBankAmount(statementLine.amount));
  const candidateAmount = Math.abs(normalizeBankAmount(candidate.amount));
  const amountDelta = Math.abs(statementAmount - candidateAmount);

  if (amountDelta <= amountTolerance) {
    score += 45;
    reasons.push("amount_exact");
  } else if (amountDelta <= Math.max(amountTolerance, statementAmount * 0.005)) {
    score += 25;
    reasons.push("amount_near");
  } else {
    return {
      candidateId: candidate.id,
      source: candidate.source,
      score: 0,
      strength: "none",
      reasons: ["amount_mismatch"],
      autoMatch: false,
    };
  }

  if (statementLine.bankId && candidate.bankId && statementLine.bankId === candidate.bankId) {
    score += 10;
    reasons.push("same_bank");
  }

  const dateDistance = daysBetweenDates(statementLine.valueDate || statementLine.statementDate, candidate.transactionDate);
  if (dateDistance === 0) {
    score += 20;
    reasons.push("same_date");
  } else if (dateDistance <= STRONG_DATE_WINDOW_DAYS) {
    score += 15;
    reasons.push("near_date");
  } else if (dateDistance <= POSSIBLE_DATE_WINDOW_DAYS) {
    score += 5;
    reasons.push("date_window");
  }

  const statementReference = normalizeBankReference(statementLine.referenceNumber);
  const statementDescription = normalizeBankReference(statementLine.description);
  const candidateReferences = [
    candidate.referenceNumber,
    candidate.documentNumber,
    candidate.description,
    candidate.customerName,
  ].map(normalizeBankReference).filter(Boolean);

  if (statementReference && candidateReferences.some((reference) => reference === statementReference)) {
    score += 25;
    reasons.push("reference_exact");
  } else if (
    statementReference &&
    candidateReferences.some((reference) => reference.includes(statementReference) || statementReference.includes(reference))
  ) {
    score += 15;
    reasons.push("reference_partial");
  } else if (
    statementDescription &&
    candidateReferences.some((reference) => reference.length >= 5 && statementDescription.includes(reference))
  ) {
    score += 10;
    reasons.push("description_reference");
  }

  const normalizedScore = Math.min(100, score);
  const strength: BankMatchStrength =
    normalizedScore >= 90
      ? "exact"
      : normalizedScore >= 70
        ? "strong"
        : normalizedScore >= 50
          ? "possible"
          : "none";

  return {
    candidateId: candidate.id,
    source: candidate.source,
    score: normalizedScore,
    strength,
    reasons,
    autoMatch: strength === "exact" || strength === "strong",
  };
}

export function findBestBankStatementMatch(
  statementLine: BankStatementLine,
  candidates: BankMatchCandidate[],
): BankMatchDecision | null {
  const decisions = candidates
    .map((candidate) => scoreBankStatementMatch(statementLine, candidate))
    .filter((decision) => decision.strength !== "none")
    .sort((left, right) => right.score - left.score);

  return decisions[0] || null;
}
