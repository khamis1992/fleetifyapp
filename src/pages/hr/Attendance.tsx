import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Search, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PageHelp } from "@/components/help";
import { AttendancePageHelpContent } from "@/components/help/content";

// Lazy load Calendar component for better performance
const Calendar = lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar })));

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

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // جلب سجلات الحضور
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', dateStr)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (attendanceError) throw attendanceError;
      if (!attendanceData || attendanceData.length === 0) return [];

      // جلب بيانات الموظفين
      const employeeIds = [...new Set(attendanceData.map(r => r.employee_id))];
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .in('id', employeeIds);
      
      // دمج البيانات
      const employeeMap = new Map(employeesData?.map(e => [e.id, e]) || []);
      return attendanceData.map(record => ({
        ...record,
        employees: employeeMap.get(record.employee_id) || null
      }));
    },
    staleTime: 30000, // Cache for 30 seconds
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">الحضور والانصراف</h1>
            <p className="text-slate-600">إدارة حضور الموظفين ومراقبة أوقات العمل</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="البحث عن موظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-right bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/10">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {format(selectedDate, 'PPP', { locale: ar })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Suspense fallback={<div className="p-4 text-center text-slate-500">جاري التحميل...</div>}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </Suspense>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4">
        {filteredRecords.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <p className="text-slate-600">
                  لا توجد سجلات حضور لتاريخ {format(selectedDate, 'PPP', { locale: ar })}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const statusInfo = getStatusBadge(record.status);
            return (
              <Card key={record.id} className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg shadow-teal-500/20 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">
                          {record.employees?.first_name} {record.employees?.last_name}
                        </h3>
                        <p className="text-slate-600">
                          رقم الموظف: {record.employees?.employee_number}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600">وقت الحضور</p>
                        <p className="font-semibold text-slate-900">
                          {record.check_in_time || '--:--'}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-slate-600">وقت الانصراف</p>
                        <p className="font-semibold text-slate-900">
                          {record.check_out_time || '--:--'}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-slate-600">ساعات العمل</p>
                        <p className="font-semibold text-slate-900">
                          {record.total_hours.toFixed(1)} ساعة
                        </p>
                      </div>

                      {record.late_hours > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-slate-600">ساعات التأخير</p>
                          <p className="font-semibold text-orange-600">
                            {record.late_hours.toFixed(1)} ساعة
                          </p>
                        </div>
                      )}

                      {record.overtime_hours > 0 && (
                        <div className="text-center">
                          <p className="text-sm text-slate-600">ساعات إضافية</p>
                          <p className="font-semibold text-green-600">
                            {record.overtime_hours.toFixed(1)} ساعة
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Badge variant={statusInfo.variant} className={statusInfo.variant === 'default' ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white' : ''}>
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
    <PageHelp content={<AttendancePageHelpContent />} />

    </div>
  );
}