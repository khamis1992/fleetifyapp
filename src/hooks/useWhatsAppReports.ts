/**
 * Hook لإدارة تقارير واتساب
 * WhatsApp Reports Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  whatsAppService, 
  reportScheduler,
  type ReportScheduleSettings,
  type WhatsAppRecipient,
  type AlertType,
  type UltramsgConfig,
} from '@/services/whatsapp';
import { toast } from 'sonner';

/**
 * Hook لإدارة إعدادات واتساب
 */
export const useWhatsAppSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // جلب معرف الشركة
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const companyId = profile?.company_id;

  // جلب إعدادات واتساب
  const { 
    data: settings, 
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();
      
      // PGRST116 = No rows found - هذا طبيعي للشركة الجديدة
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching WhatsApp settings:', error);
        throw error;
      }
      
      // إذا لم توجد إعدادات، ننشئ إعدادات افتراضية
      if (!data) {
        return {
          id: '',
          companyId,
          dailyReportEnabled: true,
          dailyReportTime: '08:00',
          dailyReportDays: [0, 1, 2, 3, 4, 5, 6],
          weeklyReportEnabled: true,
          weeklyReportDay: 0,
          weeklyReportTime: '09:00',
          monthlyReportEnabled: false,
          monthlyReportDay: 1,
          monthlyReportTime: '10:00',
          instantAlertsEnabled: true,
          alertThreshold: 10000,
          recipients: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ReportScheduleSettings;
      }
      
      // تحويل أسماء الحقول من snake_case إلى camelCase
      // معالجة recipients - قد تكون string أو array
      let parsedRecipients: WhatsAppRecipient[] = [];
      if (data.recipients) {
        if (typeof data.recipients === 'string') {
          try {
            parsedRecipients = JSON.parse(data.recipients);
          } catch {
            parsedRecipients = [];
          }
        } else if (Array.isArray(data.recipients)) {
          parsedRecipients = data.recipients;
        }
      }
      
      return {
        id: data.id,
        companyId: data.company_id,
        dailyReportEnabled: data.daily_report_enabled ?? true,
        dailyReportTime: data.daily_report_time ?? '08:00',
        dailyReportDays: data.daily_report_days ?? [0, 1, 2, 3, 4, 5, 6],
        weeklyReportEnabled: data.weekly_report_enabled ?? true,
        weeklyReportDay: data.weekly_report_day ?? 0,
        weeklyReportTime: data.weekly_report_time ?? '09:00',
        monthlyReportEnabled: data.monthly_report_enabled ?? false,
        monthlyReportDay: data.monthly_report_day ?? 1,
        monthlyReportTime: data.monthly_report_time ?? '10:00',
        instantAlertsEnabled: data.instant_alerts_enabled ?? true,
        alertThreshold: data.alert_threshold ?? 10000,
        recipients: parsedRecipients,
        // إعدادات Ultramsg
        ultramsgInstanceId: data.ultramsg_instance_id ?? '',
        ultramsgToken: data.ultramsg_token ?? '',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as ReportScheduleSettings;
    },
    enabled: !!companyId,
  });

  // تهيئة خدمة واتساب تلقائياً عند تحميل الإعدادات
  useEffect(() => {
    if (settings?.ultramsgInstanceId && settings?.ultramsgToken) {
      // تهيئة الخدمة إذا كانت البيانات موجودة
      if (!whatsAppService.isInitialized()) {
        whatsAppService.initialize({
          instanceId: settings.ultramsgInstanceId,
          token: settings.ultramsgToken,
        });
      }
    }
  }, [settings?.ultramsgInstanceId, settings?.ultramsgToken]);

  // حفظ الإعدادات
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ReportScheduleSettings>) => {
      if (!companyId) throw new Error('Company ID not found');
      
      // تحويل أسماء الحقول من camelCase إلى snake_case
      const dbSettings: Record<string, any> = {
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };

      // تحويل الحقول
      if ('dailyReportEnabled' in newSettings) dbSettings.daily_report_enabled = newSettings.dailyReportEnabled;
      if ('dailyReportTime' in newSettings) dbSettings.daily_report_time = newSettings.dailyReportTime;
      if ('dailyReportDays' in newSettings) dbSettings.daily_report_days = newSettings.dailyReportDays;
      if ('weeklyReportEnabled' in newSettings) dbSettings.weekly_report_enabled = newSettings.weeklyReportEnabled;
      if ('weeklyReportDay' in newSettings) dbSettings.weekly_report_day = newSettings.weeklyReportDay;
      if ('weeklyReportTime' in newSettings) dbSettings.weekly_report_time = newSettings.weeklyReportTime;
      if ('monthlyReportEnabled' in newSettings) dbSettings.monthly_report_enabled = newSettings.monthlyReportEnabled;
      if ('monthlyReportDay' in newSettings) dbSettings.monthly_report_day = newSettings.monthlyReportDay;
      if ('monthlyReportTime' in newSettings) dbSettings.monthly_report_time = newSettings.monthlyReportTime;
      if ('instantAlertsEnabled' in newSettings) dbSettings.instant_alerts_enabled = newSettings.instantAlertsEnabled;
      if ('alertThreshold' in newSettings) dbSettings.alert_threshold = newSettings.alertThreshold;
      if ('recipients' in newSettings) dbSettings.recipients = newSettings.recipients;
      // إعدادات Ultramsg
      if ('ultramsgInstanceId' in newSettings) dbSettings.ultramsg_instance_id = newSettings.ultramsgInstanceId;
      if ('ultramsgToken' in newSettings) dbSettings.ultramsg_token = newSettings.ultramsgToken;

      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert(dbSettings, {
          onConflict: 'company_id',
          ignoreDuplicates: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', companyId] });
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: (error: any) => {
      toast.error(`فشل في حفظ الإعدادات: ${error.message || 'خطأ غير معروف'}`);
      console.error('Save settings error:', error);
    },
  });

  // تهيئة الخدمة
  const initializeService = useCallback((config: UltramsgConfig) => {
    whatsAppService.initialize(config);
    if (companyId) {
      reportScheduler.initialize(companyId);
    }
  }, [companyId]);

  return {
    settings,
    isLoading,
    error,
    companyId,
    saveSettings: saveSettingsMutation.mutateAsync,
    isSaving: saveSettingsMutation.isPending,
    refetch,
    initializeService,
  };
};

