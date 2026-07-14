import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  CalendarClock,
  Car,
  CircleDollarSign,
  FileClock,
  Landmark,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useBanks } from "@/hooks/useTreasury";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useFixedAssets } from "@/hooks/useFinance";
import {
  CreateMonthlyObligationInput,
  MonthlyObligation,
  MonthlyObligationInstallment,
  ObligationAccountingTreatment,
  ObligationStatus,
  ObligationType,
  useCreateMonthlyObligation,
  useMonthlyObligationInstallments,
  useMonthlyObligations,
  useMonthlyObligationSummary,
  usePayMonthlyObligationInstallment,
  useUpdateMonthlyObligation,
} from "@/hooks/useMonthlyObligations";
import { useVehicles } from "@/hooks/useVehicles";
import { useVendors } from "@/hooks/useVendors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const obligationTypeLabels: Record<ObligationType, string> = {
  office_rent: "إيجار مكتب",
  staff_housing: "سكن موظفين",
  vehicle_installment: "قسط مركبة",
  vehicle_lease: "تأجير/تمويل مركبة",
  subscription: "اشتراك",
  insurance: "تأمين",
  other: "أخرى",
};

const treatmentLabels: Record<ObligationAccountingTreatment, string> = {
  direct_expense: "مصروف مباشر",
  financing_liability: "التزام تمويلي",
  fixed_asset_financing: "أصل ممول",
  right_of_use_asset: "حق استخدام",
};

const today = new Date().toISOString().slice(0, 10);

type MonthlyObligationFormState = CreateMonthlyObligationInput & {
  status?: ObligationStatus;
};

type ObligationViewMode = "recurring" | "one_time";
type OneTimeObligationCategory =
  | "traffic_violation"
  | "fine"
  | "government_fee"
  | "vendor_invoice"
  | "accrued_expense"
  | "other";

const defaultObligation: CreateMonthlyObligationInput = {
  title: "",
  description: "",
  obligation_type: "office_rent",
  accounting_treatment: "direct_expense",
  vendor_id: "none",
  vehicle_id: "none",
  vehicle_ids: [],
  vehicle_amount_mode: "total",
  fixed_asset_id: "none",
  cost_center_id: "none",
  expense_account_id: "none",
  liability_account_id: "none",
  asset_account_id: "none",
  interest_expense_account_id: "none",
  monthly_amount: 0,
  principal_amount: 0,
  interest_amount: 0,
  currency: "QAR",
  start_date: today,
  end_date: "",
  due_day: 1,
  months_count: 12,
  notes: "",
};

const oneTimeCategoryLabels: Record<OneTimeObligationCategory, string> = {
  traffic_violation: "مخالفة",
  fine: "غرامة",
  government_fee: "رسوم حكومية",
  vendor_invoice: "فاتورة مورد غير متكررة",
  accrued_expense: "مصروف مستحق",
  other: "أخرى",
};

const defaultOneTimeObligation = {
  title: "",
  category: "traffic_violation" as OneTimeObligationCategory,
  amount: 0,
  due_date: today,
  vendor_id: "none",
  vehicle_id: "none",
  expense_account_id: "none",
  liability_account_id: "none",
  notes: "",
};

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-slate-50 text-slate-700 border-slate-200",
  partial: "bg-sky-50 text-sky-700 border-sky-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  paused: "متوقف",
  completed: "مكتمل",
  cancelled: "ملغى",
  pending: "معلق",
  partial: "جزئي",
  paid: "مسدد",
  overdue: "متأخر",
};

const toNumber = (value: string) => Number(value || 0);
const roundMoney = (value: number) =>
  Math.round((Number(value) || 0) * 100) / 100;
const cleanSelect = (value?: string | null) =>
  !value || value === "none" ? undefined : value;

const accountName = (account: any) =>
  `${account.account_code || ""} - ${
    account.account_name_ar || account.account_name || ""
  }`.trim();

const entityLabel = (obligation: MonthlyObligation) => {
  const linkedVehicles =
    obligation.vehicle_links?.filter((link) => link.vehicle) || [];
  if (linkedVehicles.length > 1) {
    const samplePlates = linkedVehicles
      .slice(0, 2)
      .map((link) => link.vehicle?.plate_number)
      .filter(Boolean)
      .join("، ");
    return `${linkedVehicles.length} مركبة${
      samplePlates ? ` • ${samplePlates}` : ""
    }`;
  }

  if (linkedVehicles.length === 1) {
    const vehicle = linkedVehicles[0].vehicle;
    return `${vehicle?.plate_number || "مركبة"} ${vehicle?.make || ""} ${
      vehicle?.model || ""
    }`.trim();
  }

  if (obligation.vehicle) {
    return `${obligation.vehicle.plate_number || "مركبة"} ${
      obligation.vehicle.make || ""
    } ${obligation.vehicle.model || ""}`.trim();
  }

  if (obligation.fixed_asset) {
    return (
      obligation.fixed_asset.asset_name_ar ||
      obligation.fixed_asset.asset_name ||
      obligation.fixed_asset.asset_code ||
      "أصل ثابت"
    );
  }

  if (obligation.vendor) {
    return obligation.vendor.vendor_name_ar || obligation.vendor.vendor_name;
  }

  return "بدون ربط";
};

const obligationVehicleIds = (obligation: MonthlyObligation) => {
  const linkedIds =
    obligation.vehicle_links?.map((link) => link.vehicle_id).filter(Boolean) ||
    [];
  const fallbackIds = obligation.vehicle_id ? [obligation.vehicle_id] : [];
  return Array.from(new Set(linkedIds.length ? linkedIds : fallbackIds));
};

