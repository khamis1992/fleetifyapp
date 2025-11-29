/**
 * WhatsApp Service Module Index
 * تصدير جميع خدمات واتساب
 */

// Services
export { whatsAppService } from './WhatsAppService';
export { reportScheduler } from './ReportScheduler';

// Templates
export {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateAlert,
  generateWelcomeMessage,
  generateUnsubscribeMessage,
} from './MessageTemplates';

// Types
export type {
  ReportType,
  AlertType,
  MessageStatus,
  UltramsgConfig,
  WhatsAppRecipient,
  ReportScheduleSettings,
  DailyReportData,
  WeeklyReportData,
  WhatsAppMessage,
  UltramsgResponse,
  MessageLog,
} from './types';

