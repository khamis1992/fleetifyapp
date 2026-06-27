/**
 * مركز الفواتير والمدفوعات الموحد
 * تصميم بسيط ومتوافق مع الداشبورد
 * يشمل: الفواتير + المدفوعات + الودائع + الإيجارات
 */
import { type CSSProperties, useState, useMemo, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { Loader2 } from "lucide-react";

// Lazy load additional tabs
const Deposits = lazy(() => import("./Deposits"));
const MonthlyRentTracking = lazy(() => import("./MonthlyRentTracking"));
import { useInvoices } from "@/hooks/finance/useInvoices";
import { usePayments } from "@/hooks/useFinance";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useTreasurySummary } from "@/hooks/useTreasury";
import { InvoiceFormWizard } from "@/components/finance/InvoiceFormWizard";
import { InvoicePreviewDialog } from "@/components/finance/InvoicePreviewDialog";
import { InvoiceEditDialog } from "@/components/finance/InvoiceEditDialog";
import { PayInvoiceDialog } from "@/components/finance/PayInvoiceDialog";
import { UnifiedPaymentForm } from "@/components/finance/UnifiedPaymentForm";
import { PaymentPreviewDialog } from "@/components/finance/PaymentPreviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportButton } from "@/components/ui/ExportButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Receipt, 
  CreditCard,
  Plus, 
  Search,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle,
  Wallet,
  CalendarDays,
  XCircle,
  Landmark,
  Send,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { usePaymentOperations } from "@/hooks/business/usePaymentOperations";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";

import { EmptyState } from "@/components/ui/EmptyState";

const billingColors = {
  text: systemColorPattern.colors.text,
  surface: systemColorPattern.colors.surface,
  inner: systemColorPattern.colors.innerSurface,
  muted: systemColorPattern.colors.secondaryText,
  border: systemColorPattern.colors.border,
  info: systemColorPattern.colors.info,
  alert: systemColorPattern.colors.alert,
  focus: systemColorPattern.colors.focus,
  success: systemColorPattern.colors.success,
};

const billingStyle = {
  "--billing-text": billingColors.text,
  "--billing-surface": billingColors.surface,
  "--billing-inner": billingColors.inner,
  "--billing-muted": billingColors.muted,
  "--billing-border": billingColors.border,
  "--billing-info": billingColors.info,
  "--billing-alert": billingColors.alert,
  "--billing-focus": billingColors.focus,
  "--billing-success": billingColors.success,
} as CSSProperties;

const billingTabs = [
  { id: "invoices", label: "الفواتير", helper: "إصدار ومتابعة", icon: Receipt, accent: billingColors.info },
  { id: "payments", label: "المدفوعات", helper: "تحصيل وإيصالات", icon: CreditCard, accent: billingColors.success },
  { id: "deposits", label: "الودائع", helper: "ضمانات العملاء", icon: Wallet, accent: billingColors.focus },
  { id: "rent", label: "الإيجارات", helper: "متابعة شهرية", icon: CalendarDays, accent: billingColors.alert },
];

interface BillingMetricProps {
  title: string;
  value: string;
  helper?: string;
  icon: React.ElementType;
  accent: string;
}

const BillingMetric = ({ title, value, helper, icon: Icon, accent }: BillingMetricProps) => (
  <div className="billing-metric">
    <div className="flex items-start justify-between gap-3">
      <span className="billing-metric-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      {helper && (
        <span className="text-xs font-bold" style={{ color: billingColors.muted }}>
          {helper}
        </span>
      )}
    </div>
    <p className="mt-5 text-sm font-bold" style={{ color: billingColors.muted }}>
      {title}
    </p>
    <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: billingColors.text }}>
      {value}
    </p>
  </div>
);

