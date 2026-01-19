import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useLegalAccountMappings,
  useLegalAccountTypes,
  useAccountsByCategory,
  useCreateLegalAccountMapping,
  useUpdateLegalAccountMapping,
  useDeleteLegalAccountMapping,
  useCreateDefaultLegalMappings,
  type LegalCaseAccountMappingFormData
} from '@/hooks/useLegalAccountMappings';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Scale, 
  Building, 
  DollarSign,
  FileText,
  AlertTriangle,
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';

const mappingFormSchema = z.object({
  case_type: z.string().min(1, 'نوع القضية مطلوب'),
  legal_fees_revenue_account_id: z.string().optional(),
  consultation_revenue_account_id: z.string().optional(),
  legal_fees_receivable_account_id: z.string().optional(),
  court_fees_expense_account_id: z.string().optional(),
  legal_expenses_account_id: z.string().optional(),
  expert_witness_expense_account_id: z.string().optional(),
  legal_research_expense_account_id: z.string().optional(),
  settlements_expense_account_id: z.string().optional(),
  settlements_payable_account_id: z.string().optional(),
  client_retainer_liability_account_id: z.string().optional(),
  is_active: z.boolean(),
  auto_create_journal_entries: z.boolean(),
});

export const LegalAccountMappingsManager: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any>(null);

  const { data: mappings, isLoading } = useLegalAccountMappings();
  const { data: accountTypes } = useLegalAccountTypes();
  const { data: revenueAccounts } = useAccountsByCategory('revenue');
  const { data: assetAccounts } = useAccountsByCategory('assets');
  const { data: expenseAccounts } = useAccountsByCategory('expenses');
  const { data: liabilityAccounts } = useAccountsByCategory('liabilities');

  const createMutation = useCreateLegalAccountMapping();
  const updateMutation = useUpdateLegalAccountMapping();
  const deleteMutation = useDeleteLegalAccountMapping();
  const createDefaultMutation = useCreateDefaultLegalMappings();

  const form = useForm<LegalCaseAccountMappingFormData>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: {
      case_type: 'civil',
      is_active: true,
      auto_create_journal_entries: true,
    },
  });

  const onSubmit = (data: LegalCaseAccountMappingFormData) => {
    if (editingMapping) {
      updateMutation.mutate(
        { id: editingMapping.id, data },
        {
          onSuccess: () => {
            form.reset();
            setIsFormOpen(false);
            setEditingMapping(null);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          form.reset();
          setIsFormOpen(false);
        },
      });
    }
  };

  const handleEdit = (mapping: any) => {
    setEditingMapping(mapping);
    form.reset(mapping);
    setIsFormOpen(true);
  };

  const handleDelete = (mappingId: string, caseType: string) => {
    if (window.confirm(`هل أنت متأكد من حذف ربط الحسابات لـ ${getCaseTypeLabel(caseType)}؟`)) {
      deleteMutation.mutate(mappingId);
    }
  };

  const handleCreateDefaults = () => {
    if (window.confirm('هل تريد إنشاء ربط افتراضي لجميع أنواع القضايا؟')) {
      createDefaultMutation.mutate();
    }
  };

  const getCaseTypeLabel = (type: string) => {
    switch (type) {
      case 'civil': return 'مدنية';
      case 'criminal': return 'جنائية';
      case 'commercial': return 'تجارية';
      case 'labor': return 'عمالية';
      case 'administrative': return 'إدارية';
      default: return type;
    }
  };

  const getCaseTypeIcon = (type: string) => {
    switch (type) {
      case 'civil': return <Scale className="h-4 w-4" />;
      case 'criminal': return <AlertTriangle className="h-4 w-4" />;
      case 'commercial': return <Building className="h-4 w-4" />;
      case 'labor': return <FileText className="h-4 w-4" />;
      case 'administrative': return <Settings className="h-4 w-4" />;
      default: return <Scale className="h-4 w-4" />;
    }
  };

  const getAccountName = (accountId?: string, accounts?: any[]) => {
    if (!accountId || !accounts) return 'غير محدد';
    const account = accounts.find(acc => acc.id === accountId);
    return account ? `${account.account_code} - ${account.account_name}` : 'غير محدد';
  };

  const isMappingComplete = (mapping: any) => {
    const requiredFields = [
      'legal_fees_revenue_account_id',
      'legal_fees_receivable_account_id',
      'court_fees_expense_account_id',
      'legal_expenses_account_id'
    ];
    return requiredFields.every(field => mapping[field]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ربط الحسابات القانونية</h2>
          <p className="text-muted-foreground">
            إدارة ربط الحسابات المحاسبية لأنواع القضايا القانونية المختلفة
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCreateDefaults}>
            إنشاء ربط افتراضي
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة ربط جديد
          </Button>
        </div>
      </div>

      {/* Account Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle>أنواع الحسابات القانونية المتاحة</CardTitle>
          <CardDescription>
            الحسابات المحاسبية المخصصة للقسم القانوني
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountTypes?.map((type) => (
              <div key={type.type_code} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">{type.type_name_ar}</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                <Badge variant="outline" className="text-xs">
                  {type.account_category === 'assets' && 'أصول'}
                  {type.account_category === 'liabilities' && 'خصوم'}
                  {type.account_category === 'revenue' && 'إيرادات'}
                  {type.account_category === 'expenses' && 'مصروفات'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mappings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : mappings?.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد ربطات حسابات</h3>
            <p className="text-muted-foreground mb-4">
              لم يتم إنشاء أي ربط حسابات للقضايا القانونية بعد
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCreateDefaults}>
                إنشاء ربط افتراضي
              </Button>
              <Button variant="outline" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة أول ربط
              </Button>
            </div>
          </div>
        ) : (
          mappings?.map((mapping) => (
            <Card key={mapping.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCaseTypeIcon(mapping.case_type)}
                    <CardTitle className="text-lg">
                      قضايا {getCaseTypeLabel(mapping.case_type)}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMappingComplete(mapping) ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-orange-500" />
                    )}
                    <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                      {mapping.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  ربط الحسابات المحاسبية لقضايا {getCaseTypeLabel(mapping.case_type)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Tabs defaultValue="revenue" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="revenue">إيرادات</TabsTrigger>
                      <TabsTrigger value="assets">أصول</TabsTrigger>
                      <TabsTrigger value="expenses">مصروفات</TabsTrigger>
                      <TabsTrigger value="liabilities">خصوم</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="revenue" className="space-y-2">
                      <div className="text-sm">
                        <strong>إيرادات الأتعاب:</strong>
                        <br />
                        {getAccountName(mapping.legal_fees_revenue_account_id, revenueAccounts)}
                      </div>
                      <div className="text-sm">
                        <strong>إيرادات الاستشارات:</strong>
                        <br />
                        {getAccountName(mapping.consultation_revenue_account_id, revenueAccounts)}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="assets" className="space-y-2">
                      <div className="text-sm">
                        <strong>ذمم الأتعاب القانونية:</strong>
                        <br />
                        {getAccountName(mapping.legal_fees_receivable_account_id, assetAccounts)}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="expenses" className="space-y-2">
                      <div className="text-sm">
                        <strong>رسوم المحاكم:</strong>
                        <br />
                        {getAccountName(mapping.court_fees_expense_account_id, expenseAccounts)}
                      </div>
                      <div className="text-sm">
                        <strong>مصاريف قانونية:</strong>
                        <br />
                        {getAccountName(mapping.legal_expenses_account_id, expenseAccounts)}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="liabilities" className="space-y-2">
                      <div className="text-sm">
                        <strong>العقود المقدمة:</strong>
                        <br />
                        {getAccountName(mapping.client_retainer_liability_account_id, liabilityAccounts)}
                      </div>
                      <div className="text-sm">
                        <strong>تسويات مستحقة الدفع:</strong>
                        <br />
                        {getAccountName(mapping.settlements_payable_account_id, liabilityAccounts)}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center gap-2 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={mapping.auto_create_journal_entries}
                        disabled
                        className="rounded"
                      />
                      إنشاء قيود تلقائية
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(mapping)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(mapping.id, mapping.case_type)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? 'تعديل ربط الحسابات' : 'إضافة ربط حسابات جديد'}
            </DialogTitle>
            <DialogDescription>
              ربط الحسابات المحاسبية مع أنواع القضايا القانونية
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="case_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع القضية *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع القضية" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="civil">مدنية</SelectItem>
                          <SelectItem value="criminal">جنائية</SelectItem>
                          <SelectItem value="commercial">تجارية</SelectItem>
                          <SelectItem value="labor">عمالية</SelectItem>
                          <SelectItem value="administrative">إدارية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Tabs defaultValue="revenue" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="revenue">حسابات الإيرادات</TabsTrigger>
                  <TabsTrigger value="assets">حسابات الأصول</TabsTrigger>
                  <TabsTrigger value="expenses">حسابات المصروفات</TabsTrigger>
                  <TabsTrigger value="liabilities">حسابات الخصوم</TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="legal_fees_revenue_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب إيرادات الأتعاب القانونية</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {revenueAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consultation_revenue_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب إيرادات الاستشارات</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {revenueAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="assets" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="legal_fees_receivable_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حساب ذمم الأتعاب القانونية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحساب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assetAccounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="court_fees_expense_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب مصروف رسوم المحاكم</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legal_expenses_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب المصاريف القانونية</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expert_witness_expense_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب مصروف شهود الخبرة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="settlements_expense_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب مصروف التسويات</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {expenseAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="liabilities" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="client_retainer_liability_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب التزامات العقود المقدمة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {liabilityAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="settlements_payable_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حساب التسويات مستحقة الدفع</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {liabilityAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.account_code} - {account.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">تفعيل الربط</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          هل تريد تفعيل هذا الربط؟
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_create_journal_entries"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">إنشاء قيود تلقائية</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          إنشاء القيود المحاسبية تلقائياً
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingMapping(null);
                    form.reset();
                  }}
                >
                  إلغاء
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingMapping ? 'تحديث' : 'إنشاء'} ربط الحسابات
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};