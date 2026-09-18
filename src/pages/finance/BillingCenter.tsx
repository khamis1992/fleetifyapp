import { FinanceRegisterPagination } from "@/components/finance/workspace/FinanceRegisterPagination";
import { useFinanceRegisterPage } from "@/components/finance/workspace/useFinanceRegisterPage";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { financeToday } from "@/services/financialReporting";
import { FinancePageHeader } from "@/components/ui/FinancePageHeader";
import { FinanceContextActions } from "@/components/finance/workspace/FinanceContextActions";
/**
 * مركز الفواتير والمدفوعات الموحد
 * تصميم بسيط ومتوافق مع الداشبورد
 * يشمل: الفواتير + المدفوعات + الودائع + الإيجارات
 */
import { type CSSProperties, useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useInvoice, useInvoices } from "@/hooks/finance/useInvoices";
import { usePayments } from "@/hooks/useFinance";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useTreasurySummary } from "@/hooks/useTreasury";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  FileSpreadsheet,
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
  Loader2,
  Send,
  TrendingUp,
  Brain,
} from "lucide-react";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { usePaymentOperations } from "@/hooks/business/usePaymentOperations";
import { useAuth } from "@/contexts/AuthContext";
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
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
];

const billingFeatureTours = {
  aiCollections: {
    title: "جولة التحصيل الذكي والفوترة",
    description: "شرح سريع لطريقة استخدام التحليل الذكي لترتيب التحصيل ومراجعة مخاطر الفواتير.",
    steps: [
      "ابدأ من مؤشرات التوقع لمعرفة المبلغ المتوقع تحصيله خلال 7 أيام و30 يومًا.",
      "راجع قائمة أولوية التحصيل؛ العملاء مرتبون حسب المبلغ، التأخير، التكرار، نقص الفواتير، وتجاوز العقد.",
      "افتح سبب التصنيف لكل عميل لمعرفة لماذا اعتبره النظام عالي الخطورة أو حرجًا.",
      "استخدم نسخ الرسالة أو زر واتساب لإرسال مطالبة مخصصة للعميل حسب حالته.",
      "راجع تنبيهات الفوترة قبل الاعتماد حتى لا تمر فاتورة ناقصة أو مكررة أو دفعة تتجاوز قيمة العقد.",
    ],
  },
  overview: {
    title: "جولة السجل المالي",
    description: "شرح سريع لطريقة إدارة الفواتير والمدفوعات من هذه الصفحة.",
    steps: [
      "ابدأ من المؤشرات العلوية لمعرفة إجمالي الفواتير، المدفوع، المستحق، ومدفوعات الشهر.",
      "استخدم زر فاتورة جديدة لإصدار مطالبة مالية مرتبطة بعميل أو عقد.",
      "استخدم زر تسجيل دفعة عند استلام مبلغ وربطه بالفاتورة أو العميل الصحيح.",
      "استخدم القائمة الجانبية لفتح السجلات الأخرى، وأدوات الصفحة للاستيراد ومراجعة الربط.",
      "استخدم البحث والفلترة والتصدير لمراجعة السجلات أو تجهيز ملف متابعة.",
    ],
  },
  createInvoice: {
    title: "جولة إنشاء فاتورة",
    description: "شرح طريقة إصدار فاتورة جديدة من مركز الفوترة.",
    steps: [
      "اختر العميل أو العقد المرتبط بالفاتورة حتى تظهر في ملف العميل والعقد بشكل صحيح.",
      "حدد تاريخ الفاتورة وتاريخ الاستحقاق وحساب الإيراد أو مركز التكلفة عند الحاجة.",
      "أضف بنود الفاتورة مع الكمية والسعر والضريبة أو الخصم إن وجدت.",
      "راجع الإجمالي قبل الحفظ لأن الفاتورة ستدخل في التقارير والتحصيل.",
      "بعد الحفظ ستظهر الفاتورة في جدول الفواتير ويمكن دفعها أو معاينتها.",
    ],
  },
  createPayment: {
    title: "جولة تسجيل دفعة",
    description: "شرح طريقة تسجيل دفعة وربطها بالفاتورة أو العميل.",
    steps: [
      "اختر العميل أو الفاتورة أو العقد الذي تخصه الدفعة.",
      "أدخل مبلغ الدفعة وتاريخها وطريقة الدفع ورقم المرجع إن وجد.",
      "اختر الحساب أو البنك ومركز التكلفة حسب سياسة الشركة المالية.",
      "راجع المعاينة المحاسبية إن ظهرت للتأكد من أثر الدفعة على القيود والخزينة.",
      "بعد الحفظ ستظهر الدفعة في جدول المدفوعات وتحدث رصيد الفاتورة المرتبطة.",
    ],
  },
  filtersExport: {
    title: "جولة البحث والتصدير",
    description: "شرح استخدام البحث والفلاتر والتصدير في مركز الفوترة.",
    steps: [
      "استخدم البحث للوصول بسرعة إلى رقم فاتورة، رقم دفعة، أو اسم عميل.",
      "فلتر الحالة يساعدك على التركيز على المدفوع، المعلق، الجزئي، أو المتأخر.",
      "زر التصدير يصدر السجلات حسب العرض الحالي حتى تكون المراجعة مطابقة للفلاتر.",
      "عند تحديد فواتير من الجدول يظهر شريط إجراءات جماعية لتصدير المحدد أو إلغاء التحديد.",
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
  deposits: {
    title: "جولة الودائع",
    description: "شرح تبويب ودائع العملاء داخل مركز الفوترة.",
    steps: [
      "الوديعة هي ضمان مالي منفصل عن الإيراد العادي ولا تعامل كدفعة إيجار.",
      "استخدم إضافة وديعة لتسجيل العميل والمبلغ وحالة الوديعة.",
      "راجع الودائع النشطة والمرتجعة والجزئية من الفلاتر داخل التبويب.",
      "عند إرجاع أو تعديل وديعة تأكد من أن الأثر المالي مطابق لسياسة الشركة.",
    ],
  },
  excelImport: {
    title: "جولة استيراد دفعات إكسل",
    description: "شرح استخدام تبويب استيراد الدفعات التاريخية.",
    steps: [
      "اختر ملف إكسل يحتوي الدفعات الشهرية أو السجلات التاريخية.",
      "راجع قراءة الأعمدة والعميل واللوحة والعقد قبل الاعتماد.",
      "صحح الصفوف أو القيم غير الواضحة قبل إنشاء الفواتير أو الدفعات.",
      "بعد الاعتماد يتم إنشاء أو ربط الدفعات والفواتير حسب البيانات المطابقة.",
    ],
  },
  rent: {
    title: "جولة الإيجارات الشهرية",
    description: "شرح متابعة الاستحقاقات الشهرية من تبويب الإيجارات.",
    steps: [
      "يعرض التبويب متابعة الاستحقاقات الشهرية المرتبطة بالعقود.",
      "استخدمه لمعرفة الأشهر المدفوعة والمتأخرة والمتبقية لكل عقد.",
      "اربط المتابعة بالفواتير والمدفوعات حتى تبقى الأرصدة دقيقة.",
      "راجع العقود الطويلة بانتظام لأن الفواتير الشهرية تتكرر طوال مدة العقد.",
    ],
  },
} satisfies Record<string, FeatureTourContent>;

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
  const financeAccess = useFinanceAccessGuard();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = section;
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
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false);
  const [isCancelPaymentDialogOpen, setIsCancelPaymentDialogOpen] = useState(false);
  const [paymentToCancel, setPaymentToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
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

  const exportInvoiceRows = (rows: typeof invoices, filename: string) => {
    if (!rows.length) { toast.info('لا توجد فواتير للتصدير'); return; }
    exportToCSV(rows.map(inv => ({
      number: inv.invoice_number,
      customer: inv.customers?.company_name || `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`,
      total: inv.total_amount, paid: inv.paid_amount ?? 0, remaining: Math.max(0, inv.total_amount - (inv.paid_amount ?? 0)),
      status: inv.payment_status, date: inv.invoice_date,
    })), filename, { headers: ['رقم الفاتورة', 'العميل', 'الإجمالي', 'المسدّد', 'المتبقي', 'الحالة', 'التاريخ'] });
  };

  const handleExportCSV = () => {
    if (activeTab === 'payments') {
      if (!filteredPayments.length || paymentsError) { toast.info('لا توجد مدفوعات متاحة للتصدير'); return; }
      exportToCSV(filteredPayments.map(payment => ({
        number: payment.payment_number,
        customer: payment.customers?.company_name || `${payment.customers?.first_name || ''} ${payment.customers?.last_name || ''}`,
        amount: payment.amount, method: getPaymentMethodLabel(payment.payment_method),
        status: payment.payment_status, date: payment.payment_date,
      })), 'payments_export.csv', { headers: ['رقم الدفعة', 'العميل', 'المبلغ', 'الطريقة', 'الحالة', 'التاريخ'] });
    } else if (!invoicesError) exportInvoiceRows(filteredInvoices, 'invoices_export.csv');
  };

  const toggleSelectAll = () => {
    const pageIds = invoicePage.rows.map(inv => inv.id);
    setSelectedInvoiceIds(previous => pageIds.every(id => previous.includes(id))
      ? previous.filter(id => !pageIds.includes(id))
      : [...new Set([...previous, ...pageIds])]);
  };

  const toggleSelectInvoice = (invoiceId: string) => {
    if (selectedInvoiceIds.includes(invoiceId)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== invoiceId));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, invoiceId]);
    }
  };

  const handleBulkExport = () => {
    if (invoicesError) return;
    exportInvoiceRows(invoices.filter(inv => selectedInvoiceIds.includes(inv.id)), 'selected_invoices.csv');
    setSelectedInvoiceIds([]);
  };

  const { cancelPayment } = usePaymentOperations();

  // Data fetching
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useInvoices({ allPages: true });
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = usePayments();
  const { companyId } = useUnifiedCompanyAccess();
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
    const month = financeToday().slice(0,7);
    const activeInvoices = invoices.filter(invoice => invoice.status !== 'cancelled' && invoice.currency === 'QAR');
    const currentMonthPayments = payments.filter(payment => payment.payment_status === 'completed' && payment.payment_date?.slice(0,7) === month);
    return {
      totalInvoices: activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
      paidInvoices: activeInvoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0),
      pendingInvoices: activeInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0),
      invoiceCount: activeInvoices.length,
      currentMonthPayments: currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      currentMonthPaymentsCount: currentMonthPayments.length,
      completedPaymentCount: payments.filter(payment => payment.payment_status === "completed").length,
      pendingPaymentCount: payments.filter(payment => payment.payment_status === "pending").length,
    };
  }, [invoices, payments]);

  // Filtered data
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv?.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv?.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) || inv?.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || (filterStatus === "overdue" ? inv.status === "overdue" : inv?.payment_status === filterStatus);
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  const filteredPayments = useMemo(() => {
    return payments.filter(pmt => {
      const matchesSearch = pmt?.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pmt?.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || pmt?.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) || pmt?.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || pmt?.payment_status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchTerm, filterStatus]);

  const invoicePage = useFinanceRegisterPage(filteredInvoices, `${companyId}:${searchTerm}:${filterStatus}`);
  const paymentPage = useFinanceRegisterPage(filteredPayments, `${companyId}:${searchTerm}:${filterStatus}`);
  useEffect(() => { setFilterStatus('all'); }, [activeTab]);
  useEffect(() => { setSelectedInvoiceIds([]); setSelectedInvoice(null); setSelectedPayment(null); }, [companyId, searchTerm, filterStatus]);

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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إلغاء الفاتورة بنجاح');
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل إلغاء الفاتورة');
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
    const paymentMethodAr = getPaymentMethodLabel(payment.payment_method);

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
        <FinancePageHeader title={section === "invoices" ? "الفواتير" : "المدفوعات"} description={section === "invoices" ? "إصدار الفواتير ومتابعة المستحقات وسداد كل فاتورة." : "سجل الدفعات والإيصالات والتحصيل من العملاء."} icon={section === "invoices" ? Receipt : CreditCard} actions={<>
          <FeatureTourButton tour={billingFeatureTours.overview} onStart={setActiveFeatureTour} />
          {section === "invoices" && <Button onClick={() => setIsCreateInvoiceOpen(true)}><Plus size={16} className="me-2" />فاتورة جديدة</Button>}
          <FinanceContextActions ids={["receive"]} />
        </>}>
          {section === "invoices" && !invoicesError && !invoicesLoading && <div data-tour="billing-metrics" className="grid gap-3 sm:grid-cols-3">
            <BillingMetric title="إجمالي الفواتير" value={formatCurrency(stats.totalInvoices)} helper={`${stats.invoiceCount} فاتورة`} icon={Receipt} accent={billingColors.info} />
            <BillingMetric title="المسدّد من الفواتير" value={formatCurrency(stats.paidInvoices)} icon={CheckCircle} accent={billingColors.success} />
            <BillingMetric title="رصيد الفواتير" value={formatCurrency(stats.pendingInvoices)} helper="قيد التحصيل" icon={Clock} accent={billingColors.alert} />
          </div>}
          {section === "payments" && !paymentsError && !paymentsLoading && <div data-tour="billing-metrics" className="grid gap-3 sm:grid-cols-3">
            <BillingMetric title="مدفوعات الشهر" value={formatCurrency(stats.currentMonthPayments)} helper={`${stats.currentMonthPaymentsCount} دفعة مكتملة`} icon={TrendingUp} accent={billingColors.success} />
            <BillingMetric title="الدفعات المكتملة" value={stats.completedPaymentCount.toLocaleString("ar-QA")} helper="في السجل" icon={CheckCircle} accent={billingColors.info} />
            <BillingMetric title="الدفعات المعلقة" value={stats.pendingPaymentCount.toLocaleString("ar-QA")} helper="بانتظار الإكمال" icon={Clock} accent={billingColors.alert} />
          </div>}
        </FinancePageHeader>

        <div className="billing-workspace">
          <FinanceContextActions ids={section === "invoices" ? ["scanner", "invoice-journal"] : ["excel-import", "register", "payment-tracking", "sync", "cash-receipt"]} />

          {["invoices", "payments"].includes(activeTab) && <section data-tour="billing-filters" className="billing-filter-bar">
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
                className="h-10 gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              />
              <ExportButton onExportCSV={handleExportCSV} />
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
          </section>}

        {/* AI Collections Tab */}

        {/* Invoices Tab */}
        {section === "invoices" && <section>
          <motion.div 
            data-tour="billing-invoices-table"
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#020617]">إجراءات الفواتير</p>
                <p className="text-xs text-[#64748B]">معاينة، تعديل، دفع، حذف، وتصدير الفواتير</p>
              </div>
              <FeatureTourButton
                tour={billingFeatureTours.invoiceActions}
                onStart={setActiveFeatureTour}
                className="h-9 gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              />
            </div>
            {invoicesError ? (<div role="alert" className="p-5">تعذر تحميل الفواتير. <Button variant="outline" onClick={() => refetchInvoices()}>إعادة المحاولة</Button></div>) : invoicesLoading ? (
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
                          checked={invoicePage.rows.length > 0 && invoicePage.rows.every(invoice => selectedInvoiceIds.includes(invoice.id))}
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
                  {invoicePage.rows.map((invoice) => (
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
          <FinanceRegisterPagination {...invoicePage} />
          </motion.div>
        </section>}

        {/* Payments Tab */}
        {section === "payments" && <section>
          <motion.div 
            data-tour="billing-payments-table"
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#020617]">إجراءات المدفوعات</p>
                <p className="text-xs text-[#64748B]">معاينة سند القبض، إرساله، أو إلغاء الدفعة</p>
              </div>
              <FeatureTourButton
                tour={billingFeatureTours.paymentActions}
                onStart={setActiveFeatureTour}
                className="h-9 gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              />
            </div>
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
            
            {paymentsError ? (<div role="alert" className="p-5">تعذر تحميل المدفوعات. <Button variant="outline" onClick={() => refetchPayments()}>إعادة المحاولة</Button></div>) : paymentsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={CreditCard}
                  title="لا توجد مدفوعات"
                  description="لم يتم تسجيل أي مدفوعات بعد"
                  onAction={() => navigate("/finance/operations/receive-payment")}
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
                  {paymentPage.rows.map((payment) => (
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
                          {getPaymentMethodLabel(payment.payment_method)}
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
          <FinanceRegisterPagination {...paymentPage} />
          </motion.div>
        </section>}

        {/* Deposits Tab */}

        {/* Historical Excel Payments Import Tab */}

        {/* Monthly Rent Tracking Tab */}
      </div>
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
          grid-template-columns: minmax(170px, 0.45fr) minmax(0, 1.55fr);
          align-items: center;
          gap: 14px;
          padding: 16px;
        }

        .billing-tabs-list {
          display: grid !important;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          height: auto !important;
          gap: 6px;
          border: 1px solid var(--billing-border);
          background: var(--billing-inner) !important;
          border-radius: 8px !important;
          padding: 6px !important;
        }

        .billing-tab-trigger {
          min-height: 62px;
          justify-content: flex-start !important;
          gap: 8px !important;
          border-radius: 8px !important;
          padding: 9px 10px !important;
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
          width: 34px;
          height: 34px;
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
      <InvoiceFormWizard
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        type="sales"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        }}
      />

      {/* Bulk Actions Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-30">
          <span className="text-sm font-medium">{selectedInvoiceIds.length} محدد</span>
          <button onClick={() => setActiveFeatureTour(billingFeatureTours.filtersExport)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">جولة</button>
          <button onClick={handleBulkExport} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">تصدير</button>
          <button onClick={() => setSelectedInvoiceIds([])} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">إلغاء التحديد</button>
        </div>
      )}

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
          onPaymentCreated={() => {
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
            <div className="flex items-start justify-between gap-3">
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                تأكيد إلغاء الدفعة
              </AlertDialogTitle>
              <FeatureTourButton tour={billingFeatureTours.cancelPayment} onStart={setActiveFeatureTour} />
            </div>
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
      <FeatureTourDialog tour={activeFeatureTour} onOpenChange={(open) => !open && setActiveFeatureTour(null)} />
    </div>
  );
};

export default BillingCenter;

