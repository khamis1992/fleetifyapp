import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Copy,
  FileWarning,
  MessageSquare,
  Phone,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  customer_id: string | null;
  contract_id: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance_due: number | null;
  payment_status: string | null;
  status: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    phone?: string | null;
    mobile?: string | null;
  } | null;
  contracts?: {
    id: string;
    contract_number?: string | null;
    contract_amount?: number | null;
    total_paid?: number | null;
    balance_due?: number | null;
    status?: string | null;
  } | null;
};

type ContractRow = {
  id: string;
  contract_number: string | null;
  customer_id: string | null;
  contract_amount: number | null;
  monthly_amount: number | null;
  total_paid: number | null;
  balance_due: number | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  customers?: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    phone?: string | null;
    mobile?: string | null;
  } | null;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  payment_date: string | null;
  payment_status: string | null;
  customer_id: string | null;
  contract_id: string | null;
};

type CustomerRisk = {
  customerId: string;
  name: string;
  phone: string;
  outstanding: number;
  overdueAmount: number;
  invoiceCount: number;
  maxDaysOverdue: number;
  duplicateCount: number;
  missingInvoiceCount: number;
  overContractAmount: number;
  lastPaymentDate: string | null;
  score: number;
  riskLabel: string;
  riskClassName: string;
  reason: string;
  whatsappMessage: string;
  expected7Days: number;
  expected30Days: number;
};

type BillingAIIssue = {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
};

const numberValue = (value: unknown) => Number(value || 0);

const daysBetween = (from?: string | null, to = new Date()) => {
  if (!from) return 0;
  const date = new Date(from);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((to.getTime() - date.getTime()) / 86400000));
};

const customerName = (customer?: InvoiceRow["customers"] | ContractRow["customers"]) => {
  if (!customer) return "عميل غير محدد";
  return (
    customer.company_name ||
    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
    "عميل غير محدد"
  );
};

const customerPhone = (customer?: InvoiceRow["customers"] | ContractRow["customers"]) =>
  customer?.mobile || customer?.phone || "";

const normalizeWhatsAppPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("974")) return digits;
  if (digits.length === 8) return `974${digits}`;
  return digits;
};

const issueClassName = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const buildWhatsappMessage = (risk: {
  name: string;
  outstanding: number;
  maxDaysOverdue: number;
  duplicateCount: number;
  missingInvoiceCount: number;
  formatCurrency: (value: number) => string;
}) => {
  const qualityNote =
    risk.duplicateCount > 0 || risk.missingInvoiceCount > 0
      ? "سنراجع كذلك أي تفاصيل مرتبطة بالفواتير لضمان دقة المطالبة."
      : "يمكنكم إرسال إشعار السداد بعد التحويل ليتم تحديث حسابكم مباشرة.";

  return `مرحبًا ${risk.name}، نود تذكيركم بوجود مبلغ مستحق قدره ${risk.formatCurrency(
    risk.outstanding
  )} متأخر منذ ${risk.maxDaysOverdue} يوم. يرجى السداد أو التواصل معنا لترتيب موعد دفع مناسب. ${qualityNote}`;
};

