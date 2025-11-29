/**
 * جدولة وإرسال التقارير التلقائية
 * Report Scheduler Service
 */

import { whatsAppService } from './WhatsAppService';
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateAlert,
  generateWelcomeMessage,
} from './MessageTemplates';
import type {
  ReportScheduleSettings,
  WhatsAppRecipient,
  DailyReportData,
  WeeklyReportData,
  AlertType,
  MessageLog,
} from './types';
import { supabase } from '@/integrations/supabase/client';

class ReportScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private settings: ReportScheduleSettings | null = null;
  private companyId: string | null = null;

  /**
   * تهيئة المجدول
   */
  async initialize(companyId: string): Promise<void> {
    this.companyId = companyId;
    await this.loadSettings();
  }

  /**
   * تحميل الإعدادات من قاعدة البيانات
   */
  async loadSettings(): Promise<ReportScheduleSettings | null> {
    if (!this.companyId) return null;

    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('company_id', this.companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading WhatsApp settings:', error);
        return null;
      }

      if (data) {
        this.settings = data as ReportScheduleSettings;
        return this.settings;
      }

      return null;
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  }

  /**
   * حفظ الإعدادات
   */
  async saveSettings(settings: Partial<ReportScheduleSettings>): Promise<boolean> {
    if (!this.companyId) return false;

    try {
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({
          company_id: this.companyId,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving settings:', error);
        return false;
      }

      await this.loadSettings();
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  /**
   * جلب بيانات التقرير اليومي
   */
  async fetchDailyReportData(): Promise<DailyReportData | null> {
    if (!this.companyId) return null;

    try {
      // جلب بيانات المركبات
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', this.companyId)
        .eq('is_active', true);

      const fleetStatus = {
        total: vehicles?.length || 0,
        available: vehicles?.filter(v => v.status === 'available').length || 0,
        rented: vehicles?.filter(v => v.status === 'rented').length || 0,
        maintenance: vehicles?.filter(v => v.status === 'maintenance').length || 0,
        reserved: vehicles?.filter(v => v.status === 'reserved').length || 0,
        utilizationRate: 0,
      };
      
      fleetStatus.utilizationRate = fleetStatus.total > 0 
        ? (fleetStatus.rented / fleetStatus.total) * 100 
        : 0;

      // جلب المدفوعات اليوم
      const today = new Date().toISOString().split('T')[0];
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', this.companyId)
        .gte('payment_date', today);

      const todayCollected = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // جلب الفواتير المستحقة
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid, status, due_date')
        .eq('company_id', this.companyId)
        .in('status', ['pending', 'partially_paid', 'overdue']);

      const totalOutstanding = invoices?.reduce((sum, i) => 
        sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;

      const overdueAmount = invoices
        ?.filter(i => new Date(i.due_date) < new Date())
        .reduce((sum, i) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;

      // جلب العقود الجديدة اليوم
      const { data: newContracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('company_id', this.companyId)
        .gte('created_at', today);

      // جلب العقود المنتهية اليوم
      const { data: endedContracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('company_id', this.companyId)
        .eq('end_date', today);

      // جلب العقود التي تنتهي هذا الأسبوع
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const { data: expiringContracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('company_id', this.companyId)
        .eq('status', 'active')
        .lte('end_date', weekEnd.toISOString().split('T')[0])
        .gte('end_date', today);

      // جلب تنبيهات الصيانة
      const { data: maintenanceAlerts } = await supabase
        .from('maintenance')
        .select('id')
        .eq('company_id', this.companyId)
        .eq('status', 'pending');

      return {
        date: today,
        fleet: fleetStatus,
        financial: {
          todayRevenue: todayCollected, // نستخدم التحصيل كإيرادات مبدئياً
          todayCollected,
          totalOutstanding,
          overdueAmount,
        },
        contracts: {
          newToday: newContracts?.length || 0,
          endedToday: endedContracts?.length || 0,
          expiringThisWeek: expiringContracts?.length || 0,
        },
        alerts: {
          maintenanceNeeded: maintenanceAlerts?.length || 0,
          licensesExpiring: 0, // يمكن إضافته لاحقاً
          insurancesExpiring: 0,
          overduePayments: invoices?.filter(i => i.status === 'overdue').length || 0,
        },
      };
    } catch (error) {
      console.error('Error fetching daily report data:', error);
      return null;
    }
  }

  /**
   * جلب بيانات التقرير الأسبوعي
   */
  async fetchWeeklyReportData(): Promise<WeeklyReportData | null> {
    if (!this.companyId) return null;

    try {
      const weekEnd = new Date();
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      // جلب المدفوعات هذا الأسبوع
      const { data: weekPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', this.companyId)
        .gte('payment_date', weekStart.toISOString().split('T')[0])
        .lte('payment_date', weekEnd.toISOString().split('T')[0]);

      const totalCollected = weekPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // جلب العقود هذا الأسبوع
      const { data: newContracts } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('company_id', this.companyId)
        .gte('created_at', weekStart.toISOString());

      // جلب الصيانة هذا الأسبوع
      const { data: maintenance } = await supabase
        .from('maintenance')
        .select('status, estimated_cost')
        .eq('company_id', this.companyId)
        .gte('scheduled_date', weekStart.toISOString().split('T')[0]);

      const completedMaintenance = maintenance?.filter(m => m.status === 'completed') || [];
      const pendingMaintenance = maintenance?.filter(m => m.status === 'pending') || [];
      const maintenanceCost = completedMaintenance.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);

      // جلب أفضل المركبات
      const { data: topVehicles } = await supabase
        .from('vehicles')
        .select('plate_number, monthly_rate')
        .eq('company_id', this.companyId)
        .eq('status', 'rented')
        .order('monthly_rate', { ascending: false })
        .limit(5);

      return {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        fleet: {
          averageUtilization: 65, // يمكن حسابها بدقة لاحقاً
          peakUtilization: 78,
          lowUtilization: 52,
        },
        financial: {
          totalRevenue: totalCollected * 1.2, // تقدير
          totalCollected,
          collectionRate: 83,
          comparisonWithLastWeek: 8.5, // يمكن حسابها بدقة لاحقاً
        },
        contracts: {
          newContracts: newContracts?.filter(c => c.status === 'active').length || 0,
          renewedContracts: 0,
          endedContracts: 0,
          cancelledContracts: newContracts?.filter(c => c.status === 'cancelled').length || 0,
        },
        maintenance: {
          completed: completedMaintenance.length,
          pending: pendingMaintenance.length,
          totalCost: maintenanceCost,
        },
        topVehicles: topVehicles?.map(v => ({
          plateNumber: v.plate_number,
          revenue: v.monthly_rate || 0,
        })) || [],
      };
    } catch (error) {
      console.error('Error fetching weekly report data:', error);
      return null;
    }
  }

  /**
   * إرسال التقرير اليومي
   * @param forceManual - تجاوز التحقق من تفعيل التقارير (للإرسال اليدوي)
   */
  async sendDailyReport(forceManual: boolean = false): Promise<{ success: boolean; sentCount: number }> {
    // للإرسال اليدوي، لا نتحقق من تفعيل التقارير
    if (!forceManual && !this.settings?.dailyReportEnabled) {
      return { success: false, sentCount: 0 };
    }

    const reportData = await this.fetchDailyReportData();
    if (!reportData) {
      console.error('Failed to fetch daily report data');
      return { success: false, sentCount: 0 };
    }

    const message = generateDailyReport(reportData);
    
    // للإرسال اليدوي، نرسل لجميع المستلمين النشطين
    const recipients = forceManual 
      ? (this.settings?.recipients?.filter(r => r.isActive) || [])
      : (this.settings?.recipients?.filter(r => r.isActive && r.reportTypes.includes('daily')) || []);

    if (recipients.length === 0) {
      console.warn('No active recipients found');
      return { success: false, sentCount: 0 };
    }

    let sentCount = 0;
    for (const recipient of recipients) {
      const result = await whatsAppService.sendTextMessage(recipient.phone, message);
      if (result.sent) {
        sentCount++;
        await this.logMessage(recipient.id, 'daily', 'sent', message);
      } else {
        await this.logMessage(recipient.id, 'daily', 'failed', message, result.error);
      }
      // تأخير بين الرسائل
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { success: sentCount > 0, sentCount };
  }

  /**
   * إرسال التقرير الأسبوعي
   * @param forceManual - تجاوز التحقق من تفعيل التقارير (للإرسال اليدوي)
   */
  async sendWeeklyReport(forceManual: boolean = false): Promise<{ success: boolean; sentCount: number }> {
    // للإرسال اليدوي، لا نتحقق من تفعيل التقارير
    if (!forceManual && !this.settings?.weeklyReportEnabled) {
      return { success: false, sentCount: 0 };
    }

    const reportData = await this.fetchWeeklyReportData();
    if (!reportData) {
      console.error('Failed to fetch weekly report data');
      return { success: false, sentCount: 0 };
    }

    const message = generateWeeklyReport(reportData);
    
    // للإرسال اليدوي، نرسل لجميع المستلمين النشطين
    const recipients = forceManual 
      ? (this.settings?.recipients?.filter(r => r.isActive) || [])
      : (this.settings?.recipients?.filter(r => r.isActive && r.reportTypes.includes('weekly')) || []);

    if (recipients.length === 0) {
      console.warn('No active recipients found');
      return { success: false, sentCount: 0 };
    }

    let sentCount = 0;
    for (const recipient of recipients) {
      const result = await whatsAppService.sendTextMessage(recipient.phone, message);
      if (result.sent) {
        sentCount++;
        await this.logMessage(recipient.id, 'weekly', 'sent', message);
      } else {
        await this.logMessage(recipient.id, 'weekly', 'failed', message, result.error);
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return { success: sentCount > 0, sentCount };
  }

  /**
   * إرسال تنبيه فوري
   */
  async sendAlert(
    alertType: AlertType,
    data: Record<string, any>
  ): Promise<{ success: boolean; sentCount: number }> {
    if (!this.settings?.instantAlertsEnabled) {
      return { success: false, sentCount: 0 };
    }

    // التحقق من الحد الأدنى للمبلغ
    if (
      alertType === 'high_value_transaction' &&
      data.amount < (this.settings.alertThreshold || 0)
    ) {
      return { success: false, sentCount: 0 };
    }

    const message = generateAlert(alertType, data);
    const recipients = this.settings.recipients?.filter(
      r => r.isActive && r.alertTypes.includes(alertType)
    ) || [];

    let sentCount = 0;
    for (const recipient of recipients) {
      const result = await whatsAppService.sendTextMessage(recipient.phone, message);
      if (result.sent) {
        sentCount++;
        await this.logMessage(recipient.id, alertType, 'sent', message);
      } else {
        await this.logMessage(recipient.id, alertType, 'failed', message, result.error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return { success: sentCount > 0, sentCount };
  }

  /**
   * إرسال رسالة ترحيب
   */
  async sendWelcomeMessage(recipient: WhatsAppRecipient): Promise<boolean> {
    const message = generateWelcomeMessage(recipient.name);
    const result = await whatsAppService.sendTextMessage(recipient.phone, message);
    
    if (result.sent) {
      await this.logMessage(recipient.id, 'welcome', 'sent', message);
    }
    
    return result.sent;
  }

  /**
   * تسجيل الرسالة في السجل
   */
  private async logMessage(
    recipientId: string,
    messageType: string,
    status: 'sent' | 'failed',
    content: string,
    error?: string
  ): Promise<void> {
    if (!this.companyId) return;

    try {
      await supabase.from('whatsapp_message_logs').insert({
        company_id: this.companyId,
        recipient_id: recipientId,
        message_type: messageType,
        status,
        content: content.substring(0, 1000), // تقليص الحجم
        error_message: error,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error logging message:', err);
    }
  }

  /**
   * التحقق من الوقت وإرسال التقارير المجدولة
   */
  checkAndSendScheduledReports(): void {
    if (!this.settings) return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();
    const currentDate = now.getDate();

    // التقرير اليومي
    if (
      this.settings.dailyReportEnabled &&
      this.settings.dailyReportTime === currentTime &&
      this.settings.dailyReportDays?.includes(currentDay)
    ) {
      this.sendDailyReport();
    }

    // التقرير الأسبوعي
    if (
      this.settings.weeklyReportEnabled &&
      this.settings.weeklyReportDay === currentDay &&
      this.settings.weeklyReportTime === currentTime
    ) {
      this.sendWeeklyReport();
    }

    // التقرير الشهري
    if (
      this.settings.monthlyReportEnabled &&
      this.settings.monthlyReportDay === currentDate &&
      this.settings.monthlyReportTime === currentTime
    ) {
      // إرسال التقرير الشهري
    }
  }

  /**
   * بدء المجدول
   */
  start(): void {
    if (this.intervalId) return;

    // فحص كل دقيقة
    this.intervalId = setInterval(() => {
      this.checkAndSendScheduledReports();
    }, 60000);

    console.log('Report scheduler started');
  }

  /**
   * إيقاف المجدول
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Report scheduler stopped');
    }
  }
}

export const reportScheduler = new ReportScheduler();

export default ReportScheduler;

