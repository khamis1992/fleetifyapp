import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  AlertTriangle,
  Clock,
  Eye,
  Car,
  Gavel,
  Phone,
  Mail,
  X,
  CreditCard,
  MoreVertical,
  Scale,
  FolderArchive,
  ClipboardCheck,
} from 'lucide-react';
import { type DelinquentCustomer } from '@/hooks/useDelinquentCustomers';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getRiskColor, getRiskLabel } from './types';

/**
 * بطاقة عميل متأخر
 */
export interface CustomerCardProps {
  customer: DelinquentCustomer;
  index: number;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onViewDetails: () => void;
  onRecordPayment: () => void;
  onSendWarning: () => void;
  onCreateCase: () => void;
  onConvertToCase: () => void;
  isGenerated: boolean;
  verificationStatus?: { status: string; verifier_name?: string | null };
}

export const CustomerCard = React.forwardRef<HTMLDivElement, CustomerCardProps>(({
  customer,
  index,
  isSelected,
  onSelect,
  onViewDetails,
  onRecordPayment,
  onSendWarning,
  onCreateCase,
  onConvertToCase,
  isGenerated,
  verificationStatus,
}, ref) => {
  const navigate = useNavigate();
  const riskColor = getRiskColor(customer.risk_level || 'LOW');
  
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "group rounded-2xl border-2 bg-card transition-all duration-300 hover:shadow-lg",
        verificationStatus?.status === 'verified' && "border-green-300 bg-green-50/30",
        !verificationStatus && customer.risk_level === 'CRITICAL' && "border-red-200 hover:border-red-300",
        !verificationStatus && customer.risk_level === 'HIGH' && "border-orange-200 hover:border-orange-300",
        !verificationStatus && customer.risk_level === 'MEDIUM' && "border-amber-200 hover:border-amber-300",
        !verificationStatus && (!customer.risk_level || customer.risk_level === 'LOW') && "hover:border-teal-200"
      )}
    >
      <div className="p-5">
        {/* Header Row */}
        <div className="flex items-start gap-4 mb-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          
          {/* Customer Avatar/Icon */}
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl shadow-md shrink-0",
              customer.risk_level === 'CRITICAL' && "bg-gradient-to-br from-red-100 to-red-200",
              customer.risk_level === 'HIGH' && "bg-gradient-to-br from-orange-100 to-orange-200",
              customer.risk_level === 'MEDIUM' && "bg-gradient-to-br from-amber-100 to-amber-200",
              (!customer.risk_level || customer.risk_level === 'LOW') && "bg-gradient-to-br from-slate-100 to-slate-200"
            )}
          >
            <Users
              className={cn(
                "w-7 h-7",
                customer.risk_level === 'CRITICAL' && "text-red-600",
                customer.risk_level === 'HIGH' && "text-orange-600",
                customer.risk_level === 'MEDIUM' && "text-amber-600",
                (!customer.risk_level || customer.risk_level === 'LOW') && "text-slate-600"
              )}
            />
          </div>

          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-foreground text-lg truncate">{customer.customer_name}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{customer.customer_code}</p>
            {customer.phone && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">{customer.phone}</p>
            )}
          </div>

          {/* Amount */}
          <div className="text-left shrink-0">
            <p className={cn(
              "text-xl font-bold",
              customer.risk_level === 'CRITICAL' && "text-red-700",
              customer.risk_level === 'HIGH' && "text-orange-700",
              customer.risk_level === 'MEDIUM' && "text-amber-700"
            )}>
              {formatCurrency(customer.total_debt || 0)}
            </p>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs mt-1",
                (customer.days_overdue || 0) > 90 && "bg-red-100 text-red-700",
                (customer.days_overdue || 0) > 60 && (customer.days_overdue || 0) <= 90 && "bg-orange-100 text-orange-700"
              )}
            >
              {customer.days_overdue} يوم تأخير
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Contract */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">العقد</p>
            <button
              onClick={() => navigate(`/contracts/${customer.contract_number}`)}
              className="text-sm font-semibold text-teal-600 hover:underline"
            >
              {customer.contract_number || '-'}
            </button>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Car className="w-3 h-3" />
              {customer.vehicle_plate || 'غير محدد'}
            </p>
          </div>

          {/* Breakdown */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">التفاصيل</p>
            <p className="text-xs">إيجار: {formatCurrency(customer.overdue_amount || 0)}</p>
            {(customer.late_penalty || 0) > 0 && (
              <p className="text-xs text-orange-600">غرامة: {formatCurrency(customer.late_penalty)}</p>
            )}
            {(customer.violations_amount || 0) > 0 && (
              <p className="text-xs text-red-600">مخالفات: {formatCurrency(customer.violations_amount)}</p>
            )}
          </div>

          {/* Risk */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">المخاطر</p>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs border-0",
                  customer.risk_level === 'CRITICAL' && "bg-red-500 text-white",
                  customer.risk_level === 'HIGH' && "bg-orange-500 text-white",
                  customer.risk_level === 'MEDIUM' && "bg-amber-500 text-white",
                  (!customer.risk_level || customer.risk_level === 'LOW') && "bg-emerald-500 text-white"
                )}
              >
                {getRiskLabel(customer.risk_level || 'LOW')}
              </Badge>
              <span className="text-xs text-muted-foreground">{customer.risk_score || 0}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(customer.risk_score || 0, 100)}%`,
                  backgroundColor: `hsl(${riskColor})`
                }}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase">التواصل</p>
            <p className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              آخر دفعة: {customer.last_payment_date ? format(new Date(customer.last_payment_date), 'dd/MM/yyyy') : 'غير متوفر'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              المبلغ: {formatCurrency(customer.last_payment_amount || 0)}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {customer.contract_status === 'cancelled' && (
            <Badge className="bg-red-500 text-white gap-1">
              <X className="w-3 h-3" />
              عقد ملغي
            </Badge>
          )}
          {customer.contract_status === 'under_legal_procedure' && (
            <Badge className="bg-violet-500 text-white gap-1">
              <Gavel className="w-3 h-3" />
              تحت إجراء قانوني
            </Badge>
          )}
          {verificationStatus?.status === 'verified' && (
            <Badge className="bg-green-500 text-white gap-1">
              <ClipboardCheck className="w-3 h-3" />
              تم التدقيق
            </Badge>
          )}
          {verificationStatus?.status === 'pending' && (
            <Badge className="bg-amber-500 text-white gap-1">
              <Clock className="w-3 h-3" />
              قيد التدقيق
            </Badge>
          )}
          {isGenerated && (
            <Badge className="bg-orange-500 text-white gap-1 animate-pulse">
              <FolderArchive className="w-3 h-3" />
              جاري فتح بلاغ
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {isGenerated ? (
            <Button
              size="sm"
              onClick={onConvertToCase}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Scale className="w-4 h-4" />
              فتح قضية رسمية
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onViewDetails} className="gap-2">
                <Eye className="w-4 h-4" />
                التفاصيل
              </Button>
              <Button variant="outline" size="sm" onClick={onRecordPayment} className="gap-2 text-emerald-600">
                <CreditCard className="w-4 h-4" />
                تسجيل دفعة
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isGenerated && (
                <>
                  <DropdownMenuItem onClick={onConvertToCase} className="gap-2 bg-green-50 text-green-700">
                    <Scale className="w-4 h-4" />
                    تحويل لقضية رسمية
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onCreateCase} className="gap-2">
                <Gavel className="w-4 h-4" />
                تجهيز الدعوى
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSendWarning} className="gap-2">
                <AlertTriangle className="w-4 h-4" />
                إرسال إنذار
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => customer.phone && window.open(`tel:${customer.phone}`, '_self')}
                className="gap-2"
              >
                <Phone className="w-4 h-4" />
                اتصال بالعميل
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => customer.phone && window.open(`https://wa.me/${customer.phone?.replace(/\D/g, '')}`, '_blank')}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                رسالة WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
});

CustomerCard.displayName = 'CustomerCard';
