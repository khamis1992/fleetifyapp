/**
 * Arabic translations for Legal Case Creation Wizard
 */

export const legalCaseWizardTranslations = {
  // Dialog
  dialogTitle: 'إنشاء قضية قانونية',
  dialogDescription: 'أنشئ قضية قانونية جديدة بخطوات بسيطة',
  
  // Steps
  steps: {
    caseDetails: 'تفاصيل القضية',
    selectInvoices: 'اختيار الفواتير',
    customerInfo: 'معلومات العميل',
    evidenceUpload: 'رفع الأدلة',
  },
  
  // Step 1: Case Details
  step1: {
    title: 'تفاصيل القضية',
    description: 'أدخل المعلومات الأساسية للقضية',
    
    caseTitle: 'عنوان القضية',
    caseTitlePlaceholder: 'مثال: تحصيل إيجار متأخر',
    caseTitleRequired: 'عنوان القضية مطلوب',
    
    caseType: 'نوع القضية',
    caseTypePlaceholder: 'اختر نوع القضية',
    caseTypeRequired: 'نوع القضية مطلوب',
    caseTypes: {
      paymentCollection: 'تحصيل دفعات',
      contractDispute: 'نزاع عقد',
      propertyDamage: 'أضرار ممتلكات',
      other: 'أخرى',
    },
    
    priority: 'الأولوية',
    priorityPlaceholder: 'اختر الأولوية',
    priorityRequired: 'الأولوية مطلوبة',
    priorities: {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية',
      urgent: 'عاجلة',
    },
    
    expectedOutcome: 'النتيجة المتوقعة',
    expectedOutcomePlaceholder: 'اختر النتيجة المتوقعة',
    expectedOutcomeRequired: 'النتيجة المتوقعة مطلوبة',
    expectedOutcomes: {
      paymentRecovery: 'استرداد المبلغ',
      settlement: 'تسوية',
      contractTermination: 'إنهاء العقد',
      other: 'أخرى',
    },
    
    description: 'الوصف',
    descriptionPlaceholder: 'وصف تفصيلي للقضية...',
    descriptionRequired: 'الوصف مطلوب',
  },
  
  // Step 2: Select Invoices/Contracts
  step2: {
    title: 'اختيار الفواتير والعقود',
    description: 'اختر الفواتير أو العقود المتعلقة بهذه القضية',
    
    searchPlaceholder: 'بحث عن فواتير أو عقود...',
    noResults: 'لا توجد نتائج',
    
    selectedItems: 'العناصر المختارة',
    totalClaimAmount: 'إجمالي المطالبة',
    
    invoiceNumber: 'رقم الفاتورة',
    contractNumber: 'رقم العقد',
    amount: 'المبلغ',
    dueDate: 'تاريخ الاستحقاق',
    status: 'الحالة',
    
    statuses: {
      overdue: 'متأخر',
      pending: 'معلق',
      paid: 'مدفوع',
    },
    
    selectAtLeastOne: 'يرجى اختيار فاتورة أو عقد واحد على الأقل',
  },
  
  // Step 3: Customer Information
  step3: {
    title: 'معلومات العميل',
    description: 'تحقق من معلومات العميل وقم بتحديثها إذا لزم الأمر',
    
    customerName: 'اسم العميل',
    customerNamePlaceholder: 'أدخل اسم العميل',
    customerNameRequired: 'اسم العميل مطلوب',
    
    phoneNumber: 'رقم الجوال',
    phoneNumberPlaceholder: '+966 5X XXX XXXX',
    phoneNumberRequired: 'رقم الجوال مطلوب',
    
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'customer@example.com',
    emailOptional: 'اختياري',
    
    nationalId: 'رقم الهوية',
    nationalIdPlaceholder: '1XXXXXXXXX',
    nationalIdOptional: 'اختياري',
    
    address: 'العنوان',
    addressPlaceholder: 'عنوان العميل الكامل',
    addressOptional: 'اختياري',
    
    additionalNotes: 'ملاحظات إضافية',
    additionalNotesPlaceholder: 'أي معلومات إضافية عن العميل...',
    additionalNotesOptional: 'اختياري',
    
    autoPopulated: 'تم ملء المعلومات تلقائياً من السجلات',
  },
  
  // Step 4: Evidence Upload
  step4: {
    title: 'رفع الأدلة',
    description: 'ارفع المستندات والأدلة الداعمة للقضية',
    
    uploadArea: {
      title: 'اسحب وأفلت الملفات هنا',
      subtitle: 'أو انقر للاختيار',
      supportedFormats: 'الصيغ المدعومة: PDF, DOC, DOCX, JPG, PNG, MP3, MP4',
      maxSize: 'الحد الأقصى: 10 ميجابايت لكل ملف',
    },
    
    categories: {
      title: 'فئات الأدلة',
      contracts: 'العقود',
      invoices: 'الفواتير',
      receipts: 'الإيصالات',
      communications: 'المراسلات',
      photos: 'الصور',
      recordings: 'التسجيلات',
      other: 'أخرى',
    },
    
    uploadedFiles: 'الملفات المرفوعة',
    noFiles: 'لم يتم رفع ملفات بعد',
    
    fileName: 'اسم الملف',
    fileSize: 'الحجم',
    category: 'الفئة',
    actions: 'الإجراءات',
    
    uploading: 'جاري الرفع...',
    uploadSuccess: 'تم الرفع بنجاح',
    uploadError: 'فشل الرفع',
    
    remove: 'حذف',
    
    optional: 'رفع الأدلة اختياري، يمكنك إضافتها لاحقاً',
  },
  
  // Buttons
  buttons: {
    next: 'التالي',
    previous: 'السابق',
    cancel: 'إلغاء',
    createCase: 'إنشاء القضية',
    creating: 'جاري الإنشاء...',
  },
  
  // Progress
  progress: {
    step: 'الخطوة',
    of: 'من',
  },
  
  // Messages
  messages: {
    creatingCase: 'جاري إنشاء القضية...',
    caseCreated: 'تم إنشاء القضية بنجاح',
    caseCreatedDescription: 'تم إنشاء القضية وإضافتها إلى النظام',
    errorCreatingCase: 'حدث خطأ أثناء إنشاء القضية',
    pleaseTryAgain: 'يرجى المحاولة مرة أخرى',
    
    uploadingFiles: 'جاري رفع الملفات...',
    filesUploaded: 'تم رفع الملفات بنجاح',
    errorUploadingFiles: 'حدث خطأ أثناء رفع الملفات',
    
    fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
    selectAtLeastOneItem: 'يرجى اختيار عنصر واحد على الأقل',
  },
  
  // Validation
  validation: {
    required: 'هذا الحقل مطلوب',
    invalidEmail: 'البريد الإلكتروني غير صحيح',
    invalidPhone: 'رقم الجوال غير صحيح',
    invalidNationalId: 'رقم الهوية غير صحيح',
    fileTooLarge: 'الملف كبير جداً (الحد الأقصى 10 ميجابايت)',
    unsupportedFormat: 'صيغة الملف غير مدعومة',
  },
};

export type LegalCaseWizardTranslations = typeof legalCaseWizardTranslations;
