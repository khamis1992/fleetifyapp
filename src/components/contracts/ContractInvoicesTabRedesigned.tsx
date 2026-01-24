/**
 * مكون تبويب الفواتير - تصميم محسّن V2
 * Professional SaaS design with improved visual hierarchy
 * Better invoice cards, metrics overview, and modern layout
 *
 * @component ContractInvoicesTabRedesigned
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  FileText,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Printer,
  MoreVertical,
  Filter,
  Search,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Invoice } from '@/types/finance.types';

// ===== Animation Variants =====
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// ===== Types =====
interface CustomerInfo {
  name: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  customerType?: string;
}

interface TrafficViolation {
  id: string;
  violation_number: string;
  violation_date: string;
  violation_type: string;
  fine_amount: number;
  status: string;
  location?: string | null;
}

interface ContractInvoicesTabRedesignedProps {
  invoices: Invoice[];
  formatCurrency: (amount: number) => string;
  onPayInvoice: (invoice: Invoice) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onCreateInvoice: () => void;
  onCancelInvoice: (invoice: Invoice) => void;
  isCancellingInvoice?: boolean;
  contractNumber?: string;
  customerInfo?: CustomerInfo;
  trafficViolations?: TrafficViolation[];
}

// ===== Helper Functions =====
const getInvoiceStatusInfo = (invoice: Invoice) => {
  const status = invoice.payment_status || invoice.status;

  if (status === 'paid' || status === 'completed') {
    return {
      label: 'مسدد',
      variant: 'default' as const,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-500',
      icon: CheckCircle,
    };
  }

  if (status === 'partial' || status === 'partially_paid') {
    return {
      label: 'جزئي',
      variant: 'secondary' as const,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-500',
      icon: Clock,
    };
  }

  if (status === 'overdue') {
    return {
      label: 'متأخر',
      variant: 'destructive' as const,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      iconBg: 'bg-red-500',
      icon: AlertTriangle,
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'ملغي',
      variant: 'outline' as const,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-500',
      borderColor: 'border-slate-200',
      iconBg: 'bg-slate-400',
      icon: XCircle,
    };
  }

  // Default pending
  return {
    label: 'مستحق',
    variant: 'secondary' as const,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-500',
    icon: Clock,
  };
};

const getInvoiceTypeLabel = (type: string) => {
  switch (type) {
    case 'rental': return 'إيجار';
    case 'service': return 'خدمة';
    case 'penalty': return 'غرامة';
    case 'deposit': return 'تأمين';
    default: return type || 'عام';
  }
};

// ===== Metrics Cards Component =====
const InvoiceMetrics = ({
  invoices,
  formatCurrency,
}: {
  invoices: Invoice[];
  formatCurrency: (amount: number) => string;
}) => {
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalPending = invoices.reduce((sum, inv) => {
      if (inv.payment_status === 'paid' || inv.payment_status === 'cancelled') return sum;
      return sum + (inv.balance_due || inv.total_amount || 0);
    }, 0);

    // Fix overdue calculation: Include ALL due payments where balance > 0 and due date has passed
    const today = new Date();
    const totalOverdue = invoices.reduce((sum, inv) => {
      // Skip if paid or cancelled
      if (inv.payment_status === 'paid' || inv.payment_status === 'cancelled') return sum;

      // Check if there's a balance due
      const balanceDue = inv.balance_due ?? (inv.total_amount || 0) - (inv.paid_amount || 0);
      if (balanceDue <= 0) return sum;

      // Check if due date has passed
      if (inv.due_date && isAfter(today, new Date(inv.due_date))) {
        return sum + balanceDue;
      }

      // Also include invoices explicitly marked as overdue
      if (inv.payment_status === 'overdue') {
        return sum + balanceDue;
      }

      return sum;
    }, 0);

    const paidCount = invoices.filter(inv => inv.payment_status === 'paid').length;
    const pendingCount = invoices.filter(inv =>
      inv.payment_status !== 'paid' && inv.payment_status !== 'cancelled'
    ).length;

    // Fix overdue count: Include all invoices with balance > 0 and past due date
    const overdueCount = invoices.filter(inv => {
      if (inv.payment_status === 'paid' || inv.payment_status === 'cancelled') return false;

      const balanceDue = inv.balance_due ?? (inv.total_amount || 0) - (inv.paid_amount || 0);
      if (balanceDue <= 0) return false;

      if (inv.due_date && isAfter(today, new Date(inv.due_date))) return true;
      if (inv.payment_status === 'overdue') return true;

      return false;
    }).length;

    return {
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      paidCount,
      pendingCount,
      overdueCount,
      paymentPercentage: totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0,
    };
  }, [invoices]);

  const metricCards = [
    {
      title: 'إجمالي الفواتير',
      value: formatCurrency(metrics.totalInvoiced),
      subtext: `${invoices.length} فاتورة`,
      icon: Receipt,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200/50',
    },
    {
      title: 'المسدد',
      value: formatCurrency(metrics.totalPaid),
      subtext: `${metrics.paidCount} فاتورة • ${metrics.paymentPercentage}%`,
      icon: Wallet,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200/50',
    },
    {
      title: 'المستحق',
      value: formatCurrency(metrics.totalPending),
      subtext: `${metrics.pendingCount} فاتورة معلقة`,
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200/50',
    },
    {
      title: 'المتأخر',
      value: formatCurrency(metrics.totalOverdue),
      subtext: `${metrics.overdueCount} فاتورة متأخرة`,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200/50',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {metricCards.map((metric, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", metric.color)}>
              <metric.icon className="w-5 h-5 text-white" />
            </div>
            <div className={cn("px-2 py-1 rounded-lg text-xs font-medium", metric.bgColor, metric.textColor)}>
              {metric.subtext.split(' • ')[0]}
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{metric.value}</p>
          <p className="text-xs text-neutral-500">{metric.title}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ===== Invoice Card Component =====
const InvoiceCard = ({
  invoice,
  formatCurrency,
  onPay,
  onPreview,
  onCancel,
  isCancelling,
}: {
  invoice: Invoice;
  formatCurrency: (amount: number) => string;
  onPay: () => void;
  onPreview: () => void;
  onCancel: () => void;
  isCancelling?: boolean;
}) => {
  const statusInfo = getInvoiceStatusInfo(invoice);
  const StatusIcon = statusInfo.icon;

  const isOverdue = invoice.due_date && isAfter(new Date(), new Date(invoice.due_date)) && invoice.payment_status !== 'paid';
  const daysUntilDue = invoice.due_date ? differenceInDays(new Date(invoice.due_date), new Date()) : null;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className={cn(
        "bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200",
        statusInfo.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", statusInfo.iconBg)}>
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-neutral-900 text-lg">{invoice.invoice_number}</h3>
              <Badge className={cn("text-xs", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500">{getInvoiceTypeLabel(invoice.invoice_type)}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onPreview} className="gap-2">
              <Eye className="w-4 h-4" />
              <span>معاينة</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Download className="w-4 h-4" />
              <span>تحميل PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </DropdownMenuItem>
            {(invoice.payment_status !== 'paid' && invoice.status !== 'cancelled') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCancel} className="gap-2 text-red-600 focus:text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>إلغاء الفاتورة</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Amount */}
        <div className={cn("p-3 rounded-xl", statusInfo.bgColor)}>
          <p className="text-xs text-neutral-500 mb-1">المبلغ الإجمالي</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(invoice.total_amount || 0)}</p>
        </div>

        {/* Balance Due */}
        {(invoice.balance_due ?? 0) > 0 ? (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-xs text-neutral-500 mb-1">المبلغ المتبقي</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(invoice.balance_due || 0)}</p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-xs text-neutral-500 mb-1">المدفوع</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(invoice.paid_amount || 0)}</p>
          </div>
        )}
      </div>

      {/* Date & Status Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-neutral-600">
            <Calendar className="w-4 h-4" />
            <span>تاريخ الفاتورة</span>
          </div>
          <span className="font-medium text-neutral-900" dir="ltr">
            {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: ar }) : '-'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-neutral-600">
            <Clock className="w-4 h-4" />
            <span>تاريخ الاستحقاق</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              isOverdue ? "text-red-600" : "text-neutral-900"
            )} dir="ltr">
              {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: ar }) : '-'}
            </span>
            {daysUntilDue !== null && daysUntilDue < 7 && invoice.payment_status !== 'paid' && (
              <Badge variant="outline" className={cn(
                "text-xs",
                isOverdue ? "border-red-200 text-red-600" : "border-amber-200 text-amber-600"
              )}>
                {isOverdue ? `متأخر ${Math.abs(daysUntilDue)} يوم` : `${daysUntilDue} يوم متبقي`}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="flex-1 gap-2 rounded-xl"
        >
          <Eye className="w-4 h-4" />
          <span>معاينة</span>
        </Button>
        {invoice.payment_status !== 'paid' && invoice.status !== 'cancelled' && (
          <Button
            size="sm"
            onClick={onPay}
            className="flex-1 gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg rounded-xl"
          >
            <CreditCard className="w-4 h-4" />
            <span>دفع</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// ===== Invoice Table Row Component =====
const InvoiceTableRow = ({
  invoice,
  formatCurrency,
  onPay,
  onPreview,
  onCancel,
  isCancelling,
}: {
  invoice: Invoice;
  formatCurrency: (amount: number) => string;
  onPay: () => void;
  onPreview: () => void;
  onCancel: () => void;
  isCancelling?: boolean;
}) => {
  const statusInfo = getInvoiceStatusInfo(invoice);
  const StatusIcon = statusInfo.icon;

  const isOverdue = invoice.due_date && isAfter(new Date(), new Date(invoice.due_date)) && invoice.payment_status !== 'paid';

  return (
    <tr className="hover:bg-neutral-50 transition-colors border-b border-neutral-100">
      {/* Invoice Number */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusInfo.iconBg)}>
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{invoice.invoice_number}</p>
            <p className="text-xs text-neutral-500">{getInvoiceTypeLabel(invoice.invoice_type)}</p>
          </div>
        </div>
      </td>

      {/* Date */}
      <td className="py-4 px-4">
        <div className="space-y-1">
          <p className="text-sm text-neutral-900" dir="ltr">
            {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'dd/MM/yyyy') : '-'}
          </p>
          {invoice.due_date && (
            <p className={cn("text-xs", isOverdue ? "text-red-600" : "text-neutral-500")} dir="ltr">
              الاستحقاق: {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
            </p>
          )}
        </div>
      </td>

      {/* Amount */}
      <td className="py-4 px-4">
        <p className="font-semibold text-neutral-900">{formatCurrency(invoice.total_amount || 0)}</p>
        {invoice.tax_amount && invoice.tax_amount > 0 && (
          <p className="text-xs text-neutral-500">ضريبة: {formatCurrency(invoice.tax_amount)}</p>
        )}
      </td>

      {/* Balance Due */}
      <td className="py-4 px-4">
        {(invoice.balance_due ?? 0) > 0 ? (
          <div>
            <p className="font-semibold text-red-600">{formatCurrency(invoice.balance_due || 0)}</p>
            <p className="text-xs text-neutral-500">متبقي</p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-green-600">{formatCurrency(invoice.paid_amount || 0)}</p>
            <p className="text-xs text-neutral-500">مدفوع</p>
          </div>
        )}
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <Badge className={cn("gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </Badge>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            className="h-8 px-3 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {invoice.payment_status !== 'paid' && invoice.status !== 'cancelled' && (
            <>
              <Button
                size="sm"
                onClick={onPay}
                className="h-8 px-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-md rounded-lg"
              >
                <CreditCard className="w-4 h-4 ml-1" />
                دفع
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={isCancelling}
                className="h-8 w-8 p-0 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// ===== Filter Bar Component =====
const InvoiceFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
}) => (
  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white rounded-xl p-4 border border-neutral-200">
    <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="بحث برقم الفاتورة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 rounded-xl border-neutral-200"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 w-full sm:w-auto">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="paid">مسدد</SelectItem>
          <SelectItem value="pending">مستحق</SelectItem>
          <SelectItem value="partial">جزئي</SelectItem>
          <SelectItem value="overdue">متأخر</SelectItem>
          <SelectItem value="cancelled">ملغي</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[160px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الترتيب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-desc">الأحدث أولاً</SelectItem>
          <SelectItem value="date-asc">الأقدم أولاً</SelectItem>
          <SelectItem value="amount-desc">الأعلى سعراً</SelectItem>
          <SelectItem value="amount-asc">الأقل سعراً</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

// ===== Empty State Component =====
const InvoicesEmptyState = ({ onCreateInvoice }: { onCreateInvoice: () => void }) => (
  <div className="text-center py-16">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-6"
    >
      <Receipt className="w-12 h-12 text-teal-500" />
    </motion.div>
    <h3 className="text-xl font-bold text-neutral-900 mb-2">لا توجد فواتير</h3>
    <p className="text-neutral-500 mb-6 max-w-md mx-auto">
      لم يتم إنشاء أي فواتير لهذا العقد بعد. ابدأ بإنشاء فاتورة جديدة لمتابعة المدفوعات.
    </p>
    <Button
      onClick={onCreateInvoice}
      className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl"
    >
      <Receipt className="w-4 h-4" />
      إنشاء أول فاتورة
    </Button>
  </div>
);

// ===== Main Component =====
export const ContractInvoicesTabRedesigned = ({
  invoices,
  formatCurrency,
  onPayInvoice,
  onPreviewInvoice,
  onCreateInvoice,
  onCancelInvoice,
  isCancellingInvoice,
  contractNumber,
  customerInfo,
  trafficViolations = [],
}: ContractInvoicesTabRedesignedProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Filter and sort invoices
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => {
        const status = inv.payment_status || inv.status;
        if (statusFilter === 'partial') {
          return status === 'partial' || status === 'partially_paid';
        }
        return status === statusFilter;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
        case 'date-asc':
          return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime();
        case 'amount-desc':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'amount-asc':
          return (a.total_amount || 0) - (b.total_amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [invoices, searchQuery, statusFilter, sortOption]);

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <InvoiceMetrics invoices={invoices} formatCurrency={formatCurrency} />

      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">الفواتير</h2>
          <p className="text-neutral-500 text-sm">
            {contractNumber ? `العقد #${contractNumber} • ` : ''}
            {invoices.length} فاتورة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Filter due invoices (not paid and not cancelled)
              const dueInvoices = invoices.filter(inv => 
                inv.payment_status !== 'paid' && inv.status !== 'cancelled'
              );
              if (dueInvoices.length === 0) {
                alert('لا توجد فواتير مستحقة للطباعة');
                return;
              }
              
              const statementNumber = `STM-${Date.now().toString().slice(-8)}`;
              const today = new Date();
              const currentDateAr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
              
              const COMPANY_INFO = {
                name_ar: 'شركة العراف لتأجير السيارات',
                name_en: 'AL-ARAF CAR RENTAL L.L.C',
                logo: '/receipts/logo.png',
                address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
                phone: '31411919',
                email: 'info@alaraf.qa',
                cr: '146832',
              };
              
              const totalDue = dueInvoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
              const totalAmount = dueInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
              const totalPaid = dueInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
              
              // Filter unpaid violations
              const unpaidViolations = trafficViolations.filter(v => v.status !== 'paid');
              const totalViolationsAmount = unpaidViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0);
              const grandTotal = totalDue + totalViolationsAmount;
              
              const printContent = `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                  <meta charset="UTF-8">
                  <title>كشف الفواتير المستحقة - ${contractNumber || ''}</title>
                  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                  <style>
                    @page { 
                      size: A4; 
                      margin: 15mm 20mm 20mm 20mm; 
                    }
                    
                    @media print {
                      * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                      }
                      body { margin: 0; padding: 0; }
                      .statement-container {
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 15px 25px !important;
                        border: none !important;
                      }
                      /* منع انقسام العناصر بين الصفحات */
                      .info-box, .grand-total, .payment-notice, .signature-section {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                      }
                      .section-title {
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                      }
                      table {
                        page-break-inside: auto !important;
                      }
                      tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                      }
                      thead {
                        display: table-header-group;
                      }
                      tfoot {
                        display: table-footer-group;
                      }
                      /* إبقاء قسم السداد والتوقيعات معاً */
                      .payment-notice, .signature-section, .footer {
                        page-break-before: avoid !important;
                      }
                    }
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body { 
                      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
                      font-size: 14px;
                      line-height: 1.8;
                      color: #000;
                      background: #fff;
                      margin: 0;
                      padding: 20px;
                      direction: rtl;
                    }
                    
                    .statement-container {
                      max-width: 210mm;
                      margin: 0 auto;
                      padding: 20px 30px;
                      background: #fff;
                    }
                    
                    .header {
                      display: flex;
                      justify-content: space-between;
                      align-items: flex-start;
                      border-bottom: 3px double #1e3a5f;
                      padding-bottom: 15px;
                      margin-bottom: 15px;
                    }
                    
                    .company-ar {
                      flex: 1;
                      text-align: right;
                    }
                    
                    .company-ar h1 {
                      color: #1e3a5f;
                      margin: 0;
                      font-size: 20px;
                      font-weight: bold;
                    }
                    
                    .company-ar p {
                      color: #000;
                      margin: 2px 0;
                      font-size: 11px;
                    }
                    
                    .logo-container {
                      flex: 0 0 130px;
                      text-align: center;
                      padding: 0 15px;
                    }
                    
                    .logo-container img {
                      max-height: 70px;
                      max-width: 120px;
                    }
                    
                    .company-en {
                      flex: 1;
                      text-align: left;
                    }
                    
                    .company-en h1 {
                      color: #1e3a5f;
                      margin: 0;
                      font-size: 14px;
                      font-weight: bold;
                    }
                    
                    .company-en p {
                      color: #000;
                      margin: 2px 0;
                      font-size: 10px;
                    }
                    
                    .address-bar {
                      text-align: center;
                      color: #000;
                      font-size: 10px;
                      margin-bottom: 15px;
                      padding-bottom: 10px;
                      border-bottom: 1px solid #ccc;
                    }
                    
                    .ref-date {
                      display: flex;
                      justify-content: space-between;
                      margin-bottom: 20px;
                      font-size: 13px;
                      color: #000;
                    }
                    
                    .subject-box {
                      background: #1e3a5f;
                      color: #fff;
                      padding: 15px 20px;
                      margin-bottom: 20px;
                      font-size: 18px;
                      text-align: center;
                      font-weight: bold;
                      border: 2px solid #1e3a5f;
                    }
                    
                    .info-box {
                      background: #f5f5f5;
                      padding: 15px;
                      margin-bottom: 20px;
                      border-radius: 5px;
                      border-right: 4px solid #1e3a5f;
                    }
                    
                    .info-row {
                      display: flex;
                      justify-content: flex-start;
                      gap: 15px;
                      padding: 5px 0;
                      border-bottom: 1px dotted #ddd;
                    }
                    
                    .info-row:last-child {
                      border-bottom: none;
                    }
                    
                    .info-label {
                      font-weight: bold;
                      color: #1e3a5f;
                      min-width: 100px;
                    }
                    
                    .section-title {
                      font-size: 16px;
                      font-weight: bold;
                      color: #1e3a5f;
                      border-bottom: 2px solid #1e3a5f;
                      padding-bottom: 6px;
                      margin: 15px 0 10px 0;
                    }
                    
                    table { 
                      width: 100%; 
                      border-collapse: collapse;
                      margin: 15px 0;
                      border: 1px solid #1e3a5f;
                    }
                    
                    th { 
                      background: #1e3a5f;
                      color: white; 
                      padding: 10px 8px; 
                      text-align: right; 
                      font-size: 12px;
                      font-weight: bold;
                      border: 1px solid #1e3a5f;
                    }
                    
                    td { 
                      padding: 8px;
                      border: 1px solid #ccc;
                      font-size: 12px;
                    }
                    
                    tr:nth-child(even) { 
                      background: #f9f9f9; 
                    }
                    
                    .amount-cell { 
                      font-weight: bold; 
                      color: #c53030;
                    }
                    
                    .status-overdue { 
                      background: #fed7d7; 
                      color: #c53030; 
                      padding: 3px 8px; 
                      border-radius: 3px; 
                      font-size: 10px;
                      font-weight: bold;
                    }
                    
                    .status-pending { 
                      background: #feebc8; 
                      color: #c05621; 
                      padding: 3px 8px; 
                      border-radius: 3px; 
                      font-size: 10px;
                      font-weight: bold;
                    }
                    
                    .grand-total {
                      border: 3px double #1e3a5f;
                      padding: 15px;
                      margin: 15px 0;
                      text-align: center;
                    }
                    
                    .grand-total .label {
                      font-size: 14px;
                      margin-bottom: 8px;
                      color: #1e3a5f;
                      font-weight: bold;
                    }
                    
                    .grand-total .amount {
                      font-size: 26px;
                      font-weight: bold;
                      color: #1e3a5f;
                    }
                    
                    .payment-notice {
                      border: 1px solid #1e3a5f;
                      padding: 12px 15px;
                      margin: 15px 0;
                    }
                    
                    .payment-notice h4 {
                      color: #1e3a5f;
                      margin-bottom: 10px;
                      font-size: 14px;
                      border-bottom: 1px solid #ddd;
                      padding-bottom: 8px;
                    }
                    
                    .payment-notice p {
                      color: #333;
                      font-size: 13px;
                      margin: 5px 0;
                      padding-right: 15px;
                    }
                    
                    .signature-section {
                      margin-top: 25px;
                      padding-top: 15px;
                      border-top: 2px solid #1e3a5f;
                    }
                    
                    .signatures {
                      display: flex;
                      justify-content: space-between;
                      margin-top: 30px;
                    }
                    
                    .signature-box {
                      text-align: center;
                      width: 180px;
                    }
                    
                    .sign-line {
                      border-top: 1px solid #000;
                      margin-top: 50px;
                      padding-top: 5px;
                      font-size: 12px;
                      color: #666;
                    }
                    
                    .stamp-area {
                      text-align: center;
                    }
                    
                    .stamp-placeholder {
                      display: inline-block;
                      width: 80px;
                      height: 80px;
                      border: 2px dashed #ccc;
                      border-radius: 50%;
                      line-height: 80px;
                      color: #999;
                      font-size: 11px;
                    }
                    
                    .footer {
                      text-align: center;
                      color: #000;
                      font-size: 10px;
                      margin-top: 30px;
                      padding-top: 15px;
                      border-top: 1px solid #ccc;
                    }
                  </style>
                </head>
                <body>
                  <div class="statement-container">
                    
                    <!-- رأسية الشركة -->
                    <div class="header">
                      <div class="company-ar">
                        <h1>${COMPANY_INFO.name_ar}</h1>
                        <p>ذ.م.م</p>
                        <p>س.ت: ${COMPANY_INFO.cr}</p>
                      </div>
                      
                      <div class="logo-container">
                        <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" />
                      </div>
                      
                      <div class="company-en" dir="ltr">
                        <h1>${COMPANY_INFO.name_en}</h1>
                        <p>C.R: ${COMPANY_INFO.cr}</p>
                      </div>
                    </div>
                    
                    <!-- العنوان -->
                    <div class="address-bar">
                      ${COMPANY_INFO.address}<br/>
                      هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
                    </div>
                    
                    <!-- التاريخ والرقم المرجعي -->
                    <div class="ref-date">
                      <div><strong>رقم الكشف:</strong> ${statementNumber}</div>
                      <div><strong>رقم العقد:</strong> ${contractNumber || '-'}</div>
                      <div><strong>التاريخ:</strong> ${currentDateAr}</div>
                    </div>

                    <!-- الموضوع -->
                    <div class="subject-box">
                      كشف الفواتير المستحقة
                    </div>
                    
                    <!-- بيانات العميل -->
                    <div class="info-box">
                      <div class="info-row">
                        <span class="info-label">اسم العميل:</span>
                        <span>${customerInfo?.name || 'غير محدد'}</span>
                      </div>
                      ${customerInfo?.nationalId ? `
                      <div class="info-row">
                        <span class="info-label">رقم الهوية:</span>
                        <span>${customerInfo.nationalId}</span>
                      </div>
                      ` : ''}
                      ${customerInfo?.phone ? `
                      <div class="info-row">
                        <span class="info-label">رقم الهاتف:</span>
                        <span dir="ltr">${customerInfo.phone}</span>
                      </div>
                      ` : ''}
                    </div>
                    
                    <!-- الفواتير المستحقة -->
                    <div class="section-title">الفواتير المستحقة (${dueInvoices.length})</div>
                    <table>
                      <thead>
                        <tr>
                          <th style="width: 35px;">م</th>
                          <th>رقم الفاتورة</th>
                          <th>تاريخ الفاتورة</th>
                          <th>تاريخ الاستحقاق</th>
                          <th>المبلغ الإجمالي</th>
                          <th>المدفوع</th>
                          <th>المتبقي</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${dueInvoices.map((inv, idx) => {
                          const isOverdue = inv.due_date && new Date() > new Date(inv.due_date);
                          return `
                            <tr>
                              <td style="text-align: center;">${idx + 1}</td>
                              <td>${inv.invoice_number}</td>
                              <td>${inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB') : '-'}</td>
                              <td>${inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : '-'}</td>
                              <td>${formatCurrency(inv.total_amount || 0)}</td>
                              <td>${formatCurrency(inv.paid_amount || 0)}</td>
                              <td class="amount-cell">${formatCurrency(inv.balance_due || 0)}</td>
                              <td style="text-align: center;">
                                <span class="${isOverdue ? 'status-overdue' : 'status-pending'}">
                                  ${isOverdue ? 'متأخر' : 'مستحق'}
                                </span>
                              </td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                      <tfoot>
                        <tr style="background: #1e3a5f; color: white;">
                          <td colspan="4" style="text-align: left; font-weight: bold; border-color: #1e3a5f;">الإجمالي</td>
                          <td style="font-weight: bold; border-color: #1e3a5f;">${formatCurrency(totalAmount)}</td>
                          <td style="font-weight: bold; border-color: #1e3a5f;">${formatCurrency(totalPaid)}</td>
                          <td style="font-weight: bold; border-color: #1e3a5f;">${formatCurrency(totalDue)}</td>
                          <td style="border-color: #1e3a5f;">${dueInvoices.length} فاتورة</td>
                        </tr>
                      </tfoot>
                    </table>

                    ${unpaidViolations.length > 0 ? `
                    <!-- المخالفات المرورية -->
                    <div class="section-title">المخالفات المرورية غير المسددة (${unpaidViolations.length})</div>
                    <table>
                      <thead>
                        <tr>
                          <th style="width: 35px;">م</th>
                          <th>رقم المخالفة</th>
                          <th>تاريخ المخالفة</th>
                          <th>نوع المخالفة</th>
                          <th>الموقع</th>
                          <th>المبلغ</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${unpaidViolations.map((violation, idx) => `
                          <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td>${violation.violation_number || '-'}</td>
                            <td>${violation.violation_date ? new Date(violation.violation_date).toLocaleDateString('en-GB') : '-'}</td>
                            <td>${violation.violation_type || '-'}</td>
                            <td>${violation.location || '-'}</td>
                            <td class="amount-cell">${formatCurrency(violation.fine_amount || 0)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                      <tfoot>
                        <tr style="background: #1e3a5f; color: white;">
                          <td colspan="5" style="text-align: left; font-weight: bold; border-color: #1e3a5f;">إجمالي المخالفات</td>
                          <td style="font-weight: bold; border-color: #1e3a5f;">${formatCurrency(totalViolationsAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    ` : ''}

                    <!-- الإجمالي الكلي -->
                    <div class="grand-total">
                      <div class="label">إجمالي المبلغ المستحق</div>
                      <div class="amount">${formatCurrency(grandTotal)}</div>
                      ${unpaidViolations.length > 0 ? `
                      <div style="font-size: 12px; color: #666; margin-top: 10px;">
                        (فواتير: ${formatCurrency(totalDue)} + مخالفات: ${formatCurrency(totalViolationsAmount)})
                      </div>
                      ` : ''}
                    </div>

                    <!-- ملاحظة السداد -->
                    <div class="payment-notice">
                      <h4>طرق السداد المتاحة:</h4>
                      <p>1. الدفع نقداً في مقر الشركة</p>
                      <p>2. التحويل البنكي</p>
                      <p>3. الدفع عبر البطاقة الائتمانية</p>
                      <p style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
                        <strong>للاستفسار والسداد يرجى التواصل على الرقم: ${COMPANY_INFO.phone}</strong>
                      </p>
                    </div>

                    <!-- التوقيعات -->
                    <div class="signature-section">
                      <div class="signatures">
                        <div class="signature-box">
                          <div class="sign-line">توقيع العميل</div>
                        </div>
                        
                        <div class="stamp-area">
                          <div class="stamp-placeholder">الختم</div>
                        </div>
                        
                        <div class="signature-box">
                          <p style="font-weight: bold; color: #1e3a5f;">${COMPANY_INFO.name_ar}</p>
                          <div class="sign-line">التوقيع</div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- الذيل -->
                    <div class="footer">
                      ${COMPANY_INFO.address}<br/>
                      هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
                    </div>

                  </div>
                  
                  <script>
                    window.onload = function() { window.print(); }
                  </script>
                </body>
                </html>
              `;
              
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(printContent);
                printWindow.document.close();
              }
            }}
            className="gap-2 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            طباعة المستحقة
          </Button>
          <Button
            onClick={onCreateInvoice}
            className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl"
          >
            <Receipt className="w-4 h-4" />
            إنشاء فاتورة
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {invoices.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <InvoicesEmptyState onCreateInvoice={onCreateInvoice} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <InvoiceFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          {/* View Mode Toggle & Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              عرض {filteredAndSortedInvoices.length} من {invoices.length} فاتورة
            </p>
            <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'grid' ? "bg-white shadow-sm" : ""
                )}
              >
                <Receipt className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'table' ? "bg-white shadow-sm" : ""
                )}
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Invoices Display */}
          {filteredAndSortedInvoices.length === 0 ? (
            <Card className="border-neutral-200">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">لا توجد نتائج</h3>
                <p className="text-neutral-500">جرب تغيير filters البحث</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredAndSortedInvoices.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  formatCurrency={formatCurrency}
                  onPay={() => onPayInvoice(invoice)}
                  onPreview={() => onPreviewInvoice(invoice)}
                  onCancel={() => onCancelInvoice(invoice)}
                  isCancelling={isCancellingInvoice}
                />
              ))}
            </motion.div>
          ) : (
            <Card className="border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">رقم الفاتورة</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">التاريخ</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">المبلغ</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الرصيد</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الحالة</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedInvoices.map((invoice) => (
                      <InvoiceTableRow
                        key={invoice.id}
                        invoice={invoice}
                        formatCurrency={formatCurrency}
                        onPay={() => onPayInvoice(invoice)}
                        onPreview={() => onPreviewInvoice(invoice)}
                        onCancel={() => onCancelInvoice(invoice)}
                        isCancelling={isCancellingInvoice}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// Import useState
import { useState } from 'react';
