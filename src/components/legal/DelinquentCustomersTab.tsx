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
  CreditCard,
  Star,
  Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDelinquentCustomers, type DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { useRefreshDelinquentCustomers } from '@/hooks/useDelinquentCustomers';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import { useGenerateLegalWarning } from '@/hooks/useGenerateLegalWarning';
import { useContractOperations } from '@/hooks/business/useContractOperations';
import LegalWarningDialog from './LegalWarningDialog';
import { CreateLegalCaseDialog } from './CreateLegalCaseDialog';
import { DelinquentDetailsDialog } from './DelinquentDetailsDialog';
import { BulkRemindersDialog } from './BulkRemindersDialog';
import { ScheduleCallsDialog } from './ScheduleCallsDialog';
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
  color: 'rose' | 'red' | 'amber' | 'emerald' | 'sky';
  onClick?: () => void;
  isActive?: boolean;
  badge?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon: Icon, color, onClick, isActive, badge
}) => {
  const colorClasses = {
    rose: {
      bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50',
      icon: 'bg-gradient-to-br from-rose-500 to-rose-600',
      border: 'border-rose-200',
      active: 'ring-2 ring-rose-500 ring-offset-2',
      value: 'text-rose-700',
      title: 'text-rose-700'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      icon: 'bg-gradient-to-br from-red-500 to-red-600',
      border: 'border-red-200',
      active: 'ring-2 ring-red-500 ring-offset-2',
      value: 'text-red-700',
      title: 'text-red-700'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
      icon: 'bg-gradient-to-br from-amber-500 to-amber-600',
      border: 'border-amber-200',
      active: 'ring-2 ring-amber-500 ring-offset-2',
      value: 'text-amber-700',
      title: 'text-amber-700'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      border: 'border-emerald-200',
      active: 'ring-2 ring-emerald-500 ring-offset-2',
      value: 'text-emerald-700',
      title: 'text-emerald-700'
    },
    sky: {
      bg: 'bg-gradient-to-br from-sky-50 to-sky-100/50',
      icon: 'bg-gradient-to-br from-sky-500 to-sky-600',
      border: 'border-sky-200',
      active: 'ring-2 ring-sky-500 ring-offset-2',
      value: 'text-sky-700',
      title: 'text-sky-700'
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden",
        classes.bg,
        classes.border,
        isActive && classes.active
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
      {badge && (
        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs shadow-md">
          {badge}
        </Badge>
      )}
      <div className="relative flex items-start justify-between p-6">
        <div className="space-y-3">
          <p className={cn("text-sm font-semibold", classes.title)}>{title}</p>
          <p className={cn("text-3xl font-bold tracking-tight", classes.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl shadow-md", classes.icon)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ===== Risk Badge Component =====
const RiskBadge: React.FC<{ level: string; score: number }> = ({ level, score }) => {
  const config: Record<string, { bg: string; text: string; label: string; color: string }> = {
    CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', label: 'حرج', color: 'bg-red-500' },
    HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'عالي', color: 'bg-orange-500' },
    MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'متوسط', color: 'bg-yellow-500' },
    LOW: { bg: 'bg-green-100', text: 'text-green-700', label: 'منخفض', color: 'bg-green-500' },
    MONITOR: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مراقبة', color: 'bg-blue-500' },
  };

  const { bg, text, label, color } = config[level] || config.MONITOR;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Badge className={cn(bg, text, 'font-medium')}>
          {label}
        </Badge>
        <span className="text-xs text-neutral-500">{score}%</span>
      </div>
      {/* Visual Risk Indicator */}
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all", color)}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        {score >= 80 && (
          <AlertCircle className="w-3 h-3 text-red-500" />
        )}
        {score >= 60 && score < 80 && (
          <AlertTriangle className="w-3 h-3 text-orange-500" />
        )}
      </div>
    </div>
  );
};

