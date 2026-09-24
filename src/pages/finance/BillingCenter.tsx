import { FinanceRegisterPagination } from "@/components/finance/workspace/FinanceRegisterPagination";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
/**
 * مركز الفواتير والمدفوعات الموحد
 * ترقيم صفحات وبحث على الخادم — لا يتم تحميل السجل كاملاً
 */
import { type CSSProperties, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useBillingInvoices, useBillingPayments, useBillingRegisterStats, BILLING_PAGE_SIZE, readAllBillingRegisterRows, type InvoiceRow, type PaymentRow } from "@/hooks/finance/useBillingRegister";
import { useInvoice } from "@/hooks/finance/useInvoices";
import { InvoiceFormWizard } from "@/components/finance/InvoiceFormWizard";
import { InvoicePreviewDialog } from "@/components/finance/InvoicePreviewDialog";
import { InvoiceEditDialog } from "@/components/finance/InvoiceEditDialog";
import { PayInvoiceDialog } from "@/components/finance/PayInvoiceDialog";
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
import { ExportButton } from "@/components/ui/ExportButton";
import { exportToCSV } from "@/utils/exports/csvExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Landmark,
  Loader2,
  Send,
  TrendingUp,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { useTreasurySummary } from "@/hooks/useTreasury";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { usePaymentOperations } from "@/hooks/business/usePaymentOperations";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FeatureTourButton, FeatureTourDialog, type FeatureTourContent } from "@/components/common/FeatureTourGuide";
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
  { id: "invoices", label: "الفواتير", icon: Receipt, accent: billingColors.info },
  { id: "payments", label: "المدفوعات", icon: CreditCard, accent: billingColors.success },
] as const;

