import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSalesOpportunities, useCreateSalesOpportunity, useUpdateSalesOpportunity, useDeleteSalesOpportunity, type SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { Target, Plus, Search, Edit, Trash2, TrendingUp, DollarSign, Calendar, ArrowRight } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
      stage: opportunity.stage,
      estimated_value: opportunity.estimated_value,
      probability: opportunity.probability,
      expected_close_date: opportunity.expected_close_date || "",
      notes: opportunity.notes || "",
      is_active: opportunity.is_active,
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

  const getStageBadgeVariant = (stage: string) => {
    switch (stage) {
      case 'lead':
        return 'default';
      case 'qualified':
        return 'secondary';
      case 'proposal':
        return 'default';
      case 'negotiation':
        return 'warning';
      case 'won':
        return 'success';
      case 'lost':
        return 'destructive';
      default:
        return 'outline';
    }
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
  const weightedValue = opportunities?.reduce((sum, opp) => sum + ((opp.estimated_value || 0) * (opp.probability / 100)), 0) || 0;
  const avgValue = opportunities?.length ? totalValue / opportunities.length : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/sales/pipeline">المبيعات</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>الفرص البيعية</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الفرص البيعية</h1>
            <p className="text-muted-foreground">إدارة ومتابعة الفرص البيعية</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              فرصة جديدة
            </Button>
          </DialogTrigger>
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
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القيمة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">جميع الفرص النشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة المرجحة</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(weightedValue)}</div>
            <p className="text-xs text-muted-foreground">القيمة × الاحتمالية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط القيمة</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgValue)}</div>
            <p className="text-xs text-muted-foreground">متوسط الفرصة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفرص النشطة</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stageCounts.all}</div>
            <p className="text-xs text-muted-foreground">فرصة نشطة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الفرص البيعية</CardTitle>
              <CardDescription>عرض وإدارة جميع الفرص البيعية</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">الكل ({stageCounts.all})</TabsTrigger>
              <TabsTrigger value="lead">محتمل ({stageCounts.lead})</TabsTrigger>
              <TabsTrigger value="qualified">مؤهل ({stageCounts.qualified})</TabsTrigger>
              <TabsTrigger value="proposal">عرض ({stageCounts.proposal})</TabsTrigger>
              <TabsTrigger value="negotiation">تفاوض ({stageCounts.negotiation})</TabsTrigger>
              <TabsTrigger value="won">ناجح ({stageCounts.won})</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث عن فرصة (الاسم)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="w-[200px]">
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

            {/* Table */}
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : filteredOpportunities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد فرص بيعية
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفرصة</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>القيمة المتوقعة</TableHead>
                      <TableHead>الاحتمالية</TableHead>
                      <TableHead>تاريخ الإغلاق</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOpportunities.map((opportunity) => (
                      <TableRow key={opportunity.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(opportunity)}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{opportunity.opportunity_name}</div>
                            {opportunity.opportunity_name_ar && (
                              <div className="text-xs text-muted-foreground">{opportunity.opportunity_name_ar}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStageBadgeVariant(opportunity.stage)}>
                            {getStageLabel(opportunity.stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(opportunity.estimated_value || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{opportunity.probability}%</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {opportunity.expected_close_date
                            ? new Date(opportunity.expected_close_date).toLocaleDateString('en-US')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOpportunity(opportunity)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
                      <Badge variant={getStageBadgeVariant(selectedOpportunity.stage)}>
                        {getStageLabel(selectedOpportunity.stage)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">احتمالية النجاح</Label>
                    <p className="font-medium">{selectedOpportunity.probability}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">القيمة المتوقعة</Label>
                    <p className="font-medium text-green-600">{formatCurrency(selectedOpportunity.estimated_value)}</p>
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
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">تحليل القيمة المتوقعة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">القيمة الإجمالية</span>
                        <span className="font-semibold">{formatCurrency(selectedOpportunity.estimated_value)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">احتمالية النجاح</span>
                        <span className="font-semibold">{selectedOpportunity.probability}%</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="text-sm font-medium">القيمة المرجحة</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(selectedOpportunity.estimated_value * (selectedOpportunity.probability / 100))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
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
