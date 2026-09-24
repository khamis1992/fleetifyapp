import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSalesOpportunities, useCreateSalesOpportunity, useUpdateSalesOpportunity, useDeleteSalesOpportunity, type SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { Target, Plus, Search, Edit, Trash2, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const stageTones: Record<string, string> = {
  lead: 'is-neutral',
  qualified: 'is-info',
  proposal: 'is-warn',
  negotiation: 'is-warn',
  won: 'is-ok',
  lost: 'is-risk',
};

const SalesOpportunities = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState("overview");

  const { data: opportunities, isLoading } = useSalesOpportunities({
    search: searchTerm,
    is_active: true,
  });
  const createOpportunity = useCreateSalesOpportunity();
  const updateOpportunity = useUpdateSalesOpportunity();
  const deleteOpportunity = useDeleteSalesOpportunity();

  // Form state
  const [formData, setFormData] = useState({
    opportunity_name: "",
    opportunity_name_ar: "",
    stage: "lead",
    estimated_value: 0,
    probability: 50,
    expected_close_date: "",
    notes: "",
    is_active: true,
  });

  const filteredOpportunities = opportunities?.filter(opp => {
    const matchesStage = selectedStage === "all" || opp.stage === selectedStage;
    const matchesTab = activeTab === "all" || opp.stage === activeTab;
    return matchesStage && matchesTab;
  }) || [];

  const handleCreateOpportunity = async () => {
    try {
      await createOpportunity.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating opportunity:", error);
    }
  };

  const handleUpdateOpportunity = async () => {
    if (!selectedOpportunity) return;
    try {
      await updateOpportunity.mutateAsync({
        id: selectedOpportunity.id,
        data: formData,
      });
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating opportunity:", error);
    }
  };

  const handleDeleteOpportunity = async (opportunity: SalesOpportunity) => {
    try {
      await deleteOpportunity.mutateAsync(opportunity.id);
    } catch (error) {
      console.error("Error deleting opportunity:", error);
    }
  };

  const handleEditOpportunity = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setFormData({
      opportunity_name: opportunity.opportunity_name,
      opportunity_name_ar: opportunity.opportunity_name_ar || "",
      stage: opportunity.stage ?? "lead",
      estimated_value: opportunity.estimated_value ?? 0,
      probability: opportunity.probability ?? 0,
      expected_close_date: opportunity.expected_close_date || "",
      notes: opportunity.notes || "",
      is_active: opportunity.is_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (opportunity: SalesOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsDetailsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      opportunity_name: "",
      opportunity_name_ar: "",
      stage: "lead",
      estimated_value: 0,
      probability: 50,
      expected_close_date: "",
      notes: "",
      is_active: true,
    });
    setSelectedOpportunity(null);
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      lead: 'عميل محتمل',
      qualified: 'مؤهل',
      proposal: 'عرض سعر',
      negotiation: 'تفاوض',
      won: 'مغلق - ناجح',
      lost: 'مغلق - فاشل',
    };
    return labels[stage] || stage;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount);
  };

  const stageCounts = {
    all: opportunities?.length || 0,
    lead: opportunities?.filter(o => o.stage === 'lead').length || 0,
    qualified: opportunities?.filter(o => o.stage === 'qualified').length || 0,
    proposal: opportunities?.filter(o => o.stage === 'proposal').length || 0,
    negotiation: opportunities?.filter(o => o.stage === 'negotiation').length || 0,
    won: opportunities?.filter(o => o.stage === 'won').length || 0,
  };

  const totalValue = opportunities?.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) || 0;
  const weightedValue = opportunities?.reduce((sum, opp) => sum + ((opp.estimated_value ?? 0) * ((opp.probability ?? 0) / 100)), 0) || 0;
  const avgValue = opportunities?.length ? totalValue / opportunities.length : 0;

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المبيعات <span>/</span> الفرص البيعية
            </div>
            <h1>الفرص البيعية</h1>
            <p>إدارة ومتابعة الفرص البيعية وتقييم قيمتها المتوقعة.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button dw-button-primary" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={17} />
              فرصة جديدة
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات الفرص البيعية">
          <div className="dw-metric dw-metric-accent">
            <div className="dw-metric-top"><span>إجمالي القيمة</span><DollarSign size={19} /></div>
            <strong>{formatCurrency(totalValue)}</strong>
            <div className="dw-metric-bottom"><small>جميع الفرص النشطة</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>القيمة المرجحة</span><TrendingUp size={19} /></div>
            <strong>{formatCurrency(weightedValue)}</strong>
            <div className="dw-metric-bottom"><small>القيمة × الاحتمالية</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>متوسط القيمة</span><Target size={19} /></div>
            <strong>{formatCurrency(avgValue)}</strong>
            <div className="dw-metric-bottom"><small>متوسط الفرصة</small></div>
          </div>
          <div className="dw-metric">
            <div className="dw-metric-top"><span>الفرص النشطة</span><Target size={19} /></div>
            <strong>{stageCounts.all}</strong>
            <div className="dw-metric-bottom"><small>فرصة نشطة</small></div>
          </div>
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="قائمة الفرص البيعية"
            subtitle="عرض وإدارة جميع الفرص البيعية وتصفيتها بالمرحلة"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="ابحث باسم الفرصة…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في الفرص"
                  />
                </div>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="wk-field" style={{ width: 160 }}>
                    <SelectValue placeholder="المرحلة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المراحل</SelectItem>
                    <SelectItem value="lead">عميل محتمل</SelectItem>
                    <SelectItem value="qualified">مؤهل</SelectItem>
                    <SelectItem value="proposal">عرض سعر</SelectItem>
                    <SelectItem value="negotiation">تفاوض</SelectItem>
                    <SelectItem value="won">مغلق - ناجح</SelectItem>
                    <SelectItem value="lost">مغلق - فاشل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="wk-toolbar">
              <div className="dw-filters" role="group" aria-label="تصفية بالمرحلة">
                {([
                  { value: 'all', label: 'الكل', count: stageCounts.all },
                  { value: 'lead', label: 'محتمل', count: stageCounts.lead },
                  { value: 'qualified', label: 'مؤهل', count: stageCounts.qualified },
                  { value: 'proposal', label: 'عرض', count: stageCounts.proposal },
                  { value: 'negotiation', label: 'تفاوض', count: stageCounts.negotiation },
                  { value: 'won', label: 'ناجح', count: stageCounts.won },
                ] as const).map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    aria-pressed={activeTab === chip.value}
                    onClick={() => setActiveTab(chip.value)}
                  >
                    {chip.label}<span>{chip.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <PageLoading label="جاري تحميل الفرص…" />
            ) : filteredOpportunities.length === 0 ? (
              <PageEmpty icon={Target} message="لا توجد فرص بيعية مطابقة">
                <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={16} />
                  إضافة فرصة جديدة
                </button>
              </PageEmpty>
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">الفرص البيعية</caption>
                  <thead>
                    <tr>
                      <th scope="col">الفرصة</th>
                      <th scope="col">المرحلة</th>
                      <th scope="col">القيمة المتوقعة</th>
                      <th scope="col">الاحتمالية</th>
                      <th scope="col">تاريخ الإغلاق</th>
                      <th scope="col"><span className="sr-only">إجراءات</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.map((opportunity) => (
                      <tr key={opportunity.id} style={{ cursor: 'pointer' }} onClick={() => handleViewDetails(opportunity)}>
                        <td>
                          <strong><bdi>{opportunity.opportunity_name}</bdi></strong>
                          {opportunity.opportunity_name_ar && <span className="wk-sub">{opportunity.opportunity_name_ar}</span>}
                        </td>
                        <td>
                          <span className={`wk-badge ${stageTones[opportunity.stage ?? ''] ?? 'is-neutral'}`}>
                            {getStageLabel(opportunity.stage ?? '')}
                          </span>
                        </td>
                        <td>{formatCurrency(opportunity.estimated_value || 0)}</td>
                        <td>
                          <span className="wk-badge is-neutral">{opportunity.probability}%</span>
                        </td>
                        <td>
                          {opportunity.expected_close_date
                            ? new Date(opportunity.expected_close_date).toLocaleDateString('en-GB')
                            : '-'}
                        </td>
                        <td>
                          <div className="wk-actions" onClick={(e) => e.stopPropagation()}>
                            <button type="button" className="wk-action" title="تعديل" aria-label={`تعديل ${opportunity.opportunity_name}`} onClick={() => handleEditOpportunity(opportunity)}>
                              <Edit size={15} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" className="wk-action" title="حذف" aria-label={`حذف ${opportunity.opportunity_name}`}>
                                  <Trash2 size={15} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف الفرصة "{opportunity.opportunity_name}". هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteOpportunity(opportunity)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="dw-panel-foot">
              <TrendingUp size={14} />
              <span>{filteredOpportunities.length} فرصة معروضة بعد التصفية.</span>
            </div>
          </PagePanel>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة فرصة بيعية جديدة</DialogTitle>
            <DialogDescription>
              أدخل بيانات الفرصة البيعية الجديدة
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="opportunity_name">اسم الفرصة (English)</Label>
              <Input
                id="opportunity_name"
                value={formData.opportunity_name}
                onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
                placeholder="Opportunity name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="opportunity_name_ar">اسم الفرصة (عربي)</Label>
              <Input
                id="opportunity_name_ar"
                value={formData.opportunity_name_ar}
                onChange={(e) => setFormData({ ...formData, opportunity_name_ar: e.target.value })}
                placeholder="اسم الفرصة"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stage">المرحلة</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">عميل محتمل</SelectItem>
                    <SelectItem value="qualified">مؤهل</SelectItem>
                    <SelectItem value="proposal">عرض سعر</SelectItem>
                    <SelectItem value="negotiation">تفاوض</SelectItem>
                    <SelectItem value="won">مغلق - ناجح</SelectItem>
                    <SelectItem value="lost">مغلق - فاشل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="probability">احتمالية النجاح (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="estimated_value">القيمة المتوقعة (ريال)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expected_close_date">تاريخ الإغلاق المتوقع</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateOpportunity}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الفرصة البيعية</DialogTitle>
            <DialogDescription>
              تحديث بيانات الفرصة البيعية
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_opportunity_name">اسم الفرصة (English)</Label>
              <Input
                id="edit_opportunity_name"
                value={formData.opportunity_name}
                onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_opportunity_name_ar">اسم الفرصة (عربي)</Label>
              <Input
                id="edit_opportunity_name_ar"
                value={formData.opportunity_name_ar}
                onChange={(e) => setFormData({ ...formData, opportunity_name_ar: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_stage">المرحلة</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">عميل محتمل</SelectItem>
                    <SelectItem value="qualified">مؤهل</SelectItem>
                    <SelectItem value="proposal">عرض سعر</SelectItem>
                    <SelectItem value="negotiation">تفاوض</SelectItem>
                    <SelectItem value="won">مغلق - ناجح</SelectItem>
                    <SelectItem value="lost">مغلق - فاشل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_probability">احتمالية النجاح (%)</Label>
                <Input
                  id="edit_probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_estimated_value">القيمة المتوقعة (ريال)</Label>
                <Input
                  id="edit_estimated_value"
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_expected_close_date">تاريخ الإغلاق المتوقع</Label>
                <Input
                  id="edit_expected_close_date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_notes">ملاحظات</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateOpportunity}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل الفرصة البيعية</DialogTitle>
            <DialogDescription>
              {selectedOpportunity?.opportunity_name_ar || selectedOpportunity?.opportunity_name}
            </DialogDescription>
          </DialogHeader>
          {selectedOpportunity && (
            <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="value">تحليل القيمة</TabsTrigger>
                <TabsTrigger value="activity">النشاط</TabsTrigger>
                <TabsTrigger value="quotes">عروض الأسعار</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">الاسم (English)</Label>
                    <p className="font-medium">{selectedOpportunity.opportunity_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الاسم (عربي)</Label>
                    <p className="font-medium">{selectedOpportunity.opportunity_name_ar || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المرحلة</Label>
                    <div className="mt-1">
                      <span className={`wk-badge ${stageTones[selectedOpportunity.stage ?? ''] ?? 'is-neutral'}`}>
                        {getStageLabel(selectedOpportunity.stage ?? '')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">احتمالية النجاح</Label>
                    <p className="font-medium">{selectedOpportunity.probability}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">القيمة المتوقعة</Label>
                    <p className="font-medium text-green-600">{formatCurrency(selectedOpportunity.estimated_value ?? 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">تاريخ الإغلاق المتوقع</Label>
                    <p className="font-medium">
                      {selectedOpportunity.expected_close_date
                        ? new Date(selectedOpportunity.expected_close_date).toLocaleDateString('en-US')
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                {selectedOpportunity.notes && (
                  <div>
                    <Label className="text-muted-foreground">ملاحظات</Label>
                    <p className="mt-1 text-sm">{selectedOpportunity.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="value" className="space-y-4">
                <div className="grid gap-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-medium">تحليل القيمة المتوقعة</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">القيمة الإجمالية</span>
                      <span className="font-semibold">{formatCurrency(selectedOpportunity.estimated_value ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">احتمالية النجاح</span>
                      <span className="font-semibold">{selectedOpportunity.probability}%</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-sm font-medium">القيمة المرجحة</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency((selectedOpportunity.estimated_value ?? 0) * ((selectedOpportunity.probability ?? 0) / 100))}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد أنشطة مسجلة</p>
                </div>
              </TabsContent>

              <TabsContent value="quotes" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد عروض أسعار مرتبطة</p>
                  <Button className="mt-4" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء عرض سعر
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              if (selectedOpportunity) handleEditOpportunity(selectedOpportunity);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              تعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOpportunities;
