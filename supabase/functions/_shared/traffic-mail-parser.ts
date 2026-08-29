export type TrafficMailNotice =
  | {
      type: "fine";
      fineKind: "radar" | "traffic";
      plate: string;
      date: string;
      amount: number;
      penaltyNumber?: string;
      recordedSpeed?: number;
      vehicleClass?: string;
    }
  | {
      type: "discount_expiry";
      plate: string;
      date: string;
      hoursRemaining?: number;
      vehicleClass?: string;
    }
  | { type: "block_vehicle"; plate: string; location: "street_52" }
  | { type: "case_transfer"; qid: string }
  | { type: "unknown"; reason: string };

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalizeArabicDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => ARABIC_DIGITS[digit]);
}

export function normalizeMoiPlate(value: string): string {
  const digits = normalizeArabicDigits(value).replace(/\D/g, "");
  return digits.length > 0 && digits.length < 6 ? digits.padStart(6, "0") : digits;
}

function cleanText(value: string): string {
  return normalizeArabicDigits(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

export function parseMoiTrafficMail(subject: string, body: string): TrafficMailNotice {
  const text = cleanText(`${subject} ${body}`);

  if (text.includes("تحويل المخالفات المرورية لمتابعة القضايا")) {
    const qid = text.match(/(?:الرقم الشخصي|رقم شخصي|QID)?\s*[:：-]?\s*(\d{11})/i)?.[1];
    return qid ? { type: "case_transfer", qid } : { type: "unknown", reason: "case_transfer_without_qid" };
  }

  if (/حجز مركبة|Block Vehicle/i.test(text)) {
    const plate = text.match(/(?:المركبة|مركبة)\s*(?:رقم)?\s*[:：-]?\s*(\d{1,8})/i)?.[1];
    return plate
      ? { type: "block_vehicle", plate: normalizeMoiPlate(plate), location: "street_52" }
      : { type: "unknown", reason: "block_vehicle_without_plate" };
  }

  if (text.includes("تنتهي مدة الخصم")) {
    const details = text.match(/رقم\s*\(\s*([^)-]+?)\s*-\s*(\d{1,8})\s*\).*?بتاريخ\s*[:：]?\s*(\d{4}-\d{2}-\d{2})/i);
    if (!details || !isValidIsoDate(details[3])) {
      return { type: "unknown", reason: "discount_expiry_unparseable" };
    }
    const hours = text.match(/بعد\s*(\d+)\s*ساعة/)?.[1];
    return {
      type: "discount_expiry",
      vehicleClass: details[1].trim(),
      plate: normalizeMoiPlate(details[2]),
      date: details[3],
      hoursRemaining: hours ? Number(hours) : undefined,
    };
  }

  if (/تم تسجيل مخالفة (?:ردار|رادار|مرورية)/.test(text)) {
    const plate = text.match(/رقم المركبة\s*[:：]\s*(\d{1,8})/)?.[1];
    const vehicleClass = text.match(/رقم المركبة\s*[:：]\s*\d{1,8}\s*-\s*([^:]+?)\s+التاريخ/)?.[1]?.trim();
    const date = text.match(/التاريخ\s*[:：]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const amount = text.match(/القيمة\s*[:：]\s*([\d,.]+)/)?.[1];
    const numericAmount = amount ? Number(amount.replace(/,/g, "")) : 0;
    if (
      !plate ||
      !date ||
      !isValidIsoDate(date) ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 1_000_000
    ) {
      return { type: "unknown", reason: "fine_unparseable" };
    }
    const speed = text.match(/السرعة المسجلة\s*[:：]\s*(\d+)/)?.[1];
    const penaltyNumber = text.match(/رقم المخالفة\s*[:：]\s*([\d-]+)/)?.[1];
    return {
      type: "fine",
      fineKind: /ردار|رادار/.test(text) ? "radar" : "traffic",
      plate: normalizeMoiPlate(plate),
      date,
      amount: numericAmount,
      vehicleClass,
      penaltyNumber,
      recordedSpeed: speed ? Number(speed) : undefined,
    };
  }

  return { type: "unknown", reason: "unsupported_message" };
}
