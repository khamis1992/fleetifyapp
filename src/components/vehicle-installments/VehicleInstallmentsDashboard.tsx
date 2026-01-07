import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  CalendarClock, 
  AlertCircle, 
  DollarSign, 
  AlertTriangle, 
  Car,
  Building2,
  TrendingUp,
  ChevronLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  MoreVertical,
  Search,
  ArrowUpDown,
  CreditCard,
  Bell,
  Pencil,
  Save
} from "lucide-react";
import { useVehicleInstallments, useVehicleInstallmentSummary, useDeleteVehicleInstallment, useUpdateVehicleInstallment } from "@/hooks/useVehicleInstallments";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { MultiVehicleWizard } from "./wizard";
import VehicleInstallmentDetails from "./VehicleInstallmentDetails";
import type { VehicleInstallmentWithDetails } from "@/types/vehicle-installments";
import { cn } from "@/lib/utils";

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendUp,
  onClick,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        "bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-lg transition-all",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div 
          className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className={cn("w-6 h-6", iconColor)} />
        </motion.div>
        {trend && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1",
              trendUp ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}
          >
            <TrendingUp className={cn("w-3 h-3", !trendUp && "rotate-180")} />
            {trend}
          </motion.span>
        )}
      </div>
      <p className="text-[11px] text-neutral-500 font-medium mb-1">{title}</p>
      <motion.p 
        className="text-[1.75rem] font-bold text-neutral-900 leading-none"
        key={String(value)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {value}
      </motion.p>
      {subtitle && (
        <p className="text-xs text-neutral-400 mt-2">{subtitle}</p>
      )}
    </motion.div>
  );
};

// ===== Filter Tab Component =====
interface FilterTabProps {
  label: string;
  value: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  color?: string;
}

const FilterTab: React.FC<FilterTabProps> = ({ label, value, count, isActive, onClick, color }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={cn(
      "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
      isActive
        ? "bg-rose-500 text-white shadow-md"
        : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
    )}
  >
    {label}
    {count !== undefined && (
      <span className={cn(
        "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
        isActive ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
      )}>
        {count}
      </span>
    )}
  </motion.button>
);

// ===== Agreement Card Component =====
interface AgreementCardProps {
  installment: VehicleInstallmentWithDetails;
  onClick: () => void;
  onEdit: (installment: VehicleInstallmentWithDetails) => void;
  onDelete: (id: string) => void;
  formatCurrency: (value: number) => string;
  index: number;
}

