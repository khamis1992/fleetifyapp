import { useMemo, useState } from "react";
import {
  Building,
  Edit,
  Eye,
  Layers3,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CostCenter, useCreateCostCenter, useDeleteCostCenter, useUpdateCostCenter } from "@/hooks/useFinance";
import { useCostCenters } from "@/hooks/useCostCenters";

const qarFormatter = new Intl.NumberFormat("en-QA", {
  style: "currency",
  currency: "QAR",
  minimumFractionDigits: 2,
});

const formatQar = (value?: number | null) => qarFormatter.format(value || 0);

const fieldClassName =
  "h-11 rounded-xl border-slate-200 bg-[#F6F8FB] text-[#020617] shadow-none focus-visible:ring-[#22C7A1]";

const utilizationTone = (value: number) => {
  if (value > 100) return { text: "#FB6B7A", bg: "#FFF0F2", label: "تجاوز" };
  if (value >= 80) return { text: "#F59E0B", bg: "#FFF7E6", label: "مرتفع" };
  return { text: "#22C7A1", bg: "#E8FBF6", label: "ضمن الخطة" };
};

const CostCenterForm = ({
  value,
  onChange,
  onSubmit,
  isPending,
  submitLabel,
}: {
  value: Partial<CostCenter>;
  onChange: (value: Partial<CostCenter>) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}) => {
  const budgetAmount = value.budget_amount || 0;
  const actualAmount = value.actual_amount || 0;
  const remaining = budgetAmount - actualAmount;
  const utilization = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
  const tone = utilizationTone(utilization);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-4">
          <p className="text-xs font-bold text-[#94A3B8]">المخصص</p>
          <p className="mt-1 font-black text-[#020617]">{formatQar(budgetAmount)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-4">
          <p className="text-xs font-bold text-[#94A3B8]">الفعلي</p>
          <p className="mt-1 font-black text-[#7C83F6]">{formatQar(actualAmount)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-[#F6F8FB] p-4">
          <p className="text-xs font-bold text-[#94A3B8]">المتبقي</p>
          <p className={remaining >= 0 ? "mt-1 font-black text-[#22C7A1]" : "mt-1 font-black text-[#FB6B7A]"}>
            {formatQar(remaining)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: tone.bg }}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-[#020617]">نسبة الاستغلال</span>
          <span className="font-black" style={{ color: tone.text }}>{utilization.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(utilization, 100)} className="h-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="centerCode">رمز المركز *</Label>
          <Input
            id="centerCode"
            value={value.center_code || ""}
            onChange={(event) => onChange({ ...value, center_code: event.target.value })}
            placeholder="CC001"
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="centerName">اسم المركز *</Label>
          <Input
            id="centerName"
            value={value.center_name || ""}
            onChange={(event) => onChange({ ...value, center_name: event.target.value })}
            placeholder="تشغيل الأسطول"
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="centerNameAr">الاسم بالعربية</Label>
          <Input
            id="centerNameAr"
            value={value.center_name_ar || ""}
            onChange={(event) => onChange({ ...value, center_name_ar: event.target.value })}
            placeholder="اسم مركز التكلفة بالعربية"
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budgetAmount">المبلغ المخصص</Label>
          <Input
            id="budgetAmount"
            type="number"
            value={value.budget_amount || 0}
            onChange={(event) => onChange({ ...value, budget_amount: Number(event.target.value) })}
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="actualAmount">المصروف الفعلي</Label>
          <Input
            id="actualAmount"
            type="number"
            value={value.actual_amount || 0}
            onChange={(event) => onChange({ ...value, actual_amount: Number(event.target.value) })}
            className={fieldClassName}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="centerDescription">الوصف</Label>
          <Textarea
            id="centerDescription"
            value={value.description || ""}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            placeholder="وصف مختصر لطبيعة المصروفات التي تسجل على هذا المركز"
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

export default function CostCenters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);

  const { data: costCenters, isLoading, error } = useCostCenters();
  const createCostCenter = useCreateCostCenter();
  const updateCostCenter = useUpdateCostCenter();
  const deleteCostCenter = useDeleteCostCenter();

  const [newCostCenter, setNewCostCenter] = useState<Partial<CostCenter>>({
    center_code: "",
    center_name: "",
    center_name_ar: "",
    description: "",
    budget_amount: 0,
    actual_amount: 0,
    is_active: true,
  });

  const filteredCostCenters = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return costCenters?.filter((center) => {
      return (
        center.center_name.toLowerCase().includes(query) ||
        (center.center_name_ar || "").toLowerCase().includes(query) ||
        center.center_code.toLowerCase().includes(query)
      );
    });
  }, [costCenters, searchTerm]);

  const totals = useMemo(() => {
    const totalBudget = costCenters?.reduce((sum, center) => sum + (center.budget_amount || 0), 0) || 0;
    const totalActual = costCenters?.reduce((sum, center) => sum + (center.actual_amount || 0), 0) || 0;
    const activeCenters = costCenters?.filter((center) => center.is_active !== false).length || 0;
    return {
      count: costCenters?.length || 0,
      activeCenters,
      totalBudget,
      totalActual,
      remaining: totalBudget - totalActual,
      utilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    };
  }, [costCenters]);

  const handleCreateCostCenter = async () => {
    if (!newCostCenter.center_code || !newCostCenter.center_name) return;

    await createCostCenter.mutateAsync({
      center_code: newCostCenter.center_code,
      center_name: newCostCenter.center_name,
      center_name_ar: newCostCenter.center_name_ar,
      description: newCostCenter.description,
      budget_amount: newCostCenter.budget_amount,
      actual_amount: newCostCenter.actual_amount,
    });

    setNewCostCenter({
      center_code: "",
      center_name: "",
      center_name_ar: "",
      description: "",
      budget_amount: 0,
      actual_amount: 0,
      is_active: true,
    });
    setIsCreateDialogOpen(false);
  };

  const handleViewCostCenter = (center: CostCenter) => {
    setSelectedCostCenter(center);
    setIsViewDialogOpen(true);
  };

  const handleEditCostCenter = (center: CostCenter) => {
    setSelectedCostCenter(center);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCostCenter = async () => {
    if (!selectedCostCenter) return;

    await updateCostCenter.mutateAsync({
      id: selectedCostCenter.id,
      center_code: selectedCostCenter.center_code,
      center_name: selectedCostCenter.center_name,
      center_name_ar: selectedCostCenter.center_name_ar,
      description: selectedCostCenter.description,
      budget_amount: selectedCostCenter.budget_amount,
      actual_amount: selectedCostCenter.actual_amount,
    });

    setIsEditDialogOpen(false);
    setSelectedCostCenter(null);
  };

  const handleDeleteCostCenter = async (centerId: string) => {
    await deleteCostCenter.mutateAsync(centerId);
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
    <TooltipProvider>
      <div className="space-y-5" dir="rtl">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">إجمالي المراكز</p>
                  <p className="mt-2 text-xl font-black text-[#020617]">{totals.count}</p>
                  <p className="mt-1 text-xs font-bold text-[#22C7A1]">{totals.activeCenters} نشط</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF8FE] text-[#38BDF8]">
                  <Building className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">إجمالي الموازنة</p>
                  <p className="mt-2 text-xl font-black text-[#020617]">{formatQar(totals.totalBudget)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ECEEFE] text-[#7C83F6]">
                  <Target className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">المصروف الفعلي</p>
                  <p className="mt-2 text-xl font-black text-[#020617]">{formatQar(totals.totalActual)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8FBF6] text-[#22C7A1]">
                  <WalletCards className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-[#94A3B8]">نسبة الاستغلال</p>
                  <p className="mt-2 text-xl font-black text-[#020617]">{totals.utilization.toFixed(1)}%</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF0F2] text-[#FB6B7A]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-black text-[#020617]">
                <Layers3 className="h-5 w-5 text-[#7C83F6]" />
                قراءة سريعة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-[#F6F8FB] p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-[#020617]">استهلاك الموازنة</span>
                  <span className="font-black text-[#22C7A1]">{totals.utilization.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(totals.utilization, 100)} className="h-2" />
                <div className="mt-3 flex justify-between text-xs font-bold text-[#94A3B8]">
                  <span>الفعلي {formatQar(totals.totalActual)}</span>
                  <span>المخصص {formatQar(totals.totalBudget)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-[#94A3B8]">المتبقي على مستوى كل المراكز</p>
                <p className={totals.remaining >= 0 ? "mt-1 text-2xl font-black text-[#22C7A1]" : "mt-1 text-2xl font-black text-[#FB6B7A]"}>
                  {formatQar(totals.remaining)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-[#020617]">مراكز التكلفة</CardTitle>
                  <p className="mt-1 text-sm text-[#94A3B8]">بحث بالرمز أو الاسم العربي/الإنجليزي مع متابعة الاستغلال</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <Input
                      placeholder="ابحث عن مركز تكلفة..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className={`${fieldClassName} w-full pr-9 sm:w-72`}
                    />
                  </div>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-11 rounded-xl bg-[#22C7A1] font-black text-white hover:bg-[#1DAE8D]">
                        <Plus className="ml-2 h-4 w-4" />
                        مركز جديد
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-[#020617]">إنشاء مركز تكلفة</DialogTitle>
                        <DialogDescription>عرّف المركز وحدد المخصص المالي ليظهر أثره في المتابعة.</DialogDescription>
                      </DialogHeader>
                      <CostCenterForm
                        value={newCostCenter}
                        onChange={setNewCostCenter}
                        onSubmit={handleCreateCostCenter}
                        isPending={createCostCenter.isPending}
                        submitLabel="إنشاء المركز"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <Table className="min-w-[900px]" aria-label="جدول مراكز التكلفة">
                  <TableHeader className="bg-[#F6F8FB]">
                    <TableRow>
                      <TableHead className="text-[#64748B]">المركز</TableHead>
                      <TableHead className="text-[#64748B]">المخصص</TableHead>
                      <TableHead className="text-[#64748B]">الفعلي</TableHead>
                      <TableHead className="text-[#64748B]">المتبقي</TableHead>
                      <TableHead className="text-[#64748B]">الاستغلال</TableHead>
                      <TableHead className="text-[#64748B]">الحالة</TableHead>
                      <TableHead className="text-[#64748B]">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCostCenters?.map((center) => {
                      const budgetAmount = center.budget_amount || 0;
                      const actualAmount = center.actual_amount || 0;
                      const remaining = budgetAmount - actualAmount;
                      const utilization = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
                      const tone = utilizationTone(utilization);

                      return (
                        <TableRow key={center.id} className="hover:bg-[#F6F8FB]/70">
                          <TableCell>
                            <div>
                              <p className="font-black text-[#020617]">{center.center_name}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#F6F8FB] px-2 py-0.5 text-xs font-bold text-[#64748B]">
                                  {center.center_code}
                                </span>
                                {center.center_name_ar && <span className="text-xs text-[#94A3B8]">{center.center_name_ar}</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-[#020617]">{formatQar(budgetAmount)}</TableCell>
                          <TableCell className="font-bold text-[#7C83F6]">{formatQar(actualAmount)}</TableCell>
                          <TableCell className={remaining >= 0 ? "font-black text-[#22C7A1]" : "font-black text-[#FB6B7A]"}>
                            {formatQar(remaining)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="rounded-full border-transparent px-3 py-1 font-black"
                              style={{ backgroundColor: tone.bg, color: tone.text }}
                            >
                              {tone.label} · {utilization.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                center.is_active !== false
                                  ? "rounded-full border-[#22C7A1]/25 bg-[#E8FBF6] px-3 py-1 font-black text-[#0F9F82]"
                                  : "rounded-full border-[#94A3B8]/25 bg-[#F6F8FB] px-3 py-1 font-black text-[#64748B]"
                              }
                            >
                              {center.is_active !== false ? "نشط" : "غير نشط"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewCostCenter(center as CostCenter)}
                                    className="h-9 w-9 rounded-xl text-[#38BDF8] hover:bg-[#EAF8FE]"
                                    aria-label="عرض التفاصيل"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>عرض التفاصيل</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditCostCenter(center as CostCenter)}
                                    className="h-9 w-9 rounded-xl text-[#7C83F6] hover:bg-[#ECEEFE]"
                                    aria-label="تعديل"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>تعديل</TooltipContent>
                              </Tooltip>

                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl text-[#FB6B7A] hover:bg-[#FFF0F2]"
                                        aria-label="حذف"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>حذف</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent dir="rtl" className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-[#020617]">تأكيد حذف مركز التكلفة</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      سيتم حذف "{center.center_name}". هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteCostCenter(center.id)}
                                      className="bg-[#FB6B7A] text-white hover:bg-[#E75B69]"
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {filteredCostCenters?.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    icon={Target}
                    title="لا توجد مراكز تكلفة"
                    description="أنشئ مركز تكلفة لتوزيع المصروفات ومراقبة الاستغلال حسب الإدارة أو المشروع."
                    onAction={() => setIsCreateDialogOpen(true)}
                    actionLabel="مركز جديد"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#020617]">تفاصيل مركز التكلفة</DialogTitle>
              <DialogDescription>عرض المخصص والفعلي والمتبقي لهذا المركز.</DialogDescription>
            </DialogHeader>
            {selectedCostCenter && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#F6F8FB] p-4">
                  <p className="text-xs font-bold text-[#94A3B8]">المركز</p>
                  <p className="mt-1 text-xl font-black text-[#020617]">{selectedCostCenter.center_name}</p>
                  <p className="mt-1 text-sm font-bold text-[#94A3B8]">{selectedCostCenter.center_code}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-[#94A3B8]">المخصص</p>
                    <p className="mt-1 font-black text-[#020617]">{formatQar(selectedCostCenter.budget_amount)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-[#94A3B8]">الفعلي</p>
                    <p className="mt-1 font-black text-[#7C83F6]">{formatQar(selectedCostCenter.actual_amount)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-[#94A3B8]">المتبقي</p>
                    <p className="mt-1 font-black text-[#22C7A1]">
                      {formatQar((selectedCostCenter.budget_amount || 0) - (selectedCostCenter.actual_amount || 0))}
                    </p>
                  </div>
                </div>
                {selectedCostCenter.description && (
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold text-[#94A3B8]">الوصف</p>
                    <p className="mt-2 text-sm leading-6 text-[#020617]">{selectedCostCenter.description}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl rounded-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#020617]">تعديل مركز التكلفة</DialogTitle>
              <DialogDescription>حدّث بيانات المركز وراجع نسبة الاستغلال قبل الحفظ.</DialogDescription>
            </DialogHeader>
            {selectedCostCenter && (
              <CostCenterForm
                value={selectedCostCenter}
                onChange={(value) => setSelectedCostCenter(value as CostCenter)}
                onSubmit={handleUpdateCostCenter}
                isPending={updateCostCenter.isPending}
                submitLabel="تحديث المركز"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