export const BillingAIAssistant = () => {
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  const { data, isLoading } = useQuery({
    queryKey: ["billing-ai-assistant", companyId],
    enabled: !!companyId && !isInitializing,
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      const [invoicesResult, contractsResult, paymentsResult] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            `
            id, invoice_number, invoice_date, due_date, customer_id, contract_id,
            total_amount, paid_amount, balance_due, payment_status, status,
            customers:customer_id(first_name,last_name,company_name,phone,mobile),
            contracts:contract_id(id,contract_number,contract_amount,total_paid,balance_due,status)
          `
          )
          .eq("company_id", companyId)
          .neq("payment_status", "paid")
          .neq("payment_status", "cancelled")
          .order("due_date", { ascending: true })
          .limit(400),
        supabase
          .from("contracts")
          .select(
            `
            id, contract_number, customer_id, contract_amount, monthly_amount,
            total_paid, balance_due, status, start_date, end_date,
            customers:customer_id(first_name,last_name,company_name,phone,mobile)
          `
          )
          .eq("company_id", companyId)
          .in("status", ["active", "under_legal_procedure", "pending"])
          .limit(500),
        supabase
          .from("payments")
          .select("id, amount, payment_date, payment_status, customer_id, contract_id")
          .eq("company_id", companyId)
          .eq("payment_status", "completed")
          .order("payment_date", { ascending: false })
          .limit(700),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;
      if (contractsResult.error) throw contractsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      return {
        invoices: (invoicesResult.data || []) as InvoiceRow[],
        contracts: (contractsResult.data || []) as ContractRow[],
        payments: (paymentsResult.data || []) as PaymentRow[],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const analysis = useMemo(() => {
    const invoices = data?.invoices || [];
    const contracts = data?.contracts || [];
    const payments = data?.payments || [];
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const invoiceDuplicates = new Map<string, InvoiceRow[]>();
    for (const invoice of invoices) {
      const key = [
        invoice.customer_id || "none",
        invoice.contract_id || "none",
        invoice.invoice_date?.slice(0, 10) || "no-date",
        numberValue(invoice.total_amount).toFixed(2),
      ].join("|");
      const bucket = invoiceDuplicates.get(key) || [];
      bucket.push(invoice);
      invoiceDuplicates.set(key, bucket);
    }

    const duplicateInvoiceIds = new Set<string>();
    for (const bucket of invoiceDuplicates.values()) {
      if (bucket.length > 1) {
        bucket.forEach((invoice) => duplicateInvoiceIds.add(invoice.id));
      }
    }

    const invoicesByContractMonth = new Set(
      invoices
        .filter((invoice) => invoice.contract_id && invoice.invoice_date)
        .map((invoice) => `${invoice.contract_id}|${invoice.invoice_date!.slice(0, 7)}`)
    );

    const missingContracts = contracts.filter((contract) => {
      const monthlyAmount = numberValue(contract.monthly_amount);
      if (monthlyAmount <= 0) return false;
      if (!["active", "under_legal_procedure"].includes(contract.status || "")) return false;
      return !invoicesByContractMonth.has(`${contract.id}|${currentMonthKey}`);
    });

    const lastPaymentByCustomer = new Map<string, string>();
    for (const payment of payments) {
      if (!payment.customer_id || !payment.payment_date) continue;
      const current = lastPaymentByCustomer.get(payment.customer_id);
      if (!current || new Date(payment.payment_date) > new Date(current)) {
        lastPaymentByCustomer.set(payment.customer_id, payment.payment_date);
      }
    }

    const customerMap = new Map<string, CustomerRisk>();
    const ensureCustomer = (
      customerId: string,
      customer: InvoiceRow["customers"] | ContractRow["customers"]
    ) => {
      const existing = customerMap.get(customerId);
      if (existing) return existing;
      const item: CustomerRisk = {
        customerId,
        name: customerName(customer),
        phone: customerPhone(customer),
        outstanding: 0,
        overdueAmount: 0,
        invoiceCount: 0,
        maxDaysOverdue: 0,
        duplicateCount: 0,
        missingInvoiceCount: 0,
        overContractAmount: 0,
        lastPaymentDate: lastPaymentByCustomer.get(customerId) || null,
        score: 0,
        riskLabel: "منخفض",
        riskClassName: "bg-emerald-50 text-emerald-700 border-emerald-200",
        reason: "",
        whatsappMessage: "",
        expected7Days: 0,
        expected30Days: 0,
      };
      customerMap.set(customerId, item);
      return item;
    };

    for (const invoice of invoices) {
      if (!invoice.customer_id) continue;
      const item = ensureCustomer(invoice.customer_id, invoice.customers);
      const balance = numberValue(invoice.balance_due);
      const overdueDays = invoice.due_date ? daysBetween(invoice.due_date, now) : 0;
      const isOverdue = overdueDays > 0 || invoice.status === "overdue";

      item.outstanding += balance;
      item.invoiceCount += 1;
      item.maxDaysOverdue = Math.max(item.maxDaysOverdue, overdueDays);
      if (isOverdue) item.overdueAmount += balance;
      if (duplicateInvoiceIds.has(invoice.id)) item.duplicateCount += 1;
    }

    for (const contract of missingContracts) {
      if (!contract.customer_id) continue;
      ensureCustomer(contract.customer_id, contract.customers).missingInvoiceCount += 1;
    }

    for (const contract of contracts) {
      if (!contract.customer_id) continue;
      const contractAmount = numberValue(contract.contract_amount);
      const totalPaid = numberValue(contract.total_paid);
      if (contractAmount > 0 && totalPaid > contractAmount) {
        ensureCustomer(contract.customer_id, contract.customers).overContractAmount += totalPaid - contractAmount;
      }
    }

    const risks = [...customerMap.values()]
      .filter((item) => item.outstanding > 0 || item.missingInvoiceCount > 0 || item.overContractAmount > 0)
      .map((item) => {
        const lastPaymentAge = item.lastPaymentDate ? daysBetween(item.lastPaymentDate, now) : 999;
        const recentPaymentBonus = lastPaymentAge <= 30 ? 20 : lastPaymentAge <= 60 ? 10 : 0;
        const riskPenalty =
          Math.min(item.maxDaysOverdue, 150) * 0.8 +
          Math.min(item.outstanding / 1000, 80) +
          item.duplicateCount * 18 +
          item.missingInvoiceCount * 20 +
          (item.overContractAmount > 0 ? 35 : 0);

        item.score = Math.round(riskPenalty - recentPaymentBonus);
        const probability = Math.max(8, Math.min(88, 78 - riskPenalty * 0.35 + recentPaymentBonus));
        item.expected7Days = Math.round(item.outstanding * (probability / 100) * 0.35);
        item.expected30Days = Math.round(item.outstanding * (probability / 100) * 0.85);

        if (item.score >= 95 || item.maxDaysOverdue >= 90 || item.overContractAmount > 0) {
          item.riskLabel = "حرج";
          item.riskClassName = "bg-red-50 text-red-700 border-red-200";
        } else if (item.score >= 55 || item.maxDaysOverdue >= 31) {
          item.riskLabel = "مرتفع";
          item.riskClassName = "bg-amber-50 text-amber-700 border-amber-200";
        }

        const reasonParts = [
          `متأخر ${item.maxDaysOverdue} يوم`,
          `رصيد ${formatCurrency(item.outstanding)}`,
        ];
        if (item.duplicateCount > 0) reasonParts.push(`${item.duplicateCount} فاتورة مكررة محتملة`);
        if (item.missingInvoiceCount > 0) reasonParts.push(`${item.missingInvoiceCount} فاتورة شهرية ناقصة`);
        if (item.overContractAmount > 0) {
          reasonParts.push(`مدفوعات أعلى من العقد بـ ${formatCurrency(item.overContractAmount)}`);
        }
        item.reason = reasonParts.join("، ");
        item.whatsappMessage = buildWhatsappMessage({ ...item, formatCurrency });
        return item;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const issues: BillingAIIssue[] = [
      ...[...invoiceDuplicates.entries()]
        .filter(([, bucket]) => bucket.length > 1)
        .slice(0, 5)
        .map(([, bucket]) => ({
          id: `duplicate-${bucket[0].id}`,
          title: "فاتورة مكررة محتملة",
          description: `${bucket.length} فواتير لنفس العميل/العقد بنفس التاريخ والمبلغ: ${bucket
            .map((invoice) => invoice.invoice_number || invoice.id.slice(0, 8))
            .join("، ")}`,
          severity: "warning" as const,
        })),
      ...missingContracts.slice(0, 5).map((contract) => ({
        id: `missing-${contract.id}`,
        title: "فاتورة شهرية ناقصة",
        description: `العقد ${contract.contract_number || contract.id.slice(0, 8)} نشط ولا توجد له فاتورة في ${currentMonthKey}.`,
        severity: "critical" as const,
      })),
      ...contracts
        .filter((contract) => {
          const contractAmount = numberValue(contract.contract_amount);
          return contractAmount > 0 && numberValue(contract.total_paid) > contractAmount;
        })
        .slice(0, 5)
        .map((contract) => ({
          id: `over-contract-${contract.id}`,
          title: "مدفوعات تتجاوز قيمة العقد",
          description: `العقد ${contract.contract_number || contract.id.slice(0, 8)} مدفوعاته ${formatCurrency(
            numberValue(contract.total_paid)
          )} مقابل قيمة عقد ${formatCurrency(numberValue(contract.contract_amount))}.`,
          severity: "critical" as const,
        })),
    ];

    const totals = risks.reduce(
      (acc, item) => {
        acc.expected7Days += item.expected7Days;
        acc.expected30Days += item.expected30Days;
        acc.outstanding += item.outstanding;
        return acc;
      },
      { expected7Days: 0, expected30Days: 0, outstanding: 0 }
    );

    return { risks, issues, totals };
  }, [data, formatCurrency]);

  const copyMessage = async (message: string) => {
    await navigator.clipboard.writeText(message);
    toast.success("تم نسخ رسالة المطالبة");
  };

  const openWhatsApp = (phone: string, message: string) => {
    const normalized = normalizeWhatsAppPhone(phone);
    if (!normalized) {
      toast.error("لا يوجد رقم جوال صالح لهذا العميل");
      return;
    }
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-36 rounded-[8px]" />
        <Skeleton className="h-80 rounded-[8px]" />
      </div>
    );
  }

  return (
    <div className="billing-ai-panel" dir="rtl">
      <section className="billing-ai-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="billing-ai-icon bg-slate-900 text-white">
              <Brain className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black text-slate-500">AI للتحصيل والفوترة</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">أولوية النقد اليوم</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                ترتيب العملاء المتأخرين، كشف مخاطر الفواتير والدفعات، وتجهيز رسالة مطالبة قابلة للإرسال فورًا.
              </p>
            </div>
          </div>
          <Badge className="border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
            <Sparkles className="ml-1 h-3.5 w-3.5" />
            تحليل قواعد ذكي قابل للتفسير
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="billing-ai-kpi">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span>توقع 7 أيام</span>
            <strong>{formatCurrency(analysis.totals.expected7Days)}</strong>
          </div>
          <div className="billing-ai-kpi">
            <CheckCircle2 className="h-5 w-5 text-sky-600" />
            <span>توقع 30 يوم</span>
            <strong>{formatCurrency(analysis.totals.expected30Days)}</strong>
          </div>
          <div className="billing-ai-kpi">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <span>مخاطر تحتاج مراجعة</span>
            <strong>{analysis.issues.length}</strong>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-[8px] border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <p className="text-sm font-black text-slate-950">قائمة أولوية التحصيل</p>
              <p className="text-xs text-slate-500">مرتبة حسب الخطر والمبلغ وأيام التأخير وجودة الفواتير</p>
            </div>
          </div>

          {analysis.risks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">لا توجد مخاطر تحصيل ظاهرة حاليًا.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {analysis.risks.map((risk, index) => (
                <article key={risk.customerId} className="grid gap-4 p-4 lg:grid-cols-[1fr_210px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-slate-100 text-sm font-black text-slate-700">
                        {index + 1}
                      </span>
                      <h4 className="text-base font-black text-slate-950">{risk.name}</h4>
                      <Badge variant="outline" className={risk.riskClassName}>{risk.riskLabel}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{risk.reason}</p>
                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-4">
                      <span>المستحق: <b className="text-slate-900">{formatCurrency(risk.outstanding)}</b></span>
                      <span>الفواتير: <b className="text-slate-900">{risk.invoiceCount}</b></span>
                      <span>7 أيام: <b className="text-slate-900">{formatCurrency(risk.expected7Days)}</b></span>
                      <span>30 يوم: <b className="text-slate-900">{formatCurrency(risk.expected30Days)}</b></span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-2">
                    <Button variant="outline" className="h-9 justify-start gap-2" onClick={() => copyMessage(risk.whatsappMessage)}>
                      <Copy className="h-4 w-4" />
                      نسخ الرسالة
                    </Button>
                    <Button className="h-9 justify-start gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => openWhatsApp(risk.phone, risk.whatsappMessage)}>
                      <MessageSquare className="h-4 w-4" />
                      واتساب
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="h-3.5 w-3.5" />
                      {risk.phone || "لا يوجد رقم"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[8px] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <p className="text-sm font-black text-slate-950">تنبيهات الفوترة</p>
            <p className="text-xs text-slate-500">مشاكل تمنع الاعتماد النظيف</p>
          </div>
          <div className="grid gap-3 p-4">
            {analysis.issues.length === 0 ? (
              <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                لا توجد فواتير ناقصة أو مكررة أو تجاوزات عقد ظاهرة في العينة الحالية.
              </div>
            ) : (
              analysis.issues.map((issue) => (
                <div key={issue.id} className={`rounded-[8px] border p-3 ${issueClassName[issue.severity]}`}>
                  <div className="flex items-start gap-2">
                    {issue.severity === "critical" ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <FileWarning className="mt-0.5 h-4 w-4" />}
                    <div>
                      <p className="text-sm font-black">{issue.title}</p>
                      <p className="mt-1 text-xs leading-6">{issue.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <style>{`
        .billing-ai-panel {
          color: #0f172a;
        }

        .billing-ai-hero {
          border: 1px solid #dbe3ef;
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.045), rgba(255,255,255,0) 42%),
            #ffffff;
          border-radius: 8px;
          padding: 22px;
        }

        .billing-ai-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .billing-ai-kpi {
          min-height: 92px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          padding: 14px;
          display: grid;
          gap: 6px;
        }

        .billing-ai-kpi span {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
        }

        .billing-ai-kpi strong {
          font-size: 22px;
          font-weight: 950;
          color: #0f172a;
        }
      `}</style>
    </div>
  );
};

export default BillingAIAssistant;
