import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;
const MONEY_TOLERANCE = 0.05;

type Severity = "critical" | "high" | "medium";

export type MonthlyCloseAuditCheckId =
  | "completed_payments_without_journal"
  | "paid_invoices_with_wrong_balance"
  | "unbalanced_journal_entries"
  | "duplicate_invoices"
  | "payments_before_contract_start";

export interface MonthlyCloseAuditBlocker {
  id: string;
  checkId: MonthlyCloseAuditCheckId;
  severity: Severity;
  title: string;
  detail: string;
  entityType: "payment" | "invoice" | "journal_entry";
  entityId?: string | null;
  entityNumber?: string | null;
  date?: string | null;
  amount?: number;
  link?: string;
}

export interface MonthlyCloseAuditCheck {
  id: MonthlyCloseAuditCheckId;
  title: string;
  description: string;
  severity: Severity;
  count: number;
  amount: number;
  status: "passed" | "failed";
  blockers: MonthlyCloseAuditBlocker[];
}

export interface MonthlyCloseAuditResult {
  month: string;
  monthLabel: string;
  startDate: string;
  endDate: string;
  ready: boolean;
  decision: "ready" | "needs_processing";
  blockersCount: number;
  affectedAmount: number;
  checks: MonthlyCloseAuditCheck[];
  blockers: MonthlyCloseAuditBlocker[];
  managementReport: string;
}

interface CompanyUser {
  company_id?: string | null;
  profile?: { company_id?: string | null } | null;
  company?: { id?: string | null } | null;
}

const getCompanyId = (user: CompanyUser | null | undefined) =>
  user?.company_id || user?.profile?.company_id || user?.company?.id || null;

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeDate = (value: unknown) => (value ? String(value).slice(0, 10) : null);

const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase();

