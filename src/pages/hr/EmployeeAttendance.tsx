import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendance } from '@/hooks/useAttendance';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EmployeeAttendance() {
  const { user } = useAuth();
  const { getCurrentLocation, verifyLocation, clockIn, clockOut, getTodayAttendance } = useAttendance();
  const [locationStatus, setLocationStatus] = useState<'checking' | 'verified' | 'outside' | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get employee info
  const { data: employee, isLoading: employeeLoading, error: employeeError } = useQuery({
    queryKey: ['employee', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, company_id, first_name, last_name, employee_number')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get today's attendance record
  const { data: todayRecord, refetch: refetchAttendance } = getTodayAttendance(employee?.id || '');

  // Check location on component mount
  useEffect(() => {
    if (employee?.company_id) {
      checkLocation();
    }
  }, [employee?.company_id]);

  const checkLocation = async () => {
    try {
      setLocationStatus('checking');
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      const result = await verifyLocation.mutateAsync({
        companyId: employee?.company_id || '',
        ...location,
      });

      setLocationStatus(result.withinRange ? 'verified' : 'outside');
      
      if (!result.withinRange) {
        toast.error(`You are ${result.distance}m away from the office. Maximum allowed distance is ${result.allowedRadius}m.`);
      }
    } catch (error: any) {
      toast.error(error.message);
      setLocationStatus('outside');
    }
  };

  const handleClockIn = async () => {
    if (!employee?.id || !currentLocation) return;

    try {
      await clockIn.mutateAsync({
        employeeId: employee.id,
        ...currentLocation,
      });
      refetchAttendance();
    } catch (error) {
      console.error('Clock in failed:', error);
    }
  };

  const handleClockOut = async () => {
    if (!employee?.id || !currentLocation) return;

    try {
      await clockOut.mutateAsync({
        employeeId: employee.id,
        ...currentLocation,
      });
      refetchAttendance();
    } catch (error) {
      console.error('Clock out failed:', error);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You are not registered as an employee in the system. Please contact your administrator to set up your employee account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="p-4 rounded-lg bg-muted/30 text-muted-foreground">
              <p>This page is only accessible to registered employees.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Attendance Tracker</CardTitle>
          <CardDescription>
            Welcome, {employee.first_name} {employee.last_name} (#{employee.employee_number})
          </CardDescription>
          <div className="text-3xl font-mono font-bold text-primary mt-4">
            {currentTime}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Location Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <span className="font-medium">Location Status</span>
            </div>
            <div className="flex items-center gap-2">
              {locationStatus === 'checking' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking...</span>
                </>
              )}
              {locationStatus === 'verified' && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Within Office Area
                  </Badge>
                </>
              )}
              {locationStatus === 'outside' && (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="destructive">Outside Office Area</Badge>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={checkLocation}
                disabled={locationStatus === 'checking'}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Today's Record */}
          {todayRecord && (
            <div className="p-4 rounded-lg border bg-muted/50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today's Record
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Check In</div>
                  <div className="font-medium">
                    {todayRecord.check_in_time ? formatTime(todayRecord.check_in_time) : 'Not clocked in'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Check Out</div>
                  <div className="font-medium">
                    {todayRecord.check_out_time ? formatTime(todayRecord.check_out_time) : 'Not clocked out'}
                  </div>
                </div>
                {todayRecord.total_hours && (
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                    <div className="font-medium">{todayRecord.total_hours} hours</div>
                  </div>
                )}
              </div>
              {todayRecord.auto_checkout && (
                <Badge variant="secondary" className="mt-2">
                  Auto Check-out
                </Badge>
              )}
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleClockIn}
              disabled={
                locationStatus !== 'verified' ||
                clockIn.isPending ||
                Boolean(todayRecord?.check_in_time && !todayRecord?.check_out_time)
              }
              className="h-16 text-lg"
            >
              {clockIn.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Clock In'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleClockOut}
              disabled={
                locationStatus !== 'verified' ||
                clockOut.isPending ||
                !todayRecord?.check_in_time ||
                Boolean(todayRecord?.check_out_time)
              }
              className="h-16 text-lg"
            >
              {clockOut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Clock Out'
              )}
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2">Instructions:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>You must be within the office area to clock in/out</li>
              <li>You can only clock in once per day</li>
              <li>If you forget to clock out, the system will automatically clock you out after work hours</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}