/**
 * صفحة العملاء المتأخرون عن الدفع - التصميم الجديد
 * متوافق مع ألوان وتصميم الداشبورد الرئيسي
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  FileText, 
  AlertTriangle, 
  Download, 
  Users, 
  RefreshCw,
  DollarSign,
  TrendingUp,
  Eye,
  Phone,
  Mail,
  MoreVertical,
  Printer,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useDelinquentCustomers, type DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { useRefreshDelinquentCustomers } from '@/hooks/useDelinquentCustomers';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import { useGenerateLegalWarning } from '@/hooks/useGenerateLegalWarning';
import LegalWarningDialog from './LegalWarningDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { GeneratedWarning } from '@/hooks/useGenerateLegalWarning';

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'coral' | 'red' | 'orange' | 'green' | 'blue';
  onClick?: () => void;
  isActive?: boolean;
  badge?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, value, subtitle, icon: Icon, color, onClick, isActive, badge 
}) => {
  const colorClasses = {
    coral: {
      bg: 'bg-gradient-to-br from-coral-50 to-coral-100/50',
      icon: 'bg-coral-100 text-coral-600',
      border: 'border-coral-200',
      active: 'ring-2 ring-coral-500 ring-offset-2',
      value: 'text-coral-600',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      icon: 'bg-red-100 text-red-600',
      border: 'border-red-200',
      active: 'ring-2 ring-red-500 ring-offset-2',
      value: 'text-red-600',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
      icon: 'bg-orange-100 text-orange-600',
      border: 'border-orange-200',
      active: 'ring-2 ring-orange-500 ring-offset-2',
      value: 'text-orange-600',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100/50',
      icon: 'bg-green-100 text-green-600',
      border: 'border-green-200',
      active: 'ring-2 ring-green-500 ring-offset-2',
      value: 'text-green-600',
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      icon: 'bg-blue-100 text-blue-600',
      border: 'border-blue-200',
      active: 'ring-2 ring-blue-500 ring-offset-2',
      value: 'text-blue-600',
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-2xl border p-5 transition-all duration-200",
        classes.bg,
        classes.border,
        isActive && classes.active
      )}
    >
      {badge && (
        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
          {badge}
        </Badge>
      )}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className={cn("text-3xl font-bold", classes.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-neutral-500">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", classes.icon)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

// ===== Risk Badge Component =====
const RiskBadge: React.FC<{ level: string; score: number }> = ({ level, score }) => {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', label: 'حرج' },
    HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'عالي' },
    MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'متوسط' },
    LOW: { bg: 'bg-green-100', text: 'text-green-700', label: 'منخفض' },
    MONITOR: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مراقبة' },
  };

  const { bg, text, label } = config[level] || config.MONITOR;

  return (
    <div className="flex items-center gap-2">
      <Badge className={cn(bg, text, 'font-medium')}>
        {label}
      </Badge>
      <span className="text-xs text-neutral-500">{score}%</span>
    </div>
  );
};

// ===== Main Component =====
export const DelinquentCustomersTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [overduePeriodFilter, setOverduePeriodFilter] = useState<string>('all');
  const [violationsFilter, setViolationsFilter] = useState<string>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<DelinquentCustomer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<GeneratedWarning | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<DelinquentCustomer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Hooks
  const { data: stats, isLoading: statsLoading } = useDelinquencyStats();
  const convertToCase = useConvertToLegalCase();
  const generateWarning = useGenerateLegalWarning();
  const refreshDelinquentCustomers = useRefreshDelinquentCustomers();

  // Build filters object
  const filters = useMemo(() => ({
    search: searchTerm || undefined,
    riskLevel: riskLevelFilter !== 'all' ? riskLevelFilter as any : undefined,
    overduePeriod: overduePeriodFilter !== 'all' ? overduePeriodFilter as any : undefined,
    hasViolations: violationsFilter !== 'all' ? violationsFilter === 'yes' : undefined,
  }), [searchTerm, riskLevelFilter, overduePeriodFilter, violationsFilter]);

  const { data: customers, isLoading: customersLoading, error } = useDelinquentCustomers(filters);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    if (!customers) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return customers.slice(start, start + itemsPerPage);
  }, [customers, currentPage]);

  const totalPages = useMemo(() => {
    if (!customers) return 1;
    return Math.ceil(customers.length / itemsPerPage);
  }, [customers]);

  // Handle stat card click for filtering
  const handleStatCardClick = useCallback((filter: string) => {
    if (riskLevelFilter === filter) {
      setRiskLevelFilter('all');
    } else {
      setRiskLevelFilter(filter);
    }
    setCurrentPage(1);
  }, [riskLevelFilter]);

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && customers) {
      const allIds = new Set(customers.map(c => c.customer_id));
      setSelectedIds(allIds);
      setSelectedCustomers(customers);
    } else {
      setSelectedIds(new Set());
      setSelectedCustomers([]);
    }
  }, [customers]);

  // Handle select individual
  const handleSelectCustomer = useCallback((customer: DelinquentCustomer, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(customer.customer_id);
      } else {
        newSet.delete(customer.customer_id);
      }
      return newSet;
    });
    
    setSelectedCustomers(prev => {
      if (checked) {
        return [...prev, customer];
      } else {
        return prev.filter(c => c.customer_id !== customer.customer_id);
      }
    });
  }, []);

  // Handle view details - Navigate to customer page
  const handleViewDetails = useCallback((customer: DelinquentCustomer) => {
    navigate(`/customers/${customer.customer_id}`);
  }, [navigate]);

  // Handle create case
  const handleCreateCase = useCallback(async (customer: DelinquentCustomer) => {
    try {
      await convertToCase.mutateAsync({ delinquentCustomer: customer });
    } catch (error) {
      console.error('Error creating case:', error);
    }
  }, [convertToCase]);

  // Handle send warning
  const handleSendWarning = useCallback(async (customer: DelinquentCustomer) => {
    setCurrentCustomer(customer);
    setWarningDialogOpen(true);
    setCurrentWarning(null);

    try {
      const warning = await generateWarning.mutateAsync({
        delinquentCustomer: customer,
        warningType: 'formal',
        deadlineDays: 7,
        includeBlacklistThreat: customer.risk_score >= 70,
      });
      setCurrentWarning(warning);
    } catch (error) {
      console.error('Error generating warning:', error);
      setWarningDialogOpen(false);
    }
  }, [generateWarning]);

  // Handle bulk actions
  const handleBulkCreateCases = useCallback(async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عملاء');
      return;
    }

    toast.info(`جاري إنشاء ${selectedCustomers.length} قضية قانونية...`);
    
    let successCount = 0;
    for (const customer of selectedCustomers) {
      try {
        await convertToCase.mutateAsync({ delinquentCustomer: customer });
        successCount++;
      } catch (error) {
        console.error(`Failed to create case for ${customer.customer_name}:`, error);
      }
    }
    
    toast.success(`تم إنشاء ${successCount} قضية بنجاح`);
    setSelectedCustomers([]);
    setSelectedIds(new Set());
  }, [selectedCustomers, convertToCase]);

  // Handle export to Excel
  const handleExport = useCallback(() => {
    if (!customers || customers.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    // Create CSV content
    const headers = ['رقم العميل', 'اسم العميل', 'رقم العقد', 'لوحة المركبة', 'الإيجار المتأخر', 'غرامة التأخير', 'المخالفات', 'إجمالي المستحق', 'أيام التأخير', 'مستوى المخاطر', 'الهاتف'];
    const rows = customers.map(c => [
      c.customer_code || '',
      c.customer_name || '',
      c.contract_number || '',
      c.vehicle_plate || '',
      (c.overdue_amount || 0).toString(),
      (c.late_penalty || 0).toString(),
      (c.violations_amount || 0).toString(),
      (c.total_debt || 0).toString(),
      (c.days_overdue || 0).toString(),
      c.risk_level || '',
      c.phone || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Arabic support
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `delinquent_customers_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('تم تصدير البيانات بنجاح');
  }, [customers]);

  // Handle print report
  const handlePrintReport = useCallback(() => {
    if (!customers || customers.length === 0) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة الطباعة');
      return;
    }

    const today = format(new Date(), 'dd/MM/yyyy', { locale: ar });
    const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
    const totalOverdue = customers.reduce((sum, c) => sum + (c.overdue_amount || 0), 0);
    const totalPenalties = customers.reduce((sum, c) => sum + (c.late_penalty || 0), 0);
    const totalViolations = customers.reduce((sum, c) => sum + (c.violations_amount || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العملاء المتأخرين - ${today}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #333; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E55B5B; padding-bottom: 16px; margin-bottom: 20px; }
          .company-info { text-align: right; }
          .company-name { font-size: 22px; font-weight: bold; color: #E55B5B; }
          .report-title { text-align: center; padding: 10px 30px; border: 2px solid #E55B5B; border-radius: 8px; background: #FEF2F2; }
          .title-text { font-size: 18px; font-weight: bold; color: #E55B5B; }
          .logo { width: 100px; height: auto; }
          .summary { display: flex; justify-content: center; gap: 40px; margin: 20px 0; padding: 16px; background: #FEF2F2; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 28px; font-weight: bold; color: #E55B5B; }
          .summary-label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: linear-gradient(135deg, #E55B5B 0%, #DC2626 100%); color: white; padding: 10px 6px; font-weight: bold; text-align: right; }
          td { padding: 8px 6px; border: 1px solid #e5e7eb; text-align: right; }
          tr:nth-child(even) { background: #f9fafb; }
          .amount { font-weight: bold; color: #E55B5B; }
          .risk-critical { background: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .risk-high { background: #FFEDD5; color: #EA580C; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .risk-medium { background: #FEF3C7; color: #D97706; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .risk-low { background: #D1FAE5; color: #059669; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; }
          .footer-item { text-align: center; }
          .footer-line { width: 120px; border-top: 1px solid #999; margin: 30px auto 5px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">شركة العراف لتأجير السيارات</div>
            <div style="font-size: 12px; color: #666;">AL-ARAF CAR RENTAL</div>
          </div>
          <div class="report-title">
            <div class="title-text">تقرير العملاء المتأخرين</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">${today}</div>
          </div>
          <img src="/receipts/logo.png" alt="Logo" class="logo" onerror="this.style.display='none'" />
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-value">${customers.length.toLocaleString('en-US')}</div>
            <div class="summary-label">عدد العملاء</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="summary-label">الإيجارات المتأخرة</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${totalPenalties.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="summary-label">غرامات التأخير</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${totalViolations.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="summary-label">المخالفات المرورية</div>
          </div>
          <div class="summary-item" style="border-right: 2px solid #E55B5B; padding-right: 20px;">
            <div class="summary-value">${totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })} QAR</div>
            <div class="summary-label">الإجمالي المستحق</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اسم العميل</th>
              <th>العقد / المركبة</th>
              <th>الإيجار</th>
              <th>الغرامة</th>
              <th>المخالفات</th>
              <th>الإجمالي</th>
              <th>أيام</th>
              <th>المخاطر</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map((c, i) => `
              <tr>
                <td>${(i + 1).toLocaleString('en-US')}</td>
                <td>
                  <div>${c.customer_name || '-'}</div>
                  <div style="font-size: 10px; color: #666;">${c.phone || ''}</div>
                </td>
                <td>
                  <div>${c.contract_number || '-'}</div>
                  <div style="font-size: 10px; color: #666;">🚗 ${c.vehicle_plate || '-'}</div>
                </td>
                <td class="amount">${(c.overdue_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="color: #EA580C;">${(c.late_penalty || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="color: #DC2626;">${(c.violations_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}${c.violations_count > 0 ? ` (${c.violations_count})` : ''}</td>
                <td class="amount" style="font-size: 13px;">${(c.total_debt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${(c.days_overdue || 0).toLocaleString('en-US')}</td>
                <td><span class="risk-${c.risk_level?.toLowerCase() || 'low'}">${
                  c.risk_level === 'CRITICAL' ? 'حرج' :
                  c.risk_level === 'HIGH' ? 'عالي' :
                  c.risk_level === 'MEDIUM' ? 'متوسط' : 'منخفض'
                }</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div class="footer-item">
            <div class="footer-line"></div>
            <div style="font-size: 10px; color: #666;">المدير المسؤول</div>
          </div>
          <div class="footer-item">
            <div style="width: 60px; height: 60px; border: 1px dashed #999; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">الختم</div>
          </div>
          <div class="footer-item">
            <div class="footer-line"></div>
            <div style="font-size: 10px; color: #666;">موظف التحصيل</div>
          </div>
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }, [customers]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setRiskLevelFilter('all');
    setOverduePeriodFilter('all');
    setViolationsFilter('all');
    setCurrentPage(1);
  }, []);

  const activeFiltersCount = [searchTerm, riskLevelFilter !== 'all', overduePeriodFilter !== 'all', violationsFilter !== 'all'].filter(Boolean).length;

  // Loading state
  if (statsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">العملاء المتأخرون عن الدفع</h1>
            <p className="text-sm text-neutral-500">
              تتبع ومتابعة العملاء المتأخرين • آخر تحديث: {format(new Date(), 'dd MMM yyyy', { locale: ar })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refreshDelinquentCustomers.mutate()}
            disabled={refreshDelinquentCustomers.isPending}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshDelinquentCustomers.isPending && "animate-spin")} />
            تحديث
          </Button>
          <Button
            variant="outline"
            onClick={handlePrintReport}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي العملاء المتأخرين"
          value={stats?.totalDelinquent || 0}
          subtitle={`${(stats?.criticalRisk || 0) + (stats?.highRisk || 0)} عميل عالي المخاطر`}
          icon={Users}
          color="coral"
          onClick={() => clearFilters()}
          isActive={riskLevelFilter === 'all' && !searchTerm}
        />
        <StatCard
          title="المبالغ المعرضة للخطر"
          value={formatCurrency(stats?.totalAmountAtRisk || 0)}
          subtitle="إيجارات متأخرة"
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title="الغرامات المتراكمة"
          value={formatCurrency(stats?.totalPenalties || 0)}
          subtitle={`متوسط ${Math.round(stats?.averageDaysOverdue || 0)} يوم تأخير`}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="يحتاجون إجراء فوري"
          value={(stats?.criticalRisk || 0) + (stats?.highRisk || 0)}
          subtitle={`${stats?.needLegalCase || 0} يحتاجون قضية قانونية`}
          icon={Zap}
          color="red"
          badge={stats?.needBlacklist ? `${stats.needBlacklist} قائمة سوداء` : undefined}
          onClick={() => handleStatCardClick('CRITICAL')}
          isActive={riskLevelFilter === 'CRITICAL' || riskLevelFilter === 'HIGH'}
        />
      </div>

      {/* Risk Level Status Bar */}
      <div className="bg-white rounded-2xl p-3 border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-neutral-500 ml-2">مستوى المخاطر:</span>
          
          {[
            { id: 'CRITICAL', label: 'حرج', count: stats?.criticalRisk || 0, color: 'red' },
            { id: 'HIGH', label: 'عالي', count: stats?.highRisk || 0, color: 'orange' },
            { id: 'MEDIUM', label: 'متوسط', count: stats?.mediumRisk || 0, color: 'yellow' },
            { id: 'LOW', label: 'منخفض', count: stats?.lowRisk || 0, color: 'green' },
          ].map(({ id, label, count, color }) => (
            <button
              key={id}
              onClick={() => handleStatCardClick(id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                riskLevelFilter === id
                  ? `bg-${color}-500 text-white shadow-md`
                  : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100 border border-${color}-200`,
                // Fallback for Tailwind JIT
                id === 'CRITICAL' && (riskLevelFilter === id ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'),
                id === 'HIGH' && (riskLevelFilter === id ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'),
                id === 'MEDIUM' && (riskLevelFilter === id ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'),
                id === 'LOW' && (riskLevelFilter === id ? 'bg-green-500 text-white' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'),
              )}
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
              {label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                riskLevelFilter === id ? "bg-white/20" : `bg-${color}-100`
              )}>
                {count}
              </span>
            </button>
          ))}

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-all mr-auto"
            >
              <X className="w-3 h-3" />
              إلغاء الفلاتر ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              placeholder="بحث... (الاسم، رقم العميل، العقد، المركبة)"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pr-12 h-12 rounded-xl border-neutral-200"
            />
          </div>

          {/* Period Filter */}
          <Select value={overduePeriodFilter} onValueChange={(v) => { setOverduePeriodFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
              <Clock className="w-4 h-4 ml-2 text-neutral-400" />
              <SelectValue placeholder="فترة التأخير" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفترات</SelectItem>
              <SelectItem value="<30">أقل من 30 يوم</SelectItem>
              <SelectItem value="30-60">30-60 يوم</SelectItem>
              <SelectItem value="60-90">60-90 يوم</SelectItem>
              <SelectItem value=">90">أكثر من 90 يوم</SelectItem>
            </SelectContent>
          </Select>

          {/* Violations Filter */}
          <Select value={violationsFilter} onValueChange={(v) => { setViolationsFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
              <AlertCircle className="w-4 h-4 ml-2 text-neutral-400" />
              <SelectValue placeholder="المخالفات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="yes">يوجد مخالفات</SelectItem>
              <SelectItem value="no">لا يوجد مخالفات</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 mt-4 pt-4 border-t border-neutral-100"
          >
            <Badge variant="secondary" className="text-sm">
              تم تحديد {selectedCustomers.length} عميل
            </Badge>
            <Button
              size="sm"
              onClick={handleBulkCreateCases}
              disabled={convertToCase.isPending}
              className="gap-2 bg-coral-500 hover:bg-coral-600"
            >
              <FileText className="h-4 w-4" />
              إنشاء قضايا
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedCustomers([]); setSelectedIds(new Set()); }}
            >
              إلغاء التحديد
            </Button>
          </motion.div>
        )}
      </div>

      {/* Customers Table */}
      <Card className="border-neutral-200">
        <CardContent className="p-0">
          {customersLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
              <p className="text-neutral-600">حدث خطأ أثناء تحميل البيانات</p>
              <Button variant="outline" onClick={() => refreshDelinquentCustomers.mutate()} className="mt-4">
                إعادة المحاولة
              </Button>
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
              <p className="text-neutral-600 text-lg font-medium">لا يوجد عملاء متأخرين! 🎉</p>
              <p className="text-neutral-400 text-sm">جميع العملاء يدفعون في الوقت المحدد</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === customers.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>العقد / المركبة</TableHead>
                      <TableHead>المستحقات</TableHead>
                      <TableHead>التأخير</TableHead>
                      <TableHead>المخاطر</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {paginatedCustomers.map((customer, index) => (
                        <motion.tr
                          key={customer.customer_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="hover:bg-neutral-50 border-b border-neutral-100"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(customer.customer_id)}
                              onCheckedChange={(checked) => handleSelectCustomer(customer, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-neutral-900">{customer.customer_name}</span>
                              <span className="text-xs text-neutral-500">{customer.customer_code}</span>
                              {customer.phone && (
                                <span className="text-xs text-neutral-400 mt-1" dir="ltr">{customer.phone}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-neutral-700">{customer.contract_number || '-'}</span>
                              <span className="text-xs text-neutral-500">🚗 {customer.vehicle_plate || 'غير محدد'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-red-600">
                                {formatCurrency(customer.total_debt || 0)}
                              </span>
                              <div className="text-[10px] text-neutral-500 space-y-0.5">
                                <div>الإيجار: {formatCurrency(customer.overdue_amount || 0)}</div>
                                {(customer.late_penalty || 0) > 0 && (
                                  <div className="text-orange-600">+ غرامة: {formatCurrency(customer.late_penalty)}</div>
                                )}
                                {(customer.violations_amount || 0) > 0 && (
                                  <div className="text-rose-600">+ مخالفات ({customer.violations_count}): {formatCurrency(customer.violations_amount)}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={customer.days_overdue > 90 ? 'destructive' : customer.days_overdue > 30 ? 'default' : 'secondary'}>
                              {customer.days_overdue} يوم
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <RiskBadge level={customer.risk_level || 'LOW'} score={customer.risk_score || 0} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleViewDetails(customer)} title="عرض التفاصيل">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleSendWarning(customer)} title="إرسال إنذار">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                                    <Eye className="w-4 h-4 ml-2" />
                                    عرض تفاصيل العميل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateCase(customer)}>
                                    <FileText className="w-4 h-4 ml-2" />
                                    إنشاء قضية قانونية
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleSendWarning(customer)}>
                                    <AlertTriangle className="w-4 h-4 ml-2" />
                                    إرسال إنذار
                                  </DropdownMenuItem>
                                  {customer.phone && (
                                    <DropdownMenuItem onClick={() => window.open(`tel:${customer.phone}`)}>
                                      <Phone className="w-4 h-4 ml-2" />
                                      اتصال: {customer.phone}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-neutral-100">
                  <span className="text-sm text-neutral-500">
                    عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, customers.length)} من {customers.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-3">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Legal Warning Dialog */}
      <LegalWarningDialog
        open={warningDialogOpen}
        onOpenChange={setWarningDialogOpen}
        warning={currentWarning}
        customer={currentCustomer}
        isGenerating={generateWarning.isPending}
        onSendEmail={() => toast.info('سيتم تطبيق هذه الميزة قريباً')}
        onSendSMS={() => toast.info('سيتم تطبيق هذه الميزة قريباً')}
      />
    </div>
  );
};

export default DelinquentCustomersTab;