/**
 * Hook للمستلمين
 */
export const useWhatsAppRecipients = () => {
  const { settings, companyId, refetch } = useWhatsAppSettings();
  const queryClient = useQueryClient();

  // جلب المستلمين الحاليين من قاعدة البيانات مباشرة
  const fetchCurrentRecipients = async (): Promise<WhatsAppRecipient[]> => {
    if (!companyId) return [];
    
    const { data, error } = await supabase
      .from('whatsapp_settings')
      .select('recipients')
      .eq('company_id', companyId)
      .single();
    
    if (error || !data) return [];
    
    // معالجة البيانات
    if (typeof data.recipients === 'string') {
      try {
        return JSON.parse(data.recipients);
      } catch {
        return [];
      }
    }
    return Array.isArray(data.recipients) ? data.recipients : [];
  };

  // إضافة مستلم - يجلب البيانات الحالية أولاً ثم يضيف
  const addRecipient = useCallback(async (recipient: Omit<WhatsAppRecipient, 'id'>) => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return null;
    }

    const newRecipient: WhatsAppRecipient = {
      ...recipient,
      id: crypto.randomUUID(),
    };

    try {
      // جلب المستلمين الحاليين من قاعدة البيانات
      const currentRecipients = await fetchCurrentRecipients();
      const updatedRecipients = [...currentRecipients, newRecipient];

      // استخدام upsert لإنشاء السجل إذا لم يكن موجوداً
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({ 
          company_id: companyId,
          recipients: updatedRecipients,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      // تحديث الكاش
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', companyId] });
      
      return newRecipient;
    } catch (error) {
      console.error('Error adding recipient:', error);
      throw error;
    }
  }, [companyId, queryClient]);

  // تحديث مستلم
  const updateRecipient = useCallback(async (
    recipientId: string,
    updates: Partial<WhatsAppRecipient>
  ) => {
    if (!companyId) return;

    try {
      const currentRecipients = await fetchCurrentRecipients();
      const updatedRecipients = currentRecipients.map(r =>
        r.id === recipientId ? { ...r, ...updates } : r
      );

      // استخدام upsert لضمان وجود السجل
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({ 
          company_id: companyId,
          recipients: updatedRecipients,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', companyId] });
    } catch (error) {
      console.error('Error updating recipient:', error);
      throw error;
    }
  }, [companyId, queryClient]);

  // حذف مستلم
  const removeRecipient = useCallback(async (recipientId: string) => {
    if (!companyId) return;

    try {
      const currentRecipients = await fetchCurrentRecipients();
      const filteredRecipients = currentRecipients.filter(r => r.id !== recipientId);

      // استخدام upsert لضمان وجود السجل
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({ 
          company_id: companyId,
          recipients: filteredRecipients,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', companyId] });
    } catch (error) {
      console.error('Error removing recipient:', error);
      throw error;
    }
  }, [companyId, queryClient]);

  // تبديل حالة المستلم
  const toggleRecipient = useCallback(async (recipientId: string) => {
    const currentRecipients = await fetchCurrentRecipients();
    const recipient = currentRecipients.find(r => r.id === recipientId);
    
    if (recipient) {
      await updateRecipient(recipientId, { isActive: !recipient.isActive });
    }
  }, [updateRecipient]);

  return {
    recipients: settings?.recipients || [],
    addRecipient,
    updateRecipient,
    removeRecipient,
    toggleRecipient,
  };
};

/**
 * Hook لإرسال التقارير
 */
export const useWhatsAppReports = () => {
  const { settings, companyId } = useWhatsAppSettings();
  const [isSending, setIsSending] = useState(false);

  // إرسال التقرير اليومي يدوياً
  const sendDailyReport = useCallback(async () => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return { success: false, sentCount: 0 };
    }

    setIsSending(true);
    try {
      await reportScheduler.initialize(companyId);
      // forceManual: true لتجاوز التحقق من تفعيل التقارير وإرسال لجميع المستلمين النشطين
      const result = await reportScheduler.sendDailyReport(true);
      
      if (result.success) {
        toast.success(`تم إرسال التقرير اليومي إلى ${result.sentCount} مستلم`);
      } else {
        toast.error('فشل في إرسال التقرير - تأكد من وجود مستلمين نشطين واتصال واتساب');
      }
      
      return result;
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال التقرير');
      console.error('Send daily report error:', error);
      return { success: false, sentCount: 0 };
    } finally {
      setIsSending(false);
    }
  }, [companyId]);

  // إرسال التقرير الأسبوعي يدوياً
  const sendWeeklyReport = useCallback(async () => {
    if (!companyId) {
      toast.error('لم يتم العثور على معرف الشركة');
      return { success: false, sentCount: 0 };
    }

    setIsSending(true);
    try {
      await reportScheduler.initialize(companyId);
      // forceManual: true لتجاوز التحقق من تفعيل التقارير وإرسال لجميع المستلمين النشطين
      const result = await reportScheduler.sendWeeklyReport(true);
      
      if (result.success) {
        toast.success(`تم إرسال التقرير الأسبوعي إلى ${result.sentCount} مستلم`);
      } else {
        toast.error('فشل في إرسال التقرير - تأكد من وجود مستلمين نشطين واتصال واتساب');
      }
      
      return result;
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال التقرير');
      console.error('Send weekly report error:', error);
      return { success: false, sentCount: 0 };
    } finally {
      setIsSending(false);
    }
  }, [companyId]);

  // إرسال تنبيه
  const sendAlert = useCallback(async (
    alertType: AlertType,
    data: Record<string, any>
  ) => {
    if (!companyId) {
      return { success: false, sentCount: 0 };
    }

    try {
      await reportScheduler.initialize(companyId);
      return await reportScheduler.sendAlert(alertType, data);
    } catch (error) {
      console.error('Send alert error:', error);
      return { success: false, sentCount: 0 };
    }
  }, [companyId]);

  // إرسال رسالة اختبار
  const sendTestMessage = useCallback(async (phone: string) => {
    setIsSending(true);
    try {
      const result = await whatsAppService.sendTestMessage(phone);
      
      if (result.sent) {
        toast.success('تم إرسال رسالة الاختبار بنجاح');
      } else {
        toast.error(`فشل في الإرسال: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      toast.error('حدث خطأ أثناء إرسال رسالة الاختبار');
      return { sent: false, error: 'Unknown error' };
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    sendDailyReport,
    sendWeeklyReport,
    sendAlert,
    sendTestMessage,
    isSending,
  };
};

/**
 * Hook لسجل الرسائل
 */
export const useWhatsAppMessageLogs = (limit = 50) => {
  const { companyId } = useWhatsAppSettings();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-logs', companyId, limit],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('whatsapp_message_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  return {
    logs: logs || [],
    isLoading,
    refetch,
  };
};

/**
 * Hook للتحقق من حالة الاتصال
 */
export const useWhatsAppConnectionStatus = () => {
  const [status, setStatus] = useState<{
    connected: boolean;
    phone?: string;
    checking: boolean;
  }>({
    connected: false,
    checking: false,
  });

  const checkStatus = useCallback(async () => {
    // التحقق من تهيئة الخدمة أولاً
    if (!whatsAppService.isInitialized()) {
      setStatus({
        connected: false,
        checking: false,
      });
      return { connected: false };
    }

    setStatus(prev => ({ ...prev, checking: true }));
    
    try {
      const result = await whatsAppService.getConnectionStatus();
      setStatus({
        connected: result.connected,
        phone: result.phone,
        checking: false,
      });
      return result;
    } catch (error) {
      setStatus({
        connected: false,
        checking: false,
      });
      return { connected: false };
    }
  }, []);

  // فحص الحالة تلقائياً عند تحميل المكون
  useEffect(() => {
    // تأخير صغير للسماح للخدمة بالتهيئة
    const timer = setTimeout(() => {
      if (whatsAppService.isInitialized()) {
        checkStatus();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [checkStatus]);

  // إعادة فحص الحالة عندما تتم تهيئة الخدمة
  useEffect(() => {
    const interval = setInterval(() => {
      if (whatsAppService.isInitialized() && !status.connected && !status.checking) {
        checkStatus();
      }
    }, 2000);

    // توقف بعد 10 محاولات (20 ثانية)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 20000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [status.connected, status.checking, checkStatus]);

  return {
    ...status,
    checkStatus,
  };
};

export default {
  useWhatsAppSettings,
  useWhatsAppRecipients,
  useWhatsAppReports,
  useWhatsAppMessageLogs,
  useWhatsAppConnectionStatus,
};