const AgreementCard: React.FC<AgreementCardProps> = ({ 
  installment, 
  onClick, 
  onEdit,
  onDelete,
  formatCurrency,
  index 
}) => {
  const statusConfig = {
    active: { 
      bg: "bg-emerald-50", 
      border: "border-emerald-200", 
      text: "text-emerald-700",
      icon: CheckCircle2,
      label: "نشط"
    },
    completed: { 
      bg: "bg-blue-50", 
      border: "border-blue-200", 
      text: "text-blue-700",
      icon: CheckCircle2,
      label: "مكتمل"
    },
    cancelled: { 
      bg: "bg-red-50", 
      border: "border-red-200", 
      text: "text-red-700",
      icon: XCircle,
      label: "ملغي"
    },
    draft: { 
      bg: "bg-neutral-50", 
      border: "border-neutral-200", 
      text: "text-neutral-600",
      icon: FileText,
      label: "مسودة"
    },
  };

  const status = statusConfig[installment.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = status.icon;

  // Calculate progress (estimate based on start date and number of installments)
  const startDate = new Date(installment.start_date);
  const now = new Date();
  const monthsElapsed = Math.max(0, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
  const estimatedPaidInstallments = Math.min(monthsElapsed, installment.number_of_installments);
  const progressPercentage = (estimatedPaidInstallments / installment.number_of_installments) * 100;
  const estimatedPaid = estimatedPaidInstallments * installment.installment_amount;
  const estimatedRemaining = installment.total_amount - installment.down_payment - estimatedPaid;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ x: 4, backgroundColor: "#fafafa" }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-neutral-100 group"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Side - Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h3 className="text-base font-bold text-neutral-900">
              {installment.agreement_number || 'بدون رقم'}
            </h3>
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1",
              status.bg, status.text
            )}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            {installment.contract_type === 'multi_vehicle' && (
              <Badge variant="outline" className="text-[10px] border-rose-200 text-coral-600">
                <Car className="w-3 h-3 ml-1" />
                {installment.total_vehicles_count} مركبات
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
            <div className="flex items-center gap-2 text-neutral-600">
              <Car className="w-4 h-4 text-coral-400" />
              <span className="truncate">
                {installment.contract_type === 'multi_vehicle'
                  ? `عقد متعدد (${installment.total_vehicles_count} مركبة)`
                  : installment.vehicles?.plate_number
                  ? `${installment.vehicles.plate_number}`
                  : 'غير محدد'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Building2 className="w-4 h-4 text-coral-400" />
              <span className="truncate">
                {installment.customers?.customer_type === 'individual'
                  ? `${installment.customers?.first_name} ${installment.customers?.last_name}`
                  : installment.customers?.company_name || 'غير محدد'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-600">
              <Clock className="w-4 h-4 text-coral-400" />
              <span>
                {format(new Date(installment.start_date), 'dd MMM yyyy', { locale: ar })}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {installment.status === 'active' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>التقدم: {estimatedPaidInstallments} من {installment.number_of_installments} قسط</span>
                <span>{progressPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-coral-400 to-rose-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Amount & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="text-xl font-bold text-neutral-900">
              {formatCurrency(installment.total_amount)}
            </p>
            <p className="text-xs text-neutral-500 mb-1">
              {installment.number_of_installments} قسط × {formatCurrency(installment.installment_amount)}
            </p>
            {installment.status === 'active' && (
              <div className="flex gap-2 text-[10px]">
                <span className="text-emerald-600">مدفوع: ~{formatCurrency(estimatedPaid + installment.down_payment)}</span>
                <span className="text-amber-600">متبقي: ~{formatCurrency(Math.max(0, estimatedRemaining))}</span>
              </div>
            )}
          </div>
          
          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-neutral-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4 text-neutral-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 ml-2" />
                عرض التفاصيل
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(installment);
                }}
                className="cursor-pointer"
              >
                <Pencil className="w-4 h-4 ml-2" />
                تعديل الاتفاقية
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(installment.id);
                }}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف الاتفاقية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <motion.div
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ x: -5 }}
            animate={{ x: 0 }}
          >
            <ChevronLeft className="w-5 h-5 text-coral-400" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

