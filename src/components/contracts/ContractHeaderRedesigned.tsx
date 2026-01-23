/**
 * Contract Header Component - Modern Redesigned Version
 * Professional SaaS design with improved visual hierarchy and modern aesthetics
 *
 * Features:
 * - Gradient hero banner with contract number prominently displayed
 * - Modern card-based layout with enhanced status badges
 * - Improved typography and spacing
 * - Better visual hierarchy for contract information
 * - Color-coded status indicators
 * - Responsive design for mobile and desktop
 * - Smooth animations with Framer Motion
 * - Action buttons with improved UX
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
  AlertTriangle,
  CheckCircle,
  FileText,
  Phone,
  Mail,
  Hash,
  Building2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ContractStatusBadge } from './ContractStatusBadge';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';

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
interface ContractHeaderRedesignedProps {
  contract: Contract;
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onStatusClick?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

// ===== Helper Functions =====
const getContractTypeLabel = (type: string) => {
  switch (type) {
    case 'rental': return 'عقد إيجار';
    case 'lease': return 'عقد تأجير';
    case 'corporate': return 'عقد شركة';
    default: return type;
  }
};

const getPaymentMethodLabel = (method?: string) => {
  switch (method) {
    case 'cash': return { label: 'نقدي', icon: DollarSign, color: 'text-green-600 bg-green-50 border-green-200' };
    case 'card': return { label: 'بطاقة', icon: CreditCard, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    case 'bank': return { label: 'تحويل بنكي', icon: Building2, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    default: return { label: 'غير محدد', icon: CreditCard, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  }
};

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
  const contractDuration = useMemo(() => {
    if (!contract.start_date || !contract.end_date) return null;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }, [contract.start_date, contract.end_date]);

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

  const paymentMethodInfo = getPaymentMethodLabel(contract.payment_method);

  // Customer name
  const customerName = useMemo(() => {
    if (!contract.customer) return null;
    const customer = contract.customer;
    if (customer.customer_type === 'company') {
      return customer.company_name_ar || customer.company_name || 'شركة غير محددة';
    }
    return `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim() || 'عميل غير محدد';
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
      className={cn("space-y-6", className)}
    >
      {/* Hero Section - Gradient Banner */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {/* Gradient Cover */}
        <div className="relative h-36 bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600">
          {/* Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di0yaDJ2MmgtMnptMC00djJoMnYyaC0yem0wLTR2MmgydjJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

          {/* Top Action Bar */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 transition-all"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 transition-all"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrint}
                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 transition-all"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onExport}
                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 transition-all"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm border-0 transition-all"
              >
                <FileEdit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Section - Overlapping the gradient */}
        <div className="relative px-8 pb-8">
          <div className="flex items-start justify-between mb-6 -mt-8">
            {/* Contract Number & Status */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-xl border-4 border-white">
                  <Hash className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900">
                    {contract.contract_number}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-neutral-600 border-neutral-300">
                      <FileText className="w-3 h-3 ml-1" />
                      {getContractTypeLabel(contract.contract_type)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <div 
                  onClick={onStatusClick}
                  className={cn(
                    "cursor-pointer transition-transform hover:scale-105",
                    onStatusClick && "hover:ring-2 hover:ring-teal-300 hover:ring-offset-2 rounded-full"
                  )}
                  title="انقر لتغيير حالة العقد"
                >
                  <ContractStatusBadge status={contract.status} />
                </div>
                {isExpiringSoon && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                    <AlertTriangle className="w-3 h-3 ml-1" />
                    ينتهي قريباً
                  </Badge>
                )}
                {isExpired && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                    <Clock className="w-3 h-3 ml-1" />
                    منتهي
                  </Badge>
                )}
              </div>
              {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                <div className="text-sm text-neutral-500">
                  <Clock className="w-3 h-3 inline ml-1" />
                  {daysUntilExpiry} يوم متبقي
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {contractProgress > 0 && contractProgress < 100 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                <span>تقدم العقد</span>
                <span className="font-medium">{Math.round(contractProgress)}%</span>
              </div>
              <Progress value={contractProgress} className="h-2" />
            </div>
          )}

          {/* Key Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Contract Period */}
            <motion.div
              variants={scaleIn}
              className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-700 font-medium mb-1">فترة العقد</p>
                  <p className="text-sm font-semibold text-blue-900 truncate">
                    {contract.start_date && format(new Date(contract.start_date), 'dd MMM yyyy', { locale: ar })}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    إلى {contract.end_date && format(new Date(contract.end_date), 'dd MMM yyyy', { locale: ar })}
                  </p>
                  {contractDuration && (
                    <p className="text-xs text-blue-500 mt-1">
                      المدة: {contractDuration} يوم
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Customer Name */}
            <motion.div
              variants={scaleIn}
              className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100 hover:shadow-md transition-all cursor-pointer"
              onClick={() => contract.customer?.id && navigate(`/customers/${contract.customer.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-teal-700 font-medium mb-1">العميل</p>
                  <p className="text-sm font-bold text-teal-900 truncate">
                    {customerName || 'غير محدد'}
                  </p>
                  {contract.customer?.phone && (
                    <p className="text-xs text-teal-600 mt-0.5 font-mono" dir="ltr">
                      {contract.customer.phone}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Monthly Rent */}
            <motion.div
              variants={scaleIn}
              className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-700 font-medium mb-1">الإيجار الشهري</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {contract.monthly_amount?.toLocaleString('ar-SA') || '0'} ر.ق
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Vehicle Plate Number */}
            <motion.div
              variants={scaleIn}
              className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100 hover:shadow-md transition-all cursor-pointer"
              onClick={() => contract.vehicle?.id && navigate(`/fleet/vehicles/${contract.vehicle.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-indigo-700 font-medium mb-1">رقم المركبة</p>
                  <p className="text-lg font-bold text-indigo-900 font-mono">
                    {vehicleInfo?.plate || 'غير محدد'}
                  </p>
                  {vehicleInfo?.name && (
                    <p className="text-xs text-indigo-600 mt-0.5 truncate">
                      {vehicleInfo.name}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Card>

      {/* Customer & Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Card */}
        {customerName && (
          <motion.div
            variants={scaleIn}
            whileHover={{ y: -2 }}
            className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-teal-200 hover:shadow-md transition-all cursor-pointer"
            onClick={() => contract.customer?.id && navigate(`/customers/${contract.customer.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-500 mb-1">العميل</p>
                <h3 className="font-bold text-neutral-900 text-base mb-2 truncate">{customerName}</h3>
                <div className="space-y-1">
                  {contract.customer?.national_id && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Hash className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-semibold">رقم الهوية:</span>
                      <span className="font-mono font-semibold" dir="ltr">{contract.customer.national_id}</span>
                    </div>
                  )}
                  {contract.customer?.customer_code && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Badge className="bg-teal-100 text-teal-700 border-teal-200 font-semibold text-xs px-2 py-0.5">
                        {contract.customer.customer_code}
                      </Badge>
                    </div>
                  )}
                  {contract.customer?.phone && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-mono" dir="ltr">{contract.customer.phone}</span>
                    </div>
                  )}
                  {contract.customer?.email && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{contract.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Vehicle Card */}
        {vehicleInfo && (
          <motion.div
            variants={scaleIn}
            whileHover={{ y: -2 }}
            className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
            onClick={() => contract.vehicle?.id && navigate(`/fleet/vehicles/${contract.vehicle.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-500 mb-1">المركبة</p>
                <h3 className="font-bold text-neutral-900 text-base mb-2">{vehicleInfo.name}</h3>
                <div className="space-y-1">
                  {vehicleInfo.plate && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Hash className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-mono font-bold">{vehicleInfo.plate}</span>
                    </div>
                  )}
                  {vehicleInfo.color && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <div className={cn("w-3 h-3 rounded-full border border-neutral-300")} />
                      <span>{vehicleInfo.color}</span>
                    </div>
                  )}
                  {contract.vehicle?.year && (
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{contract.vehicle.year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Notes Section */}
      {contract.notes && (
        <motion.div
          variants={scaleIn}
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">ملاحظات</p>
              <p className="text-sm text-amber-800 leading-relaxed">{contract.notes}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Created At Badge */}
      <motion.div
        variants={scaleIn}
        className="flex items-center justify-center"
      >
        <Badge variant="outline" className="text-neutral-500 border-neutral-200">
          <Clock className="w-3 h-3 ml-1" />
          {contract.created_at && format(new Date(contract.created_at), 'dd MMMM yyyy HH:mm', { locale: ar })}
        </Badge>
      </motion.div>
    </motion.div>
  );
});

ContractHeaderRedesigned.displayName = 'ContractHeaderRedesigned';
