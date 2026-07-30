/**
 * إصلاح عرض النصوص العربية التالفة (mojibake / أحرف تحكم / رموز).
 * يُستخدم عند عرض حقول قادمة من قاعدة البيانات أو تكاملات خارجية.
 */

const MOJIBAKE_MARKERS = ['\u00d8', '\u00d9', '\u00c3', '\u00c2', '\u00e2', '\u00f0', '\ufffd'];

const CONTROL_OR_JUNK = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;

const hasMojibake = (input: string) =>
  MOJIBAKE_MARKERS.some((marker) => input.includes(marker));

const countArabicLetters = (input: string) =>
  (input.match(/[\u0600-\u06FF]/g) || []).length;

const countMojibakeMarkers = (input: string) =>
  MOJIBAKE_MARKERS.reduce(
    (count, marker) => count + (input.split(marker).length - 1),
    0,
  );

const countWeirdAscii = (input: string) =>
  (input.match(/[&!`#@$%^*=[\]{}|\\<>~^_]/g) || []).length;

const decodeLatin1Utf8 = (input: string) => {
  try {
    const bytes = Uint8Array.from(input, (char) => char.charCodeAt(0) & 0xff);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  } catch {
    return input;
  }
};

const chooseBestDisplayText = (options: string[]) =>
  options
    .map((text) => text.trim())
    .filter(Boolean)
    .sort((a, b) => {
      const arabicDelta = countArabicLetters(b) - countArabicLetters(a);
      if (arabicDelta !== 0) return arabicDelta;
      const controlDelta =
        Number(CONTROL_OR_JUNK.test(a)) - Number(CONTROL_OR_JUNK.test(b));
      if (controlDelta !== 0) return controlDelta;
      return countMojibakeMarkers(a) - countMojibakeMarkers(b);
    })[0] || '';

const extractCaseNumber = (input: string) =>
  input.match(/CASE-\d{2}-\d{4}/i)?.[0]?.toUpperCase() ?? null;

/** هل النص يبدو تالفًا ويستحق الإصلاح؟ */
export function hasCorruptedArabic(input?: string | null): boolean {
  if (!input) return false;
  if (hasMojibake(input) || /\?{3,}/.test(input)) return true;
  if (CONTROL_OR_JUNK.test(input)) return true;
  const arabic = countArabicLetters(input);
  const weird = countWeirdAscii(input);
  if (arabic > 0 && weird >= 2) return true;
  // عربي متقطع + رقم قضية: غالبًا عنوان مهمة قانونية تالف
  if (arabic > 0 && arabic <= 10 && extractCaseNumber(input) && weird + Number(/[ًٌٍَُِّْ]/u.test(input)) >= 1) {
    return true;
  }
  return false;
}

/**
 * يعيد بناء عناوين مهام سير العمل القانوني من workflow_key و/أو رقم القضية.
 */
export function repairLegalWorkflowTitle(
  title: string,
  workflowKey?: string | null,
  caseNumberHint?: string | null,
): string {
  const caseNumber =
    extractCaseNumber(title)
    || extractCaseNumber(caseNumberHint || '')
    || null;
  const key = String(workflowKey || '').toLowerCase();

  if (caseNumber) {
    if (key.startsWith('daily-appeal')) return `مهلة استئناف: ${caseNumber}`;
    if (key.startsWith('appeal-record')) return `متابعة استئناف ${caseNumber}`;
    if (key.startsWith('appeal:')) return `قرار الاستئناف للقضية ${caseNumber}`;
    if (key.startsWith('hearing:') || key.startsWith('daily-hearing')) {
      return key.startsWith('daily-hearing')
        ? `جلسة قريبة: ${caseNumber}`
        : `متابعة جلسة ${caseNumber}`;
    }
    if (key.startsWith('hearing-result')) return `تحديث نتيجة جلسات ${caseNumber}`;
    if (key.startsWith('schedule-hearing')) return `تحديد جلسة ${caseNumber}`;
    if (key.startsWith('judgment-followup')) return `متابعة حكم ${caseNumber}`;
    if (key.startsWith('post-judgment')) return `تحديد إجراء ما بعد الحكم ${caseNumber}`;
    if (key.startsWith('daily-enforcement') || key.startsWith('enforcement:')) {
      return `متابعة التنفيذ: ${caseNumber}`;
    }
    if (key.startsWith('daily-collection')) return `متابعة تحصيل الحكم: ${caseNumber}`;
    if (key.startsWith('prepare:')) return `استكمال تجهيز ${caseNumber}`;
    if (key.startsWith('post-close')) return `متابعة ما بعد الإغلاق ${caseNumber}`;

    // بدون مفتاح: استنتج فقط من النص التالف
    if (hasCorruptedArabic(title)) {
      if (/مهلة/i.test(title)) return `مهلة استئناف: ${caseNumber}`;
      if (/متابعة/.test(title) && /تنفيذ/.test(title)) return `متابعة التنفيذ: ${caseNumber}`;
      if (/تحصيل/.test(title)) return `متابعة تحصيل الحكم: ${caseNumber}`;
      if (/جلسة/.test(title)) return `متابعة جلسة ${caseNumber}`;
      if (/است|appeal/i.test(title)) return `استئناف القضية ${caseNumber}`;
    }
  }

  return title;
}

export function decodePossiblyMojibake(value: string): string {
  const text = value.trim();
  if (!text) return text;

  const needsDecode = hasCorruptedArabic(text);
  if (!needsDecode) {
    return text;
  }

  const firstPass = hasMojibake(text) ? decodeLatin1Utf8(text) : text;
  const secondPass = hasMojibake(firstPass) ? decodeLatin1Utf8(firstPass) : firstPass;
  const best = chooseBestDisplayText([text, firstPass, secondPass]) || text;

  const cleaned = best
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/\uFFFD+/g, ' ')
    .replace(/\?{3,}/g, ' ')
    .replace(/[&!`#@$%^*=[\]{}|\\<>~^_]+/g, ' ')
    .replace(/[\u064B-\u065F\u0670]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const repaired = repairLegalWorkflowTitle(cleaned || text);
  if (repaired !== (cleaned || text)) return repaired;

  const caseNumber = extractCaseNumber(cleaned || text);
  if (caseNumber && (/است|appeal/i).test(cleaned || text)) {
    return `استئناف القضية ${caseNumber}`;
  }

  // إذا بقي النص تالفًا ووجدنا رقم قضية فقط
  if (caseNumber && hasCorruptedArabic(cleaned || text)) {
    return `متابعة القضية ${caseNumber}`;
  }

  return cleaned || text;
}

export function decodeDisplayText(value?: unknown): string {
  if (typeof value === 'string') return decodePossiblyMojibake(value);
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  const preferred =
    record.message
    ?? record.reason
    ?? record.error
    ?? record.description
    ?? record.title
    ?? record.name
    ?? record.label;

  if (preferred != null && preferred !== value) {
    return decodeDisplayText(preferred);
  }

  try {
    return decodePossiblyMojibake(JSON.stringify(value));
  } catch {
    return '';
  }
}

/** عنوان مهمة قانونية مع الاستفادة من metadata.workflow_key */
export function decodeLegalTaskTitle(
  task: {
    title?: string | null;
    metadata?: { workflow_key?: string | null; legal_case_id?: string | null } | null;
  },
  caseNumber?: string | null,
): string {
  const title = String(task.title || '').trim();
  const key = task.metadata?.workflow_key ?? null;

  // عند وجود workflow_key: ابنِ العنوان المعتمد مباشرة (حتى لو كان title سليمًا جزئيًا)
  if (key && (hasCorruptedArabic(title) || !title || extractCaseNumber(title || caseNumber || ''))) {
    const fromKey = repairLegalWorkflowTitle(
      title || caseNumber || '',
      key,
      caseNumber,
    );
    if (fromKey && fromKey !== title && !hasCorruptedArabic(fromKey)) {
      return fromKey;
    }
  }

  if (hasCorruptedArabic(title)) {
    return decodePossiblyMojibake(title);
  }

  return title;
}
