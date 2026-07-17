export const AUTO_CONTRACT_MATCH_MIN_CONFIDENCE = 80;
export const EXCEL_PARSE_BATCH_SIZE = 5;
export const MAX_IMPORTED_TRAFFIC_AMOUNT = 100_000;

const NON_BLOCKING_IMPORT_WARNING_PREFIXES = [
  'تم تجاهل قيمة مخالفة غير آمنة',
];

export const isBlockingImportWarning = (warning: string): boolean =>
  !NON_BLOCKING_IMPORT_WARNING_PREFIXES.some((prefix) => warning.startsWith(prefix));

export const hasBlockingImportWarnings = (warnings: string[]): boolean =>
  warnings.some(isBlockingImportWarning);

export const parseStructuredImportAmount = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const text = String(value ?? '').trim();
  if (!text) return null;
  const normalized = text
    .replace(/[,٬]/g, '')
    .replace(/(?:qar|ر\.?\s*ق\.?)/gi, '')
    .replace(/\s+/g, '');
  if (!/^\d+(?:\.\d+)?(?:\+\d+(?:\.\d+)?)*$/.test(normalized)) return null;

  const amount = normalized
    .split('+')
    .reduce((sum, part) => sum + Number(part), 0);
  return Number.isFinite(amount) ? amount : null;
};

export const parseImportedTrafficAmounts = (value: unknown): { amounts: number[]; rejected: boolean } => {
  if (typeof value === 'number') {
    const valid = Number.isFinite(value) && value > 0 && value <= MAX_IMPORTED_TRAFFIC_AMOUNT;
    return { amounts: valid ? [value] : [], rejected: !valid && value !== 0 };
  }

  const raw = String(value ?? '').trim();
  if (!raw || !/\d/.test(raw)) return { amounts: [], rejected: false };
  const text = raw.replace(/[٬,]/g, '');
  if (/\d\s*\/\s*\d/.test(text) || /\b\d{1,2}\s*-\s*20\d{2}\b/.test(text)) {
    return { amounts: [], rejected: false };
  }

  const amounts: number[] = [];
  for (const part of text.split('+')) {
    const matches = part.match(/\d+(?:\.\d+)?/g) || [];
    if (matches.length !== 1) return { amounts: [], rejected: true };
    const amount = Number(matches[0]);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_IMPORTED_TRAFFIC_AMOUNT) {
      return { amounts: [], rejected: true };
    }
    amounts.push(amount);
  }

  return { amounts, rejected: amounts.length === 0 };
};

export const buildWorkbookContentId = async (buffer: ArrayBuffer): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const deduplicateWorkbookInputs = <T extends { contentId: string }>(items: T[]) => {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicates: T[] = [];

  for (const item of items) {
    if (seen.has(item.contentId)) {
      duplicates.push(item);
      continue;
    }
    seen.add(item.contentId);
    unique.push(item);
  }

  return { unique, duplicates };
};

export const mapInBatches = async <T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  const safeBatchSize = Math.max(1, Math.floor(batchSize));

  for (let index = 0; index < items.length; index += safeBatchSize) {
    const batch = items.slice(index, index + safeBatchSize);
    results.push(...await Promise.all(batch.map(mapper)));
  }

  return results;
};

type ContractIdentitySafetyInput = {
  fileHasName: boolean;
  namesMatch: boolean;
  fileHasPlate?: boolean;
  contractHasPlate?: boolean;
  platesMatch?: boolean;
  fileNationalId: string;
  contractNationalId: string;
  nationalIdsMatch: boolean;
  phonesMatch: boolean;
  monthlyAmountsMatch?: boolean;
  contractStartMatches?: boolean;
};

export const areNearIdentityNumbers = (left: string, right: string): boolean => {
  if (!left || !right || left.length !== right.length) return false;
  let differences = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) differences += 1;
    if (differences > 1) return false;
  }
  return differences === 1;
};

export const getContractIdentityConflict = ({
  fileHasName,
  namesMatch,
  fileHasPlate = false,
  contractHasPlate = false,
  platesMatch = false,
  fileNationalId,
  contractNationalId,
  nationalIdsMatch,
  phonesMatch,
  monthlyAmountsMatch = false,
  contractStartMatches = false,
}: ContractIdentitySafetyInput): string | null => {
  if (fileHasPlate && contractHasPlate && !platesMatch) {
    return 'تم استبعاد العقد لأن لوحة المركبة في الملف لا تطابق لوحة العقد.';
  }

  if (fileNationalId && contractNationalId && !nationalIdsMatch) {
    const nearIdentity = areNearIdentityNumbers(fileNationalId, contractNationalId);
    const strongCorroboration =
      (namesMatch && phonesMatch && platesMatch) ||
      (nearIdentity && platesMatch && (namesMatch || phonesMatch)) ||
      (namesMatch && platesMatch && monthlyAmountsMatch && contractStartMatches);
    if (strongCorroboration) return null;
    return 'تم استبعاد العقد لأن الرقم الشخصي في الملف لا يطابق عميل العقد.';
  }

  if (fileHasName && !namesMatch && !nationalIdsMatch && !phonesMatch) {
    return 'تم استبعاد العقد لأن اسم العميل لا يطابق، ولا يوجد تطابق في الهوية أو الجوال. تطابق اللوحة وحده غير كافٍ.';
  }

  return null;
};

export const isAutomaticContractMatch = (score: number): boolean =>
  score >= AUTO_CONTRACT_MATCH_MIN_CONFIDENCE;

const editDistance = (left: string, right: string): number => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length];
};

export const hasCompatibleIdentityName = (source: string, aliases: string[]): boolean =>
  Boolean(source && aliases.some((alias) => {
    if (!alias) return false;
    if (source.includes(alias) || alias.includes(source)) return true;
    if (Math.min(source.length, alias.length) < 6) return false;
    const similarity = 1 - (editDistance(source, alias) / Math.max(source.length, alias.length));
    return similarity >= 0.85;
  }));

export const areNearMonthlyAmounts = (left: number, right: number): boolean => {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) return false;
  return Math.abs(left - right) / Math.max(left, right) <= 0.1;
};

export const getImportedDelayDays = ({
  delayColumnIndex,
  paymentAmount,
  parsedDelayDays,
}: {
  delayColumnIndex: number;
  paymentAmount: number;
  parsedDelayDays: number | null;
}): number => {
  if (delayColumnIndex < 0 || paymentAmount > 0) return 0;
  return parsedDelayDays && parsedDelayDays > 0 ? parsedDelayDays : 0;
};
