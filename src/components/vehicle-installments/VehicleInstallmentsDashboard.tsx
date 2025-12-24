import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MoreVertical
} from "lucide-react";
import { useVehicleInstallments, useVehicleInstallmentSummary, useDeleteVehicleInstallment } from "@/hooks/useVehicleInstallments";
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
        ? "bg-coral-500 text-white shadow-md"
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
  onDelete: (id: string) => void;
  formatCurrency: (value: number) => string;
  index: number;
}

const AgreementCard: React.FC<AgreementCardProps> = ({ 
  installment, 
  onClick, 
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
              {installment.agreement_number}
            </h3>
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1",
              status.bg, status.text
            )}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            {installment.contract_type === 'multi_vehicle' && (
              <Badge variant="outline" className="text-[10px] border-coral-200 text-coral-600">
                <Car className="w-3 h-3 ml-1" />
                {installment.total_vehicles_count} مركبات
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
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
        </div>

        {/* Right Side - Amount & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-left">
            <p className="text-xl font-bold text-neutral-900">
              {formatCurrency(installment.total_amount)}
            </p>
            <p className="text-xs text-neutral-500">
              {installment.number_of_installments} قسط شهري
            </p>
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [installmentToDelete, setInstallmentToDelete] = useState<string | null>(null);

  const { data: installments, isLoading } = useVehicleInstallments();
  const { data: summary } = useVehicleInstallmentSummary();
  const { formatCurrency } = useCurrencyFormatter();
  const deleteInstallment = useDeleteVehicleInstallment();

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

  const filteredInstallments = (installments || []).filter(installment => 
    statusFilter === 'all' || installment.status === statusFilter
  );

  // Count by status
  const statusCounts = {
    all: installments?.length || 0,
    active: installments?.filter(i => i.status === 'active').length || 0,
    completed: installments?.filter(i => i.status === 'completed').length || 0,
    draft: installments?.filter(i => i.status === 'draft').length || 0,
    cancelled: installments?.filter(i => i.status === 'cancelled').length || 0,
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
              <Button className="gap-2 bg-gradient-to-r from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 rounded-xl shadow-lg shadow-coral-500/25">
                <Plus className="h-4 w-4" />
                إنشاء اتفاقية جديدة
              </Button>
            }
          />
        </div>
      </motion.header>

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
              iconBg="bg-coral-100"
              iconColor="text-coral-600"
              delay={1}
            />
            <StatCard
              title="إجمالي المبلغ"
              value={formatCurrency(summary.total_amount)}
              subtitle={`مدفوع: ${formatCurrency(summary.total_paid)}`}
              icon={DollarSign}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              trend="+12%"
              trendUp={true}
              delay={2}
            />
            <StatCard
              title="المبلغ المستحق"
              value={formatCurrency(summary.total_outstanding)}
              subtitle={`${summary.overdue_count || 0} قسط متبقي`}
              icon={AlertCircle}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              delay={3}
            />
            <StatCard
              title="الأقساط المتأخرة"
              value={formatCurrency(summary.overdue_amount)}
              subtitle={`${summary.overdue_count} أقساط متأخرة`}
              icon={AlertTriangle}
              iconBg="bg-red-100"
              iconColor="text-red-600"
              delay={4}
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
              <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mb-4" />
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
                  <Button className="gap-2 bg-coral-500 hover:bg-coral-600 rounded-xl">
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
    </div>
  );
};

export default VehicleInstallmentsDashboard;
