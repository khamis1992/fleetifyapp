/**
 * صفحة تفاصيل العميل - التصميم المحسّن (Modern Bento Style)
 * تصميم عصري مع نظام ألوان التيل (Teal) وتأثيرات الزجاج
 *
 * @component CustomerDetailsPageNew
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
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

// ===== Main Component =====
const CustomerDetailsPageNew = () => {
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
    const totalPaid = contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.paid_amount || 0), 0);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-slate-50">
      {/* ─── Slim Header ─── */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-2 text-slate-500 hover:text-slate-900 -mr-2"
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
                          className="w-9 h-9 p-0 text-sky-600 hover:bg-sky-50 hover:text-sky-700 rounded-xl"
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
                            const whatsappNumber = customer.whatsapp || customer.phone;
                            const cleanedNumber = whatsappNumber.replace(/[^0-9]/g, '');
                            if (!cleanedNumber || cleanedNumber.length < 7) {
                              toast({ title: 'رقم الهاتف غير صالح', description: 'رقم الهاتف لا يمكن استخدامه مع واتساب', variant: 'destructive' });
                              return;
                            }
                            window.open(`https://wa.me/${cleanedNumber}`, '_blank');
                          }}
                          className="w-9 h-9 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl"
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
                      className="w-9 h-9 p-0 text-violet-600 hover:bg-violet-50 hover:text-violet-700 rounded-xl"
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
                      className="w-9 h-9 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>إنشاء عقد جديد</p></TooltipContent>
                </Tooltip>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  تعديل
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-9 h-9 p-0 text-slate-500 hover:text-slate-900 rounded-xl">
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
                    <DropdownMenuItem className="gap-2">
                      <Share2 className="w-4 h-4" />
                      مشاركة
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-indigo-700 focus:text-indigo-700 focus:bg-indigo-50"
                      onClick={() => {
                        const activeContract = customer?.contracts?.find((c: any) => c.status === 'active');
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ─── Hero Profile Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              {/* Avatar & Identity */}
              <div className="flex items-center gap-5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-[76px] h-[76px] rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-[3px] shadow-lg shadow-indigo-500/20">
                    <Avatar className="w-full h-full rounded-[13px] border-2 border-white">
                      <AvatarFallback className="bg-slate-900 text-white text-xl font-bold rounded-[13px]">
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight truncate">{customerName}</h1>
                    {customer.is_vip && (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        VIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{customer.job_title || 'عميل'}</p>
                </div>
              </div>

              {/* Info Pills */}
              <div className="flex-1 flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-rose-50/70 rounded-xl border border-rose-100">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Cake className="w-[18px] h-[18px] text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-rose-500/80">تاريخ الميلاد</p>
                    <p className="text-sm font-semibold text-slate-900">{customer.date_of_birth || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 bg-sky-50/70 rounded-xl border border-sky-100">
                  <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-[18px] h-[18px] text-sky-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-sky-500/80">رقم الهاتف</p>
                    <p className="text-sm font-semibold text-slate-900 font-mono" dir="ltr">{customer.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 bg-violet-50/70 rounded-xl border border-violet-100">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-[18px] h-[18px] text-violet-500" />
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
            className="relative bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden"
          >
            <div className="absolute right-0 top-3 bottom-3 w-1 rounded-full bg-sky-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-sky-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.activeContracts}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">العقود النشطة</p>
          </motion.div>

          {/* Outstanding Amount */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="relative bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden"
          >
            <div className="absolute right-0 top-3 bottom-3 w-1 rounded-full bg-amber-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
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
            className="relative bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden"
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
            className="relative bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group overflow-hidden"
          >
            <div className="absolute right-0 top-3 bottom-3 w-1 rounded-full bg-indigo-500" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
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
          className="bg-white rounded-xl px-5 py-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20 flex-shrink-0">
              <MessageSquare className="w-[18px] h-[18px] text-white" />
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
                  className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 rounded-lg"
                  onClick={() => window.open(`tel:${customer.phone}`)}
                >
                  <Phone className="w-3.5 h-3.5" />
                  اتصال
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg"
                  onClick={() => window.open(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`)}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  واتساب
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
              onClick={() => setActiveTab('notes')}
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة ملاحظة
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 rounded-lg"
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
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4 pb-0">
              <TabsList className="w-full justify-start bg-slate-100/80 border border-slate-200/50 rounded-xl h-auto p-1 gap-0.5 overflow-x-auto flex-nowrap">
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
                      "px-3.5 py-2 text-xs font-medium rounded-lg transition-all gap-1.5 whitespace-nowrap",
                      "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/50",
                      "data-[state=inactive]:text-slate-500 hover:text-slate-700"
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
    </div>
    </TooltipProvider>
  );
};

export default CustomerDetailsPageNew;
