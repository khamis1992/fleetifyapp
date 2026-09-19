import { useMemo, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Search, Calendar as CalendarIcon, Check, X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { PageHelp } from "@/components/help";
import { AttendancePageHelpContent } from "@/components/help/content";
import { PageEmpty, PageLoading, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

// Lazy load Calendar component for better performance
const Calendar = lazy(() => import('@/components/ui/calendar').then(m => ({ default: m.Calendar })));

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  total_hours?: number | null;
  late_hours?: number | null;
  overtime_hours?: number | null;
  status: string | null;
  is_approved?: boolean | null;
  employees?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  } | null;
}

const statusMeta: Record<string, { label: string; tone: 'ok' | 'risk' | 'warn' | 'info' }> = {
  present: { label: 'حاضر', tone: 'ok' },
  absent: { label: 'غائب', tone: 'risk' },
  late: { label: 'متأخر', tone: 'warn' },
  sick_leave: { label: 'مرضية', tone: 'info' },
  vacation: { label: 'إجازة', tone: 'info' },
};

const statusColors: Record<string, string> = {
  present: '#7c9e65',
  absent: '#b86d50',
  late: '#d5ad69',
  leave: '#83a9b2',
};

const formatHour = (value?: number | null) => `${(value ?? 0).toFixed(1)} ساعة`;

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

  const stats = {
    present: attendanceRecords?.filter(r => r.status === 'present').length || 0,
    absent: attendanceRecords?.filter(r => r.status === 'absent').length || 0,
    late: attendanceRecords?.filter(r => r.status === 'late').length || 0,
    onLeave: attendanceRecords?.filter(r => r.status === 'vacation' || r.status === 'sick_leave').length || 0,
  };

  const totalHours = attendanceRecords?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0;
  const totalLate = attendanceRecords?.reduce((sum, r) => sum + (r.late_hours || 0), 0) || 0;
  const totalOvertime = attendanceRecords?.reduce((sum, r) => sum + (r.overtime_hours || 0), 0) || 0;
  const recordCount = attendanceRecords?.length || 0;
  const presenceRate = recordCount > 0 ? Math.round(((stats.present + stats.late) / recordCount) * 100) : 0;

  const breakdownRows = [
    { label: 'حاضر', value: stats.present, color: statusColors.present },
    { label: 'متأخر', value: stats.late, color: statusColors.late },
    { label: 'غائب', value: stats.absent, color: statusColors.absent },
    { label: 'إجازة', value: stats.onLeave, color: statusColors.leave },
  ].map(row => ({ ...row, percent: recordCount > 0 ? (row.value / recordCount) * 100 : 0 }));

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
        statusMeta[r.status ?? '']?.label || r.status
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

  const filteredRecords = useMemo<AttendanceRecord[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return attendanceRecords || [];
    return (attendanceRecords || []).filter(record =>
      record.employees?.first_name.toLowerCase().includes(term) ||
      record.employees?.last_name.toLowerCase().includes(term) ||
      record.employees?.employee_number.toLowerCase().includes(term)
    );
  }, [attendanceRecords, searchTerm]);

  const visibleRecords = filteredRecords.slice(0, 15);

  const ringGradient = useMemo(() => {
    if (recordCount === 0) return '#edf0e9';
    let offset = 0;
    return `conic-gradient(${breakdownRows.map(row => {
      const start = offset;
      offset += row.percent;
      return `${row.color} ${start}% ${offset}%`;
    }).join(', ')})`;
  }, [breakdownRows, recordCount]);

  const metrics = [
    { label: 'حاضر', value: stats.present, hint: 'سجلوا حضور اليوم', icon: Check, accent: true },
    { label: 'غائب', value: stats.absent, hint: 'بدون سجل حضور', icon: X, accent: false },
    { label: 'متأخر', value: stats.late, hint: 'حضروا بعد الوقت المحدد', icon: Clock, accent: false },
    { label: 'في إجازة', value: stats.onLeave, hint: 'إجازة اعتيادية أو مرضية', icon: CalendarIcon, accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> الموارد البشرية <span>/</span> الحضور
            </div>
            <h1>الحضور والانصراف</h1>
            <p>مراقبة يومية للحضور، التأخير، الإجازات، وساعات العمل في واجهة واحدة.</p>
          </div>
        </header>

        <div className="dw-daybar">
          <div className="dw-date">
            <CalendarIcon size={17} />
            <span>{format(selectedDate, 'PPP', { locale: ar })}</span>
          </div>
          <div className="dw-primary-actions">
            <button
              className="dw-button dw-button-primary"
              onClick={handleExport}
              disabled={!attendanceRecords || attendanceRecords.length === 0}
            >
              <Download size={16} />
              تصدير التقرير
            </button>
          </div>
        </div>

        <section className="dw-metrics" aria-label="ملخص الحضور">
          {metrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
                <metric.icon size={19} />
              </div>
              <strong>{isLoading ? '—' : metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel number="01" title="حصة اليوم" subtitle="توزيع سجلات التاريخ المحدد" className="wk-panel-side">
            <div className="wk-toolbar">
              <div className="dw-filters" role="group" aria-label="التنقل بين الشهور">
                <button
                  aria-label="الشهر السابق"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                >
                  <ChevronRight size={13} />
                </button>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#487038', minWidth: 110, textAlign: 'center' }}>
                  {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                </span>
                <button
                  aria-label="الشهر التالي"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                >
                  <ChevronLeft size={13} />
                </button>
              </div>
              <span className="wk-note"><Clock size={13} />سجلات يوم واحد</span>
            </div>
            {isLoading ? (
              <PageLoading />
            ) : recordCount === 0 ? (
              <PageEmpty icon={Clock} message={`لا توجد سجلات حضور لتاريخ ${format(selectedDate, 'PPP', { locale: ar })}`} />
            ) : (
              <>
                <div className="dw-fleet-visual">
                  <div
                    className="dw-fleet-ring"
                    style={{ background: ringGradient }}
                    role="img"
                    aria-label={`نسبة الحضور ${presenceRate}%`}
                  >
                    <div>
                      <strong>
                        {presenceRate}
                        <small>%</small>
                      </strong>
                      <span>نسبة الحضور</span>
                    </div>
                  </div>
                  <div className="dw-fleet-annotation">
                    <span>حاضر اليوم</span>
                    <strong>{stats.present}</strong>
                    <small>من {recordCount} سجل مسجل</small>
                  </div>
                </div>
                <div className="wk-legend">
                  {breakdownRows.map(row => (
                    <div key={row.label} className="wk-legend-row">
                      <i style={{ background: row.color }} />
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                      <small>{Math.round(row.percent)}%</small>
                    </div>
                  ))}
                </div>
                <div className="wk-metric-rows">
                  {[
                    { label: 'إجمالي ساعات العمل', value: formatHour(totalHours) },
                    { label: 'إجمالي ساعات التأخير', value: formatHour(totalLate) },
                    { label: 'إجمالي الساعات الإضافية', value: formatHour(totalOvertime) },
                  ].map(row => (
                    <div key={row.label} className="wk-metric-row">
                      <div>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PagePanel>

          <PagePanel
            number="02"
            title="سجل اليوم"
            subtitle="سجلات الحضور والانصراف للتاريخ المحدد"
            className="wk-panel-main"
            action={
              <Popover>
                <PopoverTrigger asChild>
                  <button className="dw-button">
                    <CalendarIcon size={15} />
                    {format(selectedDate, 'PPP', { locale: ar })}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Suspense fallback={<div className="p-4 text-center text-[#7e8b73]" style={{ fontSize: 12 }}>جاري التحميل…</div>}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </Suspense>
                </PopoverContent>
              </Popover>
            }
          >
            <div className="wk-toolbar">
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="البحث عن موظف…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="بحث عن موظف"
                  />
                </div>
              </div>
              <span className="wk-note"><CalendarIcon size={13} />اختر تاريخاً من الزر أعلاه</span>
            </div>
            {isLoading ? (
              <PageLoading />
            ) : visibleRecords.length === 0 ? (
              <PageEmpty icon={Clock} message={attendanceRecords?.length ? 'لا توجد سجلات مطابقة لبحثك' : `لا توجد سجلات حضور لتاريخ ${format(selectedDate, 'PPP', { locale: ar })}`} />
            ) : (
              <>
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">سجل الحضور</caption>
                    <thead>
                      <tr>
                        <th scope="col">الموظف</th>
                        <th scope="col">الحضور</th>
                        <th scope="col">الانصراف</th>
                        <th scope="col">الساعات</th>
                        <th scope="col">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRecords.map((record) => {
                        const meta = statusMeta[record.status ?? ''] || { label: record.status || 'غير معروف', tone: 'info' as const };
                        return (
                          <tr key={record.id}>
                            <td>
                              <strong>
                                <bdi>{record.employees?.first_name} {record.employees?.last_name}</bdi>
                              </strong>
                              <span>رقم الموظف: {record.employees?.employee_number}</span>
                            </td>
                            <td><bdi>{record.check_in_time || '--:--'}</bdi></td>
                            <td><bdi>{record.check_out_time || '--:--'}</bdi></td>
                            <td>
                              {(record.total_hours ?? 0).toFixed(1)} ساعة
                              {(record.late_hours ?? 0) > 0 && (
                                <span className="wk-sub" style={{ color: '#9b7c36' }}>تأخير {formatHour(record.late_hours)}</span>
                              )}
                              {(record.overtime_hours ?? 0) > 0 && (
                                <span className="wk-sub" style={{ color: '#487038' }}>إضافي {formatHour(record.overtime_hours)}</span>
                              )}
                            </td>
                            <td>
                              <div className="wk-badges">
                                <span className={`wk-badge is-${meta.tone}`}>{meta.label}</span>
                                <span title={record.is_approved ? 'معتمد' : 'غير معتمد'}>
                                  {record.is_approved ? (
                                    <Check size={14} style={{ color: '#487038' }} />
                                  ) : (
                                    <X size={14} style={{ color: '#b3694c' }} />
                                  )}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length > visibleRecords.length && (
                  <p className="wk-more-note">+{filteredRecords.length - visibleRecords.length} سجل آخر — استخدم البحث لتضييق النتائج</p>
                )}
              </>
            )}
          </PagePanel>
        </div>

        <section className="dw-shortcuts" aria-labelledby="hr-attendance-shortcuts-title">
          <div className="dw-shortcut-heading">
            <div className="dw-eyebrow">مساحات العمل</div>
            <h2 id="hr-attendance-shortcuts-title">انتقل إلى التفاصيل</h2>
            <p>أدوات الموارد البشرية اليومية، في مكان واحد.</p>
          </div>
          <div className="dw-shortcut-grid">
            {[
              { label: 'الموظفون', detail: 'ملفات الموظفين والصلاحيات', icon: Check, path: '/hr/employees' },
              { label: 'الرواتب', detail: 'سجلات الرواتب والمراجعات', icon: Download, path: '/hr/payroll' },
              { label: 'الإجازات', detail: 'طلبات الإجازات والموافقات', icon: CalendarIcon, path: '/hr/leave' },
              { label: 'تقارير الموارد البشرية', detail: 'تقارير الأداء التشغيلي', icon: Clock, path: '/hr/reports' },
            ].map((item) => (
              <Link key={item.path} to={item.path}>
                <item.icon size={23} />
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="dw-footer">
          <span>
            Fleetify <span>/</span> الحضور والانصراف
          </span>
          <span role="status">يوم عمل واحد محدد للعرض</span>
        </footer>
      </div>
    <PageHelp title="مساعدة الحضور" children={<AttendancePageHelpContent />} />

    </div>
  );
}
