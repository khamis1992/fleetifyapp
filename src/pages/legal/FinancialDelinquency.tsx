/**
 * صفحة إدارة المتعثرات المالية الموحدة
 * تدمج صفحتي "العملاء المتأخرون" و "العقود المتعثرة"
 * 
 * @component FinancialDelinquency
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Eye,
  Phone,
  MoreVertical,
  Printer,
  Filter,
  AlertCircle,
  Clock,
  CreditCard,
  Gavel,
  Car,
  User,
  TrendingUp,
  CheckCircle2,
  MessageSquare,
  Scale,
} from 'lucide-react';
import { useDelinquentCustomers, type DelinquentCustomer, useRefreshDelinquentCustomers } from '@/hooks/useDelinquentCustomers';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { lawsuitService, OverdueContract } from '@/services/LawsuitService';
import LegalWarningDialog from '@/components/legal/LegalWarningDialog';
import { CreateLegalCaseDialog } from '@/components/legal/CreateLegalCaseDialog';
import { DelinquentDetailsDialog } from '@/components/legal/DelinquentDetailsDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { useGenerateLegalWarning, type GeneratedWarning } from '@/hooks/useGenerateLegalWarning';

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'coral' | 'red' | 'orange' | 'green' | 'blue';
  onClick?: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, value, subtitle, icon: Icon, color, onClick, isActive 
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
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className={cn("text-2xl font-bold", classes.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-neutral-500">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", classes.icon)}>
          <Icon className="w-5 h-5" />
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
    <Badge className={cn(bg, text, 'font-medium')}>
      {label} ({score}%)
    </Badge>
  );
};

// ===== Days Overdue Badge =====
const getDaysColor = (days: number) => {
  if (days >= 90) return 'destructive';
  if (days >= 60) return 'warning';
  if (days >= 30) return 'secondary';
  return 'outline';
};

// ===== Main Component =====
export default function FinancialDelinquency() {
  const navigate = useNavigate();
  const { companyId, isLoading: companyLoading } = useUnifiedCompanyAccess();
  
  // View Mode: 'customers' or 'contracts'
  const [viewMode, setViewMode] = useState<'customers' | 'contracts'>('customers');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [minDaysFilter, setMinDaysFilter] = useState('0');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'amount' | 'days' | 'risk'>('risk');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [createCaseDialogOpen, setCreateCaseDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentWarning, setCurrentWarning] = useState<GeneratedWarning | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<DelinquentCustomer | null>(null);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<DelinquentCustomer | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Hooks - Delinquent Customers
  const { data: stats } = useDelinquencyStats();
  const refreshDelinquentCustomers = useRefreshDelinquentCustomers();
  const generateWarning = useGenerateLegalWarning();
  
  const customerFilters = useMemo(() => ({
    search: searchTerm || undefined,
    riskLevel: riskLevelFilter !== 'all' ? riskLevelFilter as any : undefined,
    overduePeriod: minDaysFilter !== '0' 
      ? (parseInt(minDaysFilter) >= 90 ? '>90' : 
         parseInt(minDaysFilter) >= 60 ? '60-90' : 
         parseInt(minDaysFilter) >= 30 ? '30-60' : '<30') as any
      : undefined,
  }), [searchTerm, riskLevelFilter, minDaysFilter]);

  const { data: customers = [], isLoading: customersLoading, refetch: refetchCustomers } = useDelinquentCustomers(customerFilters);

  // Hooks - Overdue Contracts
  const { data: contracts = [], isLoading: contractsLoading, refetch: refetchContracts } = useQuery({
    queryKey: ['overdue-contracts', companyId, minDaysFilter],
    queryFn: () => lawsuitService.getOverdueContracts(companyId!, parseInt(minDaysFilter)),
    enabled: !!companyId,
  });

  // Combined Stats
  const combinedStats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalContracts = contracts.length;
    const totalOverdueCustomers = customers.reduce((sum, c) => sum + c.overdue_amount, 0);
    const totalOverdueContracts = contracts.reduce((sum, c) => sum + c.total_overdue, 0);
    const avgDaysCustomers = customers.length > 0
      ? Math.round(customers.reduce((sum, c) => sum + c.days_overdue, 0) / customers.length)
      : 0;
    const avgDaysContracts = contracts.length > 0
      ? Math.round(contracts.reduce((sum, c) => sum + c.days_overdue, 0) / contracts.length)
      : 0;
    const criticalCount = customers.filter(c => c.risk_level === 'CRITICAL' || c.risk_level === 'حرج').length;
    const withLawsuitCount = contracts.filter(c => c.has_lawsuit).length;

    return {
      totalCustomers,
      totalContracts,
      totalOverdue: viewMode === 'customers' ? totalOverdueCustomers : totalOverdueContracts,
      avgDays: viewMode === 'customers' ? avgDaysCustomers : avgDaysContracts,
      criticalCount,
      withLawsuitCount,
    };
  }, [customers, contracts, viewMode]);

  // Filtered and sorted data
  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    
    // Sort
    if (sortBy === 'amount') {
      result.sort((a, b) => b.overdue_amount - a.overdue_amount);
    } else if (sortBy === 'days') {
      result.sort((a, b) => b.days_overdue - a.days_overdue);
    } else {
      result.sort((a, b) => b.risk_score - a.risk_score);
    }
    
    return result;
  }, [customers, sortBy]);

  const filteredContracts = useMemo(() => {
    let result = contracts.filter(contract => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        contract.customer_name.toLowerCase().includes(search) ||
        contract.contract_number.toLowerCase().includes(search) ||
        contract.vehicle_info.toLowerCase().includes(search)
      );
    });
    
    if (sortBy === 'amount') {
      result.sort((a, b) => b.total_overdue - a.total_overdue);
    } else {
      result.sort((a, b) => b.days_overdue - a.days_overdue);
    }
    
    return result;
  }, [contracts, searchTerm, sortBy]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(start, start + itemsPerPage);
  }, [filteredContracts, currentPage]);

  const totalPages = useMemo(() => {
    const count = viewMode === 'customers' ? filteredCustomers.length : filteredContracts.length;
    return Math.ceil(count / itemsPerPage);
  }, [viewMode, filteredCustomers.length, filteredContracts.length]);

  // Handlers
  const handleRefresh = useCallback(() => {
    if (viewMode === 'customers') {
      refreshDelinquentCustomers.mutate();
    } else {
      refetchContracts();
    }
  }, [viewMode, refreshDelinquentCustomers, refetchContracts]);

  const handleViewDetails = useCallback((customer: DelinquentCustomer) => {
    setSelectedCustomerForDetails(customer);
    setDetailsDialogOpen(true);
  }, []);

  const handleRecordPayment = useCallback((customerId: string, customerName?: string, phone?: string) => {
    const params = new URLSearchParams({
      customerId,
      customerName: customerName || '',
      phone: phone || '',
    });
    navigate(`/finance/payments/quick?${params.toString()}`);
  }, [navigate]);

  const handleCreateCase = useCallback((customer: DelinquentCustomer) => {
    setCurrentCustomer(customer);
    setCreateCaseDialogOpen(true);
  }, []);

  const handleSendWarning = useCallback(async (customer: DelinquentCustomer) => {
    try {
      const warning = await generateWarning.mutateAsync({
        customerId: customer.customer_id,
        customerName: customer.customer_name,
        amount: customer.overdue_amount,
        daysOverdue: customer.days_overdue,
        contractNumber: customer.contract_number,
      });
      setCurrentWarning(warning);
      setCurrentCustomer(customer);
      setWarningDialogOpen(true);
    } catch (error) {
      toast.error('حدث خطأ أثناء إنشاء التحذير');
    }
  }, [generateWarning]);

  const handlePrepareLawsuit = useCallback((contractId: string, hasLawsuit: boolean) => {
    if (hasLawsuit) {
      toast.info('يوجد دعوى جارية لهذا العقد');
      return;
    }
    navigate(`/legal/lawsuit/prepare/${contractId}`);
  }, [navigate]);

  const isLoading = companyLoading || customersLoading || contractsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-coral-500 to-orange-500 rounded-xl shadow-lg shadow-coral-500/20">
              <Scale className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">إدارة المتعثرات المالية</h1>
              <p className="text-muted-foreground">
                متابعة العملاء والعقود المتأخرة عن السداد
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={refreshDelinquentCustomers.isPending}>
              <RefreshCw className={cn("h-4 w-4 ml-2", refreshDelinquentCustomers.isPending && "animate-spin")} />
              تحديث
            </Button>
            <Button variant="outline">
              <Printer className="h-4 w-4 ml-2" />
              طباعة
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6"
      >
        <StatCard
          title="إجمالي المتأخرات"
          value={`${combinedStats.totalOverdue.toLocaleString('ar-QA')} ر.ق`}
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title={viewMode === 'customers' ? 'عدد العملاء المتأخرين' : 'عدد العقود المتعثرة'}
          value={viewMode === 'customers' ? combinedStats.totalCustomers : combinedStats.totalContracts}
          icon={viewMode === 'customers' ? Users : FileText}
          color="orange"
        />
        <StatCard
          title="متوسط أيام التأخير"
          value={`${combinedStats.avgDays} يوم`}
          icon={Clock}
          color="coral"
        />
        <StatCard
          title={viewMode === 'customers' ? 'حالات حرجة' : 'دعاوى مرفوعة'}
          value={viewMode === 'customers' ? combinedStats.criticalCount : combinedStats.withLawsuitCount}
          icon={viewMode === 'customers' ? AlertTriangle : Gavel}
          color={viewMode === 'customers' ? 'red' : 'blue'}
        />
      </motion.div>

      {/* Filters & View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as any); setCurrentPage(1); }} className="w-auto">
                <TabsList className="bg-neutral-100">
                  <TabsTrigger value="customers" className="gap-2">
                    <Users className="h-4 w-4" />
                    حسب العميل
                  </TabsTrigger>
                  <TabsTrigger value="contracts" className="gap-2">
                    <FileText className="h-4 w-4" />
                    حسب العقد
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم أو رقم العقد أو السيارة..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pr-10"
                  />
                </div>
              </div>
              
              {/* Days Filter */}
              <Select value={minDaysFilter} onValueChange={(v) => { setMinDaysFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="أيام التأخير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">جميع المتأخرات</SelectItem>
                  <SelectItem value="15">15+ يوم</SelectItem>
                  <SelectItem value="30">30+ يوم</SelectItem>
                  <SelectItem value="60">60+ يوم</SelectItem>
                  <SelectItem value="90">90+ يوم</SelectItem>
                </SelectContent>
              </Select>

              {/* Risk Level Filter (only for customers view) */}
              {viewMode === 'customers' && (
                <Select value={riskLevelFilter} onValueChange={(v) => { setRiskLevelFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <AlertTriangle className="h-4 w-4 ml-2" />
                    <SelectValue placeholder="مستوى الخطر" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="CRITICAL">حرج</SelectItem>
                    <SelectItem value="HIGH">عالي</SelectItem>
                    <SelectItem value="MEDIUM">متوسط</SelectItem>
                    <SelectItem value="LOW">منخفض</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[130px]">
                  <TrendingUp className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">الخطورة</SelectItem>
                  <SelectItem value="amount">المبلغ</SelectItem>
                  <SelectItem value="days">الأيام</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {viewMode === 'customers' ? (
                <>
                  <Users className="h-5 w-5 text-coral-500" />
                  العملاء المتأخرون ({filteredCustomers.length})
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-coral-500" />
                  العقود المتعثرة ({filteredContracts.length})
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Customers View */}
            {viewMode === 'customers' && (
              <>
                {paginatedCustomers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">لا توجد متأخرات حالياً</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>العميل</TableHead>
                          <TableHead>رقم العقد</TableHead>
                          <TableHead>المبلغ المتأخر</TableHead>
                          <TableHead>أيام التأخير</TableHead>
                          <TableHead>مستوى الخطر</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCustomers.map((customer, index) => (
                          <motion.tr
                            key={customer.customer_id + customer.contract_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group hover:bg-neutral-50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-coral-100 to-orange-100 flex items-center justify-center">
                                  <User className="w-5 h-5 text-coral-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">{customer.customer_name}</p>
                                  <p className="text-xs text-neutral-500">{customer.phone || '-'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{customer.contract_number}</Badge>
                                {customer.vehicle_plate && (
                                  <span className="text-xs text-neutral-400">
                                    <Car className="inline w-3 h-3 ml-1" />
                                    {customer.vehicle_plate}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-red-600">
                                {customer.overdue_amount.toLocaleString('ar-QA')} ر.ق
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getDaysColor(customer.days_overdue)}>
                                {customer.days_overdue} يوم
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <RiskBadge level={customer.risk_level} score={customer.risk_score} />
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                                    <Eye className="h-4 w-4 ml-2" />
                                    عرض التفاصيل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRecordPayment(customer.customer_id, customer.customer_name, customer.phone || '')}>
                                    <CreditCard className="h-4 w-4 ml-2" />
                                    تسجيل دفعة
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleSendWarning(customer)}>
                                    <MessageSquare className="h-4 w-4 ml-2" />
                                    إرسال تحذير
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCreateCase(customer)}>
                                    <Gavel className="h-4 w-4 ml-2" />
                                    رفع دعوى
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* Contracts View */}
            {viewMode === 'contracts' && (
              <>
                {paginatedContracts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">لا توجد عقود متعثرة حالياً</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المستأجر</TableHead>
                          <TableHead>رقم العقد</TableHead>
                          <TableHead>السيارة</TableHead>
                          <TableHead>المبلغ المتأخر</TableHead>
                          <TableHead>أيام التأخير</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>الإجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedContracts.map((contract, index) => (
                          <motion.tr
                            key={contract.contract_id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group hover:bg-neutral-50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-neutral-100 rounded-lg">
                                  <User className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium">{contract.customer_name}</p>
                                  {contract.customer_id_number && (
                                    <p className="text-xs text-muted-foreground">
                                      {contract.customer_id_number}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{contract.contract_number}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{contract.vehicle_info}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-red-600">
                                {contract.total_overdue.toLocaleString('ar-QA')} ر.ق
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getDaysColor(contract.days_overdue)}>
                                {contract.days_overdue} يوم
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {contract.has_lawsuit ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  <Gavel className="h-3 w-3 ml-1" />
                                  دعوى جارية
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  <AlertCircle className="h-3 w-3 ml-1" />
                                  بانتظار إجراء
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={contract.has_lawsuit ? 'outline' : 'default'}
                                onClick={() => handlePrepareLawsuit(contract.contract_id, contract.has_lawsuit)}
                                className={!contract.has_lawsuit ? 'bg-coral-500 hover:bg-coral-600' : ''}
                              >
                                <Gavel className="h-4 w-4 ml-2" />
                                {contract.has_lawsuit ? 'عرض الدعوى' : 'رفع دعوى'}
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  صفحة {currentPage} من {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      {selectedCustomerForDetails && (
        <DelinquentDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          customer={selectedCustomerForDetails}
        />
      )}

      {currentCustomer && (
        <CreateLegalCaseDialog
          open={createCaseDialogOpen}
          onOpenChange={setCreateCaseDialogOpen}
          customer={currentCustomer}
        />
      )}

      {currentWarning && currentCustomer && (
        <LegalWarningDialog
          open={warningDialogOpen}
          onOpenChange={setWarningDialogOpen}
          warning={currentWarning}
          customerName={currentCustomer.customer_name}
          customerPhone={currentCustomer.phone}
        />
      )}
    </div>
  );
}

