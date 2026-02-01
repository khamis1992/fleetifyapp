/**
 * Contract Header Component - Light Theme with System Colors
 * تصميم فاتح باستخدام ألوان النظام الأساسية
 * 
 * @component ContractHeaderRedesigned
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Printer,
  Download,
  FileEdit,
  RefreshCw,
  Calendar,
  DollarSign,
  User,
  Car,
  CreditCard,
  Clock,
  Phone,
  Hash,
  ChevronLeft,
  Copy,
  Building,
  // FileText, TrendingUp - unused for now
  Wallet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';

// ===== System Colors =====
const SYSTEM_COLORS = {
  primary: '#00A896',
  primaryLight: '#E6F7F5',
  primaryDark: '#007A6B',
  secondary: '#0F172A',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// ===== Animation Variants =====
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }
  }
};

// ===== Status Config =====
const getStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; border: string; label: string }> = {
    active: { 
      bg: 'bg-emerald-50', 
      text: 'text-emerald-700', 
      border: 'border-emerald-200',
      label: 'نشط' 
    },
    draft: { 
      bg: 'bg-slate-50', 
      text: 'text-slate-700', 
      border: 'border-slate-200',
      label: 'مسودة' 
    },
    expired: { 
      bg: 'bg-amber-50', 
      text: 'text-amber-700', 
      border: 'border-amber-200',
      label: 'منتهي' 
    },
    suspended: { 
      bg: 'bg-orange-50', 
      text: 'text-orange-700', 
      border: 'border-orange-200',
      label: 'معلق' 
    },
    cancelled: { 
      bg: 'bg-red-50', 
      text: 'text-red-700', 
      border: 'border-red-200',
      label: 'ملغي' 
    },
    under_legal_procedure: { 
      bg: 'bg-violet-50', 
      text: 'text-violet-700', 
      border: 'border-violet-200',
      label: 'إجراء قانوني' 
    },
  };
  return configs[status] || configs.draft;
};

const getContractTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    rental: 'عقد إيجار',
    daily_rental: 'إيجار يومي',
    weekly_rental: 'إيجار أسبوعي',
    monthly_rental: 'إيجار شهري',
    yearly_rental: 'إيجار سنوي',
    rent_to_own: 'تأجير منتهي بالتمليك',
    lease: 'عقد تأجير',
    corporate: 'عقد شركة',
  };
  return labels[type] || type;
};

const getPaymentMethodLabel = (method?: string) => {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    card: 'بطاقة',
    bank: 'تحويل بنكي',
    cheque: 'شيك',
  };
  return labels[method || ''] || 'غير محدد';
};

// ===== Types =====
interface ContractHeaderRedesignedProps {
  contract: Contract & {
    customer?: {
      id?: string;
      first_name?: string;
      last_name?: string;
      first_name_ar?: string;
      last_name_ar?: string;
      company_name?: string;
      company_name_ar?: string;
      customer_type?: string;
      phone?: string;
      email?: string;
      national_id?: string;
    } | null;
    vehicle?: {
      id?: string;
      plate_number?: string;
      make?: string;
      model?: string;
      year?: number;
      color?: string;
      vin?: string;
      current_mileage?: number;
      fuel_type?: string;
    } | null;
    payment_method?: string;
    insurance_amount?: number;
    allowed_km?: number;
    notes?: string;
    paid_amount?: number;
    total_amount?: number;
  };
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onStatusClick?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export const ContractHeaderRedesigned = React.memo<ContractHeaderRedesignedProps>(({
  contract,
  onEdit,
  onPrint,
  onExport,
  onRefresh,
  onStatusClick,
  isRefreshing = false,
  className
}) => {
  const navigate = useNavigate();

  // Calculations
  const daysUntilExpiry = useMemo(() => {
    if (!contract.end_date) return null;
    const today = new Date();
    const endDate = new Date(contract.end_date);
    return differenceInDays(endDate, today);
  }, [contract.end_date]);

  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  const contractProgress = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return 0;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const today = new Date();
    const totalDays = differenceInDays(end, start);
    const daysElapsed = differenceInDays(today, start);
    return Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100));
  }, [contract.start_date, contract.end_date]);

  const totalAmount = contract.total_amount || contract.contract_amount || 0;
  const paidAmount = contract.paid_amount || contract.total_paid || 0;
  const remainingAmount = totalAmount - paidAmount;
  const paymentProgress = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const statusConfig = getStatusConfig(contract.status);

  // Customer name
  const customerName = useMemo(() => {
    return formatCustomerName(contract.customer);
  }, [contract.customer]);

  // Vehicle info
  const vehicleInfo = useMemo(() => {
    if (!contract.vehicle) return null;
    const vehicle = contract.vehicle;
    return {
      name: `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim(),
      plate: vehicle.plate_number,
      color: vehicle.color,
    };
  }, [contract.vehicle]);

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn("space-y-6", className)}
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/contracts')}
          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للعقود
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onPrint}
            className="text-slate-600 hover:text-slate-900"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            className="text-slate-600 hover:text-slate-900"
          >
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                المزيد
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <FileEdit className="h-4 w-4 ml-2" />
                تعديل العقد
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contract.contract_number)}>
                <Copy className="h-4 w-4 ml-2" />
                نسخ رقم العقد
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Contract Info Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Header Section with Primary Color */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left: Contract Number & Status */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    onClick={onStatusClick}
                    className={cn(
                      "cursor-pointer px-4 py-1.5 rounded-full text-sm font-medium border transition-all hover:opacity-80",
                      statusConfig.bg,
                      statusConfig.text,
                      statusConfig.border
                    )}
                  >
                    {statusConfig.label}
                  </div>
                  <span className="text-slate-500 text-sm">
                    {getContractTypeLabel(contract.contract_type)}
                  </span>
                  {isExpiringSoon && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                      ينتهي قريباً
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                      منتهي
                    </Badge>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight" dir="ltr">
                  {contract.contract_number}
                </h1>
                
                <p className="text-slate-500">
                  {daysUntilExpiry !== null && daysUntilExpiry > 0 
                    ? `${daysUntilExpiry} يوم متبقي على انتهاء العقد`
                    : daysUntilExpiry === 0 
                    ? 'ينتهي العقد اليوم'
                    : daysUntilExpiry !== null
                    ? `انتهى منذ ${Math.abs(daysUntilExpiry)} يوم`
                    : ''
                  }
                </p>
              </div>
              
              {/* Right: Progress */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="5"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke={SYSTEM_COLORS.primary}
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${contractProgress * 2.26} 226`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-900">{Math.round(contractProgress)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">نسبة التقدم</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Contract Details Grid */}
          <div className="p-6 bg-slate-50/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
                >
                  <Calendar className="w-5 h-5" style={{ color: SYSTEM_COLORS.primary }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاريخ البداية</p>
                  <p className="font-medium text-slate-900">
                    {contract.start_date ? format(new Date(contract.start_date), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
                >
                  <Clock className="w-5 h-5" style={{ color: SYSTEM_COLORS.primary }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاريخ الانتهاء</p>
                  <p className="font-medium text-slate-900">
                    {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
                >
                  <DollarSign className="w-5 h-5" style={{ color: SYSTEM_COLORS.primary }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">الإيجار الشهري</p>
                  <p className="font-medium text-slate-900">
                    {contract.monthly_amount?.toLocaleString('ar-SA')} ر.ق
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: SYSTEM_COLORS.primary }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">طريقة الدفع</p>
                  <p className="font-medium text-slate-900">
                    {getPaymentMethodLabel(contract.payment_method)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Contract Value */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">إجمالي قيمة العقد</p>
                <p className="text-2xl font-bold text-slate-900">
                  {totalAmount.toLocaleString('ar-SA')} <span className="text-sm font-normal">ر.ق</span>
                </p>
              </div>
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
              >
                <Wallet className="w-5 h-5" style={{ color: SYSTEM_COLORS.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid Amount */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">المبلغ المسدد</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {paidAmount.toLocaleString('ar-SA')} <span className="text-sm font-normal">ر.ق</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">{paymentProgress}% من إجمالي العقد</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={paymentProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Remaining Amount */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">المبلغ المتبقي</p>
                <p className={cn(
                  "text-2xl font-bold",
                  remainingAmount > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {remainingAmount.toLocaleString('ar-SA')} <span className="text-sm font-normal">ر.ق</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {remainingAmount > 0 ? 'مستحق الدفع' : 'تم السداد بالكامل'}
                </p>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                remainingAmount > 0 ? "bg-amber-50" : "bg-emerald-50"
              )}>
                <AlertCircle className={cn(
                  "w-5 h-5",
                  remainingAmount > 0 ? "text-amber-600" : "text-emerald-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer & Vehicle Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Card */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => contract.customer?.id && navigate(`/customers/${contract.customer.id}`)}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
              >
                <User className="w-6 h-6" style={{ color: SYSTEM_COLORS.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">العميل</p>
                <h3 className="font-bold text-slate-900 text-lg mb-2 truncate">{customerName}</h3>
                
                <div className="flex flex-wrap gap-3 mt-2">
                  {contract.customer?.phone && (
                    <span className="text-sm text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <Phone className="w-3 h-3" style={{ color: SYSTEM_COLORS.primary }} />
                      {contract.customer.phone}
                    </span>
                  )}
                  {contract.customer?.national_id && (
                    <span className="text-sm text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <Hash className="w-3 h-3" style={{ color: SYSTEM_COLORS.primary }} />
                      {contract.customer.national_id}
                    </span>
                  )}
                  {contract.customer?.customer_type && (
                    <span className="text-sm text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      <Building className="w-3 h-3" style={{ color: SYSTEM_COLORS.primary }} />
                      {contract.customer.customer_type === 'company' ? 'شركة' : 'فرد'}
                    </span>
                  )}
                </div>

                {contract.customer?.id && (
                  <div className="mt-3 flex items-center text-sm" style={{ color: SYSTEM_COLORS.primary }}>
                    <span>عرض التفاصيل</span>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Card */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => contract.vehicle?.id && navigate(`/fleet/vehicles/${contract.vehicle.id}`)}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: SYSTEM_COLORS.primaryLight }}
              >
                <Car className="w-6 h-6" style={{ color: SYSTEM_COLORS.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1">المركبة</p>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{vehicleInfo?.name || 'غير محدد'}</h3>
                
                <div className="flex flex-wrap gap-3 mt-2">
                  {vehicleInfo?.plate && (
                    <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded border border-slate-200" dir="ltr">
                      {vehicleInfo.plate}
                    </span>
                  )}
                  {contract.vehicle?.color && (
                    <span className="text-sm text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      {contract.vehicle.color}
                    </span>
                  )}
                  {contract.vehicle?.year && (
                    <span className="text-sm text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                      {contract.vehicle.year}
                    </span>
                  )}
                </div>

                {contract.vehicle?.id && (
                  <div className="mt-3 flex items-center text-sm" style={{ color: SYSTEM_COLORS.primary }}>
                    <span>عرض التفاصيل</span>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      {(contract.insurance_amount || contract.allowed_km || contract.notes) && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contract.insurance_amount !== undefined && contract.insurance_amount > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">مبلغ التأمين</p>
                  <p className="font-medium text-slate-900">
                    {contract.insurance_amount.toLocaleString('ar-SA')} ر.ق
                  </p>
                </div>
              )}
              
              {contract.allowed_km !== undefined && contract.allowed_km > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">الحد المسموح بالكيلومترات</p>
                  <p className="font-medium text-slate-900">
                    {contract.allowed_km.toLocaleString('ar-SA')} كم
                  </p>
                </div>
              )}
              
              {contract.notes && (
                <div className="md:col-span-3">
                  <p className="text-xs text-slate-500 mb-1">ملاحظات</p>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{contract.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Created At */}
      <div className="text-center text-xs text-slate-400 pt-2">
        تاريخ الإنشاء: {contract.created_at && format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
      </div>
    </motion.div>
  );
});

ContractHeaderRedesigned.displayName = 'ContractHeaderRedesigned';

export default ContractHeaderRedesigned;
