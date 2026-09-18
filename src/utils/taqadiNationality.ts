/** A placeholder or country of residence cannot establish a party's nationality. */
export function hasKnownTaqadiNationality(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.length > 1 && ![
    'غير محدد', 'غير محددة', 'غير معروف', 'غير معروفة',
    'unknown', 'unspecified', 'not specified', 'n/a', 'null', 'undefined', '--',
  ].includes(normalized);
}

export const DEFENDANT_NATIONALITY_REQUIRED_MESSAGE =
  'جنسية المدعى عليه غير مكتملة. حدّد الجنسية الصحيحة في ملف العميل وفق عقده أو وثيقة هويته، ثم حدّث حزمة الدعوى وتابع المسودة الحالية.';
