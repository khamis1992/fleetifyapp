/**
 * صفحة تفاصيل العميل - UX Redesign
 * Modern card-based layout with bento-grid style organization
 * Better visual hierarchy and information architecture
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
  Sparkles,
  Shield,
  DollarSign,
  FileCheck,
  AlertCircle,
  CreditCard as PaymentIcon,
  Gavel,
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
import { CustomerLegalCaseDialog } from '@/components/legal/CustomerLegalCaseDialog';
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

const slideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// ===== Helper Functions =====
const isValidQatarQID = (qid: string | null | undefined): boolean => {
  if (!qid) return false;
  const cleanQID = qid.replace(/\D/g, '');
  return cleanQID.length === 11;
};

const isValidQatarPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('974')) {
    const localNumber = cleanPhone.substring(3);
    return localNumber.length === 8 && /^[3567]/.test(localNumber);
  }
  return cleanPhone.length === 8 && /^[3567]/.test(cleanPhone);
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

// ===== UI Components =====

// Alert Banner for Missing Data
const DataQualityAlert = ({ customer }: { customer: any }) => {
  const { missingFields, invalidFields } = useMemo(() => {
    const missing: { label: string; priority: 'high' | 'medium' }[] = [];
    const invalid: { label: string }[] = [];

    if (!customer.national_id && !customer.qid) {
      missing.push({ label: 'الهوية الوطنية', priority: 'high' });
    } else {
      const qid = customer.qid || customer.national_id;
      if (qid && !isValidQatarQID(qid)) {
        invalid.push({ label: 'QID غير صحيح' });
      }
    }
    if (!customer.driver_license) {
      missing.push({ label: 'رخصة القيادة', priority: 'high' });
    }
    if (customer.phone && !isValidQatarPhone(customer.phone)) {
      invalid.push({ label: 'رقم الهاتف غير قياسي' });
    }
    if (!customer.address) {
      missing.push({ label: 'العنوان', priority: 'medium' });
    }
    if (!customer.email) {
      missing.push({ label: 'البريد الإلكتروني', priority: 'medium' });
    }

    return { missingFields: missing, invalidFields: invalid };
  }, [customer]);

  const totalIssues = missingFields.length + invalidFields.length;
  if (totalIssues === 0) return null;

  return (
    <motion.div
      variants={fadeInUp}
      className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-amber-900 mb-1">بيانات ناقصة أو تحتاج مراجعة</h4>
          <p className="text-sm text-amber-700 mb-3">يرجى إكمال البيانات التالية لضمان دقة السجل</p>
          <div className="flex flex-wrap gap-2">
            {missingFields.map((field, idx) => (
              <Badge key={idx} className={cn(
                "text-xs",
                field.priority === 'high'
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-800"
              )}>
                {field.label}
              </Badge>
            ))}
            {invalidFields.map((field, idx) => (
              <Badge key={idx} className="text-xs bg-orange-100 text-orange-800">
                {field.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Customer Header Component
const CustomerHeader = ({
  customer,
  customerName,
  stats,
  onEdit,
  onBack
}: {
  customer: any;
  customerName: string;
  stats: any;
  onEdit: () => void;
  onBack: () => void;
}) => {
  const getInitials = (name: string): string => {
    if (!name || name === 'غير محدد') return '؟';
    const names = name.split(' ').filter(n => n.length > 0);
    return names.slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm"
    >
      {/* Cover & Profile Section */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600" />
        <div className="absolute -bottom-16 right-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative"
          >
            <Avatar className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white text-4xl font-bold">
                {getInitials(customerName)}
              </AvatarFallback>
            </Avatar>
            {customer.is_active && (
              <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Info Section */}
      <div className="pt-20 pb-6 px-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-neutral-900">{customerName}</h1>
              {customer.is_vip && (
                <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  VIP
                </Badge>
              )}
              {customer.customer_type === 'corporate' && (
                <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  شركة
                </Badge>
              )}
            </div>
            <p className="text-neutral-500">{customer.job_title || 'عميل'}</p>
            {customer.employer && (
              <p className="text-sm text-neutral-600 mt-1">
                <Building2 className="w-4 h-4 inline ml-1" />
                {customer.employer}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
            <Button
              size="sm"
              onClick={onEdit}
              className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              <Edit3 className="w-4 h-4" />
              تعديل
            </Button>
          </div>
        </div>

        {/* Quick Contact */}
        <div className="flex items-center gap-4 text-sm">
          {customer.phone && (
            <div className="flex items-center gap-2 text-neutral-600">
              <Phone className="w-4 h-4" />
              <span className="font-mono" dir="ltr">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-neutral-600">
              <Mail className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{customer.email}</span>
            </div>
          )}
          {customer.date_of_birth && (
            <div className="flex items-center gap-2 text-neutral-600">
              <Cake className="w-4 h-4" />
              <span>{customer.date_of_birth}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Quick Stats Cards
const QuickStats = ({ stats, customer }: { stats: any; customer: any }) => {
  const statsData = [
    {
      label: 'العقود النشطة',
      value: stats.activeContracts,
      icon: FileCheck,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      label: 'المبلغ المستحق',
      value: `${stats.outstandingAmount.toLocaleString()} ر.ق`,
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'نسبة الالتزام',
      value: stats.commitmentRate !== null ? `${stats.commitmentRate}%` : '-',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'إجمالي المدفوعات',
      value: `${stats.totalPayments.toLocaleString()} ر.ق`,
      icon: PaymentIcon,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {statsData.map((stat, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", stat.color)}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-xs text-neutral-500">{stat.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

// Quick Actions Bar
const QuickActions = ({
  customer,
  onCall,
  onWhatsApp,
  onNewContract,
  onAddNote,
  onOpenLegalCase
}: {
  customer: any;
  onCall: () => void;
  onWhatsApp: () => void;
  onNewContract: () => void;
  onAddNote: () => void;
  onOpenLegalCase: () => void;
}) => {
  const actions = [
    {
      label: 'اتصال',
      icon: Phone,
      onClick: onCall,
      color: 'text-teal-600 border-teal-200 hover:bg-teal-50',
      show: !!customer?.phone
    },
    {
      label: 'واتساب',
      icon: MessageSquare,
      onClick: onWhatsApp,
      color: 'text-emerald-600 border-emerald-200 hover:bg-emerald-50',
      show: !!customer?.phone
    },
    {
      label: 'عقد جديد',
      icon: Plus,
      onClick: onNewContract,
      color: 'text-blue-600 border-blue-200 hover:bg-blue-50',
      show: true
    },
    {
      label: 'فتح قضية',
      icon: Gavel,
      onClick: onOpenLegalCase,
      color: 'text-red-600 border-red-200 hover:bg-red-50',
      show: true
    },
    {
      label: 'إضافة ملاحظة',
      icon: MessageSquare,
      onClick: onAddNote,
      color: 'text-purple-600 border-purple-200 hover:bg-purple-50',
      show: true
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white rounded-2xl border border-neutral-200 p-4 mb-6"
    >
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="text-sm font-medium text-neutral-500 whitespace-nowrap">إجراءات سريعة:</span>
        {actions.filter(a => a.show).map((action, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className={cn("gap-2 whitespace-nowrap", action.color)}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ===== Tab Components =====

// Personal Info Tab - Redesigned
const PersonalInfoTab = ({ customer }: { customer: any }) => {
  const sections = [
    {
      title: 'المعلومات الشخصية',
      icon: User,
      items: [
        { label: 'الاسم الكامل', value: `${customer.first_name_ar?.trim() || customer.first_name?.trim() || ''} ${customer.last_name_ar?.trim() || customer.last_name?.trim() || ''}`.trim() || '-' },
        { label: 'تاريخ الميلاد', value: customer.date_of_birth || '-' },
        { label: 'الجنسية', value: customer.nationality || '-' },
        { label: 'الحالة الاجتماعية', value: customer.marital_status || '-' },
      ]
    },
    {
      title: 'معلومات العمل',
      icon: Briefcase,
      items: [
        { label: 'صاحب العمل', value: customer.employer || '-' },
        { label: 'المنصب', value: customer.job_title || '-' },
        { label: 'المجموعة', value: customer.group_name || 'عميل عادي' },
        { label: 'نوع العميل', value: customer.customer_type === 'corporate' ? 'شركة' : 'فردي' },
      ]
    },
    {
      title: 'معلومات التواصل',
      icon: MapPin,
      items: [
        { label: 'العنوان', value: customer.address || '-' },
        { label: 'المدينة', value: customer.city || '-' },
        { label: 'المنطقة', value: customer.state || '-' },
        { label: 'البلد', value: customer.country || 'قطر' },
      ]
    },
    {
      title: 'معلومات الهوية',
      icon: IdCard,
      items: [
        { label: 'رقم الهوية', value: customer.national_id || customer.qid || '-' },
        { label: 'رخصة القيادة', value: customer.driver_license || '-' },
        { label: 'تاريخ الإصدار', value: customer.license_issue_date || '-' },
        { label: 'تاريخ الانتهاء', value: customer.license_expiry_date || '-' },
      ]
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <section.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-neutral-900">{section.title}</h3>
          </div>
          <div className="space-y-3">
            {section.items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm text-neutral-500">{item.label}</span>
                <span className="text-sm font-medium text-neutral-900 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Phone Numbers Tab - Redesigned
const PhoneNumbersTab = ({ customer }: { customer: any }) => {
  const phones = [
    { type: 'رئيسي', number: customer.phone, icon: Phone, color: 'from-teal-500 to-teal-600' },
    { type: 'ثانوي', number: customer.secondary_phone, icon: Smartphone, color: 'from-blue-500 to-blue-600' },
    { type: 'عمل', number: customer.work_phone, icon: Briefcase, color: 'from-purple-500 to-purple-600' },
    { type: 'واتساب', number: customer.whatsapp, icon: MessageSquare, color: 'from-emerald-500 to-emerald-600' },
  ].filter(p => p.number);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {phones.map((phone, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", phone.color)}>
              <phone.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{phone.type}</p>
              <p className="font-mono font-bold text-neutral-900" dir="ltr">{phone.number}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => window.open(`tel:${phone.number}`, '_self')}
            >
              <PhoneCall className="w-3 h-3" />
              اتصال
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={() => window.open(`https://wa.me/${phone.number.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <MessageSquare className="w-3 h-3" />
              واتساب
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Contracts Tab - Redesigned
const ContractsTab = ({ contracts, navigate, customerId }: { contracts: any[], navigate: any, customerId: string }) => {
  if (contracts.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد عقود</h3>
        <p className="text-neutral-500 mb-6">ابدأ بإنشاء عقد جديد لهذا العميل</p>
        <Button
          onClick={() => navigate(`/contracts?customer=${customerId}`)}
          className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600"
        >
          <Plus className="w-4 h-4" />
          إنشاء عقد جديد
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">العقود ({contracts.length})</h3>
        <Button
          onClick={() => navigate(`/contracts?customer=${customerId}`)}
          className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600"
        >
          <Plus className="w-4 h-4" />
          عقد جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts.map((contract, idx) => {
          const vehicleName = contract.vehicle
            ? `${contract.vehicle.make} ${contract.vehicle.model}`
            : 'غير محدد';
          const endDate = contract.end_date ? new Date(contract.end_date) : null;
          const daysRemaining = endDate ? differenceInDays(endDate, new Date()) : 0;
          const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;

          return (
            <motion.div
              key={contract.id}
              variants={scaleIn}
              whileHover={{ y: -4 }}
              onClick={() => navigate(`/contracts/${contract.contract_number}`)}
              className={cn(
                "bg-white rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all cursor-pointer",
                isExpiringSoon ? "border-orange-200" : "border-neutral-200"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isExpiringSoon ? "bg-orange-100" : "bg-teal-50"
                  )}>
                    <Car className={cn(
                      "w-6 h-6",
                      isExpiringSoon ? "text-orange-600" : "text-teal-600"
                    )} />
                  </div>
                  <div>
                    <h4 className="font-bold text-neutral-900">{vehicleName}</h4>
                    <p className="text-sm text-neutral-500 font-mono">#{contract.contract_number}</p>
                  </div>
                </div>
                <Badge className={cn(
                  contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700'
                )}>
                  {contract.status === 'active' ? 'نشط' : 'منتهي'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-neutral-50 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">الإيجار الشهري</p>
                  <p className="font-bold text-teal-600">{contract.monthly_amount?.toLocaleString()} ر.ق</p>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">ينتهي في</p>
                  <p className="font-bold text-neutral-900">
                    {contract.end_date ? format(new Date(contract.end_date), 'dd/MM/yy') : '-'}
                  </p>
                </div>
                <div className="text-center p-3 bg-neutral-50 rounded-xl">
                  <p className="text-xs text-neutral-500 mb-1">المتبقي</p>
                  <p className={cn(
                    "font-bold",
                    daysRemaining <= 0 ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-teal-600'
                  )}>
                    {daysRemaining} يوم
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Vehicles Tab - Redesigned
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

  if (vehicles.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Car className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد مركبات مستأجرة</h3>
        <p className="text-neutral-500">المركبات المستأجرة ستظهر هنا</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vehicles.map((vehicle, idx) => (
        <motion.div
          key={vehicle.id}
          variants={scaleIn}
          whileHover={{ y: -4 }}
          onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
          className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
              <Car className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900">{vehicle.make} {vehicle.model}</h4>
              <p className="text-sm text-neutral-500">{vehicle.year}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-3 bg-neutral-50 rounded-xl">
              <span className="text-neutral-500">رقم اللوحة</span>
              <span className="font-mono font-bold">{vehicle.plate_number}</span>
            </div>
            <div className="flex items-center justify-between text-sm p-3 bg-neutral-50 rounded-xl">
              <span className="text-neutral-500">رقم العقد</span>
              <span className="font-mono text-teal-600">{vehicle.contractNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm p-3 bg-teal-50 rounded-xl">
              <span className="text-neutral-500">الإيجار الشهري</span>
              <span className="font-bold text-teal-600">{vehicle.monthlyAmount?.toLocaleString()} ر.ق</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Invoices Tab - Redesigned
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

  if (invoices.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد فواتير</h3>
        <p className="text-neutral-500">الفواتير ستظهر هنا عند إنشائها</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {totalOutstanding > 0 && (
        <motion.div
          variants={fadeInUp}
          className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-900">إجمالي المستحقات</p>
                <p className="text-xs text-orange-700">فواتير غير مسددة</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600">{totalOutstanding.toLocaleString()} ر.ق</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {invoices.map((invoice, idx) => {
          const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
          const isPaid = invoice.payment_status === 'paid';
          const isOverdue = !isPaid && invoice.due_date && new Date(invoice.due_date) < new Date();

          return (
            <motion.div
              key={invoice.id}
              variants={slideIn}
              whileHover={{ x: 4 }}
              onClick={() => onInvoiceClick(invoice)}
              className={cn(
                "bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer",
                isPaid ? "border-green-200" : isOverdue ? "border-red-200" : "border-neutral-200"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isPaid ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-teal-50"
                  )}>
                    <FileText className={cn(
                      "w-6 h-6",
                      isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-teal-600"
                    )} />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{invoice.invoice_number || `INV-${invoice.id.substring(0, 8)}`}</p>
                    <p className="text-sm text-neutral-500">
                      {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={cn(
                    "text-xl font-bold",
                    isPaid ? "text-green-600" : isOverdue ? "text-red-600" : "text-teal-600"
                  )}>
                    {invoice.total_amount?.toLocaleString()} ر.ق
                  </p>
                  <Badge className={cn(
                    isPaid ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"
                  )}>
                    {isPaid ? 'مسدد' : isOverdue ? 'متأخر' : 'مستحق'}
                  </Badge>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Payments Tab - Redesigned
const PaymentsTab = ({ payments, onAddPayment }: { payments: any[], onAddPayment: () => void }) => {
  if (payments.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
          <PaymentIcon className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد مدفوعات</h3>
        <p className="text-neutral-500 mb-6">سجل أول دفعة لهذا العميل</p>
        <Button onClick={onAddPayment} className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600">
          <Plus className="w-4 h-4" />
          تسجيل دفعة
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">سجل المدفوعات ({payments.length})</h3>
        <Button onClick={onAddPayment} className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600">
          <Plus className="w-4 h-4" />
          تسجيل دفعة
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 text-right text-xs font-bold text-neutral-600">رقم الدفعة</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-neutral-600">التاريخ</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-neutral-600">المبلغ</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-neutral-600">الطريقة</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-neutral-600">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {payments.slice(0, 10).map((payment, idx) => (
              <tr key={payment.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-neutral-900">#{payment.payment_number || payment.id.substring(0, 8)}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">
                  {payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : '-'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-teal-600">{payment.amount?.toLocaleString()} ر.ق</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{payment.payment_method || '-'}</td>
                <td className="px-6 py-4">
                  <Badge className={payment.payment_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700'}>
                    {payment.payment_status === 'completed' ? 'مكتمل' : 'معلق'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Violations Tab - Redesigned
const ViolationsTab = ({ violations, navigate, isLoading }: { violations: any[], navigate: any, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <motion.div variants={fadeInUp} className="text-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد مخالفات</h3>
        <p className="text-neutral-500">سجل المخالفات المرورية نظيف</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">المخالفات المرورية ({violations.length})</h3>
      </div>

      <div className="space-y-4">
        {violations.map((violation, idx) => (
          <motion.div
            key={violation.id}
            variants={scaleIn}
            className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">{violation.violation_type}</h4>
                  <p className="text-sm text-neutral-500">رقم المخالفة: {violation.violation_number}</p>
                  {violation.vehicle && (
                    <p className="text-sm text-neutral-600">
                      {violation.vehicle.make} {violation.vehicle.model} - {violation.vehicle.plate_number}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={cn(
                violation.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {violation.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="text-xs text-neutral-500 mb-1">التاريخ</p>
                <p className="text-sm font-semibold">
                  {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="text-xs text-neutral-500 mb-1">الموقع</p>
                <p className="text-sm font-semibold">{violation.location || '-'}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-neutral-500 mb-1">المبلغ</p>
                <p className="text-sm font-bold text-red-600">{violation.fine_amount?.toLocaleString()} ر.ق</p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="text-xs text-neutral-500 mb-1">الجهة المصدرة</p>
                <p className="text-sm font-semibold">{violation.issuing_authority || '-'}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Notes Tab - Redesigned
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'phone':
      case 'call':
        return <Phone className="w-4 h-4 text-green-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-teal-500" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">سجل التواصل والملاحظات</h3>
          <p className="text-sm text-neutral-500">{activities.length} تفاعل مسجل</p>
        </div>
        <div className="flex items-center gap-2">
          {customerPhone && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(`tel:${customerPhone}`)}>
                <Phone className="w-4 h-4" />
                اتصال
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-emerald-600 border-emerald-200" onClick={() => window.open(`https://wa.me/${customerPhone.replace(/[^0-9]/g, '')}`)}>
                <MessageSquare className="w-4 h-4" />
                واتساب
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setIsAdding(!isAdding)} className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600">
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </div>
      </div>

      {/* Add Note Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200"
          >
            <div className="flex gap-2 mb-4">
              <Button
                variant={noteType === 'note' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNoteType('note')}
                className={noteType === 'note' ? 'bg-teal-500' : ''}
              >
                <FileText className="w-4 h-4 ml-1" />
                ملاحظة
              </Button>
              <Button
                variant={noteType === 'phone' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNoteType('phone')}
                className={noteType === 'phone' ? 'bg-green-500' : ''}
              >
                <Phone className="w-4 h-4 ml-1" />
                مكالمة
              </Button>
              <Button
                variant={noteType === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNoteType('whatsapp')}
                className={noteType === 'whatsapp' ? 'bg-emerald-500' : ''}
              >
                <MessageSquare className="w-4 h-4 ml-1" />
                واتساب
              </Button>
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              className="min-h-[100px] mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>إلغاء</Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || isAddingActivity}
                className="gap-2 bg-teal-500"
              >
                {isAddingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                حفظ
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activities Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, idx) => (
            <motion.div
              key={activity.id}
              variants={slideIn}
              className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                    {getActivityIcon(activity.note_type)}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-xs">
                      {activity.note_type === 'phone' ? 'مكالمة' : activity.note_type === 'whatsapp' ? 'واتساب' : 'ملاحظة'}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs text-neutral-400">
                  {format(new Date(activity.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                </span>
              </div>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{activity.content}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-10 h-10 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد ملاحظات</h3>
          <p className="text-neutral-500">ابدأ بإضافة ملاحظة أو تسجيل مكالمة</p>
        </div>
      )}
    </div>
  );
};

// Followups Tab - Redesigned
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
      if (!customerId || !companyId) return [];
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
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-teal-100 text-teal-700';
      default: return 'bg-neutral-100 text-neutral-700';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">المتابعات المجدولة</h3>
          <p className="text-sm text-neutral-500">{pendingFollowups.length} متابعة قادمة</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600">
          <Plus className="w-4 h-4" />
          إضافة متابعة
        </Button>
      </div>

      {/* Add Followup Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={newFollowup.title}
                onChange={(e) => setNewFollowup(prev => ({ ...prev, title: e.target.value }))}
                placeholder="عنوان المتابعة..."
                className="px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="datetime-local"
                value={newFollowup.scheduled_date}
                onChange={(e) => setNewFollowup(prev => ({ ...prev, scheduled_date: e.target.value }))}
                className="px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2 mb-4">
              {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                <Button
                  key={priority}
                  variant={newFollowup.priority === priority ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewFollowup(prev => ({ ...prev, priority }))}
                  className={newFollowup.priority === priority ? getPriorityColor(priority) : ''}
                >
                  {getPriorityLabel(priority)}
                </Button>
              ))}
            </div>
            <Textarea
              value={newFollowup.notes}
              onChange={(e) => setNewFollowup(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات إضافية..."
              className="min-h-[80px] mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>إلغاء</Button>
              <Button
                size="sm"
                onClick={handleAddFollowup}
                disabled={!newFollowup.title.trim() || !newFollowup.scheduled_date}
                className="gap-2 bg-teal-500"
              >
                <Plus className="w-4 h-4" />
                حفظ المتابعة
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Followups */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      ) : pendingFollowups.length > 0 ? (
        <div className="space-y-3">
          {pendingFollowups.map((followup, idx) => (
            <motion.div
              key={followup.id}
              variants={scaleIn}
              className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell className="w-4 h-4 text-teal-500" />
                    <h4 className="font-medium text-neutral-900">{followup.title}</h4>
                    <Badge className={cn("text-xs", getPriorityColor(followup.priority))}>
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
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCompleteFollowup(followup.id)}
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                >
                  <CheckCircle className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد متابعات</h3>
          <p className="text-neutral-500">أضف متابعة جديدة للتذكير</p>
        </div>
      )}

      {/* Completed Followups */}
      {completedFollowups.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-neutral-500 mb-3">المتابعات المكتملة ({completedFollowups.length})</h4>
          <div className="space-y-2">
            {completedFollowups.slice(0, 5).map(followup => (
              <div key={followup.id} className="bg-neutral-50 rounded-xl p-4 opacity-60">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-neutral-600 line-through">{followup.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Activity Tab - Redesigned
const ActivityTab = ({ customerId, contracts, payments, violations }: {
  customerId: string;
  contracts: any[];
  payments: any[];
  violations: any[];
}) => {
  const { activities: crmActivities } = useCustomerCRMActivity(customerId);

  const allActivities = useMemo(() => {
    const activities: Array<{
      id: string;
      type: string;
      description: string;
      date: Date;
      icon: string;
    }> = [];

    contracts?.forEach(contract => {
      activities.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        description: `عقد جديد: ${contract.contract_number || 'بدون رقم'}`,
        date: new Date(contract.created_at),
        icon: 'car'
      });
    });

    payments?.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        description: `دفعة: ${payment.amount?.toLocaleString()} ر.ق`,
        date: new Date(payment.payment_date || payment.created_at),
        icon: 'wallet'
      });
    });

    violations?.forEach(violation => {
      activities.push({
        id: `violation-${violation.id}`,
        type: 'violation',
        description: `مخالفة: ${violation.violation_type || 'مرورية'}`,
        date: new Date(violation.violation_date || violation.created_at),
        icon: 'alert'
      });
    });

    crmActivities?.forEach(activity => {
      activities.push({
        id: `crm-${activity.id}`,
        type: 'crm',
        description: activity.content,
        date: new Date(activity.created_at),
        icon: activity.note_type === 'phone' ? 'phone' : 'note'
      });
    });

    return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [contracts, payments, violations, crmActivities]);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'wallet': return <Wallet className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">سجل النشاط الكامل</h3>
        <Badge className="bg-teal-100 text-teal-700">{allActivities.length} نشاط</Badge>
      </div>

      {allActivities.length > 0 ? (
        <div className="space-y-3">
          {allActivities.slice(0, 50).map((activity, idx) => (
            <motion.div
              key={activity.id}
              variants={slideIn}
              className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                    {getIcon(activity.icon)}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(activity.type)}
                  </Badge>
                </div>
                <span className="text-xs text-neutral-400">
                  {format(activity.date, 'dd MMM yyyy - HH:mm', { locale: ar })}
                </span>
              </div>
              <p className="text-sm text-neutral-700">{activity.description}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-10 h-10 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد أنشطة</h3>
          <p className="text-neutral-500">سيظهر سجل النشاط هنا عند إجراء أي عمليات</p>
        </div>
      )}
    </div>
  );
};

// Documents Section - Redesigned
const DocumentsSection = ({
  documents,
  isUploading,
  onUpload,
  onDownload,
  onDelete
}: {
  documents: CustomerDocument[];
  isUploading: boolean;
  onUpload: () => void;
  onDownload: (doc: CustomerDocument) => void;
  onDelete: (docId: string) => void;
}) => {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-neutral-900">المرفقات</h3>
          <p className="text-sm text-neutral-500">{documents.length} مستند</p>
        </div>
        <Button
          onClick={onUpload}
          disabled={isUploading}
          className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600"
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
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {documents.map((doc, idx) => (
            <motion.div
              key={doc.id}
              variants={scaleIn}
              whileHover={{ y: -4 }}
              className="group relative bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-200 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
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
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/90 to-teal-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-10 w-10 p-0 rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(doc);
                  }}
                  title="تحميل"
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-10 w-10 p-0 rounded-xl bg-red-100 hover:bg-red-200 text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
                      onDelete(doc.id);
                    }
                  }}
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
          {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, idx) => (
            <motion.div
              key={idx}
              variants={scaleIn}
              whileHover={{ y: -4 }}
              onClick={onUpload}
              className="aspect-[4/3] bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-neutral-400 hover:border-teal-300 hover:text-teal-500 transition-all cursor-pointer"
            >
              <FileImage className="w-10 h-10 mb-2" />
              <p className="text-xs font-bold">{placeholder}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ===== Main Component =====
const CustomerDetailsPage = () => {
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLegalCaseDialogOpen, setIsLegalCaseDialogOpen] = useState(false);

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

  const { data: customerInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['customer-invoices', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, contract:contracts!contract_id(id, contract_number)`)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')  // استبعاد الفواتير الملغاة
        .order('due_date', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { data: trafficViolations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['customer-traffic-violations', customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`*, contract:contracts!contract_id(id, contract_number, customer_id), vehicle:vehicles!vehicle_id(id, make, model, plate_number)`)
        .eq('company_id', companyId)
        .order('violation_date', { ascending: false });
      if (error) return [];
      return data?.filter(v => v.contract?.customer_id === customerId) || [];
    },
    enabled: !!customerId && !!companyId,
  });

  // Computed
  const customerName = useMemo(() => {
    if (!customer) return 'غير محدد';
    if (customer.customer_type === 'corporate') {
      return customer.company_name_ar?.trim() || customer.company_name?.trim() || 'شركة';
    }
    // استخدام الاسم العربي أولاً، ثم الإنجليزي كبديل
    const firstName = customer.first_name_ar?.trim() || customer.first_name?.trim() || '';
    const lastName = customer.last_name_ar?.trim() || customer.last_name?.trim() || '';
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

  // Handlers
  const handleBack = () => navigate('/customers');
  const handleEdit = () => setIsEditDialogOpen(true);

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
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-neutral-200 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-neutral-500 mb-6">لم يتم العثور على هذا العميل</p>
          <Button onClick={handleBack} className="bg-gradient-to-r from-teal-500 to-teal-600">
            العودة للعملاء
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'info', label: 'المعلومات', icon: User },
    { value: 'phones', label: 'الهاتف', icon: Phone },
    { value: 'contracts', label: 'العقود', icon: FileText },
    { value: 'vehicles', label: 'المركبات', icon: Car },
    { value: 'invoices', label: 'الفواتير', icon: Wallet },
    { value: 'payments', label: 'المدفوعات', icon: PaymentIcon },
    { value: 'violations', label: 'المخالفات', icon: AlertTriangle },
    { value: 'notes', label: 'الملاحظات', icon: MessageSquare },
    { value: 'followups', label: 'المتابعات', icon: Bell },
    { value: 'activity', label: 'النشاط', icon: Activity },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Customer Header */}
        <CustomerHeader
          customer={customer}
          customerName={customerName}
          stats={stats}
          onEdit={handleEdit}
          onBack={handleBack}
        />

        {/* Data Quality Alert */}
        <DataQualityAlert customer={customer} />

        {/* Quick Stats */}
        <QuickStats stats={stats} customer={customer} />

        {/* Quick Actions */}
        <QuickActions
          customer={customer}
          onCall={() => customer?.phone && window.open(`tel:${customer.phone}`, '_self')}
          onWhatsApp={() => customer?.phone && window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`, '_blank')}
          onNewContract={() => navigate(`/contracts?customer=${customerId}`)}
          onAddNote={() => setActiveTab('notes')}
          onOpenLegalCase={() => setIsLegalCaseDialogOpen(true)}
        />

        {/* Tabs Section */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-neutral-50 border-b border-neutral-200 rounded-none p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-6 py-4 text-sm font-medium rounded-none border-b-2 data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-900"
                >
                  <tab.icon className="w-4 h-4 ml-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-8">
              <TabsContent value="info" className="mt-0">
                <PersonalInfoTab customer={customer} />
              </TabsContent>
              <TabsContent value="phones" className="mt-0">
                <PhoneNumbersTab customer={customer} />
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
                  <PaymentsTab payments={payments} onAddPayment={() => setIsPaymentDialogOpen(true)} />
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
                  contracts={contracts}
                  payments={payments}
                  violations={trafficViolations}
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <NotesTab
                  customerId={customerId || ''}
                  customerPhone={customer?.phone || customer?.mobile_number}
                />
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

        {/* Documents Section */}
        <DocumentsSection
          documents={documents}
          isUploading={isUploading}
          onUpload={() => fileInputRef.current?.click()}
          onDownload={(doc) => downloadDocument.mutate(doc)}
          onDelete={(docId) => deleteDocument.mutate(docId)}
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">تعديل بيانات العميل</DialogTitle>
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

      {/* Payment Dialog */}
      <QuickPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        customerId={customerId}
        customerName={customer ? `${customer.first_name_ar?.trim() || customer.first_name?.trim() || ''} ${customer.last_name_ar?.trim() || customer.last_name?.trim() || ''}`.trim() : ''}
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

      {/* Legal Case Dialog */}
      <CustomerLegalCaseDialog
        open={isLegalCaseDialogOpen}
        onOpenChange={setIsLegalCaseDialogOpen}
        customerId={customerId || ''}
        companyId={companyId || ''}
        customerName={customerName}
      />
    </motion.div>
  );
};

export default CustomerDetailsPage;
