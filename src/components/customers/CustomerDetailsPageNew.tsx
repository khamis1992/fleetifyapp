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
  ChevronLeft,
  Upload,
  Folder,
  FileImage,
  Printer,
  Share2,
  Gavel,
  Database,
  RefreshCw,
  Bell,
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
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-neutral-200 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-neutral-500 mb-4">لم يتم العثور على هذا العميل</p>
          <Button onClick={handleBack} className="bg-rose-500 hover:bg-coral-600">
            العودة للعملاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Bar */}
      <TooltipProvider>
        <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                >
                  <ArrowRight className="w-4 h-4" />
                  العودة للقائمة
                </Button>
              </div>

              <div className="flex items-center gap-2">
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
                          className="gap-1.5 text-teal-600 border-teal-200 hover:bg-teal-50 hover:border-teal-300"
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
                          className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
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
                              className="gap-1.5 text-cyan-600 border-cyan-200 hover:bg-cyan-50 hover:border-cyan-300"
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
                                navigate(`/contracts?customer=${customerId}`);
                              }}
                              className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                        >
                          <Plus className="w-4 h-4" />
                          عقد جديد
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>إنشاء عقد جديد لهذا العميل</p>
                    </TooltipContent>
                  </Tooltip>

              <span className="text-sm text-slate-300 mr-2">|</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-slate-200">
                    خيارات
                    <ChevronLeft className="w-4 h-4" />
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
                    className="gap-2 text-teal-700 focus:text-teal-700 focus:bg-teal-50"
                    onClick={() => {
                      const activeContract = customer?.contracts?.find((c: any) => c.status === 'active');
                      if (activeContract) {
                        navigate(`/legal/lawsuit/prepare/${activeContract.id}`);
                      } else {
                        toast({
                          title: 'لا يوجد عقد نشط',
                          description: 'يجب أن يكون للعميل عقد نشط لإنشاء قضية',
                          variant: 'destructive'
                        });
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
                    className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف العميل
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={handleEdit}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2 shadow-teal-500/20"
              >
                <Edit3 className="w-4 h-4" />
                تعديل
              </Button>
              
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="outline"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                حذف العميل نهائياً
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
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="w-24 h-24 rounded-full border-4 border-teal-100 shadow-lg shadow-teal-500/10">
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold">
                    {getInitials(customerName)}
                  </AvatarFallback>
                </Avatar>
                {customer.is_active && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-slate-900">{customerName}</h1>
                  {customer.is_vip && (
                    <Badge className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 gap-1 px-3 py-1 rounded-md font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      VIP
                    </Badge>
                  )}
                </div>
                <p className="text-slate-500 text-sm">{customer.job_title || 'عميل'}</p>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 lg:pr-6 lg:border-r border-teal-100">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-sm">
                  <Cake className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-rose-600/70">تاريخ الميلاد</p>
                  <p className="text-sm font-semibold text-slate-900">{customer.date_of_birth || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-teal-600/70">رقم الهاتف</p>
                  <p className="text-sm font-semibold text-slate-900 font-mono" dir="ltr">{customer.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600/70">البريد الإلكتروني</p>
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">{customer.email || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <MissingDataWarnings customer={customer} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-lg hover:shadow-teal-500/10 transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-teal-500 to-teal-600 rounded-full" />
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center group-hover:scale-110 transition-transform border border-teal-100">
                <FileText className="w-7 h-7 text-teal-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-teal-600 mb-2">{stats.activeContracts}</p>
              <p className="text-sm font-medium text-slate-600">العقود النشطة</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-lg hover:shadow-amber-500/10 transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full" />
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-100">
                <Wallet className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-amber-600 mb-2">
                {stats.outstandingAmount.toLocaleString()}
                <span className="text-xl font-bold mr-1">ر.ق</span>
              </p>
              <p className="text-sm font-medium text-slate-600">المبلغ المستحق</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-red-100 shadow-sm hover:shadow-lg hover:shadow-red-500/10 transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-red-500 to-red-600 rounded-full" />
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center group-hover:scale-110 transition-transform border border-red-100">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-red-600 mb-2">
                {stats.totalLateAmount.toLocaleString()}
                <span className="text-xl font-bold mr-1">ر.ق</span>
              </p>
              <p className="text-sm font-medium text-slate-600">المبالغ المتأخرة</p>
              <div className="mt-2 text-xs text-slate-500 flex flex-col gap-1">
                <span>فواتير: {stats.overdueInvoicesAmount.toLocaleString()} ر.ق</span>
                <span>مخالفات: {stats.unpaidViolationsAmount.toLocaleString()} ر.ق</span>
              </div>
              
              {stats.totalLateAmount > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    const activeContract = customer?.contracts?.find((c: any) => c.status === 'active');
                    if (activeContract) {
                      navigate(`/legal/lawsuit/prepare/${activeContract.id}`);
                    } else {
                      toast({
                        title: 'لا يوجد عقد نشط',
                        description: 'يجب أن يكون للعميل عقد نشط لإنشاء قضية',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="mt-3 w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white gap-2"
                >
                  <Gavel className="w-4 h-4" />
                  إنشاء قضية
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-indigo-100 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all overflow-hidden group"
          >
            <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full" />
            <div className="flex justify-end mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform border border-indigo-100">
                <CreditCard className="w-7 h-7 text-indigo-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-indigo-600 mb-2">
                {stats.totalPayments.toLocaleString()}
                <span className="text-xl font-bold mr-1">ر.ق</span>
              </p>
              <p className="text-sm font-medium text-slate-600">إجمالي المدفوعات</p>
            </div>
          </motion.div>
        </div>

        {/* CRM Summary Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-teal-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm shadow-teal-500/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-teal-900">مركز إدارة علاقات العملاء</h3>
                <p className="text-xs text-teal-600/70">
                  {crmActivitiesMain.length} ملاحظة • {scheduledFollowups.length} متابعة قادمة
                  {scheduledFollowups.filter(f => new Date(f.scheduled_date) <= new Date()).length > 0 && (
                    <span className="text-red-500 font-medium mr-2">
                      • {scheduledFollowups.filter(f => new Date(f.scheduled_date) <= new Date()).length} متأخرة
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {customer?.phone && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300"
                    onClick={() => window.open(`tel:${customer.phone}`)}
                  >
                    <Phone className="w-4 h-4" />
                    اتصال
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                    onClick={() => window.open(`https://wa.me/${customer.phone?.replace(/[^0-9]/g, '')}`)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    واتساب
                  </Button>
                </>
              )}
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-teal-500/20"
                onClick={() => setActiveTab('notes')}
              >
                <Plus className="w-4 h-4" />
                إضافة ملاحظة
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                onClick={() => setActiveTab('notes')}
              >
                <Bell className="w-4 h-4" />
                المتابعة
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 overflow-hidden shadow-sm"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-200 rounded-none h-auto p-0 gap-0 overflow-x-auto">
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
                    "px-5 py-3.5 text-sm font-medium rounded-none border-b-2 transition-all gap-2 data-[state=active]:bg-white whitespace-nowrap",
                    "data-[state=active]:border-teal-500 data-[state=active]:text-teal-700",
                    "data-[state=inactive]:border-transparent data-[state=inactive]:text-teal-600/70 hover:text-teal-900 hover:bg-white/50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {'badge' in tab && tab.badge && (
                    <Badge className="mr-1 text-xs h-5 min-w-[20px] px-1.5 bg-red-100 text-red-700 border border-red-200 rounded-md font-medium">
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
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-400" />
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
                    companyId={companyId || ''}
                  />
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
          className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Folder className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-teal-900">المرفقات</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300"
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {documents.map((doc: CustomerDocument, index: number) => (
                <DocumentCard key={doc.id} doc={doc} index={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {['صورة العميل', 'رخصة القيادة', 'الهوية الوطنية', 'عقد الإيجار'].map((placeholder, index) => (
                <div
                  key={index}
                  className="aspect-[4/3] bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-dashed border-teal-200 flex flex-col items-center justify-center text-teal-400 hover:border-teal-400 hover:text-teal-600 transition-all cursor-pointer hover:shadow-sm hover:shadow-teal-500/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage className="w-8 h-8 mb-2" />
                  <p className="text-xs font-medium">{placeholder}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-teal-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-teal-900">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-white" />
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

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoice={selectedInvoice}
        customerName={customerName}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-red-600">
                حذف العميل نهائياً
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700 font-medium mb-2">
                    هل أنت متأكد من حذف العميل:
                  </p>
                  <p className="text-base font-bold text-gray-900">{customerName}</p>
                  <p className="text-xs text-gray-500 mt-1">رقم الهوية: {customer?.national_id || 'غير محدد'}</p>
                </div>
                
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
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
                  <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
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
            <AlertDialogCancel className="flex-1">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCustomer}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف نهائياً
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDetailsPageNew;
