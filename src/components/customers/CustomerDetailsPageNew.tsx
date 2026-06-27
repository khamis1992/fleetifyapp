/**
 * صفحة تفاصيل العميل - التصميم المحسّن (Modern Bento Style)
 * تصميم عصري مع نظام ألوان التيل (Teal) وتأثيرات الزجاج
 *
 * @component CustomerDetailsPageNew
 */

import React, { type CSSProperties, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { calculateContractTotalAmount } from '@/utils/contractCalculations';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { 
  useCustomerDocuments, 
  useUploadCustomerDocument, 
} from '@/hooks/useCustomerDocuments';
import { useCustomerCRMActivity } from '@/hooks/useCustomerCRMActivity';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Edit3,
  FileText,
  Trash2,
  Phone,
  Mail,
  Cake,
  CreditCard,
  User,
  Wallet,
  Car,
  Plus,
  AlertTriangle,
  MessageSquare,
  Activity,
  Star,
  Upload,
  Folder,
  FileImage,
  Printer,
  Share2,
  Gavel,
  Database,
  RefreshCw,
  Bell,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { UnifiedPaymentForm } from '@/components/finance/UnifiedPaymentForm';
import { EnhancedCustomerForm } from '@/components/customers/EnhancedCustomerForm';
import {
  Dialog,
  DialogContent,
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

import {
  MissingDataWarnings,
  PersonalInfoTab,
  PhoneNumbersTab,
  ContractsTab,
  VehiclesTab,
  InvoicesTab,
  PaymentsTab,
  NotesTab,
  ViolationsTab,
  ActivityTab,
  DocumentCard,
} from './tabs';
import type { CustomerDocument } from './tabs';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';

const customerDetailsTheme = systemColorPattern.colors;
const customerDetailsSystemStyle = {
  '--customer-details-text': customerDetailsTheme.text,
  '--customer-details-surface': customerDetailsTheme.surface,
  '--customer-details-inner': customerDetailsTheme.innerSurface,
  '--customer-details-muted': customerDetailsTheme.secondaryText,
  '--customer-details-border': customerDetailsTheme.border,
  '--customer-details-info': customerDetailsTheme.info,
  '--customer-details-alert': customerDetailsTheme.alert,
  '--customer-details-focus': customerDetailsTheme.focus,
  '--customer-details-success': customerDetailsTheme.success,
} as CSSProperties;

// ===== Main Component =====
const CustomerDetailsPageNew = () => {
  const { t } = useFleetifyTranslation("ui");
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State
  const [activeTab, setActiveTab] = useState('info');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('identity');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
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
        .limit(100);
      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!customerId && !!companyId,
  });

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
      return data?.filter(v => v.contract?.customer_id === customerId) || [];
    },
    enabled: !!customerId && !!companyId,
  });

  const { activities: crmActivitiesMain } = useCustomerCRMActivity(customerId || '');
  
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
    return formatCustomerName(customer);
  }, [customer]);

  const stats = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalContractAmount = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + calculateContractTotalAmount(c), 0);
    const totalPaid = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.balance_due || 0), 0);
    const outstandingAmount = totalContractAmount - totalPaid;
    
    const today = new Date();
    const overdueInvoicesAmount = customerInvoices
      .filter(inv => {
        const isUnpaid = inv.payment_status !== 'paid' && inv.payment_status !== 'completed';
        const isOverdue = inv.due_date && new Date(inv.due_date) < today;
        return isUnpaid && isOverdue;
      })
      .reduce((sum, inv) => sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0);

    const unpaidViolationsAmount = trafficViolations
      .filter(v => v.status !== 'paid')
      .reduce((sum, v) => sum + (v.fine_amount || 0), 0);

    const totalLateAmount = overdueInvoicesAmount + unpaidViolationsAmount;

    return { 
      activeContracts, 
      outstandingAmount, 
      totalPayments,
      overdueInvoicesAmount,
      unpaidViolationsAmount,
      totalLateAmount
    };
  }, [contracts, payments, customerInvoices, trafficViolations]);

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

  const handleDeleteCustomer = async () => {
    if (!customerId || !companyId) return;

    try {
      const { data: activeContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, contract_number, status')
        .eq('customer_id', customerId)
        .in('status', ['active', 'pending', 'under_legal_procedure']);

      if (contractsError) throw contractsError;

      if (activeContracts && activeContracts.length > 0) {
        toast({
          title: 'لا يمكن الحذف',
          description: `العميل لديه ${activeContracts.length} عقود نشطة. يجب إلغاء أو إنهاء العقود أولاً.`,
          variant: 'destructive',
        });
        setIsDeleteDialogOpen(false);
        return;
      }

      const { data: unpaidInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, paid_amount')
        .eq('customer_id', customerId)
        .neq('payment_status', 'paid');

      if (invoicesError) throw invoicesError;

      if (unpaidInvoices && unpaidInvoices.length > 0) {
        const totalDue = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);
        toast({
          title: 'لا يمكن الحذف',
          description: `العميل لديه ${unpaidInvoices.length} فواتير غير مدفوعة بقيمة ${formatCurrency(totalDue)}. يجب تسوية المديونيات أولاً.`,
          variant: 'destructive',
        });
        setIsDeleteDialogOpen(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('company_id', companyId);

      if (error) throw error;

      toast({
        title: 'تم حذف العميل',
        description: 'تم حذف العميل وجميع بياناته بنجاح',
      });
      navigate('/customers');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'خطأ في الحذف',
        description: error.message || 'حدث خطأ أثناء حذف العميل. قد يكون مرتبطاً ببيانات أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  // Loading & Error States
  if (isAuthenticating || !companyId || loadingCustomer) {
    return <PageSkeletonFallback />;
  }

  if (customerError || !customer) {
    return (
      <div
        className="customer-details-system min-h-screen flex items-center justify-center bg-[#F6F8FB] p-4"
        style={customerDetailsSystemStyle}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-10 max-w-md w-full border border-slate-200 shadow-xl text-center"
        >
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-slate-500 mb-6 text-sm">لم يتم العثور على هذا العميل أو حدث خطأ أثناء التحميل</p>
          <Button onClick={handleBack} className="bg-slate-900 hover:bg-slate-800 text-white px-6">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للعملاء
          </Button>
        </motion.div>
      </div>
    );
  }

  const overdueFollowups = scheduledFollowups.filter(f => new Date(f.scheduled_date) <= new Date()).length;
  const primaryContract = contracts.find((contract: any) => contract.status === 'active') || contracts[0];
  const latestPayment = payments[0];
  const latestInvoice = customerInvoices[0];
  const identityNumber = customer?.national_id || customer?.id_number || customer?.qatar_id || '-';
  const completionChecks = [
    Boolean(customerName && customerName !== 'غير محدد'),
    Boolean(customer?.phone || customer?.mobile_number),
    Boolean(identityNumber && identityNumber !== '-'),
    Boolean(customer?.email),
    documents.length > 0,
  ];
  const profileCompletion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
  const riskState = stats.totalLateAmount > 0
    ? { label: 'متابعة عاجلة', tone: 'danger', helper: 'توجد مبالغ متأخرة تحتاج إجراء' }
    : stats.activeContracts > 0
      ? { label: 'عميل نشط', tone: 'success', helper: 'العلاقة نشطة ولا توجد متأخرات حرجة' }
      : { label: 'ملف هادئ', tone: 'neutral', helper: 'لا توجد عقود نشطة حالياً' };

  return (
    <TooltipProvider>
    <div
      className="customer-details-system min-h-screen bg-[#F6F8FB]"
      style={customerDetailsSystemStyle}
    >
      {/* ─── Slim Header ─── */}
        <header className="sticky top-0 z-40 border-b border-[#DDE5EF] bg-white/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="-mr-2 gap-2 text-[#536173] hover:bg-[#EEF5FB] hover:text-[#173A63]"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="text-sm font-medium">العملاء</span>
              </Button>

              <div className="flex items-center gap-1.5">
                {customer?.phone && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!customer?.phone) {
                              toast({ title: 'رقم الهاتف غير متوفر', description: 'لا يوجد رقم هاتف مسجل لهذا العميل', variant: 'destructive' });
                              return;
                            }
                            window.open(`tel:${customer.phone}`, '_self');
                          }}
                          className="h-9 w-9 rounded-lg p-0 text-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>اتصال بالعميل</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!customer?.phone) {
                              toast({ title: 'رقم الهاتف غير متوفر', description: 'لا يوجد رقم هاتف مسجل لهذا العميل', variant: 'destructive' });
                              return;
                            }
                            const whatsappNumber = customer.phone || customer.phone;
                            const cleanedNumber = whatsappNumber.replace(/[^0-9]/g, '');
                            if (!cleanedNumber || cleanedNumber.length < 7) {
                              toast({ title: 'رقم الهاتف غير صالح', description: 'رقم الهاتف لا يمكن استخدامه مع واتساب', variant: 'destructive' });
                              return;
                            }
                            window.open(`https://wa.me/${cleanedNumber}`, '_blank');
                          }}
                          className="h-9 w-9 rounded-lg p-0 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>مراسلة واتساب</p></TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!customerId) { toast({ title: 'خطأ', description: 'معرف العميل غير متوفر', variant: 'destructive' }); return; }
                        navigate(`/customers/crm?customer=${customerId}`);
                      }}
                      className="h-9 w-9 rounded-lg p-0 text-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
                    >
                      <Activity className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>إدارة علاقات العميل</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!customerId) { toast({ title: 'خطأ', description: 'معرف العميل غير متوفر', variant: 'destructive' }); return; }
                        navigate(`/contracts?customer=${customerId}`);
                      }}
                      className="h-9 w-9 rounded-lg p-0 text-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>إنشاء عقد جديد</p></TooltipContent>
                </Tooltip>

                <div className="mx-1 h-6 w-px bg-[#DDE5EF]" />

                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="h-9 gap-1.5 rounded-lg bg-[#173A63] px-3 text-xs text-white hover:bg-[#173A63]/90"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  تعديل
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg p-0 text-[#536173] hover:bg-[#EEF5FB] hover:text-[#173A63]">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleEdit} className="gap-2">
                      <Edit3 className="w-4 h-4" />
                      تعديل البيانات
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePrint} className="gap-2">
                      <Printer className="w-4 h-4" />
                      طباعة
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => {
                      const url = window.location.href;
                      if (navigator.share) {
                        navigator.share({ title: customerName, url }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(url);
                        toast({ title: 'تم نسخ الرابط', description: 'تم نسخ رابط العميل إلى الحافظة' });
                      }
                    }}>
                      <Share2 className="w-4 h-4" />
                      مشاركة
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                      onClick={() => {
                        const activeContract = contracts?.find((c: any) => c.status === 'active');
                        if (activeContract) {
                          navigate(`/legal/lawsuit/prepare/${activeContract.id}`);
                        } else {
                          toast({ title: 'لا يوجد عقد نشط', description: 'يجب أن يكون للعميل عقد نشط لإنشاء قضية', variant: 'destructive' });
                        }
                      }}
                    >
                      <Gavel className="w-4 h-4" />
                      إنشاء قضية قانونية
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-blue-700 focus:text-blue-700 focus:bg-blue-50"
                      onClick={() => navigate('/legal/lawsuit-data')}
                    >
                      <Database className="w-4 h-4" />
                      عرض بيانات التقاضي
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف العميل
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

      <main className="w-full max-w-none px-4 py-6 sm:px-6 lg:px-8">
        <div className="customer-command-grid grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4 xl:sticky xl:top-[76px] xl:self-start"
          >
            <section className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
              <div className="bg-[#142033] px-5 py-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <Avatar className="h-16 w-16 rounded-xl border border-white/20 bg-white/10">
                    <AvatarFallback className="rounded-xl bg-white text-xl font-black text-[#142033]">
                      {getInitials(customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge
                    className={cn(
                      "border-0 px-3 py-1 text-xs font-bold",
                      riskState.tone === 'danger' ? "bg-rose-500 text-white" : riskState.tone === 'success' ? "bg-emerald-500 text-white" : "bg-white/15 text-white"
                    )}
                  >
                    {riskState.label}
                  </Badge>
                </div>
                <div className="mt-5">
                  <p className="text-xs font-semibold text-white/55">ملف العميل</p>
                  <h1 className="mt-1 text-2xl font-black leading-tight tracking-normal text-white">{customerName}</h1>
                  <p className="mt-2 text-sm leading-6 text-white/70">{riskState.helper}</p>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-bold text-[#6A7688]">رقم الهوية</p>
                    <p className="mt-1 truncate text-sm font-black text-[#142033]" dir="ltr">{identityNumber}</p>
                  </div>
                  <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-bold text-[#6A7688]">اكتمال الملف</p>
                    <p className="mt-1 text-sm font-black text-[#142033]">{profileCompletion}%</p>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#E7EDF4]">
                  <div className="h-full rounded-full bg-[#173A63]" style={{ width: `${profileCompletion}%` }} />
                </div>

                <div className="space-y-2">
                  <a href={customer?.phone ? `tel:${customer.phone}` : undefined} className="flex items-center justify-between rounded-lg border border-[#DDE5EF] bg-white px-3 py-2.5 text-sm transition-colors hover:border-[#173A63] hover:bg-[#F8FAFC]">
                    <span className="flex items-center gap-2 font-bold text-[#142033]"><Phone className="h-4 w-4 text-[#173A63]" /> الهاتف</span>
                    <span className="font-semibold text-[#536173]" dir="ltr">{customer?.phone || customer?.mobile_number || '-'}</span>
                  </a>
                  <div className="flex items-center justify-between rounded-lg border border-[#DDE5EF] bg-white px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 font-bold text-[#142033]"><Mail className="h-4 w-4 text-[#173A63]" /> البريد</span>
                    <span className="max-w-[160px] truncate font-semibold text-[#536173]">{customer?.email || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[#DDE5EF] bg-white px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 font-bold text-[#142033]"><Cake className="h-4 w-4 text-[#173A63]" /> الميلاد</span>
                    <span className="font-semibold text-[#536173]">{customer?.date_of_birth || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-10 gap-2 bg-[#173A63] text-white hover:bg-[#142033]" onClick={() => setIsPaymentDialogOpen(true)}>
                    <CreditCard className="h-4 w-4" />
                    تسجيل دفعة
                  </Button>
                  <Button variant="outline" className="h-10 gap-2 border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]" onClick={() => navigate(`/customers/crm?customer=${customerId}`)}>
                    <Activity className="h-4 w-4" />
                    CRM
                  </Button>
                  <Button variant="outline" className="h-10 gap-2 border-[#DDE5EF] text-[#536173] hover:bg-[#F8FAFC]" onClick={() => setActiveTab('notes')}>
                    <MessageSquare className="h-4 w-4" />
                    ملاحظة
                  </Button>
                  <Button variant="outline" className="h-10 gap-2 border-[#DDE5EF] text-[#536173] hover:bg-[#F8FAFC]" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    مستند
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black text-[#142033]">مختصر العلاقة</h2>
                <Badge className="border border-[#DDE5EF] bg-[#F8FAFC] text-[#536173]">{contracts.length} عقد</Badge>
              </div>
              <div className="space-y-3">
                <button type="button" onClick={() => primaryContract && navigate(`/contracts/${primaryContract.contract_number || primaryContract.id}`)} className="w-full rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3 text-right transition-colors hover:border-[#173A63]">
                  <p className="text-[11px] font-bold text-[#6A7688]">العقد الحالي</p>
                  <p className="mt-1 truncate text-sm font-black text-[#142033]">{primaryContract?.contract_number || primaryContract?.id || 'لا يوجد عقد'}</p>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-bold text-[#6A7688]">آخر فاتورة</p>
                    <p className="mt-1 truncate text-sm font-black text-[#142033]">{latestInvoice?.invoice_number || '-'}</p>
                  </div>
                  <div className="rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-[11px] font-bold text-[#6A7688]">آخر دفعة</p>
                    <p className="mt-1 text-sm font-black text-[#142033]">{latestPayment ? formatCurrency(latestPayment.amount || 0) : '-'}</p>
                  </div>
                </div>
              </div>
            </section>

            <MissingDataWarnings customer={customer} />
          </motion.aside>

          <div className="min-w-0 space-y-5">
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm"
            >
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-[#DDE5EF] p-5 lg:border-b-0 lg:border-l">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#6A7688]">لوحة القرار المالي</p>
                      <h2 className="mt-1 text-xl font-black text-[#142033]">ما الذي يحتاج انتباهك الآن؟</h2>
                    </div>
                    <Button variant="outline" className="h-9 gap-2 border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]" onClick={() => setActiveTab('activity')}>
                      <Activity className="h-4 w-4" />
                      النشاط
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-4">
                      <p className="text-xs font-bold text-[#6A7688]">المستحق</p>
                      <p className="mt-2 text-2xl font-black text-[#142033]">{formatCurrency(stats.outstandingAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                      <p className="text-xs font-bold text-rose-700">المتأخر</p>
                      <p className="mt-2 text-2xl font-black text-rose-700">{formatCurrency(stats.totalLateAmount)}</p>
                    </div>
                    <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-4">
                      <p className="text-xs font-bold text-[#6A7688]">المدفوع</p>
                      <p className="mt-2 text-2xl font-black text-[#142033]">{formatCurrency(stats.totalPayments)}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-black text-[#142033]">إجراءات مقترحة</h2>
                    {overdueFollowups > 0 && <Badge className="bg-rose-500 text-white">{overdueFollowups} متابعة متأخرة</Badge>}
                  </div>
                  <div className="space-y-2">
                    <Button className="h-11 w-full justify-between bg-[#173A63] px-4 text-white hover:bg-[#142033]" onClick={() => setIsPaymentDialogOpen(true)}>
                      <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> تسجيل دفعة لهذا العميل</span>
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button variant="outline" className="h-11 w-full justify-between border-[#DDE5EF] px-4 text-[#142033] hover:bg-[#F8FAFC]" onClick={() => setActiveTab('invoices')}>
                      <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[#173A63]" /> مراجعة الفواتير والمخالفات</span>
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button variant="outline" className="h-11 w-full justify-between border-[#DDE5EF] px-4 text-[#142033] hover:bg-[#F8FAFC]" onClick={() => navigate(`/customers/crm?customer=${customerId}`)}>
                      <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#173A63]" /> فتح سجل الاتصال والمتابعة</span>
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </Button>
                    {stats.totalLateAmount > 0 && (
                      <Button variant="outline" className="h-11 w-full justify-between border-rose-200 bg-rose-50 px-4 text-rose-700 hover:bg-rose-100" onClick={() => {
                        if (primaryContract) navigate(`/legal/lawsuit/prepare/${primaryContract.id}`);
                        else toast({ title: 'لا يوجد عقد نشط', description: 'يجب توفر عقد للبدء في الإجراء القانوني', variant: 'destructive' });
                      }}>
                        <span className="flex items-center gap-2"><Gavel className="h-4 w-4" /> بدء إجراء قانوني</span>
                        <ArrowRight className="h-4 w-4 rotate-180" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            >
              {[
                { label: 'العقود النشطة', value: stats.activeContracts, icon: FileText, action: () => setActiveTab('contracts') },
                { label: 'الفواتير', value: customerInvoices.length, icon: Wallet, action: () => setActiveTab('invoices') },
                { label: 'المخالفات', value: trafficViolations.length, icon: AlertTriangle, action: () => setActiveTab('violations'), danger: trafficViolations.length > 0 },
                { label: 'المرفقات', value: documents.length, icon: Folder, action: () => fileInputRef.current?.click() },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={cn(
                    "group rounded-xl border bg-white p-4 text-right shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    item.danger ? "border-rose-200 hover:border-rose-300" : "border-[#DDE5EF] hover:border-[#173A63]"
                  )}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", item.danger ? "bg-rose-50 text-rose-600" : "bg-[#EEF5FB] text-[#173A63]")}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 rotate-180 text-[#9AA6B6] transition-transform group-hover:-translate-x-1" />
                  </div>
                  <p className="text-2xl font-black text-[#142033]">{item.value}</p>
                  <p className="mt-1 text-xs font-bold text-[#6A7688]">{item.label}</p>
                </button>
              ))}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="grid min-h-[620px] lg:grid-cols-[230px_minmax(0,1fr)]">
                <div className="border-b border-[#DDE5EF] bg-[#F8FAFC] p-3 lg:border-b-0 lg:border-l">
                  <div className="mb-3 px-2">
                    <p className="text-xs font-bold text-[#6A7688]">ملف العميل الكامل</p>
                    <p className="mt-1 text-sm font-black text-[#142033]">اختر القسم المطلوب</p>
                  </div>
                  <TabsList className="flex h-auto w-full flex-row gap-1 overflow-x-auto bg-transparent p-0 lg:flex-col lg:overflow-visible">
                    {[
                      { value: 'info', label: 'البيانات', icon: User },
                      { value: 'phones', label: 'الأرقام', icon: Phone },
                      { value: 'contracts', label: 'العقود', icon: FileText },
                      { value: 'vehicles', label: 'المركبات', icon: Car },
                      { value: 'invoices', label: 'الفواتير', icon: Wallet },
                      { value: 'payments', label: 'المدفوعات', icon: CreditCard },
                      { value: 'violations', label: 'المخالفات', icon: AlertTriangle, badge: trafficViolations.length > 0 ? trafficViolations.length : null },
                      { value: 'notes', label: 'المتابعة', icon: MessageSquare },
                      { value: 'activity', label: 'النشاط', icon: Activity },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                          "h-10 min-w-fit justify-start gap-2 rounded-lg border border-transparent px-3 text-xs font-black transition-colors lg:w-full",
                          "data-[state=active]:border-[#173A63] data-[state=active]:bg-[#173A63] data-[state=active]:text-white",
                          "data-[state=inactive]:bg-white data-[state=inactive]:text-[#536173] hover:text-[#142033]"
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {'badge' in tab && tab.badge && (
                          <Badge className="mr-auto h-5 min-w-5 border-0 bg-rose-100 px-1.5 text-[10px] font-black text-rose-700">
                            {tab.badge}
                          </Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="min-w-0 p-5">
                  <TabsContent value="info" className="mt-0">
                    {loadingCustomer ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <PersonalInfoTab customer={customer} />
                    )}
                  </TabsContent>
                  <TabsContent value="phones" className="mt-0">
                    {loadingCustomer ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <PhoneNumbersTab customer={customer} />
                    )}
                  </TabsContent>
                  <TabsContent value="contracts" className="mt-0">
                    {loadingContracts ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <ContractsTab contracts={contracts} navigate={navigate} customerId={customerId || ''} />
                    )}
                  </TabsContent>
                  <TabsContent value="vehicles" className="mt-0">
                    {loadingContracts ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <VehiclesTab contracts={contracts} navigate={navigate} />
                    )}
                  </TabsContent>
                  <TabsContent value="invoices" className="mt-0">
                    {loadingInvoices ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <InvoicesTab
                        invoices={customerInvoices}
                        onInvoiceClick={(invoice) => {
                          setSelectedInvoice(invoice);
                          setIsInvoiceDialogOpen(true);
                        }}
                        violations={trafficViolations}
                        customerName={customerName}
                        customerPhone={customer?.phone || customer?.mobile_number}
                        customerIdNumber={customer?.id_number || customer?.qatar_id}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="payments" className="mt-0">
                    {loadingPayments ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <PaymentsTab 
                        payments={payments} 
                        navigate={navigate} 
                        onAddPayment={() => setIsPaymentDialogOpen(true)} 
                        customerName={customerName}
                        customerPhone={customer?.phone || customer?.mobile_number}
                        customerIdNumber={customer?.id_number || customer?.qatar_id}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="violations" className="mt-0">
                    {loadingViolations ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
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
                        <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                      </div>
                    ) : (
                      <NotesTab 
                        customerId={customerId || ''} 
                        customerPhone={customer?.phone || customer?.mobile_number}
                        companyId={companyId || ''}
                      />
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-[#DDE5EF] bg-white p-5 shadow-sm"
            >
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-base font-black text-[#142033]">مستندات العميل</h3>
                  <p className="mt-1 text-xs font-semibold text-[#6A7688]">{documents.length} مستند محفوظ في ملف العميل</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isUploading ? 'جاري الرفع...' : 'رفع مستند'}
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
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {documents.map((doc: CustomerDocument, index: number) => (
                    <DocumentCard key={doc.id} doc={doc} index={index} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, index) => (
                    <button
                      type="button"
                      key={index}
                      className="aspect-[4/3] rounded-xl border border-dashed border-[#B8C6D8] bg-[#F8FAFC] text-[#6A7688] transition-colors hover:border-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileImage className="mx-auto mb-2 h-7 w-7" />
                      <p className="text-xs font-black">{placeholder}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.section>
          </div>
        </div>

        {false && (
          <>
        {/* ─── Hero Profile Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm"
        >
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Avatar & Identity */}
              <div className="flex items-center gap-5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="h-[76px] w-[76px] rounded-xl bg-[#173A63] p-[3px] shadow-sm">
                    <Avatar className="w-full h-full rounded-[13px] border-2 border-white">
                      <AvatarFallback className="rounded-lg bg-[#142033] text-xl font-bold text-white">
                        {getInitials(customerName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {customer.is_active && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-white shadow-sm" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="truncate text-2xl font-black tracking-tight text-[#142033] sm:text-3xl">{customerName}</h1>
                    {customer.is_blacklisted && (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{t("vip")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{'عميل'}</p>
                </div>
              </div>

              {/* Info Pills */}
              <div className="flex-1 flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="flex items-center gap-3 rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] px-4 py-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF5FB]">
                    <Cake className="h-[18px] w-[18px] text-[#173A63]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-rose-500/80">تاريخ الميلاد</p>
                    <p className="text-sm font-semibold text-slate-900">{customer.date_of_birth || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] px-4 py-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF5FB]">
                    <Phone className="h-[18px] w-[18px] text-[#173A63]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-sky-500/80">رقم الهاتف</p>
                    <p className="text-sm font-semibold text-slate-900 font-mono" dir="ltr">{customer.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] px-4 py-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF5FB]">
                    <Mail className="h-[18px] w-[18px] text-[#173A63]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-violet-500/80">البريد الإلكتروني</p>
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">{customer.email || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <MissingDataWarnings customer={customer} />

        {/* ─── Stats Strip ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Active Contracts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="group relative overflow-hidden rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-colors hover:border-[#173A63]"
          >
            <div className="absolute bottom-3 right-0 top-3 w-1 rounded-full bg-[#173A63]" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF5FB] text-[#173A63]">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#142033]">{stats.activeContracts}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">العقود النشطة</p>
          </motion.div>

          {/* Outstanding Amount */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="group relative overflow-hidden rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-colors hover:border-[#173A63]"
          >
            <div className="absolute bottom-3 right-0 top-3 w-1 rounded-full bg-amber-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#142033]">
              {stats.outstandingAmount.toLocaleString()}
              <span className="text-sm font-semibold text-slate-400 mr-1">ر.ق</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">المبلغ المستحق</p>
          </motion.div>

          {/* Late Amounts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative overflow-hidden rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-colors hover:border-red-300"
          >
            <div className="absolute right-0 top-3 bottom-3 w-1 rounded-full bg-rose-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalLateAmount.toLocaleString()}
              <span className="text-sm font-semibold text-slate-400 mr-1">ر.ق</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">المبالغ المتأخرة</p>
            {(stats.overdueInvoicesAmount > 0 || stats.unpaidViolationsAmount > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stats.overdueInvoicesAmount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                    فواتير: {stats.overdueInvoicesAmount.toLocaleString()}
                  </span>
                )}
                {stats.unpaidViolationsAmount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                    مخالفات: {stats.unpaidViolationsAmount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
            {stats.totalLateAmount > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  const activeContract = customer?.contracts?.find((c: any) => c.status === 'active');
                  if (activeContract) {
                    navigate(`/legal/lawsuit/prepare/${activeContract.id}`);
                  } else {
                    toast({ title: 'لا يوجد عقد نشط', description: 'يجب أن يكون للعميل عقد نشط لإنشاء قضية', variant: 'destructive' });
                  }
                }}
                className="mt-3 w-full h-8 text-xs bg-rose-500 hover:bg-rose-600 text-white gap-1.5 rounded-lg"
              >
                <Gavel className="w-3.5 h-3.5" />
                إنشاء قضية
              </Button>
            )}
          </motion.div>

          {/* Total Payments */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="group relative overflow-hidden rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-colors hover:border-[#173A63]"
          >
            <div className="absolute bottom-3 right-0 top-3 w-1 rounded-full bg-[#173A63]" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF5FB] text-[#173A63]">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-[#142033]">
              {stats.totalPayments.toLocaleString()}
              <span className="text-sm font-semibold text-slate-400 mr-1">ر.ق</span>
            </p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">إجمالي المدفوعات</p>
          </motion.div>
        </div>

        {/* ─── CRM Quick Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-start justify-between gap-3 rounded-xl border border-[#DDE5EF] bg-white px-5 py-3.5 shadow-sm sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#173A63] text-white shadow-sm">
              <MessageSquare className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">مركز إدارة العلاقات</p>
              <p className="text-xs text-slate-500">
                {crmActivitiesMain.length} ملاحظة • {scheduledFollowups.length} متابعة قادمة
                {overdueFollowups > 0 && (
                  <span className="text-rose-500 font-semibold mr-1.5">• {overdueFollowups} متأخرة</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {customer?.phone && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-[#D8E1EC] text-xs text-[#536173] hover:border-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
                  onClick={() => window.open(`tel:${customer.phone}`)}
                >
                  <Phone className="w-3.5 h-3.5" />
                  اتصال
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg border-[#D8E1EC] text-xs text-[#536173] hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => window.open(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`)}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  واتساب
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg bg-[#173A63] text-xs text-white hover:bg-[#173A63]/90"
              onClick={() => setActiveTab('notes')}
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة ملاحظة
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg border-[#D8E1EC] text-xs text-[#536173] hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              onClick={() => setActiveTab('notes')}
            >
              <Bell className="w-3.5 h-3.5" />
              المتابعة
            </Button>
          </div>
        </motion.div>

        {/* ─── Tabs Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4 pb-0">
              <TabsList className="flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-1">
                {[
                  { value: 'info', label: 'معلومات العميل', icon: User },
                  { value: 'phones', label: 'أرقام الهاتف', icon: Phone },
                  { value: 'contracts', label: 'العقود', icon: FileText },
                  { value: 'vehicles', label: 'المركبات', icon: Car },
                  { value: 'invoices', label: 'الفواتير', icon: Wallet },
                  { value: 'payments', label: 'المدفوعات', icon: CreditCard },
                  { value: 'violations', label: 'المخالفات', icon: AlertTriangle, badge: trafficViolations.length > 0 ? trafficViolations.length : null },
                  { value: 'notes', label: 'المتابعة', icon: MessageSquare },
                  { value: 'activity', label: 'سجل النشاط', icon: Activity },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-bold transition-colors gap-1.5",
                      "data-[state=active]:border data-[state=active]:border-[#173A63] data-[state=active]:bg-[#173A63] data-[state=active]:text-white data-[state=active]:shadow-sm",
                      "data-[state=inactive]:text-[#6A7688] hover:text-[#142033]"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {'badge' in tab && tab.badge && (
                      <Badge className="mr-0.5 text-[10px] h-4 min-w-[16px] px-1 bg-rose-100 text-rose-700 border-0 rounded-full font-semibold">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="info" className="mt-0">
                {loadingCustomer ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <PersonalInfoTab customer={customer} />
                )}
              </TabsContent>
              <TabsContent value="phones" className="mt-0">
                {loadingCustomer ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <PhoneNumbersTab customer={customer} />
                )}
              </TabsContent>
              <TabsContent value="contracts" className="mt-0">
                {loadingContracts ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <ContractsTab contracts={contracts} navigate={navigate} customerId={customerId || ''} />
                )}
              </TabsContent>
              <TabsContent value="vehicles" className="mt-0">
                {loadingContracts ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <VehiclesTab contracts={contracts} navigate={navigate} />
                )}
              </TabsContent>
              <TabsContent value="invoices" className="mt-0">
                {loadingInvoices ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <InvoicesTab
                    invoices={customerInvoices}
                    onInvoiceClick={(invoice) => {
                      setSelectedInvoice(invoice);
                      setIsInvoiceDialogOpen(true);
                    }}
                    violations={trafficViolations}
                    customerName={customerName}
                    customerPhone={customer?.phone || customer?.mobile_number}
                    customerIdNumber={customer?.id_number || customer?.qatar_id}
                  />
                )}
              </TabsContent>
              <TabsContent value="payments" className="mt-0">
                {loadingPayments ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <PaymentsTab 
                    payments={payments} 
                    navigate={navigate} 
                    onAddPayment={() => setIsPaymentDialogOpen(true)} 
                    customerName={customerName}
                    customerPhone={customer?.phone || customer?.mobile_number}
                    customerIdNumber={customer?.id_number || customer?.qatar_id}
                  />
                )}
              </TabsContent>
              <TabsContent value="violations" className="mt-0">
                {loadingViolations ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
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
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <NotesTab 
                    customerId={customerId || ''} 
                    customerPhone={customer?.phone || customer?.mobile_number}
                    companyId={companyId || ''}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>

        {/* ─── Attachments Section ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Folder className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">المرفقات</h3>
                <p className="text-xs text-slate-500">{documents.length} مستند</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg h-8 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  جاري الرفع...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {documents.map((doc: CustomerDocument, index: number) => (
                <DocumentCard key={doc.id} doc={doc} index={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="w-7 h-7 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-medium">{placeholder}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
          </>
        )}
      </main>

      {/* ─── Edit Dialog ─── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-indigo-600" />
              </div>
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
              showDuplicateCheck={false}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog ─── */}
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

      {/* ─── Invoice Preview Dialog ─── */}
      <InvoicePreviewDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoice={selectedInvoice}
        customerName={customerName}
      />

      {/* ─── Delete Confirmation Dialog ─── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md border-slate-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-slate-900">
                حذف العميل نهائياً
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600 font-medium mb-2">
                    هل أنت متأكد من حذف العميل:
                  </p>
                  <p className="text-base font-bold text-slate-900">{customerName}</p>
                  <p className="text-xs text-slate-500 mt-1">رقم الهوية: {customer?.national_id || 'غير محدد'}</p>
                </div>
                
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-rose-700">
                      <p className="font-bold mb-2">⚠️ تحذير مهم:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• سيتم حذف جميع بيانات العميل نهائياً</li>
                        <li>• لا يمكن التراجع عن هذا الإجراء</li>
                        <li>• سيتم الاحتفاظ بالعقود والفواتير المرتبطة (للأرشيف)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {(stats.activeContracts > 0 || stats.totalLateAmount > 0) && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="font-bold text-amber-800 mb-2 text-sm">⚠️ ملاحظات:</p>
                    <ul className="space-y-1 text-xs text-amber-700">
                      {stats.activeContracts > 0 && (
                        <li>• يوجد <strong>{stats.activeContracts} عقود نشطة</strong> - يُفضل إلغاؤها أولاً</li>
                      )}
                      {stats.totalLateAmount > 0 && (
                        <li>• يوجد مبالغ مستحقة بقيمة <strong>{formatCurrency(stats.totalLateAmount)}</strong></li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCustomer}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        .customer-details-system {
          color: var(--customer-details-text);
          font-size: 16px;
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.72), var(--customer-details-inner) 260px),
            var(--customer-details-inner) !important;
        }

        .customer-details-system .text-\\[11px\\] {
          font-size: 13.5px !important;
          line-height: 1.6 !important;
        }

        .customer-details-system .text-xs {
          font-size: 14px !important;
          line-height: 1.65 !important;
        }

        .customer-details-system .text-sm {
          font-size: 15.5px !important;
          line-height: 1.7 !important;
        }

        .customer-details-system button,
        .customer-details-system input,
        .customer-details-system textarea,
        .customer-details-system [role="combobox"] {
          font-size: 15px !important;
        }

        .customer-details-system header {
          background: color-mix(in srgb, var(--customer-details-surface) 94%, transparent) !important;
          border-color: var(--customer-details-border) !important;
          backdrop-filter: blur(14px);
        }

        .customer-details-system main {
          max-width: none !important;
        }

        .customer-details-system .bg-white,
        .customer-details-system [class*="bg-card"] {
          background-color: var(--customer-details-surface) !important;
        }

        .customer-details-system .bg-slate-50,
        .customer-details-system .bg-slate-100,
        .customer-details-system .bg-gray-50,
        .customer-details-system .bg-neutral-50 {
          background-color: var(--customer-details-inner) !important;
        }

        .customer-details-system .rounded-3xl,
        .customer-details-system .rounded-2xl,
        .customer-details-system .rounded-xl,
        .customer-details-system .rounded-lg,
        .customer-details-system .rounded-md {
          border-radius: 8px !important;
        }

        .customer-details-system .shadow-xl,
        .customer-details-system .shadow-lg,
        .customer-details-system .shadow-md,
        .customer-details-system .shadow-sm {
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.07) !important;
        }

        .customer-details-system .border,
        .customer-details-system .border-slate-100,
        .customer-details-system .border-slate-200,
        .customer-details-system .border-slate-300,
        .customer-details-system .border-gray-200 {
          border-color: var(--customer-details-border) !important;
        }

        .customer-details-system .text-slate-900,
        .customer-details-system .text-gray-900,
        .customer-details-system .text-neutral-900,
        .customer-details-system .text-foreground {
          color: var(--customer-details-text) !important;
        }

        .customer-details-system .text-slate-800,
        .customer-details-system .text-slate-700,
        .customer-details-system .text-slate-600,
        .customer-details-system .text-slate-500,
        .customer-details-system .text-gray-600,
        .customer-details-system .text-muted-foreground {
          color: var(--customer-details-muted) !important;
        }

        .customer-details-system .bg-gradient-to-br,
        .customer-details-system .bg-gradient-to-r,
        .customer-details-system .bg-gradient-to-l {
          background-image: none !important;
        }

        .customer-details-system .from-indigo-500,
        .customer-details-system .via-violet-500,
        .customer-details-system .to-fuchsia-500,
        .customer-details-system .bg-indigo-600,
        .customer-details-system .bg-violet-600,
        .customer-details-system .bg-indigo-500,
        .customer-details-system .bg-violet-500 {
          background-color: var(--customer-details-focus) !important;
          color: white !important;
        }

        .customer-details-system .bg-slate-900,
        .customer-details-system .hover\\:bg-slate-800:hover {
          background-color: var(--customer-details-text) !important;
          color: white !important;
        }

        .customer-details-system .bg-emerald-50,
        .customer-details-system .bg-green-50,
        .customer-details-system .bg-teal-50 {
          background-color: color-mix(in srgb, var(--customer-details-success) 12%, white) !important;
        }

        .customer-details-system .text-emerald-600,
        .customer-details-system .text-emerald-700,
        .customer-details-system .text-green-600,
        .customer-details-system .text-teal-600 {
          color: var(--customer-details-success) !important;
        }

        .customer-details-system .bg-sky-50,
        .customer-details-system .bg-blue-50,
        .customer-details-system .bg-cyan-50 {
          background-color: color-mix(in srgb, var(--customer-details-info) 12%, white) !important;
        }

        .customer-details-system .text-sky-500,
        .customer-details-system .text-sky-600,
        .customer-details-system .text-sky-700,
        .customer-details-system .text-blue-600,
        .customer-details-system .text-blue-700 {
          color: var(--customer-details-info) !important;
        }

        .customer-details-system .bg-violet-50,
        .customer-details-system .bg-indigo-50 {
          background-color: color-mix(in srgb, var(--customer-details-focus) 12%, white) !important;
        }

        .customer-details-system .text-violet-500,
        .customer-details-system .text-violet-600,
        .customer-details-system .text-violet-700,
        .customer-details-system .text-indigo-600,
        .customer-details-system .text-indigo-700 {
          color: var(--customer-details-focus) !important;
        }

        .customer-details-system .bg-rose-50,
        .customer-details-system .bg-amber-50,
        .customer-details-system .bg-orange-50 {
          background-color: color-mix(in srgb, var(--customer-details-alert) 12%, white) !important;
        }

        .customer-details-system .bg-rose-500,
        .customer-details-system .bg-rose-600 {
          background-color: var(--customer-details-alert) !important;
          color: white !important;
        }

        .customer-details-system .text-rose-500,
        .customer-details-system .text-rose-600,
        .customer-details-system .text-rose-700,
        .customer-details-system .text-amber-700,
        .customer-details-system .text-amber-800 {
          color: var(--customer-details-alert) !important;
        }

        .customer-details-system main > div:nth-of-type(1) {
          border-top: 4px solid var(--customer-details-focus) !important;
        }

        .customer-details-system main > div:nth-of-type(1) > div {
          padding: 1.5rem !important;
        }

        .customer-details-system main > div:nth-of-type(1) .w-\\[76px\\] {
          width: 68px !important;
          height: 68px !important;
          padding: 0 !important;
          background: var(--customer-details-focus) !important;
          box-shadow: none !important;
        }

        .customer-details-system main > div:nth-of-type(1) [class*="AvatarFallback"],
        .customer-details-system main > div:nth-of-type(1) .bg-slate-900 {
          background: var(--customer-details-text) !important;
        }

        .customer-details-system main > div:nth-of-type(3) > div {
          min-height: 132px;
          border-radius: 8px !important;
        }

        .customer-details-system main > div:nth-of-type(3) > div:nth-child(1) .absolute {
          background-color: var(--customer-details-info) !important;
        }

        .customer-details-system main > div:nth-of-type(3) > div:nth-child(2) .absolute,
        .customer-details-system main > div:nth-of-type(3) > div:nth-child(4) .absolute {
          background-color: var(--customer-details-focus) !important;
        }

        .customer-details-system main > div:nth-of-type(3) > div:nth-child(3) .absolute {
          background-color: var(--customer-details-alert) !important;
        }

        .customer-details-system [role="tablist"] {
          background: var(--customer-details-inner) !important;
          border-color: var(--customer-details-border) !important;
          gap: 0.25rem !important;
          scrollbar-width: thin;
        }

        .customer-details-system [role="tab"] {
          min-height: 40px;
          color: var(--customer-details-muted) !important;
          border-radius: 8px !important;
        }

        .customer-details-system [role="tab"][data-state="active"] {
          background: var(--customer-details-focus) !important;
          color: white !important;
          border-color: var(--customer-details-focus) !important;
          box-shadow: 0 8px 18px rgba(23, 58, 99, 0.18) !important;
        }

        .customer-details-system [role="tab"][data-state="active"] svg,
        .customer-details-system [role="tab"][data-state="active"] span {
          color: white !important;
        }

        .customer-details-system button,
        .customer-details-system input,
        .customer-details-system textarea,
        .customer-details-system [role="combobox"] {
          border-radius: 8px !important;
        }

        .customer-details-system input,
        .customer-details-system textarea,
        .customer-details-system [role="combobox"] {
          background: var(--customer-details-inner) !important;
          border-color: var(--customer-details-border) !important;
        }

        .customer-details-system .border-dashed:hover {
          border-color: var(--customer-details-focus) !important;
          background: color-mix(in srgb, var(--customer-details-focus) 6%, white) !important;
          color: var(--customer-details-focus) !important;
        }

        .customer-details-system *:focus-visible {
          outline-color: var(--customer-details-focus) !important;
          --tw-ring-color: var(--customer-details-focus) !important;
        }

        .customer-details-system .customer-command-grid {
          border-top: 0 !important;
        }

        .customer-details-system .customer-command-grid > div,
        .customer-details-system .customer-command-grid > aside {
          padding: 0 !important;
        }

        .customer-details-system .customer-command-grid [role="tablist"] {
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        @media (max-width: 768px) {
          .customer-details-system header {
            position: static !important;
          }

          .customer-details-system main {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .customer-details-system main > div:nth-of-type(1) .flex-1 {
            justify-content: stretch !important;
          }

          .customer-details-system [role="tab"] {
            flex: 0 0 auto;
            padding-inline: 0.85rem !important;
          }
        }
      `}</style>
    </div>
    </TooltipProvider>
  );
};

export default CustomerDetailsPageNew;
