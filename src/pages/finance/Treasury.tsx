import { type CSSProperties, type ElementType, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  RotateCcw,
  X,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { BankReconciliationPanel } from "@/components/finance/BankReconciliationPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { Bank, BankTransaction, useBankTransactions, useBanks, useCreateBank, useCreateBankTransaction, useReverseBankTransaction, useTreasurySummary } from "@/hooks/useTreasury";
import { systemColorPattern } from "@/lib/design-system/systemColorPattern";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const treasuryColors = {
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

const treasuryStyle = {
  "--treasury-text": treasuryColors.text,
  "--treasury-surface": treasuryColors.surface,
  "--treasury-inner": treasuryColors.inner,
  "--treasury-muted": treasuryColors.muted,
  "--treasury-border": treasuryColors.border,
  "--treasury-info": treasuryColors.info,
  "--treasury-alert": treasuryColors.alert,
  "--treasury-focus": treasuryColors.focus,
  "--treasury-success": treasuryColors.success,
} as CSSProperties;

const accountTypeLabels: Record<string, string> = {
  checking: "جاري",
  savings: "توفير",
  business: "تجاري",
};

interface TreasuryMetricProps {
  title: string;
  value: string | number;
  helper: string;
  icon: ElementType;
  accent: string;
}

const TreasuryMetric = ({ title, value, helper, icon: Icon, accent }: TreasuryMetricProps) => (
  <div className="treasury-metric">
    <div className="flex items-start justify-between gap-3">
      <span className="treasury-metric-icon" style={{ color: accent, backgroundColor: `${accent}14` }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs font-bold" style={{ color: treasuryColors.muted }}>
        {helper}
      </span>
    </div>
    <div className="mt-5">
      <p className="text-sm font-bold" style={{ color: treasuryColors.muted }}>
        {title}
      </p>
      <p className="mt-2 text-2xl font-black tracking-normal" style={{ color: treasuryColors.text }}>
        {value}
      </p>
    </div>
  </div>
);

const dateFormatter = new Intl.DateTimeFormat("ar-QA", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const numberFormatter = new Intl.NumberFormat("ar-QA");

export default function Treasury() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateBankDialogOpen, setIsCreateBankDialogOpen] = useState(false);
  const [isCreateTransactionDialogOpen, setIsCreateTransactionDialogOpen] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: banks, isLoading: banksLoading, error: banksError, refetch: refetchBanks } = useBanks();
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useBankTransactions();
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useTreasurySummary();
  const createBank = useCreateBank();
  const createTransaction = useCreateBankTransaction();
  const reverseTransaction = useReverseBankTransaction();
  const { data: chartOfAccounts } = useChartOfAccounts();
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: companyCurrency } = useCompanyCurrency();

  const [newBank, setNewBank] = useState<Partial<Bank>>({
    bank_name: "",
    account_number: "",
    account_type: "checking",
    currency: companyCurrency,
    current_balance: 0,
    opening_balance: 0,
    is_active: true,
    is_primary: false,
  });

  const [newTransaction, setNewTransaction] = useState({
    transaction_type: "deposit",
    amount: 0,
    description: "",
    reference_number: "",
    bank_id: "",
    bank_account_id: "",
    counterpart_account_id: "",
    idempotency_key: crypto.randomUUID(),
  });
  const [reversalReason, setReversalReason] = useState("");
  const reversalKeys = useRef(new Map<string, string>());

  const postableAccounts = useMemo(() => (chartOfAccounts || []).filter((account) =>
    account.is_active && !account.is_header && account.account_level >= 3
  ), [chartOfAccounts]);
  const bankLedgerAccounts = useMemo(() => postableAccounts.filter((account) =>
    ["asset", "assets"].includes(account.account_type.toLowerCase()) && account.balance_type.toLowerCase() === "debit"
  ), [postableAccounts]);

  const bankLookup = useMemo(() => {
    return new Map((banks || []).map((bank) => [bank.id, bank]));
  }, [banks]);

  const filteredBanks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return banks || [];

    return (banks || []).filter((bank) =>
      bank.bank_name.toLowerCase().includes(term) ||
      bank.bank_name_ar?.toLowerCase().includes(term) ||
      bank.iban?.toLowerCase().includes(term) ||
      bank.account_number.includes(term)
    );
  }, [banks, searchTerm]);

  const recentTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = transactions || [];
    if (!term) return list.slice(0, 10);

    return list.filter((transaction) => {
      const transactionBank = bankLookup.get(transaction.bank_id);

      return (
        transaction.transaction_number.toLowerCase().includes(term) ||
        transaction.description?.toLowerCase().includes(term) ||
        transaction.reference_number?.toLowerCase().includes(term) ||
        transactionBank?.bank_name.toLowerCase().includes(term) ||
        transactionBank?.bank_name_ar?.toLowerCase().includes(term) ||
        transactionBank?.account_number.includes(term)
      );
    }).slice(0, 10);
  }, [bankLookup, searchTerm, transactions]);

  const visibleBanks = useMemo(() => filteredBanks.slice(0, 6), [filteredBanks]);

  const primaryBank = useMemo(() => {
    return (banks || []).find((bank) => bank.is_primary) || banks?.[0];
  }, [banks]);

  const largestBalanceBank = useMemo(() => {
    return [...(banks || [])].sort((first, second) => Math.abs(second.current_balance || 0) - Math.abs(first.current_balance || 0))[0];
  }, [banks]);

  const unreconciledTransactions = useMemo(() => {
    return (transactions || []).filter((transaction) =>
      transaction.status === "completed" && !transaction.reconciled
    ).length;
  }, [transactions]);

  const completedTransactions = useMemo(() => {
    return (transactions || []).filter((transaction) => transaction.status === "completed").length;
  }, [transactions]);

  const latestTransaction = transactions?.[0];
  const hasSearch = searchTerm.trim().length > 0;
  const hasMoreBanks = filteredBanks.length > visibleBanks.length;

  const getBankName = (bank?: Bank) => {
    if (!bank) return "غير محدد";
    return bank.bank_name_ar || bank.bank_name;
  };

  const getTransactionDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return dateFormatter.format(date);
  };

  const getReconciliationLabel = (transaction: BankTransaction) => {
    if (transaction.reconciled) return "مسواة";
    if (transaction.status === "completed") return "غير مسواة";
    return "معلقة";
  };

  const getReconciliationClass = (transaction: BankTransaction) => {
    if (transaction.reconciled) return "bg-[#22C7A1]/10 text-[#148768]";
    if (transaction.status === "completed") return "bg-[#FFF7ED] text-[#D97706]";
    return "bg-[#EEF2FF] text-[#7C83F6]";
  };

  const handleCreateBank = async () => {
    if (!newBank.bank_name || !newBank.account_number || !user?.profile?.company_id) return;

    await createBank.mutateAsync({
      ...newBank,
      opening_balance: 0,
      current_balance: 0,
      company_id: user.profile.company_id,
    } as Omit<Bank, "id" | "created_at" | "updated_at">);

    setNewBank({
      bank_name: "",
      account_number: "",
      account_type: "checking",
      currency: companyCurrency,
      current_balance: 0,
      opening_balance: 0,
      is_active: true,
      is_primary: false,
    });
    setIsCreateBankDialogOpen(false);
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.description) {
      toast.error("يرجى إدخال وصف المعاملة");
      return;
    }
    if (!newTransaction.bank_id) {
      toast.error("يرجى اختيار البنك");
      return;
    }
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (!newTransaction.bank_account_id || !newTransaction.counterpart_account_id) {
      toast.error("يرجى اختيار حساب البنك والحساب المقابل");
      return;
    }
    if (newTransaction.bank_account_id === newTransaction.counterpart_account_id) {
      toast.error("يجب أن يكون الحساب المقابل مختلفًا عن حساب البنك");
      return;
    }
    if (!user?.profile?.company_id) {
      toast.error("خطأ في بيانات المستخدم");
      return;
    }

    const selectedBank = banks?.find((bank) => bank.id === newTransaction.bank_id);
    if (!selectedBank) {
      toast.error("البنك المحدد غير موجود");
      return;
    }

    try {
      await createTransaction.mutateAsync({
        company_id: user.profile.company_id,
        bank_id: newTransaction.bank_id,
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: newTransaction.transaction_type as "deposit" | "withdrawal",
        amount: newTransaction.amount,
        description: newTransaction.description,
        reference_number: newTransaction.reference_number,
        bank_account_id: newTransaction.bank_account_id,
        counterpart_account_id: newTransaction.counterpart_account_id,
        idempotency_key: newTransaction.idempotency_key,
        actor_id: user.id,
      });

      setNewTransaction({
        transaction_type: "deposit",
        amount: 0,
        description: "",
        reference_number: "",
        bank_id: "",
        bank_account_id: "",
        counterpart_account_id: "",
        idempotency_key: crypto.randomUUID(),
      });
      setIsCreateTransactionDialogOpen(false);
    } catch (error) {
      toast.error(`حدث خطأ في إنشاء المعاملة: ${(error as Error).message}`);
    }
  };

  const handleRefresh = () => {
    refetchBanks();
    refetchTransactions();
    refetchSummary();
  };

  const getTransactionIcon = (type: string) => {
    if (type === "deposit") return <ArrowDownRight className="h-4 w-4 text-[#22C7A1]" aria-hidden="true" />;
    if (type === "withdrawal") return <ArrowUpRight className="h-4 w-4 text-[#FB6B7A]" aria-hidden="true" />;
    return <ArrowRightLeft className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />;
  };

  const getTransactionBadge = (type: string) => {
    if (type === "deposit") {
      return <Badge className="border-0 bg-[#22C7A1]/10 text-[#22C7A1] hover:bg-[#22C7A1]/10">إيداع</Badge>;
    }
    if (type === "withdrawal") {
      return <Badge className="border-0 bg-[#FB6B7A]/10 text-[#FB6B7A] hover:bg-[#FB6B7A]/10">سحب</Badge>;
    }
    return <Badge className="border-0 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/10">تحويل</Badge>;
  };

  if (!user || banksLoading || summaryLoading) {
    return (
      <div className="treasury-system flex min-h-screen items-center justify-center" dir="rtl" style={treasuryStyle}>
        <div className="treasury-state">
          <RefreshCw className="h-10 w-10 animate-spin text-[#FB6B7A]" />
          <p>جاري تحميل بيانات الخزينة...</p>
        </div>
      </div>
    );
  }

  if (banksError) {
    return (
      <div className="treasury-system flex min-h-screen items-center justify-center" dir="rtl" style={treasuryStyle}>
        <div className="treasury-state">
          <span className="treasury-state-icon">
            <Landmark className="h-8 w-8" />
          </span>
          <p className="font-bold text-[#FB6B7A]">حدث خطأ في تحميل البيانات</p>
          <Button onClick={() => refetchBanks()} className="mt-2 bg-[#020617] text-white hover:bg-[#020617]/90">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="treasury-system min-h-screen" dir="rtl" style={treasuryStyle}>
      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="treasury-command"
        >
          <div className="treasury-command-grid">
            <div className="flex items-start gap-4">
              <div className="treasury-command-icon">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-[#E8FBF6] text-[#148768] hover:bg-[#E8FBF6]">
                    مركز السيولة
                  </Badge>
                  <span className="text-xs font-bold" style={{ color: treasuryColors.muted }}>
                    الحسابات البنكية، الحركة النقدية، التسويات
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-normal sm:text-3xl" style={{ color: treasuryColors.text }}>
                  الخزينة والبنوك
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7" style={{ color: treasuryColors.muted }}>
                  مساحة عمل مختصرة لمراجعة الرصيد المتاح، آخر الحركات، والحسابات التي تحتاج متابعة قبل التسوية.
                </p>
              </div>
            </div>

            <div className="treasury-command-actions">
              <Button
                onClick={() => setIsCreateTransactionDialogOpen(true)}
                className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90"
              >
                <ArrowRightLeft className="h-4 w-4" />
                معاملة جديدة
              </Button>
              <Button
                onClick={() => setIsCreateBankDialogOpen(true)}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <Building2 className="h-4 w-4" />
                حساب جديد
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate("/finance/hub")}
                variant="outline"
                className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                <ArrowLeft className="h-4 w-4" />
                المالية
              </Button>
            </div>
          </div>

          <div className="treasury-snapshot">
            <div className="treasury-snapshot-item">
              <span className="treasury-snapshot-label">الحساب الرئيسي</span>
              <strong>{getBankName(primaryBank)}</strong>
              <small>{primaryBank ? formatCurrency(primaryBank.current_balance || 0, { currency: primaryBank.currency }) : "لا يوجد حساب"}</small>
            </div>
            <div className="treasury-snapshot-item">
              <span className="treasury-snapshot-label">أكبر رصيد</span>
              <strong>{getBankName(largestBalanceBank)}</strong>
              <small>{largestBalanceBank ? formatCurrency(largestBalanceBank.current_balance || 0, { currency: largestBalanceBank.currency }) : "لا توجد حسابات"}</small>
            </div>
            <div className="treasury-snapshot-item">
              <span className="treasury-snapshot-label">آخر حركة</span>
              <strong>{latestTransaction ? formatCurrency(latestTransaction.amount) : "لا توجد حركة"}</strong>
              <small>{latestTransaction ? `${getTransactionDate(latestTransaction.transaction_date)} - ${getBankName(bankLookup.get(latestTransaction.bank_id))}` : "لم يتم تسجيل معاملات"}</small>
            </div>
            <div className="treasury-snapshot-item">
              <span className="treasury-snapshot-label">غير مسواة</span>
              <strong>{numberFormatter.format(unreconciledTransactions)} حركة</strong>
              <small>من أصل {numberFormatter.format(completedTransactions)} حركة مكتملة</small>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TreasuryMetric
            title="إجمالي الأرصدة"
            value={formatCurrency(summary?.totalBalance || 0)}
            helper={`${summary?.totalBanks || 0} حساب نشط`}
            icon={CircleDollarSign}
            accent={treasuryColors.info}
          />
          <TreasuryMetric
            title="الإيداعات الشهرية"
            value={formatCurrency(summary?.monthlyDeposits || 0)}
            helper="آخر 30 يوم"
            icon={ArrowDownRight}
            accent={treasuryColors.success}
          />
          <TreasuryMetric
            title="المسحوبات الشهرية"
            value={formatCurrency(summary?.monthlyWithdrawals || 0)}
            helper="آخر 30 يوم"
            icon={ArrowUpRight}
            accent={treasuryColors.alert}
          />
          <TreasuryMetric
            title="صافي التدفق النقدي"
            value={formatCurrency(summary?.netFlow || 0)}
            helper={(summary?.netFlow || 0) >= 0 ? "موجب" : "سالب"}
            icon={Activity}
            accent={(summary?.netFlow || 0) >= 0 ? treasuryColors.success : treasuryColors.alert}
          />
        </section>

        <section className="treasury-toolbar">
          <div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4" style={{ color: treasuryColors.info }} />
              <h2 className="text-xl font-black" style={{ color: treasuryColors.text }}>
                متابعة الخزينة
              </h2>
            </div>
            <p className="mt-2 text-sm" style={{ color: treasuryColors.muted }}>
              {hasSearch
                ? `نتائج البحث: ${numberFormatter.format(filteredBanks.length)} حساب و ${numberFormatter.format(recentTransactions.length)} حركة`
                : `يعرض ${numberFormatter.format(banks?.length || 0)} حساب نشط و آخر ${numberFormatter.format(recentTransactions.length)} حركات`}
            </p>
          </div>
          <div className="treasury-search">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
              <Input
                placeholder="ابحث باسم البنك، رقم الحساب، رقم الحركة أو الوصف"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 rounded-lg border-[#D9E2EC] bg-white pr-10"
                aria-label="بحث في الخزينة"
              />
            </div>
            {hasSearch && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-[#D9E2EC] bg-white"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
                مسح
              </Button>
            )}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="treasury-panel treasury-bank-panel"
        >
          <div className="treasury-panel-header">
            <div className="flex items-center gap-3">
              <span className="treasury-panel-icon" style={{ color: treasuryColors.info, backgroundColor: `${treasuryColors.info}14` }}>
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black" style={{ color: treasuryColors.text }}>
                  الحسابات البنكية
                </h3>
                <p className="text-xs" style={{ color: treasuryColors.muted }}>
                  {filteredBanks.length} حساب مطابق
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-[#D9E2EC] bg-white" onClick={() => setIsCreateBankDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              حساب
            </Button>
          </div>

          {visibleBanks.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title="لا توجد حسابات"
                description="لا توجد حسابات بنكية مطابقة للبحث الحالي."
                onAction={() => setIsCreateBankDialogOpen(true)}
                actionLabel="إضافة حساب"
              />
            </div>
          ) : (
            <div className="treasury-bank-list">
              {visibleBanks.map((bank, index) => (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  className={cn("treasury-bank-row", bank.is_primary && "treasury-bank-row-primary")}
                >
                  <span className="treasury-bank-icon">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-sm font-black" style={{ color: treasuryColors.text }}>
                        {getBankName(bank)}
                      </h4>
                      {bank.is_primary && (
                        <Badge className="border-0 bg-[#EEF2FF] text-[#5B5FE8] hover:bg-[#EEF2FF]">
                          رئيسي
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold" style={{ color: treasuryColors.muted }}>
                      <span>{bank.account_number}</span>
                      <span className="treasury-dot" />
                      <span>{accountTypeLabels[bank.account_type] || bank.account_type}</span>
                    </div>
                  </div>
                  <div className="treasury-bank-balance">
                    <span>الرصيد</span>
                    <strong>{formatCurrency(bank.current_balance || 0, { currency: bank.currency })}</strong>
                  </div>
                </motion.div>
              ))}

              <button type="button" className="treasury-add-row" onClick={() => setIsCreateBankDialogOpen(true)}>
                <span className="treasury-add-icon">
                  <Plus className="h-5 w-5" />
                </span>
                <span>
                  <strong>إضافة حساب جديد</strong>
                  <small>فتح حساب خزينة أو بنك</small>
                </span>
              </button>
            </div>
          )}

          {hasMoreBanks && (
            <div className="treasury-panel-note">
              يتم عرض أول {numberFormatter.format(visibleBanks.length)} حسابات. استخدم البحث للوصول إلى حساب محدد.
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="treasury-panel overflow-hidden"
        >
          <div className="treasury-panel-header">
            <div className="flex items-center gap-3">
              <span className="treasury-panel-icon" style={{ color: treasuryColors.focus, backgroundColor: `${treasuryColors.focus}14` }}>
                <ArrowRightLeft className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-black" style={{ color: treasuryColors.text }}>
                  أحدث الحركات البنكية
                </h3>
                <p className="text-xs" style={{ color: treasuryColors.muted }}>
                  آخر 10 حركات مع حالة التسوية
                </p>
              </div>
            </div>
            <Button className="gap-2 bg-[#020617] text-white hover:bg-[#020617]/90" onClick={() => setIsCreateTransactionDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              حركة
            </Button>
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-10 w-10 animate-spin text-[#FB6B7A]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]" aria-label="جدول المعاملات البنكية">
                <TableHeader>
                  <TableRow className="border-b border-[#E5EAF1] bg-[#F6F8FB]">
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">الحركة</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">الحساب</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">التاريخ</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">النوع</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">المبلغ</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">التسوية</TableHead>
                    <TableHead className="text-right text-xs font-black text-[#64748B]" scope="col">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {recentTransactions.map((transaction, index) => {
                      const transactionBank = bankLookup.get(transaction.bank_id);

                      return (
                        <motion.tr
                          key={transaction.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ delay: index * 0.025 }}
                          className="border-b border-[#E5EAF1]/70 transition-colors hover:bg-[#F6F8FB]"
                        >
                          <TableCell>
                            <div className="font-mono text-sm font-black text-[#020617]">{transaction.transaction_number}</div>
                            <div className="mt-1 max-w-[260px] truncate text-xs text-[#64748B]">
                              {transaction.description || "بدون وصف"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[180px] truncate text-sm font-bold text-[#020617]">
                              {getBankName(transactionBank)}
                            </div>
                            <div className="mt-1 text-xs text-[#94A3B8]">
                              {transactionBank?.account_number || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-[#94A3B8]" />
                              {getTransactionDate(transaction.transaction_date)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.transaction_type)}
                              {getTransactionBadge(transaction.transaction_type)}
                            </div>
                          </TableCell>
                          <TableCell className={cn(
                            "text-sm font-black",
                            transaction.transaction_type === "deposit" ? "text-[#148768]" : "text-[#E04F5F]"
                          )}>
                            {transaction.transaction_type === "deposit" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Badge className={cn("border-0", getReconciliationClass(transaction))}>
                                {getReconciliationLabel(transaction)}
                              </Badge>
                              {transaction.status === "completed" && (
                                <Badge className="inline-flex items-center gap-1 border-0 bg-[#E8FBF6] text-[#148768]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  مكتملة
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {transaction.manual_idempotency_key && !transaction.reversal_of_transaction_id ? <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2 text-[#E04F5F] hover:bg-[#FFF0F2] hover:text-[#E04F5F]"
                                  aria-label={`عكس المعاملة ${transaction.transaction_number}`}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  عكس
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent dir="rtl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد عكس المعاملة</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيُنشأ قيد وحركة مصرفية معاكسان للمعاملة {transaction.transaction_number} مع إبقاء السجل الأصلي.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2 py-2">
                                  <Label htmlFor={`reversal-reason-${transaction.id}`}>سبب العكس</Label>
                                  <Textarea
                                    id={`reversal-reason-${transaction.id}`}
                                    value={reversalReason}
                                    onChange={(event) => setReversalReason(event.target.value)}
                                    placeholder="اكتب سببًا واضحًا للعكس"
                                    rows={2}
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      let idempotencyKey = reversalKeys.current.get(transaction.id);
                                      if (!idempotencyKey) {
                                        idempotencyKey = crypto.randomUUID();
                                        reversalKeys.current.set(transaction.id, idempotencyKey);
                                      }
                                      reverseTransaction.mutate({
                                        transactionId: transaction.id,
                                        reason: reversalReason,
                                        idempotencyKey,
                                      }, {
                                        onSuccess: () => {
                                          reversalKeys.current.delete(transaction.id);
                                          setReversalReason("");
                                        },
                                      });
                                    }}
                                    className="bg-[#E04F5F] hover:bg-[#E04F5F]/90"
                                    disabled={reverseTransaction.isPending || !reversalReason.trim()}
                                  >
                                    {reverseTransaction.isPending ? "جاري العكس..." : "إنشاء حركة عكسية"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog> : <span className="text-xs text-muted-foreground">محمي</span>}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}

          {recentTransactions.length === 0 && !transactionsLoading && (
            <div className="p-6">
              <EmptyState
                icon={ArrowRightLeft}
                title="لا توجد حركات"
                description="لم يتم تسجيل أي حركات بنكية مطابقة. ابدأ بإضافة حركة جديدة."
                onAction={() => setIsCreateTransactionDialogOpen(true)}
                actionLabel="حركة جديدة"
              />
            </div>
          )}
        </motion.section>

        <section className="treasury-reconciliation-shell">
          <BankReconciliationPanel />
        </section>
      </div>

      <Dialog open={isCreateBankDialogOpen} onOpenChange={setIsCreateBankDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء حساب مصرفي جديد</DialogTitle>
            <DialogDescription>أدخل تفاصيل الحساب المصرفي الجديد</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">اسم البنك</Label>
              <Input
                id="bankName"
                value={newBank.bank_name}
                onChange={(event) => setNewBank({ ...newBank, bank_name: event.target.value })}
                placeholder="اسم البنك"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">رقم الحساب</Label>
              <Input
                id="accountNumber"
                value={newBank.account_number}
                onChange={(event) => setNewBank({ ...newBank, account_number: event.target.value })}
                placeholder="رقم الحساب"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="accountType">نوع الحساب</Label>
              <Select value={newBank.account_type} onValueChange={(value) => setNewBank({ ...newBank, account_type: value })}>
                <SelectTrigger id="accountType" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">حساب جاري</SelectItem>
                  <SelectItem value="savings">حساب توفير</SelectItem>
                  <SelectItem value="business">حساب تجاري</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="openingBalance">الرصيد الافتتاحي</Label>
              <Input
                id="openingBalance"
                type="number"
                value={newBank.opening_balance}
                disabled
                placeholder="0.000"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">يُسجل الرصيد الافتتاحي لاحقًا بحركة محاسبية لها حساب مقابل.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
              <Label htmlFor="isPrimary" className="cursor-pointer">حساب رئيسي</Label>
              <Switch
                id="isPrimary"
                checked={newBank.is_primary}
                onCheckedChange={(checked) => setNewBank({ ...newBank, is_primary: checked })}
              />
            </div>
            <Button
              onClick={handleCreateBank}
              className="w-full bg-[#020617] text-white hover:bg-[#020617]/90"
              disabled={createBank.isPending}
            >
              {createBank.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateTransactionDialogOpen} onOpenChange={setIsCreateTransactionDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء معاملة مصرفية جديدة</DialogTitle>
            <DialogDescription>أدخل تفاصيل المعاملة المصرفية الجديدة</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankSelect">البنك</Label>
              <Select value={newTransaction.bank_id} onValueChange={(value) => setNewTransaction({ ...newTransaction, bank_id: value })}>
                <SelectTrigger id="bankSelect" className="mt-1">
                  <SelectValue placeholder="اختر البنك" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bank_name} - {bank.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transactionType">نوع المعاملة</Label>
              <Select value={newTransaction.transaction_type} onValueChange={(value) => setNewTransaction({ ...newTransaction, transaction_type: value })}>
                <SelectTrigger id="transactionType" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">إيداع</SelectItem>
                  <SelectItem value="withdrawal">سحب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bankLedgerAccount">حساب البنك في دليل الحسابات</Label>
              <Select value={newTransaction.bank_account_id} onValueChange={(value) => setNewTransaction({ ...newTransaction, bank_account_id: value })}>
                <SelectTrigger id="bankLedgerAccount" className="mt-1">
                  <SelectValue placeholder="اختر حساب البنك" />
                </SelectTrigger>
                <SelectContent>
                  {bankLedgerAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name_ar || account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="counterpartAccount">الحساب المقابل</Label>
              <Select value={newTransaction.counterpart_account_id} onValueChange={(value) => setNewTransaction({ ...newTransaction, counterpart_account_id: value })}>
                <SelectTrigger id="counterpartAccount" className="mt-1">
                  <SelectValue placeholder="اختر الحساب المقابل" />
                </SelectTrigger>
                <SelectContent>
                  {postableAccounts.filter((account) => account.id !== newTransaction.bank_account_id).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name_ar || account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">المبلغ</Label>
              <Input
                id="amount"
                type="number"
                value={newTransaction.amount}
                onChange={(event) => setNewTransaction({ ...newTransaction, amount: Number(event.target.value) })}
                placeholder="0.000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                value={newTransaction.description}
                onChange={(event) => setNewTransaction({ ...newTransaction, description: event.target.value })}
                placeholder="وصف المعاملة"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="referenceNumber">رقم المرجع (اختياري)</Label>
              <Input
                id="referenceNumber"
                value={newTransaction.reference_number}
                onChange={(event) => setNewTransaction({ ...newTransaction, reference_number: event.target.value })}
                placeholder="رقم المرجع"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCreateTransaction}
              className="w-full bg-[#020617] text-white hover:bg-[#020617]/90"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? "جاري الإنشاء..." : "إنشاء المعاملة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .treasury-system {
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.96), var(--treasury-inner) 360px),
            var(--treasury-inner);
          color: var(--treasury-text);
        }

        .treasury-command,
        .treasury-toolbar,
        .treasury-panel {
          border: 1px solid var(--treasury-border);
          background: var(--treasury-surface);
          border-radius: 8px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.06);
        }

        .treasury-command {
          padding: 24px;
          overflow: hidden;
          position: relative;
        }

        .treasury-command::before {
          content: "";
          position: absolute;
          inset-inline-start: 0;
          top: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, var(--treasury-info), var(--treasury-success), var(--treasury-focus));
        }

        .treasury-command-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: start;
        }

        .treasury-command-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .treasury-snapshot {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 22px;
        }

        .treasury-snapshot-item {
          min-height: 88px;
          border: 1px solid var(--treasury-border);
          background: color-mix(in srgb, var(--treasury-inner) 72%, white);
          border-radius: 8px;
          padding: 14px;
        }

        .treasury-snapshot-label,
        .treasury-bank-balance span {
          display: block;
          color: var(--treasury-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .treasury-snapshot-item strong,
        .treasury-bank-balance strong {
          display: block;
          margin-top: 6px;
          color: var(--treasury-text);
          font-size: 15px;
          font-weight: 900;
          line-height: 1.5;
        }

        .treasury-snapshot-item small {
          display: block;
          margin-top: 4px;
          color: var(--treasury-muted);
          font-size: 12px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .treasury-command-icon,
        .treasury-panel-icon,
        .treasury-metric-icon,
        .treasury-bank-icon,
        .treasury-add-icon,
        .treasury-state-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .treasury-command-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--treasury-info) 14%, white);
          color: var(--treasury-info);
          border: 1px solid color-mix(in srgb, var(--treasury-info) 24%, white);
        }

        .treasury-metric {
          min-height: 126px;
          border: 1px solid var(--treasury-border);
          background: var(--treasury-surface);
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(2, 6, 23, 0.045);
        }

        .treasury-metric-icon,
        .treasury-panel-icon {
          width: 40px;
          height: 40px;
          border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
        }

        .treasury-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
        }

        .treasury-search {
          display: flex;
          align-items: center;
          gap: 8px;
          width: min(100%, 620px);
        }

        .treasury-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          border-bottom: 1px solid var(--treasury-border);
          background: color-mix(in srgb, var(--treasury-inner) 70%, white);
        }

        .treasury-bank-list {
          display: grid;
          gap: 10px;
          padding: 14px;
        }

        .treasury-bank-row,
        .treasury-add-row {
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--treasury-border);
          background: var(--treasury-surface);
          border-radius: 8px;
          padding: 12px;
          color: var(--treasury-text);
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        .treasury-bank-row:hover,
        .treasury-add-row:hover {
          border-color: color-mix(in srgb, var(--treasury-info) 36%, var(--treasury-border));
          box-shadow: 0 10px 26px rgba(2, 6, 23, 0.055);
        }

        .treasury-bank-row-primary {
          background: linear-gradient(90deg, color-mix(in srgb, var(--treasury-info) 7%, white), var(--treasury-surface));
        }

        .treasury-bank-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--treasury-info) 14%, white);
          color: var(--treasury-info);
          border: 1px solid color-mix(in srgb, var(--treasury-info) 24%, white);
        }

        .treasury-bank-balance {
          min-width: 142px;
          text-align: left;
        }

        .treasury-dot {
          display: block;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: var(--treasury-border);
        }

        .treasury-add-row {
          width: 100%;
          justify-content: flex-start;
          border: 1px dashed color-mix(in srgb, var(--treasury-alert) 42%, var(--treasury-border));
          background: var(--treasury-inner);
          text-align: right;
        }

        .treasury-add-row:hover {
          border-color: var(--treasury-alert);
          background: color-mix(in srgb, var(--treasury-alert) 5%, white);
        }

        .treasury-add-row strong,
        .treasury-add-row small {
          display: block;
        }

        .treasury-add-row small {
          margin-top: 2px;
          color: var(--treasury-muted);
          font-size: 12px;
        }

        .treasury-add-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          background: color-mix(in srgb, var(--treasury-alert) 12%, white);
          color: var(--treasury-alert);
        }

        .treasury-panel-note {
          border-top: 1px solid var(--treasury-border);
          background: color-mix(in srgb, var(--treasury-inner) 80%, white);
          color: var(--treasury-muted);
          font-size: 12px;
          font-weight: 800;
          padding: 12px 16px;
        }

        .treasury-reconciliation-shell > * {
          margin: 0;
        }

        .treasury-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          color: var(--treasury-muted);
          text-align: center;
        }

        .treasury-state-icon {
          width: 64px;
          height: 64px;
          color: var(--treasury-alert);
          background: color-mix(in srgb, var(--treasury-alert) 12%, white);
        }

        .treasury-system button,
        .treasury-system input,
        .treasury-system textarea,
        .treasury-system [role="combobox"] {
          border-radius: 8px !important;
        }

        .treasury-system *:focus-visible {
          outline-color: var(--treasury-focus) !important;
          --tw-ring-color: var(--treasury-focus) !important;
        }

        @media (max-width: 760px) {
          .treasury-command {
            padding: 18px;
          }

          .treasury-command-grid,
          .treasury-snapshot {
            grid-template-columns: 1fr;
          }

          .treasury-command-actions,
          .treasury-search {
            width: 100%;
            justify-content: stretch;
          }

          .treasury-search {
            flex-direction: column;
            align-items: stretch;
          }

          .treasury-bank-row,
          .treasury-add-row {
            align-items: flex-start;
          }

          .treasury-bank-balance {
            min-width: 100%;
            text-align: right;
          }

          .treasury-toolbar,
          .treasury-panel-header {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
