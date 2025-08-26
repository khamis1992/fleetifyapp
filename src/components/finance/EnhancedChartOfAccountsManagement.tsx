import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Filter, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Eye,
  EyeOff,
  Database,
  Zap,
  Settings,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  Building,
  Calculator,
  PieChart,
  Target,
  Layers
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { 
  useChartOfAccounts, 
  useCreateAccount, 
  useUpdateAccount, 
  useDeleteAccount, 
  useCopyDefaultAccounts 
} from '@/hooks/useChartOfAccounts';
import { 
  useChartValidation, 
  useFixChartHierarchy, 
  useChartStatistics 
} from '@/hooks/useChartValidation';
import {
  useEnhancedAccountDeletion,
  useAccountDeletionPreview,
  type EnhancedDeletionOptions,
  type EnhancedDeletionResult
} from '@/hooks/useEnhancedAccountDeletion';
import {
  useDirectBulkAccountDeletion,
  useDirectDeletionPreview,
  type BulkDeletionResult
} from '@/hooks/useDirectAccountDeletion';

export const EnhancedChartOfAccountsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'level'>('code');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [deletionConfirmText, setDeletionConfirmText] = useState('');
  const [bulkDeletionOptions, setBulkDeletionOptions] = useState<EnhancedDeletionOptions>({
    includeSystemAccounts: false,
    includeInactiveAccounts: true,
    forceCompleteReset: false,
    deletionReason: 'Bulk deletion via management interface'
  });

  const { toast } = useToast();
  const { companyId } = useUnifiedCompanyAccess();
  
  const statistics = useChartStatistics();
  const validation = useChartValidation();
  const fixHierarchy = useFixChartHierarchy();
  const accounts = useChartOfAccounts();
  const copyDefaultAccounts = useCopyDefaultAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  
  const filteredAccounts = useMemo(() => {
    return accounts.data?.filter(account => {
      const matchesSearch = account.account_code.includes(searchTerm) || account.account_name.includes(searchTerm);
      const matchesType = selectedType === 'all' || account.type === selectedType;
      const matchesLevel = selectedLevel === 'all' || account.level === selectedLevel;
      const matchesActive = showInactive || account.is_active;
      return matchesSearch && matchesType && matchesLevel && matchesActive;
    }) || [];
  }, [accounts.data, searchTerm, selectedType, showInactive, selectedLevel]);

  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة دليل الحسابات المحسن</h1>
          <p className="text-muted-foreground">
            إدارة شاملة لدليل الحسابات مع أدوات متقدمة للتحليل والصيانة
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            حساب جديد
          </Button>
          <Button variant="outline" onClick={() => copyDefaultAccounts.mutate()}>
            <Database className="h-4 w-4 mr-2" />
            نسخ الحسابات الافتراضية
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {statistics.data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الحسابات</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.data.total_accounts}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.data.active_accounts} نشط، {statistics.data.inactive_accounts} غير نشط
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الحد الأقصى للعمق</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.data.max_depth}</div>
              <p className="text-xs text-muted-foreground">
                متوسط العمق: {statistics.data.avg_depth?.toFixed(1)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الحسابات الرئيسية</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.data.header_accounts}</div>
              <p className="text-xs text-muted-foreground">
                حسابات تفصيلية: {statistics.data.detail_accounts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">حالة التحقق</CardTitle>
              {validation.data?.is_valid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {validation.data?.is_valid ? 'صحيح' : 'يحتاج إصلاح'}
              </div>
              <p className="text-xs text-muted-foreground">
                {validation.data?.total_issues || 0} مشكلة
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Results */}
      {validation.data && !validation.data.is_valid && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            تم العثور على {validation.data.total_issues} مشكلة في دليل الحسابات.
            <Button 
              variant="link" 
              className="p-0 h-auto mr-2" 
              onClick={() => fixHierarchy.mutate()}
              disabled={fixHierarchy.isPending}
            >
              {fixHierarchy.isPending ? 'جاري الإصلاح...' : 'إصلاح تلقائي'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts">الحسابات</TabsTrigger>
          <TabsTrigger value="validation">التحقق والإصلاح</TabsTrigger>
          <TabsTrigger value="statistics">الإحصائيات</TabsTrigger>
          <TabsTrigger value="bulk-operations">العمليات المجمعة</TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                البحث والتصفية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="search">البحث</Label>
                  <Input
                    id="search"
                    placeholder="بحث بالكود أو الاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="type-filter">نوع الحساب</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="assets">الأصول</SelectItem>
                      <SelectItem value="liabilities">الخصوم</SelectItem>
                      <SelectItem value="equity">حقوق الملكية</SelectItem>
                      <SelectItem value="revenue">الإيرادات</SelectItem>
                      <SelectItem value="expenses">المصروفات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level-filter">المستوى</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستويات</SelectItem>
                      <SelectItem value="1">المستوى 1</SelectItem>
                      <SelectItem value="2">المستوى 2</SelectItem>
                      <SelectItem value="3">المستوى 3</SelectItem>
                      <SelectItem value="4">المستوى 4</SelectItem>
                      <SelectItem value="5">المستوى 5</SelectItem>
                      <SelectItem value="6">المستوى 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sort-by">الترتيب حسب</Label>
                  <Select value={sortBy} onValueChange={(value: 'code' | 'name' | 'level') => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="code">كود الحساب</SelectItem>
                      <SelectItem value="name">اسم الحساب</SelectItem>
                      <SelectItem value="level">مستوى الحساب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive">إظهار الحسابات غير النشطة</Label>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle>دليل الحسابات ({filteredAccounts.length} حساب)</CardTitle>
            </CardHeader>
            <CardContent>
              {accounts.isLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حسابات تطابق المعايير المحددة
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAccounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onEdit={setSelectedAccount}
                      onDelete={(account) => deleteAccount.mutate(account.id)}
                      isDeleting={deleteAccount.isPending}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                التحقق من صحة دليل الحسابات
              </CardTitle>
              <CardDescription>
                فحص وإصلاح مشاكل التسلسل الهرمي والبيانات في دليل الحسابات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => validation.refetch()}
                disabled={validation.isFetching}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {validation.isFetching ? 'جاري الفحص...' : 'فحص دليل الحسابات'}
              </Button>

              {validation.data && (
                <ValidationResults
                  validation={validation.data}
                  onFix={() => fixHierarchy.mutate()}
                  isFixing={fixHierarchy.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                إحصائيات دليل الحسابات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.data && (
                <StatisticsDisplay statistics={statistics.data} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="bulk-operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Zap className="h-5 w-5" />
                العمليات المجمعة المتقدمة
              </CardTitle>
              <CardDescription className="text-red-600">
                ⚠️ تحذير: هذه العمليات لا يمكن التراجع عنها. يرجى استخدامها بحذر شديد.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bulk Delete Section */}
              <div className="border-l-4 border-red-500 pl-4 bg-red-50 p-4 rounded">
                <h3 className="font-semibold text-red-800 mb-2">حذف جميع الحسابات</h3>
                <p className="text-sm text-red-700 mb-4">
                  سيتم حذف أو إلغاء تفعيل جميع الحسابات في الشركة بناءً على حالة كل حساب.
                </p>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="include-system"
                      checked={bulkDeletionOptions.includeSystemAccounts}
                      onCheckedChange={(checked) => 
                        setBulkDeletionOptions(prev => ({ ...prev, includeSystemAccounts: checked }))
                      }
                    />
                    <Label htmlFor="include-system" className="text-sm">
                      تضمين الحسابات النظامية (خطر عالي)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="include-inactive"
                      checked={bulkDeletionOptions.includeInactiveAccounts}
                      onCheckedChange={(checked) => 
                        setBulkDeletionOptions(prev => ({ ...prev, includeInactiveAccounts: checked }))
                      }
                    />
                    <Label htmlFor="include-inactive" className="text-sm">
                      تضمين الحسابات غير النشطة
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="force-reset"
                      checked={bulkDeletionOptions.forceCompleteReset}
                      onCheckedChange={(checked) => 
                        setBulkDeletionOptions(prev => ({ ...prev, forceCompleteReset: checked }))
                      }
                    />
                    <Label htmlFor="force-reset" className="text-sm">
                      فرض الإعادة التعيين الكاملة (خطر جداً عالي)
                    </Label>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  بدء عملية الحذف المجمع
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Account Dialog */}
      <CreateAccountDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateAccount}
        isSubmitting={createAccount.isPending}
      />

      {/* Edit Account Dialog */}
      {selectedAccount && (
        <EditAccountDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          account={selectedAccount}
          onSubmit={handleEditAccount}
          isSubmitting={updateAccount.isPending}
        />
      )}

      {/* Enhanced Bulk Delete Dialog */}
      <EnhancedBulkDeleteDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        options={bulkDeletionOptions}
        onOptionsChange={setBulkDeletionOptions}
        onConfirm={handleBulkDelete}
        isDeleting={bulkDelete.isPending}
        preview={deletionPreview}
        onPreview={handleDeletionPreview}
        isLoadingPreview={deletionPreviewMutation.isPending}
        confirmationText={deletionConfirmText}
        onConfirmationTextChange={setDeletionConfirmText}
      />
    </div>
  );
};
