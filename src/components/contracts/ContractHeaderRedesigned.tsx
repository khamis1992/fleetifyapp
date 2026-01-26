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
    return `${customer.first_name || customer.first_name_ar || ''} ${customer.last_name || customer.last_name_ar || ''}`.trim() || 'عميل غير محدد';
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
      className={cn("space-y-4", className)}
    >
      {/* Official Header Card */}
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrint}
              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onExport}
              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <FileEdit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Contract Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-200">
            {/* Contract Number & Type */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {contract.contract_number}
                </h1>
                <Badge variant="outline" className="text-slate-600 border-slate-300 font-normal">
                  {getContractTypeLabel(contract.contract_type)}
                </Badge>
              </div>
              {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                <p className="text-sm text-slate-500">
                  {daysUntilExpiry} يوم متبقي على انتهاء العقد
                </p>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div 
                onClick={onStatusClick}
                className={cn(
                  "cursor-pointer",
                  onStatusClick && "hover:opacity-80"
                )}
                title="انقر لتغيير حالة العقد"
              >
                <ContractStatusBadge status={contract.status} />
              </div>
              {isExpiringSoon && (
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                  ينتهي قريباً
                </Badge>
              )}
              {isExpired && (
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  منتهي
                </Badge>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {contractProgress > 0 && contractProgress < 100 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                <span>نسبة التقدم</span>
                <span className="font-medium">{Math.round(contractProgress)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-600 rounded-full transition-all duration-300"
                  style={{ width: `${contractProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Key Information Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 bg-slate-50 text-sm font-medium text-slate-600 w-40">فترة العقد</td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {contract.start_date && format(new Date(contract.start_date), 'dd/MM/yyyy')}
                    {' '}<span className="text-slate-400">إلى</span>{' '}
                    {contract.end_date && format(new Date(contract.end_date), 'dd/MM/yyyy')}
                    {contractDuration && (
                      <span className="text-slate-500 mr-2">({contractDuration} يوم)</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 bg-slate-50 text-sm font-medium text-slate-600">العميل</td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <button
                      onClick={() => contract.customer?.id && navigate(`/customers/${contract.customer.id}`)}
                      className="hover:text-blue-600 hover:underline font-medium"
                    >
                      {customerName || 'غير محدد'}
                    </button>
                    {contract.customer?.phone && (
                      <span className="text-slate-500 mr-3 font-mono text-xs" dir="ltr">
                        ({contract.customer.phone})
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 bg-slate-50 text-sm font-medium text-slate-600">الإيجار الشهري</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {contract.monthly_amount?.toLocaleString('ar-SA') || '0'} ر.ق
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 bg-slate-50 text-sm font-medium text-slate-600">المركبة</td>
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <button
                      onClick={() => contract.vehicle?.id && navigate(`/fleet/vehicles/${contract.vehicle.id}`)}
                      className="hover:text-blue-600 hover:underline font-mono font-bold"
                    >
                      {vehicleInfo?.plate || 'غير محدد'}
                    </button>
                    {vehicleInfo?.name && (
                      <span className="text-slate-500 mr-3">
                        ({vehicleInfo.name})
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Notes Section */}
      {contract.notes && (
        <Card className="border border-slate-200 shadow-sm">
          <div className="px-6 py-4">
            <h3 className="text-sm font-medium text-slate-600 mb-2">ملاحظات</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{contract.notes}</p>
          </div>
        </Card>
      )}

      {/* Created At */}
      <div className="text-center text-xs text-slate-400">
        تاريخ الإنشاء: {contract.created_at && format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
      </div>
    </motion.div>
  );
});

ContractHeaderRedesigned.displayName = 'ContractHeaderRedesigned';
