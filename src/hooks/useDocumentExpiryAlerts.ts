import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DocumentExpiryAlert {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  document_type: 'national_id' | 'license';
  alert_type: 'expired' | 'expiring_soon';
  expiry_date: string;
  days_until_expiry: number;
  contract_number: string;
  customer_name: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
}

export const useDocumentExpiryAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['document-expiry-alerts'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('document_expiry_alerts')
        .select('*')
        .eq('is_acknowledged', false)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data as DocumentExpiryAlert[];
    },
    enabled: !!user,
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('document_expiry_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-expiry-alerts'] });
      toast.success('تم تأكيد التنبيه بنجاح');
    },
    onError: (error) => {
      console.error('Error acknowledging alert:', error);
      toast.error('حدث خطأ في تأكيد التنبيه');
    },
  });

  const acknowledgeAllAlerts = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('document_expiry_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('is_acknowledged', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-expiry-alerts'] });
      toast.success('تم تأكيد جميع التنبيهات بنجاح');
    },
    onError: (error) => {
      console.error('Error acknowledging all alerts:', error);
      toast.error('حدث خطأ في تأكيد التنبيهات');
    },
  });

  const syncAlerts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-document-alerts');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-expiry-alerts'] });
      toast.success('تم تحديث التنبيهات بنجاح');
    },
    onError: (error) => {
      console.error('Error syncing alerts:', error);
      toast.error('حدث خطأ في تحديث التنبيهات');
    },
  });

  return {
    alerts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    syncAlerts,
  };
};