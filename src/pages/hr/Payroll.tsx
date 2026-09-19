import { useMemo, useState } from 'react';
import {
  DollarSign, Search, Plus, FileText, Clock, Calculator, CheckCircle,
  CalendarDays, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  usePayrollRecords,
  usePayrollReviews,
  useCreatePayroll,
  useUpdatePayrollStatus,
  useUpdatePayroll,
  useDeletePayroll,
  CreatePayrollData,
  PayrollRecord
} from '@/hooks/usePayroll';
import PayrollDialog from '@/components/hr/PayrollDialog';
import PayrollDetailsModal from '@/components/hr/PayrollDetailsModal';
import EditPayrollDialog from '@/components/hr/EditPayrollDialog';
import PayrollActionButtons from '@/components/hr/PayrollActionButtons';
import { PageHelp } from "@/components/help";
import { PayrollPageHelpContent } from "@/components/help/content";
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Link } from 'react-router-dom';
import { PageEmpty, PageLoading, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const statusMeta: Record<string, { label: string; tone: 'ok' | 'warn' | 'risk' | 'info' | 'neutral' }> = {
  draft: { label: 'مسودة', tone: 'neutral' },
  pending_approval: { label: 'في انتظار الموافقة', tone: 'warn' },
  approved: { label: 'معتمد', tone: 'info' },
  paid: { label: 'مدفوع', tone: 'ok' },
};

const statusColors: Record<string, string> = {
  draft: '#d2d9cd',
  pending_approval: '#d5ad69',
  approved: '#83a9b2',
  paid: '#7c9e65',
};

const formatDay = (value: string) => new Date(value).toLocaleDateString('en-GB')

export default function Payroll() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePayroll, setShowCreatePayroll] = useState(false);
  const [showPayrollDetails, setShowPayrollDetails] = useState(false);
  const [showEditPayroll, setShowEditPayroll] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(() => Date.now());
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: payrollRecords, isLoading: recordsLoading } = usePayrollRecords();
  const { data: payrollReviews, isLoading: reviewsLoading } = usePayrollReviews();
  const createPayrollMutation = useCreatePayroll();
  const updatePayrollStatusMutation = useUpdatePayrollStatus();
  const updatePayrollMutation = useUpdatePayroll();
  const deletePayrollMutation = useDeletePayroll();

  const { formatCurrency } = useCurrencyFormatter();

  // Fetch employees for payroll creation
  const { data: employees } = useQuery({
    queryKey: ['employees-for-payroll', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, position, department, basic_salary, allowances, bank_account, iban')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return (data || []).map(employee => ({
        ...employee,
        position: employee.position ?? undefined,
        department: employee.department ?? undefined,
        allowances: Number(employee.allowances) || 0,
        bank_account: employee.bank_account ?? undefined,
        iban: employee.iban ?? undefined,
      }));
    },
    enabled: !!companyId,
  });

  const handleCreatePayroll = (data: CreatePayrollData) => {
    createPayrollMutation.mutate(data, {
      onSuccess: () => setShowCreatePayroll(false),
    });
  };

  const handleViewPayroll = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowPayrollDetails(true);
  };

  const handleEditPayroll = (payroll: PayrollRecord) => {
    setSelectedPayroll(payroll);
    setShowEditPayroll(true);
  };

  const handleUpdatePayroll = (data: CreatePayrollData) => {
    if (selectedPayroll) {
      updatePayrollMutation.mutate({
        id: selectedPayroll.id,
        updates: data
      }, {
        onSuccess: () => setShowEditPayroll(false),
      });
    }
  };

  const handleApprovePayroll = (payroll: PayrollRecord) => {
    updatePayrollStatusMutation.mutate({
      id: payroll.id,
      status: 'approved'
    });
  };

  const handlePayPayroll = (payroll: PayrollRecord) => {
    updatePayrollStatusMutation.mutate({
      id: payroll.id,
      status: 'paid'
    });
  };

  const handleDeletePayroll = (payrollId: string) => {
    deletePayrollMutation.mutate(payrollId);
  };

  const filteredReviews = useMemo(() => {
    const term = searchTerm.trim();
    return payrollReviews?.filter(review =>
      review.period_start.includes(term) ||
      review.period_end.includes(term)
    ) || [];
  }, [payrollReviews, searchTerm]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return payrollRecords?.filter(record =>
      record.employee?.first_name.toLowerCase().includes(term) ||
      record.employee?.last_name.toLowerCase().includes(term) ||
      record.payroll_number.toLowerCase().includes(term)
    ) || [];
  }, [payrollRecords, searchTerm]);

  const payrollStats = {
    records: payrollRecords?.length || 0,
    reviews: payrollReviews?.length || 0,
    totalNet: payrollRecords?.reduce((sum, record) => sum + (record.net_amount || 0), 0) || 0,
    pending: payrollRecords?.filter(record => record.status !== 'paid').length || 0,
  };

  const statusRows = Object.keys(statusMeta).map(status => ({
    status,
    label: statusMeta[status].label,
    color: statusColors[status],
    value: payrollRecords?.filter(record => record.status === status).length || 0,
  })).map(row => ({
    ...row,
    percent: payrollStats.records > 0 ? (row.value / payrollStats.records) * 100 : 0,
  }));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['payroll-records'] }),
        queryClient.invalidateQueries({ queryKey: ['payroll-reviews'] }),
      ]);
      setRefreshedAt(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const visibleRecords = filteredRecords.slice(0, 10);
  const visibleReviews = filteredReviews.slice(0, 8);

  const metrics = [
    { label: 'سجلات الرواتب', value: payrollStats.records, hint: 'سجلات صرف مسجلة', icon: FileText, accent: true },
    { label: 'مراجعات الرواتب', value: payrollStats.reviews, hint: 'دورات صرف مُجمعة', icon: Calculator, accent: false },
    { label: 'إجمالي الصافي', value: formatCurrency(payrollStats.totalNet), hint: 'مجموع صافي السجلات', icon: DollarSign, accent: false },
    { label: 'غير مدفوعة', value: payrollStats.pending, hint: 'تحتاج اعتماداً أو صرفاً', icon: Clock, accent: false },
  ];

  const isLoading = recordsLoading || reviewsLoading;

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> الموارد البشرية <span>/</span> الرواتب
            </div>
            <h1>إدارة الرواتب</h1>
            <p>إدارة سجلات الرواتب، المراجعات، الاعتماد، والتكامل المحاسبي من مساحة تشغيلية واحدة.</p>
          </div>
          <div className="dw-header-tools">
            <button
              className="dw-icon-button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="تحديث بيانات الرواتب"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="dw-daybar">
          <div className="dw-date">
            <CalendarDays size={17} />
            <span>{new Date().toLocaleDateString('ar-QA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="dw-primary-actions">
            <button className="dw-button dw-button-primary" onClick={() => setShowCreatePayroll(true)}>
              <Plus size={17} />
              إضافة راتب جديد
            </button>
          </div>
        </div>

        <section className="dw-metrics" aria-label="مؤشرات الرواتب">
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
          <PagePanel number="01" title="توزيع الحالات" subtitle="مراحل دورة صرف الرواتب" className="wk-panel-side">
            {isLoading ? (
              <PageLoading />
            ) : payrollStats.records === 0 ? (
              <PageEmpty icon={DollarSign} message="لا توجد سجلات رواتب بعد" />
            ) : (
              <div className="wk-legend">
                {statusRows.map(row => (
                  <div key={row.status} className="wk-legend-row">
                    <i style={{ background: row.color }} />
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <small>{Math.round(row.percent)}%</small>
                  </div>
                ))}
              </div>
            )}
            <div className="dw-panel-foot">
              <CheckCircle size={14} />
              <span>السجلات المدفوعة تُدمج تلقائياً مع القيود المحاسبية.</span>
            </div>
          </PagePanel>

          <PagePanel
            number="02"
            title="سجلات الرواتب"
            subtitle="اعتماد أو صرف أو تعديل سجلات الصرف"
            className="wk-panel-main"
          >
            <div className="wk-toolbar">
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="ابحث باسم الموظف أو رقم الراتب…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    aria-label="بحث في سجلات الرواتب"
                  />
                </div>
              </div>
              <span className="wk-note"><Clock size={13} />يشمل المراجعات أدناه</span>
            </div>
            {isLoading ? (
              <PageLoading />
            ) : visibleRecords.length === 0 ? (
              <PageEmpty icon={DollarSign} message={payrollStats.records ? 'لا توجد سجلات مطابقة لبحثك' : 'لا توجد سجلات رواتب'}>
                {!payrollStats.records && (
                  <button className="dw-button" onClick={() => setShowCreatePayroll(true)}>
                    <Plus size={16} />
                    إضافة أول راتب
                  </button>
                )}
              </PageEmpty>
            ) : (
              <>
                <div className="wk-table-wrap">
                  <table>
                    <caption className="sr-only">سجلات الرواتب</caption>
                    <thead>
                      <tr>
                        <th scope="col">الموظف / السجل</th>
                        <th scope="col">دورة الصرف</th>
                        <th scope="col">الصافي</th>
                        <th scope="col">التكامل</th>
                        <th scope="col">الحالة</th>
                        <th scope="col"><span className="sr-only">إجراءات</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRecords.map((record) => {
                        const meta = statusMeta[record.status] || { label: record.status, tone: 'neutral' as const };
                        return (
                          <tr key={record.id}>
                            <td>
                              <strong>
                                <bdi>{record.employee?.first_name} {record.employee?.last_name}</bdi>
                              </strong>
                              <span>رقم الراتب: {record.payroll_number}</span>
                            </td>
                            <td>
                              <bdi>{formatDay(record.pay_period_start)}</bdi>
                              <span>حتى {formatDay(record.pay_period_end)}</span>
                            </td>
                            <td>
                              <span className="wk-sub" style={{ color: '#487038', fontWeight: 600, fontSize: 12, marginTop: 0 }}>
                                {formatCurrency(record.net_amount)}
                              </span>
                            </td>
                            <td>
                              {record.journal_entry_id ? (
                                <span className="wk-badge is-ok">مدمج</span>
                              ) : record.status === 'paid' ? (
                                <span className="wk-badge is-risk">خطأ</span>
                              ) : (
                                <span className="wk-badge is-warn">معلق</span>
                              )}
                              {record.journal_entry_id && (
                                <span className="wk-sub">قيد رقم: {record.journal_entry_id.substring(0, 8)}…</span>
                              )}
                            </td>
                            <td>
                              <span className={`wk-badge is-${meta.tone}`}>{meta.label}</span>
                            </td>
                            <td>
                              <PayrollActionButtons
                                payroll={record}
                                onView={handleViewPayroll}
                                onEdit={handleEditPayroll}
                                onApprove={() => handleApprovePayroll(record)}
                                onPay={() => handlePayPayroll(record)}
                                onDelete={() => handleDeletePayroll(record.id)}
                                isUpdating={updatePayrollStatusMutation.isPending || updatePayrollMutation.isPending}
                                isDeleting={deletePayrollMutation.isPending}
                              />
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

          <PagePanel
            number="03"
            title="مراجعات الرواتب"
            subtitle="دورات الصرف المجمعة حسب الفترة"
            className="wk-panel-full"
          >
            {isLoading ? (
              <PageLoading />
            ) : visibleReviews.length === 0 ? (
              <PageEmpty icon={FileText} message={payrollStats.reviews ? 'لا توجد مراجعات مطابقة لبحثك' : 'لا توجد مراجعات رواتب'} />
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">مراجعات الرواتب</caption>
                  <thead>
                    <tr>
                      <th scope="col">دورة الرواتب</th>
                      <th scope="col">عدد الموظفين</th>
                      <th scope="col">صافي المبلغ</th>
                      <th scope="col">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleReviews.map((review) => {
                      const meta = statusMeta[review.status] || { label: review.status, tone: 'neutral' as const };
                      return (
                        <tr key={review.id}>
                          <td>
                            <strong>دورة من {review.period_start} إلى {review.period_end}</strong>
                          </td>
                          <td>{review.total_employees} موظف</td>
                          <td>{formatCurrency(review.net_amount)}</td>
                          <td>
                            <span className={`wk-badge is-${meta.tone}`}>{meta.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PagePanel>
        </div>

        <section className="dw-shortcuts" aria-labelledby="hr-payroll-shortcuts-title">
          <div className="dw-shortcut-heading">
            <div className="dw-eyebrow">مساحات العمل</div>
            <h2 id="hr-payroll-shortcuts-title">انتقل إلى التفاصيل</h2>
            <p>أدوات الموارد البشرية اليومية، في مكان واحد.</p>
          </div>
          <div className="dw-shortcut-grid">
            {[
              { label: 'الموظفون', detail: 'ملفات الموظفين والرواتب', icon: DollarSign, path: '/hr/employees' },
              { label: 'الحضور والانصراف', detail: 'متابعة يومية للحضور', icon: Clock, path: '/hr/attendance' },
              { label: 'الإجازات', detail: 'طلبات الإجازات والموافقات', icon: CalendarDays, path: '/hr/leave' },
              { label: 'تقارير الموارد البشرية', detail: 'تقارير الأداء التشغيلي', icon: FileText, path: '/hr/reports' },
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
            Fleetify <span>/</span> إدارة الرواتب
          </span>
          <span role="status">
            {refreshing ? 'جاري تحديث البيانات…' : `آخر تحديث ${new Date(refreshedAt).toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        </footer>
      </div>

      <PayrollDialog
        open={showCreatePayroll}
        onOpenChange={setShowCreatePayroll}
        onSubmit={handleCreatePayroll}
        employees={employees || []}
        isLoading={createPayrollMutation.isPending}
      />

      <PayrollDetailsModal
        open={showPayrollDetails}
        onOpenChange={setShowPayrollDetails}
        payroll={selectedPayroll}
      />

      <EditPayrollDialog
        open={showEditPayroll}
        onOpenChange={setShowEditPayroll}
        onSubmit={handleUpdatePayroll}
        payroll={selectedPayroll}
        employees={employees || []}
        isLoading={updatePayrollMutation.isPending}
      />
    <PageHelp title="مساعدة إدارة الرواتب">
      <PayrollPageHelpContent />
    </PageHelp>

    </div>
  );
}
