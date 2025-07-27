import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface OdometerReading {
  id: string;
  company_id: string;
  vehicle_id: string;
  reading_date: string;
  odometer_reading: number;
  reading_type: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export const useOdometerReadings = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['odometer-readings', user?.profile?.company_id, vehicleId],
    queryFn: async (): Promise<OdometerReading[]> => {
      let query = supabase
        .from('odometer_readings')
        .select('*')
        .eq('company_id', user?.profile?.company_id!)
        .order('reading_date', { ascending: false });
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateOdometerReading = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (reading: Omit<OdometerReading, 'id' | 'created_at' | 'company_id'>) => {
      const { data, error } = await supabase
        .from('odometer_readings')
        .insert({
          ...reading,
          company_id: user?.profile?.company_id!,
          recorded_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odometer-readings'] });
      toast({
        title: "تم إضافة قراءة العداد",
        description: "تم حفظ قراءة العداد بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة قراءة العداد",
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateOdometerReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OdometerReading> & { id: string }) => {
      const { data, error } = await supabase
        .from('odometer_readings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odometer-readings'] });
      toast({
        title: "تم تحديث قراءة العداد",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث قراءة العداد",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteOdometerReading = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('odometer_readings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odometer-readings'] });
      toast({
        title: "تم حذف قراءة العداد",
        description: "تم حذف القراءة بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف قراءة العداد",
        description: "حدث خطأ أثناء حذف القراءة",
        variant: "destructive",
      });
    },
  });
};