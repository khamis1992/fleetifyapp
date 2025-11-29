/**
 * أنواع TypeScript لخدمة واتساب
 * WhatsApp Service Types
 */

// نوع التقرير
export type ReportType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'instant'
  | 'alert';

// نوع التنبيه
export type AlertType =
  | 'new_contract'
  | 'payment_received'
  | 'payment_overdue'
  | 'maintenance_required'
  | 'license_expiring'
  | 'insurance_expiring'
  | 'vehicle_returned'
  | 'high_value_transaction';

// حالة الرسالة
export type MessageStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

// إعدادات Ultramsg
export interface UltramsgConfig {
  instanceId: string;
  token: string;
  baseUrl?: string;
}

// المستلم
export interface WhatsAppRecipient {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  role: 'manager' | 'owner' | 'accountant' | 'supervisor';
  reportTypes: ReportType[];
  alertTypes: AlertType[];
}

// إعدادات التقارير
export interface ReportScheduleSettings {
  id: string;
  companyId: string;
  
  // التقرير اليومي
  dailyReportEnabled: boolean;
  dailyReportTime: string; // HH:mm
  dailyReportDays: number[]; // 0-6 (الأحد - السبت)
  
  // التقرير الأسبوعي
  weeklyReportEnabled: boolean;
  weeklyReportDay: number; // 0-6
  weeklyReportTime: string;
  
  // التقرير الشهري
  monthlyReportEnabled: boolean;
  monthlyReportDay: number; // 1-28
  monthlyReportTime: string;
  
  // التنبيهات الفورية
  instantAlertsEnabled: boolean;
  alertThreshold: number; // الحد الأدنى للمبلغ للتنبيه
  
  // المستلمون
  recipients: WhatsAppRecipient[];
  
  // إعدادات Ultramsg
  ultramsgInstanceId?: string;
  ultramsgToken?: string;
  
  createdAt: string;
  updatedAt: string;
}

// بيانات التقرير اليومي
export interface DailyReportData {
  date: string;
  
  // حالة الأسطول
  fleet: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    reserved: number;
    utilizationRate: number;
  };
  
  // المالية
  financial: {
    todayRevenue: number;
    todayCollected: number;
    totalOutstanding: number;
    overdueAmount: number;
  };
  
  // العقود
  contracts: {
    newToday: number;
    endedToday: number;
    expiringThisWeek: number;
  };
  
  // التنبيهات
  alerts: {
    maintenanceNeeded: number;
    licensesExpiring: number;
    insurancesExpiring: number;
    overduePayments: number;
  };
}

// بيانات التقرير الأسبوعي
export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  
  // ملخص الأسطول
  fleet: {
    averageUtilization: number;
    peakUtilization: number;
    lowUtilization: number;
  };
  
  // المالية
  financial: {
    totalRevenue: number;
    totalCollected: number;
    collectionRate: number;
    comparisonWithLastWeek: number; // نسبة التغيير
  };
  
  // العقود
  contracts: {
    newContracts: number;
    renewedContracts: number;
    endedContracts: number;
    cancelledContracts: number;
  };
  
  // الصيانة
  maintenance: {
    completed: number;
    pending: number;
    totalCost: number;
  };
  
  // أفضل المركبات
  topVehicles: Array<{
    plateNumber: string;
    revenue: number;
  }>;
}

// رسالة واتساب
export interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName: string;
  messageType: ReportType | AlertType;
  content: string;
  status: MessageStatus;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  error?: string;
  createdAt: string;
}

// استجابة Ultramsg
export interface UltramsgResponse {
  sent: boolean;
  message?: string;
  id?: string;
  error?: string;
}

// سجل الرسائل
export interface MessageLog {
  id: string;
  companyId: string;
  recipientId: string;
  messageType: string;
  status: MessageStatus;
  content: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