const billingFeatureTours = {
  overview: {
    title: "جولة السجل المالي",
    description: "شرح سريع لطريقة إدارة الفواتير والمدفوعات من هذه الصفحة.",
    steps: [
      "ابدأ من المؤشرات العلوية لمعرفة إجمالي الفواتير، المدفوع، المستحق، ومدفوعات الشهر.",
      "استخدم زر فاتورة جديدة لإصدار مطالبة مالية مرتبطة بعميل أو عقد.",
      "استخدم زر تسجيل دفعة عند استلام مبلغ وربطه بالفاتورة أو العميل الصحيح.",
      "استخدم أدوات الصفحة للاستيراد وتسجيل الدفعات ومراجعة الربط المحاسبي.",
      "استخدم البحث والفلترة والتصدير لمراجعة السجلات أو تجهيز ملف متابعة.",
    ],
  },
  filtersExport: {
    title: "جولة البحث والتصدير",
    description: "شرح استخدام البحث والفلاتر والتصدير في مركز الفوترة.",
    steps: [
      "البحث يعمل على الخادم: اكتب رقم فاتورة أو رقم دفعة أو اسم عميل.",
      "فلتر الحالة يساعدك على التركيز على المدفوع، المعلق، الجزئي، أو المتأخر.",
      "زر التصدير يصدر الصفحة الحالية بعد الفلاتر حتى تكون المراجعة مطابقة للعرض.",
      "التنقل بين الصفحات يجلب كل صفحة من الخادم مباشرة دون تحميل السجل كاملاً.",
    ],
  },
  invoiceActions: {
    title: "جولة إجراءات الفاتورة",
    description: "شرح أزرار المعاينة والتعديل والدفع والحذف داخل جدول الفواتير.",
    steps: [
      "زر العين يفتح المعاينة الرسمية للفاتورة قبل الطباعة أو المشاركة.",
      "زر التعديل يفتح بيانات الفاتورة لتصحيح التاريخ أو البنود حسب الصلاحية.",
      "زر الدفع يظهر للفواتير غير المدفوعة ويسجل تحصيلاً مرتبطاً بالفاتورة.",
      "زر الحذف/الإلغاء يستخدم فقط عند الحاجة، وقد يمنع النظام الإلغاء إذا توجد دفعات مكتملة.",
    ],
  },
  paymentActions: {
    title: "جولة إجراءات الدفعة",
    description: "شرح أزرار معاينة الدفعة وإرسال السند وإلغاء الدفعة.",
    steps: [
      "زر العين يعرض تفاصيل سند القبض ومعلومات العميل والفاتورة.",
      "زر الإرسال عبر واتساب يجهز رسالة للعميل تحتوي ملخص سند الدفعة.",
      "زر الإلغاء يظهر للدفعات المكتملة ويعيد تحديث الفاتورة المرتبطة بعد التأكيد.",
      "راجع المبلغ والتاريخ والفاتورة قبل إلغاء أي دفعة لأن الأثر مالي ومحاسبي.",
    ],
  },
  cancelPayment: {
    title: "جولة إلغاء دفعة",
    description: "شرح ما يحدث عند إلغاء دفعة مكتملة.",
    steps: [
      "راجع رقم الدفعة والمبلغ والتاريخ والفاتورة المرتبطة قبل التأكيد.",
      "اكتب سبب الإلغاء إذا كان هناك مبرر تشغيلي أو محاسبي مهم.",
      "عند التأكيد يتم تحديث الدفعة والفاتورة المرتبطة وإعادة احتساب الرصيد.",
      "لا تستخدم الإلغاء لتصحيح بسيط إذا كان الأفضل إنشاء تسوية أو دفعة عكسية حسب سياسة الشركة.",
    ],
  },
  deleteInvoice: {
    title: "جولة حذف أو إلغاء فاتورة",
    description: "شرح ضوابط حذف الفاتورة من مركز الفوترة.",
    steps: [
      "راجع رقم الفاتورة قبل التأكيد حتى لا تلغي مطالبة مالية صحيحة.",
      "الفاتورة المرتبطة بدفعات مكتملة قد يمنع النظام حذفها لحماية الأثر المالي.",
      "إذا كانت الفاتورة خاطئة ولكن عليها دفعات، عالج الدفعات أولاً أو استخدم إجراء تسوية مناسب.",
      "بعد الحذف أو الإلغاء ستتحدث قائمة الفواتير والتقارير المرتبطة.",
    ],
  },
} satisfies Record<string, FeatureTourContent>;

