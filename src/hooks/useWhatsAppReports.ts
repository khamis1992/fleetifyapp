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
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as ReportScheduleSettings | null;
    },
    enabled: !!companyId,
  });

  // حفظ الإعدادات
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<ReportScheduleSettings>) => {
      if (!companyId) throw new Error('Company ID not found');
      
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({
          company_id: companyId,
          ...newSettings,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', companyId] });
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: (error) => {
      toast.error('فشل في حفظ الإعدادات');
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
    saveSettings: saveSettingsMutation.mutate,
    isSaving: saveSettingsMutation.isPending,
    refetch,
    initializeService,
  };
};

/**
 * Hook للمستلمين
 */
export const useWhatsAppRecipients = () => {
  const { settings, saveSettings, companyId } = useWhatsAppSettings();
  const queryClient = useQueryClient();

  // إضافة مستلم
  const addRecipient = useCallback(async (recipient: Omit<WhatsAppRecipient, 'id'>) => {
    const newRecipient: WhatsAppRecipient = {
      ...recipient,
      id: crypto.randomUUID(),
    };

    const currentRecipients = settings?.recipients || [];
    await saveSettings({
      recipients: [...currentRecipients, newRecipient],
    });

    return newRecipient;
  }, [settings, saveSettings]);

  // تحديث مستلم
  const updateRecipient = useCallback(async (
    recipientId: string,
    updates: Partial<WhatsAppRecipient>
  ) => {
    const currentRecipients = settings?.recipients || [];
    const updatedRecipients = currentRecipients.map(r =>
      r.id === recipientId ? { ...r, ...updates } : r
    );

    await saveSettings({
      recipients: updatedRecipients,
    });
  }, [settings, saveSettings]);

  // حذف مستلم
  const removeRecipient = useCallback(async (recipientId: string) => {
    const currentRecipients = settings?.recipients || [];
    const filteredRecipients = currentRecipients.filter(r => r.id !== recipientId);

    await saveSettings({
      recipients: filteredRecipients,
    });
  }, [settings, saveSettings]);

  // تبديل حالة المستلم
  const toggleRecipient = useCallback(async (recipientId: string) => {
    const currentRecipients = settings?.recipients || [];
    const recipient = currentRecipients.find(r => r.id === recipientId);
    
    if (recipient) {
      await updateRecipient(recipientId, { isActive: !recipient.isActive });
    }
  }, [settings, updateRecipient]);

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
      const result = await reportScheduler.sendDailyReport();
      
      if (result.success) {
        toast.success(`تم إرسال التقرير اليومي إلى ${result.sentCount} مستلم`);
      } else {
        toast.error('فشل في إرسال التقرير');
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
      const result = await reportScheduler.sendWeeklyReport();
      
      if (result.success) {
        toast.success(`تم إرسال التقرير الأسبوعي إلى ${result.sentCount} مستلم`);
      } else {
        toast.error('فشل في إرسال التقرير');
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

