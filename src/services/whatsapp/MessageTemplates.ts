/**
 * قوالب رسائل واتساب للتقارير
 * WhatsApp Message Templates for Reports
 */

import type { 
  DailyReportData, 
  WeeklyReportData,
  AlertType 
} from './types';

/**
 * تنسيق الأرقام بالفاصلة
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

/**
 * تنسيق المبلغ بالعملة
 */
const formatCurrency = (amount: number, currency = 'ر.ق'): string => {
  return `${formatNumber(amount)} ${currency}`;
};

/**
 * تنسيق النسبة المئوية
 */
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * الحصول على إيموجي الاتجاه
 */
const getTrendEmoji = (value: number): string => {
  if (value > 5) return '📈';
  if (value < -5) return '📉';
  return '➡️';
};

/**
 * قالب التقرير اليومي
 */
export const generateDailyReport = (data: DailyReportData): string => {
  const date = new Date(data.date).toLocaleDateString('ar-QA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
━━━━━━━━━━━━━━━━━━━
📊 *تقرير الأسطول اليومي*
📅 ${date}
━━━━━━━━━━━━━━━━━━━

🚗 *حالة الأسطول:*
├ إجمالي المركبات: ${formatNumber(data.fleet.total)}
├ متاحة: ${formatNumber(data.fleet.available)} ✅
├ مؤجرة: ${formatNumber(data.fleet.rented)} 🔴
├ صيانة: ${formatNumber(data.fleet.maintenance)} 🔧
├ محجوزة: ${formatNumber(data.fleet.reserved)} 📌
└ نسبة الإشغال: ${formatPercent(data.fleet.utilizationRate)}

💰 *المالية:*
├ إيرادات اليوم: ${formatCurrency(data.financial.todayRevenue)}
├ المتحصل: ${formatCurrency(data.financial.todayCollected)}
├ المستحق الكلي: ${formatCurrency(data.financial.totalOutstanding)}
└ المتأخر: ${formatCurrency(data.financial.overdueAmount)}

📋 *العقود:*
├ عقود جديدة: ${data.contracts.newToday}
├ عقود منتهية: ${data.contracts.endedToday}
└ تنتهي هذا الأسبوع: ${data.contracts.expiringThisWeek}

${data.alerts.maintenanceNeeded + data.alerts.licensesExpiring + data.alerts.insurancesExpiring + data.alerts.overduePayments > 0 ? `
⚠️ *تنبيهات:*
${data.alerts.maintenanceNeeded > 0 ? `├ صيانة مطلوبة: ${data.alerts.maintenanceNeeded} مركبة\n` : ''}${data.alerts.licensesExpiring > 0 ? `├ رخص تنتهي قريباً: ${data.alerts.licensesExpiring}\n` : ''}${data.alerts.insurancesExpiring > 0 ? `├ تأمين ينتهي قريباً: ${data.alerts.insurancesExpiring}\n` : ''}${data.alerts.overduePayments > 0 ? `└ مدفوعات متأخرة: ${data.alerts.overduePayments}\n` : ''}` : '✅ *لا توجد تنبيهات*'}
━━━━━━━━━━━━━━━━━━━
🔗 للتفاصيل: افتح التطبيق
  `.trim();
};

/**
 * قالب التقرير الأسبوعي
 */
export const generateWeeklyReport = (data: WeeklyReportData): string => {
  const weekStart = new Date(data.weekStart).toLocaleDateString('ar-QA', {
    day: 'numeric',
    month: 'short',
  });
  const weekEnd = new Date(data.weekEnd).toLocaleDateString('ar-QA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const comparisonEmoji = getTrendEmoji(data.financial.comparisonWithLastWeek);
  const comparisonText = data.financial.comparisonWithLastWeek >= 0 
    ? `+${formatPercent(data.financial.comparisonWithLastWeek)}`
    : formatPercent(data.financial.comparisonWithLastWeek);

  return `
━━━━━━━━━━━━━━━━━━━━━
📊 *التقرير الأسبوعي للأسطول*
📅 ${weekStart} - ${weekEnd}
━━━━━━━━━━━━━━━━━━━━━

📈 *ملخص الأداء:*
├ متوسط الإشغال: ${formatPercent(data.fleet.averageUtilization)}
├ أعلى إشغال: ${formatPercent(data.fleet.peakUtilization)}
└ أدنى إشغال: ${formatPercent(data.fleet.lowUtilization)}

💰 *المالية:*
├ إجمالي الإيرادات: ${formatCurrency(data.financial.totalRevenue)}
├ إجمالي التحصيل: ${formatCurrency(data.financial.totalCollected)}
├ نسبة التحصيل: ${formatPercent(data.financial.collectionRate)}
└ مقارنة بالأسبوع الماضي: ${comparisonEmoji} ${comparisonText}

📋 *العقود:*
├ عقود جديدة: ${data.contracts.newContracts}
├ عقود مجددة: ${data.contracts.renewedContracts}
├ عقود منتهية: ${data.contracts.endedContracts}
└ عقود ملغاة: ${data.contracts.cancelledContracts}

🔧 *الصيانة:*
├ مكتملة: ${data.maintenance.completed}
├ معلقة: ${data.maintenance.pending}
└ إجمالي التكلفة: ${formatCurrency(data.maintenance.totalCost)}

🏆 *أفضل المركبات أداءً:*
${data.topVehicles.length > 0 && data.topVehicles[0].revenue > 0 
  ? data.topVehicles.slice(0, 5).map((v, i) => 
      `${i === data.topVehicles.slice(0, 5).length - 1 ? '└' : '├'} ${v.plateNumber} • ${formatCurrency(v.revenue)}`
    ).join('\n')
  : '└ لا توجد إيرادات مسجلة هذا الأسبوع'}

━━━━━━━━━━━━━━━━━━━━━
✨ أداء ${data.financial.comparisonWithLastWeek >= 0 ? 'ممتاز' : 'يحتاج تحسين'}!
  `.trim();
};

/**
 * قالب التقرير الشهري
 */
export const generateMonthlyReport = (data: {
  month: string;
  year: number;
  totalRevenue: number;
  totalCollected: number;
  totalContracts: number;
  totalMaintenanceCost: number;
  averageUtilization: number;
  netProfit: number;
  comparisonWithLastMonth: number;
}): string => {
  const comparisonEmoji = getTrendEmoji(data.comparisonWithLastMonth);
  const comparisonText = data.comparisonWithLastMonth >= 0 
    ? `+${formatPercent(data.comparisonWithLastMonth)}`
    : formatPercent(data.comparisonWithLastMonth);

  return `
━━━━━━━━━━━━━━━━━━━━━━
📊 *التقرير الشهري للأسطول*
📅 ${data.month} ${data.year}
━━━━━━━━━━━━━━━━━━━━━━

💰 *الأداء المالي:*
├ إجمالي الإيرادات: ${formatCurrency(data.totalRevenue)}
├ إجمالي التحصيل: ${formatCurrency(data.totalCollected)}
├ تكاليف الصيانة: ${formatCurrency(data.totalMaintenanceCost)}
├ صافي الربح: ${formatCurrency(data.netProfit)}
└ مقارنة بالشهر الماضي: ${comparisonEmoji} ${comparisonText}

📈 *الأداء التشغيلي:*
├ إجمالي العقود: ${formatNumber(data.totalContracts)}
└ متوسط الإشغال: ${formatPercent(data.averageUtilization)}

━━━━━━━━━━━━━━━━━━━━━━
🎯 الهدف للشهر القادم: زيادة 10%
  `.trim();
};

/**
 * قوالب التنبيهات الفورية
 */
export const generateAlert = (
  type: AlertType,
  data: Record<string, any>
): string => {
  const templates: Record<AlertType, () => string> = {
    new_contract: () => `
🎉 *عقد جديد!*

📋 رقم العقد: ${data.contractNumber}
👤 العميل: ${data.customerName}
🚗 المركبة: ${data.vehiclePlate}
💰 القيمة الشهرية: ${formatCurrency(data.monthlyAmount)}
📅 المدة: ${data.duration} ${data.durationUnit}

━━━━━━━━━━━━━━━━━━━
✨ تم بنجاح
    `.trim(),

    payment_received: () => `
💰 *دفعة جديدة!*

📋 العقد: ${data.contractNumber}
👤 العميل: ${data.customerName}
💵 المبلغ: ${formatCurrency(data.amount)}
📝 الطريقة: ${data.paymentMethod}
📅 التاريخ: ${new Date().toLocaleDateString('ar-QA')}

━━━━━━━━━━━━━━━━━━━
✅ تم استلام الدفعة
    `.trim(),

    payment_overdue: () => `
⚠️ *تنبيه: دفعة متأخرة*

📋 العقد: ${data.contractNumber}
👤 العميل: ${data.customerName}
📞 الهاتف: ${data.customerPhone}
💵 المبلغ المستحق: ${formatCurrency(data.amount)}
📅 تاريخ الاستحقاق: ${data.dueDate}
⏰ أيام التأخير: ${data.daysOverdue}

━━━━━━━━━━━━━━━━━━━
🔴 يرجى المتابعة
    `.trim(),

    maintenance_required: () => `
🔧 *تنبيه صيانة*

🚗 المركبة: ${data.vehiclePlate}
📝 النوع: ${data.maintenanceType}
📅 التاريخ المجدول: ${data.scheduledDate}
💰 التكلفة المقدرة: ${formatCurrency(data.estimatedCost)}
📍 الحالة: ${data.status}

━━━━━━━━━━━━━━━━━━━
⚠️ يرجى الاهتمام
    `.trim(),

    license_expiring: () => `
📋 *تنبيه: رخصة تنتهي قريباً*

🚗 المركبة: ${data.vehiclePlate}
📅 تاريخ الانتهاء: ${data.expiryDate}
⏰ أيام متبقية: ${data.daysRemaining}

━━━━━━━━━━━━━━━━━━━
⚠️ يرجى التجديد
    `.trim(),

    insurance_expiring: () => `
🛡️ *تنبيه: تأمين ينتهي قريباً*

🚗 المركبة: ${data.vehiclePlate}
🏢 شركة التأمين: ${data.insuranceCompany}
📅 تاريخ الانتهاء: ${data.expiryDate}
⏰ أيام متبقية: ${data.daysRemaining}

━━━━━━━━━━━━━━━━━━━
⚠️ يرجى التجديد
    `.trim(),

    vehicle_returned: () => `
🔄 *مركبة مُعادة*

🚗 المركبة: ${data.vehiclePlate}
📋 العقد: ${data.contractNumber}
👤 العميل: ${data.customerName}
📅 تاريخ الإعادة: ${new Date().toLocaleDateString('ar-QA')}
📍 الكيلومترات: ${formatNumber(data.mileage)} كم

━━━━━━━━━━━━━━━━━━━
✅ تم استلام المركبة
    `.trim(),

    high_value_transaction: () => `
💎 *معاملة عالية القيمة*

📝 النوع: ${data.transactionType}
💰 المبلغ: ${formatCurrency(data.amount)}
👤 العميل: ${data.customerName}
📋 المرجع: ${data.reference}
📅 التاريخ: ${new Date().toLocaleDateString('ar-QA')}

━━━━━━━━━━━━━━━━━━━
⭐ معاملة مهمة
    `.trim(),
  };

  return templates[type]?.() || '⚠️ تنبيه غير معروف';
};

/**
 * رسالة ترحيب عند تفعيل الخدمة
 */
export const generateWelcomeMessage = (managerName: string): string => `
━━━━━━━━━━━━━━━━━━━━━
🎉 *مرحباً ${managerName}!*
━━━━━━━━━━━━━━━━━━━━━

✅ تم تفعيل خدمة تقارير واتساب بنجاح!

📊 *ستتلقى:*
├ تقرير يومي صباحاً
├ تقرير أسبوعي كل أحد
├ تنبيهات فورية للأحداث المهمة
└ تقارير شهرية

💡 *نصيحة:*
يمكنك تخصيص التقارير من إعدادات النظام.

━━━━━━━━━━━━━━━━━━━━━
🚀 *Fleetify* - إدارة أسطول ذكية
`.trim();

/**
 * رسالة تأكيد إلغاء الخدمة
 */
export const generateUnsubscribeMessage = (): string => `
━━━━━━━━━━━━━━━━━━━━━
📤 *إلغاء الاشتراك*
━━━━━━━━━━━━━━━━━━━━━

تم إلغاء اشتراكك في تقارير واتساب.

لن تتلقى المزيد من التقارير أو التنبيهات.

للاشتراك مجدداً، قم بتفعيل الخدمة من إعدادات النظام.

━━━━━━━━━━━━━━━━━━━━━
🚀 *Fleetify*
`.trim();

export default {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateAlert,
  generateWelcomeMessage,
  generateUnsubscribeMessage,
};

