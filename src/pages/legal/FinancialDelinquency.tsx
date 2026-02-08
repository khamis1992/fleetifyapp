/**
 * صفحة إدارة المتعثرات المالية - التصميم الجديد المحسّن
 * Financial Delinquency Management Page - New Enhanced Design
 * 
 * @component FinancialDelinquency
 * @description إعادة تصميم شاملة مع تحسين تجربة المستخدم وتغطية جميع الخدمات
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Gavel,
  Printer,
  Download,
  RefreshCw,
  Phone,
  Mail,
  Zap,
  Target,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  LayoutGrid,
  List,
  Columns,
  ArrowUp,
  ArrowDown,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Trash2,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { 
  useDelinquentCustomers, 
  useRefreshDelinquentCustomers,
  type DelinquentCustomer 
} from '@/hooks/useDelinquentCustomers';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useVerificationStatuses } from '@/hooks/useVerificationTasks';
import { lawsuitService, type OverdueContract } from '@/services/LawsuitService';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { 
  generateBulkDocumentsZip, 
  downloadZipFile, 
  convertToOfficialCase,
  type BulkCustomerData,
  type BulkGenerationProgress,
} from '@/utils/bulkDocumentGenerator';
import { Progress } from '@/components/ui/progress';
import { useContractOperations } from '@/hooks/business/useContractOperations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import {
  StatCard,
  QuickAction,
  CustomerCard,
  ContractCard,
  colors,
  getRiskColor,
  getRiskLabel,
  type ViewMode,
  type SortField,
  type SortDirection,
  type RiskLevel,
  type TabValue,
} from './financial-delinquency';
import { SendVerificationTaskDialog } from '@/components/legal/SendVerificationTaskDialog';

// ===== Main Page Component =====
const FinancialDelinquencyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('customers');
  const { companyId } = useUnifiedCompanyAccess();

  // Data States
  const { data: stats, isLoading: statsLoading } = useDelinquencyStats();
  const refreshDelinquentCustomers = useRefreshDelinquentCustomers();
  const { deleteContractPermanently } = useContractOperations();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [overduePeriodFilter, setOverduePeriodFilter] = useState<string>('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>('all');
  const [violationsFilter, setViolationsFilter] = useState<string>('all');
  const [combinedStatusFilter, setCombinedStatusFilter] = useState<string>('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // View States
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('total_debt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Selection States
  const [selectedCustomers, setSelectedCustomers] = useState<DelinquentCustomer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatedCustomerIds, setGeneratedCustomerIds] = useState<Set<string>>(new Set());

  // Dialog States
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkGenerationDialogOpen, setBulkGenerationDialogOpen] = useState(false);
  const [bulkGenerationProgress, setBulkGenerationProgress] = useState<BulkGenerationProgress | null>(null);
  const [verificationTaskDialogOpen, setVerificationTaskDialogOpen] = useState(false);

  // Fetch Customers
  const filters = useMemo(() => ({
    search: searchTerm || undefined,
    riskLevel: riskLevelFilter !== 'all' ? riskLevelFilter as any : undefined,
    overduePeriod: overduePeriodFilter !== 'all' ? overduePeriodFilter as any : undefined,
    amountRange: amountRangeFilter !== 'all' ? amountRangeFilter as any : undefined,
    hasViolations: violationsFilter !== 'all' ? violationsFilter === 'yes' : undefined,
    useCachedData: false, // استخدام البيانات الحية لضمان ظهور جميع العملاء المتعثرين
  }), [searchTerm, riskLevelFilter, overduePeriodFilter, amountRangeFilter, violationsFilter]);

  const { data: rawCustomers, isLoading: customersLoading } = useDelinquentCustomers(filters);

  // Get verification statuses
  const contractIds = useMemo(() => 
    (rawCustomers || []).map(c => c.contract_id).filter(Boolean),
    [rawCustomers]
  );
  const { data: verificationStatuses } = useVerificationStatuses(contractIds);

  // Fetch Overdue Contracts
  const { data: overdueContracts = [], isLoading: contractsLoading } = useQuery<OverdueContract[]>({
    queryKey: ['overdue-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return lawsuitService.getOverdueContracts(companyId, 30);
    },
    enabled: !!companyId && activeTab === 'contracts',
  });

  // Apply combined status filter
  const filteredCustomers = useMemo(() => {
    if (!rawCustomers) return [];
    let result = rawCustomers;
    
    if (combinedStatusFilter !== 'all') {
      if (['active', 'cancelled', 'closed', 'under_legal_procedure'].includes(combinedStatusFilter)) {
        result = result.filter(c => c.contract_status === combinedStatusFilter);
      } else if (combinedStatusFilter === 'verified' && verificationStatuses) {
        result = result.filter(c => verificationStatuses.get(c.contract_id)?.status === 'verified');
      } else if (combinedStatusFilter === 'pending' && verificationStatuses) {
        result = result.filter(c => verificationStatuses.get(c.contract_id)?.status === 'pending');
      } else if (combinedStatusFilter === 'not_verified') {
        result = result.filter(c => !verificationStatuses?.get(c.contract_id));
      }
    }
    return result;
  }, [rawCustomers, combinedStatusFilter, verificationStatuses]);

  // Apply sorting
  const customers = useMemo(() => {
    if (!filteredCustomers) return [];
    return [...filteredCustomers].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'total_debt':
          aVal = a.total_debt || 0;
          bVal = b.total_debt || 0;
          break;
        case 'days_overdue':
          aVal = a.days_overdue || 0;
          bVal = b.days_overdue || 0;
          break;
        case 'risk_score':
          aVal = a.risk_score || 0;
          bVal = b.risk_score || 0;
          break;
        case 'customer_name':
          aVal = a.customer_name || '';
          bVal = b.customer_name || '';
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'ar')
          : bVal.localeCompare(aVal, 'ar');
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredCustomers, sortField, sortDirection]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    if (!customers) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return customers.slice(start, start + itemsPerPage);
  }, [customers, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (!customers) return 1;
    return Math.ceil(customers.length / itemsPerPage);
  }, [customers, itemsPerPage]);

  // Today's tasks
  const todaysTasks = useMemo(() => {
    if (!customers) return { urgentCalls: [], highRisk: [] };
    return {
      urgentCalls: customers.filter(c => c.risk_level === 'CRITICAL' || (c.days_overdue || 0) > 90).slice(0, 5),
      highRisk: customers.filter(c => c.risk_level === 'HIGH').slice(0, 5),
    };
  }, [customers]);

  // Handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && paginatedCustomers) {
      const allIds = new Set(paginatedCustomers.map(c => c.customer_id));
      setSelectedIds(allIds);
      setSelectedCustomers(paginatedCustomers);
    } else {
      setSelectedIds(new Set());
      setSelectedCustomers([]);
    }
  }, [paginatedCustomers]);

  const handleSelectCustomer = useCallback((customer: DelinquentCustomer, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(customer.customer_id);
      else newSet.delete(customer.customer_id);
      return newSet;
    });

    setSelectedCustomers(prev => {
      if (checked) return [...prev, customer];
      return prev.filter(c => c.customer_id !== customer.customer_id);
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!customers || customers.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const headers = ['رقم العميل', 'اسم العميل', 'رقم العقد', 'لوحة المركبة', 'الإيجار المتأخر', 'غرامة التأخير', 'المخالفات', 'إجمالي المستحق', 'أيام التأخير', 'مستوى المخاطر', 'الهاتف'];
    const rows = customers.map(c => [
      c.customer_code || '', c.customer_name || '', c.contract_number || '', c.vehicle_plate || '',
      (c.overdue_amount || 0).toString(), (c.late_penalty || 0).toString(),
      (c.violations_amount || 0).toString(), (c.total_debt || 0).toString(),
      (c.days_overdue || 0).toString(), c.risk_level || '', c.phone || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `delinquent_customers_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('تم تصدير البيانات بنجاح');
  }, [customers]);

  const handlePrintReport = useCallback(() => {
    if (!customers || customers.length === 0) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }

    const today = new Date().toLocaleDateString('ar-QA');
    const totalDebt = customers.reduce((sum, c) => sum + (c.total_debt || 0), 0);
    const totalOverdue = customers.reduce((sum, c) => sum + (c.overdue_amount || 0), 0);
    const totalPenalties = customers.reduce((sum, c) => sum + (c.late_penalty || 0), 0);
    const totalViolations = customers.reduce((sum, c) => sum + (c.violations_amount || 0), 0);
    
    // Calculate risk distribution
    const criticalCount = customers.filter(c => c.risk_level === 'CRITICAL').length;
    const highCount = customers.filter(c => c.risk_level === 'HIGH').length;
    const mediumCount = customers.filter(c => c.risk_level === 'MEDIUM').length;
    const lowCount = customers.filter(c => c.risk_level === 'LOW' || !c.risk_level).length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة الطباعة');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العملاء المتأخرين - ${today}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #1a1a1a; 
            font-size: 12px;
            background: #fff;
          }
          
          /* Header */
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 3px solid #0d9488; 
            padding-bottom: 20px; 
            margin-bottom: 25px; 
          }
          .company-info { text-align: right; }
          .company-name { 
            font-size: 26px; 
            font-weight: bold; 
            color: #0f766e; 
            margin-bottom: 5px;
          }
          .company-subtitle { 
            font-size: 13px; 
            color: #64748b; 
            font-weight: 500;
          }
          .report-title { 
            text-align: center; 
            padding: 12px 35px; 
            border: 2px solid #0d9488; 
            border-radius: 10px; 
            background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
          }
          .title-text { 
            font-size: 20px; 
            font-weight: bold; 
            color: #0f766e; 
            margin: 0;
          }
          .title-date { 
            font-size: 11px; 
            color: #64748b; 
            margin-top: 5px;
          }
          .logo { 
            width: 90px; 
            height: 90px; 
            object-fit: contain;
          }
          
          /* Summary Cards */
          .summary-section {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          .summary-card {
            background: linear-gradient(135deg, #f0fdfa, #ffffff);
            border: 2px solid #99f6e4;
            border-radius: 12px;
            padding: 18px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .summary-card.highlight {
            background: linear-gradient(135deg, #fef2f2, #ffffff);
            border-color: #fca5a5;
          }
          .summary-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #0d9488; 
            margin-bottom: 5px;
          }
          .summary-card.highlight .summary-value {
            color: #dc2626;
          }
          .summary-label { 
            font-size: 11px; 
            color: #64748b; 
            font-weight: 500;
          }
          
          /* Risk Distribution */
          .risk-section {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 25px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 10px;
          }
          .risk-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
          }
          .risk-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }
          .risk-critical { background: #fee2e2; color: #991b1b; }
          .risk-critical .risk-dot { background: #dc2626; }
          .risk-high { background: #ffedd5; color: #9a3412; }
          .risk-high .risk-dot { background: #ea580c; }
          .risk-medium { background: #fef3c7; color: #92400e; }
          .risk-medium .risk-dot { background: #d97706; }
          .risk-low { background: #d1fae5; color: #065f46; }
          .risk-low .risk-dot { background: #059669; }
          
          /* Table Styles */
          .table-container {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 20px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
          }
          thead {
            background: linear-gradient(135deg, #0d9488, #14b8a6);
          }
          th { 
            color: white; 
            padding: 12px 8px; 
            font-weight: 700; 
            text-align: right; 
            font-size: 11px;
            border-bottom: 2px solid #0f766e;
          }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e2e8f0; 
            text-align: right; 
            font-size: 11px;
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #f0fdfa; }
          
          /* Amount Columns */
          .amount { 
            font-weight: 700; 
            color: #0d9488;
            font-family: 'Courier New', monospace;
          }
          .amount-overdue { color: #ea580c; }
          .amount-violation { color: #dc2626; }
          .amount-total { 
            color: #0d9488; 
            font-size: 12px;
          }
          
          /* Risk Badges */
          .risk-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
          }
          .badge-critical { background: #fee2e2; color: #991b1b; }
          .badge-high { background: #ffedd5; color: #9a3412; }
          .badge-medium { background: #fef3c7; color: #92400e; }
          .badge-low { background: #d1fae5; color: #065f46; }
          
          /* Customer Info */
          .customer-name {
            font-weight: 700;
            color: #1e293b;
            font-size: 12px;
          }
          .customer-phone {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
            font-family: monospace;
          }
          .contract-info {
            font-size: 10px;
            color: #64748b;
            margin-top: 2px;
          }
          
          /* Footer */
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #e2e8f0;
            display: flex; 
            justify-content: space-between;
            align-items: center;
          }
          .footer-item { text-align: center; }
          .footer-line { 
            width: 120px; 
            border-top: 1px solid #94a3b8; 
            margin: 25px auto 8px; 
          }
          .footer-label {
            font-size: 10px;
            color: #64748b;
          }
          .stamp-placeholder {
            width: 70px;
            height: 70px;
            border: 2px dashed #cbd5e1;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #94a3b8;
            margin: 0 auto;
          }
          
          /* Print Info */
          .print-info {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
          }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">شركة العراف لتأجير السيارات</div>
            <div class="company-subtitle">AL-ARAF CAR RENTAL - قطر</div>
            <div class="company-subtitle">تقرير العملاء المتأخرين عن السداد</div>
          </div>
          <div class="report-title">
            <div class="title-text">تقرير المتعثرين</div>
            <div class="title-date">${today}</div>
          </div>
        </div>

        <div class="summary-section">
          <div class="summary-card">
            <div class="summary-value">${customers.length.toLocaleString('en-US')}</div>
            <div class="summary-label">إجمالي العملاء</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalOverdue)}</div>
            <div class="summary-label">الإيجارات المتأخرة</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalPenalties)}</div>
            <div class="summary-label">غرامات التأخير</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${formatCurrency(totalViolations)}</div>
            <div class="summary-label">المخالفات المرورية</div>
          </div>
          <div class="summary-card highlight">
            <div class="summary-value" style="color: #dc2626;">${formatCurrency(totalDebt)}</div>
            <div class="summary-label">الإجمالي المستحق</div>
          </div>
        </div>

        <div class="risk-section">
          <div class="risk-item risk-critical">
            <div class="risk-dot"></div>
            <span>حرج: ${criticalCount} عميل</span>
          </div>
          <div class="risk-item risk-high">
            <div class="risk-dot"></div>
            <span>عالي: ${highCount} عميل</span>
          </div>
          <div class="risk-item risk-medium">
            <div class="risk-dot"></div>
            <span>متوسط: ${mediumCount} عميل</span>
          </div>
          <div class="risk-item risk-low">
            <div class="risk-dot"></div>
            <span>منخفض: ${lowCount} عميل</span>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 18%">اسم العميل</th>
                <th style="width: 12%">رقم العقد</th>
                <th style="width: 12%">المركبة</th>
                <th style="width: 11%">الإيجار المتأخر</th>
                <th style="width: 10%">الغرامة</th>
                <th style="width: 10%">المخالفات</th>
                <th style="width: 11%">الإجمالي</th>
                <th style="width: 6%">الأيام</th>
                <th style="width: 5%">المخاطر</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map((c, i) => `
                <tr>
                  <td>${(i + 1).toLocaleString('en-US')}</td>
                  <td>
                    <div class="customer-name">${c.customer_name || '-'}</div>
                    <div class="customer-phone">${c.phone || ''}</div>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: #0d9488;">${c.contract_number || '-'}</div>
                  </td>
                  <td>
                    <div class="contract-info">${c.vehicle_plate || '-'}</div>
                  </td>
                  <td class="amount">${formatCurrency(c.overdue_amount || 0)}</td>
                  <td class="amount amount-overdue">${formatCurrency(c.late_penalty || 0)}</td>
                  <td class="amount amount-violation">${formatCurrency(c.violations_amount || 0)}${c.violations_count > 0 ? `<span style="font-size: 9px; margin-right: 3px;">(${c.violations_count})</span>` : ''}</td>
                  <td class="amount amount-total">${formatCurrency(c.total_debt || 0)}</td>
                  <td style="text-align: center; font-weight: 600;">${c.days_overdue || 0}</td>
                  <td style="text-align: center;">
                    <span class="risk-badge badge-${(c.risk_level || 'low').toLowerCase()}">
                      ${c.risk_level === 'CRITICAL' ? 'حرج' : c.risk_level === 'HIGH' ? 'عالي' : c.risk_level === 'MEDIUM' ? 'متوسط' : 'منخفض'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div class="footer-item">
            <div class="footer-line"></div>
            <div class="footer-label">المدير المسؤول</div>
          </div>
          <div class="footer-item">
            <div class="stamp-placeholder">الختم</div>
          </div>
          <div class="footer-item">
            <div class="footer-line"></div>
            <div class="footer-label">موظف التحصيل</div>
          </div>
        </div>

        <div class="print-info">
          تم إنشاء هذا التقرير بواسطة نظام Fleetify - شركة العراف لتأجير السيارات | ${today}
        </div>

        <script>
          window.onload = function() { 
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
    toast.success('تم فتح نافذة الطباعة');
  }, [customers]);

  const handleQuickBulkDownload = useCallback(async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عملاء');
      return;
    }

    setBulkGenerationDialogOpen(true);
    setBulkGenerationProgress({
      current: 0, total: selectedCustomers.length, currentCustomer: '',
      status: 'generating', errors: []
    });

    try {
      const customersData: BulkCustomerData[] = selectedCustomers.map(c => ({
        contract_id: c.contract_id,
        contract_number: c.contract_number,
        customer_name: c.customer_name,
        customer_id: c.customer_id,
        national_id: c.id_number || undefined,
        phone: c.phone || undefined,
        total_due: c.total_debt,
        days_overdue: c.days_overdue,
      }));

      const allDocumentsOptions = {
        explanatoryMemo: true, claimsStatement: true, documentsList: true,
        violationsList: true, criminalComplaint: false, violationsTransfer: false, // بلاغ السرقة وتحويل المخالفات اختياريان
      };

      const zipBlob = await generateBulkDocumentsZip(customersData, companyId, (progress) => {
        setBulkGenerationProgress(progress);
      }, allDocumentsOptions);

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      downloadZipFile(zipBlob, `مستندات_${selectedCustomers.length}_عميل_${timestamp}.zip`);
      toast.success(`✅ تم تحميل مستندات ${selectedCustomers.length} عميل بنجاح`);
    } catch (error) {
      console.error('Error in quick bulk download:', error);
      toast.error('حدث خطأ أثناء تحميل المستندات');
    } finally {
      setTimeout(() => {
        setBulkGenerationDialogOpen(false);
        setBulkGenerationProgress(null);
      }, 2000);
    }
  }, [selectedCustomers, companyId]);

  const handleConvertToOfficialCase = useCallback(async (customer: DelinquentCustomer) => {
    if (!companyId) {
      toast.error('لم يتم تحديد الشركة');
      return;
    }

    try {
      toast.loading('جاري إنشاء القضية الرسمية...');
      const caseId = await convertToOfficialCase(customer.contract_id, companyId);
      toast.dismiss();
      toast.success('✅ تم إنشاء القضية الرسمية بنجاح');
      setGeneratedCustomerIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(customer.contract_id);
        return newSet;
      });
      navigate(`/legal/cases/${caseId}`);
      refreshDelinquentCustomers.mutate();
    } catch (error) {
      toast.dismiss();
      toast.error('حدث خطأ أثناء إنشاء القضية');
    }
  }, [companyId, navigate, refreshDelinquentCustomers]);

  const handleBulkDeleteContracts = useCallback(async () => {
    if (selectedCustomers.length === 0) return;

    setBulkDeleting(true);
    let successCount = 0, failCount = 0;

    for (const customer of selectedCustomers) {
      try {
        await deleteContractPermanently.mutateAsync(customer.contract_id);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
    if (successCount > 0) toast.success(`تم حذف ${successCount} عقد نهائياً`);
    if (failCount > 0) toast.error(`فشل حذف ${failCount} عقد`);
    setSelectedCustomers([]);
    setSelectedIds(new Set());
  }, [selectedCustomers, deleteContractPermanently]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setRiskLevelFilter('all');
    setOverduePeriodFilter('all');
    setAmountRangeFilter('all');
    setViolationsFilter('all');
    setCombinedStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const activeFiltersCount = [
    searchTerm, riskLevelFilter !== 'all', overduePeriodFilter !== 'all',
    amountRangeFilter !== 'all', violationsFilter !== 'all', combinedStatusFilter !== 'all'
  ].filter(Boolean).length;

  // Loading State
  if (statsLoading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground mt-4">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background font-sans text-right pb-8" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))` }}
            >
              <Gavel className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                إدارة المتعثرات المالية
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                متابعة العملاء والعقود المتأخرة عن السداد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshDelinquentCustomers.mutate()}
              disabled={refreshDelinquentCustomers.isPending}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4", refreshDelinquentCustomers.isPending && "animate-spin")} />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-2 rounded-xl">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 rounded-xl">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير</span>
            </Button>
          </div>
        </motion.div>

        {/* Executive Summary Banner */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border bg-card p-5 shadow-sm overflow-hidden"
            style={{
              background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
              borderColor: `hsl(${colors.primary} / 0.3)`
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Target className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-white">ملخص تنفيذي</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-white/10 p-3 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setRiskLevelFilter('CRITICAL')}>
                <p className="text-xs text-white/70">يحتاجون إجراء فوري</p>
                <p className="text-xl font-bold text-white">{stats.criticalRisk + stats.highRisk} عميل</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setOverduePeriodFilter('>90')}>
                <p className="text-xs text-white/70">تجاوزوا 90 يوم</p>
                <p className="text-xl font-bold text-white">{stats.criticalRisk} عميل</p>
                <p className="text-xs text-white/50">{formatCurrency(stats.totalAmountAtRisk * 0.6)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-white/70">إجمالي المستحقات</p>
                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalAmountAtRisk)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-xs text-white/70">يحتاجون قضية قانونية</p>
                <p className="text-xl font-bold text-white">{stats.needLegalCase} عميل</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              title="إجمالي العملاء المتأخرين"
              value={stats.totalDelinquent}
              subtitle={`${stats.criticalRisk + stats.highRisk} عميل عالي المخاطر`}
              icon={Users}
              color={colors.primary}
              isActive={riskLevelFilter === 'all'}
              onClick={() => setRiskLevelFilter('all')}
            />
            <StatCard
              title="المبالغ المعرضة للخطر"
              value={formatCurrency(stats.totalAmountAtRisk)}
              subtitle="إيجارات متأخرة"
              icon={DollarSign}
              color={colors.destructive}
            />
            <StatCard
              title="الغرامات المتراكمة"
              value={formatCurrency(stats.totalPenalties)}
              subtitle={`متوسط ${Math.round(stats.averageDaysOverdue)} يوم تأخير`}
              icon={AlertTriangle}
              color={colors.accentForeground}
            />
            <StatCard
              title="يحتاجون إجراء فوري"
              value={stats.criticalRisk + stats.highRisk}
              subtitle={`${stats.needLegalCase} يحتاجون قضية قانونية`}
              icon={Zap}
              color={colors.destructive}
              isActive={riskLevelFilter === 'CRITICAL'}
              onClick={() => setRiskLevelFilter('CRITICAL')}
            />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <QuickAction
            icon={Mail}
            label="إرسال تذكيرات"
            description="تذكير جماعي للعملاء"
            color={colors.primary}
            onClick={() => toast.info('سيتم فتح نافذة إرسال التذكيرات')}
          />
          <QuickAction
            icon={Phone}
            label="جدولة مكالمات"
            description="تنظيم المكالمات"
            color={colors.accentForeground}
            onClick={() => toast.info('سيتم فتح نافذة جدولة المكالمات')}
          />
          <QuickAction
            icon={AlertTriangle}
            label="الحالات العاجلة"
            description={`${stats?.criticalRisk || 0} عميل حرج`}
            color={colors.destructive}
            badge={stats?.criticalRisk}
            onClick={() => setRiskLevelFilter('CRITICAL')}
          />
          <QuickAction
            icon={FileText}
            label="بيانات تقاضي"
            description="إدارة الدعاوى"
            color={colors.primaryDark}
            onClick={() => navigate('/legal/lawsuit-data')}
          />
        </motion.div>

        {/* Today's Tasks */}
        {(todaysTasks.urgentCalls.length > 0 || todaysTasks.highRisk.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-5 shadow-sm"
            style={{ borderColor: `hsl(${colors.primary} / 0.2)` }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `hsl(${colors.primary})` }}>
                <CalendarClock className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-foreground">مهام اليوم</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {todaysTasks.urgentCalls.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: `hsl(${colors.destructive} / 0.2)` }}>
                  <p className="font-semibold text-sm mb-3" style={{ color: `hsl(${colors.destructive})` }}>
                    مكالمات عاجلة ({todaysTasks.urgentCalls.length})
                  </p>
                  <div className="space-y-2">
                    {todaysTasks.urgentCalls.map((c) => (
                      <div key={`${c.customer_id}-${c.contract_id}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-sm">{c.customer_name}</span>
                        <Badge style={{ backgroundColor: `hsl(${colors.destructive})`, color: 'white' }}>
                          {c.days_overdue} يوم
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {todaysTasks.highRisk.length > 0 && (
                <div className="rounded-xl border p-4" style={{ borderColor: `hsl(${colors.warning} / 0.2)` }}>
                  <p className="font-semibold text-sm mb-3" style={{ color: `hsl(${colors.warning})` }}>
                    مخاطر عالية ({todaysTasks.highRisk.length})
                  </p>
                  <div className="space-y-2">
                    {todaysTasks.highRisk.map((customer) => (
                      <div key={`${customer.customer_id}-${customer.contract_id}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <span className="text-sm">{customer.customer_name}</span>
                        <span className="text-xs text-muted-foreground">{customer.risk_score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 h-12 rounded-xl bg-muted p-1 border">
              <TabsTrigger value="customers" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                <Users className="w-4 h-4" />
                حسب العميل ({customers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold">
                <FileText className="w-4 h-4" />
                حسب العقد ({overdueContracts?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Customers Tab */}
            <TabsContent value="customers" className="mt-0 space-y-6">
              {/* Filters & Controls */}
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                {/* Risk Level Filters */}
                <div className="border-b bg-muted/30 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">مستوى المخاطر:</span>
                    {[
                      { id: 'all', label: 'الكل', count: customers?.length || 0, color: colors.primary },
                      { id: 'CRITICAL', label: 'حرج', count: stats?.criticalRisk || 0, color: colors.destructive },
                      { id: 'HIGH', label: 'عالي', count: stats?.highRisk || 0, color: colors.accentForeground },
                      { id: 'MEDIUM', label: 'متوسط', count: stats?.mediumRisk || 0, color: colors.warning },
                      { id: 'LOW', label: 'منخفض', count: stats?.lowRisk || 0, color: colors.success },
                    ].map(({ id, label, count, color }) => (
                      <button
                        key={id}
                        onClick={() => { setRiskLevelFilter(id === 'all' ? 'all' : id); setCurrentPage(1); }}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all",
                          riskLevelFilter === id
                            ? "text-white shadow-md"
                            : "hover:bg-opacity-80 border"
                        )}
                        style={{
                          backgroundColor: riskLevelFilter === id ? `hsl(${color})` : `hsl(${color} / 0.1)`,
                          color: riskLevelFilter === id ? 'white' : `hsl(${color})`,
                          borderColor: `hsl(${color} / 0.3)`
                        }}
                      >
                        <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                        {label}
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-white/20">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Filters */}
                <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          placeholder="بحث بالاسم، رقم العميل، العقد، أو المركبة..."
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                          className="pr-12 h-11 rounded-xl"
                        />
                      </div>

                      {/* View Mode */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">العرض:</span>
                        <div className="inline-flex bg-muted rounded-lg p-1">
                          {[
                            { id: 'cards', icon: LayoutGrid, label: 'بطاقات' },
                            { id: 'compact', icon: List, label: 'مختصر' },
                            { id: 'kanban', icon: Columns, label: 'Kanban' },
                          ].map(({ id, icon: Icon, label }) => (
                            <button
                              key={id}
                              onClick={() => setViewMode(id as ViewMode)}
                              className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all',
                                viewMode === id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="hidden sm:inline">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sort */}
                      <div className="flex items-center gap-2">
                        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                          <SelectTrigger className="w-[140px] h-9 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="total_debt">المبلغ المستحق</SelectItem>
                            <SelectItem value="days_overdue">أيام التأخير</SelectItem>
                            <SelectItem value="risk_score">مستوى المخاطر</SelectItem>
                            <SelectItem value="last_contact_days">آخر تواصل</SelectItem>
                            <SelectItem value="customer_name">اسم العميل</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="h-9 w-9 p-0 rounded-lg"
                        >
                          {sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                        </Button>
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-lg">
                          <Filter className="w-4 h-4" />
                          <span>فلاتر متقدمة</span>
                          <ChevronDown className={cn('w-4 h-4 transition-transform', filtersExpanded && 'rotate-180')} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Select value={overduePeriodFilter} onValueChange={(v) => { setOverduePeriodFilter(v); setCurrentPage(1); }}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <Clock className="w-4 h-4 ml-2 text-muted-foreground" />
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

                        <Select value={amountRangeFilter} onValueChange={(v) => { setAmountRangeFilter(v); setCurrentPage(1); }}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <DollarSign className="w-4 h-4 ml-2 text-muted-foreground" />
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

                        <Select value={violationsFilter} onValueChange={(v) => { setViolationsFilter(v); setCurrentPage(1); }}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <AlertCircle className="w-4 h-4 ml-2 text-muted-foreground" />
                            <SelectValue placeholder="المخالفات" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">الكل</SelectItem>
                            <SelectItem value="yes">يوجد مخالفات</SelectItem>
                            <SelectItem value="no">لا يوجد مخالفات</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={combinedStatusFilter} onValueChange={(v) => { setCombinedStatusFilter(v); setCurrentPage(1); }}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <FileText className="w-4 h-4 ml-2 text-muted-foreground" />
                            <SelectValue placeholder="الحالة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الحالات</SelectItem>
                            <SelectItem value="active">نشط</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                            <SelectItem value="closed">مغلق</SelectItem>
                            <SelectItem value="under_legal_procedure">تحت الإجراء القانوني</SelectItem>
                            <SelectItem value="verified">تم التدقيق</SelectItem>
                            <SelectItem value="pending">قيد التدقيق</SelectItem>
                            <SelectItem value="not_verified">لم يتم التدقيق</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Bulk Actions Bar */}
                {selectedCustomers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t px-4 py-3 bg-muted/30"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="text-sm px-3 py-1">
                        تم تحديد {selectedCustomers.length} عميل
                      </Badge>
                      <Button
                        size="sm"
                        onClick={handleQuickBulkDownload}
                        className="gap-2 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
                          color: 'white',
                        }}
                      >
                        <Download className="h-4 w-4" />
                        تحميل المستندات
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => setVerificationTaskDialogOpen(true)}
                      >
                        <UserCheck className="h-4 w-4" />
                        إرسال للتدقيق
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        disabled={bulkDeleting}
                        className="gap-2 rounded-xl text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف نهائي
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedCustomers([]); setSelectedIds(new Set()); }}
                      >
                        إلغاء التحديد
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Content Area */}
              {customersLoading ? (
                <div className="flex items-center justify-center h-80">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !customers || customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 text-center rounded-2xl border bg-card p-8">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl mb-6" style={{ backgroundColor: `hsl(${colors.success} / 0.1)` }}>
                    <CheckCircle className="w-12 h-12" style={{ color: `hsl(${colors.success})` }} />
                  </div>
                  <p className="text-foreground text-2xl font-bold mb-3">لا يوجد عملاء متأخرين!</p>
                  <p className="text-muted-foreground">جميع العملاء يدفعون في الوقت المحدد</p>
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" onClick={clearFilters} className="mt-4 rounded-xl">
                      إلغاء الفلاتر
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Cards View */}
                  {viewMode === 'cards' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border bg-card p-4 flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm">تحديد الكل</span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {paginatedCustomers.map((customer, index) => (
                          <CustomerCard
                            key={`${customer.customer_id}-${customer.contract_id}`}
                            customer={customer}
                            index={index}
                            isSelected={selectedIds.has(customer.customer_id)}
                            onSelect={(checked) => handleSelectCustomer(customer, checked)}
                            onViewDetails={() => navigate(`/customers/${customer.customer_id}`)}
                            onRecordPayment={() => navigate(`/finance/payments/quick?customerId=${customer.customer_id}`)}
                            onSendWarning={() => { toast.info(`إرسال إنذار لـ ${customer.customer_name}`); }}
                            onCreateCase={() => navigate(`/legal/lawsuit/prepare/${customer.contract_id}`)}
                            onConvertToCase={() => handleConvertToOfficialCase(customer)}
                            isGenerated={generatedCustomerIds.has(customer.contract_id)}
                            verificationStatus={verificationStatuses?.get(customer.contract_id)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Compact View */}
                  {viewMode === 'compact' && (
                    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>العميل</TableHead>
                            <TableHead>العقد</TableHead>
                            <TableHead>المستحق</TableHead>
                            <TableHead>الأيام</TableHead>
                            <TableHead>المخاطر</TableHead>
                            <TableHead className="text-center">إجراء</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedCustomers.map((customer) => (
                            <TableRow key={`${customer.customer_id}-${customer.contract_id}`}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(customer.customer_id)}
                                  onCheckedChange={(checked) => handleSelectCustomer(customer, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customer.customer_name}</p>
                                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm font-semibold text-teal-600">{customer.contract_number}</p>
                                <p className="text-xs text-muted-foreground">{customer.vehicle_plate}</p>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold">{formatCurrency(customer.total_debt || 0)}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{customer.days_overdue} يوم</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={cn(
                                  customer.risk_level === 'CRITICAL' && "bg-red-500",
                                  customer.risk_level === 'HIGH' && "bg-orange-500",
                                  customer.risk_level === 'MEDIUM' && "bg-amber-500"
                                )}>
                                  {getRiskLabel(customer.risk_level || 'LOW')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${customer.customer_id}`)}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => navigate(`/finance/payments/quick?customerId=${customer.customer_id}`)}>
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Kanban View */}
                  {viewMode === 'kanban' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as RiskLevel[]).map((level) => {
                        const groupCustomers = customers.filter(c => c.risk_level === level || (!c.risk_level && level === 'LOW'));
                        const levelColor = getRiskColor(level);
                        return (
                          <div key={level} className="rounded-2xl border-2 bg-card overflow-hidden" style={{ borderColor: `hsl(${levelColor} / 0.3)` }}>
                            <div className="p-4 border-b" style={{ backgroundColor: `hsl(${levelColor} / 0.1)`, borderColor: `hsl(${levelColor} / 0.2)` }}>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `hsl(${levelColor})` }}>
                                  <AlertTriangle className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-foreground">{getRiskLabel(level)}</p>
                                  <p className="text-xs text-muted-foreground">{groupCustomers.length} عميل</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                              {groupCustomers.slice(0, 10).map((customer) => (
                                <motion.div
                                  key={`${customer.customer_id}-${customer.contract_id}`}
                                  whileHover={{ scale: 1.02 }}
                                  className="p-3 rounded-xl border cursor-pointer"
                                  style={{ borderColor: `hsl(${levelColor} / 0.2)` }}
                                  onClick={() => navigate(`/customers/${customer.customer_id}`)}
                                >
                                  <p className="font-semibold text-sm">{customer.customer_name}</p>
                                  <p className="text-xs text-muted-foreground">{customer.contract_number}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-bold" style={{ color: `hsl(${levelColor})` }}>
                                      {formatCurrency(customer.total_debt || 0)}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px]">{customer.days_overdue} يوم</Badge>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">
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
                        <span className="text-sm px-3 font-semibold">{currentPage} / {totalPages}</span>
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
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="mt-0">
              {contractsLoading ? (
                <div className="flex items-center justify-center h-80">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !overdueContracts.length ? (
                <div className="flex flex-col items-center justify-center h-80 text-center rounded-2xl border bg-card p-8">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl mb-6" style={{ backgroundColor: `hsl(${colors.success} / 0.1)` }}>
                    <CheckCircle className="w-12 h-12" style={{ color: `hsl(${colors.success})` }} />
                  </div>
                  <p className="text-foreground text-2xl font-bold mb-3">ممتاز! لا توجد عقود متأخرة</p>
                  <p className="text-muted-foreground">جميع العملاء يسددون التزاماتهم في الوقت المحدد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {overdueContracts.map((contract, idx) => (
                      <ContractCard
                        key={contract.contract_id || idx}
                        contract={contract}
                        index={idx}
                        onViewLawsuit={() => navigate(`/legal/lawsuit/prepare/${contract.contract_id}`)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Dialogs */}
        {/* Bulk Delete Confirmation */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                تأكيد الحذف النهائي
              </AlertDialogTitle>
              <AlertDialogDescription>
                <p>أنت على وشك حذف <strong>{selectedCustomers.length} عقد</strong> نهائياً.</p>
                <p className="font-semibold text-red-600 mt-2">⚠️ هذا الإجراء لا يمكن التراجع عنه!</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel disabled={bulkDeleting}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDeleteContracts}
                disabled={bulkDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {bulkDeleting ? 'جاري الحذف...' : `حذف ${selectedCustomers.length} عقد`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Generation Progress */}
        <Dialog open={bulkGenerationDialogOpen} onOpenChange={setBulkGenerationDialogOpen}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                تحميل المستندات
              </DialogTitle>
            </DialogHeader>
            {bulkGenerationProgress && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span>التقدم:</span>
                  <span className="font-bold">{bulkGenerationProgress.current} / {bulkGenerationProgress.total}</span>
                </div>
                <Progress value={(bulkGenerationProgress.current / bulkGenerationProgress.total) * 100} className="h-3" />
                {bulkGenerationProgress.currentCustomer && (
                  <p className="text-sm text-muted-foreground">جاري معالجة: {bulkGenerationProgress.currentCustomer}</p>
                )}
                {bulkGenerationProgress.errors.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-600">
                    أخطاء: {bulkGenerationProgress.errors.length}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send Verification Task Dialog */}
        <SendVerificationTaskDialog
          open={verificationTaskDialogOpen}
          onOpenChange={setVerificationTaskDialogOpen}
          selectedCustomers={selectedCustomers}
          onSuccess={() => {
            setSelectedCustomers([]);
            setSelectedIds(new Set());
          }}
        />
      </div>
    </div>
  );
};

export default FinancialDelinquencyPage;
