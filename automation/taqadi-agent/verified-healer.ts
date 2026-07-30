import type { PortalObservation } from './portal-observer';
import { normalizeArabic } from './portal-stage';
import type { HealSuggestion } from './selector-healer';

// Level 2 — verified auto-heal. An LLM heal suggestion is applied in-session
// ONLY when it survives deterministic verification against the live page
// observation: the suggested control must actually exist, be visible and
// enabled, and match by control id or by (normalized Arabic) label. Anything
// less keeps the legacy propose-only flow (needs_human + artifact).

export interface HealVerification {
  verified: boolean;
  matchedBy: 'controlId' | 'label' | null;
  matchedControl: { id: string | null; label: string } | null;
  reason: string;
}

export function verifySuggestionAgainstObservation(
  suggestion: HealSuggestion,
  observation: PortalObservation,
): HealVerification {
  if (!suggestion.found) {
    return {
      verified: false,
      matchedBy: null,
      matchedControl: null,
      reason: 'الاقتراح لم يجد حقلًا مطابقًا أصلًا',
    };
  }

  const usableControls = observation.controls.filter((control) => !control.disabled);

  // 1) تطابق معرّف الحقل — أقوى دليل
  const suggestedIds = new Set(suggestion.suggestedControlIds);
  if (suggestedIds.size > 0) {
    const byId = usableControls.find((control) =>
      (control.id && suggestedIds.has(control.id))
      || (control.name && suggestedIds.has(control.name)));
    if (byId) {
      return {
        verified: true,
        matchedBy: 'controlId',
        matchedControl: { id: byId.id ?? byId.name, label: byId.label },
        reason: `تطابق معرّف الحقل: ${byId.id ?? byId.name}`,
      };
    }
  }

  // 2) تطابق التسمية بعد التطبيع العربي (همزات/تشكيل/تاء مربوطة)
  const suggestedLabels = suggestion.suggestedLabels
    .map((label) => normalizeArabic(label))
    .filter(Boolean);
  if (suggestedLabels.length > 0) {
    const byLabel = usableControls.find((control) => {
      const controlLabel = normalizeArabic(control.label);
      return controlLabel.length > 0
        && suggestedLabels.some(
          (label) => controlLabel === label
            || controlLabel.includes(label)
            || label.includes(controlLabel),
        );
    });
    if (byLabel) {
      return {
        verified: true,
        matchedBy: 'label',
        matchedControl: { id: byLabel.id ?? byLabel.name, label: byLabel.label },
        reason: `تطابق تسمية الحقل: ${byLabel.label}`,
      };
    }
  }

  return {
    verified: false,
    matchedBy: null,
    matchedControl: null,
    reason: 'الحقل المقترح غير موجود أو غير مفعّل في الصفحة الحالية',
  };
}

/**
 * قرار التطبيق الآلي: ثقة عالية من النموذج + تحقق حتمي ناجح.
 * أي درجة أقل تُبقي المسار اليدوي (needs_human + اقتراح للمراجعة).
 */
export function shouldAutoApplyHeal(
  suggestion: HealSuggestion | null,
  verification: HealVerification,
): boolean {
  return Boolean(
    suggestion
    && suggestion.found
    && suggestion.confidence === 'high'
    && verification.verified,
  );
}
