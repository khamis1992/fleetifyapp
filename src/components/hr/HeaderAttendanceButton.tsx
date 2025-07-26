import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Loader2, AlertCircle, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const HeaderAttendanceButton: React.FC = () => {
  const { user } = useAuth();
  const { getCurrentLocation, clockIn, clockOut } = useAttendance();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check attendance permission
  const { data: permissionCheck, isLoading: isCheckingPermission } = usePermissionCheck('attendance.clock_in');

  // Get today's attendance
  const { data: todayAttendance, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', permissionCheck?.employee_id, new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      if (!permissionCheck?.employee_id) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', permissionCheck.employee_id)
        .eq('attendance_date', today)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!permissionCheck?.employee_id,
  });

  const handleClockAction = async () => {
    if (!permissionCheck?.hasPermission || !permissionCheck.employee_id) {
      toast.error(permissionCheck?.reason || 'ليس لديك صلاحية لتسجيل الحضور');
      return;
    }

    setIsProcessing(true);
    try {
      const location = await getCurrentLocation();
      
      if (!todayAttendance?.check_in_time) {
        // Clock in
        await clockIn.mutateAsync({
          employeeId: permissionCheck.employee_id,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      } else if (!todayAttendance?.check_out_time) {
        // Clock out
        await clockOut.mutateAsync({
          employeeId: permissionCheck.employee_id,
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

  // Loading state
  if (isCheckingPermission) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">جاري التحقق...</span>
      </div>
    );
  }

  // No permission or not an employee
  if (!permissionCheck?.hasPermission) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <UserX className="w-3 h-3" />
          غير مخول
        </Badge>
        <Button
          size="sm"
          variant="outline"
          disabled
          className="gap-1"
          title={permissionCheck?.reason || 'ليس لديك صلاحية لتسجيل الحضور'}
        >
          <AlertCircle className="w-3 h-3" />
          لا يمكن التسجيل
        </Button>
      </div>
    );
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