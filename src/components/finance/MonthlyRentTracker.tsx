/**
 * متابعة الإيجارات الشهرية
 * موحّدة مع نظام التصميم المالي (systemColorPattern)
 */
import React, { useState, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Banknote,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExportButton } from '@/components/ui/ExportButton';
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from '@/components/common/FeatureTourGuide';
import { QuickPaymentDialog } from './QuickPaymentDialog';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/utils/exports/csvExport';
import {
  useMonthlyRentTracking,
  useRentPaymentSummary,
  type MonthlyRentStatus,
  type DateFilterType,
} from '@/hooks/useMonthlyRentTracking';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

const monthlyRentTour = {
  title: 'جولة متابعة الإيجارات الشهرية',
  description: 'شرح طريقة متابعة دفعات الإيجار حسب الشهر والحالة.',
  steps: [
    'اختر السنة والشهر وطريقة احتساب التاريخ لمراجعة دفعات الفترة المطلوبة.',
    'استخدم البحث للوصول إلى عميل أو مركبة أو عقد محدد.',
    'الفلاتر تعرض المدفوع وغير المدفوع والدفعات الجزئية.',
    'زر تحديث يعيد تحميل البيانات، وزر تصدير ينشئ ملف CSV للمتابعة.',
    'زر تسجيل دفعة في الجدول يفتح نافذة دفع سريعة للعميل المحدد.',
  ],
} satisfies FeatureTourContent;

const rentColors = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const rentStyle = {
  '--rent-text': rentColors.text,
  '--rent-surface': rentColors.surface,
  '--rent-inner': rentColors.inner,
  '--rent-muted': rentColors.muted,
  '--rent-border': rentColors.border,
  '--rent-info': rentColors.info,
  '--rent-alert': rentColors.alert,
  '--rent-focus': rentColors.focus,
  '--rent-success': rentColors.success,
} as CSSProperties;

const months = [
  { value: 1, label: 'يناير' },
  { value: 2, label: 'فبراير' },
  { value: 3, label: 'مارس' },
  { value: 4, label: 'أبريل' },
  { value: 5, label: 'مايو' },
  { value: 6, label: 'يونيو' },
  { value: 7, label: 'يوليو' },
  { value: 8, label: 'أغسطس' },
  { value: 9, label: 'سبتمبر' },
  { value: 10, label: 'أكتوبر' },
  { value: 11, label: 'نوفمبر' },
  { value: 12, label: 'ديسمبر' },
];

const statusConfigs: Record<MonthlyRentStatus['payment_status'], { label: string; className: string }> = {
  paid: { label: 'مدفوع', className: 'bg-[#edf4e6] text-[#487038] border-transparent' },
  unpaid: { label: 'غير مدفوع', className: 'bg-[#fdf1eb] text-[#b3694c] border-transparent' },
  partial: { label: 'دفع جزئي', className: 'bg-[#faf5e7] text-[#9b7c36] border-transparent' },
};

const statusDots: Record<MonthlyRentStatus['payment_status'], string> = {
  paid: 'bg-[#487038]',
  unpaid: 'bg-[#b3694c]',
  partial: 'bg-[#9b7c36]',
};

interface RentMetricProps {
  title: string;
  value: string;
  helper?: string;
  icon: React.ElementType;
  accent: string;
  onClick?: () => void;
  isActive?: boolean;
}

