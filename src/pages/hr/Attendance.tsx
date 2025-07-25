import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Search, Calendar as CalendarIcon, Check, X, AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours: number;
  late_hours: number;
  overtime_hours: number;
  status: 'present' | 'absent' | 'late' | 'sick_leave' | 'vacation';
  is_approved: boolean;
  employees?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  } | null;
}

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  // Debug query to check data access
  const { data: debugInfo } = useQuery({
    queryKey: ['attendance-debug', selectedDate],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if user can access attendance_records
      const { data: attendanceTest, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, attendance_date, employee_id')
        .limit(1);
      
      // Check if user can access employees
      const { data: employeesTest, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .limit(1);

      // Check for specific date data
      const { data: dateSpecificData, error: dateError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('attendance_date', dateStr);

      return {
        userId: user?.id,
        selectedDate: dateStr,
        canAccessAttendance: !attendanceError,
        attendanceError: attendanceError?.message,
        canAccessEmployees: !employeesError,
        employeesError: employeesError?.message,
        dateSpecificCount: dateSpecificData?.length || 0,
        dateError: dateError?.message,
        totalAttendanceRecords: attendanceTest?.length || 0,
        totalEmployees: employeesTest?.length || 0
      };
    },
    enabled: !!user
  });

  const { data: attendanceRecords, isLoading, error } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      console.log('Fetching attendance for date:', dateStr);
      
      // First, fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (attendanceError) {
        console.error('Attendance query error:', attendanceError);
        throw attendanceError;
      }

      console.log('Attendance data fetched:', attendanceData?.length || 0, 'records');
      
      if (!attendanceData || attendanceData.length === 0) {
        return [];
      }

      // Fetch employee data for the attendance records
      const employeeIds = attendanceData.map(record => record.employee_id);
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .in('id', employeeIds);
      
      if (employeesError) {
        console.error('Employees query error:', employeesError);
        throw employeesError;
      }

      console.log('Employee data fetched for', employeesData?.length || 0, 'employees');

      // Merge the data
      const recordsWithEmployees = attendanceData.map(record => {
        const employee = employeesData?.find(emp => emp.id === record.employee_id);
        return {
          ...record,
          employees: employee || null
        };
      });

      return recordsWithEmployees;
    },
    enabled: !!user
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      present: { label: 'حاضر', variant: 'default' as const },
      absent: { label: 'غائب', variant: 'destructive' as const },
      late: { label: 'متأخر', variant: 'secondary' as const },
      sick_leave: { label: 'مرضية', variant: 'outline' as const },
      vacation: { label: 'إجازة', variant: 'outline' as const },
    };
    
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
  };

  const filteredRecords = attendanceRecords?.filter(record =>
    record.employees?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employees?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employees?.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">الحضور والانصراف</h1>
            <p className="text-muted-foreground">إدارة حضور الموظفين ومراقبة أوقات العمل</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث عن موظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-right">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {format(selectedDate, 'PPP', { locale: ar })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Debug Information Panel */}
      {debugInfo && (
        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div>المستخدم: {debugInfo.userId}</div>
              <div>التاريخ المحدد: {debugInfo.selectedDate}</div>
              <div>إمكانية الوصول للحضور: {debugInfo.canAccessAttendance ? '✅' : '❌'}</div>
              <div>إمكانية الوصول للموظفين: {debugInfo.canAccessEmployees ? '✅' : '❌'}</div>
              <div>عدد سجلات التاريخ المحدد: {debugInfo.dateSpecificCount}</div>
              <div>إجمالي سجلات الحضور: {debugInfo.totalAttendanceRecords}</div>
              <div>إجمالي الموظفين: {debugInfo.totalEmployees}</div>
              {debugInfo.attendanceError && (
                <div className="text-destructive">خطأ الحضور: {debugInfo.attendanceError}</div>
              )}
              {debugInfo.employeesError && (
                <div className="text-destructive">خطأ الموظفين: {debugInfo.employeesError}</div>
              )}
              {debugInfo.dateError && (
                <div className="text-destructive">خطأ التاريخ: {debugInfo.dateError}</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            خطأ في تحميل بيانات الحضور: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  لا توجد سجلات حضور لتاريخ {format(selectedDate, 'PPP', { locale: ar })}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const statusInfo = getStatusBadge(record.status);
            return (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {record.employees?.first_name} {record.employees?.last_name}
                        </h3>
                        <p className="text-muted-foreground">
                          رقم الموظف: {record.employees?.employee_number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">وقت الحضور</p>
                        <p className="font-semibold">
                          {record.check_in_time || '--:--'}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">وقت الانصراف</p>
                        <p className="font-semibold">
                          {record.check_out_time || '--:--'}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">ساعات العمل</p>
                        <p className="font-semibold">
                          {record.total_hours.toFixed(1)} ساعة
                        </p>
                      </div>

                      {record.late_hours > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">ساعات التأخير</p>
                          <p className="font-semibold text-orange-600">
                            {record.late_hours.toFixed(1)} ساعة
                          </p>
                        </div>
                      )}

                      {record.overtime_hours > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">ساعات إضافية</p>
                          <p className="font-semibold text-green-600">
                            {record.overtime_hours.toFixed(1)} ساعة
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                        {record.is_approved ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}