// ===== Main Component =====
export const DelinquentCustomersTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [overduePeriodFilter, setOverduePeriodFilter] = useState<string>('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>('all');
  const [violationsFilter, setViolationsFilter] = useState<string>('all');
  const [contractStatusFilter, setContractStatusFilter] = useState<string>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<DelinquentCustomer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [createCaseDialogOpen, setCreateCaseDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<GeneratedWarning | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<DelinquentCustomer | null>(null);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<DelinquentCustomer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRemindersDialogOpen, setBulkRemindersDialogOpen] = useState(false);
  const [scheduleCallsDialogOpen, setScheduleCallsDialogOpen] = useState(false);
  const itemsPerPage = 10;

  // Hooks
  const { data: stats, isLoading: statsLoading } = useDelinquencyStats();
  const convertToCase = useConvertToLegalCase();
  const generateWarning = useGenerateLegalWarning();
  const refreshDelinquentCustomers = useRefreshDelinquentCustomers();
  const { deleteContractPermanently } = useContractOperations();

  // Build filters object
  const filters = useMemo(() => ({
    search: searchTerm || undefined,
    riskLevel: riskLevelFilter !== 'all' ? riskLevelFilter as any : undefined,
    overduePeriod: overduePeriodFilter !== 'all' ? overduePeriodFilter as any : undefined,
    amountRange: amountRangeFilter !== 'all' ? amountRangeFilter as any : undefined,
    hasViolations: violationsFilter !== 'all' ? violationsFilter === 'yes' : undefined,
  }), [searchTerm, riskLevelFilter, overduePeriodFilter, amountRangeFilter, violationsFilter]);

  const { data: rawCustomers, isLoading: customersLoading, error } = useDelinquentCustomers(filters);

  // Apply contract status filter locally
  const customers = useMemo(() => {
    if (!rawCustomers) return [];
    if (contractStatusFilter === 'all') return rawCustomers;
    return rawCustomers.filter(c => c.contract_status === contractStatusFilter);
  }, [rawCustomers, contractStatusFilter]);

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

  // Handle view details - Open details dialog with overdue invoices breakdown
  const handleViewDetails = useCallback((customer: DelinquentCustomer) => {
    console.log('🔍 [DelinquentCustomersTab] Opening details dialog for customer:', customer.customer_name);
    setSelectedCustomerForDetails(customer);
    setDetailsDialogOpen(true);
  }, []);

  // Handle record payment - Navigate to quick payment page with customer selected
  const handleRecordPayment = useCallback((customer: DelinquentCustomer) => {
    // Navigate to quick payment page with customer info as query params
    const params = new URLSearchParams({
      customerId: customer.customer_id,
      customerName: customer.customer_name || '',
      phone: customer.phone || '',
    });
    navigate(`/finance/payments/quick?${params.toString()}`);
  }, [navigate]);

  // Handle create case - navigate to lawsuit preparation page
  const handleCreateCase = useCallback((customer: DelinquentCustomer) => {
    if (customer.contract_id) {
      navigate(`/legal/lawsuit/prepare/${customer.contract_id}`);
    } else {
      toast.error('لا يوجد عقد مرتبط بهذا العميل');
    }
  }, [navigate]);

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

  // Handle bulk actions - navigate to lawsuit preparation page
  const handleBulkCreateCases = useCallback(async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عملاء');
      return;
    }

    // Navigate to the first customer's lawsuit preparation page
    // User can prepare documents there before submitting the case
    const firstCustomer = selectedCustomers[0];
    if (firstCustomer?.contract_id) {
      navigate(`/legal/lawsuit/prepare/${firstCustomer.contract_id}`);
      toast.info(`جاري تجهيز دعوى للعقد: ${firstCustomer.contract_number}`);
    } else {
      toast.error('رقم العقد غير متاح');
    }
  }, [selectedCustomers, navigate]);

  // Handle bulk delete contracts permanently
  const handleBulkDeleteContracts = useCallback(async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عقود');
      return;
    }

    setBulkDeleting(true);
    toast.info(`جاري حذف ${selectedCustomers.length} عقد نهائياً...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const customer of selectedCustomers) {
      try {
        await deleteContractPermanently.mutateAsync(customer.contract_id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete contract ${customer.contract_number}:`, error);
        failCount++;
      }
    }
    
    setBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
    
    if (successCount > 0) {
      toast.success(`تم حذف ${successCount} عقد نهائياً`);
    }
    if (failCount > 0) {
      toast.error(`فشل حذف ${failCount} عقد`);
    }
    
    setSelectedCustomers([]);
    setSelectedIds(new Set());
  }, [selectedCustomers, deleteContractPermanently]);

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
    setAmountRangeFilter('all');
    setViolationsFilter('all');
    setContractStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const activeFiltersCount = [searchTerm, riskLevelFilter !== 'all', overduePeriodFilter !== 'all', amountRangeFilter !== 'all', violationsFilter !== 'all', contractStatusFilter !== 'all'].filter(Boolean).length;

  // Loading state
  if (statsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Urgent Cases Alert - Enhanced */}
      {stats?.needImmediateAction > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-hidden rounded-2xl shadow-2xl border-2 border-red-400"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 animate-gradient"></div>

          {/* Pulse effect overlay */}
          <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>

          <div className="relative p-6">
            <div className="flex items-start justify-between gap-6">
              {/* Left side - Main alert */}
              <div className="flex items-start gap-4 flex-1">
                {/* Animated icon */}
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/30 animate-ping opacity-30"></div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
                </motion.div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="px-3 py-1 bg-white/20 rounded-full border border-white/30"
                    >
                      <span className="text-sm font-bold">⚠️ حالة طوارئ</span>
                    </motion.div>
                    <Badge className="bg-white/20 text-white border-white/30 text-sm">
                      {stats.needImmediateAction} عميل
                    </Badge>
                  </div>

                  <h3 className="text-2xl font-bold mb-2">
                    حالات عاجلة تحتاج اهتمام فوري
                  </h3>

                  <p className="text-white/90 text-sm mb-3">
                    عملاء متأخرون أكثر من 90 يوم - إجراء فوري مطلوب لتجنب الخسائر المالية
                  </p>

                  {/* Key metrics */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/20">
                      <div className="text-xs text-white/80 mb-1">المبلغ المستحق</div>
                      <div className="text-lg font-bold">
                        {customers?.filter(c => c.risk_level === 'CRITICAL')
                          .reduce((sum, c) => sum + (c.total_debt || 0), 0)
                          .toLocaleString()} ر.ق
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/20">
                      <div className="text-xs text-white/80 mb-1">متوسط التأخير</div>
                      <div className="text-lg font-bold">
                        {Math.round(
                          customers?.filter(c => c.risk_level === 'CRITICAL')
                            .reduce((sum, c) => sum + (c.days_overdue || 0), 0) /
                          (customers?.filter(c => c.risk_level === 'CRITICAL').length || 1) || 0
                        )} يوم
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/20">
                      <div className="text-xs text-white/80 mb-1">مخاطر عالية</div>
                      <div className="text-lg font-bold">
                        {stats?.criticalRisk || 0} + {stats?.highRisk || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex flex-col gap-3 min-w-[200px]">
                <Button
                  size="lg"
                  className="w-full bg-white hover:bg-white/90 text-red-600 font-bold gap-2 shadow-lg"
                  onClick={() => {
                    setRiskLevelFilter('CRITICAL');
                    toast.success(`تم تصفية العرض للحالات الحرجة (${customers?.filter(c => c.risk_level === 'CRITICAL').length || 0} عميل)`);
                  }}
                >
                  <Eye className="w-5 h-5" />
                  عرض الحالات الحرجة
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 backdrop-blur-sm gap-2"
                  onClick={() => setBulkRemindersDialogOpen(true)}
                >
                  <Mail className="w-5 h-5" />
                  إرسال تنبيهات عاجلة
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 backdrop-blur-sm gap-2"
                  onClick={() => setScheduleCallsDialogOpen(true)}
                >
                  <Phone className="w-5 h-5" />
                  جدولة مكالمات عاجلة
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                <span>نسبة الحالات الحرجة من إجمالي العملاء المتأخرين</span>
                <span className="font-bold">
                  {Math.round((stats.needImmediateAction / (stats?.totalDelinquent || 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.needImmediateAction / (stats?.totalDelinquent || 1)) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions Bar */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              إجراءات سريعة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setBulkRemindersDialogOpen(true)}
            >
              <Mail className="w-4 h-4" />
              إرسال تذكيرات جماعية
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => setScheduleCallsDialogOpen(true)}
            >
              <Phone className="w-4 h-4" />
              جدولة مكالمات
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => {
                setRiskLevelFilter('CRITICAL');
                toast.success(`تم تصفية العرض للحالات الحرجة (${customers?.filter(c => c.risk_level === 'CRITICAL').length || 0} عميل)`);
              }}
            >
              <AlertTriangle className="w-4 h-4" />
              عرض الحالات العاجلة
            </Button>
          </div>
        </div>
      </div>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="إجمالي العملاء المتأخرين"
          value={stats?.totalDelinquent || 0}
          subtitle={`${(stats?.criticalRisk || 0) + (stats?.highRisk || 0)} عميل عالي المخاطر`}
          icon={Users}
          color="rose"
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
          color="amber"
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

      {/* Cancelled Contracts Warning */}
      {customers && customers.filter(c => c.contract_status === 'cancelled').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-l from-red-100 via-red-50 to-white rounded-2xl p-4 border border-red-200 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-red-700 text-lg">
                  {customers.filter(c => c.contract_status === 'cancelled').length} عقد ملغي يحتاج متابعة
                </h3>
                <p className="text-sm text-red-600">
                  هذه العقود ملغية ولكن لا تزال هناك مستحقات مالية على العملاء - يجب استرداد المركبات ومتابعة التحصيل
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => { setContractStatusFilter('cancelled'); setCurrentPage(1); }}
            >
              <Filter className="w-4 h-4 ml-2" />
              عرض الملغية فقط
            </Button>
          </div>
        </motion.div>
      )}

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

          {/* Contract Status Quick Filters */}
          <div className="flex items-center gap-1 mr-4 pr-4 border-r border-neutral-200">
            <span className="text-sm text-neutral-400 ml-2">العقد:</span>
            {[
              { id: 'active', label: 'نشط', count: customers?.filter(c => c.contract_status === 'active').length || 0, color: 'green' },
              { id: 'cancelled', label: 'ملغي', count: customers?.filter(c => c.contract_status === 'cancelled').length || 0, color: 'red' },
              { id: 'closed', label: 'مغلق', count: customers?.filter(c => c.contract_status === 'closed').length || 0, color: 'gray' },
            ].filter(f => f.count > 0).map(({ id, label, count, color }) => (
              <button
                key={id}
                onClick={() => { 
                  setContractStatusFilter(contractStatusFilter === id ? 'all' : id); 
                  setCurrentPage(1); 
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  contractStatusFilter === id
                    ? id === 'cancelled' ? 'bg-red-500 text-white' : id === 'closed' ? 'bg-gray-500 text-white' : 'bg-green-500 text-white'
                    : id === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                    : id === 'closed' ? 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                )}
              >
                {id === 'cancelled' && <X className="w-3 h-3" />}
                {id === 'closed' && <CheckCircle className="w-3 h-3" />}
                {label}
                <span className="bg-white/20 px-1 rounded text-[10px]">{count}</span>
              </button>
            ))}
          </div>

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

              {/* Amount Range Filter */}
          <Select value={amountRangeFilter} onValueChange={(v) => { setAmountRangeFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
              <DollarSign className="w-4 h-4 ml-2 text-neutral-400" />
                  <SelectValue placeholder="نطاق المبلغ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المبالغ</SelectItem>
                  <SelectItem value="0-1000">أقل من 1,000</SelectItem>
                  <SelectItem value="1000-5000">1,000 - 5,000</SelectItem>
                  <SelectItem value="5000-10000">5,000 - 10,000</SelectItem>
                  <SelectItem value="10000+">أكثر من 10,000</SelectItem>
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

              {/* Contract Status Filter */}
          <Select value={contractStatusFilter} onValueChange={(v) => { setContractStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
              <FileText className="w-4 h-4 ml-2 text-neutral-400" />
                  <SelectValue placeholder="حالة العقد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
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
              className="gap-2 bg-rose-500 hover:bg-rose-600"
              >
                <FileText className="h-4 w-4" />
              إنشاء قضايا
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={bulkDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                حذف نهائي
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

      {/* Table View - Card-based Design */}
      <div className="space-y-4">
        {/* Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider items-center">
            <div className="col-span-1">
              <Checkbox
                checked={selectedIds.size === customers.length}
                onCheckedChange={handleSelectAll}
              />
            </div>
            <div className="col-span-3">العميل</div>
            <div className="col-span-2">العقد / المركبة</div>
            <div className="col-span-2">المستحقات</div>
            <div className="col-span-1">التواصل</div>
            <div className="col-span-1">التأخير</div>
            <div className="col-span-1">المخاطر</div>
            <div className="col-span-1 text-center">الإجراءات</div>
          </div>
        </div>

        {/* Loading State */}
        {customersLoading ? (
          <div className="flex items-center justify-center h-80">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-2xl border border-slate-200">
            <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
            <p className="text-slate-600 text-lg">حدث خطأ أثناء تحميل البيانات</p>
            <Button variant="outline" onClick={() => refreshDelinquentCustomers.mutate()} className="mt-4">
              إعادة المحاولة
            </Button>
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-slate-800 text-2xl font-bold mb-3">لا يوجد عملاء متأخرين! 🎉</p>
            <p className="text-slate-500">جميع العملاء يدفعون في الوقت المحدد</p>
          </div>
        ) : (
          <>
            {/* Customer Cards */}
            <AnimatePresence mode="popLayout">
              {paginatedCustomers.map((customer, index) => (
                <motion.div
                  key={`${customer.customer_id}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "group bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl",
                    customer.risk_level === 'CRITICAL'
                      ? "border-red-200 hover:border-red-300 hover:bg-red-50/30"
                      : customer.risk_level === 'HIGH'
                        ? "border-orange-200 hover:border-orange-300 hover:bg-orange-50/30"
                        : customer.risk_level === 'MEDIUM'
                          ? "border-amber-200 hover:border-amber-300 hover:bg-amber-50/30"
                          : "border-slate-200 hover:border-rose-200 hover:bg-rose-50/20"
                  )}
                >
                  <div className="p-6">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Checkbox */}
                      <div className="col-span-1">
                        <Checkbox
                          checked={selectedIds.has(customer.customer_id)}
                          onCheckedChange={(checked) => handleSelectCustomer(customer, checked as boolean)}
                        />
                      </div>

                      {/* Customer */}
                      <div className="col-span-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-all duration-300",
                            customer.risk_level === 'CRITICAL'
                              ? "bg-gradient-to-br from-red-100 to-red-200"
                              : customer.risk_level === 'HIGH'
                                ? "bg-gradient-to-br from-orange-100 to-orange-200"
                                : customer.risk_level === 'MEDIUM'
                                  ? "bg-gradient-to-br from-amber-100 to-amber-200"
                                  : "bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-rose-100 group-hover:to-rose-200"
                          )}>
                            <Users className={cn(
                              "w-6 h-6 transition-colors",
                              customer.risk_level === 'CRITICAL'
                                ? "text-red-600"
                                : customer.risk_level === 'HIGH'
                                  ? "text-orange-600"
                                  : customer.risk_level === 'MEDIUM'
                                    ? "text-amber-600"
                                    : "text-slate-600 group-hover:text-rose-600"
                            )} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 truncate">{customer.customer_name}</p>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(i => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "w-3 h-3",
                                      i <= (customer.payment_history_score || 3)
                                        ? "text-yellow-400 fill-current"
                                        : "text-gray-300"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{customer.customer_code}</p>
                            {customer.phone && (
                              <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{customer.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contract/Vehicle */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (customer.contract_number) {
                                navigate(`/contracts/${customer.contract_number}`);
                              }
                            }}
                            className="font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer transition-colors text-sm"
                            title="عرض تفاصيل العقد"
                          >
                            {customer.contract_number || '-'}
                          </button>
                          <span className="text-xs text-slate-500">🚗 {customer.vehicle_plate || 'غير محدد'}</span>
                          {customer.contract_status === 'cancelled' && (
                            <Badge className="text-[10px] px-2 py-0.5 bg-red-500 text-white animate-pulse gap-1 w-fit">
                              <X className="w-3 h-3" />
                              ملغي
                            </Badge>
                          )}
                          {customer.contract_status === 'under_legal_procedure' && (
                            <Badge className="text-[10px] px-2 py-0.5 bg-violet-600 text-white animate-pulse gap-1 w-fit">
                              <Gavel className="w-3 h-3" />
                              قضية
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Due Amounts */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <span className={cn(
                            "font-bold text-base",
                            customer.risk_level === 'CRITICAL'
                              ? "text-red-700"
                              : customer.risk_level === 'HIGH'
                                ? "text-orange-700"
                                : "text-rose-700"
                          )}>
                            {formatCurrency(customer.total_debt || 0)}
                          </span>
                          <div className="text-[10px] text-slate-400 space-y-0.5">
                            <div>إيجار: {formatCurrency(customer.overdue_amount || 0)}</div>
                            {(customer.late_penalty || 0) > 0 && (
                              <div className="text-orange-600">+ غرامة: {formatCurrency(customer.late_penalty)}</div>
                            )}
                            {(customer.violations_amount || 0) > 0 && (
                              <div className="text-rose-600">+ مخالفات: {formatCurrency(customer.violations_amount)}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Communication */}
                      <div className="col-span-1">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-600">{customer.last_contact_days || 0} يوم</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-600">{customer.contact_count_this_month || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Days Overdue */}
                      <div className="col-span-1">
                        <div className={cn(
                          "flex items-center justify-center w-14 h-14 rounded-xl text-sm font-bold",
                          customer.days_overdue > 90
                            ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                            : customer.days_overdue > 60
                              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                              : customer.days_overdue > 30
                                ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30"
                                : "bg-slate-800 text-white"
                        )}>
                          {customer.days_overdue}
                        </div>
                      </div>

                      {/* Risk */}
                      <div className="col-span-1">
                        <div className="flex flex-col gap-1.5">
                          <Badge className={cn(
                            "text-xs font-medium",
                            customer.risk_level === 'CRITICAL' && "bg-red-100 text-red-700 border-red-200",
                            customer.risk_level === 'HIGH' && "bg-orange-100 text-orange-700 border-orange-200",
                            customer.risk_level === 'MEDIUM' && "bg-amber-100 text-amber-700 border-amber-200",
                            customer.risk_level === 'LOW' && "bg-emerald-100 text-emerald-700 border-emerald-200",
                            !customer.risk_level && "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {customer.risk_level === 'CRITICAL' ? 'حرج' :
                             customer.risk_level === 'HIGH' ? 'عالي' :
                             customer.risk_level === 'MEDIUM' ? 'متوسط' :
                             customer.risk_level === 'LOW' ? 'منخفض' : 'مراقبة'}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(customer.risk_score || 0, 100)}%` }}
                                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                                className={cn(
                                  "h-full rounded-full",
                                  customer.risk_level === 'CRITICAL' && "bg-gradient-to-r from-red-500 to-red-400",
                                  customer.risk_level === 'HIGH' && "bg-gradient-to-r from-orange-500 to-orange-400",
                                  customer.risk_level === 'MEDIUM' && "bg-gradient-to-r from-amber-500 to-amber-400",
                                  customer.risk_level === 'LOW' && "bg-gradient-to-r from-emerald-500 to-emerald-400",
                                  !customer.risk_level && "bg-gradient-to-r from-slate-500 to-slate-400"
                                )}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400">{customer.risk_score || 0}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(customer); }}
                            title="عرض التفاصيل"
                            className="h-9 w-9 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendWarning(customer)}
                            title="إرسال إنذار"
                            className="h-9 w-9 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRecordPayment(customer)}
                            title="تسجيل دفعة"
                            className="h-9 w-9 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Risk Progress Bar at Bottom */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>مستوى المخاطرة</span>
                        <span>{customer.risk_score || 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(customer.risk_score || 0, 100)}%` }}
                          transition={{ duration: 0.8, delay: index * 0.05 + 0.3 }}
                          className={cn(
                            "h-full rounded-full",
                            customer.risk_level === 'CRITICAL' && "bg-gradient-to-r from-red-500 to-red-400",
                            customer.risk_level === 'HIGH' && "bg-gradient-to-r from-orange-500 to-orange-400",
                            customer.risk_level === 'MEDIUM' && "bg-gradient-to-r from-amber-500 to-amber-400",
                            customer.risk_level === 'LOW' && "bg-gradient-to-r from-emerald-500 to-emerald-400",
                            !customer.risk_level && "bg-gradient-to-r from-slate-500 to-slate-400"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, customers.length)} من {customers.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-sm px-3 font-medium text-slate-700">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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

      {/* Create Legal Case Dialog */}
      <CreateLegalCaseDialog
        open={createCaseDialogOpen}
        onOpenChange={setCreateCaseDialogOpen}
        customer={currentCustomer}
        onSuccess={() => {
          setCreateCaseDialogOpen(false);
          setCurrentCustomer(null);
        }}
      />

      {/* Delinquent Details Dialog - تفاصيل الفواتير المتأخرة */}
      <DelinquentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        customer={selectedCustomerForDetails}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              تأكيد الحذف النهائي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-2">
              <p>
                أنت على وشك حذف <strong>{selectedCustomers.length} عقد</strong> نهائياً.
              </p>
              <p className="text-red-600 font-medium">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <p>سيتم حذف جميع البيانات المرتبطة بالعقود المحددة:</p>
              <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                <li>الفواتير والمدفوعات</li>
                <li>جداول السداد</li>
                <li>سجلات المتعثرين</li>
                <li>ملفات القضايا القانونية</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={bulkDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteContracts}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleting ? 'جاري الحذف...' : `حذف ${selectedCustomers.length} عقد نهائياً`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Reminders Dialog */}
      <BulkRemindersDialog
        open={bulkRemindersDialogOpen}
        onOpenChange={setBulkRemindersDialogOpen}
        customers={customers || []}
        selectedCustomers={selectedCustomers}
      />

      {/* Schedule Calls Dialog */}
      <ScheduleCallsDialog
        open={scheduleCallsDialogOpen}
        onOpenChange={setScheduleCallsDialogOpen}
        customers={customers || []}
        selectedCustomers={selectedCustomers}
      />
    </div>
  );
};

export default DelinquentCustomersTab;