const RentMetric = ({ title, value, helper, icon: Icon, accent, onClick, isActive }: RentMetricProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="rent-metric text-start"
    style={isActive ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}40` } : undefined}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="rent-metric-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      {helper && (
        <span className="text-xs font-bold" style={{ color: rentColors.muted }}>
          {helper}
        </span>
      )}
    </div>
    <p className="mt-5 text-sm font-bold" style={{ color: rentColors.muted }}>
      {title}
    </p>
    <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: rentColors.text }}>
      {value}
    </p>
  </button>
);

export const MonthlyRentTracker: React.FC = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('payment_date');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<MonthlyRentStatus | null>(null);
  const [activeTour, setActiveTour] = useState<FeatureTourContent | null>(null);

  const { data: rentStatuses, isLoading, refetch } = useMonthlyRentTracking(selectedYear, selectedMonth, dateFilter);
  const summary = useRentPaymentSummary(selectedYear, selectedMonth, dateFilter);
  const { formatCurrency } = useCurrencyFormatter();

  const filteredData = useMemo(() => {
    return rentStatuses?.filter(item => {
      const matchesSearch = searchTerm === '' ||
        item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.payment_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [rentStatuses, searchTerm, filterStatus]);

  const getStatusBadge = (status: MonthlyRentStatus['payment_status']) => {
    const config = statusConfigs[status];
    return (
      <Badge className={config.className} aria-label={`الحالة: ${config.label}`}>
        {config.label}
      </Badge>
    );
  };

  const handleExportCSV = () => {
    if (!filteredData || filteredData.length === 0) return;
    exportToCSV(
      filteredData.map(item => ({
        code: item.customer_code,
        customer: item.customer_name,
        plate: item.vehicle_plate || '-',
        rent: item.monthly_rent.toFixed(3),
        paid: item.amount_paid.toFixed(3),
        due: item.amount_due.toFixed(3),
        status: statusConfigs[item.payment_status].label,
        lastPayment: item.last_payment_date
          ? new Date(item.last_payment_date).toLocaleDateString('ar-QA')
          : '-',
      })),
      `rent-tracking-${selectedYear}-${selectedMonth}.csv`,
      {
        headers: ['كود العميل', 'اسم العميل', 'رقم اللوحة', 'الإيجار الشهري', 'المدفوع', 'المتبقي', 'الحالة', 'تاريخ آخر دفعة'],
      }
    );
  };

  return (
    <div className="rent-system min-h-0" dir="rtl" style={rentStyle}>
      {/* Period + Filters */}
      <section className="rent-filter-bar" data-tour="rent-filters">
        <div className="flex items-center gap-3">
          <span className="rent-filter-icon" style={{ color: rentColors.info, backgroundColor: `${rentColors.info}14` }}>
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black" style={{ color: rentColors.text }}>فترة المتابعة</p>
            <p className="text-xs" style={{ color: rentColors.muted }}>اختر الشهر وطريقة احتساب الدفعات</p>
          </div>
        </div>

        <div className="rent-filter-controls">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="rent-input w-36" aria-label="الشهر">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="rent-input w-28" aria-label="السنة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(5)].map((_, i) => {
                const year = currentDate.getFullYear() - 2 + i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterType)}>
            <SelectTrigger className="rent-input w-44" aria-label="طريقة احتساب التاريخ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment_date">حسب تاريخ الدفع</SelectItem>
              <SelectItem value="created_at">حسب تاريخ التسجيل</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: rentColors.muted }} />
            <Input
              placeholder="ابحث باسم العميل، الكود، أو رقم اللوحة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rent-input pr-10"
              aria-label="بحث"
            />
          </div>

          <Select value={filterStatus} onValueChange={(v: string) => setFilterStatus(v as 'all' | 'paid' | 'unpaid' | 'partial')}>
            <SelectTrigger className="rent-input w-44" aria-label="تصفية الحالة">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="paid">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#487038]" />
                  مدفوع
                </span>
              </SelectItem>
              <SelectItem value="unpaid">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#b3694c]" />
                  غير مدفوع
                </span>
              </SelectItem>
              <SelectItem value="partial">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9b7c36]" />
                  دفع جزئي
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <FeatureTourButton
            tour={monthlyRentTour}
            onStart={setActiveTour}
            className="h-10 gap-2 border-[#dfe5d9] bg-white text-[#2c4136] hover:bg-[#f7f8f4]"
          />
          <Button
            variant="outline"
            className="h-10 gap-2 border-[#dfe5d9] bg-white text-[#2c4136] hover:bg-[#f7f8f4]"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
          <ExportButton onExportCSV={handleExportCSV} />
          <Button
            onClick={() => navigate('/finance/operations/receive-payment')}
            className="h-10 gap-2 bg-[#2f7966] hover:bg-[#256450]"
          >
            <Banknote className="h-4 w-4" />
            استلام دفعة
          </Button>
        </div>
      </section>

      {/* Metrics */}
      <div data-tour="rent-metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RentMetric
          title="إجمالي العقود"
          value={summary.totalCustomers.toLocaleString('ar-QA')}
          helper={`${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
          icon={Users}
          accent={rentColors.info}
          onClick={() => setFilterStatus('all')}
          isActive={filterStatus === 'all'}
        />
        <RentMetric
          title="العملاء الذين دفعوا"
          value={summary.paidCount.toLocaleString('ar-QA')}
          helper={summary.totalCustomers > 0 ? `${Math.round((summary.paidCount / summary.totalCustomers) * 100)}% من الإجمالي` : '0%'}
          icon={CheckCircle2}
          accent={rentColors.success}
          onClick={() => setFilterStatus('paid')}
          isActive={filterStatus === 'paid'}
        />
        <RentMetric
          title="العملاء الذين لم يدفعوا"
          value={summary.unpaidCount.toLocaleString('ar-QA')}
          helper={summary.partialCount > 0 ? `+ ${summary.partialCount} دفع جزئي` : 'بحاجة متابعة'}
          icon={XCircle}
          accent={rentColors.alert}
          onClick={() => setFilterStatus('unpaid')}
          isActive={filterStatus === 'unpaid'}
        />
        <RentMetric
          title="نسبة التحصيل"
          value={`${summary.collectionRate}%`}
          helper={`المتبقي ${formatCurrency(summary.totalRentOutstanding)}`}
          icon={FileSpreadsheet}
          accent={rentColors.focus}
          onClick={() => setFilterStatus('partial')}
          isActive={filterStatus === 'partial'}
        />
      </div>

      {/* Table */}
      <motion.section
        className="bg-white rounded-xl shadow-sm overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        data-tour="rent-table"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5d9] px-4 py-3">
          <div>
            <p className="text-sm font-black text-[#2c4136]">تفاصيل الدفعات</p>
            <p className="text-xs text-[#5b6b52]">
              عرض {filteredData?.length || 0} من {rentStatuses?.length || 0} عقد
              {filterStatus !== 'all' && (
                <Badge className="ms-2 border-transparent bg-[#f1f4ec] text-[#5b6b52]">
                  {statusConfigs[filterStatus].label}
                </Badge>
              )}
            </p>
          </div>
          <p className="text-xs font-bold" style={{ color: rentColors.muted }}>
            المتوقع {formatCurrency(summary.totalRentExpected)} · المحصّل {formatCurrency(summary.totalRentCollected)}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#2f7966]" />
          </div>
        ) : filteredData && filteredData.length > 0 ? (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table className="min-w-[900px]" aria-label="جدول متابعة الإيجارات">
              <TableHeader>
                <TableRow className="bg-[#f7f8f4]">
                  <TableHead className="w-[220px] text-right" scope="col">اسم العميل</TableHead>
                  <TableHead className="w-[130px] text-right" scope="col">رقم اللوحة</TableHead>
                  <TableHead className="w-[130px] text-right" scope="col">الإيجار الشهري</TableHead>
                  <TableHead className="w-[130px] text-right" scope="col">المدفوع</TableHead>
                  <TableHead className="w-[130px] text-right" scope="col">المتبقي</TableHead>
                  <TableHead className="w-[120px] text-right" scope="col">الحالة</TableHead>
                  <TableHead className="w-[120px] text-right" scope="col">آخر دفعة</TableHead>
                  <TableHead className="w-[160px] text-right" scope="col">التواصل</TableHead>
                  <TableHead className="w-[140px] text-center" scope="col">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(item => (
                  <TableRow key={item.contract_id} className="hover:bg-[#f7f8f4]">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-[#2c4136]">{item.customer_name}</span>
                        {item.days_overdue > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-[#b3694c]">
                            <Clock className="h-3 w-3" />
                            متأخر {item.days_overdue} يوم
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: rentColors.muted }}>
                            <bdi>{item.contract_number}</bdi>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-[#5b6b52]">
                        <Car className="h-4 w-4" style={{ color: rentColors.muted }} />
                        <span className="font-mono"><bdi>{item.vehicle_plate || '-'}</bdi></span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-[#2c4136]">
                      {formatCurrency(item.monthly_rent)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-[#487038]">
                      {formatCurrency(item.amount_paid)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      <span className={item.amount_due > 0 ? 'text-[#b3694c]' : 'text-[#829074]'}>
                        {formatCurrency(item.amount_due)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn(statusDots[item.payment_status], 'h-2 w-2 rounded-full')} />
                        {getStatusBadge(item.payment_status)}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[#5b6b52]">
                      {item.last_payment_date
                        ? new Date(item.last_payment_date).toLocaleDateString('ar-QA')
                        : <span style={{ color: rentColors.muted }}>-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="flex items-center gap-1 text-xs text-[#5b6b52] hover:text-[#2f7966]"
                          >
                            <Phone className="h-3 w-3" />
                            <bdi>{item.phone}</bdi>
                          </a>
                        )}
                        {item.email && (
                          <a
                            href={`mailto:${item.email}`}
                            className="flex items-center gap-1 text-xs text-[#5b6b52] hover:text-[#2f7966]"
                          >
                            <Mail className="h-3 w-3" />
                            {item.email}
                          </a>
                        )}
                        {!item.phone && !item.email && (
                          <span className="text-xs" style={{ color: rentColors.muted }}>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {item.payment_status !== 'paid' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 border-[#edf4e6] bg-[#edf4e6]/50 text-[#487038] hover:bg-[#edf4e6] hover:text-[#256450]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(item);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            تسجيل دفعة
                          </Button>
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-[#487038]" aria-label="مدفوع" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={CalendarDays}
              type={searchTerm || filterStatus !== 'all' ? 'no-filter-results' : 'no-data'}
              title="لا توجد بيانات"
              description={
                searchTerm || filterStatus !== 'all'
                  ? 'لا توجد نتائج مطابقة للبحث أو الفلتر الحالي.'
                  : 'لا توجد عقود إيجار لهذا الشهر.'
              }
              actionLabel={searchTerm || filterStatus !== 'all' ? 'مسح الفلاتر' : undefined}
              onAction={
                searchTerm || filterStatus !== 'all'
                  ? () => { setSearchTerm(''); setFilterStatus('all'); }
                  : undefined
              }
            />
          </div>
        )}
      </motion.section>

      {/* Quick Payment Dialog */}
      {selectedCustomer && (
        <QuickPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          customerId={selectedCustomer.customer_id}
          customerName={selectedCustomer.customer_name}
          customerPhone={selectedCustomer.phone}
          onSuccess={() => refetch()}
        />
      )}
      <FeatureTourDialog tour={activeTour} onOpenChange={(open) => !open && setActiveTour(null)} />

      <style>{`
        .rent-system {
          --rent-accent: ${rentColors.info};
          color: var(--rent-text);
        }

        .rent-filter-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          border: 1px solid var(--rent-border);
          background: var(--rent-surface);
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .rent-filter-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex: 1;
        }

        .rent-filter-icon,
        .rent-metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 8px;
        }

        .rent-input,
        .rent-system input,
        .rent-system [role="combobox"] {
          min-height: 42px;
          border-radius: 8px !important;
          border-color: var(--rent-border) !important;
          background: var(--rent-inner) !important;
          color: var(--rent-text) !important;
          box-shadow: none !important;
        }

        .rent-metric {
          min-height: 132px;
          border: 1px solid var(--rent-border);
          background: var(--rent-inner);
          border-radius: 8px;
          padding: 16px;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .rent-metric:not(:disabled):hover {
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.09);
        }

        .rent-metric:disabled {
          cursor: default;
        }

        .rent-system table thead tr {
          background: var(--rent-inner) !important;
        }

        .rent-system table th {
          color: var(--rent-muted) !important;
          font-size: 12px;
          font-weight: 900;
        }

        .rent-system table td {
          color: var(--rent-text);
          border-color: var(--rent-border) !important;
        }

        .rent-system table tbody tr:hover {
          background: color-mix(in srgb, var(--rent-info) 5%, white) !important;
        }

        .rent-system *:focus-visible {
          outline-color: var(--rent-focus) !important;
          --tw-ring-color: var(--rent-focus) !important;
        }

        @media (max-width: 1000px) {
          .rent-filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .rent-filter-controls {
            justify-content: stretch;
          }
        }
      `}</style>
    </div>
  );
};