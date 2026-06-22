/**
 * Arabic translations for Legal Case Creation Wizard
 */

export const wizardTranslations = {
  // Dialog titles
  dialogTitle: 'إنشاء قضية قانونية',
  
  // Step titles
  steps: {
    details: 'تفاصيل القضية',
    invoices: 'الفواتير والعقود',
    customer: 'معلومات العميل',
    evidence: 'رفع المستندات',
    review: 'مراجعة وإنشاء',
  },
  
  // Step 1: Case Details
  caseDetails: {
    title: 'تفاصيل القضية',
    description: 'أدخل المعلومات الأساسية للقضية',
    
    caseTitle: {
      label: 'عنوان القضية',
      placeholder: 'مثال: تحصيل إيجار متأخر - عميل أحمد محمد',
      required: true,
      tooltip: 'أدخل عنواناً واضحاً ومختصراً للقضية',
    },
    
    caseType: {
      label: 'نوع القضية',
      required: true,
      tooltip: 'اختر نوع القضية المناسب حسب طبيعة النزاع',
      options: {
        payment_collection: 'تحصيل دفعات',
        contract_breach: 'خرق عقد',
        vehicle_damage: 'أضرار مركبة',
        other: 'أخرى',
      },
    },
    
    priority: {
      label: 'الأولوية',
      required: true,
      tooltip: 'حدد أولوية القضية: عالية (تتطلب إجراء فوري)، متوسطة (عادية)، منخفضة (غير عاجلة)',
      options: {
        urgent: 'عاجلة',
        high: 'عالية',
        medium: 'متوسطة',
        low: 'منخفضة',
      },
    },
    
    expectedOutcome: {
      label: 'النتيجة المتوقعة',
      required: true,
      tooltip: 'ما هي النتيجة التي تتوقعها من هذه القضية؟',
      options: {
        payment: 'استرداد المبلغ',
        vehicle_return: 'استرجاع المركبة',
        both: 'كلاهما',
        other: 'أخرى',
      },
    },
    
    description: {
      label: 'وصف تفصيلي',
      placeholder: 'وصف تفصيلي للقضية، الأحداث، والمطالبات...',
      required: false,
      optional: '(اختياري)',
      tooltip: 'أضف أي تفاصيل إضافية تساعد في فهم القضية',
    },
  },
  
  // Step 2: Invoices & Contracts
  invoicesContracts: {
    title: 'اختيار الفواتير والعقود',
    description: 'اختر الفواتير والعقود المتعلقة بالقضية',
    alert: 'اختيار الفواتير والعقود **اختياري**. يمكنك المتابعة بدون اختيار أي عنصر. سيتم حساب إجمالي المطالبة تلقائياً.',
    
    invoices: {
      title: 'الفواتير',
      selected: 'المحدد',
      totalClaim: 'إجمالي المطالبة',
      optional: '(اختياري)',
    },
    
    contracts: {
      title: 'العقود',
      selected: 'المحدد',
      optional: '(اختياري)',
    },
  },
  
  // Step 3: Customer Information
  customerInfo: {
    title: 'معلومات العميل',
    description: 'ابحث عن عميل موجود أو أدخل معلومات عميل جديد',
    
    search: {
      label: 'البحث واختيار العميل',
      placeholder: 'ابحث باستخدام الاسم، الهاتف، البريد الإلكتروني، أو الرقم الوطني...',
      tooltip: 'ابدأ بالكتابة للبحث عن عميل موجود',
      quickSelect: 'اختيار سريع',
      showAll: 'عرض جميع العملاء',
      noResults: 'لا توجد نتائج',
      loading: 'جاري التحميل...',
    },
    
    fields: {
      customerName: {
        label: 'اسم العميل',
        placeholder: 'أدخل أو اختر اسم العميل',
        required: true,
        tooltip: 'الاسم الكامل للعميل أو اسم الشركة',
      },
      
      phone: {
        label: 'رقم الهاتف',
        placeholder: '33079976',
        required: false,
        optional: '(اختياري)',
        tooltip: 'رقم هاتف العميل للتواصل',
      },
      
      nationalId: {
        label: 'الرقم الوطني',
        placeholder: '29673601398',
        required: false,
        optional: '(اختياري)',
        tooltip: 'رقم البطاقة الشخصية أو السجل التجاري',
      },
      
      email: {
        label: 'البريد الإلكتروني',
        placeholder: 'example@domain.com',
        required: false,
        optional: '(اختياري)',
        tooltip: 'البريد الإلكتروني للعميل',
      },
      
      address: {
        label: 'العنوان',
        placeholder: 'العنوان الكامل للعميل',
        required: false,
        optional: '(اختياري)',
        tooltip: 'عنوان السكن أو مقر العمل',
      },
      
      emergencyContact: {
        label: 'جهة اتصال طوارئ',
        placeholder: 'اسم ورقم جهة الاتصال',
        required: false,
        optional: '(اختياري)',
        tooltip: 'شخص يمكن التواصل معه في حالة الطوارئ',
      },
      
      employerInfo: {
        label: 'معلومات جهة العمل',
        placeholder: 'اسم الشركة أو جهة العمل',
        required: false,
        optional: '(اختياري)',
        tooltip: 'معلومات عن جهة عمل العميل',
      },
    },
  },
  
  // Step 4: Evidence Upload
  evidenceUpload: {
    title: 'رفع المستندات',
    description: 'ارفع المستندات والأدلة الداعمة للقضية',
    alert: 'رفع المستندات **اختياري**. يمكنك إضافة المستندات لاحقاً من صفحة القضية.',
    
    dragDrop: {
      title: 'اسحب وأفلت الملفات هنا',
      or: 'أو',
      selectFiles: 'اختر الملفات',
      acceptedTypes: 'أنواع الملفات المقبولة: PDF, DOCX, JPG, PNG (حد أقصى 10MB)',
    },
    
    categories: {
      contract: 'عقد',
      invoice: 'فاتورة',
      receipt: 'إيصال',
      communication: 'مراسلات',
      photo: 'صورة',
      recording: 'تسجيل',
      witness: 'شهادة',
    },
  },
  
  // Step 5: Review
  review: {
    title: 'مراجعة وإنشاء القضية',
    description: 'راجع جميع المعلومات قبل إنشاء القضية',
    
    sections: {
      caseDetails: {
        title: 'تفاصيل القضية',
        edit: 'تعديل',
      },
      
      customerInfo: {
        title: 'معلومات العميل',
        edit: 'تعديل',
        name: 'الاسم',
        phone: 'الهاتف',
        email: 'البريد الإلكتروني',
      },
      
      selectedEvidence: {
        title: 'الأدلة المحددة',
        invoices: 'الفواتير',
        contracts: 'العقود',
        evidenceFiles: 'ملفات الأدلة',
      },
    },
    
    confirmation: {
      title: 'تأكيد الإنشاء',
      message: 'هل أنت متأكد من إنشاء هذه القضية؟',
      yes: 'نعم، إنشاء القضية',
      no: 'إلغاء',
    },
  },
  
  // Buttons
  buttons: {
    next: 'التالي',
    previous: 'السابق',
    saveAsDraft: 'حفظ كمسودة',
    createCase: 'إنشاء القضية',
    cancel: 'إلغاء',
    close: 'إغلاق',
    edit: 'تعديل',
  },
  
  // Validation messages
  validation: {
    required: 'هذا الحقل مطلوب',
    invalidEmail: 'البريد الإلكتروني غير صحيح',
    invalidPhone: 'رقم الهاتف غير صحيح (يجب أن يكون 8 أرقام)',
    fillRequired: 'يرجى ملء جميع الحقول المطلوبة قبل المتابعة',
  },
  
  // Success/Error messages
  messages: {
    draftSaved: 'تم حفظ المسودة',
    draftAutoSaved: 'تم الحفظ التلقائي',
    caseCreated: 'تم إنشاء القضية بنجاح',
    error: 'حدث خطأ، يرجى المحاولة مرة أخرى',
    customerExtracted: 'تم استخراج معلومات العميل من الفاتورة',
    loadingCustomers: 'جاري تحميل العملاء...',
    loadingCases: 'جاري تحميل القضايا السابقة...',
  },
  
  // Progress
  progress: {
    step: 'الخطوة',
    of: 'من',
  },
};
