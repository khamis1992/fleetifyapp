export interface NoticeVariables {
  companyName: string;
  companyNameAr: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  commercialRegNo: string;
  companyLogoUrl?: string;
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
  return new Intl.NumberFormat('ar-QA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const baseHeader = (title: string, vars: NoticeVariables): string => `
${vars.companyNameAr}
السجل التجاري: ${vars.commercialRegNo || 'غير محدد'}
العنوان: ${vars.companyAddress || 'غير محدد'}
الهاتف: ${vars.companyPhone || 'غير محدد'} | البريد الإلكتروني: ${vars.companyEmail || 'غير محدد'}

${title}

رقم الوثيقة: ${vars.documentNumber}
تاريخ الإصدار: ${formatDate(vars.dateIssued)}
`;

const recipientBlock = (vars: NoticeVariables): string => `
السيد/السادة: ${vars.customerName}
رقم الهوية/السجل: ${vars.nationalId || 'غير محدد'}
العنوان: ${vars.customerAddress || 'غير محدد'}
الهاتف: ${vars.customerPhone || 'غير محدد'}
`;

const financialReferenceBlock = (_vars: NoticeVariables): string => `
تم حصر تفاصيل المديونية والفواتير والمبالغ المستحقة في جدول "بيانات المطالبة المالية" أعلاه، ويعد هذا الجدول جزءاً لا يتجزأ من هذا المستند.
`;

const signatureBlock = (vars: NoticeVariables): string => `
وتفضلوا بقبول فائق الاحترام،

${vars.companyRepName || 'الإدارة القانونية'}
${vars.companyRepTitle || 'المفوض بالتوقيع'}
${vars.companyNameAr}
`;

export const NoticeTemplates = {
  friendlyReminder: (vars: NoticeVariables): string => `${baseHeader('تذكير أول بسداد مستحقات', vars)}
${recipientBlock(vars)}
الموضوع: تذكير بسداد مستحقات مالية

نود تذكيركم بوجود مبالغ مستحقة لصالح ${vars.companyNameAr} وفق البيان أدناه. ونأمل منكم المبادرة بالسداد أو التواصل مع الإدارة المختصة لترتيب السداد خلال أقرب وقت.

${financialReferenceBlock(vars)}
يرجى السداد خلال ${vars.deadlineDays} أيام من تاريخ هذا التذكير، أو التواصل معنا لتحديث حالة الحساب.

هذا الخطاب تذكيري ولا يمس بحق الشركة في المطالبة بالمبالغ المستحقة عند استمرار التأخير.

${signatureBlock(vars)}`,

  preWarning: (vars: NoticeVariables): string => `${baseHeader('إخطار ودي بسداد مستحقات مالية', vars)}
${recipientBlock(vars)}
الموضوع: إخطار بسداد مبالغ مستحقة قبل اتخاذ أي إجراءات قانونية

بالإشارة إلى العلاقة التعاقدية القائمة بينكم وبين ${vars.companyNameAr}، وإلى الفواتير المستحقة الموضحة أدناه، نفيدكم بأن سجلاتنا المالية تظهر وجود مبالغ غير مسددة تجاوزت مدة استحقاقها ${Math.max(vars.daysOverdue, 0)} يوماً.

${financialReferenceBlock(vars)}
وعليه، نرجو منكم سداد إجمالي المبلغ المستحق خلال مدة لا تتجاوز ${vars.deadlineDays} أيام من تاريخ هذا الإخطار، وبحد أقصى ${formatDate(vars.deadlineDate)}.

يعد هذا الإخطار فرصة ودية لتسوية المديونية قبل إحالة الملف إلى الإجراءات القانونية أو التحصيل القضائي، مع احتفاظ الشركة بكامل حقوقها النظامية والتعاقدية.

${signatureBlock(vars)}`,

  finalDemand: (vars: NoticeVariables): string => `${baseHeader('إنذار نهائي بالسداد قبل اتخاذ الإجراءات القانونية', vars)}
${recipientBlock(vars)}
الموضوع: إنذار نهائي بسداد مديونية مستحقة

بالإشارة إلى الإخطارات السابقة وإلى المبالغ المستحقة عليكم بموجب الفواتير والعلاقة التعاقدية مع ${vars.companyNameAr}، وحيث لم يتم السداد حتى تاريخ هذا الإنذار، فإننا ننذركم إنذاراً نهائياً بضرورة سداد كامل المديونية.

${financialReferenceBlock(vars)}
نمهلكم مدة ${vars.deadlineDays} أيام فقط من تاريخ هذا الإنذار للسداد أو تقديم ما يثبت التسوية، على ألا يتجاوز ذلك تاريخ ${formatDate(vars.deadlineDate)}.

في حال عدم السداد خلال المهلة المحددة، ستباشر الشركة إجراءاتها القانونية دون إشعار آخر، بما في ذلك المطالبة بأصل الدين والرسوم والمصاريف وأي تعويضات مستحقة.

هذا الإنذار لا يعد تنازلاً عن أي حق من حقوق الشركة، وتظل جميع الحقوق محفوظة.

${signatureBlock(vars)}`,

  courtFiling: (vars: NoticeVariables): string => `${baseHeader('مسودة بيانات مطالبة قضائية', vars)}
المدعي: ${vars.companyNameAr}
السجل التجاري: ${vars.commercialRegNo || 'غير محدد'}

المدعى عليه: ${vars.customerName}
رقم الهوية/السجل: ${vars.nationalId || 'غير محدد'}

موضوع المطالبة:
مطالبة مالية ناشئة عن عدم سداد مبالغ مستحقة بموجب العلاقة التعاقدية والفواتير الصادرة لصالح المدعي.

وقائع المطالبة:
1. ترتبط الشركة بالمدعى عليه بعلاقة تعاقدية/تجارية ثابتة.
2. صدرت فواتير مستحقة ولم يتم سدادها في مواعيد استحقاقها، وتفاصيلها مبينة في جدول "بيانات المطالبة المالية" أعلاه.
3. يبين جدول المطالبة المالية أعلاه إجمالي المطالبة حتى تاريخه.
4. تأخر السداد لمدة ${Math.max(vars.daysOverdue, 0)} يوماً تقريباً.

الطلبات:
إلزام المدعى عليه بسداد أصل المديونية والمصاريف والرسوم القانونية وأي تعويضات تقررها الجهة المختصة.

${signatureBlock(vars)}`,

  settlement: (vars: NoticeVariables): string => `${baseHeader('اتفاق تسوية وسداد مديونية', vars)}
الطرف الأول: ${vars.companyNameAr}
الطرف الثاني: ${vars.customerName}

تمهيد:
أقر الطرف الثاني بوجود مديونية مستحقة للطرف الأول عن الفواتير والالتزامات الموضحة في جدول "بيانات المطالبة المالية" أعلاه.

بنود التسوية:
1. يلتزم الطرف الثاني بسداد المبلغ المستحق وفق جدول سداد يتم اعتماده خطياً بين الطرفين.
2. لا تعد هذه التسوية تنازلاً عن حقوق الطرف الأول إلا في حدود ما يتم سداده فعلياً.
3. في حال الإخلال بأي دفعة أو موعد، يحق للطرف الأول اتخاذ الإجراءات القانونية للمطالبة بكامل الرصيد المتبقي.
4. تسري هذه التسوية من تاريخ توقيع الطرفين عليها.

توقيع الطرف الأول: ____________________
توقيع الطرف الثاني: ____________________

${signatureBlock(vars)}`,

  paymentPlan: (vars: NoticeVariables): string => `${baseHeader('خطة سداد مقترحة', vars)}
${recipientBlock(vars)}
الموضوع: عرض خطة سداد للمديونية المستحقة

بالإشارة إلى المديونية المستحقة عليكم لصالح ${vars.companyNameAr}، نعرض عليكم تسوية المبلغ وفق خطة سداد منظمة، مع احتفاظ الشركة بحقها في مراجعة الخطة أو إلغائها عند عدم الالتزام.

${financialReferenceBlock(vars)}
خطة السداد المقترحة:
1. دفعة أولى عند قبول الخطة: ____________________
2. عدد الدفعات الشهرية: ____________________
3. تاريخ أول دفعة: ____________________
4. تاريخ آخر دفعة: ____________________

شروط الخطة:
- لا تصبح الخطة نافذة إلا بعد اعتمادها خطياً من الطرفين.
- أي تأخر في السداد يعيد كامل الرصيد للاستحقاق الفوري.
- لا تعد الخطة مخالصة أو تنازلاً عن أي رسوم أو مصاريف إلا بموجب موافقة خطية.

توقيع العميل بالموافقة: ____________________

${signatureBlock(vars)}`,

  guarantorNotice: (vars: NoticeVariables): string => `${baseHeader('إشعار للضامن أو الكفيل', vars)}
الموضوع: إشعار بمديونية مستحقة على العميل المكفول/المضمون

السيد/السادة: ____________________

نفيدكم بأن العميل ${vars.customerName} لديه مديونية مستحقة لصالح ${vars.companyNameAr}، وذلك وفق البيان التالي:

${financialReferenceBlock(vars)}
وبصفتكم ضامناً/كفيلاً وفق المستندات أو العلاقة القائمة، نرجو منكم التواصل خلال ${vars.deadlineDays} أيام من تاريخ هذا الإشعار لتسوية المديونية أو تقديم ما يثبت السداد.

تحتفظ الشركة بكامل حقوقها في الرجوع على المدين الأصلي والضامن/الكفيل بحسب ما تقرره المستندات والأنظمة ذات العلاقة.

${signatureBlock(vars)}`,

  conditionalRelease: (vars: NoticeVariables): string => `${baseHeader('مخالصة مشروطة', vars)}
${recipientBlock(vars)}
الموضوع: مخالصة مشروطة بسداد المبالغ المستحقة

تقر ${vars.companyNameAr} بأنه في حال سداد العميل ${vars.customerName} لكامل المبلغ المستحق الموضح أدناه، تعتبر ذمته بريئة من هذه المطالبة المحددة فقط، دون أن يشمل ذلك أي مطالبات أخرى غير واردة في هذا المستند.

${financialReferenceBlock(vars)}
شروط المخالصة:
1. لا تسري المخالصة إلا بعد تحصيل كامل المبلغ فعلياً في حساب الشركة.
2. لا تشمل المخالصة أي مطالبات أو أضرار أو رسوم تظهر لاحقاً ولم تكن مشمولة في البيان أعلاه.
3. تحتفظ الشركة بحقها في إلغاء المخالصة إذا ثبت عدم صحة أي دفعة أو بيانات مقدمة.

${signatureBlock(vars)}`,

  assetReturnNotice: (vars: NoticeVariables): string => `${baseHeader('طلب إرجاع مركبة أو أصل مؤجر', vars)}
${recipientBlock(vars)}
الموضوع: طلب إرجاع الأصل/المركبة محل العلاقة التعاقدية

بالإشارة إلى العلاقة التعاقدية القائمة معكم وإلى وجود مبالغ مستحقة غير مسددة، تطلب منكم ${vars.companyNameAr} إرجاع الأصل/المركبة محل الانتفاع فوراً أو خلال مدة لا تتجاوز ${vars.deadlineDays} أيام.

بيانات الأصل/المركبة: ${vars.vehiclePlate || 'يتم استكمالها يدوياً'}

${financialReferenceBlock(vars)}
عدم الإرجاع أو عدم السداد خلال المهلة المذكورة قد يترتب عليه اتخاذ الإجراءات القانونية اللازمة للمطالبة بالمبالغ المستحقة والتعويض عن أي أضرار أو انتفاع غير مشروع.

${signatureBlock(vars)}`,

  legalReferral: (vars: NoticeVariables): string => `${baseHeader('إشعار إحالة الملف إلى الإدارة القانونية', vars)}
${recipientBlock(vars)}
الموضوع: إشعار بإحالة ملف المديونية إلى الإدارة القانونية

نحيطكم علماً بأنه نظراً لاستمرار عدم السداد رغم استحقاق المبالغ الموضحة أدناه، فقد تقرر إحالة ملفكم إلى الإدارة القانونية لدى ${vars.companyNameAr} لدراسة واتخاذ الإجراءات المناسبة.

${financialReferenceBlock(vars)}
يمكنكم تجنب التصعيد القانوني بسداد كامل المبلغ أو تقديم مقترح تسوية مقبول خلال ${vars.deadlineDays} أيام من تاريخ هذا الإشعار.

لا يعد هذا الإشعار تنازلاً عن أي حق من حقوق الشركة، وتظل كافة الحقوق محفوظة.

${signatureBlock(vars)}`,

  promiseToPay: (vars: NoticeVariables): string => `${baseHeader('تعهد بسداد مديونية', vars)}
أنا/نحن: ${vars.customerName}
رقم الهوية/السجل: ${vars.nationalId || 'غير محدد'}

أقر بأنني مدين/مدينون لصالح ${vars.companyNameAr} بالمبالغ الموضحة أدناه:

${financialReferenceBlock(vars)}
وأتعهد بسداد المبلغ وفق الآتي:
مبلغ الدفعة الأولى: ____________________
تاريخ الدفعة الأولى: ____________________
باقي الدفعات: ____________________

أقر بأن الإخلال بهذا التعهد يخول الشركة اتخاذ الإجراءات القانونية للمطالبة بكامل الرصيد المتبقي دون حاجة إلى إنذار جديد.

توقيع العميل: ____________________
التاريخ: ${formatDate(vars.dateIssued)}

${signatureBlock(vars)}`,

  paymentAcknowledgment: (vars: NoticeVariables): string => `${baseHeader('إقرار استلام دفعة', vars)}
نقر نحن ${vars.companyNameAr} باستلام دفعة من السيد/السادة ${vars.customerName}، وذلك على حساب المديونية المستحقة.

بيانات المديونية:
${financialReferenceBlock(vars)}
المبلغ المستلم: ${formatCurrency(vars.lastPaymentAmount || 0, vars.invoiceCurrency)}
تاريخ الاستلام: ${formatDate(vars.dateIssued)}

يعد هذا الإقرار إثباتاً لاستلام المبلغ المذكور فقط، ولا يشكل مخالصة نهائية أو تنازلاً عن أي رصيد متبقٍ إلا بموجب مستند مستقل صادر عن الشركة.

${signatureBlock(vars)}`,
};

export const getTemplateList = () => [
  {
    id: 'friendlyReminder',
    name: 'Friendly Payment Reminder',
    nameAr: 'تذكير أول بالسداد',
    daysOverdue: 7,
    description: 'خطاب لطيف للتذكير بالسداد قبل مرحلة الإنذار.',
  },
  {
    id: 'pre_warning',
    name: 'Pre-Legal Warning Letter',
    nameAr: 'إخطار ودي بالسداد',
    daysOverdue: 14,
    description: 'صياغة ودية احترافية تمنح العميل فرصة للسداد قبل التصعيد.',
  },
  {
    id: 'final_demand',
    name: 'Final Demand Letter',
    nameAr: 'إنذار نهائي بالسداد',
    daysOverdue: 21,
    description: 'إنذار رسمي واضح قبل مباشرة الإجراءات القانونية.',
  },
  {
    id: 'court_filing',
    name: 'Court Filing Documents',
    nameAr: 'مسودة مطالبة قضائية',
    daysOverdue: 30,
    description: 'صياغة منظمة للوقائع والطلبات تمهيداً للتقاضي.',
  },
  {
    id: 'settlement',
    name: 'Settlement Agreement',
    nameAr: 'اتفاق تسوية',
    daysOverdue: 45,
    description: 'اتفاق مختصر لتسوية المديونية وجدولة السداد.',
  },
  {
    id: 'paymentPlan',
    name: 'Payment Plan Proposal',
    nameAr: 'خطة سداد مقترحة',
    daysOverdue: -1,
    description: 'نموذج عملي لعرض دفعات وجدولة سداد قابلة للتعديل.',
  },
  {
    id: 'promiseToPay',
    name: 'Promise to Pay',
    nameAr: 'تعهد بسداد مديونية',
    daysOverdue: -1,
    description: 'تعهد يوقعه العميل يتضمن مبلغ المديونية وخطة السداد.',
  },
  {
    id: 'guarantorNotice',
    name: 'Guarantor Notice',
    nameAr: 'إشعار للضامن أو الكفيل',
    daysOverdue: 21,
    description: 'خطاب موجه للضامن أو الكفيل عند استمرار المديونية.',
  },
  {
    id: 'conditionalRelease',
    name: 'Conditional Release',
    nameAr: 'مخالصة مشروطة',
    daysOverdue: -1,
    description: 'مخالصة لا تسري إلا بعد تحصيل كامل المبلغ فعلياً.',
  },
  {
    id: 'assetReturnNotice',
    name: 'Asset Return Notice',
    nameAr: 'طلب إرجاع مركبة أو أصل',
    daysOverdue: 14,
    description: 'طلب رسمي لإرجاع مركبة أو أصل مؤجر عند عدم السداد.',
  },
  {
    id: 'legalReferral',
    name: 'Legal Referral Notice',
    nameAr: 'إشعار إحالة للإدارة القانونية',
    daysOverdue: 30,
    description: 'إشعار قبل نقل الملف إلى الإدارة القانونية أو التحصيل القضائي.',
  },
  {
    id: 'payment_acknowledgment',
    name: 'Payment Acknowledgment',
    nameAr: 'إقرار استلام دفعة',
    daysOverdue: -1,
    description: 'إقرار استلام دفعة مع حفظ حق المطالبة بالرصيد المتبقي.',
  },
];
