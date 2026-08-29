interface ClaimCalculationSource {
  overdueRent: number;
  lateFees: number;
  violationsFines: number;
  damagesFee?: number;
  retentionCompensation?: number;
  /** الخصم المحفوظ في نتيجة الحساب الموحدة، كي لا يضيع في مسارات الرفع البديلة. */
  securityDepositDeduction?: number;
}

export interface LawsuitClaimAmounts {
  /** إجمالي المبلغ الوارد في الوقائع والطلبات، شاملاً المخالفات المرورية. */
  cashClaimAmount: number;
  /** إجمالي قيمة الطلبات المسجلة في حقل قيمة المطالبات بنظام تقاضي. */
  taqadiClaimAmount: number;
}

/** مكونات موثقة إضافية خارج حسابات التعثر: مصاريف مثبتة ووديعة ضمان مطبقة */
export interface ClaimExtras {
  /** مجموع بنود مصاريف الأضرار المتحقق منها بسند مستند (verified فقط) */
  verifiedDamages?: number;
  /** قيمة وديعة الضمان المطبقة خصماً من التسوية */
  securityDepositDeduction?: number;
}

/**
 * المبلغ الرسمي الموحد للدعوى = مكونات موثقة بالمستندات فقط:
 * صافي الإيجارات غير المسددة (بعد المدفوعات الجزئية) + الغرامات التعاقدية
 * المفصلة على الفواتير + قيمة المخالفات المرورية + مصاريف الأضرار المتحقق منها،
 * ناقصاً وديعة الضمان عند قرار تطبيقها في التسوية.
 *
 * لا يدخل في المطالبة أي مبلغ ثابت غير مثبت بمستند؛ والأرقام السالبة تُصفَّر.
 */
export function getLawsuitClaimAmounts(
  calculations: ClaimCalculationSource,
  extras: ClaimExtras = {},
): LawsuitClaimAmounts {
  const depositDeduction = extras.securityDepositDeduction
    ?? calculations.securityDepositDeduction
    ?? 0;
  const documentedTotal = Math.max(
    0,
    Math.max(0, Number(calculations.overdueRent || 0))
      + Math.max(0, Number(calculations.lateFees || 0))
      + Math.max(0, Number(calculations.violationsFines || 0))
      + Math.max(0, Number(calculations.damagesFee || 0))
      + Math.max(0, Number(calculations.retentionCompensation || 0))
      + Math.max(0, Number(extras.verifiedDamages || 0))
      - Math.max(0, Number(depositDeduction || 0)),
  );

  return {
    cashClaimAmount: documentedTotal,
    taqadiClaimAmount: documentedTotal,
  };
}
