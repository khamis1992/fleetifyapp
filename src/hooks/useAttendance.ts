import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface ClockInData extends LocationData {
  employeeId: string;
}

interface ClockOutData extends LocationData {
  employeeId: string;
}

export const useAttendance = () => {
  const queryClient = useQueryClient();

  // Get current location
  const getCurrentLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  // Verify location
  const verifyLocation = useMutation({
    mutationFn: async ({ companyId, latitude, longitude }: { companyId: string } & LocationData) => {
      const { data, error } = await supabase.functions.invoke('verify-location', {
        body: { companyId, latitude, longitude },
      });

      if (error) throw error;
      return data;
    },
  });

  // Clock in
  const clockIn = useMutation({
    mutationFn: async ({ employeeId, latitude, longitude }: ClockInData) => {
      const { data, error } = await supabase.functions.invoke('clock-in', {
        body: { employeeId, latitude, longitude },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
      } else {
        // Handle specific error cases
        if (data.needsConfiguration) {
          toast.error('Office location not configured. Please contact your administrator.');
        } else {
          toast.error(data.error || 'Failed to clock in');
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clock in');
    },
  });

  // Clock out
  const clockOut = useMutation({
    mutationFn: async ({ employeeId, latitude, longitude }: ClockOutData) => {
      const { data, error } = await supabase.functions.invoke('clock-out', {
        body: { employeeId, latitude, longitude },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
      } else {
        // Handle specific error cases
        if (data.needsConfiguration) {
          toast.error('Office location not configured. Please contact your administrator.');
        } else {
          toast.error(data.error || 'Failed to clock out');
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to clock out');
    },
  });

  // Get today's attendance record
  const getTodayAttendance = (employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    return useQuery({
      queryKey: ['attendance', employeeId, today],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('attendance_date', today)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
      },
    });
  };

  return {
    getCurrentLocation,
    verifyLocation,
    clockIn,
    clockOut,
    getTodayAttendance,
  };
};