// ===== Main Component =====
const BillingCenter = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const financeAccess = useFinanceAccessGuard();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State - use URL params for tab
  const activeTab = searchParams.get("tab") || "invoices";
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Invoice states
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  
  // Payment states
  const [isCreatePaymentOpen, setIsCreatePaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false);
  const [isCancelPaymentDialogOpen, setIsCancelPaymentDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const handleExportCSV = () => {
    const headers = ["رقم الفاتورة", "العميل", "المبلغ", "الحالة", "التاريخ"];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      inv.customers?.company_name || `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`,
      inv.total_amount?.toString() || '0',
      inv.payment_status || '',
      inv.invoice_date || ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoices_export.csv";
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map(inv => inv.id));
    }
  };

  const toggleSelectInvoice = (invoiceId: string) => {
    if (selectedInvoiceIds.includes(invoiceId)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== invoiceId));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, invoiceId]);
    }
  };

  const handleBulkExport = () => {
    const selectedInvoices = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    const headers = ["رقم الفاتورة", "العميل", "المبلغ", "الحالة", "التاريخ"];
    const rows = selectedInvoices.map(inv => [
      inv.invoice_number,
      inv.customers?.company_name || `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`,
      inv.total_amount?.toString() || '0',
      inv.payment_status || '',
      inv.invoice_date || ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selected_invoices.csv";
    a.click();
    setSelectedInvoiceIds([]);
  };

  const { cancelPayment } = usePaymentOperations();

  // Data fetching
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ pageSize: 100 });
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments();
  const { data: treasuryData } = useTreasurySummary();

  // Extract data
  const invoices = useMemo(() => {
    if (Array.isArray(invoicesData)) return invoicesData;
    if (invoicesData?.data) return invoicesData.data;
    return [];
  }, [invoicesData]);

  const payments = useMemo(() => {
    if (Array.isArray(paymentsData)) return paymentsData;
    return [];
  }, [paymentsData]);

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // حساب بداية ونهاية الشهر الحالي
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    
    // إجمالي الفواتير
    const totalInvoices = invoices.reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);
    const paidInvoices = invoices.filter(inv => inv?.payment_status === 'paid')
      .reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);
    const pendingInvoices = invoices.filter(inv => inv?.payment_status === 'pending' || inv?.payment_status === 'partial')
      .reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);
    const totalPayments = payments.reduce((sum, pmt) => sum + (Number(pmt?.amount) || 0), 0);

    // مدفوعات الشهر الحالي
    const currentMonthPayments = payments.filter(pmt => {
      const paymentDate = new Date(pmt?.payment_date);
      return paymentDate >= startOfCurrentMonth && paymentDate < startOfNextMonth;
    });
    const currentMonthTotal = currentMonthPayments.reduce((sum, pmt) => sum + (Number(pmt?.amount) || 0), 0);
    
    // مدفوعات الشهر السابق
    const lastMonthPayments = payments.filter(pmt => {
      const paymentDate = new Date(pmt?.payment_date);
      return paymentDate >= startOfLastMonth && paymentDate < startOfCurrentMonth;
    });
    const lastMonthTotal = lastMonthPayments.reduce((sum, pmt) => sum + (Number(pmt?.amount) || 0), 0);
    
    // نسبة التغيير
    const monthlyChange = lastMonthTotal > 0 
      ? Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : currentMonthTotal > 0 ? 100 : 0;

    // فواتير الشهر الحالي
    const currentMonthInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv?.invoice_date);
      return invoiceDate >= startOfCurrentMonth && invoiceDate < startOfNextMonth;
    });
    const currentMonthInvoicesTotal = currentMonthInvoices.reduce((sum, inv) => sum + (inv?.total_amount || 0), 0);

    return {
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalPayments,
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      // إحصائيات الشهر الحالي
      currentMonthPayments: currentMonthTotal,
      currentMonthPaymentsCount: currentMonthPayments.length,
      lastMonthPayments: lastMonthTotal,
      monthlyChange,
      currentMonthInvoices: currentMonthInvoicesTotal,
      currentMonthInvoicesCount: currentMonthInvoices.length,
    };
  }, [invoices, payments]);

  // Filtered data
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv?.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv?.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || inv?.payment_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  const filteredPayments = useMemo(() => {
    return payments.filter(pmt => {
      const matchesSearch = pmt?.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pmt?.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || pmt?.payment_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, filterStatus]);

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!financeAccess.can('finance.invoice.cancel')) {
        throw new Error('ليس لديك صلاحية إلغاء الفواتير المالية');
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, company_id, created_by, status, payment_status, notes')
        .eq('id', invoiceId)
        .maybeSingle();

      if (invoiceError || !invoice) {
        throw invoiceError || new Error('الفاتورة غير موجودة');
      }

      const segregationDecision = financeAccess.checkSegregationOfDuties({
        action: 'finance.invoice.cancel',
        actorId: user?.id,
        creatorId: invoice.created_by,
      });

      if (!segregationDecision.allowed) {
        throw new Error(segregationDecision.reason || 'تم منع العملية بسبب قاعدة فصل المهام');
      }

      if (invoice.status === 'cancelled' || invoice.payment_status === 'cancelled') {
        return invoice;
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('id, payment_status')
        .eq('invoice_id', invoiceId)
        .in('payment_status', ['completed', 'paid', 'confirmed'])
        .limit(1);

      if (payments && payments.length > 0) {
        throw new Error('لا يمكن حذف الفاتورة لأنها مرتبطة بدفعات');
      }

      const previousNotes = invoice.notes ? `${invoice.notes}\n` : '';
      const cancellationNote = `تم إلغاء الفاتورة من مركز الفوترة بواسطة ${user?.email || user?.id || 'system'} في ${new Date().toISOString()}`;

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          balance_due: 0,
          notes: `${previousNotes}${cancellationNote}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', invoice.company_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الفاتورة بنجاح');
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل حذف الفاتورة');
    }
  });

  // Helper functions
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      paid: { label: 'مدفوعة', className: 'bg-green-100 text-green-700' },
      unpaid: { label: 'غير مدفوعة', className: 'bg-slate-100 text-slate-700' },
      pending: { label: 'معلقة', className: 'bg-yellow-100 text-yellow-700' },
      partial: { label: 'جزئية', className: 'bg-blue-100 text-blue-700' },
      overdue: { label: 'متأخرة', className: 'bg-red-100 text-red-700' },
      cancelled: { label: 'ملغاة', className: 'bg-slate-100 text-slate-700' },
      completed: { label: 'مكتملة', className: 'bg-green-100 text-green-700' },
      confirmed: { label: 'مؤكدة', className: 'bg-green-100 text-green-700' },
    };
    const config = configs[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
    return <Badge className={config.className} aria-label={`الحالة: ${config.label}`}>{config.label}</Badge>;
  };

  const openCancelPaymentDialog = (payment: any) => {
    setPaymentToCancel(payment);
    setCancelReason("");
    setIsCancelPaymentDialogOpen(true);
  };

  const confirmCancelPayment = async () => {
    if (!paymentToCancel?.id) {
      toast.error('لم يتم تحديد الدفعة');
      return;
    }

    cancelPayment.mutate(
      {
        paymentId: paymentToCancel.id,
        reason: cancelReason?.trim() || `تم الإلغاء من صفحة الفواتير والمدفوعات`,
      },
      {
        onSuccess: () => {
          // Refresh local lists
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
          queryClient.invalidateQueries({ queryKey: ['contract-payments'] });

          setIsCancelPaymentDialogOpen(false);
          setPaymentToCancel(null);
          setCancelReason("");
        },
        onError: (error: any) => {
          console.error('Error cancelling payment:', error);
          toast.error(error?.message || 'فشل إلغاء الدفعة');
        },
      }
    );
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd MMM yyyy', { locale: ar });
    } catch {
      return date;
    }
  };

  // Send payment voucher via WhatsApp
  const handleSendPaymentVoucher = async (payment: any) => {
    // Get customer phone
    let phone = payment.customers?.phone || '';
    
    if (!phone) {
      toast.error('لا يوجد رقم هاتف للعميل');
      return;
    }

    // Clean and format phone number
    phone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (phone.startsWith('0')) {
      phone = '974' + phone.substring(1);
    } else if (!phone.startsWith('+') && !phone.startsWith('974')) {
      phone = '974' + phone;
    }
    phone = phone.replace('+', '');

    // Get customer name
    const customerName = payment.customers?.company_name || 
      `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`.trim() || 'العميل';

    // Get payment method in Arabic
    const paymentMethodAr = payment.payment_method === 'cash' ? 'نقدي' :
      payment.payment_method === 'card' ? 'بطاقة' :
      payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
      payment.payment_method === 'cheque' ? 'شيك' : 
      payment.payment_method === 'received' ? 'مستلم' : payment.payment_method;

    // Create clean message without emojis
    const message = `مرحباً ${customerName}،

تم استلام دفعتكم بنجاح

رقم الإيصال: ${payment.payment_number || '-'}
المبلغ: ${formatCurrency(Number(payment.amount))}
التاريخ: ${formatDate(payment.payment_date)}
طريقة الدفع: ${paymentMethodAr}

شكراً لتعاملكم معنا

شركة العراف لتأجير السيارات`;

    // First, open the preview dialog to show the receipt
    setSelectedPayment(payment);
    setIsPaymentPreviewOpen(true);

    // Wait a bit for the dialog to render, then show instructions
    setTimeout(() => {
      toast.info('اضغط على زر الطباعة أو التحميل في نافذة الإيصال، ثم سيتم فتح واتساب');
    }, 500);

    // Open WhatsApp after a delay
    setTimeout(() => {
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }, 1000);
  };

  const activeTabInfo = billingTabs.find((tab) => tab.id === activeTab) || billingTabs[0];

  return (
    <div className="billing-system min-h-screen" dir="rtl" style={billingStyle}>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <motion.section
          data-tour="billing-header"
          className="billing-command"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="billing-command-icon">
                <Receipt className="h-6 w-6" />
              </span>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/10">
                    مركز الفوترة والتحصيل
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: billingColors.muted }}>
                    فواتير، مدفوعات، ودائع، إيجارات
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-normal sm:text-3xl" style={{ color: billingColors.text }}>
                  الفوترة والتحصيل
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: billingColors.muted }}>
                  مساحة واحدة لمراقبة الفواتير المستحقة، تحصيل الدفعات، ومتابعة التدفقات المرتبطة بالعقود.
                </p>
              </div>
            </div>

            <div data-tour="billing-create-actions" className="flex flex-wrap gap-2">
              <Button onClick={() => setIsCreateInvoiceOpen(true)} className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90">
                <Plus className="h-4 w-4" />
                فاتورة جديدة
              </Button>
              <Button onClick={() => setIsCreatePaymentOpen(true)} variant="outline" className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]">
                <CreditCard className="h-4 w-4" />
                تسجيل دفعة
              </Button>
              <Button onClick={() => navigate("/finance/overview")} variant="outline" className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]">
                <ArrowLeft className="h-4 w-4" />
                المالية
              </Button>
            </div>
          </div>

          <div data-tour="billing-metrics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BillingMetric title="إجمالي الفواتير" value={formatCurrency(stats.totalInvoices)} helper={`${stats.invoiceCount} فاتورة`} icon={Receipt} accent={billingColors.info} />
            <BillingMetric title="المدفوع" value={formatCurrency(stats.paidInvoices)} helper={`${stats.monthlyChange >= 0 ? "+" : ""}${stats.monthlyChange}%`} icon={CheckCircle} accent={billingColors.success} />
            <BillingMetric title="المستحق" value={formatCurrency(stats.pendingInvoices)} helper="قيد التحصيل" icon={Clock} accent={billingColors.alert} />
            <BillingMetric title="مدفوعات هذا الشهر" value={formatCurrency(stats.currentMonthPayments)} helper={`${stats.currentMonthPaymentsCount} دفعة`} icon={TrendingUp} accent={billingColors.focus} />
          </div>
        </motion.section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="billing-workspace">
          <section data-tour="billing-tabs" className="billing-tabs-shell">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: billingColors.muted }}>
                Billing Workspace
              </p>
              <h2 className="mt-1 text-xl font-black" style={{ color: billingColors.text }}>
                {activeTabInfo.label}
              </h2>
              <p className="mt-1 text-sm" style={{ color: billingColors.muted }}>
                {activeTabInfo.helper}
              </p>
            </div>

            <TabsList className="billing-tabs-list">
              {billingTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="billing-tab-trigger"
                    style={{ "--tab-accent": tab.accent } as CSSProperties}
                  >
                    <span className="billing-tab-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-right">
                      <span className="block truncate text-sm font-black">{tab.label}</span>
                      <span className={cn("block truncate text-[11px] font-bold", isActive && "text-white/80")}>{tab.helper}</span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </section>

          <section data-tour="billing-filters" className="billing-filter-bar">
            <div className="flex items-center gap-3">
              <span className="billing-filter-icon" style={{ color: activeTabInfo.accent, backgroundColor: `${activeTabInfo.accent}14` }}>
                <activeTabInfo.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: billingColors.text }}>تصفية العرض</p>
                <p className="text-xs" style={{ color: billingColors.muted }}>بحث سريع وحالة السجل الحالي</p>
              </div>
            </div>

            <div className="billing-filter-controls">
              <ExportButton onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: billingColors.muted }} />
                <Input
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="billing-input pr-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="billing-input w-44">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="partial">جزئية</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <motion.div 
            data-tour="billing-invoices-table"
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  title="لا توجد فواتير"
                  description="أنشئ فاتورتك الأولى أو اترك النظام يولدها تلقائياً من العقود"
                  onAction={() => setIsCreateInvoiceOpen(true)}
                  actionLabel="فاتورة جديدة"
                />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <Table className="min-w-[600px]" aria-label="جدول الفواتير">
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="w-12" scope="col">
                        <Checkbox
                          checked={selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="تحديد كل الفواتير"
                        />
                      </TableHead>
                      <TableHead className="text-right" scope="col">رقم الفاتورة</TableHead>
                      <TableHead className="text-right" scope="col">العميل</TableHead>
                      <TableHead className="text-right" scope="col">التاريخ</TableHead>
                      <TableHead className="text-right" scope="col">المبلغ</TableHead>
                      <TableHead className="text-right" scope="col">الحالة</TableHead>
                      <TableHead className="text-center" scope="col">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredInvoices.slice(0, 20).map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-neutral-50">
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedInvoiceIds.includes(invoice.id)}
                          onCheckedChange={() => toggleSelectInvoice(invoice.id)}
                          aria-label={`تحديد الفاتورة ${invoice.invoice_number || ""}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        {invoice.customers?.company_name || 
                         `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`}
                      </TableCell>
                      <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true); }}
                            aria-label="معاينة الفاتورة"
                            title="معاينة الفاتورة"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingInvoice(invoice)}
                            aria-label="تعديل الفاتورة"
                            title="تعديل الفاتورة"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {invoice.payment_status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => { setSelectedInvoice(invoice); setShowPayDialog(true); }}
                              aria-label="دفع الفاتورة"
                              title="دفع الفاتورة"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => { setInvoiceToDelete(invoice); setDeleteDialogOpen(true); }}
                            aria-label="حذف الفاتورة"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <motion.div 
            data-tour="billing-payments-table"
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Treasury Balance Indicator */}
            {treasuryData && (
              <div className="p-4 border-b border-neutral-100">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">رصيد الخزينة الحالي</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(treasuryData.totalBalance || 0)}</p>
                  </div>
                </div>
              </div>
            )}
            
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CreditCard}
                  title="لا توجد مدفوعات"
                  description="لم يتم تسجيل أي مدفوعات بعد"
                  onAction={() => setIsCreatePaymentOpen(true)}
                  actionLabel="تسجيل دفعة"
                />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <Table className="min-w-[600px]" aria-label="جدول المدفوعات">
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="text-right" scope="col">رقم الدفعة</TableHead>
                      <TableHead className="text-right" scope="col">العميل</TableHead>
                      <TableHead className="text-right" scope="col">التاريخ</TableHead>
                      <TableHead className="text-right" scope="col">المبلغ</TableHead>
                      <TableHead className="text-right" scope="col">طريقة الدفع</TableHead>
                      <TableHead className="text-right" scope="col">الحالة</TableHead>
                      <TableHead className="text-center" scope="col">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredPayments.slice(0, 20).map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-neutral-50">
                      <TableCell className="font-medium">{payment.payment_number || '-'}</TableCell>
                      <TableCell>
                        {payment.customers?.company_name || 
                         `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`}
                      </TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method === 'cash' ? 'نقدي' :
                           payment.payment_method === 'card' ? 'بطاقة' :
                           payment.payment_method === 'bank_transfer' ? 'تحويل' :
                           payment.payment_method === 'cheque' ? 'شيك' : payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelectedPayment(payment); setIsPaymentPreviewOpen(true); }}
                            aria-label="عرض"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600"
                            onClick={() => handleSendPaymentVoucher(payment)}
                            aria-label="إرسال عبر واتساب"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          {payment?.payment_status === 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => openCancelPaymentDialog(payment)}
                              aria-label="إلغاء الدفعة"
                              disabled={cancelPayment.isPending}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Deposits Tab */}
        <TabsContent value="deposits">
          <motion.div
            data-tour="billing-deposits-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <Deposits />
            </Suspense>
          </motion.div>
        </TabsContent>

        {/* Monthly Rent Tracking Tab */}
        <TabsContent value="rent">
          <motion.div
            data-tour="billing-rent-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Suspense fallback={<PageSkeletonFallback />}>
              <MonthlyRentTracking />
            </Suspense>
          </motion.div>
        </TabsContent>
      </Tabs>
      </div>

      <style>{`
        .billing-system {
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.94), var(--billing-inner) 320px),
            var(--billing-inner);
          color: var(--billing-text);
        }

        .billing-command,
        .billing-tabs-shell,
        .billing-filter-bar,
        .billing-system [data-state="active"] > .bg-white,
        .billing-system .rounded-xl.shadow-sm {
          border: 1px solid var(--billing-border);
          background: var(--billing-surface);
          border-radius: 8px !important;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .billing-command {
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .billing-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, var(--billing-info), var(--billing-success), var(--billing-focus), var(--billing-alert));
        }

        .billing-command-icon,
        .billing-filter-icon,
        .billing-metric-icon,
        .billing-tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
        }

        .billing-command-icon {
          width: 48px;
          height: 48px;
          color: var(--billing-info);
          background: color-mix(in srgb, var(--billing-info) 12%, white);
          border: 1px solid color-mix(in srgb, var(--billing-info) 24%, white);
        }

        .billing-metric {
          min-height: 132px;
          border: 1px solid var(--billing-border);
          background: var(--billing-inner);
          border-radius: 8px;
          padding: 16px;
        }

        .billing-metric-icon,
        .billing-filter-icon {
          width: 40px;
          height: 40px;
        }

        .billing-workspace {
          display: grid;
          gap: 14px;
        }

        .billing-tabs-shell {
          display: grid;
          grid-template-columns: minmax(220px, 0.75fr) minmax(0, 1.25fr);
          align-items: center;
          gap: 18px;
          padding: 16px;
        }

        .billing-tabs-list {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          height: auto !important;
          gap: 8px;
          border: 1px solid var(--billing-border);
          background: var(--billing-inner) !important;
          border-radius: 8px !important;
          padding: 6px !important;
        }

        .billing-tab-trigger {
          min-height: 64px;
          justify-content: flex-start !important;
          gap: 10px !important;
          border-radius: 8px !important;
          padding: 10px 12px !important;
          color: var(--billing-muted) !important;
          border: 1px solid transparent;
          background: transparent !important;
        }

        .billing-tab-trigger[data-state="active"] {
          background: var(--tab-accent) !important;
          color: white !important;
          box-shadow: none !important;
        }

        .billing-tab-icon {
          width: 36px;
          height: 36px;
          background: color-mix(in srgb, var(--tab-accent) 12%, white);
          color: var(--tab-accent);
        }

        .billing-tab-trigger[data-state="active"] .billing-tab-icon {
          background: rgba(255,255,255,0.18);
          color: white;
        }

        .billing-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          background: color-mix(in srgb, var(--billing-inner) 70%, white);
        }

        .billing-filter-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex: 1;
        }

        .billing-input,
        .billing-system input,
        .billing-system [role="combobox"] {
          min-height: 42px;
          border-radius: 8px !important;
          border-color: var(--billing-border) !important;
          background: var(--billing-inner) !important;
          color: var(--billing-text) !important;
          box-shadow: none !important;
        }

        .billing-system .bg-white,
        .billing-system .dark\\:bg-slate-900 {
          background-color: var(--billing-surface) !important;
        }

        .billing-system .bg-neutral-50,
        .billing-system .bg-slate-50,
        .billing-system .bg-blue-50 {
          background-color: var(--billing-inner) !important;
        }

        .billing-system .rounded-xl,
        .billing-system .rounded-lg,
        .billing-system button,
        .billing-system input,
        .billing-system [role="combobox"] {
          border-radius: 8px !important;
        }

        .billing-system .border,
        .billing-system .border-neutral-100,
        .billing-system .border-blue-200 {
          border-color: var(--billing-border) !important;
        }

        .billing-system table thead tr {
          background: var(--billing-inner) !important;
        }

        .billing-system table th {
          color: var(--billing-muted) !important;
          font-size: 12px;
          font-weight: 900;
        }

        .billing-system table td {
          color: var(--billing-text);
          border-color: var(--billing-border) !important;
        }

        .billing-system table tbody tr:hover {
          background: color-mix(in srgb, var(--billing-info) 5%, white) !important;
        }

        .billing-system .text-slate-900,
        .billing-system .text-neutral-900 {
          color: var(--billing-text) !important;
        }

        .billing-system .text-slate-500,
        .billing-system .text-neutral-500,
        .billing-system .text-neutral-400 {
          color: var(--billing-muted) !important;
        }

        .billing-system .shadow-sm,
        .billing-system .shadow-lg {
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055) !important;
        }

        .billing-system *:focus-visible {
          outline-color: var(--billing-focus) !important;
          --tw-ring-color: var(--billing-focus) !important;
        }

        @media (max-width: 1000px) {
          .billing-tabs-shell,
          .billing-filter-bar {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: stretch;
          }

          .billing-tabs-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .billing-filter-controls {
            justify-content: stretch;
          }
        }

        @media (max-width: 640px) {
          .billing-command {
            padding: 18px;
          }

          .billing-tabs-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Dialogs */}
      {/* Create Invoice Dialog */}
      <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          </DialogHeader>
          <InvoiceFormWizard
            open={isCreateInvoiceOpen}
            onOpenChange={setIsCreateInvoiceOpen}
            type="sales"
            onSuccess={() => {
              setIsCreateInvoiceOpen(false);
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
            }}
            onCancel={() => setIsCreateInvoiceOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-30">
          <span className="text-sm font-medium">{selectedInvoiceIds.length} محدد</span>
          <button onClick={handleBulkExport} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">تصدير</button>
          <button onClick={() => setSelectedInvoiceIds([])} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">إلغاء التحديد</button>
        </div>
      )}

      {/* Create Payment Dialog */}
      <UnifiedPaymentForm
        open={isCreatePaymentOpen}
        onOpenChange={setIsCreatePaymentOpen}
        type="customer_payment"
        onSuccess={() => {
          setIsCreatePaymentOpen(false);
          queryClient.invalidateQueries({ queryKey: ['payments'] });
        }}
        onCancel={() => setIsCreatePaymentOpen(false)}
      />

      {/* Invoice Preview */}
      {selectedInvoice && isPreviewOpen && (
        <InvoicePreviewDialog
          invoice={selectedInvoice}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
        />
      )}

      {/* Invoice Edit */}
      {editingInvoice && (
        <InvoiceEditDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
          onSuccess={() => {
            setEditingInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
          }}
        />
      )}

      {/* Pay Invoice */}
      {selectedInvoice && showPayDialog && (
        <PayInvoiceDialog
          invoice={selectedInvoice}
          open={showPayDialog}
          onOpenChange={setShowPayDialog}
          onSuccess={() => {
            setShowPayDialog(false);
            setSelectedInvoice(null);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
          }}
        />
      )}

      {/* Payment Preview */}
      {selectedPayment && isPaymentPreviewOpen && (
        <PaymentPreviewDialog
          payment={selectedPayment}
          open={isPaymentPreviewOpen}
          onOpenChange={setIsPaymentPreviewOpen}
        />
      )}

      {/* Cancel Payment Confirmation */}
      <AlertDialog open={isCancelPaymentDialogOpen} onOpenChange={setIsCancelPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              تأكيد إلغاء الدفعة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-3">
              <p>هل أنت متأكد من إلغاء هذه الدفعة؟ سيتم تحديث الفاتورة المرتبطة تلقائياً.</p>
              {paymentToCancel && (
                <div className="bg-neutral-50 rounded-lg p-3 text-sm space-y-1">
                  <p><strong>رقم الدفعة:</strong> {paymentToCancel.payment_number || '-'}</p>
                  <p><strong>المبلغ:</strong> {formatCurrency(Number(paymentToCancel.amount) || 0)}</p>
                  <p><strong>التاريخ:</strong> {paymentToCancel.payment_date ? formatDate(paymentToCancel.payment_date) : '-'}</p>
                  <p><strong>الفاتورة:</strong> {paymentToCancel?.invoices?.invoice_number || paymentToCancel?.invoice?.invoice_number || '-'}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">سبب الإلغاء (اختياري)</p>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="اكتب سبب الإلغاء..."
                  rows={2}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelPayment.isPending}>تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelPayment}
              disabled={cancelPayment.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelPayment.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الإلغاء...
                </>
              ) : (
                'تأكيد الإلغاء'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفاتورة رقم {invoiceToDelete?.invoice_number}؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteInvoiceMutation.mutate(invoiceToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingCenter;

