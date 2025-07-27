import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, Edit, Trash2, Link, AlertCircle } from "lucide-react";
import {
  useDefaultAccountTypes,
  useAccountMappings,
  useCreateAccountMapping,
  useUpdateAccountMapping,
  useDeleteAccountMapping,
  DefaultAccountType,
  AccountMapping,
} from "@/hooks/useAccountMappings";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";

export const AccountMappingSettings: React.FC = () => {
  const [selectedDefaultType, setSelectedDefaultType] = useState<string>("");
  const [selectedChartAccount, setSelectedChartAccount] = useState<string>("");
  const [editingMapping, setEditingMapping] = useState<AccountMapping | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: defaultTypes, isLoading: loadingDefaultTypes } = useDefaultAccountTypes();
  const { data: mappings, isLoading: loadingMappings } = useAccountMappings();
  const { data: chartAccounts, isLoading: loadingChart } = useChartOfAccounts();
  const createMappingMutation = useCreateAccountMapping();
  const updateMappingMutation = useUpdateAccountMapping();
  const deleteMappingMutation = useDeleteAccountMapping();

  const isLoading = loadingDefaultTypes || loadingMappings || loadingChart;

  // Group default types by category
  const groupedDefaultTypes = defaultTypes?.reduce((acc, type) => {
    if (!acc[type.account_category]) {
      acc[type.account_category] = [];
    }
    acc[type.account_category].push(type);
    return acc;
  }, {} as Record<string, DefaultAccountType[]>) || {};

  // Get unmapped default types
  const mappedTypeIds = mappings?.map(m => m.default_account_type_id) || [];
  const unmappedTypes = defaultTypes?.filter(type => !mappedTypeIds.includes(type.id)) || [];

  // Filter chart accounts for selection (only detail accounts)
  const detailAccounts = chartAccounts?.filter(account => !account.is_header && account.is_active) || [];

  const handleCreateMapping = () => {
    if (!selectedDefaultType || !selectedChartAccount) return;

    createMappingMutation.mutate(
      {
        default_account_type_id: selectedDefaultType,
        chart_of_accounts_id: selectedChartAccount,
      },
      {
        onSuccess: () => {
          setSelectedDefaultType("");
          setSelectedChartAccount("");
          setIsCreateDialogOpen(false);
        },
      }
    );
  };

  const handleEditMapping = (mapping: AccountMapping) => {
    setEditingMapping(mapping);
    setSelectedChartAccount(mapping.chart_of_accounts_id);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMapping = () => {
    if (!editingMapping || !selectedChartAccount) return;

    updateMappingMutation.mutate(
      {
        id: editingMapping.id,
        chart_of_accounts_id: selectedChartAccount,
      },
      {
        onSuccess: () => {
          setEditingMapping(null);
          setSelectedChartAccount("");
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  const handleDeleteMapping = (mappingId: string) => {
    deleteMappingMutation.mutate(mappingId);
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      assets: "الأصول",
      liabilities: "الخصوم",
      equity: "رؤوس الأموال",
      revenue: "الإيرادات",
      expenses: "المصروفات",
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryBadgeVariant = (category: string) => {
    const variants = {
      assets: "default",
      liabilities: "destructive",
      equity: "secondary",
      revenue: "success",
      expenses: "warning",
    };
    return variants[category as keyof typeof variants] || "default";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            ربط الحسابات
          </CardTitle>
          <CardDescription>
            قم بربط أنواع الحسابات الافتراضية مع حسابات دليل الحسابات الخاص بك لضمان التكامل الصحيح مع العمليات المالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              {mappings?.length || 0} من {defaultTypes?.length || 0} نوع حساب مربوط
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={unmappedTypes.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة ربط جديد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة ربط حساب جديد</DialogTitle>
                  <DialogDescription>
                    اختر نوع الحساب الافتراضي والحساب المطابق من دليل الحسابات
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">نوع الحساب الافتراضي</label>
                    <Select value={selectedDefaultType} onValueChange={setSelectedDefaultType}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(groupedDefaultTypes).map(([category, types]) => (
                          <div key={category}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                              {getCategoryLabel(category)}
                            </div>
                            {types
                              .filter(type => unmappedTypes.some(ut => ut.id === type.id))
                              .map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.type_name_ar || type.type_name}
                                </SelectItem>
                              ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">الحساب من دليل الحسابات</label>
                    <Select value={selectedChartAccount} onValueChange={setSelectedChartAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        {detailAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name_ar || account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button 
                      onClick={handleCreateMapping}
                      disabled={!selectedDefaultType || !selectedChartAccount || createMappingMutation.isPending}
                    >
                      {createMappingMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedDefaultTypes).map(([category, types]) => {
              const categoryMappings = mappings?.filter(m => 
                types.some(t => t.id === m.default_account_type_id)
              ) || [];
              
              if (categoryMappings.length === 0 && types.filter(t => unmappedTypes.some(ut => ut.id === t.id)).length === 0) {
                return null;
              }

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={getCategoryBadgeVariant(category) as any}>
                      {getCategoryLabel(category)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {categoryMappings.length} من {types.length} مربوط
                    </span>
                  </div>
                  
                  <div className="grid gap-3">
                    {categoryMappings.map((mapping) => (
                      <Card key={mapping.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {mapping.default_account_type?.type_name_ar || mapping.default_account_type?.type_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              مربوط مع: {mapping.chart_of_accounts?.account_code} - {mapping.chart_of_accounts?.account_name_ar || mapping.chart_of_accounts?.account_name}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Dialog open={isEditDialogOpen && editingMapping?.id === mapping.id} onOpenChange={setIsEditDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditMapping(mapping)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>تعديل ربط الحساب</DialogTitle>
                                  <DialogDescription>
                                    تعديل الحساب المربوط مع نوع الحساب: {editingMapping?.default_account_type?.type_name_ar || editingMapping?.default_account_type?.type_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">الحساب من دليل الحسابات</label>
                                    <Select value={selectedChartAccount} onValueChange={setSelectedChartAccount}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر الحساب" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {detailAccounts.map((account) => (
                                          <SelectItem key={account.id} value={account.id}>
                                            {account.account_code} - {account.account_name_ar || account.account_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                      إلغاء
                                    </Button>
                                    <Button 
                                      onClick={handleUpdateMapping}
                                      disabled={!selectedChartAccount || updateMappingMutation.isPending}
                                    >
                                      {updateMappingMutation.isPending ? "جاري التحديث..." : "حفظ التعديل"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل تريد حذف ربط الحساب "{mapping.default_account_type?.type_name_ar || mapping.default_account_type?.type_name}"؟
                                    سيتم الاعتماد على البحث التلقائي للحسابات في العمليات المالية.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteMapping(mapping.id)}>
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {/* Show unmapped types in this category */}
                    {types.filter(t => unmappedTypes.some(ut => ut.id === t.id)).map((type) => (
                      <Card key={type.id} className="p-4 border-dashed border-muted-foreground/30">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-medium text-muted-foreground">
                              {type.type_name_ar || type.type_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              غير مربوط - سيتم البحث التلقائي
                            </div>
                          </div>
                          <Badge variant="outline" className="text-muted-foreground">
                            غير مربوط
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {category !== Object.keys(groupedDefaultTypes).slice(-1)[0] && <Separator className="my-6" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};