const isOneTimeObligation = (obligation: MonthlyObligation) =>
  obligation.auto_generate === false;

const MonthlyObligations = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const {
    data: obligations = [],
    isLoading,
    error: obligationsError,
    refetch,
  } = useMonthlyObligations();
  const { data: installments = [], error: installmentsError } =
    useMonthlyObligationInstallments();
  const { data: summary } = useMonthlyObligationSummary();
  const { data: vendors = [] } = useVendors();
  const { data: banks = [] } = useBanks();
  const { data: vehicles = [] } = useVehicles({ limit: 600 });
  const { data: fixedAssets = [] } = useFixedAssets();
  const { data: accounts = [] } = useChartOfAccounts();
  const createObligation = useCreateMonthlyObligation();
  const updateObligation = useUpdateMonthlyObligation();
  const payInstallment = usePayMonthlyObligationInstallment();
  const dataError = obligationsError || installmentsError;

  const [viewMode, setViewMode] = useState<ObligationViewMode>("recurring");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [editVehicleSearchTerm, setEditVehicleSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isOneTimeCreateOpen, setIsOneTimeCreateOpen] = useState(false);
  const [editingObligation, setEditingObligation] =
    useState<MonthlyObligation | null>(null);
  const [payingInstallment, setPayingInstallment] =
    useState<MonthlyObligationInstallment | null>(null);
  const [newObligation, setNewObligation] =
    useState<CreateMonthlyObligationInput>(defaultObligation);
  const [oneTimeObligation, setOneTimeObligation] = useState(
    defaultOneTimeObligation
  );
  const [editObligation, setEditObligation] =
    useState<MonthlyObligationFormState | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    idempotency_key: crypto.randomUUID(),
    amount: 0,
    payment_date: today,
    bank_id: "none",
    cash_account_id: "none",
    reference_number: "",
    notes: "",
  });

  const postingAccounts = useMemo(
    () =>
      accounts.filter(
        (account: any) =>
          account.is_active &&
          !account.is_header &&
          Number(account.account_level || 0) >= 3
      ),
    [accounts]
  );
  const expenseAccounts = postingAccounts.filter(
    (account: any) => account.account_type === "expenses"
  );
  const liabilityAccounts = postingAccounts.filter(
    (account: any) => account.account_type === "liabilities"
  );
  const assetAccounts = postingAccounts.filter(
    (account: any) => account.account_type === "assets"
  );
  const cashAccounts = assetAccounts.filter((account: any) => {
    const text = `${account.account_code || ""} ${account.account_name || ""} ${
      account.account_name_ar || ""
    }`.toLowerCase();
    return (
      text.includes("cash") ||
      text.includes("bank") ||
      text.includes("نقد") ||
      text.includes("بنك") ||
      text.startsWith("11")
    );
  });
  const selectedVehicleIds = newObligation.vehicle_ids || [];
  const selectedEditVehicleIds = editObligation?.vehicle_ids || [];
  const visibleVehicles = useMemo(() => {
    const term = vehicleSearchTerm.trim().toLowerCase();
    return vehicles
      .filter((vehicle: any) => {
        if (!term) return true;
        return `${vehicle.plate_number || ""} ${vehicle.make || ""} ${
          vehicle.model || ""
        } ${vehicle.year || ""}`
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 120);
  }, [vehicles, vehicleSearchTerm]);
  const visibleEditVehicles = useMemo(() => {
    const term = editVehicleSearchTerm.trim().toLowerCase();
    return vehicles
      .filter((vehicle: any) => {
        if (!term) return true;
        return `${vehicle.plate_number || ""} ${vehicle.make || ""} ${
          vehicle.model || ""
        } ${vehicle.year || ""}`
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 120);
  }, [vehicles, editVehicleSearchTerm]);

  const recurringObligations = useMemo(
    () => obligations.filter((obligation) => !isOneTimeObligation(obligation)),
    [obligations]
  );
  const oneTimeObligations = useMemo(
    () => obligations.filter((obligation) => isOneTimeObligation(obligation)),
    [obligations]
  );
  const visibleObligations =
    viewMode === "one_time" ? oneTimeObligations : recurringObligations;
  const openInstallmentByObligation = useMemo(() => {
    const pairs = installments
      .filter((item) => !["paid", "cancelled"].includes(item.status))
      .map((item) => [item.obligation_id, item] as const);
    return new Map(pairs);
  }, [installments]);

  const filteredObligations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return visibleObligations.filter((obligation) => {
      const searchable = [
        obligation.title,
        obligation.obligation_number,
        obligation.vendor?.vendor_name,
        obligation.vendor?.vendor_name_ar,
        obligation.vehicle?.plate_number,
        ...(obligation.vehicle_links?.map(
          (link) => link.vehicle?.plate_number
        ) || []),
        obligation.fixed_asset?.asset_code,
        obligation.fixed_asset?.asset_name,
        obligation.fixed_asset?.asset_name_ar,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesStatus =
        statusFilter === "all" || obligation.status === statusFilter;
      const matchesType =
        typeFilter === "all" || obligation.obligation_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [visibleObligations, searchTerm, statusFilter, typeFilter]);

  const upcomingInstallments = useMemo(
    () =>
      installments
        .filter((item) => !["paid", "cancelled"].includes(item.status))
        .slice(0, 12),
    [installments]
  );

  const handleCreate = async () => {
    const monthlyAmount = Number(newObligation.monthly_amount || 0);
    const requiresVehicle = ["vehicle_installment", "vehicle_lease"].includes(
      newObligation.obligation_type
    );

    if (!newObligation.title.trim()) {
      toast.error("اسم الالتزام مطلوب");
      return;
    }

    if (!monthlyAmount || monthlyAmount <= 0) {
      toast.error("المبلغ الشهري مطلوب");
      return;
    }

    if (requiresVehicle && selectedVehicleIds.length === 0) {
      toast.error("اختر مركبة واحدة على الأقل لهذا الالتزام");
      return;
    }

    try {
      await createObligation.mutateAsync({
        ...newObligation,
        title: newObligation.title.trim(),
        vendor_id: cleanSelect(newObligation.vendor_id),
        vehicle_id:
          selectedVehicleIds[0] || cleanSelect(newObligation.vehicle_id),
        vehicle_ids: selectedVehicleIds,
        fixed_asset_id: cleanSelect(newObligation.fixed_asset_id),
        cost_center_id: cleanSelect(newObligation.cost_center_id),
        expense_account_id: cleanSelect(newObligation.expense_account_id),
        liability_account_id: cleanSelect(newObligation.liability_account_id),
        asset_account_id: cleanSelect(newObligation.asset_account_id),
        interest_expense_account_id: cleanSelect(
          newObligation.interest_expense_account_id
        ),
        monthly_amount: monthlyAmount,
        principal_amount: Number(newObligation.principal_amount || 0),
        interest_amount: Number(newObligation.interest_amount || 0),
        due_day: Number(newObligation.due_day || 1),
        months_count: Number(newObligation.months_count || 12),
        end_date: newObligation.end_date || null,
      });
      setNewObligation(defaultObligation);
      setVehicleSearchTerm("");
      setIsCreateOpen(false);
    } catch (error) {
      console.error("[MonthlyObligations] Create obligation failed", error);
    }
  };

  const handleCreateOneTime = async () => {
    const amount = Number(oneTimeObligation.amount || 0);

    if (!oneTimeObligation.title.trim()) {
      toast.error("اسم الالتزام مطلوب");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("مبلغ الالتزام مطلوب");
      return;
    }

    if (!oneTimeObligation.due_date) {
      toast.error("تاريخ الاستحقاق مطلوب");
      return;
    }

    const dueDate = new Date(`${oneTimeObligation.due_date}T00:00:00`);
    const dueDay = dueDate.getDate();
    const liabilityAccountId = cleanSelect(
      oneTimeObligation.liability_account_id
    );
    const expenseAccountId = cleanSelect(oneTimeObligation.expense_account_id);

    if (
      (liabilityAccountId || expenseAccountId) &&
      (!liabilityAccountId || !expenseAccountId)
    ) {
      toast.error("لإنشاء قيد استحقاق اختر حساب المصروف وحساب الالتزام معًا");
      return;
    }

    try {
      await createObligation.mutateAsync({
        title: oneTimeObligation.title.trim(),
        description: oneTimeCategoryLabels[oneTimeObligation.category],
        obligation_type: "other",
        accounting_treatment: liabilityAccountId
          ? "financing_liability"
          : "direct_expense",
        vendor_id: cleanSelect(oneTimeObligation.vendor_id),
        vehicle_id: cleanSelect(oneTimeObligation.vehicle_id),
        vehicle_ids: cleanSelect(oneTimeObligation.vehicle_id)
          ? [oneTimeObligation.vehicle_id]
          : [],
        vehicle_amount_mode: "total",
        fixed_asset_id: undefined,
        cost_center_id: undefined,
        expense_account_id: expenseAccountId,
        liability_account_id: liabilityAccountId,
        asset_account_id: undefined,
        interest_expense_account_id: undefined,
        monthly_amount: amount,
        principal_amount: liabilityAccountId ? amount : 0,
        interest_amount: 0,
        currency: "QAR",
        start_date: oneTimeObligation.due_date,
        end_date: oneTimeObligation.due_date,
        due_day: dueDay,
        months_count: 1,
        auto_generate: false,
        accrue_on_create: !!liabilityAccountId && !!expenseAccountId,
        notes: oneTimeObligation.notes || undefined,
      });
      setOneTimeObligation(defaultOneTimeObligation);
      setIsOneTimeCreateOpen(false);
      setViewMode("one_time");
    } catch (error) {
      console.error(
        "[MonthlyObligations] Create one-time obligation failed",
        error
      );
    }
  };

  const openEditDialog = (obligation: MonthlyObligation) => {
    const vehicleIds = obligationVehicleIds(obligation);
    const amountMode = obligation.vehicle_amount_mode || "total";
    const amountDivisor =
      amountMode === "per_vehicle" ? Math.max(vehicleIds.length, 1) : 1;

    setEditingObligation(obligation);
    setEditVehicleSearchTerm("");
    setEditObligation({
      title: obligation.title || "",
      description: obligation.description || "",
      obligation_type: obligation.obligation_type,
      accounting_treatment: obligation.accounting_treatment,
      vendor_id: obligation.vendor_id || "none",
      vehicle_id: vehicleIds[0] || "none",
      vehicle_ids: vehicleIds,
      vehicle_amount_mode: amountMode,
      fixed_asset_id: obligation.fixed_asset_id || "none",
      cost_center_id: obligation.cost_center_id || "none",
      expense_account_id: obligation.expense_account_id || "none",
      liability_account_id: obligation.liability_account_id || "none",
      asset_account_id: obligation.asset_account_id || "none",
      interest_expense_account_id:
        obligation.interest_expense_account_id || "none",
      monthly_amount: roundMoney(
        Number(obligation.monthly_amount || 0) / amountDivisor
      ),
      principal_amount: roundMoney(
        Number(obligation.principal_amount || 0) / amountDivisor
      ),
      interest_amount: roundMoney(
        Number(obligation.interest_amount || 0) / amountDivisor
      ),
      currency: obligation.currency || "QAR",
      start_date: obligation.start_date || today,
      end_date: obligation.end_date || "",
      due_day: Number(obligation.due_day || 1),
      months_count: obligation.installments?.length || 12,
      auto_generate: obligation.auto_generate,
      notes: obligation.notes || "",
      status: obligation.status,
    });
  };

  const closeEditDialog = () => {
    setEditingObligation(null);
    setEditObligation(null);
    setEditVehicleSearchTerm("");
  };

  const handleUpdate = async () => {
    if (!editingObligation || !editObligation) return;
    const monthlyAmount = Number(editObligation.monthly_amount || 0);
    const requiresVehicle = ["vehicle_installment", "vehicle_lease"].includes(
      editObligation.obligation_type
    );

    if (!editObligation.title.trim()) {
      toast.error("اسم الالتزام مطلوب");
      return;
    }

    if (!monthlyAmount || monthlyAmount <= 0) {
      toast.error("المبلغ الشهري مطلوب");
      return;
    }

    if (requiresVehicle && selectedEditVehicleIds.length === 0) {
      toast.error("اختر مركبة واحدة على الأقل لهذا الالتزام");
      return;
    }

    try {
      await updateObligation.mutateAsync({
        ...editObligation,
        id: editingObligation.id,
        title: editObligation.title.trim(),
        vendor_id: cleanSelect(editObligation.vendor_id),
        vehicle_id:
          selectedEditVehicleIds[0] || cleanSelect(editObligation.vehicle_id),
        vehicle_ids: selectedEditVehicleIds,
        fixed_asset_id: cleanSelect(editObligation.fixed_asset_id),
        cost_center_id: cleanSelect(editObligation.cost_center_id),
        expense_account_id: cleanSelect(editObligation.expense_account_id),
        liability_account_id: cleanSelect(editObligation.liability_account_id),
        asset_account_id: cleanSelect(editObligation.asset_account_id),
        interest_expense_account_id: cleanSelect(
          editObligation.interest_expense_account_id
        ),
        monthly_amount: monthlyAmount,
        principal_amount: Number(editObligation.principal_amount || 0),
        interest_amount: Number(editObligation.interest_amount || 0),
        due_day: Number(editObligation.due_day || 1),
        months_count: Number(editObligation.months_count || 12),
        end_date: editObligation.end_date || null,
        status: editObligation.status || "active",
      });
      closeEditDialog();
    } catch (error) {
      console.error("[MonthlyObligations] Update obligation failed", error);
    }
  };

  const toggleVehicle = (vehicleId: string) => {
    const exists = selectedVehicleIds.includes(vehicleId);
    const nextVehicleIds = exists
      ? selectedVehicleIds.filter((id) => id !== vehicleId)
      : [...selectedVehicleIds, vehicleId];

    setNewObligation({
      ...newObligation,
      vehicle_id: nextVehicleIds[0] || "none",
      vehicle_ids: nextVehicleIds,
    });
  };

  const toggleEditVehicle = (vehicleId: string) => {
    if (!editObligation) return;
    const exists = selectedEditVehicleIds.includes(vehicleId);
    const nextVehicleIds = exists
      ? selectedEditVehicleIds.filter((id) => id !== vehicleId)
      : [...selectedEditVehicleIds, vehicleId];

    setEditObligation({
      ...editObligation,
      vehicle_id: nextVehicleIds[0] || "none",
      vehicle_ids: nextVehicleIds,
    });
  };

  const openPayDialog = (installment: MonthlyObligationInstallment) => {
    setPayingInstallment(installment);
    setPaymentForm({
      idempotency_key: crypto.randomUUID(),
      amount:
        Number(installment.amount || 0) - Number(installment.paid_amount || 0),
      payment_date: today,
      bank_id: "none",
      cash_account_id: "none",
      reference_number: "",
      notes: "",
    });
  };

  const handlePay = async () => {
    if (!payingInstallment) return;
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("مبلغ السداد يجب أن يكون أكبر من صفر");
      return;
    }
    if (!paymentForm.payment_date) {
      toast.error("تاريخ السداد مطلوب");
      return;
    }
    if (!cleanSelect(paymentForm.cash_account_id)) {
      toast.error("اختر حساب النقد أو البنك لإثبات القيد المحاسبي");
      return;
    }
    try {
      await payInstallment.mutateAsync({
        installment_id: payingInstallment.id,
        idempotency_key: paymentForm.idempotency_key,
        amount: Number(paymentForm.amount || 0),
        payment_date: paymentForm.payment_date,
        bank_id: cleanSelect(paymentForm.bank_id),
        cash_account_id: cleanSelect(paymentForm.cash_account_id),
        reference_number: paymentForm.reference_number || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPayingInstallment(null);
    } catch (error) {
      console.error(
        "[MonthlyObligations] Pay obligation installment failed",
        error
      );
    }
  };

  const renderAccountItems = (list: any[]) =>
    list.map((account) => (
      <SelectItem key={account.id} value={account.id}>
        {accountName(account)}
      </SelectItem>
    ));

  return (
    <div className="min-h-screen bg-[#F6F8FB]" dir="rtl">
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/finance")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              النظام المالي
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              الالتزامات
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              تسجيل التكاليف الثابتة والأقساط والمستحقات لمرة واحدة وربط سدادها
              بالخزينة والقيود.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4" />
              تحديث
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  التزام شهري
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-h-[90vh] max-w-5xl overflow-y-auto"
                dir="rtl"
              >
                <DialogHeader>
                  <DialogTitle>إضافة التزام شهري</DialogTitle>
                  <DialogDescription>
                    اختر نوع الالتزام وطريقة معالجته المحاسبية، وسيتم إنشاء جدول
                    استحقاقات شهري.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label>اسم الالتزام</Label>
                    <Input
                      value={newObligation.title}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          title: event.target.value,
                        })
                      }
                      placeholder="مثال: إيجار المكتب الرئيسي"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>النوع</Label>
                    <Select
                      value={newObligation.obligation_type}
                      onValueChange={(value: ObligationType) =>
                        setNewObligation({
                          ...newObligation,
                          obligation_type: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(obligationTypeLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>المعالجة المحاسبية</Label>
                    <Select
                      value={newObligation.accounting_treatment}
                      onValueChange={(value: ObligationAccountingTreatment) =>
                        setNewObligation({
                          ...newObligation,
                          accounting_treatment: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(treatmentLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المورد</Label>
                    <Select
                      value={newObligation.vendor_id || "none"}
                      onValueChange={(value) =>
                        setNewObligation({ ...newObligation, vendor_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مورد</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name_ar || vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>المركبات المرتبطة</Label>
                      <Badge variant="outline">
                        {selectedVehicleIds.length} مركبة
                      </Badge>
                    </div>
                    <Input
                      value={vehicleSearchTerm}
                      onChange={(event) =>
                        setVehicleSearchTerm(event.target.value)
                      }
                      placeholder="ابحث برقم اللوحة أو نوع المركبة"
                    />
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {visibleVehicles.map((vehicle: any) => {
                        const checked = selectedVehicleIds.includes(vehicle.id);
                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() => toggleVehicle(vehicle.id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-right text-sm last:border-b-0 hover:bg-slate-50",
                              checked && "bg-blue-50"
                            )}
                          >
                            <span>
                              <span className="font-semibold text-slate-900">
                                {vehicle.plate_number}
                              </span>
                              <span className="mr-2 text-slate-500">
                                {vehicle.make || ""} {vehicle.model || ""}
                              </span>
                            </span>
                            <Checkbox
                              checked={checked}
                              onClick={(event) => event.stopPropagation()}
                              onCheckedChange={() => toggleVehicle(vehicle.id)}
                            />
                          </button>
                        );
                      })}
                      {!visibleVehicles.length && (
                        <div className="p-4 text-center text-sm text-slate-500">
                          لا توجد مركبات مطابقة.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>الأصل الثابت</Label>
                    <Select
                      value={newObligation.fixed_asset_id || "none"}
                      onValueChange={(value) =>
                        setNewObligation({
                          ...newObligation,
                          fixed_asset_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون أصل</SelectItem>
                        {fixedAssets.map((asset: any) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.asset_code} -{" "}
                            {asset.asset_name_ar || asset.asset_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ الشهري</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newObligation.monthly_amount}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          monthly_amount: toNumber(event.target.value),
                        })
                      }
                    />
                    {selectedVehicleIds.length > 1 &&
                      newObligation.vehicle_amount_mode === "per_vehicle" && (
                        <p className="text-xs text-slate-500">
                          الإجمالي الشهري:{" "}
                          {formatCurrency(
                            Number(newObligation.monthly_amount || 0) *
                              selectedVehicleIds.length
                          )}
                        </p>
                      )}
                  </div>
                  <div className="space-y-2">
                    <Label>طريقة احتساب المركبات</Label>
                    <Select
                      value={newObligation.vehicle_amount_mode || "total"}
                      onValueChange={(value: "total" | "per_vehicle") =>
                        setNewObligation({
                          ...newObligation,
                          vehicle_amount_mode: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">
                          المبلغ إجمالي الالتزام
                        </SelectItem>
                        <SelectItem value="per_vehicle">
                          المبلغ لكل مركبة
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>اليوم المستحق</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={newObligation.due_day}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          due_day: toNumber(event.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>من تاريخ</Label>
                    <Input
                      type="date"
                      value={newObligation.start_date}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          start_date: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>إلى تاريخ</Label>
                    <Input
                      type="date"
                      value={newObligation.end_date || ""}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          end_date: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>عدد الأشهر عند عدم وجود نهاية</Label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={newObligation.months_count}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          months_count: toNumber(event.target.value),
                        })
                      }
                    />
                  </div>

                  {newObligation.accounting_treatment === "direct_expense" ? (
                    <div className="space-y-2 md:col-span-3">
                      <Label>حساب المصروف</Label>
                      <Select
                        value={newObligation.expense_account_id || "none"}
                        onValueChange={(value) =>
                          setNewObligation({
                            ...newObligation,
                            expense_account_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حساب المصروف" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون حساب</SelectItem>
                          {renderAccountItems(expenseAccounts)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>حساب الالتزام</Label>
                        <Select
                          value={newObligation.liability_account_id || "none"}
                          onValueChange={(value) =>
                            setNewObligation({
                              ...newObligation,
                              liability_account_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حساب الالتزام" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون حساب</SelectItem>
                            {renderAccountItems(liabilityAccounts)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>أصل القسط</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newObligation.principal_amount}
                          onChange={(event) =>
                            setNewObligation({
                              ...newObligation,
                              principal_amount: toNumber(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الفائدة الشهرية</Label>
                        <Input
                          type="number"
                          min="0"
                          value={newObligation.interest_amount}
                          onChange={(event) =>
                            setNewObligation({
                              ...newObligation,
                              interest_amount: toNumber(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>حساب مصروف الفوائد</Label>
                        <Select
                          value={
                            newObligation.interest_expense_account_id || "none"
                          }
                          onValueChange={(value) =>
                            setNewObligation({
                              ...newObligation,
                              interest_expense_account_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختياري عند عدم وجود فوائد" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون حساب</SelectItem>
                            {renderAccountItems(expenseAccounts)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>حساب الأصل</Label>
                        <Select
                          value={newObligation.asset_account_id || "none"}
                          onValueChange={(value) =>
                            setNewObligation({
                              ...newObligation,
                              asset_account_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختياري" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون حساب</SelectItem>
                            {renderAccountItems(assetAccounts)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-3">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={newObligation.notes || ""}
                      onChange={(event) =>
                        setNewObligation({
                          ...newObligation,
                          notes: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createObligation.isPending}
                  >
                    حفظ وجدولة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={isOneTimeCreateOpen}
              onOpenChange={setIsOneTimeCreateOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ReceiptText className="h-4 w-4" />
                  التزام لمرة واحدة
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-h-[90vh] max-w-3xl overflow-y-auto"
                dir="rtl"
              >
                <DialogHeader>
                  <DialogTitle>إضافة التزام لمرة واحدة</DialogTitle>
                  <DialogDescription>
                    سجل مخالفة أو غرامة أو رسوم مستحقة بدون خصم من البنك الآن،
                    وسيظهر المبلغ كالتزام غير مدفوع حتى يتم سداده.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>اسم الالتزام</Label>
                    <Input
                      value={oneTimeObligation.title}
                      onChange={(event) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          title: event.target.value,
                        })
                      }
                      placeholder="مثال: مخالفة مرورية - رسوم تجديد - غرامة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>النوع</Label>
                    <Select
                      value={oneTimeObligation.category}
                      onValueChange={(value: OneTimeObligationCategory) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          category: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(oneTimeCategoryLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ المستحق</Label>
                    <Input
                      type="number"
                      min="0"
                      value={oneTimeObligation.amount}
                      onChange={(event) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          amount: toNumber(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ الاستحقاق</Label>
                    <Input
                      type="date"
                      value={oneTimeObligation.due_date}
                      onChange={(event) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          due_date: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المورد/الجهة</Label>
                    <Select
                      value={oneTimeObligation.vendor_id}
                      onValueChange={(value) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          vendor_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مورد</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name_ar || vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>مركبة مرتبطة</Label>
                    <Select
                      value={oneTimeObligation.vehicle_id}
                      onValueChange={(value) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          vehicle_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مركبة</SelectItem>
                        {vehicles.map((vehicle: any) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.plate_number} {vehicle.make || ""}{" "}
                            {vehicle.model || ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>حساب المصروف</Label>
                    <Select
                      value={oneTimeObligation.expense_account_id}
                      onValueChange={(value) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          expense_account_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون حساب</SelectItem>
                        {renderAccountItems(expenseAccounts)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>حساب الالتزام</Label>
                    <Select
                      value={oneTimeObligation.liability_account_id}
                      onValueChange={(value) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          liability_account_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون حساب</SelectItem>
                        {renderAccountItems(liabilityAccounts)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={oneTimeObligation.notes}
                      onChange={(event) =>
                        setOneTimeObligation({
                          ...oneTimeObligation,
                          notes: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsOneTimeCreateOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleCreateOneTime}
                    disabled={createObligation.isPending}
                  >
                    حفظ الالتزام
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title: "التزامات نشطة",
              value: summary?.activeCount || 0,
              icon: FileClock,
              tone: "text-slate-700",
            },
            {
              title: "الالتزام الشهري",
              value: formatCurrency(summary?.monthlyCommittedAmount || 0),
              icon: WalletCards,
              tone: "text-blue-700",
            },
            {
              title: "مستحق هذا الشهر",
              value: formatCurrency(summary?.dueThisMonthAmount || 0),
              icon: CalendarClock,
              tone: "text-amber-700",
            },
            {
              title: "متأخر",
              value: formatCurrency(summary?.overdueAmount || 0),
              icon: AlertTriangle,
              tone: "text-rose-700",
            },
            {
              title: "مستحق لمرة واحدة",
              value: formatCurrency(summary?.oneTimeOutstandingAmount || 0),
              icon: ReceiptText,
              tone: "text-sky-700",
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{item.title}</span>
                  <Icon className={cn("h-5 w-5", item.tone)} />
                </div>
                <div className="mt-3 text-xl font-bold text-slate-950">
                  {item.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        {dataError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            لم يتم تحميل بيانات الالتزامات. إذا كانت هذه أول مرة تستخدم الصفحة،
            طبّق هجرة قاعدة البيانات الخاصة بالالتزامات الشهرية ثم أعد فتح
            الصفحة.
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "recurring" ? "default" : "ghost"}
              onClick={() => {
                setViewMode("recurring");
                setTypeFilter("all");
              }}
            >
              <CalendarClock className="h-4 w-4" />
              شهرية
              <Badge variant="secondary" className="mr-1">
                {recurringObligations.length}
              </Badge>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === "one_time" ? "default" : "ghost"}
              onClick={() => {
                setViewMode("one_time");
                setTypeFilter("all");
              }}
            >
              <ReceiptText className="h-4 w-4" />
              لمرة واحدة
              <Badge variant="secondary" className="mr-1">
                {oneTimeObligations.length}
              </Badge>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pr-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="ابحث بالاسم، المورد، اللوحة، أو رقم الالتزام"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="paused">متوقف</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغى</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(obligationTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="font-semibold text-slate-950">
                  {viewMode === "one_time"
                    ? "سجل الالتزامات لمرة واحدة"
                    : "سجل الالتزامات الشهرية"}
                </h2>
                <p className="text-xs text-slate-500">
                  {filteredObligations.length} التزام ظاهر
                </p>
              </div>
              <Badge variant="outline">
                {isLoading ? "جاري التحميل" : "جاهز"}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الالتزام</TableHead>
                  <TableHead className="text-right">الربط</TableHead>
                  <TableHead className="text-right">المعالجة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="w-16 text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObligations.map((obligation) => {
                  const openInstallment = openInstallmentByObligation.get(
                    obligation.id
                  );
                  return (
                    <TableRow key={obligation.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-950">
                          {obligation.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {obligation.obligation_number} •{" "}
                          {isOneTimeObligation(obligation)
                            ? obligation.description || "التزام لمرة واحدة"
                            : obligationTypeLabels[obligation.obligation_type]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          {obligation.vehicle_id ? (
                            <Car className="h-4 w-4 text-slate-400" />
                          ) : obligation.vendor_id ? (
                            <Building2 className="h-4 w-4 text-slate-400" />
                          ) : (
                            <CircleDollarSign className="h-4 w-4 text-slate-400" />
                          )}
                          <span>{entityLabel(obligation)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {treatmentLabels[obligation.accounting_treatment]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(Number(obligation.monthly_amount || 0))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border",
                            statusStyles[obligation.status]
                          )}
                        >
                          {statusLabels[obligation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {openInstallment && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="سداد الالتزام"
                              onClick={() => openPayDialog(openInstallment)}
                            >
                              <Banknote className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="تعديل الالتزام"
                            onClick={() => openEditDialog(obligation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredObligations.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-sm text-slate-500"
                    >
                      لا توجد التزامات مطابقة.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="font-semibold text-slate-950">
                  الاستحقاقات القادمة
                </h2>
                <p className="text-xs text-slate-500">
                  الأقساط غير المسددة مرتبة حسب التاريخ
                </p>
              </div>
              <Landmark className="h-5 w-5 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-100">
              {upcomingInstallments.map((installment) => {
                const remaining =
                  Number(installment.amount || 0) -
                  Number(installment.paid_amount || 0);
                return (
                  <div key={installment.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">
                          {installment.obligation?.title || "التزام شهري"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          استحقاق {installment.due_date} • قسط{" "}
                          {installment.installment_number}
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "border",
                          statusStyles[installment.status]
                        )}
                      >
                        {statusLabels[installment.status] || installment.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500">المتبقي</div>
                        <div className="font-bold text-slate-950">
                          {formatCurrency(remaining)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openPayDialog(installment)}
                      >
                        <Banknote className="h-4 w-4" />
                        سداد
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!upcomingInstallments.length && (
                <div className="p-8 text-center text-sm text-slate-500">
                  لا توجد استحقاقات مفتوحة.
                </div>
              )}
            </div>
          </section>
        </div>

        <Dialog
          open={!!editingObligation}
          onOpenChange={(open) => !open && closeEditDialog()}
        >
          <DialogContent
            className="max-h-[90vh] max-w-5xl overflow-y-auto"
            dir="rtl"
          >
            <DialogHeader>
              <DialogTitle>تعديل الالتزام</DialogTitle>
              <DialogDescription>
                يتم تحديث بيانات الالتزام والأقساط المفتوحة فقط، ولا يتم تعديل
                الأقساط التي تم سدادها.
              </DialogDescription>
            </DialogHeader>

            {editObligation && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label>اسم الالتزام</Label>
                    <Input
                      value={editObligation.title}
                      onChange={(event) =>
                        setEditObligation({
                          ...editObligation,
                          title: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select
                      value={editObligation.status || "active"}
                      onValueChange={(value: ObligationStatus) =>
                        setEditObligation({ ...editObligation, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="paused">متوقف</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>النوع</Label>
                    <Select
                      value={editObligation.obligation_type}
                      onValueChange={(value: ObligationType) =>
                        setEditObligation({
                          ...editObligation,
                          obligation_type: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(obligationTypeLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المعالجة المحاسبية</Label>
                    <Select
                      value={editObligation.accounting_treatment}
                      onValueChange={(value: ObligationAccountingTreatment) =>
                        setEditObligation({
                          ...editObligation,
                          accounting_treatment: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(treatmentLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المورد</Label>
                    <Select
                      value={editObligation.vendor_id || "none"}
                      onValueChange={(value) =>
                        setEditObligation({
                          ...editObligation,
                          vendor_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مورد</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name_ar || vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>المركبات المرتبطة</Label>
                      <Badge variant="outline">
                        {selectedEditVehicleIds.length} مركبة
                      </Badge>
                    </div>
                    <Input
                      value={editVehicleSearchTerm}
                      onChange={(event) =>
                        setEditVehicleSearchTerm(event.target.value)
                      }
                      placeholder="ابحث برقم اللوحة أو نوع المركبة"
                    />
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      {visibleEditVehicles.map((vehicle: any) => {
                        const checked = selectedEditVehicleIds.includes(
                          vehicle.id
                        );
                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() => toggleEditVehicle(vehicle.id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-right text-sm last:border-b-0 hover:bg-slate-50",
                              checked && "bg-blue-50"
                            )}
                          >
                            <span>
                              <span className="font-semibold text-slate-900">
                                {vehicle.plate_number}
                              </span>
                              <span className="mr-2 text-slate-500">
                                {[vehicle.make, vehicle.model, vehicle.year]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </span>
                            <Checkbox
                              checked={checked}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>الأصل الثابت</Label>
                    <Select
                      value={editObligation.fixed_asset_id || "none"}
                      onValueChange={(value) =>
                        setEditObligation({
                          ...editObligation,
                          fixed_asset_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون أصل</SelectItem>
                        {fixedAssets.map((asset: any) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.asset_name_ar ||
                              asset.asset_name ||
                              asset.asset_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>طريقة احتساب المبلغ</Label>
                    <Select
                      value={editObligation.vehicle_amount_mode || "total"}
                      onValueChange={(value: "total" | "per_vehicle") =>
                        setEditObligation({
                          ...editObligation,
                          vehicle_amount_mode: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">المبلغ إجمالي</SelectItem>
                        <SelectItem value="per_vehicle">
                          المبلغ لكل مركبة
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المبلغ الشهري</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editObligation.monthly_amount}
                      onChange={(event) =>
                        setEditObligation({
                          ...editObligation,
                          monthly_amount: toNumber(event.target.value),
                        })
                      }
                    />
                    {editObligation.vehicle_amount_mode === "per_vehicle" &&
                      selectedEditVehicleIds.length > 1 && (
                        <div className="text-xs text-slate-500">
                          الإجمالي:{" "}
                          {formatCurrency(
                            Number(editObligation.monthly_amount || 0) *
                              selectedEditVehicleIds.length
                          )}
                        </div>
                      )}
                  </div>
                  <div className="space-y-2">
                    <Label>يوم الاستحقاق</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={editObligation.due_day}
                      onChange={(event) =>
                        setEditObligation({
                          ...editObligation,
                          due_day: toNumber(event.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>تاريخ البداية</Label>
                    <Input
                      type="date"
                      value={editObligation.start_date}
                      onChange={(event) =>
                        setEditObligation({
                          ...editObligation,
                          start_date: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ النهاية</Label>
                    <Input
                      type="date"
                      value={editObligation.end_date || ""}
                      onChange={(event) =>
                        setEditObligation({
                          ...editObligation,
                          end_date: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>حساب المصروف</Label>
                    <Select
                      value={editObligation.expense_account_id || "none"}
                      onValueChange={(value) =>
                        setEditObligation({
                          ...editObligation,
                          expense_account_id: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختياري" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون حساب</SelectItem>
                        {renderAccountItems(expenseAccounts)}
                      </SelectContent>
                    </Select>
                  </div>

                  {editObligation.accounting_treatment !== "direct_expense" && (
                    <>
                      <div className="space-y-2">
                        <Label>حساب الالتزام</Label>
                        <Select
                          value={editObligation.liability_account_id || "none"}
                          onValueChange={(value) =>
                            setEditObligation({
                              ...editObligation,
                              liability_account_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختياري" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون حساب</SelectItem>
                            {renderAccountItems(liabilityAccounts)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>أصل القسط</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editObligation.principal_amount}
                          onChange={(event) =>
                            setEditObligation({
                              ...editObligation,
                              principal_amount: toNumber(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الفائدة الشهرية</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editObligation.interest_amount}
                          onChange={(event) =>
                            setEditObligation({
                              ...editObligation,
                              interest_amount: toNumber(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>حساب مصروف الفوائد</Label>
                        <Select
                          value={
                            editObligation.interest_expense_account_id || "none"
                          }
                          onValueChange={(value) =>
                            setEditObligation({
                              ...editObligation,
                              interest_expense_account_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختياري" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون حساب</SelectItem>
                            {renderAccountItems(expenseAccounts)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-3">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={editObligation.notes || ""}
                      onChange={(event) =>
                        setEditObligation({
                          ...editObligation,
                          notes: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={closeEditDialog}>
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={updateObligation.isPending}
                  >
                    حفظ التعديل
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!payingInstallment}
          onOpenChange={(open) => !open && setPayingInstallment(null)}
        >
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>تسجيل سداد الالتزام</DialogTitle>
              <DialogDescription>
                سيتم تحديث القسط وربطه بحركة الخزينة، وسينشأ قيد محاسبي عند
                اختيار حساب النقد/البنك.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <div className="font-semibold text-slate-950">
                  {payingInstallment?.obligation?.title}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  المتبقي:{" "}
                  {formatCurrency(
                    Number(payingInstallment?.amount || 0) -
                      Number(payingInstallment?.paid_amount || 0)
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>مبلغ السداد</Label>
                <Input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: toNumber(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ السداد</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_date: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>البنك (اختياري للسداد النقدي)</Label>
                <Select
                  value={paymentForm.bank_id}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, bank_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختياري" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون حركة بنك</SelectItem>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bank_name_ar || bank.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>حساب النقد/البنك للقيد *</Label>
                <Select
                  value={paymentForm.cash_account_id}
                  onValueChange={(value) =>
                    setPaymentForm({ ...paymentForm, cash_account_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حساب الترحيل" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderAccountItems(
                      cashAccounts.length ? cashAccounts : assetAccounts
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>رقم مرجعي</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference_number: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input
                  value={paymentForm.notes}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPayingInstallment(null)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handlePay}
                disabled={
                  payInstallment.isPending ||
                  !paymentForm.payment_date ||
                  Number(paymentForm.amount || 0) <= 0 ||
                  !cleanSelect(paymentForm.cash_account_id)
                }
              >
                تسجيل السداد
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MonthlyObligations;
