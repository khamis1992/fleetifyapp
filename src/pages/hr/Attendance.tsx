import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Search, Calendar as CalendarIcon, Check, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PageHelp } from "@/components/help";
import { AttendancePageHelpContent } from "@/components/help/content";

// Lazy load Calendar component for better performance
const Calendar = lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar })));

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
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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

  const stats = {
    present: attendanceRecords?.filter(r => r.status === 'present').length || 0,
    absent: attendanceRecords?.filter(r => r.status === 'absent').length || 0,
    late: attendanceRecords?.filter(r => r.status === 'late').length || 0,
    onLeave: attendanceRecords?.filter(r => r.status === 'vacation' || r.status === 'sick_leave').length || 0,
  };

  const handleExport = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return;
    
    const csvContent = [
      ['الموظف', 'رقم الموظف', 'التاريخ', 'وقت الحضور', 'وقت الانصراف', 'ساعات العمل', 'الحالة'].join(','),
      ...attendanceRecords.map(r => [
        `${r.employees?.first_name} ${r.employees?.last_name}`,
        r.employees?.employee_number,
        r.attendance_date,
        r.check_in_time || '--:--',
        r.check_out_time || '--:--',
        r.total_hours?.toFixed(1) || '0',
        getStatusBadge(r.status).label
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">الحضور والانصراف</h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">إدارة حضور الموظفين ومراقبة أوقات العمل</p>
          </div>
        </div>
        <Button onClick={handleExport} variant="outline" className="min-h-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500/50" disabled={!attendanceRecords || attendanceRecords.length === 0}>
          <Download className="h-4 w-4 ml-2" />
          تصدير التقرير
        </Button>
      </div>

      {/* Attendance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">حاضر</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.present}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <X className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">غائب</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.absent}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">متأخر</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.late}</p>
            </div>
          </div>
        </div>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500 rounded-lg">
              <CalendarIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">في إجازة</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.onLeave}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
          className="min-h-[44px] min-w-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500/50"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 min-w-[200px] text-center">
          {format(currentMonth, 'MMMM yyyy', { locale: ar })}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
          className="min-h-[44px] min-w-[44px] border-slate-200 dark:border-slate-700 hover:border-teal-500/50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="البحث عن موظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto min-h-[44px] justify-start text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-teal-500/50">
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
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  لا توجد سجلات حضور لتاريخ {format(selectedDate, 'PPP', { locale: ar })}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const statusInfo = getStatusBadge(record.status);
            return (
              <Card key={record.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all duration-300">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-500 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                          {record.employees?.first_name} {record.employees?.last_name}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                          رقم الموظف: {record.employees?.employee_number}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full sm:w-auto">
                        <div className="text-right sm:text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-400">وقت الحضور</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {record.check_in_time || '--:--'}
                          </p>
                        </div>

                        <div className="text-right sm:text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-400">وقت الانصراف</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {record.check_out_time || '--:--'}
                          </p>
                        </div>

                        <div className="text-right sm:text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-400">ساعات العمل</p>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {record.total_hours.toFixed(1)} ساعة
                          </p>
                        </div>

                        {record.late_hours > 0 && (
                          <div className="text-right sm:text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">ساعات التأخير</p>
                            <p className="font-semibold text-orange-600">
                              {record.late_hours.toFixed(1)} ساعة
                            </p>
                          </div>
                        )}

                        {record.overtime_hours > 0 && (
                          <div className="text-right sm:text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400">ساعات إضافية</p>
                            <p className="font-semibold text-green-600">
                              {record.overtime_hours.toFixed(1)} ساعة
                            </p>
                          </div>
                        )}
                      </div>

                       <div className="flex items-center gap-2 mr-auto sm:mr-0">
                         <Badge variant={statusInfo.variant} className={statusInfo.variant === 'default' ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}>
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
    <PageHelp children={<AttendancePageHelpContent />} />

    </div>
  );
}