/**
 * صفحة العملاء المتأخرين عن الدفع - التصميم المعاد
 * متوافق مع ألوان النظام (Teal) وتصميم الداشبورد الرئيسي
 *
 * @component DelinquentCustomersTab
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Gavel,
  LayoutGrid,
  List,
  Columns,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarClock,
  Target,
  PhoneCall,
  ChevronDown,
  Calendar,
  Car as CarIcon,
  Building2,
  User,
  Wallet,
  UserCheck,
  ClipboardCheck,
  Loader2,
  FolderArchive,
  Scale,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useDelinquentCustomers, type DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { useRefreshDelinquentCustomers } from '@/hooks/useDelinquentCustomers';
import { useVerificationStatuses } from '@/hooks/useVerificationTasks';
import { useConvertToLegalCase } from '@/hooks/useConvertToLegalCase';
import { useGenerateLegalWarning } from '@/hooks/useGenerateLegalWarning';
import { useContractOperations } from '@/hooks/business/useContractOperations';
import LegalWarningDialog from './LegalWarningDialog';
import { CreateLegalCaseDialog } from './CreateLegalCaseDialog';
import { DelinquentDetailsDialog } from './DelinquentDetailsDialog';
import { BulkRemindersDialog } from './BulkRemindersDialog';
import { ScheduleCallsDialog } from './ScheduleCallsDialog';
import { SendVerificationTaskDialog } from './SendVerificationTaskDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { GeneratedWarning } from '@/hooks/useGenerateLegalWarning';
import { 
  generateBulkDocumentsZip, 
  downloadZipFile, 
  updateCustomersToOpeningComplaint,
  convertToOfficialCase,
  type BulkCustomerData,
  type BulkGenerationProgress,
} from '@/utils/bulkDocumentGenerator';
import { Progress } from '@/components/ui/progress';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { colors, type ViewMode, type SortField, type SortDirection } from './delinquent-customers';
import { RiskBadge } from './delinquent-customers';
import { InfoChip } from './delinquent-customers';

// ===== Main Component =====
export const DelinquentCustomersTab: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [overduePeriodFilter, setOverduePeriodFilter] = useState<string>('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>('all');
  const [violationsFilter, setViolationsFilter] = useState<string>('all');
  // فلتر موحد للحالات (حالة العقد + حالة التدقيق)
  const [combinedStatusFilter, setCombinedStatusFilter] = useState<string>('all');
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
  const [verificationTaskDialogOpen, setVerificationTaskDialogOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  
  // Bulk Document Generation States
  const [documentSelectionDialogOpen, setDocumentSelectionDialogOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState({
    explanatoryMemo: true,        // المذكرة الشارحة
    claimsStatement: true,        // كشف المطالبات المالية (يشمل المخالفات)
    documentsList: true,          // كشف المستندات المرفوعة
    violationsList: false,        // غير مستخدم - المخالفات مدمجة في كشف المطالبات
    criminalComplaint: true,      // بلاغ سرقة المركبة
    violationsTransfer: true,     // طلب تحويل المخالفات
  });
  const [bulkGenerationDialogOpen, setBulkGenerationDialogOpen] = useState(false);
  const [bulkGenerationProgress, setBulkGenerationProgress] = useState<BulkGenerationProgress | null>(null);
  const [generatedCustomerIds, setGeneratedCustomerIds] = useState<Set<string>>(new Set());

  // New UX States
  const [itemsPerPage, setItemsPerPage] = useState(20); // زيادة من 12 إلى 20
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('total_debt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showTodayTasks, setShowTodayTasks] = useState(true);

  // Hooks
  const { companyId } = useUnifiedCompanyAccess();
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

  // Get verification statuses for customers
  const contractIds = useMemo(() => 
    (rawCustomers || []).map(c => c.contract_id).filter(Boolean),
    [rawCustomers]
  );
  const { data: verificationStatuses } = useVerificationStatuses(contractIds);

  // Apply combined status filter locally (contract status + verification status)
  const filteredCustomers = useMemo(() => {
    if (!rawCustomers) return [];
    let result = rawCustomers;
    
    if (combinedStatusFilter !== 'all') {
      // حالات العقد
      if (['active', 'cancelled', 'closed', 'under_legal_procedure'].includes(combinedStatusFilter)) {
        result = result.filter(c => c.contract_status === combinedStatusFilter);
      }
      // حالات التدقيق
      else if (combinedStatusFilter === 'verified' && verificationStatuses) {
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
    const sorted = [...filteredCustomers].sort((a, b) => {
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
        case 'last_contact_days':
          aVal = a.last_contact_days || 0;
          bVal = b.last_contact_days || 0;
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
    return sorted;
  }, [filteredCustomers, sortField, sortDirection]);

  // Calculate today's tasks (customers needing immediate action)
  const todaysTasks = useMemo(() => {
    if (!customers) return { urgentCalls: [], noContact7Days: [], promisedPayments: [] };

    const urgentCalls = customers.filter(c =>
      c.risk_level === 'CRITICAL' || (c.days_overdue || 0) > 90
    ).slice(0, 5);

    const noContact7Days = customers.filter(c =>
      (c.last_contact_days || 0) >= 7
    ).slice(0, 5);

    return { urgentCalls, noContact7Days, promisedPayments: [] };
  }, [customers]);

  // Executive summary calculations
  const executiveSummary = useMemo(() => {
    if (!customers) return { urgentToday: 0, over90Days: 0, over90Amount: 0, noContactWeek: 0 };

    const urgentToday = customers.filter(c => c.risk_level === 'CRITICAL').length;
    const over90Days = customers.filter(c => (c.days_overdue || 0) > 90).length;
    const over90Amount = customers
      .filter(c => (c.days_overdue || 0) > 90)
      .reduce((sum, c) => sum + (c.total_debt || 0), 0);
    const noContactWeek = customers.filter(c => (c.last_contact_days || 0) >= 7).length;

    return { urgentToday, over90Days, over90Amount, noContactWeek };
  }, [customers]);

  // Kanban grouped customers
  const kanbanGroups = useMemo(() => {
    if (!customers) return { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };

    return {
      CRITICAL: customers.filter(c => c.risk_level === 'CRITICAL'),
      HIGH: customers.filter(c => c.risk_level === 'HIGH'),
      MEDIUM: customers.filter(c => c.risk_level === 'MEDIUM'),
      LOW: customers.filter(c => c.risk_level === 'LOW' || !c.risk_level),
    };
  }, [customers]);

  // Handle sort toggle
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

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
    if (checked && paginatedCustomers) {
      const allIds = new Set(paginatedCustomers.map(c => c.customer_id));
      setSelectedIds(allIds);
      setSelectedCustomers(paginatedCustomers);
    } else {
      setSelectedIds(new Set());
      setSelectedCustomers([]);
    }
  }, [paginatedCustomers]);

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

  // Handle bulk actions - generate documents for all selected customers
  const handleBulkCreateCases = useCallback(async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عملاء');
      return;
    }

    setBulkGenerationDialogOpen(true);
    setBulkGenerationProgress({
      current: 0,
      total: selectedCustomers.length,
      currentCustomer: '',
      status: 'generating',
      errors: [],
    });

    try {
      // تحويل بيانات العملاء للصيغة المطلوبة
      const customersData: BulkCustomerData[] = selectedCustomers.map(c => ({
        contract_id: c.contract_id,
        contract_number: c.contract_number,
        customer_name: c.customer_name,
        customer_id: c.customer_id,
        national_id: c.national_id,
        phone: c.phone,
        total_due: c.total_due,
        days_overdue: c.days_overdue,
      }));

      // إنشاء ملف ZIP مع جميع المستندات
      const zipBlob = await generateBulkDocumentsZip(customersData, companyId, (progress) => {
        setBulkGenerationProgress(progress);
      }, selectedDocuments);

      // تحميل الملف
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
      downloadZipFile(zipBlob, `قضايا_${selectedCustomers.length}_عميل_${timestamp}.zip`);

      // تحديث حالة العملاء إلى "جاري فتح بلاغ"
      const contractIds = selectedCustomers.map(c => c.contract_id);
      await updateCustomersToOpeningComplaint(contractIds);

      // تحديث الحالة المحلية
      setGeneratedCustomerIds(prev => {
        const newSet = new Set(prev);
        contractIds.forEach(id => newSet.add(id));
        return newSet;
      });

      toast.success(`✅ تم إنشاء وتحميل مستندات ${selectedCustomers.length} عميل بنجاح`);
      
      // إعادة تحميل البيانات
      refreshDelinquentCustomers.mutate();
      
      // إلغاء التحديد
      setSelectedCustomers([]);
      setSelectedIds(new Set());
      
    } catch (error) {
      console.error('Error in bulk document generation:', error);
      toast.error('حدث خطأ أثناء إنشاء المستندات');
    } finally {
      setTimeout(() => {
        setBulkGenerationDialogOpen(false);
        setBulkGenerationProgress(null);
      }, 2000);
    }
  }, [selectedCustomers, selectedDocuments, refreshDelinquentCustomers]);

  // تحميل سريع - جميع المستندات بدون dialog
  const handleQuickBulkDownload = useCallback(async () => {
    if (selectedCustomers.length === 0) {
      toast.error('لم يتم تحديد أي عملاء');
      return;
    }

    setBulkGenerationDialogOpen(true);
    setBulkGenerationProgress({
      current: 0,
      total: selectedCustomers.length,
      currentCustomer: '',
      status: 'generating',
      errors: [],
    });

    try {
      toast.loading(`جاري تحميل المستندات لـ ${selectedCustomers.length} عميل...`);

      // تحويل بيانات العملاء للصيغة المطلوبة
      const customersData: BulkCustomerData[] = selectedCustomers.map(c => ({
        contract_id: c.contract_id,
        contract_number: c.contract_number,
        customer_name: c.customer_name,
        customer_id: c.customer_id,
        national_id: c.national_id,
        phone: c.phone,
        total_due: c.total_due,
        days_overdue: c.days_overdue,
      }));

      // جميع المستندات مفعلة بشكل افتراضي (ما عدا violationsList لأنه مدمج في claims)
      const allDocumentsOptions = {
        explanatoryMemo: true,
        claimsStatement: true,
        documentsList: true,
        violationsList: false,  // المخالفات مدمجة في كشف المطالبات
        criminalComplaint: false, // بلاغ السرقة اختياري - لا يتم تحميله تلقائياً
        violationsTransfer: false, // طلب تحويل المخالفات اختياري - لا يتم تحميله تلقائياً
      };

      // إنشاء ملف ZIP مع جميع المستندات
      const zipBlob = await generateBulkDocumentsZip(customersData, companyId, (progress) => {
        setBulkGenerationProgress(progress);
      }, allDocumentsOptions);

      // تحميل الملف
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
  }, [selectedCustomers]);

  // تحويل عميل واحد إلى قضية رسمية
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
      
      // إزالة العميل من قائمة "جاري فتح بلاغ"
      setGeneratedCustomerIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(customer.contract_id);
        return newSet;
      });
      
      // الانتقال لصفحة القضايا
      navigate(`/legal/cases/${caseId}`);
      
      // إعادة تحميل البيانات
      refreshDelinquentCustomers.mutate();
    } catch (error) {
      toast.dismiss();
      console.error('Error converting to official case:', error);
      toast.error('حدث خطأ أثناء إنشاء القضية');
    }
  }, [companyId, navigate, refreshDelinquentCustomers]);

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
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #14b8a6; padding-bottom: 16px; margin-bottom: 20px; }
          .company-info { text-align: right; }
          .company-name { font-size: 22px; font-weight: bold; color: #0d9488; }
          .report-title { text-align: center; padding: 10px 30px; border: 2px solid #14b8a6; border-radius: 8px; background: #f0fdfa; }
          .title-text { font-size: 18px; font-weight: bold; color: #0d9488; }
          .logo { width: 100px; height: auto; }
          .summary { display: flex; justify-content: center; gap: 40px; margin: 20px 0; padding: 16px; background: #f0fdfa; border-radius: 8px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 28px; font-weight: bold; color: #0d9488; }
          .summary-label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 10px 6px; font-weight: bold; text-align: right; }
          td { padding: 8px 6px; border: 1px solid #e5e7eb; text-align: right; }
          tr:nth-child(even) { background: #f9fafb; }
          .amount { font-weight: bold; color: #0d9488; }
          .risk-critical { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .risk-high { background: #ffedd5; color: #ea580c; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .risk-medium { background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
          .risk-low { background: #d1fae5; color: #059669; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
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
          <div class="summary-item" style="border-right: 2px solid #14b8a6; padding-right: 20px;">
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
                <td style="color: #ea580c;">${(c.late_penalty || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="color: #dc2626;">${(c.violations_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}${c.violations_count > 0 ? ` (${c.violations_count})` : ''}</td>
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
    setCombinedStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const activeFiltersCount = [
    searchTerm,
    riskLevelFilter !== 'all',
    overduePeriodFilter !== 'all',
    amountRangeFilter !== 'all',
    violationsFilter !== 'all',
    combinedStatusFilter !== 'all',
  ].filter(Boolean).length;

  // Loading state
  if (statsLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: `hsl(${colors.primary})`, borderTopColor: 'transparent' }}
          />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card p-4 shadow-sm"
        style={{
          background: `linear-gradient(135deg, hsl(${colors.accent} / 0.3), hsl(${colors.accent} / 0.1))`,
          borderColor: `hsl(${colors.accentForeground} / 0.3)`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{ backgroundColor: `hsl(${colors.accentForeground})` }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold" style={{ color: `hsl(${colors.accentForeground})` }}>
                إجراءات سريعة
              </span>
              <p className="text-xs text-muted-foreground">تنفيذ مهام التحصيل المتكررة</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-xl"
              style={{
                borderColor: `hsl(${colors.accentForeground} / 0.4)`,
              }}
              onClick={() => setBulkRemindersDialogOpen(true)}
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">إرسال تذكيرات</span>
              <span className="sm:hidden">تذكيرات</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-xl"
              style={{
                borderColor: `hsl(${colors.accentForeground} / 0.4)`,
              }}
              onClick={() => setScheduleCallsDialogOpen(true)}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">جدولة مكالمات</span>
              <span className="sm:hidden">مكالمات</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-xl"
              style={{
                borderColor: `hsl(${colors.destructive} / 0.4)`,
                color: `hsl(${colors.destructive})`,
              }}
              onClick={() => {
                setRiskLevelFilter('CRITICAL');
                toast.success(`تم تصفية العرض للحالات الحرجة (${customers?.filter(c => c.risk_level === 'CRITICAL').length || 0} عميل)`);
              }}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">الحالات العاجلة</span>
              <span className="sm:hidden">عاجل</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Today's Tasks */}
      {showTodayTasks && (todaysTasks.urgentCalls.length > 0 || todaysTasks.noContact7Days.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-5 shadow-sm"
          style={{
            borderColor: `hsl(${colors.primary} / 0.2)`,
            backgroundColor: `hsl(${colors.primary} / 0.03)`,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
                style={{ backgroundColor: `hsl(${colors.primary})` }}
              >
                <CalendarClock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">مهام اليوم</h3>
                <p className="text-xs text-muted-foreground">أولويات التحصيل لهذا اليوم</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTodayTasks(false)}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Urgent Calls */}
            {todaysTasks.urgentCalls.length > 0 && (
              <div className="rounded-xl border-2 bg-card p-4" style={{ borderColor: `hsl(${colors.destructive} / 0.2)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `hsl(${colors.destructive})` }}
                  >
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: `hsl(${colors.destructive})` }}>
                      مكالمات عاجلة
                    </p>
                    <p className="text-xs text-muted-foreground">{todaysTasks.urgentCalls.length} عميل حرج</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {todaysTasks.urgentCalls.slice(0, 3).map((c, i) => (
                    <motion.div
                      key={c.customer_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{ borderColor: `hsl(${colors.destructive} / 0.15)` }}
                      onClick={() => handleViewDetails(c)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm font-semibold truncate">{c.customer_name}</span>
                        <Badge
                          className="text-[10px] px-2 py-0 gap-1"
                          style={{
                            backgroundColor: `hsl(${colors.destructive} / 0.1)`,
                            color: `hsl(${colors.destructive})`,
                            borderColor: `hsl(${colors.destructive} / 0.2)`,
                          }}
                        >
                          <Clock className="w-3 h-3" />
                          {c.days_overdue} يوم
                        </Badge>
                      </div>
                      <span
                        className="text-sm font-bold flex-shrink-0"
                        style={{ color: `hsl(${colors.destructive})` }}
                      >
                        {formatCurrency(c.total_debt || 0)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* No Contact in 7 Days */}
            {todaysTasks.noContact7Days.length > 0 && (
              <div className="rounded-xl border-2 bg-card p-4" style={{ borderColor: `hsl(${colors.warning} / 0.2)` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `hsl(${colors.warning})` }}
                  >
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: `hsl(${colors.warning})` }}>
                      لم يتم التواصل
                    </p>
                    <p className="text-xs text-muted-foreground">منذ 7 أيام أو أكثر</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {todaysTasks.noContact7Days.slice(0, 3).map((c, i) => (
                    <motion.div
                      key={c.customer_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{ borderColor: `hsl(${colors.warning} / 0.15)` }}
                      onClick={() => handleViewDetails(c)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm font-semibold truncate">{c.customer_name}</span>
                        <Badge
                          className="text-[10px] px-2 py-0 gap-1"
                          style={{
                            backgroundColor: `hsl(${colors.warning} / 0.1)`,
                            color: `hsl(${colors.warning})`,
                            borderColor: `hsl(${colors.warning} / 0.2)`,
                          }}
                        >
                          <Calendar className="w-3 h-3" />
                          {c.last_contact_days} يوم
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg flex-shrink-0"
                        style={{ color: `hsl(${colors.warning})` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (c.phone) {
                            window.open(`tel:${c.phone}`, '_self');
                          }
                        }}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Cancelled Contracts Warning */}
      {customers && customers.filter(c => c.contract_status === 'cancelled').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-4 shadow-sm"
          style={{
            borderColor: `hsl(${colors.destructive} / 0.3)`,
            backgroundColor: `hsl(${colors.destructive} / 0.05)`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl shadow-md"
                style={{ backgroundColor: `hsl(${colors.destructive})` }}
              >
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base" style={{ color: `hsl(${colors.destructive})` }}>
                  {customers.filter(c => c.contract_status === 'cancelled').length} عقد ملغي يحتاج متابعة
                </h3>
                <p className="text-sm text-muted-foreground">
                  هذه العقود ملغية ولكن لا تزال هناك مستحقات مالية على العملاء
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2 rounded-xl shrink-0"
              style={{
                borderColor: `hsl(${colors.destructive} / 0.4)`,
                color: `hsl(${colors.destructive})`,
              }}
              onClick={() => { setContractStatusFilter('cancelled'); setCurrentPage(1); }}
            >
              <Filter className="w-4 h-4" />
              عرض الملغية فقط
            </Button>
          </div>
        </motion.div>
      )}

      {/* Page Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
            }}
          >
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              العملاء المتأخرون عن الدفع
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              تتبع ومتابعة العملاء المتأخرين • آخر تحديث: {format(new Date(), 'dd MMM yyyy', { locale: ar })}
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
            <RefreshCw className={cn('h-4 w-4', refreshDelinquentCustomers.isPending && 'animate-spin')} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReport}
            className="gap-2 rounded-xl"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2 rounded-xl"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">تصدير</span>
          </Button>
        </div>
      </div>

      {/* Filters & Controls Section */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden" style={{ borderColor: `hsl(${colors.border})` }}>
        {/* Risk Level Status Bar */}
        <div className="border-b bg-muted/30 px-4 py-3" style={{ borderColor: `hsl(${colors.border})` }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium ml-2">مستوى المخاطر:</span>

            {[
              { id: 'CRITICAL', label: 'حرج', count: stats?.criticalRisk || 0, color: 'red' },
              { id: 'HIGH', label: 'عالي', count: stats?.highRisk || 0, color: 'orange' },
              { id: 'MEDIUM', label: 'متوسط', count: stats?.mediumRisk || 0, color: 'amber' },
              { id: 'LOW', label: 'منخفض', count: stats?.lowRisk || 0, color: 'emerald' },
            ].map(({ id, label, count, color }) => (
              <button
                key={id}
                onClick={() => handleStatCardClick(id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all',
                  riskLevelFilter === id
                    ? `bg-${color}-500 text-white shadow-md`
                    : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100 border border-${color}-200`,
                  // Fallback classes for Tailwind JIT
                  id === 'CRITICAL' && (riskLevelFilter === id ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'),
                  id === 'HIGH' && (riskLevelFilter === id ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'),
                  id === 'MEDIUM' && (riskLevelFilter === id ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'),
                  id === 'LOW' && (riskLevelFilter === id ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'),
                )}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                {label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs font-bold',
                    riskLevelFilter === id ? 'bg-white/20' : `bg-${color}-100`,
                  )}
                >
                  {count}
                </span>
              </button>
            ))}

            {/* Contract Status Quick Filters */}
            <div className="flex items-center gap-1 mr-4 pr-4 border-r" style={{ borderColor: `hsl(${colors.border})` }}>
              <span className="text-sm text-muted-400 ml-2">العقد:</span>
              {[
                { id: 'active', label: 'نشط', count: rawCustomers?.filter(c => c.contract_status === 'active').length || 0, color: 'emerald', icon: CheckCircle },
                { id: 'cancelled', label: 'ملغي', count: rawCustomers?.filter(c => c.contract_status === 'cancelled').length || 0, color: 'red', icon: X },
                { id: 'closed', label: 'مغلق', count: rawCustomers?.filter(c => c.contract_status === 'closed').length || 0, color: 'slate', icon: CheckCircle },
                { id: 'under_legal_procedure', label: 'قانوني', count: rawCustomers?.filter(c => c.contract_status === 'under_legal_procedure').length || 0, color: 'violet', icon: Gavel },
                // حالات التدقيق
                { id: 'verified', label: 'تم التدقيق', count: rawCustomers?.filter(c => verificationStatuses?.get(c.contract_id)?.status === 'verified').length || 0, color: 'blue', icon: ClipboardCheck },
                { id: 'pending', label: 'قيد التدقيق', count: rawCustomers?.filter(c => verificationStatuses?.get(c.contract_id)?.status === 'pending').length || 0, color: 'amber', icon: Clock },
              ]
                .filter(f => f.count > 0)
                .map(({ id, label, count, color, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setCombinedStatusFilter(combinedStatusFilter === id ? 'all' : id);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                      combinedStatusFilter === id
                        ? id === 'cancelled' ? 'bg-red-500 text-white'
                        : id === 'closed' ? 'bg-slate-500 text-white'
                        : id === 'under_legal_procedure' ? 'bg-violet-500 text-white'
                        : id === 'verified' ? 'bg-blue-500 text-white'
                        : id === 'pending' ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500 text-white'
                        : id === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                          : id === 'closed' ? 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                            : id === 'under_legal_procedure' ? 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
                            : id === 'verified' ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : id === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100',
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                    <span className="bg-white/20 px-1 rounded text-[10px] font-bold">{count}</span>
                  </button>
                ))}
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all mr-auto"
              >
                <X className="w-3 h-3" />
                إلغاء الفلاتر ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
          <div className="border-b px-4 py-3" style={{ borderColor: `hsl(${colors.border})` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">العرض:</span>
                  <div className="inline-flex bg-muted rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all',
                        viewMode === 'cards'
                          ? 'bg-white shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">بطاقات</span>
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all',
                        viewMode === 'compact'
                          ? 'bg-white shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">مختصر</span>
                    </button>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-all',
                        viewMode === 'kanban'
                          ? 'bg-white shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Columns className="w-4 h-4" />
                      <span className="hidden sm:inline">Kanban</span>
                    </button>
                  </div>
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ترتيب:</span>
                  <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                    <SelectTrigger className="w-[140px] h-9 rounded-lg text-sm">
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
                    onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="h-9 w-9 p-0 rounded-lg"
                  >
                    {sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Page Size */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">عرض:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-9 rounded-lg text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-lg">
                  <span className="text-sm">فلاتر متقدمة</span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform', filtersExpanded && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent>
            <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: `hsl(${colors.border})` }}>
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم، رقم العميل، العقد، أو المركبة..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pr-12 h-12 rounded-xl"
                />
              </div>

              {/* Filter Row */}
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
                    {/* حالات العقد */}
                    <SelectItem value="active" className="text-emerald-600">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        نشط
                      </span>
                    </SelectItem>
                    <SelectItem value="cancelled" className="text-red-600">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        ملغي
                      </span>
                    </SelectItem>
                    <SelectItem value="closed" className="text-gray-600">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                        مغلق
                      </span>
                    </SelectItem>
                    <SelectItem value="under_legal_procedure" className="text-purple-600">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        تحت الإجراء القانوني
                      </span>
                    </SelectItem>
                    {/* فاصل */}
                    <div className="h-px bg-border my-1" />
                    {/* حالات التدقيق */}
                    <SelectItem value="verified" className="text-blue-600">
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="w-3 h-3" />
                        تم التدقيق
                      </span>
                    </SelectItem>
                    <SelectItem value="pending" className="text-amber-600">
                      <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        قيد التدقيق
                      </span>
                    </SelectItem>
                    <SelectItem value="not_verified" className="text-gray-500">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        لم يتم التدقيق
                      </span>
                    </SelectItem>
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
            exit={{ opacity: 0, height: 0 }}
            className="border-t px-4 py-3 bg-muted/30"
            style={{ borderColor: `hsl(${colors.border})` }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                تم تحديد {selectedCustomers.length} عميل
              </Badge>
              <Button
                size="sm"
                onClick={() => handleQuickBulkDownload()}
                disabled={convertToCase.isPending}
                className="gap-2 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
                  color: 'white',
                }}
                title="تحميل جميع المستندات"
              >
                <Download className="h-4 w-4" />
                تحميل المستندات
              </Button>
              <Button
                size="sm"
                onClick={() => setVerificationTaskDialogOpen(true)}
                className="gap-2 rounded-xl"
                variant="outline"
                style={{
                  borderColor: `hsl(${colors.info} / 0.4)`,
                  color: `hsl(${colors.info})`,
                }}
              >
                <UserCheck className="h-4 w-4" />
                إرسال للتدقيق
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={bulkDeleting}
                className="gap-2 rounded-xl"
                style={{
                  borderColor: `hsl(${colors.destructive} / 0.4)`,
                  color: `hsl(${colors.destructive})`,
                }}
              >
                <Trash2 className="h-4 w-4" />
                حذف نهائي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCustomers([]);
                  setSelectedIds(new Set());
                }}
                className="gap-2 rounded-lg"
              >
                إلغاء التحديد
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'CRITICAL', label: 'حرج', color: 'red', icon: AlertCircle },
            { key: 'HIGH', label: 'عالي', color: 'orange', icon: AlertTriangle },
            { key: 'MEDIUM', label: 'متوسط', color: 'amber', icon: Clock },
            { key: 'LOW', label: 'منخفض', color: 'emerald', icon: CheckCircle },
          ].map(({ key, label, color, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border-2 bg-card overflow-hidden"
              style={{
                borderColor:
                  color === 'red' ? `hsl(${colors.destructive} / 0.3)`
                    : color === 'orange' ? `hsl(${colors.accentForeground} / 0.3)`
                      : color === 'amber' ? `hsl(${colors.warning} / 0.3)`
                        : `hsl(${colors.success} / 0.3)`,
              }}
            >
              <div
                className="p-4 border-b"
                style={{
                  borderColor:
                    color === 'red' ? `hsl(${colors.destructive} / 0.2)`
                      : color === 'orange' ? `hsl(${colors.accentForeground} / 0.2)`
                        : color === 'amber' ? `hsl(${colors.warning} / 0.2)`
                          : `hsl(${colors.success} / 0.2)`,
                  backgroundColor:
                    color === 'red' ? `hsl(${colors.destructive} / 0.05)`
                      : color === 'orange' ? `hsl(${colors.accentForeground} / 0.05)`
                        : color === 'amber' ? `hsl(${colors.warning} / 0.05)`
                          : `hsl(${colors.success} / 0.05)`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
                    style={{
                      backgroundColor:
                        color === 'red' ? `hsl(${colors.destructive})`
                          : color === 'orange' ? `hsl(${colors.accentForeground})`
                            : color === 'amber' ? `hsl(${colors.warning})`
                              : `hsl(${colors.success})`,
                    }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{kanbanGroups[key as keyof typeof kanbanGroups].length} عميل</p>
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
                {kanbanGroups[key as keyof typeof kanbanGroups].slice(0, 10).map((customer, idx) => (
                  <motion.div
                    key={`${customer.contract_id}-${idx}`}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleViewDetails(customer)}
                    className="p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md"
                    style={{
                      borderColor:
                        color === 'red' ? `hsl(${colors.destructive} / 0.2)`
                          : color === 'orange' ? `hsl(${colors.accentForeground} / 0.2)`
                            : color === 'amber' ? `hsl(${colors.warning} / 0.2)`
                              : `hsl(${colors.success} / 0.2)`,
                      backgroundColor:
                        color === 'red' ? `hsl(${colors.destructive} / 0.03)`
                          : color === 'orange' ? `hsl(${colors.accentForeground} / 0.03)`
                            : color === 'amber' ? `hsl(${colors.warning} / 0.03)`
                              : `hsl(${colors.success} / 0.03)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{customer.customer_name}</p>
                      {generatedCustomerIds.has(customer.contract_id) && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">
                          جاري فتح بلاغ
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{customer.contract_number}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            color === 'red' ? `hsl(${colors.destructive})`
                              : color === 'orange' ? `hsl(${colors.accentForeground})`
                                : color === 'amber' ? `hsl(${colors.warning})`
                                  : `hsl(${colors.success})`,
                        }}
                      >
                        {formatCurrency(customer.total_debt || 0)}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {customer.days_overdue} يوم
                      </Badge>
                    </div>
                  </motion.div>
                ))}
                {kanbanGroups[key as keyof typeof kanbanGroups].length > 10 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    +{kanbanGroups[key as keyof typeof kanbanGroups].length - 10} آخرين
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Table View */}
      {viewMode === 'compact' && (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden" style={{ borderColor: `hsl(${colors.border})` }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-12 text-right">
                  <Checkbox
                    checked={selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('customer_name')}>
                  <div className="flex items-center gap-1">
                    العميل
                    {sortField === 'customer_name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </TableHead>
                <TableHead className="text-right">العقد</TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('total_debt')}>
                  <div className="flex items-center gap-1">
                    المستحق
                    {sortField === 'total_debt' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </TableHead>
                <TableHead className="text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('days_overdue')}>
                  <div className="flex items-center gap-1">
                    الأيام
                    {sortField === 'days_overdue' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </TableHead>
                <TableHead className="text-right">المخاطر</TableHead>
                <TableHead className="text-center">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer, index) => (
                <TableRow
                  key={`${customer.contract_id}-${index}`}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    customer.risk_level === 'CRITICAL' && 'bg-red-50/30 dark:bg-red-950/10',
                    customer.risk_level === 'HIGH' && 'bg-orange-50/30 dark:bg-orange-950/10',
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(customer.customer_id)}
                      onCheckedChange={(checked) => handleSelectCustomer(customer, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{customer.customer_name}</p>
                        {generatedCustomerIds.has(customer.contract_id) && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">
                            جاري فتح بلاغ
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium" style={{ color: `hsl(${colors.primary})` }}>
                        {customer.contract_number}
                      </p>
                      <p className="text-xs text-muted-foreground">🚗 {customer.vehicle_plate}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-bold',
                        customer.risk_level === 'CRITICAL' ? 'text-red-700 dark:text-red-400'
                          : customer.risk_level === 'HIGH' ? 'text-orange-700 dark:text-orange-400'
                            : 'text-foreground',
                      )}
                    >
                      {formatCurrency(customer.total_debt || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        (customer.days_overdue || 0) > 90
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          : (customer.days_overdue || 0) > 60
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
                            : '',
                      )}
                    >
                      {customer.days_overdue} يوم
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={customer.risk_level || 'LOW'} score={customer.risk_score || 0} size="sm" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {generatedCustomerIds.has(customer.contract_id) ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleConvertToOfficialCase(customer)}
                          className="h-8 px-2 rounded-lg bg-green-600 hover:bg-green-700 text-white gap-1"
                        >
                          <Scale className="w-3 h-3" />
                          <span className="text-xs">فتح قضية</span>
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(customer)}
                            className="h-8 w-8 p-0 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRecordPayment(customer)}
                            className="h-8 w-8 p-0 rounded-lg"
                            style={{ color: `hsl(${colors.success})` }}
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Loading State */}
          {customersLoading ? (
            <div className="flex items-center justify-center h-80">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-80 text-center rounded-2xl border bg-card p-8">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl mb-4 shadow-lg"
                style={{ backgroundColor: `hsl(${colors.destructive} / 0.1)` }}
              >
                <AlertTriangle className="w-10 h-10" style={{ color: `hsl(${colors.destructive})` }} />
              </div>
              <p className="text-foreground text-lg font-semibold mb-2">حدث خطأ أثناء تحميل البيانات</p>
              <Button variant="outline" onClick={() => refreshDelinquentCustomers.mutate()} className="rounded-xl mt-4">
                <RefreshCw className="w-4 h-4 ml-2" />
                إعادة المحاولة
              </Button>
            </div>
          ) : !customers || customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center rounded-2xl border bg-card p-8">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-xl mb-6 shadow-lg"
                style={{ backgroundColor: `hsl(${colors.success} / 0.1)` }}
              >
                <CheckCircle className="w-12 h-12" style={{ color: `hsl(${colors.success})` }} />
              </div>
              <p className="text-foreground text-2xl font-bold mb-3">لا يوجد عملاء متأخرين!</p>
              <p className="text-muted-foreground">جميع العملاء يدفعون في الوقت المحدد</p>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm" style={{ borderColor: `hsl(${colors.border})` }}>
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider items-center">
                  <div className="col-span-1">
                    <Checkbox
                      checked={selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </div>
                  <div className="col-span-3">العميل</div>
                  <div className="col-span-3">العقد / المركبة</div>
                  <div className="col-span-2">المستحقات</div>
                  <div className="col-span-1">التواصل</div>
                  <div className="col-span-2 text-center">الإجراءات</div>
                </div>
              </div>

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
                                      'group rounded-2xl border-2 bg-card transition-all duration-300 hover:shadow-lg',
                                      // تمييز العملاء الذين تم تدقيقهم
                                      verificationStatuses?.get(customer.contract_id)?.status === 'verified' 
                                        ? 'border-green-300 bg-green-50/30 hover:border-green-400 hover:bg-green-50/50'
                                        : customer.risk_level === 'CRITICAL' && 'border-red-200 hover:border-red-300 hover:bg-red-50/20',
                                      customer.risk_level === 'HIGH' && !verificationStatuses?.get(customer.contract_id) && 'border-orange-200 hover:border-orange-300 hover:bg-orange-50/20',
                                      customer.risk_level === 'MEDIUM' && !verificationStatuses?.get(customer.contract_id) && 'border-amber-200 hover:border-amber-300 hover:bg-amber-50/20',
                                      (!customer.risk_level || customer.risk_level === 'LOW') && !verificationStatuses?.get(customer.contract_id) && 'hover:border-teal-200 hover:bg-teal-50/10',
                                    )}
                  >
                    <div className="p-5">
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
                            <div
                              className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-all duration-300',
                                customer.risk_level === 'CRITICAL' && 'bg-gradient-to-br from-red-100 to-red-200',
                                customer.risk_level === 'HIGH' && 'bg-gradient-to-br from-orange-100 to-orange-200',
                                customer.risk_level === 'MEDIUM' && 'bg-gradient-to-br from-amber-100 to-amber-200',
                                !customer.risk_level || customer.risk_level === 'LOW' && 'bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-teal-100 group-hover:to-teal-200',
                              )}
                            >
                              <Users
                                className={cn(
                                  'w-6 h-6 transition-colors',
                                  customer.risk_level === 'CRITICAL' && 'text-red-600',
                                  customer.risk_level === 'HIGH' && 'text-orange-600',
                                  customer.risk_level === 'MEDIUM' && 'text-amber-600',
                                  !customer.risk_level || customer.risk_level === 'LOW' && 'text-slate-600 group-hover:text-teal-600',
                                )}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-foreground truncate">{customer.customer_name}</p>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        'w-3 h-3',
                                        i <= (customer.payment_history_score || 3)
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-slate-300 dark:text-slate-600',
                                      )}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{customer.customer_code}</p>
                              {customer.phone && (
                                <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{customer.phone}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contract/Vehicle */}
                        <div className="col-span-3">
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customer.contract_number) {
                                  navigate(`/contracts/${customer.contract_number}`);
                                }
                              }}
                              className="font-semibold text-sm text-left hover:underline transition-colors"
                              style={{ color: `hsl(${colors.primary})` }}
                              title="عرض تفاصيل العقد"
                            >
                              {customer.contract_number || '-'}
                            </button>
                            <div className="flex items-center gap-2">
                              <CarIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{customer.vehicle_plate || 'غير محدد'}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {customer.contract_status === 'cancelled' && (
                                <Badge className="text-[10px] px-2 py-0.5 bg-red-500 text-white gap-1">
                                  <X className="w-3 h-3" />
                                  ملغي
                                </Badge>
                              )}
                              {customer.contract_status === 'under_legal_procedure' && (
                                <Badge className="text-[10px] px-2 py-0.5 gap-1" style={{ backgroundColor: `hsl(262 83% 58%)`, color: 'white' }}>
                                  <Gavel className="w-3 h-3" />
                                  قضية
                                </Badge>
                              )}
                              {/* بادج التدقيق */}
                              {verificationStatuses?.get(customer.contract_id)?.status === 'verified' && (
                                <Badge className="text-[10px] px-2 py-0.5 bg-green-500 text-white gap-1">
                                  <ClipboardCheck className="w-3 h-3" />
                                  تم التدقيق من: {verificationStatuses.get(customer.contract_id)?.verifier_name || 'موظف'}
                                </Badge>
                              )}
                              {verificationStatuses?.get(customer.contract_id)?.status === 'pending' && (
                                <Badge className="text-[10px] px-2 py-0.5 bg-amber-500 text-white gap-1">
                                  <Clock className="w-3 h-3" />
                                  قيد التدقيق
                                </Badge>
                              )}
                              {/* بادج جاري فتح بلاغ */}
                              {generatedCustomerIds.has(customer.contract_id) && (
                                <Badge className="text-[10px] px-2 py-0.5 bg-orange-500 text-white gap-1 animate-pulse">
                                  <FolderArchive className="w-3 h-3" />
                                  جاري فتح بلاغ
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Due Amounts */}
                        <div className="col-span-2">
                          <div className="flex flex-col gap-1.5">
                            <span
                              className={cn(
                                'font-bold text-base',
                                customer.risk_level === 'CRITICAL' && 'text-red-700',
                                customer.risk_level === 'HIGH' && 'text-orange-700',
                                customer.risk_level === 'MEDIUM' && 'text-amber-700',
                                (!customer.risk_level || customer.risk_level === 'LOW') && '',
                              )}
                              style={
                                !customer.risk_level || customer.risk_level === 'LOW'
                                  ? { color: `hsl(${colors.primary})` }
                                  : undefined
                              }
                            >
                              {formatCurrency(customer.total_debt || 0)}
                            </span>
                            <div className="text-[10px] text-muted-foreground space-y-0.5">
                              <div>إيجار: {formatCurrency(customer.overdue_amount || 0)}</div>
                              {(customer.late_penalty || 0) > 0 && (
                                <div className="text-orange-600 dark:text-orange-400">+ غرامة: {formatCurrency(customer.late_penalty)}</div>
                              )}
                              {(customer.violations_amount || 0) > 0 && (
                                <div className="text-red-600 dark:text-red-400">+ مخالفات: {formatCurrency(customer.violations_amount)}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Communication */}
                        <div className="col-span-1">
                          <div className="space-y-2">
                            <InfoChip
                              icon={Clock}
                              label="آخر تواصل"
                              value={`${customer.last_contact_days || 0} يوم`}
                              color={customer.risk_level === 'CRITICAL' ? colors.destructive : customer.risk_level === 'HIGH' ? colors.accentForeground : colors.primary}
                            />
                            <InfoChip
                              icon={Phone}
                              label="هذا الشهر"
                              value={`${customer.contact_count_this_month || 0}`}
                              color={colors.primary}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* زر تحويل لقضية رسمية - بارز للعملاء في حالة "جاري فتح بلاغ" */}
                            {generatedCustomerIds.has(customer.contract_id) ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleConvertToOfficialCase(customer)}
                                className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white gap-1.5 shadow-md"
                              >
                                <Scale className="w-4 h-4" />
                                <span className="text-xs font-semibold">فتح قضية رسمية</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(customer);
                                  }}
                                  title="عرض التفاصيل"
                                  className="h-9 w-9 rounded-lg hover:bg-teal-50 hover:text-teal-600"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSendWarning(customer)}
                                  title="إرسال إنذار"
                                  className="h-9 w-9 rounded-lg hover:bg-amber-50 hover:text-amber-600"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRecordPayment(customer)}
                                  title="تسجيل دفعة"
                                  className="h-9 w-9 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {/* زر تحويل لقضية رسمية - يظهر فقط للعملاء في حالة "جاري فتح بلاغ" */}
                                {generatedCustomerIds.has(customer.contract_id) && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => handleConvertToOfficialCase(customer)} 
                                      className="gap-2 cursor-pointer bg-green-50 text-green-700 hover:bg-green-100"
                                    >
                                      <Scale className="w-4 h-4" />
                                      <span>تحويل لقضية رسمية</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => handleCreateCase(customer)} className="gap-2 cursor-pointer">
                                  <Gavel className="w-4 h-4" />
                                  <span>تجهيز الدعوى</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (customer.phone) window.open(`tel:${customer.phone}`, '_self');
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Phone className="w-4 h-4" />
                                  <span>اتصال بالعميل</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (customer.phone) window.open(`https://wa.me/${customer.phone?.replace(/\D/g, '')}`, '_blank');
                                  }}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Mail className="w-4 h-4" />
                                  <span>رسالة WhatsApp</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      {/* Risk Indicator Bar */}
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: `hsl(${colors.border})` }}>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>مستوى المخاطر</span>
                          <span className="font-semibold">{customer.risk_score || 0}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(customer.risk_score || 0, 100)}%` }}
                            transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                            className="h-full rounded-full"
                            style={{
                              background:
                                customer.risk_level === 'CRITICAL'
                                  ? `linear-gradient(90deg, hsl(${colors.destructive}), hsl(${colors.destructive}) / 0.7)`
                                  : customer.risk_level === 'HIGH'
                                    ? `linear-gradient(90deg, hsl(${colors.accentForeground}), hsl(${colors.accentForeground}) / 0.7)`
                                    : customer.risk_level === 'MEDIUM'
                                      ? `linear-gradient(90deg, hsl(${colors.warning}), hsl(${colors.warning}) / 0.7)`
                                      : `linear-gradient(90deg, hsl(${colors.primary}), hsl(${colors.primary}) / 0.7)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="rounded-2xl border bg-card p-4 shadow-sm" style={{ borderColor: `hsl(${colors.border})` }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, customers.length)} من {customers.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl gap-1"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span className="hidden sm:inline">السابق</span>
                      </Button>
                      <span className="text-sm px-3 font-semibold text-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl gap-1"
                      >
                        <span className="hidden sm:inline">التالي</span>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pagination for Compact View */}
      {viewMode === 'compact' && totalPages > 1 && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm" style={{ borderColor: `hsl(${colors.border})` }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, customers.length)} من {customers.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="hidden sm:inline">السابق</span>
              </Button>
              <span className="text-sm px-3 font-semibold text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl gap-1"
              >
                <span className="hidden sm:inline">التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Delinquent Details Dialog */}
      <DelinquentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        customer={selectedCustomerForDetails}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: `hsl(${colors.destructive})` }}>
              <AlertTriangle className="h-5 w-5" />
              تأكيد الحذف النهائي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-3">
              <p>أنت على وشك حذف <strong>{selectedCustomers.length} عقد</strong> نهائياً.</p>
              <p className="font-semibold" style={{ color: `hsl(${colors.destructive})` }}>
                ⚠️ هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <p>سيتم حذف جميع البيانات المرتبطة بالعقود المحددة:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pr-2">
                <li>الفواتير والمدفوعات</li>
                <li>جداول السداد</li>
                <li>سجلات المتعثرين</li>
                <li>ملفات القضايا القانونية</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={bulkDeleting} className="rounded-xl">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteContracts}
              disabled={bulkDeleting}
              className="rounded-xl"
              style={{
                background: `hsl(${colors.destructive})`,
                color: 'white',
              }}
            >
              {bulkDeleting ? 'جاري الحذف...' : `حذف ${selectedCustomers.length} عقد نهائياً`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Selection Dialog */}
      <Dialog open={documentSelectionDialogOpen} onOpenChange={setDocumentSelectionDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Download className="h-6 w-6 text-primary" />
              تحميل المستندات
            </DialogTitle>
            <DialogDescription>
              حدد المستندات التي تريد تحميلها لـ {selectedCustomers.length} عميل
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                اختر المستندات المطلوبة
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocuments({
                  explanatoryMemo: true,
                  claimsStatement: true,
                  documentsList: true,
                  violationsList: false,  // المخالفات مدمجة في كشف المطالبات
                  criminalComplaint: true,
                  violationsTransfer: true,
                })}
                className="h-8 text-xs"
              >
                تحديد الكل
              </Button>
            </div>
            
            <div className="space-y-3">
              {/* المذكرة الشارحة */}
              <label 
                htmlFor="explanatoryMemo" 
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDocuments.explanatoryMemo 
                    ? 'bg-teal-50 border-teal-500 hover:bg-teal-100' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <input
                  type="checkbox"
                  id="explanatoryMemo"
                  checked={selectedDocuments.explanatoryMemo}
                  onChange={(e) => setSelectedDocuments(prev => ({ ...prev, explanatoryMemo: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-base flex items-center gap-2">
                    📝 المذكرة الشارحة
                    {selectedDocuments.explanatoryMemo && (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    مذكرة قانونية تشرح وقائع القضية والمطالبات
                  </div>
                </div>
              </label>

              {/* كشف المطالبات المالية */}
              <label 
                htmlFor="claimsStatement" 
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDocuments.claimsStatement 
                    ? 'bg-teal-50 border-teal-500 hover:bg-teal-100' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <input
                  type="checkbox"
                  id="claimsStatement"
                  checked={selectedDocuments.claimsStatement}
                  onChange={(e) => setSelectedDocuments(prev => ({ ...prev, claimsStatement: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-base flex items-center gap-2">
                    📄 كشف المطالبات المالية
                    {selectedDocuments.claimsStatement && (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    يتضمن تفاصيل الفواتير المستحقة والمخالفات المرورية
                  </div>
                </div>
              </label>

              <label 
                htmlFor="documentsList" 
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDocuments.documentsList 
                    ? 'bg-teal-50 border-teal-500 hover:bg-teal-100' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <input
                  type="checkbox"
                  id="documentsList"
                  checked={selectedDocuments.documentsList}
                  onChange={(e) => setSelectedDocuments(prev => ({ ...prev, documentsList: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-base flex items-center gap-2">
                    📋 كشف المستندات المرفوعة
                    {selectedDocuments.documentsList && (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    قائمة بجميع المستندات والأوراق الثبوتية المرفوعة للقضية
                  </div>
                </div>
              </label>

              {/* ملاحظة: كشف المخالفات مدمج في كشف المطالبات المالية */}

              {/* بلاغ سرقة المركبة */}
              <label 
                htmlFor="criminalComplaint" 
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDocuments.criminalComplaint 
                    ? 'bg-teal-50 border-teal-500 hover:bg-teal-100' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <input
                  type="checkbox"
                  id="criminalComplaint"
                  checked={selectedDocuments.criminalComplaint}
                  onChange={(e) => setSelectedDocuments(prev => ({ ...prev, criminalComplaint: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-base flex items-center gap-2">
                    ⚖️ بلاغ سرقة المركبة
                    {selectedDocuments.criminalComplaint && (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    بلاغ جنائي للنيابة العامة - يُنشأ للحالات التي تتجاوز 5,000 ريال أو تحتوي على مخالفات
                  </div>
                </div>
              </label>

              {/* طلب تحويل المخالفات */}
              <label 
                htmlFor="violationsTransfer" 
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDocuments.violationsTransfer 
                    ? 'bg-teal-50 border-teal-500 hover:bg-teal-100' 
                    : 'hover:bg-accent/50'
                }`}
              >
                <input
                  type="checkbox"
                  id="violationsTransfer"
                  checked={selectedDocuments.violationsTransfer}
                  onChange={(e) => setSelectedDocuments(prev => ({ ...prev, violationsTransfer: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-base flex items-center gap-2">
                    🔄 طلب تحويل المخالفات
                    {selectedDocuments.violationsTransfer && (
                      <CheckCircle className="h-4 w-4 text-teal-600" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    طلب رسمي لإدارة المرور لتحويل المخالفات إلى اسم المستأجر
                  </div>
                </div>
              </label>
            </div>

            {!selectedDocuments.explanatoryMemo && 
             !selectedDocuments.claimsStatement && 
             !selectedDocuments.documentsList && 
             !selectedDocuments.criminalComplaint &&
             !selectedDocuments.violationsTransfer && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ⚠️ يجب اختيار مستند واحد على الأقل
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setDocumentSelectionDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                setDocumentSelectionDialogOpen(false);
                handleBulkCreateCases();
              }}
              disabled={
                !selectedDocuments.explanatoryMemo && 
                !selectedDocuments.claimsStatement && 
                !selectedDocuments.documentsList && 
                !selectedDocuments.criminalComplaint &&
                !selectedDocuments.violationsTransfer
              }
              className="gap-2"
              style={{
                background: `linear-gradient(135deg, hsl(${colors.primaryDark}), hsl(${colors.primary}))`,
                color: 'white',
              }}
            >
              <Download className="h-4 w-4" />
              تحميل الملفات ({
                [
                  selectedDocuments.explanatoryMemo,
                  selectedDocuments.claimsStatement, 
                  selectedDocuments.documentsList, 
                  selectedDocuments.criminalComplaint,
                  selectedDocuments.violationsTransfer
                ].filter(Boolean).length
              } مستند × {selectedCustomers.length} عميل)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Generation Progress Dialog */}
      <Dialog open={bulkGenerationDialogOpen} onOpenChange={setBulkGenerationDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              تحميل المستندات
            </DialogTitle>
            <DialogDescription>
              جاري تحميل المستندات القانونية لجميع العملاء المحددين
            </DialogDescription>
          </DialogHeader>
          
          {bulkGenerationProgress && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span>التقدم:</span>
                <span className="font-bold">
                  {bulkGenerationProgress.current} / {bulkGenerationProgress.total}
                </span>
              </div>
              
              <Progress 
                value={(bulkGenerationProgress.current / bulkGenerationProgress.total) * 100} 
                className="h-3"
              />
              
              {bulkGenerationProgress.currentCustomer && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري معالجة: {bulkGenerationProgress.currentCustomer}</span>
                </div>
              )}
              
              {bulkGenerationProgress.status === 'completed' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>تم الانتهاء بنجاح! جاري تحميل الملف...</span>
                </div>
              )}
              
              {bulkGenerationProgress.errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-2">
                    أخطاء ({bulkGenerationProgress.errors.length}):
                  </p>
                  <ul className="text-xs text-red-600 space-y-1 max-h-[100px] overflow-y-auto">
                    {bulkGenerationProgress.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
  );
};

export default DelinquentCustomersTab;
