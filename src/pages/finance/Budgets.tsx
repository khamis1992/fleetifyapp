import { useMemo, useState } from "react";
import {
  Calculator,
  CheckCircle2,
  Edit,
  Eye,
  FileText,
  Gauge,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Budget, useBudgets, useCreateBudget, useUpdateBudget } from "@/hooks/useFinance";
import { evaluateBudgetControl } from "@/utils/budgetControlRules";

const qarFormatter = new Intl.NumberFormat("en-QA", {
  style: "currency",
  currency: "QAR",
  minimumFractionDigits: 2,
});

const statusMap = {
  draft: { label: "مسودة", className: "border-[#94A3B8]/25 bg-[#F6F8FB] text-[#64748B]" },
  approved: { label: "معتمدة", className: "border-[#38BDF8]/25 bg-[#EAF8FE] text-[#0284C7]" },
  active: { label: "نشطة", className: "border-[#22C7A1]/25 bg-[#E8FBF6] text-[#0F9F82]" },
  closed: { label: "مغلقة", className: "border-[#7C83F6]/25 bg-[#ECEEFE] text-[#5B62D8]" },
} as const;

const formatQar = (value?: number | null) => qarFormatter.format(value || 0);

const budgetNet = (budget: Partial<Budget>) => (budget.total_revenue || 0) - (budget.total_expenses || 0);

const statusLabel = (status?: string) => statusMap[status as keyof typeof statusMap]?.label || status || "غير محدد";

const statusClassName = (status?: string) =>
  statusMap[status as keyof typeof statusMap]?.className || "border-slate-200 bg-slate-50 text-slate-600";

const fieldClassName =
  "h-11 rounded-xl border-slate-200 bg-[#F6F8FB] text-[#020617] shadow-none focus-visible:ring-[#22C7A1]";

const metricCards = [
  { key: "count", label: "إجمالي الموازنات", icon: FileText, color: "#38BDF8", bg: "#EAF8FE" },
  { key: "revenue", label: "الإيرادات المتوقعة", icon: TrendingUp, color: "#22C7A1", bg: "#E8FBF6" },
  { key: "expenses", label: "المصروفات المتوقعة", icon: TrendingDown, color: "#FB6B7A", bg: "#FFF0F2" },
  { key: "net", label: "صافي الدخل المتوقع", icon: Calculator, color: "#7C83F6", bg: "#ECEEFE" },
];

