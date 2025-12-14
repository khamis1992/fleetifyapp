/**
 * Arabic translations for Auto-Create Legal Case Triggers
 */

export const autoCreateTriggersTranslations = {
  dialog: {
    title: 'محفزات الإنشاء التلقائي للقضايا القانونية',
    description: 'إعداد إنشاء تلقائي للقضايا القانونية بناءً على سلوك العميل وحالة الدفع',
  },

  alert: {
    enabledCount: (count: number) => `${count} محفز مفعل.`,
    description: 'سيتم إنشاء القضايا القانونية تلقائياً عند تحقق هذه الشروط.',
  },

  triggers: {
    overdueInvoice: {
      title: 'فاتورة متأخرة بعدد أيام',
      description: 'إنشاء قضية تلقائياً عندما تتأخر الفاتورة لعدد X من الأيام',
      label: 'عدد أيام التأخير',
      placeholder: '21',
      example: 'مثال: إذا تم ضبطه على 21، سيتم إنشاء قضية عند تأخر الفاتورة 21 يوماً أو أكثر',
    },
    overdueAmount: {
      title: 'إجمالي المبلغ المتأخر',
      description: 'إنشاء قضية تلقائياً عند تجاوز المبلغ المتأخر حد معين',
      label: 'حد المبلغ المتأخر',
      placeholder: '15000',
      example: 'مثال: إذا تم ضبطه على 15,000، سيتم إنشاء قضية عند وصول أو تجاوز المبلغ المتأخر 15,000',
    },
    brokenPromises: {
      title: 'الوعود المكسورة للدفع',
      description: 'إنشاء قضية تلقائياً عندما يخل العميل بعدد X من وعود الدفع',
      label: 'عدد الوعود المكسورة',
      placeholder: '3',
      example: 'مثال: إذا تم ضبطه على 3، سيتم إنشاء قضية عند كسر 3 وعود أو أكثر',
    },
  },

  settings: {
    title: 'إعدادات القضية الافتراضية',
    description: 'ستُستخدم هذه الإعدادات للقضايا المنشأة تلقائياً',
    priority: {
      label: 'الأولوية الافتراضية للقضايا المنشأة تلقائياً',
      options: {
        low: 'منخفض',
        medium: 'متوسط',
        high: 'عالي',
        urgent: 'عاجل',
      },
    },
    notify: {
      title: 'إرسال إشعار',
      description: 'إخطار الفريق القانوني عند إنشاء قضية تلقائياً',
    },
  },

  summary: {
    title: 'ملخص الإعداد',
    overdueInvoice: (days: number) => `✓ إنشاء قضية عند تأخر الفاتورة ${days}+ يوم`,
    overdueAmount: (amount: number) => `✓ إنشاء قضية عند تجاوز المبلغ المتأخر ${amount.toLocaleString('en-US')} ر.س`,
    brokenPromises: (count: number) => `✓ إنشاء قضية عند كسر ${count}+ وعود`,
    noTriggers: 'لا توجد محفزات مفعلة - الإنشاء التلقائي معطل',
  },

  buttons: {
    cancel: 'إلغاء',
    save: 'حفظ الإعدادات',
  },

  badges: {
    enabled: 'مفعل',
  },

  messages: {
    success: 'تم حفظ إعدادات الإنشاء التلقائي بنجاح',
    errorDays: 'يجب أن تكون أيام التأخير على الأقل 1',
    errorAmount: 'يجب أن يكون المبلغ المتأخر على الأقل 100',
    errorPromises: 'يجب أن يكون عدد الوعود المكسورة على الأقل 1',
  },
};

export default autoCreateTriggersTranslations;