// ===== Main Dashboard Component =====
const VehicleInstallmentsDashboard = () => {
  const [selectedInstallment, setSelectedInstallment] = useState<VehicleInstallmentWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [installmentToDelete, setInstallmentToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<VehicleInstallmentWithDetails | null>(null);
  const [editForm, setEditForm] = useState({
    agreement_number: '',
    total_amount: 0,
    down_payment: 0,
    installment_amount: 0,
    number_of_installments: 0,
    interest_rate: 0,
    notes: '',
    status: 'active' as string,
  });

  const { data: installments, isLoading } = useVehicleInstallments();
  const { data: summary } = useVehicleInstallmentSummary();
  const { formatCurrency } = useCurrencyFormatter();
  const deleteInstallment = useDeleteVehicleInstallment();
  const updateInstallment = useUpdateVehicleInstallment();

  const handleDeleteClick = (id: string) => {
    setInstallmentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (installmentToDelete) {
      await deleteInstallment.mutateAsync(installmentToDelete);
      setDeleteDialogOpen(false);
      setInstallmentToDelete(null);
    }
  };

  const handleEditClick = (installment: VehicleInstallmentWithDetails) => {
    setInstallmentToEdit(installment);
    setEditForm({
      agreement_number: installment.agreement_number || '',
      total_amount: installment.total_amount,
      down_payment: installment.down_payment,
      installment_amount: installment.installment_amount,
      number_of_installments: installment.number_of_installments,
      interest_rate: installment.interest_rate || 0,
      notes: installment.notes || '',
      status: installment.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!installmentToEdit) return;
    
    await updateInstallment.mutateAsync({
      id: installmentToEdit.id,
      data: {
        agreement_number: editForm.agreement_number,
        total_amount: editForm.total_amount,
        down_payment: editForm.down_payment,
        installment_amount: editForm.installment_amount,
        number_of_installments: editForm.number_of_installments,
        interest_rate: editForm.interest_rate,
        notes: editForm.notes,
        status: editForm.status as any,
      },
    });
    
    setEditDialogOpen(false);
    setInstallmentToEdit(null);
  };

  // Filter and sort installments
  const filteredInstallments = useMemo(() => {
    let result = installments || [];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.agreement_number?.toLowerCase().includes(query) ||
        i.customers?.company_name?.toLowerCase().includes(query) ||
        i.customers?.first_name?.toLowerCase().includes(query) ||
        i.customers?.last_name?.toLowerCase().includes(query) ||
        i.vehicles?.plate_number?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'date_asc':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'amount_desc':
          return b.total_amount - a.total_amount;
        case 'amount_asc':
          return a.total_amount - b.total_amount;
        case 'installments_desc':
          return b.number_of_installments - a.number_of_installments;
        default:
          return 0;
      }
    });
    
    return result;
  }, [installments, statusFilter, searchQuery, sortBy]);

  // Count by status
  const statusCounts = {
    all: installments?.length || 0,
    active: installments?.filter(i => i.status === 'active').length || 0,
    completed: installments?.filter(i => i.status === 'completed').length || 0,
    draft: installments?.filter(i => i.status === 'draft').length || 0,
    cancelled: installments?.filter(i => i.status === 'cancelled').length || 0,
  };

  // Handle stat card clicks for filtering
  const handleStatCardClick = (filter: string) => {
    if (filter === 'overdue') {
      // For overdue, we'll filter active agreements that might have overdue payments
      setStatusFilter('active');
    } else {
      setStatusFilter(filter);
    }
  };

  if (selectedInstallment) {
    return (
      <VehicleInstallmentDetails
        installment={selectedInstallment}
        onBack={() => setSelectedInstallment(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed] p-5 md:p-8">
      {/* Header Section */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 mb-2">
              أقساط المركبات
            </h1>
            <p className="text-neutral-500 font-medium">
              إدارة اتفاقيات الأقساط مع الوكلاء والموردين
            </p>
          </div>
          <MultiVehicleWizard 
            trigger={
              <Button className="gap-2 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 rounded-xl shadow-lg shadow-rose-500/25">
                <Plus className="h-4 w-4" />
                إنشاء اتفاقية جديدة
              </Button>
            }
          />
        </div>
      </motion.header>

      {/* Overdue Alert Bar */}
      {summary && summary.overdue_count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 shadow-lg shadow-rose-500/20"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-bold">⚠️ تنبيه: يوجد {summary.overdue_count} أقساط متأخرة!</p>
                <p className="text-sm text-white/80">
                  إجمالي المبلغ المتأخر: {formatCurrency(summary.overdue_amount)}
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-white text-red-600 hover:bg-white/90"
              onClick={() => handleStatCardClick('overdue')}
            >
              عرض التفاصيل
            </Button>
          </div>
        </motion.div>
      )}

      {/* Statistics Cards */}
      {summary && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="إجمالي الاتفاقيات"
              value={summary.total_agreements}
              subtitle={`${summary.active_agreements} نشط • ${summary.completed_agreements} مكتمل`}
              icon={CalendarClock}
              iconBg="bg-rose-100"
              iconColor="text-coral-600"
              delay={1}
              onClick={() => handleStatCardClick('all')}
            />
            <StatCard
              title="إجمالي المبلغ"
              value={formatCurrency(summary.total_amount)}
              subtitle={`مدفوع: ${formatCurrency(summary.total_paid)}`}
              icon={DollarSign}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              delay={2}
              onClick={() => handleStatCardClick('all')}
            />
            <StatCard
              title="المبلغ المستحق"
              value={formatCurrency(summary.total_outstanding)}
              subtitle={`${summary.overdue_count || 0} قسط متبقي`}
              icon={AlertCircle}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              delay={3}
              onClick={() => handleStatCardClick('active')}
            />
            <StatCard
              title="الأقساط المتأخرة"
              value={formatCurrency(summary.overdue_amount)}
              subtitle={`${summary.overdue_count} أقساط متأخرة`}
              icon={AlertTriangle}
              iconBg="bg-red-100"
              iconColor="text-red-600"
              delay={4}
              onClick={() => handleStatCardClick('overdue')}
            />
          </div>
        </motion.section>
      )}

      {/* Filter & List Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-[1.5rem] p-6 shadow-sm"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 mb-1">
              اتفاقيات الأقساط
            </h2>
            <p className="text-sm text-neutral-500">
              {filteredInstallments.length} اتفاقية
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <FilterTab
              label="الكل"
              value="all"
              count={statusCounts.all}
              isActive={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterTab
              label="نشط"
              value="active"
              count={statusCounts.active}
              isActive={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
            />
            <FilterTab
              label="مكتمل"
              value="completed"
              count={statusCounts.completed}
              isActive={statusFilter === 'completed'}
              onClick={() => setStatusFilter('completed')}
            />
            <FilterTab
              label="مسودة"
              value="draft"
              count={statusCounts.draft}
              isActive={statusFilter === 'draft'}
              onClick={() => setStatusFilter('draft')}
            />
          </div>
        </div>

        {/* Search and Sort Row */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="البحث برقم الاتفاقية، الوكيل، أو المركبة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-neutral-50 border-neutral-200 focus:bg-white"
            />
          </div>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-neutral-50 border-neutral-200">
              <ArrowUpDown className="w-4 h-4 ml-2 text-neutral-500" />
              <SelectValue placeholder="ترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">الأحدث أولاً</SelectItem>
              <SelectItem value="date_asc">الأقدم أولاً</SelectItem>
              <SelectItem value="amount_desc">المبلغ (الأعلى)</SelectItem>
              <SelectItem value="amount_asc">المبلغ (الأقل)</SelectItem>
              <SelectItem value="installments_desc">عدد الأقساط</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agreements List */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-neutral-500 font-medium">جاري التحميل...</p>
            </motion.div>
          ) : filteredInstallments.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-neutral-300" />
              </div>
              <p className="text-neutral-500 font-medium mb-4">لا توجد اتفاقيات أقساط</p>
              <MultiVehicleWizard 
                trigger={
                  <Button className="gap-2 bg-rose-500 hover:bg-coral-600 rounded-xl">
                    <Plus className="h-4 w-4" />
                    إنشاء اتفاقية جديدة
                  </Button>
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {filteredInstallments.map((installment, index) => (
                <AgreementCard
                  key={installment.id}
                  installment={installment}
                  onClick={() => setSelectedInstallment(installment)}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  formatCurrency={formatCurrency}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذه الاتفاقية؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الاتفاقية وجميع الأقساط المرتبطة بها نهائياً. 
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteInstallment.isPending}
            >
              {deleteInstallment.isPending ? 'جاري الحذف...' : 'حذف الاتفاقية'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Agreement Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-rose-500" />
              تعديل الاتفاقية
            </DialogTitle>
            <DialogDescription>
              تعديل بيانات اتفاقية الأقساط: {installmentToEdit?.agreement_number}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agreement_number">رقم الاتفاقية</Label>
                <Input
                  id="agreement_number"
                  value={editForm.agreement_number}
                  onChange={(e) => setEditForm({ ...editForm, agreement_number: e.target.value })}
                  placeholder="رقم الاتفاقية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">المبلغ الإجمالي</Label>
                <Input
                  id="total_amount"
                  type="number"
                  value={editForm.total_amount}
                  onChange={(e) => setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="down_payment">الدفعة المقدمة</Label>
                <Input
                  id="down_payment"
                  type="number"
                  value={editForm.down_payment}
                  onChange={(e) => setEditForm({ ...editForm, down_payment: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installment_amount">مبلغ القسط</Label>
                <Input
                  id="installment_amount"
                  type="number"
                  value={editForm.installment_amount}
                  onChange={(e) => setEditForm({ ...editForm, installment_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number_of_installments">عدد الأقساط</Label>
                <Input
                  id="number_of_installments"
                  type="number"
                  value={editForm.number_of_installments}
                  onChange={(e) => setEditForm({ ...editForm, number_of_installments: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest_rate">نسبة الفائدة %</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  value={editForm.interest_rate}
                  onChange={(e) => setEditForm({ ...editForm, interest_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateInstallment.isPending}
              className="bg-rose-500 hover:bg-coral-600"
            >
              {updateInstallment.isPending ? (
                <>جاري الحفظ...</>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التغييرات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleInstallmentsDashboard;