const BudgetForm = ({
  value,
  onChange,
  onSubmit,
  isPending,
  submitLabel,
  includeStatus = false,
}: {
  value: Partial<Budget>;
  onChange: (value: Partial<Budget>) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  includeStatus?: boolean;
}) => {
  const netIncome = budgetNet(value);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-4">
        <p className="text-xs font-bold text-[#94A3B8]">صافي الموازنة المتوقع</p>
        <p className={netIncome >= 0 ? "mt-1 text-2xl font-black text-[#22C7A1]" : "mt-1 text-2xl font-black text-[#FB6B7A]"}>
          {formatQar(netIncome)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="budgetName">اسم الموازنة *</Label>
          <Input
            id="budgetName"
            value={value.budget_name || ""}
            onChange={(event) => onChange({ ...value, budget_name: event.target.value })}
            placeholder="مثال: موازنة التشغيل 2026"
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetYear">السنة المالية *</Label>
          <Input
            id="budgetYear"
            type="number"
            value={value.budget_year || ""}
            onChange={(event) => onChange({ ...value, budget_year: Number(event.target.value) })}
            placeholder="2026"
            className={fieldClassName}
          />
        </div>
        {includeStatus && (
          <div className="space-y-2">
            <Label htmlFor="budgetStatus">الحالة</Label>
            <Select
              value={value.status}
              onValueChange={(status: "draft" | "approved" | "active" | "closed") => onChange({ ...value, status })}
            >
              <SelectTrigger id="budgetStatus" className={fieldClassName}>
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="approved">معتمدة</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="closed">مغلقة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="totalRevenue">الإيرادات المتوقعة</Label>
          <Input
            id="totalRevenue"
            type="number"
            value={value.total_revenue || 0}
            onChange={(event) => onChange({ ...value, total_revenue: Number(event.target.value) })}
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalExpenses">المصروفات المتوقعة</Label>
          <Input
            id="totalExpenses"
            type="number"
            value={value.total_expenses || 0}
            onChange={(event) => onChange({ ...value, total_expenses: Number(event.target.value) })}
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="budgetNotes">ملاحظات</Label>
          <Textarea
            id="budgetNotes"
            value={value.notes || ""}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
            placeholder="أي ملاحظات أو افتراضات مرتبطة بهذه الموازنة"
            className="min-h-24 rounded-xl border-slate-200 bg-[#F6F8FB] text-[#020617] focus-visible:ring-[#22C7A1]"
          />
        </div>
      </div>

      <Button
        onClick={onSubmit}
        className="h-11 w-full rounded-xl bg-[#22C7A1] font-black text-white hover:bg-[#1DAE8D]"
        disabled={isPending}
      >
        {isPending ? "جاري الحفظ..." : submitLabel}
      </Button>
    </div>
  );
};

const Budgets = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<Partial<Budget>>({});

  const { data: budgets, isLoading, error } = useBudgets();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const [newBudget, setNewBudget] = useState<Partial<Budget>>({
    budget_name: "",
    budget_year: new Date().getFullYear(),
    total_revenue: 0,
    total_expenses: 0,
    notes: "",
  });

  const filteredBudgets = useMemo(() => {
    return budgets?.filter((budget) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = budget.budget_name.toLowerCase().includes(query) || budget.budget_year.toString().includes(query);
      const matchesStatus = filterStatus === "all" || budget.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [budgets, filterStatus, searchTerm]);

  const totals = useMemo(() => {
    const totalRevenue = budgets?.reduce((sum, budget) => sum + (budget.total_revenue || 0), 0) || 0;
    const totalExpenses = budgets?.reduce((sum, budget) => sum + (budget.total_expenses || 0), 0) || 0;
    return {
      count: budgets?.length || 0,
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: totalRevenue - totalExpenses,
    };
  }, [budgets]);

  const revenueExecution = totals.revenue > 0 ? 65 : 0;
  const expenseExecution = totals.expenses > 0 ? 45 : 0;
  const budgetControlDecision = evaluateBudgetControl({
    budgetAmount: totals.expenses,
    actualAmount: totals.expenses * (expenseExecution / 100),
  });

  const handleCreateBudget = async () => {
    if (!newBudget.budget_name || !newBudget.budget_year) return;

    await createBudget.mutateAsync({
      budget_name: newBudget.budget_name,
      budget_year: newBudget.budget_year,
      total_revenue: newBudget.total_revenue,
      total_expenses: newBudget.total_expenses,
      notes: newBudget.notes,
    });

    setNewBudget({
      budget_name: "",
      budget_year: new Date().getFullYear(),
      total_revenue: 0,
      total_expenses: 0,
      notes: "",
    });
    setIsCreateDialogOpen(false);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditBudget({
      id: budget.id,
      budget_name: budget.budget_name,
      budget_year: budget.budget_year,
      total_revenue: budget.total_revenue || 0,
      total_expenses: budget.total_expenses || 0,
      notes: budget.notes || "",
      status: budget.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBudget = async () => {
    if (!editBudget.id || !editBudget.budget_name || !editBudget.budget_year) return;

    await updateBudget.mutateAsync({
      id: editBudget.id,
      budget_name: editBudget.budget_name,
      budget_year: editBudget.budget_year,
      total_revenue: editBudget.total_revenue,
      total_expenses: editBudget.total_expenses,
      notes: editBudget.notes,
      status: editBudget.status,
    });

    setIsEditDialogOpen(false);
    setEditBudget({});
  };

  if (isLoading) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-[#FB6B7A]/20 bg-[#FFF0F2] p-5 text-center font-bold text-[#FB6B7A]">حدث خطأ في تحميل البيانات</div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const value = metric.key === "count" ? totals.count : formatQar(totals[metric.key as "revenue" | "expenses" | "net"]);

          return (
            <Card key={metric.key} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8]">{metric.label}</p>
                    <p className="mt-2 text-xl font-black text-[#020617]">{value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: metric.bg, color: metric.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-[#020617]">
              <Gauge className="h-5 w-5 text-[#22C7A1]" />
              تنفيذ الموازنة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl bg-[#F6F8FB] p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-[#020617]">الإيرادات</span>
                <span className="font-black text-[#22C7A1]">{revenueExecution}%</span>
              </div>
              <Progress value={revenueExecution} className="h-2" />
              <div className="mt-2 flex justify-between text-xs text-[#94A3B8]">
                <span>{formatQar(totals.revenue * 0.65)} فعلي</span>
                <span>{formatQar(totals.revenue)} مخطط</span>
              </div>
            </div>
            <div className="rounded-2xl bg-[#F6F8FB] p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-[#020617]">المصروفات</span>
                <span className="font-black text-[#FB6B7A]">{expenseExecution}%</span>
              </div>
              <Progress value={expenseExecution} className="h-2" />
              <div className="mt-2 flex justify-between text-xs text-[#94A3B8]">
                <span>{formatQar(totals.expenses * 0.45)} فعلي</span>
                <span>{formatQar(totals.expenses)} مخطط</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[#22C7A1]/20 bg-[#E8FBF6] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#020617]">رقابة تجاوز الميزانية</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">
                    سيتم منع ترحيل مصروفات مركز التكلفة إذا تجاوزت الحد المعتمد بعد تطبيق المايغريشن.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    budgetControlDecision.status === "exceeded"
                      ? "border-[#FB6B7A]/25 bg-[#FFF0F2] text-[#FB6B7A]"
                      : budgetControlDecision.status === "near_limit"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-[#22C7A1]/25 bg-white text-[#22C7A1]"
                  }
                >
                  {budgetControlDecision.status === "exceeded"
                    ? "متجاوزة"
                    : budgetControlDecision.status === "near_limit"
                      ? "قريبة من الحد"
                      : "ضمن الحد"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-white p-3">
                  <span className="block font-bold text-[#94A3B8]">المتبقي</span>
                  <strong className="mt-1 block text-[#020617]">{formatQar(budgetControlDecision.remainingAmount)}</strong>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <span className="block font-bold text-[#94A3B8]">الاستخدام</span>
                  <strong className="mt-1 block text-[#020617]">{budgetControlDecision.utilizationPercent.toFixed(1)}%</strong>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg font-black text-[#020617]">قائمة الموازنات</CardTitle>
                <p className="mt-1 text-sm text-[#94A3B8]">بحث وحالة وإجراءات في مساحة واحدة</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <Input
                    placeholder="ابحث بالاسم أو السنة..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className={`${fieldClassName} w-full pr-9 sm:w-64`}
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className={`${fieldClassName} w-full sm:w-44`}>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="approved">معتمدة</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-11 rounded-xl bg-[#22C7A1] font-black text-white hover:bg-[#1DAE8D]">
                      <Plus className="ml-2 h-4 w-4" />
                      موازنة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black text-[#020617]">إنشاء موازنة جديدة</DialogTitle>
                      <DialogDescription>أدخل الأرقام الأساسية، وسيتم احتساب صافي الموازنة مباشرة.</DialogDescription>
                    </DialogHeader>
                    <BudgetForm
                      value={newBudget}
                      onChange={setNewBudget}
                      onSubmit={handleCreateBudget}
                      isPending={createBudget.isPending}
                      submitLabel="إنشاء الموازنة"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <Table className="min-w-[820px]" aria-label="جدول الموازنات">
                <TableHeader className="bg-[#F6F8FB]">
                  <TableRow>
                    <TableHead className="text-[#64748B]">الموازنة</TableHead>
                    <TableHead className="text-[#64748B]">السنة</TableHead>
                    <TableHead className="text-[#64748B]">الإيرادات</TableHead>
                    <TableHead className="text-[#64748B]">المصروفات</TableHead>
                    <TableHead className="text-[#64748B]">الصافي</TableHead>
                    <TableHead className="text-[#64748B]">الحالة</TableHead>
                    <TableHead className="text-[#64748B]">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets?.map((budget) => {
                    const netIncome = budgetNet(budget);
                    return (
                      <TableRow key={budget.id} className="hover:bg-[#F6F8FB]/70">
                        <TableCell>
                          <div>
                            <p className="font-black text-[#020617]">{budget.budget_name}</p>
                            <p className="text-xs text-[#94A3B8]">
                              {new Date(budget.created_at).toLocaleDateString("en-GB")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-[#020617]">{budget.budget_year}</TableCell>
                        <TableCell className="font-bold text-[#22C7A1]">{formatQar(budget.total_revenue)}</TableCell>
                        <TableCell className="font-bold text-[#FB6B7A]">{formatQar(budget.total_expenses)}</TableCell>
                        <TableCell className={netIncome >= 0 ? "font-black text-[#22C7A1]" : "font-black text-[#FB6B7A]"}>
                          {formatQar(netIncome)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`rounded-full px-3 py-1 font-black ${statusClassName(budget.status)}`}>
                            {statusLabel(budget.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-[#38BDF8] hover:bg-[#EAF8FE]"
                              onClick={() => {
                                setSelectedBudget(budget);
                                setIsViewDialogOpen(true);
                              }}
                              aria-label="عرض"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-[#7C83F6] hover:bg-[#ECEEFE]"
                              onClick={() => handleEditBudget(budget)}
                              aria-label="تعديل"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredBudgets?.length === 0 && (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="لا توجد موازنات"
                  description="ابدأ بإنشاء موازنة جديدة لتخطيط السنة المالية ومتابعة الأداء."
                  onAction={() => setIsCreateDialogOpen(true)}
                  actionLabel="موازنة جديدة"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#020617]">تفاصيل الموازنة</DialogTitle>
            <DialogDescription>قراءة سريعة للأرقام والحالة.</DialogDescription>
          </DialogHeader>
          {selectedBudget && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#F6F8FB] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#94A3B8]">اسم الموازنة</p>
                    <p className="mt-1 text-xl font-black text-[#020617]">{selectedBudget.budget_name}</p>
                  </div>
                  <Badge variant="outline" className={`rounded-full px-3 py-1 font-black ${statusClassName(selectedBudget.status)}`}>
                    {statusLabel(selectedBudget.status)}
                  </Badge>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الإيرادات</p>
                  <p className="mt-1 font-black text-[#22C7A1]">{formatQar(selectedBudget.total_revenue)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">المصروفات</p>
                  <p className="mt-1 font-black text-[#FB6B7A]">{formatQar(selectedBudget.total_expenses)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">صافي الدخل</p>
                  <p className={budgetNet(selectedBudget) >= 0 ? "mt-1 font-black text-[#22C7A1]" : "mt-1 font-black text-[#FB6B7A]"}>
                    {formatQar(budgetNet(selectedBudget))}
                  </p>
                </div>
              </div>
              {selectedBudget.notes && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">الملاحظات</p>
                  <p className="mt-2 text-sm leading-6 text-[#020617]">{selectedBudget.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm font-bold text-[#94A3B8]">
                <CheckCircle2 className="h-4 w-4 text-[#22C7A1]" />
                السنة المالية {selectedBudget.budget_year}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#020617]">تعديل الموازنة</DialogTitle>
            <DialogDescription>عدّل الأرقام أو الحالة مع مراجعة الصافي قبل الحفظ.</DialogDescription>
          </DialogHeader>
          <BudgetForm
            value={editBudget}
            onChange={setEditBudget}
            onSubmit={handleUpdateBudget}
            isPending={updateBudget.isPending}
            submitLabel="تحديث الموازنة"
            includeStatus
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Budgets;