const BillingMetric = ({ title, value, helper, icon: Icon, accent }: {
  title: string;
  value: string;
  helper?: string;
  icon: React.ElementType;
  accent: string;
}) => (
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

const getPaymentMethodLabel = (method: string) => ({
  cash: 'نقدي',
  check: 'شيك',
  cheque: 'شيك',
  bank_transfer: 'تحويل بنكي',
  credit_card: 'بطاقة',
  card: 'بطاقة',
  online_transfer: 'تحويل إلكتروني',
}[method] || method);

// ===== Main Component =====
const BillingCenter = ({ section = "invoices" }: { section?: "invoices" | "payments" }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = section;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false);
  const [isCancelPaymentDialogOpen, setIsCancelPaymentDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  const [activeFeatureTour, setActiveFeatureTour] = useState<FeatureTourContent | null>(null);
  const requestedInvoiceId = searchParams.get("invoice") || "";
  const { data: requestedInvoice } = useInvoice(requestedInvoiceId);

  useEffect(() => {
    if (searchParams.get("action") !== "new-invoice") return;
    setIsCreateInvoiceOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("action");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!requestedInvoiceId || !requestedInvoice) return;

    setSelectedInvoice(requestedInvoice);
    setIsPreviewOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("invoice");
    setSearchParams(nextParams, { replace: true });
  }, [requestedInvoice, requestedInvoiceId, searchParams, setSearchParams]);

  const registerFilters = { search: searchTerm, status: filterStatus, page };

  const invoicesQuery = useBillingInvoices(activeTab === "invoices" ? registerFilters : { search: "", status: "all", page: 1 });
  const paymentsQuery = useBillingPayments(activeTab === "payments" ? registerFilters : { search: "", status: "all", page: 1 });
  const statsQuery = useBillingRegisterStats();
  const { data: treasuryData } = useTreasurySummary();

  const invoices = invoicesQuery.data?.rows || [];
  const invoicesTotal = invoicesQuery.data?.total || 0;
  const payments = paymentsQuery.data?.rows || [];
  const paymentsTotal = paymentsQuery.data?.total || 0;
  const stats = statsQuery.data;

  const refreshRegisters = () => {
    queryClient.invalidateQueries({ queryKey: ['billing-register'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });
  };

  useEffect(() => { setPage(1); }, [searchTerm, filterStatus]);

  const exportInvoiceRows = (rows: typeof invoices, filename: string) => {
    if (!rows.length) { toast.info('لا توجد فواتير للتصدير'); return; }
    exportToCSV(rows.map(inv => ({
      number: inv.invoice_number,
      customer: inv.customers?.company_name || `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`,
      total: inv.total_amount, paid: inv.paid_amount ?? 0, remaining: Math.max(0, inv.total_amount - (inv.paid_amount ?? 0)),
      status: inv.payment_status, date: inv.invoice_date,
    })), filename, { headers: ['رقم الفاتورة', 'العميل', 'الإجمالي', 'المسدّد', 'المتبقي', 'الحالة', 'التاريخ'] });
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!companyId) { toast.error('معرف الشركة غير متوفر'); return; }
    if (isExporting) return;
    setIsExporting(true);
    try {
      if (activeTab === 'payments') {
        const total = paymentsQuery.data?.total || 0;
        if (!total) { toast.info('لا توجد مدفوعات متاحة للتصدير'); return; }
        const rows = (await readAllBillingRegisterRows('payments', companyId, searchTerm, filterStatus)) as PaymentRow[];
        exportToCSV(rows.map(payment => ({
          number: payment.payment_number,
          customer: payment.customers?.company_name || `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`,
          amount: payment.amount, method: getPaymentMethodLabel(payment.payment_method),
          status: payment.payment_status, date: payment.payment_date,
        })), 'payments_export.csv', { headers: ['رقم الدفعة', 'العميل', 'المبلغ', 'الطريقة', 'الحالة', 'التاريخ'] });
        toast.success(`تم تصدير ${rows.length.toLocaleString('ar-QA')} دفعة`);
      } else {
        const total = invoicesQuery.data?.total || 0;
        if (!total) { toast.info('لا توجد فواتير للتصدير'); return; }
        const rows = (await readAllBillingRegisterRows('invoices', companyId, searchTerm, filterStatus)) as InvoiceRow[];
        exportInvoiceRows(rows, 'invoices_export.csv');
        toast.success(`تم تصدير ${rows.length.toLocaleString('ar-QA')} فاتورة`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'فشل تصدير السجل');
    } finally {
      setIsExporting(false);
    }
  };

  const { cancelPayment } = usePaymentOperations();

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!financeAccess.can('finance.invoice.cancel')) {
        throw new Error('ليس لديك صلاحية إلغاء الفواتير المالية');
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, company_id, created_by, status, payment_status')
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

      const cancellationNote = `تم إلغاء الفاتورة من مركز الفوترة بواسطة ${user?.email || user?.id || 'system'} في ${new Date().toISOString()}`;
      const { error } = await (supabase as any).rpc('cancel_invoice_with_reversal', {
        p_invoice_id: invoiceId,
        p_company_id: invoice.company_id,
        p_reason: cancellationNote,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refreshRegisters();
      toast.success('تم إلغاء الفاتورة بنجاح');
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل إلغاء الفاتورة');
    }
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      paid: { label: 'مدفوعة', className: 'bg-[#edf4e6] text-[#487038] border-transparent' },
      unpaid: { label: 'غير مدفوعة', className: 'bg-[#f1f4ec] text-[#5b6b52] border-transparent' },
      pending: { label: 'معلقة', className: 'bg-[#faf5e7] text-[#9b7c36] border-transparent' },
      partial: { label: 'جزئية', className: 'bg-[#e9f1f3] text-[#4a707c] border-transparent' },
      overdue: { label: 'متأخرة', className: 'bg-[#fdf1eb] text-[#b3694c] border-transparent' },
      cancelled: { label: 'ملغاة', className: 'bg-[#f1f4ec] text-[#829074] border-transparent' },
      completed: { label: 'مكتملة', className: 'bg-[#edf4e6] text-[#487038] border-transparent' },
      confirmed: { label: 'مؤكدة', className: 'bg-[#edf4e6] text-[#487038] border-transparent' },
    };
    const config = configs[status] || { label: status, className: 'bg-[#f1f4ec] text-[#5b6b52] border-transparent' };
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
          refreshRegisters();
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
    let phone = payment.customers?.phone || '';

    if (!phone) {
      toast.error('لا يوجد رقم هاتف للعميل');
      return;
    }

    phone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    if (phone.startsWith('0')) {
      phone = '974' + phone.substring(1);
    } else if (!phone.startsWith('+') && !phone.startsWith('974')) {
      phone = '974' + phone;
    }
    phone = phone.replace('+', '');

    const customerName = payment.customers?.company_name ||
      `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`.trim() || 'العميل';

    const paymentMethodAr = getPaymentMethodLabel(payment.payment_method);

    const message = `مرحباً ${customerName}،

تم استلام دفعتكم بنجاح

رقم الإيصال: ${payment.payment_number || '-'}
المبلغ: ${formatCurrency(Number(payment.amount))}
التاريخ: ${formatDate(payment.payment_date)}
طريقة الدفع: ${paymentMethodAr}

شكراً لتعاملكم معنا

شركة العراف لتأجير السيارات`;

    setSelectedPayment(payment);
    setIsPaymentPreviewOpen(true);

    setTimeout(() => {
      toast.info('اضغط على زر الطباعة أو التحميل في نافذة الإيصال، ثم سيتم فتح واتساب');
    }, 500);

    setTimeout(() => {
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }, 1000);
  };

  const activeTabInfo = billingTabs.find((tab) => tab.id === activeTab) || billingTabs[0];
  const tableLoading = activeTab === "invoices" ? invoicesQuery.isLoading : paymentsQuery.isLoading;
  const tableError = activeTab === "invoices" ? invoicesQuery.error : paymentsQuery.error;
  const tableRefetch = activeTab === "invoices" ? invoicesQuery.refetch : paymentsQuery.refetch;
  const registerTotal = activeTab === "invoices" ? invoicesTotal : paymentsTotal;
  const isFetching = activeTab === "invoices" ? invoicesQuery.isFetching : paymentsQuery.isFetching;

  return (
    <div className="billing-system min-h-0" dir="rtl" style={billingStyle}>
      <FinancePageHeader title={section === "invoices" ? "الفواتير" : "المدفوعات"} description={section === "invoices" ? "إصدار الفواتير ومتابعة المستحقات وسداد كل فاتورة." : "سجل الدفعات والإيصالات والتحصيل من العملاء."} icon={section === "invoices" ? Receipt : CreditCard} actions={<>
          <FeatureTourButton tour={billingFeatureTours.overview} onStart={setActiveFeatureTour} className="h-10 gap-2 border-[#dfe5d9] bg-white text-[#2c4136] hover:bg-[#f7f8f4]" />
          {section === "invoices" && <Button className="h-10" onClick={() => setIsCreateInvoiceOpen(true)}><Plus size={16} className="me-2" />فاتورة جديدة</Button>}
          <FinanceContextActions ids={["receive"]} />
        </>}>
          {section === "invoices" && stats && <div data-tour="billing-metrics" className="grid gap-3 sm:grid-cols-3">
            <BillingMetric title="إجمالي الفواتير" value={formatCurrency(stats.invoices_total)} helper={`${stats.invoices_count.toLocaleString('ar-QA')} فاتورة`} icon={Receipt} accent={billingColors.info} />
            <BillingMetric title="المسدّد من الفواتير" value={formatCurrency(stats.invoices_paid)} icon={CheckCircle} accent={billingColors.success} />
            <BillingMetric title="رصيد الفواتير" value={formatCurrency(stats.invoices_pending)} helper="قيد التحصيل" icon={Clock} accent={billingColors.alert} />
          </div>}
          {section === "payments" && stats && <div data-tour="billing-metrics" className="grid gap-3 sm:grid-cols-3">
            <BillingMetric title="مدفوعات الشهر" value={formatCurrency(stats.payments_month_total)} helper={`${stats.payments_month_count.toLocaleString('ar-QA')} دفعة مكتملة`} icon={TrendingUp} accent={billingColors.success} />
            <BillingMetric title="الدفعات المكتملة" value={stats.payments_completed_count.toLocaleString("ar-QA")} helper="في السجل" icon={CheckCircle} accent={billingColors.info} />
            <BillingMetric title="الدفعات المعلقة" value={stats.payments_pending_count.toLocaleString("ar-QA")} helper="بانتظار الإكمال" icon={Clock} accent={billingColors.alert} />
          </div>}
        </FinancePageHeader>

        <div className="billing-workspace">
          <FinanceContextActions ids={section === "invoices" ? ["scanner", "invoice-journal"] : ["excel-import", "register", "payment-tracking", "sync", "cash-receipt"]} />

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
              <FeatureTourButton
                tour={billingFeatureTours.filtersExport}
                onStart={setActiveFeatureTour}
                className="h-10 gap-2 border-[#dfe5d9] bg-white text-[#2c4136] hover:bg-[#f7f8f4]"
              />
              <ExportButton onExportCSV={handleExportCSV} disabled={isExporting} />
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
                  {activeTab === 'payments' ? <><SelectItem value="completed">مكتملة</SelectItem><SelectItem value="pending">معلقة</SelectItem><SelectItem value="cancelled">ملغاة</SelectItem></> : <><SelectItem value="paid">مدفوعة</SelectItem><SelectItem value="unpaid">غير مدفوعة</SelectItem><SelectItem value="partial">جزئية</SelectItem><SelectItem value="overdue">متأخرة</SelectItem><SelectItem value="cancelled">ملغاة</SelectItem></>}
                </SelectContent>
              </Select>
            </div>
          </section>

        {/* Invoices Tab */}
        {section === "invoices" && <section>
          <div data-tour="billing-invoices-table" className="bg-white rounded-xl shadow-sm overflow-hidden relative">
            {isFetching && (
              <span aria-live="polite" className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-[#f7f8f4] px-2.5 py-1.5 text-xs text-[#5b6b52]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                تحديث…
              </span>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5d9] px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#2c4136]">إجراءات الفواتير</p>
                <p className="text-xs text-[#5b6b52]">معاينة، تعديل، دفع، حذف، وتصدير الفواتير</p>
              </div>
              <FeatureTourButton
                tour={billingFeatureTours.invoiceActions}
                onStart={setActiveFeatureTour}
                className="h-9 gap-2 border-[#dfe5d9] bg-white text-[#2c4136] hover:bg-[#f7f8f4]"
              />
            </div>
            {tableError ? (<div role="alert" className="p-5">تعذر تحميل الفواتير. <Button variant="outline" onClick={() => tableRefetch()}>إعادة المحاولة</Button></div>) : tableLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#2f7966]" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  type={searchTerm || filterStatus !== "all" ? "no-filter-results" : "no-data"}
                  title="لا توجد فواتير"
                  description={searchTerm || filterStatus !== "all" ? "لا توجد نتائج مطابقة للبحث أو الفلتر الحالي." : "أنشئ فاتورتك الأولى أو اترك النظام يولدها تلقائياً من العقود"}
                  onAction={() => { setSearchTerm(""); setFilterStatus("all"); }}
                  actionLabel={searchTerm || filterStatus !== "all" ? "مسح الفلاتر" : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <Table className="min-w-[820px]" aria-label="جدول الفواتير">
                  <TableHeader>
                    <TableRow className="bg-[#f7f8f4]">
                      <TableHead className="w-[220px] text-right" scope="col">رقم الفاتورة</TableHead>
                      <TableHead className="w-[200px] text-right" scope="col">العميل</TableHead>
                      <TableHead className="w-[130px] text-right" scope="col">التاريخ</TableHead>
                      <TableHead className="w-[130px] text-right" scope="col">المبلغ</TableHead>
                      <TableHead className="w-[120px] text-right" scope="col">الحالة</TableHead>
                      <TableHead className="w-[180px] text-center" scope="col">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-[#f7f8f4]">
                      <TableCell className="font-medium"><bdi>{invoice.invoice_number}</bdi></TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <bdi>{invoice.customers?.company_name ||
                         `${invoice.customers?.first_name || ''} ${invoice.customers?.last_name || ''}`}</bdi>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(invoice.invoice_date)}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true); }}
                            aria-label="معاينة الفاتورة"
                            title="معاينة الفاتورة"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setEditingInvoice(invoice)}
                            aria-label="تعديل الفاتورة"
                            title="تعديل الفاتورة"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {invoice.payment_status !== 'paid' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#2f7966] hover:text-[#256450]"
                              onClick={() => { setSelectedInvoice(invoice); setShowPayDialog(true); }}
                              aria-label="دفع الفاتورة"
                              title="دفع الفاتورة"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#b3694c] hover:text-[#9a5440]"
                            onClick={() => { setInvoiceToDelete(invoice); setDeleteDialogOpen(true); }}
                            aria-label="حذف الفاتورة"
                            title="حذف الفاتورة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
            {!tableLoading && !tableError && (
              <FinanceRegisterPagination
                page={page}
                pages={Math.max(1, Math.ceil(registerTotal / BILLING_PAGE_SIZE))}
                total={registerTotal}
                setPage={setPage}
              />
            )}
          </div>
        </section>}

        {/* Payments Tab */}
        {section === "payments" && <section>
          {/* Treasury Balance Indicator */}
          {treasuryData && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dfe5d9] bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="billing-filter-icon" style={{ color: billingColors.info, backgroundColor: `${billingColors.info}14` }}>
                  <Landmark className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold" style={{ color: billingColors.muted }}>رصيد الخزينة الحالي</p>
                  <p className="text-lg font-black" style={{ color: billingColors.text }}>{formatCurrency(treasuryData.totalBalance || 0)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1.5" style={{ color: billingColors.muted }}>
                  <TrendingUp className="h-3.5 w-3.5 text-[#487038]" />
                  إيداعات الشهر: <strong className="font-black" style={{ color: billingColors.text }}>{formatCurrency(treasuryData.monthlyDeposits || 0)}</strong>
                </span>
                <span className="flex items-center gap-1.5" style={{ color: billingColors.muted }}>
                  <TrendingDown className="h-3.5 w-3.5 text-[#b3694c]" />
                  سحوبات الشهر: <strong className="font-black" style={{ color: billingColors.text }}>{formatCurrency(treasuryData.monthlyWithdrawals || 0)}</strong>
                </span>
              </div>
            </div>
          )}
          <div data-tour="billing-payments-table" className="bg-white rounded-xl shadow-sm overflow-hidden relative">
            {isFetching && (
              <span aria-live="polite" className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-[#f7f8f4] px-2.5 py-1.5 text-xs text-[#5b6b52]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                تحديث…
              </span>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe5d9] px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#2c4136]">إجراءات المدفوعات</p>
                <p className="text-xs text-[#5b6b52]">معاينة سند القبض، إرساله، أو إلغاء الدفعة</p>
              </div>
              <FeatureTourButton
                tour={billingFeatureTours.paymentActions}
                onStart={setActiveFeatureTour}
                className="h-9 gap-2 border-[#dfe5d9] bg-white text-[#2c4136] hover:bg-[#f7f8f4]"
              />
            </div>
            {tableError ? (
              <div role="alert" className="flex flex-col items-start gap-3 p-5">
                <p className="font-semibold text-destructive">تعذر تحميل المدفوعات — مشكلة اتصال/صلاحيات وليست غياب بيانات.</p>
                <p className="text-sm text-muted-foreground">{tableError instanceof Error ? tableError.message : 'خطأ غير معروف'}</p>
                <Button variant="outline" onClick={() => tableRefetch()}>إعادة المحاولة</Button>
              </div>
            ) : tableLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#2f7966]" />
                <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل المدفوعات…</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CreditCard}
                  type={searchTerm || filterStatus !== "all" ? "no-filter-results" : "no-data"}
                  title="لا توجد مدفوعات"
                  description={searchTerm || filterStatus !== "all" ? "لا توجد نتائج مطابقة للبحث أو الفلتر الحالي." : "لم يتم تسجيل أي مدفوعات بعد — أو أن الفلاتر الحالية لا تطابق شيئًا"}
                  onAction={() => { setSearchTerm(""); setFilterStatus("all"); }}
                  actionLabel={searchTerm || filterStatus !== "all" ? "مسح الفلاتر" : undefined}
                  secondaryActionLabel={searchTerm || filterStatus !== "all" ? undefined : "تسجيل دفعة"}
                  onSecondaryAction={searchTerm || filterStatus !== "all" ? undefined : () => navigate("/finance/operations/receive-payment")}
                />
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <Table className="min-w-[900px]" aria-label="جدول المدفوعات">
                  <TableHeader>
                    <TableRow className="bg-[#f7f8f4]">
                      <TableHead className="w-[180px] text-right" scope="col">رقم الدفعة</TableHead>
                      <TableHead className="w-[200px] text-right" scope="col">العميل</TableHead>
                      <TableHead className="w-[130px] text-right" scope="col">التاريخ</TableHead>
                      <TableHead className="w-[130px] text-right" scope="col">المبلغ</TableHead>
                      <TableHead className="w-[130px] text-right" scope="col">الفاتورة</TableHead>
                      <TableHead className="w-[140px] text-right" scope="col">طريقة الدفع</TableHead>
                      <TableHead className="w-[120px] text-right" scope="col">الحالة</TableHead>
                      <TableHead className="w-[150px] text-center" scope="col">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-[#f7f8f4]">
                      <TableCell className="font-medium"><bdi>{payment.payment_number || '-'}</bdi></TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <bdi>{payment.customers?.company_name ||
                         `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`}</bdi>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(payment.payment_date)}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-[#2f7966]">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[#5b6b52]">
                        <bdi>{payment.invoices?.invoice_number || <span style={{ color: billingColors.muted }}>بدون فاتورة</span>}</bdi>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#dfe5d9] text-[#5b6b52]">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => { setSelectedPayment(payment); setIsPaymentPreviewOpen(true); }}
                            aria-label="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#2f7966] hover:text-[#256450]"
                            onClick={() => handleSendPaymentVoucher(payment)}
                            aria-label="إرسال عبر واتساب"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          {payment?.payment_status === 'completed' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#b3694c] hover:text-[#9a5440]"
                              onClick={() => openCancelPaymentDialog(payment)}
                              aria-label="إلغاء الدفعة"
                              disabled={cancelPayment.isPending}
                            >
                              <XCircle className="h-4 w-4" />
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
            {!tableLoading && !tableError && (
              <FinanceRegisterPagination
                page={page}
                pages={Math.max(1, Math.ceil(registerTotal / BILLING_PAGE_SIZE))}
                total={registerTotal}
                setPage={setPage}
              />
            )}
          </div>
        </section>}
      </div>

      <style>{`
        .billing-system {
          color: var(--billing-text);
        }

        .billing-filter-bar,
        .billing-system .rounded-xl.shadow-sm {
          border: 1px solid var(--billing-border);
          background: var(--billing-surface);
          border-radius: 8px !important;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .billing-filter-icon,
        .billing-metric-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 8px;
          width: 40px;
          height: 40px;
        }

        .billing-workspace {
          display: grid;
          gap: 14px;
        }

        .billing-metric {
          min-height: 132px;
          border: 1px solid var(--billing-border);
          background: var(--billing-inner);
          border-radius: 8px;
          padding: 16px;
        }

        .billing-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
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

        .billing-system *:focus-visible {
          outline-color: var(--billing-focus) !important;
          --tw-ring-color: var(--billing-focus) !important;
        }

        @media (max-width: 1000px) {
          .billing-filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .billing-filter-controls {
            justify-content: stretch;
          }
        }
      `}</style>

      {/* Dialogs */}
      {/* Create Invoice Dialog */}
      <InvoiceFormWizard
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        type="sales"
        onSuccess={() => {
          refreshRegisters();
        }}
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
          onSave={() => {
            setEditingInvoice(null);
            refreshRegisters();
          }}
        />
      )}

      {/* Pay Invoice */}
      {selectedInvoice && showPayDialog && (
        <PayInvoiceDialog
          invoice={selectedInvoice}
          open={showPayDialog}
          onOpenChange={setShowPayDialog}
          onPaymentCreated={() => {
            setShowPayDialog(false);
            setSelectedInvoice(null);
            refreshRegisters();
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
            <div className="flex items-start justify-between gap-3">
              <AlertDialogTitle className="flex items-center gap-2 text-[#b3694c]">
                <XCircle className="w-5 h-5" />
                تأكيد إلغاء الدفعة
              </AlertDialogTitle>
              <FeatureTourButton tour={billingFeatureTours.cancelPayment} onStart={setActiveFeatureTour} />
            </div>
            <AlertDialogDescription className="text-right space-y-3">
              <p>هل أنت متأكد من إلغاء هذه الدفعة؟ سيتم تحديث الفاتورة المرتبطة تلقائياً.</p>
              {paymentToCancel && (
                <div className="bg-[#f7f8f4] rounded-lg p-3 text-sm space-y-1">
                  <p><strong>رقم الدفعة:</strong> {paymentToCancel.payment_number || '-'}</p>
                  <p><strong>المبلغ:</strong> {formatCurrency(Number(paymentToCancel.amount) || 0)}</p>
                  <p><strong>التاريخ:</strong> {paymentToCancel.payment_date ? formatDate(paymentToCancel.payment_date) : '-'}</p>
                  <p><strong>الفاتورة:</strong> {paymentToCancel?.invoices?.invoice_number || '-'}</p>
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
              className="bg-[#b3694c] hover:bg-[#9a5440]"
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
            <div className="flex items-start justify-between gap-3">
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <FeatureTourButton tour={billingFeatureTours.deleteInvoice} onStart={setActiveFeatureTour} />
            </div>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفاتورة رقم {invoiceToDelete?.invoice_number}؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteInvoiceMutation.mutate(invoiceToDelete.id)}
              className="bg-[#b3694c] hover:bg-[#9a5440]"
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
      <FeatureTourDialog tour={activeFeatureTour} onOpenChange={(open) => !open && setActiveFeatureTour(null)} />
    </div>
  );
};

export default BillingCenter;