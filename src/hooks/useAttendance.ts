import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatLocationError } from '@/lib/attendanceUtils';

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
        reject(new Error('خدمة الموقع غير مدعومة في هذا المتصفح. يرجى استخدام متصفح حديث.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', { 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy 
          });
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'حدث خطأ في تحديد الموقع';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'تم رفض الوصول للموقع. يرجى السماح للتطبيق بالوصول للموقع في إعدادات المتصفح';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'لا يمكن تحديد الموقع الحالي. يرجى التأكد من تفعيل GPS';
              break;
            case error.TIMEOUT:
              errorMessage = 'انتهت مهلة تحديد الموقع. يرجى المحاولة مرة أخرى';
              break;
            default:
              errorMessage = `خطأ في تحديد الموقع: ${error.message}`;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
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
      console.log('Attempting clock-in with:', { employeeId, hasLocation: !!(latitude && longitude) });
      
      const { data, error } = await supabase.functions.invoke('clock-in', {
        body: { employeeId, latitude, longitude },
      });

      console.log('Clock-in response:', { data, error });

      if (error) {
        console.error('Clock-in error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('Clock-in success:', data);
      if (data.success) {
        toast.success(data.message || 'تم تسجيل الحضور بنجاح');
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
      } else {
        // Handle specific error cases from the response
        const errorMessage = formatLocationError(data, data);
        toast.error(errorMessage);
      }
    },
    onError: (error: any) => {
      console.error('Clock-in mutation error:', error);
      
      // Try to parse error response for better error handling
      let errorData = error;
      try {
        if (error.message && typeof error.message === 'string') {
          // If error message contains JSON, try to parse it
          const match = error.message.match(/\{.*\}/);
          if (match) {
            errorData = JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.warn('Could not parse error response:', e);
      }
      
      const errorMessage = formatLocationError(errorData, errorData);
      toast.error(errorMessage);
    },
  });

  // Clock out
  const clockOut = useMutation({
    mutationFn: async ({ employeeId, latitude, longitude }: ClockOutData) => {
      console.log('Attempting clock-out with:', { employeeId, hasLocation: !!(latitude && longitude) });
      
      const { data, error } = await supabase.functions.invoke('clock-out', {
        body: { employeeId, latitude, longitude },
      });

      console.log('Clock-out response:', { data, error });

      if (error) {
        console.error('Clock-out error:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('Clock-out success:', data);
      if (data.success) {
        toast.success(data.message || 'تم تسجيل الانصراف بنجاح');
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
      } else {
        // Handle specific error cases from the response
        const errorMessage = formatLocationError(data, data);
        toast.error(errorMessage);
      }
    },
    onError: (error: any) => {
      console.error('Clock-out mutation error:', error);
      
      // Try to parse error response for better error handling
      let errorData = error;
      try {
        if (error.message && typeof error.message === 'string') {
          // If error message contains JSON, try to parse it
          const match = error.message.match(/\{.*\}/);
          if (match) {
            errorData = JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.warn('Could not parse error response:', e);
      }
      
      const errorMessage = formatLocationError(errorData, errorData);
      toast.error(errorMessage);
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