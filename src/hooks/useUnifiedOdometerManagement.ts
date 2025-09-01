import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UnifiedOdometerReading {
  id: string;
  vehicle_id: string;
  company_id: string;
  reading_date: string;
  odometer_reading: number;
  fuel_level_percentage?: number;
  reading_type: 'contract_start' | 'contract_end' | 'dispatch_start' | 'dispatch_end' | 'maintenance' | 'manual' | 'periodic';
  recorded_by: string;
  contract_id?: string;
  permit_id?: string;
  notes?: string;
  location?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOdometerReadingData {
  vehicle_id: string;
  odometer_reading: number;
  fuel_level_percentage?: number;
  reading_type: 'contract_start' | 'contract_end' | 'dispatch_start' | 'dispatch_end' | 'maintenance' | 'manual' | 'periodic';
  contract_id?: string;
  permit_id?: string;
  notes?: string;
  location?: string;
}

// Get current vehicle odometer reading
export const useCurrentVehicleOdometer = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-vehicle-odometer', vehicleId, user?.profile?.company_id],
    queryFn: async (): Promise<{ current_reading: number; last_update: string; vehicle_id: string } | null> => {
      if (!vehicleId || !user?.profile?.company_id) return null;

      // Get the most recent odometer reading
      const { data: latestReading } = await supabase
        .from('odometer_readings')
        .select('odometer_reading, reading_date')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', user.profile.company_id)
        .order('reading_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Also check vehicle's current odometer reading
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('odometer_reading, updated_at')
        .eq('id', vehicleId)
        .single();

      if (!latestReading && !vehicle?.odometer_reading) {
        return { current_reading: 0, last_update: new Date().toISOString(), vehicle_id: vehicleId };
      }

      // Use the higher reading between latest record and vehicle table
      const odometerFromRecord = latestReading?.odometer_reading || 0;
      const odometerFromVehicle = vehicle?.odometer_reading || 0;
      const currentReading = Math.max(odometerFromRecord, odometerFromVehicle);
      
      const lastUpdate = latestReading?.reading_date || vehicle?.updated_at || new Date().toISOString();

      return {
        current_reading: currentReading,
        last_update: lastUpdate,
        vehicle_id: vehicleId
      };
    },
    enabled: !!vehicleId && !!user?.profile?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Get vehicle's odometer history
export const useVehicleOdometerHistory = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vehicle-odometer-history', vehicleId, user?.profile?.company_id],
    queryFn: async (): Promise<UnifiedOdometerReading[]> => {
      if (!vehicleId || !user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('odometer_readings')
        .select(`
          *,
          recorded_by_profile:profiles!recorded_by(first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('company_id', user.profile.company_id)
        .order('reading_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        is_verified: (item as any).is_verified ?? false,
        updated_at: (item as any).updated_at || item.created_at
      })) as UnifiedOdometerReading[];
    },
    enabled: !!vehicleId && !!user?.profile?.company_id,
  });
};

// Create new odometer reading
export const useCreateOdometerReading = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOdometerReadingData): Promise<UnifiedOdometerReading> => {
      if (!user?.profile?.company_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Validate odometer reading
      if (data.odometer_reading <= 0) {
        throw new Error('قراءة العداد يجب أن تكون أكبر من صفر');
      }

      // Get current odometer reading to validate increment
      const { data: currentOdometer } = await supabase
        .from('odometer_readings')
        .select('odometer_reading')
        .eq('vehicle_id', data.vehicle_id)
        .eq('company_id', user.profile.company_id)
        .order('reading_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('odometer_reading')
        .eq('id', data.vehicle_id)
        .single();

      const lastReading = Math.max(
        currentOdometer?.odometer_reading || 0,
        vehicle?.odometer_reading || 0
      );

      if (data.odometer_reading < lastReading) {
        throw new Error(`قراءة العداد يجب أن تكون أكبر من أو تساوي القراءة الحالية (${lastReading.toLocaleString()} كم)`);
      }

      // Create odometer reading record
      const insertData = {
        ...data,
        company_id: user.profile.company_id,
        recorded_by: user.id,
        reading_date: new Date().toISOString(),
        is_verified: false,
      };

      const { data: result, error: insertError } = await supabase
        .from('odometer_readings')
        .insert(insertData)
        .select('*')
        .single();

      if (insertError) throw insertError;

      // Update vehicle's odometer reading
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ 
          odometer_reading: data.odometer_reading,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.vehicle_id);

      if (updateError) {
        console.warn('Failed to update vehicle odometer reading:', updateError);
      }

      return result as UnifiedOdometerReading;
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['current-vehicle-odometer', result.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-odometer-history', result.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      
      toast({
        title: "تم تسجيل قراءة العداد بنجاح",
        description: `تم تحديث العداد إلى ${result.odometer_reading.toLocaleString()} كم`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تسجيل قراءة العداد",
        description: error.message || "حدث خطأ أثناء تسجيل قراءة العداد",
        variant: "destructive",
      });
    },
  });
};

// Update odometer reading for specific operations
export const useUpdateOdometerForOperation = () => {
  const createOdometerReading = useCreateOdometerReading();

  return {
    // For contract creation
    updateForContractStart: (data: {
      vehicle_id: string;
      contract_id: string;
      odometer_reading: number;
      fuel_level_percentage?: number;
      notes?: string;
    }) => {
      return createOdometerReading.mutateAsync({
        ...data,
        reading_type: 'contract_start',
      });
    },

    // For contract completion/return
    updateForContractEnd: (data: {
      vehicle_id: string;
      contract_id: string;
      odometer_reading: number;
      fuel_level_percentage?: number;
      notes?: string;
    }) => {
      return createOdometerReading.mutateAsync({
        ...data,
        reading_type: 'contract_end',
      });
    },

    // For dispatch permit start
    updateForDispatchStart: (data: {
      vehicle_id: string;
      permit_id: string;
      odometer_reading: number;
      fuel_level_percentage?: number;
      location?: string;
      notes?: string;
    }) => {
      return createOdometerReading.mutateAsync({
        ...data,
        reading_type: 'dispatch_start',
      });
    },

    // For dispatch permit completion
    updateForDispatchEnd: (data: {
      vehicle_id: string;
      permit_id: string;
      odometer_reading: number;
      fuel_level_percentage?: number;
      location?: string;
      notes?: string;
    }) => {
      return createOdometerReading.mutateAsync({
        ...data,
        reading_type: 'dispatch_end',
      });
    },

    // For maintenance
    updateForMaintenance: (data: {
      vehicle_id: string;
      odometer_reading: number;
      notes?: string;
    }) => {
      return createOdometerReading.mutateAsync({
        ...data,
        reading_type: 'maintenance',
      });
    },
  };
};

// Validate odometer reading increment
export const useValidateOdometerIncrement = () => {
  const { user } = useAuth();

  const validateOdometerReading = async (vehicleId: string, newReading: number): Promise<{ isValid: boolean; message?: string; currentReading?: number }> => {
    try {
      if (!user?.profile?.company_id) {
        return { isValid: false, message: 'المستخدم غير مسجل الدخول' };
      }

      // Get current odometer reading
      const { data: latestReading } = await supabase
        .from('odometer_readings')
        .select('odometer_reading')
        .eq('vehicle_id', vehicleId)
        .eq('company_id', user.profile.company_id)
        .order('reading_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('odometer_reading')
        .eq('id', vehicleId)
        .single();

      const currentReading = Math.max(
        latestReading?.odometer_reading || 0,
        vehicle?.odometer_reading || 0
      );

      if (newReading < currentReading) {
        return {
          isValid: false,
          message: `قراءة العداد يجب أن تكون أكبر من أو تساوي القراءة الحالية (${currentReading.toLocaleString()} كم)`,
          currentReading
        };
      }

      if (newReading <= 0) {
        return {
          isValid: false,
          message: 'قراءة العداد يجب أن تكون أكبر من صفر',
          currentReading
        };
      }

      const increment = newReading - currentReading;
      const maxReasonableIncrement = 10000; // 10,000 km as maximum reasonable single increment

      if (increment > maxReasonableIncrement) {
        return {
          isValid: false,
          message: `الزيادة في العداد كبيرة جداً (${increment.toLocaleString()} كم). يرجى التحقق من القراءة`,
          currentReading
        };
      }

      return { isValid: true, currentReading };
    } catch (error) {
      console.error('خطأ في التحقق من قراءة العداد:', error);
      return {
        isValid: false,
        message: 'خطأ في التحقق من قراءة العداد',
      };
    }
  };

  return validateOdometerReading;
};