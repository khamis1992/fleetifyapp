import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const HeaderAttendanceButton: React.FC = () => {
  const { user } = useAuth();
  const { getCurrentLocation, clockIn, clockOut } = useAttendance();
  const [isProcessing, setIsProcessing] = useState(false);

  // Get employee info
  const { data: employee } = useQuery({
    queryKey: ['employee', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get today's attendance
  const { data: todayAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', employee?.id, new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employee?.id)
        .eq('attendance_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!employee?.id,
  });

  const handleClockAction = async () => {
    if (!employee) {
      toast.error('لم يتم العثور على بيانات الموظف');
      return;
    }

    setIsProcessing(true);
    try {
      const location = await getCurrentLocation();
      
      if (!todayAttendance?.check_in_time) {
        // Clock in
        await clockIn.mutateAsync({
          employeeId: employee.id,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      } else if (!todayAttendance?.check_out_time) {
        // Clock out
        await clockOut.mutateAsync({
          employeeId: employee.id,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
      
      refetchAttendance();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في تسجيل الحضور');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show if user is not an employee
  if (!employee) {
    return null;
  }

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isCheckedOut = todayAttendance?.check_in_time && todayAttendance?.check_out_time;

  return (
    <div className="flex items-center gap-2">
      {/* Status Badge */}
      <Badge variant={isCheckedIn ? "default" : isCheckedOut ? "secondary" : "outline"}>
        <Clock className="w-3 h-3 mr-1" />
        {isCheckedIn ? 'حضور' : isCheckedOut ? 'انصراف' : 'غير مسجل'}
      </Badge>

      {/* Action Button */}
      <Button
        size="sm"
        variant={isCheckedIn ? "destructive" : "default"}
        onClick={handleClockAction}
        disabled={isProcessing || !!isCheckedOut}
        className="gap-1"
      >
        {isProcessing ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <MapPin className="w-3 h-3" />
        )}
        {isProcessing ? 'جاري التسجيل...' : 
         isCheckedIn ? 'تسجيل انصراف' : 
         isCheckedOut ? 'تم الانصراف' : 'تسجيل حضور'}
      </Button>
    </div>
  );
};