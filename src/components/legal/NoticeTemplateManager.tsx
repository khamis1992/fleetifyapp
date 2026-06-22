import React from 'react';

export interface NoticeVariables {
  companyName: string;
  companyNameAr: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  commercialRegNo: string;
  customerName: string;
  customerType: 'individual' | 'company';
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerId: string;
  nationalId: string;
  contractNumber: string;
  contractDate: string;
  contractTermsAr: string;
  vehiclePlate?: string;
  invoiceNumbers: string[];
  invoiceDates: string[];
  invoiceAmounts: number[];
  invoiceCurrency: string;
  invoiceCurrencyAr: string;
  totalRent: number;
  lateFees: number;
  courtFees: number;
  violationsFees: number;
  totalDebt: number;
  daysOverdue: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  deadlineDays: number;
  deadlineDate: string;
  documentNumber: string;
  dateIssued: string;
  companyRepName?: string;
  companyRepTitle?: string;
}

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency,
    maximumFractionDigits: 3,
  }).format(amount);
};

const getArabicDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-KW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const NoticeTemplates = {
  preWarning: (vars: NoticeVariables): string => `
بسم الله الرحمن الرحيم

${vars.companyNameAr}
العنوان: ${vars.companyAddress} | الهاتف: ${vars.companyPhone} | البريد: ${vars.companyEmail}

═══════════════════════════════════════════════════════════════════
خطاب إنذار ما قبل الإجراءات القانونية - يوم ${vars.daysOverdue}
═══════════════════════════════════════════════════════════════════

التاريخ: ${getArabicDate(vars.dateIssued)} | رقم الوثيقة: ${vars.documentNumber}

إلى السيد/ة: ${vars.customerName}
رقم الهوية: ${vars.nationalId}

الموضوع: إنذار بسداد المستحقات المتأخرة

تحية طيبة وبعد،

يطيب لنا أن نفسح لك المجال بهذا الخطاب للانتباه إلى التزاماتك المالية المتأخرة
بموجب العقد المبرم بيننا رقم ${vars.contractNumber} بتاريخ ${getArabicDate(vars.contractDate)}.

────────────────────────────────────────────────────────────────────

جدول المستحقات:

المبلغ الأساسي: ${formatCurrency(vars.totalRent, vars.invoiceCurrency)}
غرامات التأخير: ${formatCurrency(vars.lateFees, vars.invoiceCurrency)}
${vars.violationsFees > 0 ? `المخالفات: ${formatCurrency(vars.violationsFees, vars.invoiceCurrency)}\n` : ''}
────────────────────────────────────────────────────────────────────
الإجمالي المستحق: ${formatCurrency(vars.totalDebt, vars.invoiceCurrency)}

────────────────────────────────────────────────────────────────────

نطالبك بسداد المبلغ الكامل قبل: ${getArabicDate(vars.deadlineDate)} (${vars.deadlineDays} أيام)

عدم السداد سيؤدي إلى اتخاذ إجراءات قانونية.

يمكنك التواصل معنا على:
📞 ${vars.companyPhone} | 📧 ${vars.companyEmail}

مع أطيب التحيات،
${vars.companyRepName || 'إدارة الشركة'}

═══════════════════════════════════════════════════════════════════
  `,

  finalDemand: (vars: NoticeVariables): string => `
بسم الله الرحمن الرحيم

${vars.companyNameAr}
السجل التجاري: ${vars.commercialRegNo}

═══════════════════════════════════════════════════════════════════
            خطاب المطالبة القانونية النهائية - يوم ${vars.daysOverdue}
═══════════════════════════════════════════════════════════════════

التاريخ: ${getArabicDate(vars.dateIssued)} | رقم الوثيقة: ${vars.documentNumber}

إلى السيد/ة: ${vars.customerName} | الهوية: ${vars.nationalId}

الموضوع: إنذار قانوني نهائي قبل رفع دعوى

هذا إنذار قانوني ملزم بموجب قانون التجارة الكويتي

────────────────────────────────────────────────────────────────────

بيانات الدين:

┌──────────────────────────────┬──────────────────────┐
│ البيان                      │ المبلغ               │
├──────────────────────────────┼──────────────────────┤
│ الإيجارات المتأخرة         │ ${formatCurrency(vars.totalRent, vars.invoiceCurrency).padStart(18)}│
│ غرامات التأخير            │ ${formatCurrency(vars.lateFees, vars.invoiceCurrency).padStart(18)}│
${vars.violationsFees > 0 ? `│ المخالفات والعقوبات        │ ${formatCurrency(vars.violationsFees, vars.invoiceCurrency).padStart(18)}│\n` : ''}│ المصاريف القانونية (10%)  │ ${formatCurrency(vars.totalDebt * 0.1, vars.invoiceCurrency).padStart(18)}│
├──────────────────────────────┼──────────────────────┤
│ الإجمالي النهائي           │ ${formatCurrency(vars.totalDebt * 1.1, vars.invoiceCurrency).padStart(18)}│
└──────────────────────────────┴──────────────────────┘

────────────────────────────────────────────────────────────────────

المطالبة النهائية:

يجب سداد المبلغ الكامل: ${formatCurrency(vars.totalDebt * 1.1, vars.invoiceCurrency)}

في غضون: ${vars.deadlineDays} أيام
قبل تاريخ: ${getArabicDate(vars.deadlineDate)}

────────────────────────────────────────────────────────────────────

التحذير من الإجراءات:

عدم السداد في الموعد سيؤدي إلى:
✗ رفع دعوى مدنية فوراً
✗ تحميلك المصاريف القانونية والمحاماة
✗ فرض فائدة قانونية 9% سنوياً
✗ الإبلاغ للبنك المركزي والجهات الائتمانية
✗ إضافتك للقائمة السوداء

────────────────────────────────────────────────────────────────────

للتواصل والتسوية:
📞 ${vars.companyPhone} | 📧 ${vars.companyEmail}

هذا إنذار قانوني نهائي ملزم

${vars.companyRepName || 'إدارة الشركة'} - ${getArabicDate(vars.dateIssued)}

═══════════════════════════════════════════════════════════════════
  `,

  courtFiling: (vars: NoticeVariables): string => `
بسم الله الرحمن الرحيم

═══════════════════════════════════════════════════════════════════
           دعوى مدنية لتحصيل مستحقات مالية
═══════════════════════════════════════════════════════════════════

إلى سيادة الدائرة المدنية بالمحكمة الابتدائية

المُدعي: ${vars.companyNameAr}
السجل التجاري: ${vars.commercialRegNo}

المُدعى عليه: ${vars.customerName}
الهوية: ${vars.nationalId}

────────────────────────────────────────────────────────────────────

عريضة الدعوى:

أولاً: موضوع الدعوى

يتعلق الموضوع بمخالفة المُدعى عليه لالتزاماته العقدية بعدم سداد الأموال المستحقة
بموجب عقد الإيجار رقم ${vars.contractNumber} المؤرخ ${getArabicDate(vars.contractDate)}.

ثانياً: الحقائق

• عقد إيجار مبرم بين الطرفين برقم: ${vars.contractNumber}
• المبلغ الأساسي المستحق: ${formatCurrency(vars.totalRent, vars.invoiceCurrency)}
• غرامات التأخير: ${formatCurrency(vars.lateFees, vars.invoiceCurrency)}
• عدد الأيام المتأخرة: ${vars.daysOverdue} يوم
• المجموع النهائي: ${formatCurrency(vars.totalDebt * 1.1, vars.invoiceCurrency)}

ثالثاً: الطلبات

الحكم بإلزام المُدعى عليه بسداد:
1. المبلغ الأساسي: ${formatCurrency(vars.totalDebt, vars.invoiceCurrency)}
2. الفائدة القانونية: 9% سنوياً من تاريخ المطالبة
3. نفقات الدعوى والمحاماة: 10% من المبلغ
4. جميع المصاريف والرسوم القضائية

رابعاً: الأساس القانوني

• قانون التجارة الكويتي رقم (68) لسنة 1980
• القانون المدني الكويتي
• قانون المرافعات المدنية
• أحكام البنك المركزي للفوائد

تاريخ العريضة: ${getArabicDate(vars.dateIssued)}
رقم الوثيقة: ${vars.documentNumber}

═══════════════════════════════════════════════════════════════════
  `,

  settlement: (vars: NoticeVariables): string => `
بسم الله الرحمن الرحيم

═══════════════════════════════════════════════════════════════════
              اتفاق الصلح والتسوية الودية
═══════════════════════════════════════════════════════════════════

بتاريخ: ${getArabicDate(vars.dateIssued)}

الطرف الأول (الدائن): ${vars.companyNameAr}
الطرف الثاني (المدين): ${vars.customerName}

────────────────────────────────────────────────────────────────────

قد اتفق الطرفان على ما يلي:

البند الأول: الأساس

اعترف الطرف الثاني بوجود دين عليه للطرف الأول بموجب العقد رقم ${vars.contractNumber}
بقيمة: ${formatCurrency(vars.totalDebt, vars.invoiceCurrency)}

البند الثاني: شروط التسوية

يتنازل الطرف الأول عن 15% من الدين (خصم التسوية)
المبلغ المتفق على سداده: ${formatCurrency(vars.totalDebt * 0.85, vars.invoiceCurrency)}

البند الثالث: جدول الدفع

يقوم الطرف الثاني بسداد المبلغ المتفق عليه على النحو التالي:
• قسط أول: 50% من المبلغ خلال 15 يوم
• قسط ثاني: 50% من المبلغ خلال 30 يوم

البند الرابع: الالتزامات

في حالة التخلف عن السداد، يحق للطرف الأول اتخاذ الإجراءات القانونية الفورية.

البند الخامس: التنازلات

يتنازل الطرف الأول عن:
• جميع الغرامات الإضافية
• الفوائد القانونية عن الفترة المستقبلية

────────────────────────────────────────────────────────────────────

الطرف الأول: ________________    الطرف الثاني: ________________
التاريخ: ${getArabicDate(vars.dateIssued)}

═══════════════════════════════════════════════════════════════════
  `,

  paymentAcknowledgment: (vars: NoticeVariables): string => `
بسم الله الرحمن الرحيم

═══════════════════════════════════════════════════════════════════
              إقرار استلام الدفعة - وثيقة رسمية
═══════════════════════════════════════════════════════════════════

تاريخ الإقرار: ${getArabicDate(vars.dateIssued)}
رقم الإقرار: ${vars.documentNumber}

──────────────────────────────────────────────────────────────────

المُقِر: ${vars.companyNameAr}
السجل التجاري: ${vars.commercialRegNo}

المُقِر له (الدافع): ${vars.customerName}
رقم الهوية: ${vars.nationalId}

──────────────────────────────────────────────────────────────────

نقِر ونُشهد أننا استقبلنا من السيد/ة ${vars.customerName} المبلغ التالي:

المبلغ المستلم: ${formatCurrency(vars.lastPaymentAmount || 0, vars.invoiceCurrency)}

تاريخ الاستلام: ${getArabicDate(vars.dateIssued)}
طريقة الدفع: تحويل بنكي / نقداً / شيك

البيانات المتعلقة بالدين الأصلي:

• رقم العقد: ${vars.contractNumber}
• المبلغ الأصلي المستحق: ${formatCurrency(vars.totalDebt, vars.invoiceCurrency)}
• المبلغ المسدد اليوم: ${formatCurrency(vars.lastPaymentAmount || 0, vars.invoiceCurrency)}
• الرصيد المتبقي: ${formatCurrency((vars.totalDebt - (vars.lastPaymentAmount || 0)), vars.invoiceCurrency)}

────────────────────────────────────────────────────────────────────

شروط الإقرار:

1. هذا الإقرار يشهد باستلام المبلغ المذكور أعلاه فقط
2. لا يشكل تنازلاً عن أي حقوق للشركة
3. الدفع على حساب الالتزامات المستحقة
4. يحتفظ الطرف الأول بكل الحقوق بشأن الرصيد المتبقي

────────────────────────────────────────────────────────────────────

التوقيع:

للشركة: ________________          للدافع: ________________
التاريخ: ${getArabicDate(vars.dateIssued)}

═══════════════════════════════════════════════════════════════════
وثيقة رسمية من نظام إدارة التحصيل - Fleetify Collection System
═══════════════════════════════════════════════════════════════════
  `,
};

export const getTemplateList = () => [
  {
    id: 'pre_warning',
    name: 'Pre-Legal Warning Letter',
    nameAr: 'خطاب إنذار ما قبل الإجراءات',
    daysOverdue: 14,
    description: 'Initial warning letter - formal but non-legal',
  },
  {
    id: 'final_demand',
    name: 'Final Demand Letter',
    nameAr: 'خطاب المطالبة النهائية',
    daysOverdue: 21,
    description: t("finalDemandWithLegal"),
  },
  {
    id: 'court_filing',
    name: 'Court Filing Documents',
    nameAr: 'وثائق التقاضي',
    daysOverdue: 30,
    description: t("legalDocumentsForCourt"),
  },
  {
    id: 'settlement',
    name: 'Settlement Agreement',
    nameAr: 'اتفاق التسوية',
    daysOverdue: 45,
    description: t("settlementAgreementWithPayment"),
  },
  {
    id: 'payment_acknowledgment',
    name: 'Payment Acknowledgment',
    nameAr: 'إقرار استلام الدفعة',
    daysOverdue: -1,
    description: t("receiptAcknowledgmentForPayments"),
  },
];
