/**
 * متابعة الإيجارات الشهرية - تصميم جديد
 * متوافق مع الداشبورد الرئيسي
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Phone,
  Mail,
  Car,
  Search,
  Download,
  RefreshCw,
  CalendarDays,
  Wallet,
  DollarSign,
  ArrowLeft,
  Filter,
  FileSpreadsheet,
  Clock,
  ChevronDown,
  BarChart3,
  CreditCard,
} from 'lucide-react';
import { useMonthlyRentTracking, useRentPaymentSummary, MonthlyRentStatus, DateFilterType } from '@/hooks/useMonthlyRentTracking';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { QuickPaymentDialog } from './QuickPaymentDialog';

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  delay?: number;
  onClick?: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor = 'text-white',
  trend = 'neutral',
  change,
  delay = 0,
  onClick,
  isActive = false,
}) => (
  <motion.div
    className={cn(
      "bg-white rounded-2xl p-5 shadow-sm transition-all border",
      onClick ? "cursor-pointer hover:shadow-md" : "",
      isActive ? "border-rose-500 ring-2 ring-rose-200" : "border-slate-100"
    )}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    onClick={onClick}
    whileHover={onClick ? { scale: 1.02 } : undefined}
    whileTap={onClick ? { scale: 0.98 } : undefined}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className={cn("w-6 h-6", iconColor)} />
      </div>
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
          trend === 'up' ? 'bg-green-100 text-green-600' :
          trend === 'down' ? 'bg-red-100 text-red-600' :
          'bg-slate-100 text-slate-600'
        )}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

export const MonthlyRentTracker: React.FC = () => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  
  // Date filter state: 'payment_date' = تاريخ الدفع الفعلي, 'created_at' = تاريخ التسجيل (المدخول الفعلي)
  const [dateFilter, setDateFilter] = useState<DateFilterType>('created_at');
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<MonthlyRentStatus | null>(null);

  const { data: rentStatuses, isLoading, refetch } = useMonthlyRentTracking(selectedYear, selectedMonth, dateFilter);
  
  // Handle opening payment dialog
  const handleOpenPaymentDialog = (item: MonthlyRentStatus) => {
    setSelectedCustomer(item);
    setPaymentDialogOpen(true);
  };
  
  // Handle payment success
  const handlePaymentSuccess = () => {
    refetch();
  };
  const summary = useRentPaymentSummary(selectedYear, selectedMonth, dateFilter);
  const { formatCurrency } = useCurrencyFormatter();

  // Filter data based on search and status
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

  const getStatusBadge = (status: 'paid' | 'unpaid' | 'partial') => {
    const configs = {
      paid: { 
        label: 'مدفوع', 
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle2 
      },
      unpaid: { 
        label: 'غير مدفوع', 
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: XCircle 
      },
      partial: { 
        label: 'دفع جزئي', 
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: AlertCircle 
      },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("flex items-center gap-1 border", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

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

  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) return;

    const headers = ['كود العميل', 'اسم العميل', 'رقم اللوحة', 'الإيجار الشهري', 'المدفوع', 'المتبقي', 'الحالة', 'تاريخ آخر دفعة'];
    const rows = filteredData.map(item => [
      item.customer_code,
      item.customer_name,
      item.vehicle_plate || '-',
      item.monthly_rent.toFixed(3),
      item.amount_paid.toFixed(3),
      item.amount_due.toFixed(3),
      item.payment_status === 'paid' ? 'مدفوع' : item.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع',
      item.last_payment_date ? new Date(item.last_payment_date).toLocaleDateString('en-US') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rent-tracking-${selectedYear}-${selectedMonth}.csv`;
    link.click();
  };

  const selectedMonthName = months.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="min-h-screen bg-[#f0efed]" dir="rtl">
      {/* Date Selection & Filters */}
      <motion.div
        className="bg-white rounded-2xl p-4 mb-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Month & Year */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-500" />
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl border-slate-200">
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
              <SelectTrigger className="w-[120px] h-11 rounded-xl border-slate-200">
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
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block" />

          {/* Search */}
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="ابحث باسم العميل، الكود، أو رقم اللوحة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 h-11 rounded-xl border-slate-200 bg-slate-50"
            />
          </div>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="w-[160px] h-11 rounded-xl border-slate-200">
              <Filter className="w-4 h-4 ml-2 text-neutral-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="paid">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  مدفوع
                </span>
              </SelectItem>
              <SelectItem value="unpaid">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  غير مدفوع
                </span>
              </SelectItem>
              <SelectItem value="partial">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  دفع جزئي
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <div className="flex gap-2 mr-auto">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="h-11 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="h-11 rounded-xl border-rose-200 text-coral-600 hover:bg-rose-50"
            >
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي العملاء"
          value={summary.totalCustomers}
          subtitle="عميل نشط"
          icon={Users}
          iconBg="bg-gradient-to-br from-rose-500 to-orange-500"
          delay={0.1}
          onClick={() => setFilterStatus('all')}
          isActive={filterStatus === 'all'}
        />
        <StatCard
          title="العملاء الذين دفعوا"
          value={summary.paidCount}
          subtitle={summary.totalCustomers > 0 ? `${Math.round((summary.paidCount / summary.totalCustomers) * 100)}% من الإجمالي` : '0%'}
          icon={CheckCircle2}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-600"
          trend="up"
          change={`${summary.paidCount}`}
          delay={0.2}
          onClick={() => setFilterStatus('paid')}
          isActive={filterStatus === 'paid'}
        />
        <StatCard
          title="العملاء الذين لم يدفعوا"
          value={summary.unpaidCount}
          subtitle={summary.partialCount > 0 ? `+ ${summary.partialCount} دفع جزئي` : undefined}
          icon={XCircle}
          iconBg="bg-gradient-to-br from-red-500 to-rose-600"
          trend="down"
          change={`${summary.unpaidCount}`}
          delay={0.3}
          onClick={() => setFilterStatus('unpaid')}
          isActive={filterStatus === 'unpaid'}
        />
        <StatCard
          title="نسبة التحصيل"
          value={`${summary.collectionRate}%`}
          subtitle="من الإيجار المتوقع"
          icon={BarChart3}
          iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
          trend={summary.collectionRate >= 70 ? 'up' : 'down'}
          change={summary.collectionRate >= 70 ? 'جيد' : 'يحتاج متابعة'}
          delay={0.4}
        />
      </div>

      {/* Data Table */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Table Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900">تفاصيل الدفعات</h3>
            <p className="text-sm text-neutral-500">
              عرض {filteredData?.length || 0} من {rentStatuses?.length || 0} عميل
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filterStatus !== 'all' && (
              <Badge variant="outline" className="bg-rose-50 text-coral-600 border-rose-200">
                {filterStatus === 'paid' ? 'مدفوع' : filterStatus === 'unpaid' ? 'غير مدفوع' : 'دفع جزئي'}
              </Badge>
            )}
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-10 w-10 animate-spin text-rose-500 mb-4" />
            <p className="text-neutral-500">جاري تحميل البيانات...</p>
          </div>
        ) : filteredData && filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-right font-semibold text-neutral-700">اسم العميل</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">رقم اللوحة</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">الإيجار الشهري</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">المدفوع</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">المتبقي</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">الحالة</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">آخر دفعة</TableHead>
                  <TableHead className="text-right font-semibold text-neutral-700">التواصل</TableHead>
                  <TableHead className="text-center font-semibold text-neutral-700">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredData.map((item, index) => (
                    <motion.tr
                      key={item.contract_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50/50 transition-colors",
                        item.payment_status === 'unpaid' && 'bg-red-50/30',
                        item.payment_status === 'partial' && 'bg-amber-50/30',
                        item.payment_status === 'paid' && 'bg-green-50/30'
                      )}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-neutral-900">{item.customer_name}</div>
                          {item.days_overdue > 0 && (
                            <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                              <Clock className="w-3 h-3" />
                              متأخر {item.days_overdue} يوم
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-neutral-600">
                          <Car className="h-4 w-4 text-neutral-400" />
                          <span className="font-mono">{item.vehicle_plate || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-900">
                        {formatCurrency(item.monthly_rent)}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        {formatCurrency(item.amount_paid)}
                      </TableCell>
                      <TableCell className={cn(
                        "font-semibold",
                        item.amount_due > 0 ? 'text-red-600' : 'text-neutral-400'
                      )}>
                        {formatCurrency(item.amount_due)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.payment_status)}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {item.last_payment_date
                          ? new Date(item.last_payment_date).toLocaleDateString('en-US')
                          : <span className="text-neutral-400">-</span>
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {item.phone && (
                            <a
                              href={`tel:${item.phone}`}
                              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-500 transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                              {item.phone}
                            </a>
                          )}
                          {item.email && (
                            <a
                              href={`mailto:${item.email}`}
                              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-rose-500 transition-colors"
                            >
                              <Mail className="h-3 w-3" />
                              {item.email}
                            </a>
                          )}
                          {!item.phone && !item.email && (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          {item.payment_status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentDialog(item);
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">تسجيل دفعة</span>
                            </Button>
                          )}
                          {item.payment_status === 'paid' && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                              مدفوع
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-neutral-600 font-medium">لا توجد بيانات</p>
            <p className="text-sm text-neutral-400 mt-1">لا توجد بيانات للشهر المحدد</p>
          </div>
        )}
      </motion.div>

      {/* Quick Payment Dialog */}
      {selectedCustomer && (
        <QuickPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          customerId={selectedCustomer.customer_id}
          customerName={selectedCustomer.customer_name}
          customerPhone={selectedCustomer.phone}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};
