import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface VehicleAlert {
  id: string;
  company_id: string;
  vehicle_id: string;
  alert_type: 'insurance_expiry' | 'maintenance_due' | 'inspection_due' | 'license_expiry' | 'warranty_expiry' | 'service_overdue';
  alert_title: string;
  alert_message: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export const useVehicleAlerts = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vehicle-alerts', user?.profile?.company_id, vehicleId],
    queryFn: async (): Promise<VehicleAlert[]> => {
      if (!user?.profile?.company_id) return [];
      
      let query = supabase
        .from('vehicle_alerts')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as VehicleAlert[];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useAcknowledgeVehicleAlert = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-alerts'] });
      toast({
        title: "تم تأكيد التنبيه",
        description: "تم وضع علامة على التنبيه كمقروء",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تأكيد التنبيه",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateVehicleAlert = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (alertData: Omit<VehicleAlert, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'auto_generated'>) => {
      if (!user?.profile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .insert({
          ...alertData,
          company_id: user.profile.company_id,
          auto_generated: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-alerts'] });
      toast({
        title: "تم إنشاء التنبيه بنجاح",
        description: "تم إضافة التنبيه الجديد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء التنبيه",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};