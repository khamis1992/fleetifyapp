/**
 * صفحة تفاصيل العميل - التصميم الجديد (Bento Style)
 * مستوحى من تصميم الداشبورد مع ألوان متناسقة
 * 
 * @component CustomerDetailsPageNew
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { 
  useCustomerDocuments, 
  useUploadCustomerDocument, 
  useDeleteCustomerDocument, 
  useDownloadCustomerDocument 
} from '@/hooks/useCustomerDocuments';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Edit3,
  FileText,
  Archive,
  Trash2,
  CheckCircle,
  Hash,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Cake,
  CreditCard,
  Briefcase,
  User,
  Users,
  Wallet,
  TrendingUp,
  Car,
  Plus,
  Eye,
  RefreshCw,
  Star,
  Landmark,
  Banknote,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  Download,
  Upload,
  Folder,
  Activity,
  AlertTriangle,
  MessageSquare,
  PhoneCall,
  Globe,
  Building2,
  IdCard,
  FileImage,
  MoreVertical,
  Printer,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { UnifiedPaymentForm } from '@/components/finance/UnifiedPaymentForm';
import { EnhancedCustomerForm } from '@/components/customers/EnhancedCustomerForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ===== Types =====
interface CustomerDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_url?: string;
  uploaded_at: string;
  file_size?: number;
  notes?: string;
}

// ===== Helper Functions =====

// التحقق من صحة QID قطري (11 رقم)
const isValidQatarQID = (qid: string | null | undefined): boolean => {
  if (!qid) return false;
  const cleanQID = qid.replace(/\D/g, '');
  return cleanQID.length === 11;
};

// التحقق من صحة رقم هاتف قطري (يبدأ بـ 3, 5, 6, 7)
const isValidQatarPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // قطر: +974 + 8 أرقام تبدأ بـ 3, 5, 6, 7
  if (cleanPhone.startsWith('974')) {
    const localNumber = cleanPhone.substring(3);
    return localNumber.length === 8 && /^[3567]/.test(localNumber);
  }
  return cleanPhone.length === 8 && /^[3567]/.test(cleanPhone);
};

// ===== Components =====

// مكون تحذيرات البيانات الناقصة
const MissingDataWarnings = ({ customer }: { customer: any }) => {
  const { missingFields, invalidFields } = useMemo(() => {
    const missing: { label: string; priority: 'high' | 'medium' | 'low' }[] = [];
    const invalid: { label: string; value: string }[] = [];
    
    // الحقول المهمة جداً
    if (!customer.national_id && !customer.qid) {
      missing.push({ label: 'الهوية الوطنية / QID', priority: 'high' });
    } else {
      // التحقق من صحة QID إذا موجود
      const qid = customer.qid || customer.national_id;
      if (qid && !isValidQatarQID(qid)) {
        invalid.push({ label: 'QID غير صحيح', value: qid });
      }
    }
    if (!customer.driver_license) {
      missing.push({ label: 'رخصة القيادة', priority: 'high' });
    }
    
    // التحقق من صحة الهاتف
    if (customer.phone && !isValidQatarPhone(customer.phone)) {
      invalid.push({ label: 'رقم الهاتف غير قياسي', value: customer.phone });
    }
    
    // الحقول متوسطة الأهمية
    if (!customer.address) {
      missing.push({ label: 'العنوان', priority: 'medium' });
    }
    if (!customer.email) {
      missing.push({ label: 'البريد الإلكتروني', priority: 'medium' });
    }
    if (!customer.date_of_birth) {
      missing.push({ label: 'تاريخ الميلاد', priority: 'low' });
    }
    
    return { missingFields: missing, invalidFields: invalid };
  }, [customer]);

  if (missingFields.length === 0 && invalidFields.length === 0) return null;

  const highPriorityCount = missingFields.filter(f => f.priority === 'high').length;
  const hasIssues = highPriorityCount > 0 || invalidFields.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "mb-4 p-4 rounded-xl border flex items-start gap-3",
        hasIssues ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
      )}
    >
      <AlertTriangle className={cn(
        "w-5 h-5 mt-0.5",
        hasIssues ? "text-amber-500" : "text-blue-500"
      )} />
      <div className="flex-1">
        {missingFields.length > 0 && (
          <>
            <h4 className={cn(
              "text-sm font-bold mb-1",
              hasIssues ? "text-amber-800" : "text-blue-800"
            )}>
              بيانات ناقصة ({missingFields.length})
            </h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {missingFields.map((field, idx) => (
                <Badge
                  key={idx}
                  className={cn(
                    "text-xs",
                    field.priority === 'high' ? "bg-red-100 text-red-700" :
                    field.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                    "bg-neutral-100 text-neutral-600"
                  )}
                >
                  {field.label}
                </Badge>
              ))}
            </div>
          </>
        )}
        {invalidFields.length > 0 && (
          <>
            <h4 className="text-sm font-bold mb-1 text-orange-800">
              بيانات غير صحيحة ({invalidFields.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {invalidFields.map((field, idx) => (
                <Badge key={idx} className="text-xs bg-orange-100 text-orange-700">
                  {field.label}
                </Badge>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

// ===== Tab Components =====

// تبويب المعلومات الشخصية
const PersonalInfoTab = ({ customer }: { customer: any }) => {
  const infoItems = [
    { label: 'صاحب العمل', value: customer.employer || '-', icon: Building2 },
    { label: 'المجموعة', value: customer.group_name || 'عميل عادي', icon: Users },
    { label: 'الاسم الكامل', value: `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim() || '-', icon: User },
    { label: 'المنصب', value: customer.job_title || '-', icon: Briefcase },
    { label: 'الاسم الأول', value: customer.first_name_ar || customer.first_name || '-', icon: User },
    { label: 'الاسم الأوسط', value: customer.middle_name || '-', icon: User },
    { label: 'اسم العائلة', value: customer.last_name_ar || customer.last_name || '-', icon: User },
  ];

  const addressItems = [
    { label: 'الرقم الفيدرالي', value: customer.national_id || '-' },
    { label: 'العنوان 1', value: customer.address || '-' },
    { label: 'العنوان 2', value: customer.address_2 || '-' },
    { label: 'المدينة', value: customer.city || '-' },
    { label: 'المنطقة', value: customer.state || '-' },
    { label: 'البلد', value: customer.country || 'قطر' },
    { label: 'الرمز البريدي', value: customer.postal_code || '-' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* معلومات الموظف */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200">
        <h4 className="text-sm font-bold text-neutral-900 mb-4">معلومات العميل</h4>
        <div className="grid grid-cols-2 gap-4">
          {infoItems.map((item, index) => (
            <div key={index} className="space-y-1">
              <p className="text-xs text-neutral-500">{item.label}</p>
              <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* معلومات العنوان */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200">
        <h4 className="text-sm font-bold text-neutral-900 mb-4">معلومات العنوان</h4>
        <div className="grid grid-cols-2 gap-4">
          {addressItems.map((item, index) => (
            <div key={index} className="space-y-1">
              <p className="text-xs text-neutral-500">{item.label}</p>
              <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// تبويب أرقام الهاتف
const PhoneNumbersTab = ({ customer }: { customer: any }) => {
  const phones = [
    { type: 'رئيسي', number: customer.phone, icon: Phone },
    { type: 'ثانوي', number: customer.secondary_phone || '-', icon: Phone },
    { type: 'عمل', number: customer.work_phone || '-', icon: Briefcase },
    { type: 'واتساب', number: customer.whatsapp || customer.phone || '-', icon: MessageSquare },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-neutral-200"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {phones.map((phone, index) => {
          const isValid = phone.number !== '-' && isValidQatarPhone(phone.number);
          const hasNumber = phone.number && phone.number !== '-';
          
          return (
            <div 
              key={index} 
              className={cn(
                "p-4 rounded-xl border transition-colors",
                hasNumber && !isValid 
                  ? "bg-amber-50 border-amber-200" 
                  : "bg-neutral-50 border-neutral-100 hover:border-coral-200"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    hasNumber && !isValid ? "bg-amber-100" : "bg-coral-100"
                  )}>
                    <phone.icon className={cn(
                      "w-5 h-5",
                      hasNumber && !isValid ? "text-amber-600" : "text-coral-600"
                    )} />
                  </div>
                  <span className="text-xs font-medium text-neutral-500">{phone.type}</span>
                </div>
                {hasNumber && (
                  <Badge className={cn(
                    "text-[10px]",
                    isValid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {isValid ? 'صحيح' : 'غير قياسي'}
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold text-neutral-900 font-mono" dir="ltr">
                {phone.number}
              </p>
              {phone.number !== '-' && (
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-coral-600 hover:text-coral-700 p-0 h-auto"
                    onClick={() => window.open(`tel:${phone.number}`, '_self')}
                  >
                    <PhoneCall className="w-4 h-4 mr-1" />
                    اتصال
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-emerald-600 hover:text-emerald-700 p-0 h-auto"
                    onClick={() => window.open(`https://wa.me/${phone.number.replace(/[^0-9]/g, '')}`, '_blank')}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    واتساب
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// تبويب العقود
const ContractsTab = ({ contracts, navigate, customerId }: { contracts: any[], navigate: any, customerId: string }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">العقود النشطة</h4>
          <p className="text-xs text-neutral-500">{contracts.length} عقد</p>
        </div>
        <Button 
          className="bg-coral-500 hover:bg-coral-600 text-white gap-2"
          onClick={() => navigate(`/contracts?customer=${customerId}`)}
        >
          <Plus className="w-4 h-4" />
          عقد جديد
        </Button>
      </div>

      {contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contracts.map((contract, index) => {
            const vehicleName = contract.vehicle
              ? `${contract.vehicle.make} ${contract.vehicle.model}`
              : 'غير محدد';
            const endDate = contract.end_date ? new Date(contract.end_date) : null;
            const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;

            return (
              <motion.div
                key={contract.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-coral-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/contracts/${contract.contract_number}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral-500 to-coral-600 flex items-center justify-center">
                      <Car className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h5 className="font-bold text-neutral-900">{vehicleName}</h5>
                      <p className="text-xs text-neutral-500 font-mono">#{contract.contract_number}</p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-xs",
                    contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {contract.status === 'active' ? 'نشط' : 'معلق'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-neutral-50 rounded-lg">
                    <p className="text-xs text-neutral-500">الإيجار الشهري</p>
                    <p className="text-sm font-bold text-coral-600">{contract.monthly_amount?.toLocaleString()} ر.ق</p>
                  </div>
                  <div className="p-2 bg-neutral-50 rounded-lg">
                    <p className="text-xs text-neutral-500">ينتهي في</p>
                    <p className="text-sm font-bold text-neutral-900">
                      {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yy') : '-'}
                    </p>
                  </div>
                  <div className="p-2 bg-neutral-50 rounded-lg">
                    <p className="text-xs text-neutral-500">المتبقي</p>
                    <p className={cn(
                      "text-sm font-bold",
                      daysRemaining <= 30 ? 'text-red-600' : daysRemaining <= 60 ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {daysRemaining} يوم
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">لا توجد عقود لهذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

// تبويب المركبات
const VehiclesTab = ({ contracts, navigate }: { contracts: any[], navigate: any }) => {
  // استخراج المركبات من العقود النشطة
  const vehicles = useMemo(() => {
    return contracts
      .filter(c => c.vehicle && c.status === 'active')
      .map(c => ({
        ...c.vehicle,
        contractNumber: c.contract_number,
        contractId: c.id,
        monthlyAmount: c.monthly_amount,
      }));
  }, [contracts]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">المركبات المستأجرة</h4>
          <p className="text-xs text-neutral-500">{vehicles.length} مركبة</p>
        </div>
      </div>

      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(`/fleet/${vehicle.id}`)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 className="font-bold text-neutral-900">{vehicle.make} {vehicle.model}</h5>
                  <p className="text-xs text-neutral-500">{vehicle.year}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">رقم اللوحة</span>
                  <span className="font-mono font-bold text-neutral-900">{vehicle.plate_number}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">رقم العقد</span>
                  <span className="font-mono text-blue-600">{vehicle.contractNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">الإيجار الشهري</span>
                  <span className="font-bold text-coral-600">{vehicle.monthlyAmount?.toLocaleString()} ر.ق</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <Car className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">لا توجد مركبات مستأجرة حالياً</p>
        </div>
      )}
    </motion.div>
  );
};

// تبويب الفواتير
const InvoicesTab = ({ invoices, navigate }: { invoices: any[], navigate: any }) => {
  const totalOutstanding = useMemo(() => {
    return invoices
      .filter(inv => inv.payment_status !== 'paid')
      .reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);
  }, [invoices]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">الفواتير</h4>
          <p className="text-xs text-neutral-500">{invoices.length} فاتورة</p>
        </div>
        {totalOutstanding > 0 && (
          <Badge className="bg-red-100 text-red-700">
            مستحق: {totalOutstanding.toLocaleString()} ر.ق
          </Badge>
        )}
      </div>

      {invoices.length > 0 ? (
        <div className="space-y-3">
          {invoices.map((invoice, index) => {
            const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
            const isPaid = invoice.payment_status === 'paid';
            const isOverdue = !isPaid && invoice.due_date && new Date(invoice.due_date) < new Date();

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                  isPaid ? "bg-green-50 border-green-200" : 
                  isOverdue ? "bg-red-50 border-red-200" : 
                  "bg-white border-neutral-200"
                )}
                onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isPaid ? "bg-green-100 text-green-600" : 
                    isOverdue ? "bg-red-100 text-red-600" : 
                    "bg-amber-100 text-amber-600"
                  )}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{invoice.invoice_number || `INV-${invoice.id.substring(0, 8)}`}</p>
                    <p className="text-xs text-neutral-500">
                      {invoice.created_at ? format(new Date(invoice.created_at), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={cn(
                    "font-bold",
                    isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-amber-600"
                  )}>
                    {invoice.total_amount?.toLocaleString()} ر.ق
                  </p>
                  <Badge className={cn(
                    "text-[10px]",
                    isPaid ? "bg-green-100 text-green-700" : 
                    isOverdue ? "bg-red-100 text-red-700" : 
                    "bg-amber-100 text-amber-700"
                  )}>
                    {isPaid ? 'مسدد' : isOverdue ? 'متأخر' : 'مستحق'}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <Wallet className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">لا توجد فواتير لهذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

// تبويب المدفوعات
const PaymentsTab = ({ payments, navigate }: { payments: any[], navigate: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">سجل المدفوعات</h4>
          <p className="text-xs text-neutral-500">{payments.length} عملية</p>
        </div>
        <Button 
          className="bg-green-500 hover:bg-green-600 text-white gap-2"
          onClick={() => setIsPaymentDialogOpen(true)}
        >
          <Plus className="w-4 h-4" />
          تسجيل دفعة
        </Button>
      </div>

      {payments.length > 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-600">رقم الدفعة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-600">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-600">الطريقة</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.slice(0, 5).map((payment, index) => (
                <motion.tr 
                  key={payment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-neutral-900">#{payment.payment_number || payment.id.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">
                    {payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">{payment.amount?.toLocaleString()} ر.ق</td>
                  <td className="px-4 py-3 text-sm text-neutral-600">{payment.payment_method || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn(
                      "text-xs",
                      payment.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {payment.payment_status === 'completed' ? 'مكتمل' : 'معلق'}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <CreditCard className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">لا توجد مدفوعات مسجلة</p>
        </div>
      )}
    </motion.div>
  );
};

// تبويب الملاحظات
const NotesTab = ({ customer }: { customer: any }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-neutral-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-neutral-900">الملاحظات</h4>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة ملاحظة
        </Button>
      </div>
      <div className="min-h-[200px] p-4 bg-neutral-50 rounded-xl border border-neutral-100">
        <p className="text-neutral-500 text-sm">
          {customer.notes || 'لا توجد ملاحظات مسجلة لهذا العميل...'}
        </p>
      </div>
    </motion.div>
  );
};

// تبويب المخالفات المرورية
const ViolationsTab = ({ violations, navigate, isLoading }: { violations: any[], navigate: any, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center py-12"
      >
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        <span className="mr-2 text-neutral-500">جاري تحميل المخالفات...</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">المخالفات المرورية</h4>
          <p className="text-xs text-neutral-500">{violations.length} مخالفة مسجلة</p>
        </div>
      </div>

      {violations.length > 0 ? (
        <div className="space-y-4">
          {violations.map((violation: any, index: number) => (
            <motion.div
              key={violation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-neutral-200 hover:border-red-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    violation.status === 'paid' 
                      ? "bg-green-100" 
                      : violation.status === 'pending' 
                        ? "bg-amber-100" 
                        : "bg-red-100"
                  )}>
                    <AlertTriangle className={cn(
                      "w-6 h-6",
                      violation.status === 'paid' 
                        ? "text-green-600" 
                        : violation.status === 'pending' 
                          ? "text-amber-600" 
                          : "text-red-600"
                    )} />
                  </div>
                  <div>
                    <h5 className="font-bold text-neutral-900">{violation.violation_type}</h5>
                    <p className="text-xs text-neutral-500 mt-1">
                      رقم المخالفة: {violation.violation_number}
                    </p>
                    {violation.vehicle && (
                      <p className="text-xs text-neutral-500">
                        المركبة: {violation.vehicle.make} {violation.vehicle.model} - {violation.vehicle.plate_number}
                      </p>
                    )}
                  </div>
                </div>
                <Badge className={cn(
                  "text-xs px-3",
                  violation.status === 'paid' 
                    ? "bg-green-100 text-green-700" 
                    : violation.status === 'pending' 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-red-100 text-red-700"
                )}>
                  {violation.status === 'paid' ? 'مدفوعة' : violation.status === 'pending' ? 'قيد السداد' : 'غير مدفوعة'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">تاريخ المخالفة</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {violation.violation_date 
                      ? format(new Date(violation.violation_date), 'dd/MM/yyyy', { locale: ar }) 
                      : '-'}
                  </p>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">الموقع</p>
                  <p className="text-sm font-semibold text-neutral-900">{violation.location || '-'}</p>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">المبلغ</p>
                  <p className="text-sm font-bold text-red-600">{violation.fine_amount?.toLocaleString()} ر.ق</p>
                </div>
                <div className="p-2 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">الجهة المصدرة</p>
                  <p className="text-sm font-semibold text-neutral-900">{violation.issuing_authority || '-'}</p>
                </div>
              </div>

              {violation.violation_description && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500 mb-1">الوصف</p>
                  <p className="text-sm text-neutral-700">{violation.violation_description}</p>
                </div>
              )}

              {violation.contract && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/contracts/${violation.contract.contract_number}`)}
                  >
                    <FileText className="w-4 h-4" />
                    عرض العقد #{violation.contract.contract_number}
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <AlertTriangle className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">لا توجد مخالفات مرورية مسجلة</p>
          <p className="text-neutral-400 text-sm mt-1">لم يتم تسجيل أي مخالفات على عقود هذا العميل</p>
        </div>
      )}
    </motion.div>
  );
};

// تبويب سجل النشاط
const ActivityTab = ({ customerId, companyId }: { customerId: string, companyId: string }) => {
  // جلب سجل النشاط من العمليات المختلفة
  const activities = useMemo(() => {
    // سيتم ملء هذا من البيانات الفعلية لاحقاً
    return [];
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">سجل النشاط</h4>
          <p className="text-xs text-neutral-500">آخر الأنشطة والتحديثات</p>
        </div>
      </div>

      {activities.length > 0 ? (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-neutral-200" />
          <div className="space-y-4">
            {activities.map((activity: any, index: number) => (
              <motion.div
                key={activity.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pr-14"
              >
                <div className="absolute right-4 w-4 h-4 rounded-full bg-coral-500 border-2 border-white shadow" />
                <div className="bg-white rounded-xl p-4 border border-neutral-200 hover:border-coral-200 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{activity.description}</p>
                      <p className="text-xs text-neutral-500 mt-1">{activity.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-neutral-50 rounded-2xl p-12 text-center border border-neutral-200">
          <Activity className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 font-medium">لا توجد أنشطة مسجلة حتى الآن</p>
          <p className="text-neutral-400 text-sm mt-1">سيظهر سجل النشاط هنا عند إجراء أي عمليات</p>
        </div>
      )}
    </motion.div>
  );
};

// ===== Main Component =====
const CustomerDetailsPageNew = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State
  const [activeTab, setActiveTab] = useState('info');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('identity');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Queries
  const { data: customer, isLoading: loadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer-details-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) throw new Error('معرف غير صالح');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['customer-contracts-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select(`*, vehicle:vehicles!vehicle_id(id, make, model, year, plate_number)`)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['customer-payments-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: documents = [] } = useCustomerDocuments(customerId);
  const uploadDocument = useUploadCustomerDocument();

  // جلب الفواتير بشكل منفصل
  const { data: customerInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['customer-invoices', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          contract:contracts!contract_id(id, contract_number)
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  // جلب المخالفات المرورية
  const { data: trafficViolations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['customer-traffic-violations-new', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          *,
          contract:contracts!contract_id(id, contract_number, customer_id),
          vehicle:vehicles!vehicle_id(id, make, model, plate_number)
        `)
        .eq('company_id', companyId)
        .order('violation_date', { ascending: false });
      if (error) {
        console.error('Error fetching traffic violations:', error);
        return [];
      }
      // تصفية المخالفات المرتبطة بالعميل
      return data?.filter(v => v.contract?.customer_id === customerId) || [];
    },
    enabled: !!customerId && !!companyId,
  });

  // Computed
  const customerName = useMemo(() => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name_ar || customer.company_name || 'شركة';
    }
    const firstName = customer.first_name_ar || customer.first_name || '';
    const lastName = customer.last_name_ar || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'غير محدد';
  }, [customer]);

  const stats = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalContractAmount = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.contract_amount || 0), 0);
    const totalPaid = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.total_paid || 0), 0);
    const outstandingAmount = totalContractAmount - totalPaid;
    const paidOnTime = payments.filter(p => p.payment_status === 'completed').length;
    // إذا لم تكن هناك عقود أو مدفوعات، لا تظهر نسبة
    const commitmentRate = activeContracts > 0 && payments.length > 0 
      ? Math.round((paidOnTime / payments.length) * 100) 
      : null;

    return { activeContracts, outstandingAmount, commitmentRate, totalPayments };
  }, [contracts, payments]);

  const getInitials = (name: string): string => {
    if (!name || name === 'غير محدد') return '؟';
    const names = name.split(' ').filter(n => n.length > 0);
    return names.slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  // Handlers
  const handleBack = () => navigate('/customers');
  const handleEdit = () => setIsEditDialogOpen(true);
  const handlePrint = () => window.print();

  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !customerId) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الملف كبير جداً', variant: 'destructive' });
      return;
    }
    
    setIsUploading(true);
    try {
      await uploadDocument.mutateAsync({
        customer_id: customerId,
        document_type: selectedDocumentType,
        document_name: file.name,
        file: file,
      });
      toast({ title: 'تم الرفع بنجاح', description: 'تم رفع المستند بنجاح' });
    } catch (error) {
      toast({ 
        title: 'فشل الرفع', 
        description: 'حدث خطأ أثناء رفع المستند',
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }, [customerId, selectedDocumentType, uploadDocument, toast]);

  // Loading & Error States
  if (isAuthenticating || !companyId || loadingCustomer) {
    return <PageSkeletonFallback />;
  }

  if (customerError || !customer) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-neutral-200 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-neutral-500 mb-4">لم يتم العثور على هذا العميل</p>
          <Button onClick={handleBack} className="bg-coral-500 hover:bg-coral-600">
            العودة للعملاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header Bar */}
      <TooltipProvider>
        <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-neutral-600 hover:text-neutral-900">
                  <ArrowRight className="w-4 h-4" />
                  العودة للقائمة
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* أزرار الإجراءات السريعة */}
                {customer?.phone && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!customer?.phone) {
                              toast({ 
                                  title: 'رقم الهاتف غير متوفر', 
                                  description: 'لا يوجد رقم هاتف مسجل لهذا العميل',
                                  variant: 'destructive' 
                                });
                              return;
                            }
                            window.open(`tel:${customer.phone}`, '_self');
                          }}
                          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Phone className="w-4 h-4" />
                          اتصال
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>اتصال بالعميل مباشرة</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!customer?.phone) {
                              toast({ 
                                  title: 'رقم الهاتف غير متوفر', 
                                  description: 'لا يوجد رقم هاتف مسجل لهذا العميل',
                                  variant: 'destructive' 
                                });
                              return;
                            }
                            const whatsappNumber = customer.whatsapp || customer.phone;
                            const cleanedNumber = whatsappNumber.replace(/[^0-9]/g, '');
                            if (!cleanedNumber || cleanedNumber.length < 7) {
                              toast({ 
                                  title: 'رقم الهاتف غير صالح', 
                                  description: 'رقم الهاتف لا يمكن استخدامه مع واتساب',
                                  variant: 'destructive' 
                                });
                              return;
                            }
                            window.open(`https://wa.me/${cleanedNumber}`, '_blank');
                          }}
                          className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        >
                          <MessageSquare className="w-4 h-4" />
                          واتساب
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>مراسلة عبر واتساب</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!customerId) {
                                  toast({ 
                                        title: 'خطأ', 
                                        description: 'معرف العميل غير متوفر',
                                        variant: 'destructive' 
                                      });
                                  return;
                                }
                                navigate(`/customers/crm?customer=${customerId}`);
                              }}
                              className="gap-1.5"
                        >
                          <Activity className="w-4 h-4" />
                          CRM
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إدارة علاقات العميل</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!customerId) {
                                  toast({ 
                                        title: 'خطأ', 
                                        description: 'معرف العميل غير متوفر',
                                        variant: 'destructive' 
                                      });
                                  return;
                                }
                                navigate(`/contracts/new?customer=${customerId}`);
                              }}
                              className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Plus className="w-4 h-4" />
                          عقد جديد
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إنشاء عقد جديد لهذا العميل</p>
                    </TooltipContent>
                  </Tooltip>
              
              <span className="text-sm text-neutral-500 mr-2">|</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    خيارات
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleEdit} className="gap-2">
                    <Edit3 className="w-4 h-4" />
                    تعديل البيانات
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint} className="gap-2">
                    <Printer className="w-4 h-4" />
                    طباعة
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Share2 className="w-4 h-4" />
                    مشاركة
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    حذف العميل
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={handleEdit}
                className="bg-coral-500 hover:bg-coral-600 text-white gap-2"
              >
                <Edit3 className="w-4 h-4" />
                تعديل
              </Button>
            </div>
          </div>
        </div>
      </header>
      </TooltipProvider>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-neutral-200 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="w-24 h-24 rounded-full border-4 border-coral-100">
                  <AvatarFallback className="bg-gradient-to-br from-coral-500 to-coral-600 text-white text-2xl font-bold">
                    {getInitials(customerName)}
                  </AvatarFallback>
                </Avatar>
                {customer.is_active && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-neutral-900">{customerName}</h1>
                  {customer.is_vip && (
                    <Badge className="bg-amber-100 text-amber-700 gap-1">
                      <Star className="w-3 h-3" />
                      VIP
                    </Badge>
                  )}
                </div>
                <p className="text-neutral-500 text-sm">{customer.job_title || 'عميل'}</p>
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 lg:pr-6 lg:border-r border-neutral-200">
              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Cake className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">تاريخ الميلاد</p>
                  <p className="text-sm font-semibold text-neutral-900">{customer.date_of_birth || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">رقم الهاتف</p>
                  <p className="text-sm font-semibold text-neutral-900 font-mono" dir="ltr">{customer.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">البريد الإلكتروني</p>
                  <p className="text-sm font-semibold text-neutral-900 truncate max-w-[180px]">{customer.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* تحذيرات البيانات الناقصة */}
        <MissingDataWarnings customer={customer} />

        {/* Stats Cards - التصميم المحدث */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* بطاقة العقود النشطة */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
          >
            {/* الحد الملون على اليسار */}
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-blue-500 rounded-full" />
            
            {/* الأيقونة في الأعلى يمين */}
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            
            {/* الرقم والوصف */}
            <div className="text-center">
              <p className="text-4xl font-black text-blue-600 mb-2">
                {stats.activeContracts}
              </p>
              <p className="text-sm font-medium text-neutral-600">العقود النشطة</p>
            </div>
          </motion.div>

          {/* بطاقة المبلغ المستحق */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-amber-500 rounded-full" />
            
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-4xl font-black text-amber-600 mb-2">
                {stats.outstandingAmount.toLocaleString()}
                <span className="text-xl font-bold mr-1">ر.ق</span>
              </p>
              <p className="text-sm font-medium text-neutral-600">المبلغ المستحق</p>
            </div>
          </motion.div>

          {/* بطاقة نسبة الالتزام */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-green-500 rounded-full" />
            
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-green-600" />
              </div>
            </div>
            
            <div className="text-center">
              <p className={`text-4xl font-black mb-2 ${stats.commitmentRate !== null ? 'text-green-600' : 'text-neutral-400'}`}>
                {stats.commitmentRate !== null ? `${stats.commitmentRate}%` : '-'}
              </p>
              <p className="text-sm font-medium text-neutral-600">نسبة الالتزام</p>
              {stats.commitmentRate === null && (
                <p className="text-xs text-neutral-400 mt-1">لا توجد عقود</p>
              )}
            </div>
          </motion.div>

          {/* بطاقة إجمالي المدفوعات */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-purple-500 rounded-full" />
            
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-4xl font-black text-purple-600 mb-2">
                {stats.totalPayments.toLocaleString()}
                <span className="text-xl font-bold mr-1">ر.ق</span>
              </p>
              <p className="text-sm font-medium text-neutral-600">إجمالي المدفوعات</p>
            </div>
          </motion.div>
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-neutral-200 overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-neutral-50 border-b border-neutral-200 rounded-none h-auto p-0 gap-0 overflow-x-auto">
              {[
                { value: 'info', label: 'معلومات العميل', icon: User },
                { value: 'phones', label: 'أرقام الهاتف', icon: Phone },
                { value: 'contracts', label: 'العقود', icon: FileText },
                { value: 'vehicles', label: 'المركبات', icon: Car },
                { value: 'invoices', label: 'الفواتير', icon: Wallet },
                { value: 'payments', label: 'المدفوعات', icon: CreditCard },
                { value: 'violations', label: 'المخالفات', icon: AlertTriangle, badge: trafficViolations.length > 0 ? trafficViolations.length : null },
                { value: 'activity', label: 'سجل التفاعلات', icon: Activity },
                { value: 'notes', label: 'الملاحظات', icon: MessageSquare },
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value} 
                  className={cn(
                    "px-5 py-3.5 text-sm font-medium rounded-none border-b-2 transition-all gap-2 data-[state=active]:bg-white whitespace-nowrap",
                    "data-[state=active]:border-coral-500 data-[state=active]:text-coral-600",
                    "data-[state=inactive]:border-transparent data-[state=inactive]:text-neutral-500 hover:text-neutral-900"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {'badge' in tab && tab.badge && (
                    <Badge variant="destructive" className="mr-1 text-xs h-5 min-w-[20px] px-1.5">
                      {tab.badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-6">
              <TabsContent value="info" className="mt-0">
                {loadingCustomer ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <PersonalInfoTab customer={customer} />
                )}
              </TabsContent>
              <TabsContent value="phones" className="mt-0">
                {loadingCustomer ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <PhoneNumbersTab customer={customer} />
                )}
              </TabsContent>
              <TabsContent value="contracts" className="mt-0">
                {loadingContracts ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <ContractsTab contracts={contracts} navigate={navigate} customerId={customerId || ''} />
                )}
              </TabsContent>
              <TabsContent value="vehicles" className="mt-0">
                {loadingContracts ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <VehiclesTab contracts={contracts} navigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="invoices" className="mt-0">
                {loadingInvoices ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <InvoicesTab invoices={customerInvoices} navigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="payments" className="mt-0">
                {loadingPayments ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <PaymentsTab payments={payments} navigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="violations" className="mt-0">
                {loadingViolations ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <ViolationsTab violations={trafficViolations} navigate={navigate} isLoading={loadingViolations} />
                )}
              </TabsContent>
              <TabsContent value="activity" className="mt-0">
                <ActivityTab customerId={customerId || ''} companyId={companyId || ''} />
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                {loadingCustomer ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <NotesTab customer={customer} />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>

        {/* Attachments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-white rounded-2xl p-6 border border-neutral-200"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">المرفقات</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  رفع مستند
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {documents.map((doc: CustomerDocument, index: number) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden hover:border-coral-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                    <FileImage className="w-10 h-10 text-neutral-400" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-neutral-900 truncate">{doc.document_name}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {format(new Date(doc.uploaded_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, index) => (
                <div 
                  key={index}
                  className="aspect-[4/3] bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-coral-300 hover:text-coral-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="w-8 h-8 mb-2" />
                  <p className="text-xs">{placeholder}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-coral-600" />
              تعديل بيانات العميل
            </DialogTitle>
          </DialogHeader>
          {customer && (
            <EnhancedCustomerForm
              mode="edit"
              editingCustomer={customer}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['customer-details-new', customerId, companyId] });
                setIsEditDialogOpen(false);
                toast({ title: 'تم التحديث بنجاح' });
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              context="standalone"
              integrationMode="dialog"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <UnifiedPaymentForm
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        type="customer_payment"
        customerId={customerId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['customer-payments-new', customerId, companyId] });
          setIsPaymentDialogOpen(false);
          toast({ title: 'تم تسجيل الدفعة بنجاح' });
        }}
      />
    </div>
  );
};

export default CustomerDetailsPageNew;