const formatQar = (value: number) =>
  new Intl.NumberFormat("ar-QA", {
    style: "currency",
    currency: "QAR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const getMonthRange = (month: string) => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const startDate = `${yearText}-${monthText}-01`;
  const endDate = new Date(year, monthIndex + 1, 0).toISOString().slice(0, 10);
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("ar-QA", {
    month: "long",
    year: "numeric",
  });

  return { startDate, endDate, monthLabel };
};

const chunk = <T,>(items: T[], size = 200) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const fetchByIds = async (table: string, column: string, ids: string[], select = "*") => {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  const rows: any[] = [];

  for (const idChunk of chunk(uniqueIds)) {
    const { data, error } = await db.from(table).select(select).in(column, idChunk);
    if (error) throw error;
    rows.push(...(data || []));
  }

  return rows;
};

const getInvoiceTotal = (invoice: any) =>
  toNumber(invoice.total_amount ?? invoice.invoice_amount ?? invoice.amount ?? invoice.subtotal);

const getInvoicePaid = (invoice: any) =>
  toNumber(invoice.paid_amount ?? invoice.amount_paid ?? invoice.total_paid);

const getInvoiceBalance = (invoice: any, total: number, paid: number) => {
  const explicitBalance = invoice.balance_due ?? invoice.remaining_amount ?? invoice.outstanding_amount;
  return explicitBalance === undefined || explicitBalance === null
    ? total - paid
    : toNumber(explicitBalance);
};

const isInvoicePaid = (invoice: any, total: number, paid: number, balance: number) => {
  const status = normalizeText(invoice.status ?? invoice.payment_status);
  return ["paid", "completed", "settled"].includes(status) || paid >= total - MONEY_TOLERANCE || Math.abs(balance) <= MONEY_TOLERANCE;
};

const getPaymentAmount = (payment: any) => toNumber(payment.amount ?? payment.payment_amount);

const createCheck = (
  id: MonthlyCloseAuditCheckId,
  title: string,
  description: string,
  severity: Severity,
  blockers: MonthlyCloseAuditBlocker[]
): MonthlyCloseAuditCheck => ({
  id,
  title,
  description,
  severity,
  count: blockers.length,
  amount: blockers.reduce((sum, blocker) => sum + toNumber(blocker.amount), 0),
  status: blockers.length > 0 ? "failed" : "passed",
  blockers,
});

const createReport = (result: Omit<MonthlyCloseAuditResult, "managementReport">) => {
  const lines = [
    `تقرير تدقيق الإقفال الشهري - ${result.monthLabel}`,
    result.ready
      ? "القرار: الشهر جاهز للإقفال ولا توجد عوائق ضمن الفحوصات الحالية."
      : "القرار: الشهر يحتاج معالجة قبل الإقفال.",
    `عدد العوائق: ${result.blockersCount}`,
    `إجمالي المبالغ المتأثرة: ${formatQar(result.affectedAmount)}`,
    "",
    "ملخص الفحوصات:",
    ...result.checks.map((check) => `- ${check.title}: ${check.count === 0 ? "سليم" : `${check.count} عائق`}`),
  ];

  if (!result.ready) {
    lines.push("", "أبرز العوائق:");
    result.blockers.slice(0, 8).forEach((blocker, index) => {
      lines.push(`${index + 1}. ${blocker.title} - ${blocker.detail}`);
    });
  }

  return lines.join("\n");
};

export const useMonthlyCloseAudit = (month: string) => {
  const { user } = useAuth();
  const companyId = getCompanyId(user as CompanyUser);
  const range = useMemo(() => getMonthRange(month), [month]);

  return useQuery({
    queryKey: ["monthly-close-audit", companyId, month],
    enabled: Boolean(companyId && month),
    staleTime: 60_000,
    queryFn: async (): Promise<MonthlyCloseAuditResult> => {
      if (!companyId) throw new Error("لم يتم تحديد الشركة");

      const { startDate, endDate, monthLabel } = range;

      const [paymentsResult, invoicesResult, entriesResult] = await Promise.all([
        db
          .from("payments")
          .select("*")
          .eq("company_id", companyId)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate),
        db
          .from("invoices")
          .select("*")
          .eq("company_id", companyId)
          .gte("invoice_date", startDate)
          .lte("invoice_date", endDate),
        db
          .from("journal_entries")
          .select("*")
          .eq("company_id", companyId)
          .gte("entry_date", startDate)
          .lte("entry_date", endDate),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (entriesResult.error) throw entriesResult.error;

      const payments = paymentsResult.data || [];
      const invoices = invoicesResult.data || [];
      const journalEntries = entriesResult.data || [];

      const completedPayments = payments.filter((payment: any) =>
        ["completed", "paid", "success"].includes(normalizeText(payment.payment_status ?? payment.status))
      );

      const paymentContractIds = completedPayments.map((payment: any) => payment.contract_id).filter(Boolean);
      const contracts = await fetchByIds("contracts", "id", paymentContractIds, "*");
      const contractsById = new Map(contracts.map((contract: any) => [contract.id, contract]));

      const journalEntryIds = journalEntries.map((entry: any) => entry.id).filter(Boolean);
      const journalLines = await fetchByIds("journal_entry_lines", "journal_entry_id", journalEntryIds, "*");
      const journalLineSums = new Map<string, { debit: number; credit: number }>();

      journalLines.forEach((line: any) => {
        const entryId = line.journal_entry_id;
        const current = journalLineSums.get(entryId) || { debit: 0, credit: 0 };
        current.debit += toNumber(line.debit_amount);
        current.credit += toNumber(line.credit_amount);
        journalLineSums.set(entryId, current);
      });

      const paymentsWithoutJournal = completedPayments
        .filter((payment: any) => !payment.journal_entry_id)
        .map((payment: any): MonthlyCloseAuditBlocker => ({
          id: `payment-no-journal-${payment.id}`,
          checkId: "completed_payments_without_journal",
          severity: "critical",
          title: "دفعة مكتملة بدون قيد",
          detail: `الدفعة ${payment.payment_number || payment.reference_number || payment.id} مكتملة لكنها غير مربوطة بقيد محاسبي.`,
          entityType: "payment",
          entityId: payment.id,
          entityNumber: payment.payment_number || payment.reference_number,
          date: normalizeDate(payment.payment_date),
          amount: getPaymentAmount(payment),
          link: "/finance/billing?tab=payments",
        }));

      const paidInvoicesWithWrongBalance = invoices
        .map((invoice: any) => {
          const total = getInvoiceTotal(invoice);
          const paid = getInvoicePaid(invoice);
          const balance = getInvoiceBalance(invoice, total, paid);
          return { invoice, total, paid, balance };
        })
        .filter(({ invoice, total, paid, balance }) => {
          const paidInvoice = isInvoicePaid(invoice, total, paid, balance);
          const equationWrong = Math.abs(total - paid - balance) > MONEY_TOLERANCE;
          const paidButHasBalance = paidInvoice && Math.abs(balance) > MONEY_TOLERANCE;
          return paidInvoice && (equationWrong || paidButHasBalance);
        })
        .map(({ invoice, total, paid, balance }): MonthlyCloseAuditBlocker => ({
          id: `invoice-wrong-balance-${invoice.id}`,
          checkId: "paid_invoices_with_wrong_balance",
          severity: "high",
          title: "فاتورة مدفوعة برصيد غير صحيح",
          detail: `الفاتورة ${invoice.invoice_number || invoice.id}: الإجمالي ${formatQar(total)}، المدفوع ${formatQar(paid)}، الرصيد ${formatQar(balance)}.`,
          entityType: "invoice",
          entityId: invoice.id,
          entityNumber: invoice.invoice_number,
          date: normalizeDate(invoice.invoice_date ?? invoice.due_date),
          amount: Math.abs(balance) || total,
          link: "/finance/billing?tab=invoices",
        }));

      const unbalancedJournalEntries = journalEntries
        .filter((entry: any) => {
          const headerDifference = Math.abs(toNumber(entry.total_debit) - toNumber(entry.total_credit));
          const lineSums = journalLineSums.get(entry.id);
          const lineDifference = lineSums ? Math.abs(lineSums.debit - lineSums.credit) : 0;
          return headerDifference > MONEY_TOLERANCE || lineDifference > MONEY_TOLERANCE;
        })
        .map((entry: any): MonthlyCloseAuditBlocker => {
          const lineSums = journalLineSums.get(entry.id);
          const debit = lineSums ? lineSums.debit : toNumber(entry.total_debit);
          const credit = lineSums ? lineSums.credit : toNumber(entry.total_credit);
          return {
            id: `unbalanced-entry-${entry.id}`,
            checkId: "unbalanced_journal_entries",
            severity: "critical",
            title: "قيد غير متوازن",
            detail: `القيد ${entry.entry_number || entry.id}: مدين ${formatQar(debit)} مقابل دائن ${formatQar(credit)}.`,
            entityType: "journal_entry",
            entityId: entry.id,
            entityNumber: entry.entry_number,
            date: normalizeDate(entry.entry_date),
            amount: Math.abs(debit - credit),
            link: "/finance/accounting?tab=entries",
          };
        });

      const duplicateGroups = new Map<string, any[]>();
      invoices.forEach((invoice: any) => {
        const total = getInvoiceTotal(invoice).toFixed(2);
        const invoiceDate = normalizeDate(invoice.invoice_date ?? invoice.due_date) || "no-date";
        const strongKey = normalizeText(invoice.invoice_number)
          ? `number:${normalizeText(invoice.invoice_number)}`
          : `semantic:${invoice.contract_id || invoice.customer_id || "unknown"}:${invoiceDate}:${total}`;
        const current = duplicateGroups.get(strongKey) || [];
        current.push(invoice);
        duplicateGroups.set(strongKey, current);
      });

      const duplicateInvoices = Array.from(duplicateGroups.values())
        .filter((group) => group.length > 1)
        .flatMap((group): MonthlyCloseAuditBlocker[] => {
          const total = group.reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
          const numbers = group.map((invoice) => invoice.invoice_number || invoice.id).join("، ");
          return [
            {
              id: `duplicate-invoices-${group.map((invoice) => invoice.id).join("-")}`,
              checkId: "duplicate_invoices",
              severity: "high",
              title: "فواتير مكررة",
              detail: `تم العثور على ${group.length} فواتير متشابهة: ${numbers}.`,
              entityType: "invoice",
              entityId: group[0]?.id,
              entityNumber: group[0]?.invoice_number,
              date: normalizeDate(group[0]?.invoice_date ?? group[0]?.due_date),
              amount: total,
              link: "/finance/billing?tab=invoices",
            },
          ];
        });

      const paymentsBeforeContractStart = completedPayments
        .filter((payment: any) => {
          const contract = contractsById.get(payment.contract_id);
          const paymentDate = normalizeDate(payment.payment_date);
          const contractStartDate = normalizeDate(contract?.start_date);
          return Boolean(paymentDate && contractStartDate && paymentDate < contractStartDate);
        })
        .map((payment: any): MonthlyCloseAuditBlocker => {
          const contract = contractsById.get(payment.contract_id);
          return {
            id: `payment-before-contract-${payment.id}`,
            checkId: "payments_before_contract_start",
            severity: "high",
            title: "دفعة قبل بداية العقد",
            detail: `الدفعة ${payment.payment_number || payment.id} بتاريخ ${normalizeDate(payment.payment_date)} قبل بداية العقد ${contract?.contract_number || payment.contract_id} بتاريخ ${normalizeDate(contract?.start_date)}.`,
            entityType: "payment",
            entityId: payment.id,
            entityNumber: payment.payment_number || payment.reference_number,
            date: normalizeDate(payment.payment_date),
            amount: getPaymentAmount(payment),
            link: contract?.contract_number ? `/contracts/${contract.contract_number}` : "/finance/billing?tab=payments",
          };
        });

      const checks = [
        createCheck(
          "completed_payments_without_journal",
          "دفعات مكتملة بدون قيد",
          "أي دفعة مكتملة يجب أن يكون لها أثر محاسبي واضح.",
          "critical",
          paymentsWithoutJournal
        ),
        createCheck(
          "paid_invoices_with_wrong_balance",
          "فواتير مدفوعة برصيد غير صحيح",
          "الفاتورة المدفوعة يجب أن يكون رصيدها صفرًا ومعادلتها سليمة.",
          "high",
          paidInvoicesWithWrongBalance
        ),
        createCheck(
          "unbalanced_journal_entries",
          "قيود غير متوازنة",
          "إجمالي المدين يجب أن يساوي إجمالي الدائن قبل إقفال الشهر.",
          "critical",
          unbalancedJournalEntries
        ),
        createCheck(
          "duplicate_invoices",
          "فواتير مكررة",
          "الفواتير المتطابقة في الرقم أو العقد والتاريخ والمبلغ تحتاج مراجعة قبل الإقفال.",
          "high",
          duplicateInvoices
        ),
        createCheck(
          "payments_before_contract_start",
          "مدفوعات قبل بداية العقد",
          "الدفعة المرتبطة بعقد لا يجب أن تسبق تاريخ بداية العقد.",
          "high",
          paymentsBeforeContractStart
        ),
      ];

      const blockers = checks.flatMap((check) => check.blockers);
      const resultWithoutReport: Omit<MonthlyCloseAuditResult, "managementReport"> = {
        month,
        monthLabel,
        startDate,
        endDate,
        ready: blockers.length === 0,
        decision: blockers.length === 0 ? "ready" : "needs_processing",
        blockersCount: blockers.length,
        affectedAmount: blockers.reduce((sum, blocker) => sum + toNumber(blocker.amount), 0),
        checks,
        blockers,
      };

      return {
        ...resultWithoutReport,
        managementReport: createReport(resultWithoutReport),
      };
    },
  });
};

export const getDefaultAuditMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
