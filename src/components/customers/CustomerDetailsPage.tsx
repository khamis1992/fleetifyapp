/**
 * صفحة تفاصيل العميل - SaaS Design
 * Professional Linear/Stripe-style design with Framer Motion animations
 *
 * @component CustomerDetailsPage
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
import { useCustomerCRMActivity, CustomerActivity, AddActivityInput } from '@/hooks/useCustomerCRMActivity';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
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
  Send,
  PhoneOff,
  PhoneIncoming,
  Bell,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { QuickPaymentDialog } from '@/components/finance/QuickPaymentDialog';
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

// ===== Framer Motion Variants =====
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24
    }
  }
};

const fadeInUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

const slideInRightVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
};

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
      variants={fadeInUpVariants}
      className={cn(
        "mb-4 p-4 rounded-2xl border flex items-start gap-3 shadow-sm backdrop-blur-sm",
        hasIssues ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
          hasIssues ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-blue-400 to-indigo-500"
        )}
      >
        <AlertTriangle className="w-5 h-5 text-white" />
      </motion.div>
      <div className="flex-1">
        {missingFields.length > 0 && (
          <>
            <h4 className={cn(
              "text-sm font-bold mb-2",
              hasIssues ? "text-amber-900" : "text-blue-900"
            )}>
              بيانات ناقصة ({missingFields.length})
            </h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {missingFields.map((field, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Badge
                    className={cn(
                      "text-xs px-3 py-1 rounded-full font-medium shadow-sm",
                      field.priority === 'high' ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-0" :
                      field.priority === 'medium' ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0" :
                      "bg-neutral-100 text-neutral-700 border border-neutral-200"
                    )}
                  >
                    {field.label}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </>
        )}
        {invalidFields.length > 0 && (
          <>
            <h4 className="text-sm font-bold mb-2 text-orange-900">بيانات غير صحيحة ({invalidFields.length})</h4>
            <div className="flex flex-wrap gap-2">
              {invalidFields.map((field, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Badge className="text-xs bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 px-3 py-1 rounded-full shadow-sm">
                    {field.label}
                  </Badge>
                </motion.div>
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* معلومات الموظف */}
      <motion.div variants={itemVariants} className="group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900">معلومات العميل</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {infoItems.map((item, index) => (
              <motion.div
                key={index}
                variants={scaleInVariants}
                className="p-3 rounded-xl bg-neutral-50/50 hover:bg-neutral-100 transition-colors"
              >
                <p className="text-xs text-neutral-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* معلومات العنوان */}
      <motion.div variants={itemVariants} className="group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900">معلومات العنوان</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {addressItems.map((item, index) => (
              <motion.div
                key={index}
                variants={scaleInVariants}
                className="p-3 rounded-xl bg-neutral-50/50 hover:bg-neutral-100 transition-colors"
              >
                <p className="text-xs text-neutral-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// تبويب أرقام الهاتف
const PhoneNumbersTab = ({ customer }: { customer: any }) => {
  const phones = [
    { type: 'رئيسي', number: customer.phone, icon: Phone, gradient: 'from-rose-500 to-rose-600' },
    { type: 'ثانوي', number: customer.secondary_phone || '-', icon: Phone, gradient: 'from-blue-500 to-blue-600' },
    { type: 'عمل', number: customer.work_phone || '-', icon: Briefcase, gradient: 'from-emerald-500 to-emerald-600' },
    { type: 'واتساب', number: customer.whatsapp || customer.phone || '-', icon: MessageSquare, gradient: 'from-green-500 to-green-600' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200/50 shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {phones.map((phone, index) => {
          const isValid = phone.number !== '-' && isValidQatarPhone(phone.number);
          const hasNumber = phone.number && phone.number !== '-';

          return (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={cn(
                "relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 group",
                hasNumber && !isValid
                  ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
                  : "bg-white border-neutral-200 hover:border-rose-300 hover:shadow-lg"
              )}
            >
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                hasNumber && !isValid ? "from-amber-100 to-orange-100" : "from-rose-50 to-orange-50"
              )} />

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br",
                      hasNumber && !isValid ? "from-amber-400 to-orange-500" : phone.gradient
                    )}>
                      <phone.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-500">{phone.type}</span>
                  </div>
                  {hasNumber && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Badge className={cn(
                        "text-[10px] px-2 py-1 rounded-full font-medium",
                        isValid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {isValid ? 'صحيح' : 'غير قياسي'}
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <p className="text-lg font-bold text-neutral-900 font-mono mb-3" dir="ltr">
                  {phone.number}
                </p>
                {phone.number !== '-' && (
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-medium shadow-md hover:shadow-lg transition-all"
                      onClick={() => window.open(`tel:${phone.number}`, '_self')}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      اتصال
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-medium shadow-md hover:shadow-lg transition-all"
                      onClick={() => window.open(`https://wa.me/${phone.number.replace(/[^0-9]/g, '')}`, '_blank')}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      واتساب
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">العقود النشطة</h4>
          <p className="text-xs text-neutral-500">{contracts.length} عقد</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white gap-2 shadow-lg shadow-rose-500/30"
            onClick={() => navigate(`/contracts?customer=${customerId}`)}
          >
            <Plus className="w-4 h-4" />
            عقد جديد
          </Button>
        </motion.div>
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
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.01 }}
                className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-neutral-200/50 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/contracts/${contract.contract_number}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg"
                      >
                        <Car className="w-7 h-7 text-white" />
                      </motion.div>
                      <div>
                        <h5 className="font-bold text-neutral-900">{vehicleName}</h5>
                        <p className="text-xs text-neutral-500 font-mono">#{contract.contract_number}</p>
                      </div>
                    </div>
                    <Badge className={cn(
                      "text-xs px-3 py-1 rounded-full",
                      contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {contract.status === 'active' ? 'نشط' : 'معلق'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-3 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl"
                    >
                      <p className="text-xs text-neutral-500">الإيجار الشهري</p>
                      <p className="text-sm font-bold text-rose-600">{contract.monthly_amount?.toLocaleString()} ر.ق</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl"
                    >
                      <p className="text-xs text-neutral-500">ينتهي في</p>
                      <p className="text-sm font-bold text-neutral-900">
                        {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yy') : '-'}
                      </p>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl"
                    >
                      <p className="text-xs text-neutral-500">المتبقي</p>
                      <p className={cn(
                        "text-sm font-bold",
                        daysRemaining <= 30 ? 'text-red-600' : daysRemaining <= 60 ? 'text-amber-600' : 'text-green-600'
                      )}>
                        {daysRemaining} يوم
                      </p>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد عقود لهذا العميل</p>
          <p className="text-neutral-400 text-sm mt-1">ابدأ بإنشاء عقد جديد</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// تبويب المركبات
const VehiclesTab = ({ contracts, navigate }: { contracts: any[], navigate: any }) => {
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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
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
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-neutral-200/50 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg"
                  >
                    <Car className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <h5 className="font-bold text-neutral-900">{vehicle.make} {vehicle.model}</h5>
                    <p className="text-xs text-neutral-500">{vehicle.year}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-neutral-50">
                    <span className="text-neutral-500">رقم اللوحة</span>
                    <span className="font-mono font-bold text-neutral-900">{vehicle.plate_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-neutral-50">
                    <span className="text-neutral-500">رقم العقد</span>
                    <span className="font-mono text-blue-600">{vehicle.contractNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-gradient-to-r from-rose-50 to-orange-50">
                    <span className="text-neutral-500">الإيجار الشهري</span>
                    <span className="font-bold text-rose-600">{vehicle.monthlyAmount?.toLocaleString()} ر.ق</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد مركبات مستأجرة حالياً</p>
          <p className="text-neutral-400 text-sm mt-1">المركبات المستأجرة ستظهر هنا</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// تبويب الفواتير
const InvoicesTab = ({
  invoices,
  onInvoiceClick
}: {
  invoices: any[],
  onInvoiceClick: (invoice: any) => void
}) => {
  const totalOutstanding = useMemo(() => {
    return invoices
      .filter(inv => inv.payment_status !== 'paid')
      .reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);
  }, [invoices]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">الفواتير</h4>
          <p className="text-xs text-neutral-500">{invoices.length} فاتورة</p>
        </div>
        {totalOutstanding > 0 && (
          <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg">
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
                variants={slideInRightVariants}
                whileHover={{ x: 5 }}
                className={cn(
                  "relative overflow-hidden group flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 cursor-pointer hover:shadow-lg",
                  isPaid ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" :
                  isOverdue ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200" :
                  "bg-white/80 backdrop-blur-sm border-neutral-200/50"
                )}
                onClick={() => {
                  console.log('[CUSTOMER_DETAILS] Invoice clicked:', invoice);
                  onInvoiceClick(invoice);
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
                    isPaid ? "bg-gradient-to-br from-green-500 to-emerald-600" :
                    isOverdue ? "bg-gradient-to-br from-red-500 to-rose-600" :
                    "bg-gradient-to-br from-amber-400 to-orange-500"
                  )}>
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{invoice.invoice_number || `INV-${invoice.id.substring(0, 8)}`}</p>
                    <p className="text-xs text-neutral-500">
                      {invoice.created_at ? format(new Date(invoice.created_at), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div className="relative text-left">
                  <p className={cn(
                    "font-bold text-lg",
                    isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-amber-600"
                  )}>
                    {invoice.total_amount?.toLocaleString()} ر.ق
                  </p>
                  <Badge className={cn(
                    "text-xs px-3 py-1 rounded-full",
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
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد فواتير لهذا العميل</p>
          <p className="text-neutral-400 text-sm mt-1">الفواتير ستظهر هنا عند إنشائها</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// تبويب المدفوعات
const PaymentsTab = ({ payments, navigate, onAddPayment }: { payments: any[], navigate: any, onAddPayment: () => void }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">سجل المدفوعات</h4>
          <p className="text-xs text-neutral-500">{payments.length} عملية</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white gap-2 shadow-lg shadow-green-500/30"
            onClick={onAddPayment}
          >
            <Plus className="w-4 h-4" />
            تسجيل دفعة
          </Button>
        </motion.div>
      </div>

      {payments.length > 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/50 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-neutral-50 to-neutral-100 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-600">رقم الدفعة</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-600">تاريخ السداد</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-600">المبلغ</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-600">الطريقة</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-600">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.slice(0, 5).map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  variants={slideInRightVariants}
                  whileHover={{ x: 5 }}
                  className="hover:bg-gradient-to-r hover:from-rose-50 hover:to-transparent transition-colors"
                >
                  <td className="px-4 py-4 text-sm font-mono text-neutral-900">#{payment.payment_number || payment.id.substring(0, 8)}</td>
                  <td className="px-4 py-4 text-sm text-neutral-600">
                    {payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-green-600">{payment.amount?.toLocaleString()} ر.ق</td>
                  <td className="px-4 py-4 text-sm text-neutral-600">{payment.payment_method || '-'}</td>
                  <td className="px-4 py-4">
                    <Badge className={cn(
                      "text-xs px-3 py-1 rounded-full",
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
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد مدفوعات مسجلة</p>
          <p className="text-neutral-400 text-sm mt-1">سجل دفعة جديدة للبدء</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// تبويب الملاحظات - متكامل مع CRM
const NotesTab = ({ customerId, customerPhone }: { customerId: string; customerPhone?: string }) => {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'phone' | 'whatsapp'>('note');
  const [isAdding, setIsAdding] = useState(false);

  const { activities, isLoading, addActivity, isAddingActivity } = useCustomerCRMActivity(customerId);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await addActivity({
        note_type: noteType,
        content: newNote,
        title: noteType === 'phone' ? 'مكالمة هاتفية' : noteType === 'whatsapp' ? 'رسالة واتساب' : 'ملاحظة',
      });
      setNewNote('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'phone':
      case 'call':
        if (status === 'no_answer') return <PhoneOff className="w-4 h-4 text-red-500" />;
        if (status === 'busy') return <PhoneIncoming className="w-4 h-4 text-amber-500" />;
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'followup':
        return <Bell className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'phone':
      case 'call': return 'مكالمة';
      case 'whatsapp': return 'واتساب';
      case 'email': return 'بريد';
      case 'note': return 'ملاحظة';
      case 'followup': return 'متابعة';
      default: return 'تفاعل';
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header with actions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-neutral-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">سجل التواصل والملاحظات</h4>
            <p className="text-xs text-neutral-500">{activities.length} تفاعل مسجل</p>
          </div>
          <div className="flex items-center gap-2">
            {customerPhone && (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(`tel:${customerPhone}`)}
                  >
                    <Phone className="w-4 h-4" />
                    اتصال
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => window.open(`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    واتساب
                  </Button>
                </motion.div>
              </>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg shadow-rose-500/30"
                onClick={() => setIsAdding(!isAdding)}
              >
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Add Note Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-neutral-100 pt-4"
            >
              <div className="flex gap-2 mb-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={noteType === 'note' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteType('note')}
                    className={noteType === 'note' ? 'bg-gradient-to-r from-rose-500 to-rose-600' : ''}
                  >
                    <FileText className="w-4 h-4 ml-1" />
                    ملاحظة
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={noteType === 'phone' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteType('phone')}
                    className={noteType === 'phone' ? 'bg-gradient-to-r from-green-500 to-green-600' : ''}
                  >
                    <Phone className="w-4 h-4 ml-1" />
                    مكالمة
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={noteType === 'whatsapp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteType('whatsapp')}
                    className={noteType === 'whatsapp' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : ''}
                  >
                    <MessageSquare className="w-4 h-4 ml-1" />
                    واتساب
                  </Button>
                </motion.div>
              </div>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="اكتب ملاحظتك هنا..."
                className="min-h-[100px] mb-3 border-neutral-200 focus:border-rose-500 focus:ring-rose-500 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>إلغاء</Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isAddingActivity}
                  >
                    {isAddingActivity ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    حفظ
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Activities List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : activities.length > 0 ? (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-300 via-neutral-200 to-transparent" />
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                variants={slideInRightVariants}
                initial="hidden"
                animate="visible"
                custom={index}
                className="relative pr-14"
              >
                <div className="absolute right-3 w-6 h-6 rounded-full bg-white border-2 border-rose-300 flex items-center justify-center shadow-sm">
                  {getActivityIcon(activity.note_type, activity.call_status)}
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-neutral-200/50 hover:border-rose-200 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs rounded-full">
                        {getActivityLabel(activity.note_type)}
                      </Badge>
                      {activity.is_important && (
                        <Badge className="text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">مهم</Badge>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {format(new Date(activity.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{activity.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد ملاحظات مسجلة</p>
          <p className="text-neutral-400 text-sm mt-1">ابدأ بإضافة ملاحظة أو تسجيل مكالمة</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// تبويب المخالفات المرورية
const ViolationsTab = ({ violations, navigate, isLoading }: { violations: any[], navigate: any, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <motion.div
        variants={fadeInUpVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center py-12"
      >
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        <span className="mr-2 text-neutral-500">جاري تحميل المخالفات...</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
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
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-neutral-200/50 hover:border-red-200 hover:shadow-xl transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                      violation.status === 'paid'
                        ? "bg-gradient-to-br from-green-400 to-emerald-500"
                        : violation.status === 'pending'
                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                          : "bg-gradient-to-br from-red-400 to-rose-500"
                    )}>
                      <AlertTriangle className="w-7 h-7 text-white" />
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
                    "text-xs px-3 py-1 rounded-full",
                    violation.status === 'paid'
                      ? "bg-green-100 text-green-700"
                      : violation.status === 'pending'
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  )}>
                    {violation.status === 'paid' ? 'مدفوعة' : violation.status === 'pending' ? 'قيد السداد' : 'غير مدفوعة'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl"
                  >
                    <p className="text-xs text-neutral-500 mb-1">تاريخ المخالفة</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {violation.violation_date
                        ? format(new Date(violation.violation_date), 'dd/MM/yyyy', { locale: ar })
                        : '-'}
                    </p>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-3 bg-gradient-to-br from-neutral-50 to-slate-50 rounded-xl"
                  >
                    <p className="text-xs text-neutral-500 mb-1">الموقع</p>
                    <p className="text-sm font-semibold text-neutral-900">{violation.location || '-'}</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-3 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl"
                  >
                    <p className="text-xs text-neutral-500 mb-1">المبلغ</p>
                    <p className="text-sm font-bold text-red-600">{violation.fine_amount?.toLocaleString()} ر.ق</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl"
                  >
                    <p className="text-xs text-neutral-500 mb-1">الجهة المصدرة</p>
                    <p className="text-sm font-semibold text-neutral-900">{violation.issuing_authority || '-'}</p>
                  </motion.div>
                </div>

                {violation.violation_description && (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <p className="text-xs text-neutral-500 mb-1">الوصف</p>
                    <p className="text-sm text-neutral-700">{violation.violation_description}</p>
                  </div>
                )}

                {violation.contract && (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => navigate(`/contracts/${violation.contract.contract_number}`)}
                      >
                        <FileText className="w-4 h-4" />
                        عرض العقد #{violation.contract.contract_number}
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد مخالفات مرورية مسجلة</p>
          <p className="text-neutral-400 text-sm mt-1">لم يتم تسجيل أي مخالفات على عقود هذا العميل</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// تبويب المتابعات المجدولة
const FollowupsTab = ({ customerId, companyId }: { customerId: string; companyId: string }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFollowup, setNewFollowup] = useState({
    title: '',
    notes: '',
    scheduled_date: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  const { data: followups, isLoading, refetch } = useQuery({
    queryKey: ['customer-followups', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!companyId
  });

  const handleAddFollowup = async () => {
    if (!newFollowup.title.trim() || !newFollowup.scheduled_date) return;

    try {
      const { error } = await supabase
        .from('scheduled_followups')
        .insert({
          customer_id: customerId,
          company_id: companyId,
          title: newFollowup.title,
          notes: newFollowup.notes,
          scheduled_date: newFollowup.scheduled_date,
          priority: newFollowup.priority,
          status: 'pending'
        });

      if (error) throw error;

      setNewFollowup({ title: '', notes: '', scheduled_date: '', priority: 'medium' });
      setIsAdding(false);
      refetch();
    } catch (error) {
      console.error('Error adding followup:', error);
    }
  };

  const handleCompleteFollowup = async (followupId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_followups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', followupId);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error completing followup:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-0';
      case 'high': return 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0';
      case 'medium': return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0';
      default: return 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      default: return 'منخفض';
    }
  };

  const pendingFollowups = followups?.filter(f => f.status !== 'completed') || [];
  const completedFollowups = followups?.filter(f => f.status === 'completed') || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-neutral-200/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">المتابعات المجدولة</h4>
            <p className="text-xs text-neutral-500">{pendingFollowups.length} متابعة قادمة</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg shadow-rose-500/30"
              onClick={() => setIsAdding(!isAdding)}
            >
              <Plus className="w-4 h-4" />
              إضافة متابعة
            </Button>
          </motion.div>
        </div>

        {/* Add Followup Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-neutral-100 pt-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newFollowup.title}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="عنوان المتابعة..."
                  className="px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <input
                  type="datetime-local"
                  value={newFollowup.scheduled_date}
                  onChange={(e) => setNewFollowup(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                  <motion.div key={priority} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={newFollowup.priority === priority ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewFollowup(prev => ({ ...prev, priority }))}
                      className={newFollowup.priority === priority ? getPriorityColor(priority) : ''}
                    >
                      {getPriorityLabel(priority)}
                    </Button>
                  </motion.div>
                ))}
              </div>
              <Textarea
                value={newFollowup.notes}
                onChange={(e) => setNewFollowup(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية..."
                className="min-h-[80px] border-neutral-200 focus:border-rose-500 focus:ring-rose-500 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>إلغاء</Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30"
                    onClick={handleAddFollowup}
                    disabled={!newFollowup.title.trim() || !newFollowup.scheduled_date}
                  >
                    <Plus className="w-4 h-4" />
                    حفظ المتابعة
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pending Followups */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : pendingFollowups.length > 0 ? (
        <div className="space-y-3">
          {pendingFollowups.map((followup, index) => (
            <motion.div
              key={followup.id}
              variants={itemVariants}
              whileHover={{ x: 5 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-neutral-200/50 hover:border-rose-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                    >
                      <Bell className="w-4 h-4 text-rose-500" />
                    </motion.div>
                    <h5 className="font-medium text-neutral-900">{followup.title}</h5>
                    <Badge className={cn("text-xs px-3 py-1 rounded-full", getPriorityColor(followup.priority))}>
                      {getPriorityLabel(followup.priority)}
                    </Badge>
                  </div>
                  {followup.notes && (
                    <p className="text-sm text-neutral-600 mb-2">{followup.notes}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(followup.scheduled_date), 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </span>
                    {differenceInDays(new Date(followup.scheduled_date), new Date()) <= 0 && (
                      <Badge variant="destructive" className="text-xs rounded-full">متأخرة</Badge>
                    )}
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCompleteFollowup(followup.id)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 rounded-xl"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد متابعات مجدولة</p>
          <p className="text-neutral-400 text-sm mt-1">أضف متابعة جديدة للتذكير</p>
        </motion.div>
      )}

      {/* Completed Followups */}
      {completedFollowups.length > 0 && (
        <div className="mt-6">
          <h5 className="text-sm font-medium text-neutral-500 mb-3">المتابعات المكتملة ({completedFollowups.length})</h5>
          <div className="space-y-2">
            {completedFollowups.slice(0, 5).map(followup => (
              <div
                key={followup.id}
                className="bg-neutral-50/50 rounded-lg p-3 border border-neutral-100 opacity-60"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-neutral-600 line-through">{followup.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// تبويب سجل النشاط - Timeline موحد
const ActivityTab = ({ customerId, companyId, contracts, payments, violations }: {
  customerId: string;
  companyId: string;
  contracts: any[];
  payments: any[];
  violations: any[];
}) => {
  const { activities: crmActivities } = useCustomerCRMActivity(customerId);

  // دمج جميع الأنشطة في timeline واحد
  const allActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'contract' | 'payment' | 'violation' | 'crm';
      description: string;
      date: Date;
      icon: string;
      color: string;
      details?: any;
    }> = [];

    // إضافة العقود
    contracts?.forEach(contract => {
      activities.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        description: `عقد جديد: ${contract.contract_number || 'بدون رقم'} - ${contract.vehicle?.plate_number || ''}`,
        date: new Date(contract.created_at),
        icon: 'car',
        color: 'blue',
        details: contract
      });
    });

    // إضافة المدفوعات
    payments?.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        description: `دفعة: ${payment.amount?.toLocaleString()} ر.ق`,
        date: new Date(payment.payment_date || payment.created_at),
        icon: 'wallet',
        color: 'green',
        details: payment
      });
    });

    // إضافة المخالفات
    violations?.forEach(violation => {
      activities.push({
        id: `violation-${violation.id}`,
        type: 'violation',
        description: `مخالفة: ${violation.violation_type || 'مرورية'} - ${violation.fine_amount?.toLocaleString()} ر.ق`,
        date: new Date(violation.violation_date || violation.created_at),
        icon: 'alert',
        color: 'red',
        details: violation
      });
    });

    // إضافة أنشطة CRM
    crmActivities?.forEach(activity => {
      activities.push({
        id: `crm-${activity.id}`,
        type: 'crm',
        description: activity.content,
        date: new Date(activity.created_at),
        icon: activity.note_type === 'phone' ? 'phone' : activity.note_type === 'whatsapp' ? 'message' : 'note',
        color: activity.note_type === 'phone' ? 'green' : activity.note_type === 'whatsapp' ? 'emerald' : 'gray',
        details: activity
      });
    });

    // ترتيب حسب التاريخ (الأحدث أولاً)
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [contracts, payments, violations, crmActivities]);

  const getIcon = (type: string, iconType: string) => {
    switch (iconType) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'wallet': return <Wallet className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-gradient-to-br from-blue-400 to-blue-600 text-white border-blue-300';
      case 'green': return 'bg-gradient-to-br from-green-400 to-green-600 text-white border-green-300';
      case 'red': return 'bg-gradient-to-br from-red-400 to-red-600 text-white border-red-300';
      case 'emerald': return 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-300';
      default: return 'bg-gradient-to-br from-neutral-400 to-neutral-600 text-white border-neutral-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'عقد';
      case 'payment': return 'دفعة';
      case 'violation': return 'مخالفة';
      case 'crm': return 'تواصل';
      default: return 'نشاط';
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">سجل النشاط الكامل</h4>
          <p className="text-xs text-neutral-500">{allActivities.length} نشاط مسجل</p>
        </div>
      </div>

      {allActivities.length > 0 ? (
        <div className="relative">
          <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-300 via-neutral-200 to-transparent" />
          <div className="space-y-3">
            {allActivities.slice(0, 50).map((activity, index) => (
              <motion.div
                key={activity.id}
                variants={slideInRightVariants}
                initial="hidden"
                animate="visible"
                custom={index}
                className="relative pr-14"
              >
                <div className={cn(
                  "absolute right-3 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md",
                  getColorClasses(activity.color)
                )}>
                  {getIcon(activity.type, activity.icon)}
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-neutral-200/50 hover:border-rose-200 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-1">
                    <Badge variant="outline" className={cn("text-xs rounded-full", getColorClasses(activity.color))}>
                      {getTypeLabel(activity.type)}
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      {format(activity.date, 'dd MMM yyyy - HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 line-clamp-2">{activity.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div
          variants={fadeInUpVariants}
          className="bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl p-12 text-center border border-neutral-200"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium">لا توجد أنشطة مسجلة حتى الآن</p>
          <p className="text-neutral-400 text-sm mt-1">سيظهر سجل النشاط هنا عند إجراء أي عمليات</p>
        </motion.div>
      )}
    </motion.div>
  );
};

// ===== Main Component =====
const CustomerDetailsPage = () => {
  console.log('[CustomerDetailsPage.tsx] Component MOUNTED - This is the NEW file');
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
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  // Queries
  const { data: customer, isLoading: loadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer-details', customerId, companyId],
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
    queryKey: ['customer-contracts', customerId, companyId],
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
    queryKey: ['customer-payments', customerId, companyId],
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
  const deleteDocument = useDeleteCustomerDocument();
  const downloadDocument = useDownloadCustomerDocument();

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
    queryKey: ['customer-traffic-violations', customerId, companyId],
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
      return data?.filter(v => v.contract?.customer_id === customerId) || [];
    },
    enabled: !!customerId && !!companyId,
  });

  // جلب بيانات CRM
  const { activities: crmActivitiesMain } = useCustomerCRMActivity(customerId || '');

  // جلب المتابعات المجدولة
  const { data: scheduledFollowups = [] } = useQuery({
    queryKey: ['customer-followups-count', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select('id, status, scheduled_date, priority')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .neq('status', 'completed');
      if (error) return [];
      return data || [];
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full border border-neutral-200 shadow-2xl text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-neutral-500 mb-6">لم يتم العثور على هذا العميل</p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleBack} className="bg-gradient-to-r from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30">
              العودة للعملاء
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-100"
    >
      {/* Header Bar */}
      <TooltipProvider>
        <header className="bg-white/80 backdrop-blur-lg border-b border-neutral-200/50 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-neutral-600 hover:text-neutral-900">
                    <ArrowRight className="w-4 h-4" />
                    العودة للقائمة
                  </Button>
                </motion.div>
              </div>

              <div className="flex items-center gap-2">
                {/* أزرار الإجراءات السريعة */}
                {customer?.phone && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>اتصال بالعميل مباشرة</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>مراسلة عبر واتساب</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إدارة علاقات العميل</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                                navigate(`/contracts?customer=${customerId}`);
                              }}
                              className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Plus className="w-4 h-4" />
                          عقد جديد
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إنشاء عقد جديد لهذا العميل</p>
                    </TooltipContent>
                  </Tooltip>

              <span className="text-sm text-neutral-300 mr-2">|</span>
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
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleEdit}
                  className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white gap-2 shadow-lg shadow-rose-500/30"
                >
                  <Edit3 className="w-4 h-4" />
                  تعديل
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
        </header>
      </TooltipProvider>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Profile Card */}
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 mb-6 border border-neutral-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-5">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="relative"
              >
                <Avatar className="w-28 h-28 rounded-full border-4 border-rose-100 shadow-xl">
                  <AvatarFallback className="bg-gradient-to-br from-rose-500 to-rose-600 text-white text-3xl font-bold">
                    {getInitials(customerName)}
                  </AvatarFallback>
                </Avatar>
                {customer.is_active && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg"
                  />
                )}
              </motion.div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-black text-neutral-900">{customerName}</h1>
                  {customer.is_vip && (
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white gap-1 px-3 py-1 rounded-full shadow-lg">
                        <Star className="w-3 h-3 fill-white" />
                        VIP
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <p className="text-neutral-500 text-sm font-medium">{customer.job_title || 'عميل'}</p>
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 lg:pr-6 lg:border-r border-neutral-200">
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Cake className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">تاريخ الميلاد</p>
                  <p className="text-sm font-bold text-neutral-900">{customer.date_of_birth || '-'}</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">رقم الهاتف</p>
                  <p className="text-sm font-bold text-neutral-900 font-mono" dir="ltr">{customer.phone || '-'}</p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-neutral-500">البريد الإلكتروني</p>
                  <p className="text-sm font-bold text-neutral-900 truncate max-w-[180px]">{customer.email || '-'}</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* تحذيرات البيانات الناقصة */}
        <MissingDataWarnings customer={customer} />

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {/* بطاقة العقود النشطة */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative group bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />

            <div className="relative">
              <div className="flex justify-end mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
                >
                  <FileText className="w-8 h-8 text-blue-600" />
                </motion.div>
              </div>

              <div className="text-center">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-5xl font-black text-blue-600 mb-2"
                >
                  {stats.activeContracts}
                </motion.p>
                <p className="text-sm font-bold text-neutral-600">العقود النشطة</p>
              </div>
            </div>
          </motion.div>

          {/* بطاقة المبلغ المستحق */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative group bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full" />

            <div className="relative">
              <div className="flex justify-end mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
                >
                  <Wallet className="w-8 h-8 text-amber-600" />
                </motion.div>
              </div>

              <div className="text-center">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="text-5xl font-black text-amber-600 mb-2"
                >
                  {stats.outstandingAmount.toLocaleString()}
                  <span className="text-2xl font-bold mr-1">ر.ق</span>
                </motion.p>
                <p className="text-sm font-bold text-neutral-600">المبلغ المستحق</p>
              </div>
            </div>
          </motion.div>

          {/* بطاقة نسبة الالتزام */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative group bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-green-500 to-emerald-600 rounded-full" />

            <div className="relative">
              <div className="flex justify-end mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
                >
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </motion.div>
              </div>

              <div className="text-center">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring' }}
                  className={`text-5xl font-black mb-2 ${stats.commitmentRate !== null ? 'text-green-600' : 'text-neutral-400'}`}
                >
                  {stats.commitmentRate !== null ? `${stats.commitmentRate}%` : '-'}
                </motion.p>
                <p className="text-sm font-bold text-neutral-600">نسبة الالتزام</p>
                {stats.commitmentRate === null && (
                  <p className="text-xs text-neutral-400 mt-1">لا توجد عقود</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* بطاقة إجمالي المدفوعات */}
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative group bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full" />

            <div className="relative">
              <div className="flex justify-end mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg"
                >
                  <CreditCard className="w-8 h-8 text-purple-600" />
                </motion.div>
              </div>

              <div className="text-center">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="text-5xl font-black text-purple-600 mb-2"
                >
                  {stats.totalPayments.toLocaleString()}
                  <span className="text-2xl font-bold mr-1">ر.ق</span>
                </motion.p>
                <p className="text-sm font-bold text-neutral-600">إجمالي المدفوعات</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* CRM Summary Row */}
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.25 }}
          className="mb-6 bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-lg transition-all"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-7 h-7 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">مركز إدارة علاقات العملاء</h3>
                <p className="text-sm text-neutral-500">
                  {crmActivitiesMain.length} ملاحظة • {scheduledFollowups.length} متابعة قادمة
                  {scheduledFollowups.filter(f => new Date(f.scheduled_date) <= new Date()).length > 0 && (
                    <span className="text-red-500 font-bold mr-2">
                      • {scheduledFollowups.filter(f => new Date(f.scheduled_date) <= new Date()).length} متأخرة
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {customer?.phone && (
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(`tel:${customer.phone}`)}
                    >
                      <Phone className="w-4 h-4" />
                      اتصال
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => window.open(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      واتساب
                    </Button>
                  </motion.div>
                </>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30"
                  onClick={() => setActiveTab('notes')}
                >
                  <Plus className="w-4 h-4" />
                  إضافة ملاحظة
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveTab('followups')}
                >
                  <Bell className="w-4 h-4" />
                  المتابعات
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl border border-neutral-200/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-gradient-to-r from-neutral-50 via-white to-neutral-50 border-b border-neutral-200 rounded-none h-auto p-0 gap-0 overflow-x-auto">
              {[
                { value: 'info', label: 'معلومات العميل', icon: User },
                { value: 'phones', label: 'أرقام الهاتف', icon: Phone },
                { value: 'contracts', label: 'العقود', icon: FileText },
                { value: 'vehicles', label: 'المركبات', icon: Car },
                { value: 'invoices', label: 'الفواتير', icon: Wallet },
                { value: 'payments', label: 'المدفوعات', icon: CreditCard },
                { value: 'violations', label: 'المخالفات', icon: AlertTriangle, badge: trafficViolations.length > 0 ? trafficViolations.length : null },
                { value: 'notes', label: 'CRM والملاحظات', icon: MessageSquare },
                { value: 'followups', label: 'المتابعات', icon: Bell },
                { value: 'activity', label: 'سجل النشاط', icon: Activity },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "px-6 py-4 text-sm font-bold rounded-none border-b-2 transition-all gap-2 whitespace-nowrap",
                    "data-[state=active]:bg-white data-[state=active]:shadow-lg",
                    "data-[state=active]:border-b-2 data-[state=active]:border-rose-500 data-[state=active]:text-rose-600",
                    "data-[state=inactive]:border-transparent data-[state=inactive]:text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50/50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {'badge' in tab && tab.badge && (
                    <Badge variant="destructive" className="mr-1 text-xs h-5 min-w-[20px] px-1.5 rounded-full">
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
                  <InvoicesTab
                  invoices={customerInvoices}
                  onInvoiceClick={(invoice) => {
                    setSelectedInvoice(invoice);
                    setIsInvoiceDialogOpen(true);
                  }}
                />
                )}
              </TabsContent>
              <TabsContent value="payments" className="mt-0">
                {loadingPayments ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <PaymentsTab payments={payments} navigate={navigate} onAddPayment={() => setIsPaymentDialogOpen(true)} />
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
                <ActivityTab
                  customerId={customerId || ''}
                  companyId={companyId || ''}
                  contracts={contracts}
                  payments={payments}
                  violations={trafficViolations}
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                {loadingCustomer ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <NotesTab
                    customerId={customerId || ''}
                    customerPhone={customer?.phone || customer?.mobile_number}
                  />
                )}
              </TabsContent>
              <TabsContent value="followups" className="mt-0">
                <FollowupsTab
                  customerId={customerId || ''}
                  companyId={companyId || ''}
                />
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>

        {/* Attachments Section */}
        <motion.div
          variants={fadeInUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="mt-6 bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-neutral-200/50 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-neutral-900">المرفقات</h3>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50"
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
            </motion.div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
          </div>

          {/* Upload Animation Overlay */}
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl p-6 border-2 border-dashed border-rose-300"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.div
                    className="w-16 h-16 rounded-full border-4 border-rose-200"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute top-0 left-0 w-4 h-4 bg-rose-500 rounded-full -translate-x-1 -translate-y-1" />
                  </motion.div>
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Upload className="w-6 h-6 text-rose-500" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-rose-600">جاري رفع المستند...</p>
                  <p className="text-sm text-neutral-500">يرجى الانتظار حتى يتم رفع الملف</p>
                  <motion.div 
                    className="mt-2 h-2 bg-rose-100 rounded-full overflow-hidden"
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-500"
                      initial={{ width: "0%" }}
                      animate={{ width: ["0%", "30%", "60%", "90%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {documents.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {documents.map((doc: CustomerDocument, index: number) => (
                <motion.div
                  key={doc.id}
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="group relative bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-neutral-200/50 hover:border-rose-300 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                    <FileImage className="w-12 h-12 text-neutral-400" />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold text-neutral-900 truncate">{doc.document_name}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {format(new Date(doc.uploaded_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-500/90 to-rose-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-10 w-10 p-0 rounded-xl shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadDocument.mutate(doc);
                      }}
                      disabled={downloadDocument.isPending}
                      title="تحميل"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-10 w-10 p-0 rounded-xl shadow-lg bg-red-100 hover:bg-red-200 text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
                          deleteDocument.mutate(doc.id);
                        }
                      }}
                      disabled={deleteDocument.isPending}
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, index) => (
                <motion.div
                  key={index}
                  variants={scaleInVariants}
                  whileHover={{ y: -5 }}
                  className="aspect-[4/3] bg-gradient-to-br from-neutral-50 to-neutral-100 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-rose-300 hover:text-rose-500 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-14 h-14 rounded-2xl bg-neutral-200 group-hover:bg-rose-100 flex items-center justify-center mb-3 transition-colors"
                  >
                    <FileImage className="w-7 h-7" />
                  </motion.div>
                  <p className="text-xs font-bold">{placeholder}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Edit3 className="w-5 h-5 text-white" />
              </div>
              تعديل بيانات العميل
            </DialogTitle>
          </DialogHeader>
          {customer && (
            <EnhancedCustomerForm
              mode="edit"
              editingCustomer={customer}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['customer-details', customerId, companyId] });
                setIsEditDialogOpen(false);
                toast({ title: 'تم التحديث بنجاح' });
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              context="standalone"
              integrationMode="dialog"
              showDuplicateCheck={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - Quick Payment */}
      <QuickPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        customerId={customerId}
        customerName={customer ? `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim() : ''}
        customerPhone={customer?.phone || null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['customer-payments', customerId, companyId] });
          queryClient.invalidateQueries({ queryKey: ['customer-details', customerId, companyId] });
          queryClient.invalidateQueries({ queryKey: ['customer-invoices', customerId, companyId] });
        }}
      />

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoice={selectedInvoice}
      />
    </motion.div>
  );
};

export default CustomerDetailsPage;
