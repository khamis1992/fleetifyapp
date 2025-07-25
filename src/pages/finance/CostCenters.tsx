import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Target, TrendingUp, DollarSign, Plus, Search, Building, Eye, Edit, Trash2 } from "lucide-react";
import { useCostCenters, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter, CostCenter } from "@/hooks/useFinance";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

  console.log('📝 [COST_CENTERS_PAGE] Component state:', {
    costCenters,
    costCentersCount: costCenters?.length,
    isLoading,
    error
  });

  const [newCostCenter, setNewCostCenter] = useState<Partial<CostCenter>>({
    center_code: '',
    center_name: '',
    center_name_ar: '',
    description: '',
    budget_amount: 0,
    actual_amount: 0,
    is_active: true
  });

  const handleCreateCostCenter = async () => {
    if (!newCostCenter.center_code || !newCostCenter.center_name) return;

    await createCostCenter.mutateAsync({
      center_code: newCostCenter.center_code!,
      center_name: newCostCenter.center_name!,
      center_name_ar: newCostCenter.center_name_ar,
      description: newCostCenter.description,
      budget_amount: newCostCenter.budget_amount,
      actual_amount: newCostCenter.actual_amount
    });

    setNewCostCenter({
      center_code: '',
      center_name: '',
      center_name_ar: '',
      description: '',
      budget_amount: 0,
      actual_amount: 0,
      is_active: true
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
      actual_amount: selectedCostCenter.actual_amount
    });

    setIsEditDialogOpen(false);
    setSelectedCostCenter(null);
  };

  const handleDeleteCostCenter = async (centerId: string) => {
    await deleteCostCenter.mutateAsync(centerId);
  };

  const filteredCostCenters = costCenters?.filter(center =>
    center.center_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.center_code.includes(searchTerm)
  );

  const totalBudget = costCenters?.reduce((sum, center) => sum + (center.budget_amount || 0), 0) || 0;
  const totalActual = costCenters?.reduce((sum, center) => sum + (center.actual_amount || 0), 0) || 0;
  const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        حدث خطأ في تحميل البيانات
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>مراكز التكلفة</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مراكز التكلفة</h1>
          <p className="text-muted-foreground">
            إدارة وتتبع مراكز التكلفة والموازنات
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              مركز تكلفة جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء مركز تكلفة جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل مركز التكلفة الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="centerCode">رمز المركز</Label>
                <Input
                  id="centerCode"
                  value={newCostCenter.center_code}
                  onChange={(e) => setNewCostCenter({ ...newCostCenter, center_code: e.target.value })}
                  placeholder="CC001"
                />
              </div>
              <div>
                <Label htmlFor="centerName">اسم المركز</Label>
                <Input
                  id="centerName"
                  value={newCostCenter.center_name}
                  onChange={(e) => setNewCostCenter({ ...newCostCenter, center_name: e.target.value })}
                  placeholder="اسم مركز التكلفة"
                />
              </div>
              <div>
                <Label htmlFor="centerNameAr">الاسم بالعربية</Label>
                <Input
                  id="centerNameAr"
                  value={newCostCenter.center_name_ar}
                  onChange={(e) => setNewCostCenter({ ...newCostCenter, center_name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                />
              </div>
              <div>
                <Label htmlFor="budgetAmount">المبلغ المخصص</Label>
                <Input
                  id="budgetAmount"
                  type="number"
                  value={newCostCenter.budget_amount}
                  onChange={(e) => setNewCostCenter({ ...newCostCenter, budget_amount: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={newCostCenter.description}
                  onChange={(e) => setNewCostCenter({ ...newCostCenter, description: e.target.value })}
                  placeholder="وصف مركز التكلفة"
                />
              </div>
              <Button onClick={handleCreateCostCenter} className="w-full" disabled={createCostCenter.isPending}>
                {createCostCenter.isPending ? "جاري الإنشاء..." : "إنشاء المركز"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المراكز</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCenters?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              مركز تكلفة نشط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الموازنة</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBudget.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              الموازنة المخصصة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المصروف الفعلي</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActual.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              المبلغ المصروف
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الاستغلال</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${budgetUtilization > 100 ? 'text-red-600' : budgetUtilization > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
              {budgetUtilization.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              من إجمالي الموازنة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>مراكز التكلفة</CardTitle>
              <CardDescription>قائمة جميع مراكز التكلفة المسجلة</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المراكز..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رمز المركز</TableHead>
                <TableHead>اسم المركز</TableHead>
                <TableHead>الموازنة المخصصة</TableHead>
                <TableHead>المصروف الفعلي</TableHead>
                <TableHead>المتبقي</TableHead>
                <TableHead>نسبة الاستغلال</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCostCenters?.map((center) => {
                const remaining = (center.budget_amount || 0) - (center.actual_amount || 0);
                const utilization = center.budget_amount > 0 ? ((center.actual_amount || 0) / center.budget_amount) * 100 : 0;
                
                return (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.center_code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{center.center_name}</div>
                        {center.center_name_ar && (
                          <div className="text-sm text-muted-foreground">{center.center_name_ar}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{center.budget_amount?.toFixed(3)} د.ك</TableCell>
                    <TableCell>{center.actual_amount?.toFixed(3)} د.ك</TableCell>
                    <TableCell className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                      {remaining.toFixed(3)} د.ك
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={utilization > 100 ? 'text-red-600' : utilization > 80 ? 'text-yellow-600' : 'text-green-600'}>
                          {utilization.toFixed(1)}%
                        </span>
                        {utilization > 100 && (
                          <Badge variant="destructive" className="text-xs">تجاوز</Badge>
                        )}
                        {utilization > 80 && utilization <= 100 && (
                          <Badge variant="secondary" className="text-xs">تحذير</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                    <Badge variant={center.is_active ? "default" : "secondary"}>
                      {center.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewCostCenter(center)}
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>عرض التفاصيل</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditCostCenter(center)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>تعديل</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>حذف</p>
                              </TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف مركز التكلفة "{center.center_name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteCostCenter(center.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredCostCenters?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد مراكز تكلفة
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل مركز التكلفة</DialogTitle>
            <DialogDescription>
              عرض تفاصيل مركز التكلفة
            </DialogDescription>
          </DialogHeader>
          {selectedCostCenter && (
            <div className="space-y-4">
              <div>
                <Label>رمز المركز</Label>
                <p className="mt-1 font-medium">{selectedCostCenter.center_code}</p>
              </div>
              <div>
                <Label>اسم المركز</Label>
                <p className="mt-1 font-medium">{selectedCostCenter.center_name}</p>
              </div>
              {selectedCostCenter.center_name_ar && (
                <div>
                  <Label>الاسم بالعربية</Label>
                  <p className="mt-1 font-medium">{selectedCostCenter.center_name_ar}</p>
                </div>
              )}
              <div>
                <Label>المبلغ المخصص</Label>
                <p className="mt-1 font-medium">{selectedCostCenter.budget_amount?.toFixed(3)} د.ك</p>
              </div>
              <div>
                <Label>المصروف الفعلي</Label>
                <p className="mt-1 font-medium">{selectedCostCenter.actual_amount?.toFixed(3)} د.ك</p>
              </div>
              {selectedCostCenter.description && (
                <div>
                  <Label>الوصف</Label>
                  <p className="mt-1">{selectedCostCenter.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل مركز التكلفة</DialogTitle>
            <DialogDescription>
              تعديل تفاصيل مركز التكلفة
            </DialogDescription>
          </DialogHeader>
          {selectedCostCenter && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editCenterCode">رمز المركز</Label>
                <Input
                  id="editCenterCode"
                  value={selectedCostCenter.center_code}
                  onChange={(e) => setSelectedCostCenter({ ...selectedCostCenter, center_code: e.target.value })}
                  placeholder="CC001"
                />
              </div>
              <div>
                <Label htmlFor="editCenterName">اسم المركز</Label>
                <Input
                  id="editCenterName"
                  value={selectedCostCenter.center_name}
                  onChange={(e) => setSelectedCostCenter({ ...selectedCostCenter, center_name: e.target.value })}
                  placeholder="اسم مركز التكلفة"
                />
              </div>
              <div>
                <Label htmlFor="editCenterNameAr">الاسم بالعربية</Label>
                <Input
                  id="editCenterNameAr"
                  value={selectedCostCenter.center_name_ar || ''}
                  onChange={(e) => setSelectedCostCenter({ ...selectedCostCenter, center_name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                />
              </div>
              <div>
                <Label htmlFor="editBudgetAmount">المبلغ المخصص</Label>
                <Input
                  id="editBudgetAmount"
                  type="number"
                  value={selectedCostCenter.budget_amount || 0}
                  onChange={(e) => setSelectedCostCenter({ ...selectedCostCenter, budget_amount: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div>
                <Label htmlFor="editDescription">الوصف</Label>
                <Textarea
                  id="editDescription"
                  value={selectedCostCenter.description || ''}
                  onChange={(e) => setSelectedCostCenter({ ...selectedCostCenter, description: e.target.value })}
                  placeholder="وصف مركز التكلفة"
                />
              </div>
              <Button onClick={handleUpdateCostCenter} className="w-full" disabled={updateCostCenter.isPending}>
                {updateCostCenter.isPending ? "جاري التحديث..." : "تحديث المركز"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}