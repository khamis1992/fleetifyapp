import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SimpleAccountDeleteDialog } from '@/components/finance/SimpleAccountDeleteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Plus, Search, Eye, Edit, Trash2, FileText, Layers, Wand2, CheckCircle, Folder, Skull, Loader2 } from 'lucide-react';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/useChartOfAccounts';
import { supabase } from '@/integrations/supabase/client';
import { AccountLevelBadge } from './AccountLevelBadge';
import { AccountBalanceHistory } from './AccountBalanceHistory';
import { AccountChangeHistory } from './AccountChangeHistory';
import { AccountStatementDialog } from './AccountStatementDialog';
import { ParentAccountSelector } from './ParentAccountSelector';
import { ChartValidationPanel } from './charts/ChartValidationPanel';
import { SmartAccountWizardTab } from './charts/SmartAccountWizardTab';
import { AccountTemplateManager } from './charts/AccountTemplateManager';
import { EnhancedAccountsVisualization } from './charts/EnhancedAccountsVisualization';
import { EnhancedAccountEditDialog } from './enhanced-editing/EnhancedAccountEditDialog';

import { AccountMaintenanceTools } from './AccountMaintenanceTools';
import AccountsListWithActions from './AccountsListWithActions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AccountFormData {
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_subtype?: string;
  balance_type: string;
  parent_account_id?: string;
  is_header: boolean;
  description?: string;
}

export const EnhancedChartOfAccountsManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active'); // New filter for account status
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewingAccount, setViewingAccount] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [statementAccount, setStatementAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [showSmartWizard, setShowSmartWizard] = useState(false);

  const { data: allAccounts, isLoading: allAccountsLoading } = useChartOfAccounts(showInactiveAccounts);
  const { user } = useAuth();
  
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  // Check if user can delete all accounts (super admin only)
  const isSuperAdmin = user?.roles?.includes('super_admin');
  const canDeleteAll = isSuperAdmin;

  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_name_ar: '',
    account_type: 'assets',
    account_subtype: '',
    balance_type: 'debit',
    parent_account_id: '',
    is_header: false,
    description: ''
  });

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createAccount.mutateAsync(formData);
      setShowForm(false);
      setFormData({
        account_code: '',
        account_name: '',
        account_name_ar: '',
        account_type: 'assets',
        account_subtype: '',
        balance_type: 'debit',
        parent_account_id: '',
        is_header: false,
        description: ''
      });
      toast.success('تم إنشاء الحساب بنجاح');
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('حدث خطأ في إنشاء الحساب');
    }
  };

  const handleDeleteAllAccounts = async () => {
    if (!isSuperAdmin) {
      toast.error('ليس لديك صلاحية لحذف جميع الحسابات');
      return;
    }

    const accounts = allAccounts || [];
    if (accounts.length === 0) {
      toast.info('لا توجد حسابات للحذف');
      return;
    }

    const confirmText = 'DELETE ALL ACCOUNTS PERMANENTLY';
    const userInput = window.prompt(
      `⚠️ تحذير شديد الخطورة!\n\n` +
      `سيتم حذف ${accounts.length} حساب نهائياً!\n\n` +
      `هذا الإجراء لا يمكن التراجع عنه!\n\n` +
      `لتأكيد العملية، اكتب النص التالي بالضبط:\n\n${confirmText}`
    );

    if (userInput !== confirmText) {
      toast.error('تم إلغاء العملية - النص غير صحيح أو تم الإلغاء');
      return;
    }

    console.log('🗑️ [BULK_DELETE] بدء حذف جميع الحسابات باستخدام hook الحذف المنفرد الناجح');
    toast.info(`🚀 بدء حذف ${accounts.length} حساب...`);
    
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        console.log(`[${i + 1}/${accounts.length}] حذف الحساب:`, account.account_code);
        
        // استخدام نفس hook الحذف المنفرد الذي يعمل بنجاح ✅
        await deleteAccount.mutateAsync(account.id);
        successCount++;
        
        // تحديث التقدم كل 3 حسابات أو في النهاية
        if ((i + 1) % 3 === 0 || i === accounts.length - 1) {
          const progress = Math.round(((i + 1) / accounts.length) * 100);
          toast.info(`📊 التقدم: ${progress}% (${i + 1}/${accounts.length})`);
        }
        
      } catch (error: any) {
        console.error(`❌ فشل حذف الحساب ${account.account_code}:`, error);
        failCount++;
      }
      
      // توقف قصير لتجنب إرهاق النظام
      if (i < accounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // النتيجة النهائية مع تفاصيل
    if (failCount === 0) {
      toast.success(`🎉 تم حذف جميع الحسابات بنجاح!\n✅ ${successCount} حساب تم حذفه\n⏱️ المدة: ${duration} ثانية`);
    } else {
      toast.success(`📊 تمت معالجة جميع الحسابات:\n✅ ${successCount} نجح\n❌ ${failCount} فشل\n⏱️ المدة: ${duration} ثانية`);
      
      if (failCount > 0) {
        toast.warning(`⚠️ فشل في حذف ${failCount} حساب - قد تحتاج لحذفها يدوياً أو تحتوي على بيانات مرتبطة`);
      }
    }
    
    console.log('✅ [BULK_DELETE] اكتملت العملية:', {
      totalAccounts: accounts.length,
      successCount,
      failCount,
      duration: duration + 's'
    });
  };

  const toggleNode = (accountId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const buildAccountTree = (accounts: any[]) => {
    if (!accounts) return [];
    
    // Filter accounts first
    const filtered = filterAccounts(accounts);
    
    // Group by parent-child relationship
    const accountMap = new Map();
    const rootAccounts: any[] = [];
    
    filtered.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });
    
    filtered.forEach(account => {
      if (account.parent_account_id && accountMap.has(account.parent_account_id)) {
        accountMap.get(account.parent_account_id).children.push(accountMap.get(account.id));
      } else {
        rootAccounts.push(accountMap.get(account.id));
      }
    });
    
    return rootAccounts;
  };

  const renderAccountRow = (account: any, level: number = 0): JSX.Element[] => {
    // Handle undefined or null account
    if (!account) {
      console.warn('[RENDER_ACCOUNT_ROW] Account is undefined or null');
      return [];
    }

    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const paddingLeft = level * 24;

    // Safe access to account properties with fallbacks
    const accountCode = account.account_code || 'غير محدد';
    const accountName = account.account_name_ar || account.account_name || 'غير محدد';
    const accountType = account.account_type || 'غير محدد';
    const accountLevel = account.account_level || 1;
    const isHeader = account.is_header || false;
    const balanceType = account.balance_type || 'debit';
    const isActive = account.is_active !== undefined ? account.is_active : true;

    const rows: JSX.Element[] = [
      <TableRow key={account.id || `row-${level}-${Date.now()}`} className={`${level > 0 ? "bg-muted/30" : ""} ${!isActive ? "opacity-60" : ""}`}>
        <TableCell>
          <div className="flex items-center" style={{ paddingLeft }}>
            {hasChildren ? (
              <button
                onClick={() => toggleNode(account.id)}
                className="mr-2 p-1 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2" />
            )}
            <span className="font-mono text-left">{accountCode}</span>
            {!isActive && <Badge variant="destructive" className="mr-2 text-xs">غير نشط</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-right">{accountName}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">
            {getAccountTypeLabel(accountType)}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="font-mono">
              {accountLevel}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <AccountLevelBadge 
            accountLevel={accountLevel} 
            isHeader={isHeader} 
          />
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={balanceType === 'debit' ? 'default' : 'secondary'}>
            {balanceType === 'debit' ? 'مدين' : 'دائن'}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'نشط' : 'غير نشط'}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                setViewingAccount(account);
                setShowViewDialog(true);
              }}
              title="معاينة"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                setStatementAccount(account);
                setShowStatementDialog(true);
              }}
              title="كشف حساب"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                setEditingAccount(account);
                setShowEditDialog(true);
              }}
              title="تعديل متقدم"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => {
                console.log('[DELETE_BTN_CLICK] Starting deletion process for account:', {
                  accountId: account.id,
                  accountCode: account.account_code,
                  accountName: account.account_name,
                  isSystemAccount: account.is_system,
                  isActive: account.is_active,
                  parentId: account.parent_account_id
                });
                console.log('[DELETE_BTN_CLICK] User permissions:', {
                  userId: user?.id,
                  userRoles: user?.roles,
                  isSuperAdmin: isSuperAdmin,
                  canDeleteAll: canDeleteAll
                });
                
                setEditingAccount(account);
                console.log('[DELETE_BTN_CLICK] Account set for deletion, opening dialog...');
                setShowDeleteDialog(true);
                
                // Verify states after setting
                setTimeout(() => {
                  console.log('[DELETE_BTN_CLICK] States after setting:', {
                    showDeleteDialog: true, // This should be true now
                    editingAccount: account
                  });
                }, 100);
              }}
              title="حذف"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ];

    // Add children if expanded
    if (hasChildren && isExpanded) {
      account.children.forEach((child: any) => {
        rows.push(...renderAccountRow(child, level + 1));
      });
    }

    return rows;
  };

  const filterAccounts = (accounts: any[]) => {
    if (!accounts || !Array.isArray(accounts)) {
      console.warn('[FILTER_ACCOUNTS] Accounts is not a valid array:', accounts);
      return [];
    }
    
    return accounts.filter(account => {
      // Handle undefined account
      if (!account) {
        console.warn('[FILTER_ACCOUNTS] Found undefined account in array');
        return false;
      }

      // Safe string operations with fallbacks
      const accountName = account.account_name || '';
      const accountCode = account.account_code || '';
      const accountNameAr = account.account_name_ar || '';
      
      const matchesSearch = searchTerm === '' || 
        accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountNameAr.includes(searchTerm);
      
      const matchesType = filterType === 'all' || account.account_type === filterType;
      const matchesLevel = filterLevel === 'all' || account.account_level?.toString() === filterLevel;
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && account.is_active) ||
        (filterStatus === 'inactive' && !account.is_active);
      
      return matchesSearch && matchesType && matchesLevel && matchesStatus;
    });
  };

  const getAccountTypeLabel = (type: string) => {
    const types = {
      assets: 'الأصول',
      liabilities: 'الخصوم',
      equity: 'حقوق الملكية',
      revenue: 'الإيرادات',
      expenses: 'المصروفات'
    };
    return types[type as keyof typeof types] || type;
  };

  if (allAccountsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center" dir="rtl">
        <div className="text-right">
          <h2 className="text-2xl font-bold">إدارة دليل الحسابات المحسن</h2>
          <p className="text-muted-foreground">نظام ذكي لإدارة وتنظيم دليل الحسابات</p>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <span>قائمة الحسابات</span>
            <Layers className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="management" className="flex items-center gap-2">
            <span>إدارة الحسابات</span>
            <Trash2 className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <span>التحقق والإصلاح</span>
            <CheckCircle className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <span>القوالب</span>
            <Folder className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-2">
            <span>العرض التفاعلي</span>
            <Eye className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <span>أدوات الصيانة</span>
            <Wand2 className="h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => setShowSmartWizard(true)} className="flex items-center gap-2">
                <span>إضافة حساب جديد</span>
                <Plus className="h-4 w-4" />
              </Button>
              
              {canDeleteAll && (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteAllAccounts}
                  disabled={deleteAccount.isPending}
                  className="flex items-center gap-2"
                >
                  {deleteAccount.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Skull className="h-4 w-4" />
                  )}
                  <span>حذف جميع الحسابات</span>
                </Button>
              )}
            </div>
            

          </div>

          {/* Enhanced Filters */}
          <Card>
            <CardContent className="pt-6" dir="rtl">
              <div className="space-y-4">
                {/* Toggle for inactive accounts */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="show-inactive"
                      checked={showInactiveAccounts}
                      onCheckedChange={setShowInactiveAccounts}
                    />
                    <Label htmlFor="show-inactive" className="text-sm font-medium">
                      عرض الحسابات غير النشطة
                    </Label>
                  </div>
                  <Badge variant="secondary">
                    {allAccounts ? `${allAccounts.length} حساب` : '0 حساب'}
                  </Badge>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="البحث في الحسابات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="تصفية حسب النوع" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="assets">الأصول</SelectItem>
                      <SelectItem value="liabilities">الخصوم</SelectItem>
                      <SelectItem value="equity">حقوق الملكية</SelectItem>
                      <SelectItem value="revenue">الإيرادات</SelectItem>
                      <SelectItem value="expenses">المصروفات</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="تصفية حسب المستوى" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
                      <SelectItem value="all">جميع المستويات</SelectItem>
                      <SelectItem value="1">المستوى 1 - رئيسي</SelectItem>
                      <SelectItem value="2">المستوى 2 - فرعي</SelectItem>
                      <SelectItem value="3">المستوى 3 - تفصيلي</SelectItem>
                      <SelectItem value="4">المستوى 4 - فرعي تفصيلي</SelectItem>
                      <SelectItem value="5">المستوى 5 - نهائي</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="تصفية حسب الحالة" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="active">نشط فقط</SelectItem>
                      <SelectItem value="inactive">غير نشط فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">جميع الحسابات</CardTitle>
              <CardDescription className="text-right">
                عرض جميع الحسابات في دليل الحسابات مع بيان القواعد المطبقة
              </CardDescription>
            </CardHeader>
            <CardContent dir="rtl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">كود الحساب</TableHead>
                    <TableHead className="text-right">اسم الحساب</TableHead>
                    <TableHead className="text-center">نوع الحساب</TableHead>
                    <TableHead className="text-center">المستوى</TableHead>
                    <TableHead className="text-center">حالة المستوى</TableHead>
                    <TableHead className="text-center">طبيعة الرصيد</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildAccountTree(allAccounts || []).map((account) => (
                    renderAccountRow(account)
                  )).flat()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Management Tab */}
        <TabsContent value="management" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">إدارة الحسابات المتقدمة</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteAllAccounts}
                disabled={deleteAccount.isPending}
                className="text-red-600 hover:text-red-700"
              >
                {deleteAccount.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Skull className="h-4 w-4 mr-2" />
                )}
                حذف جميع الحسابات
              </Button>
            </div>
          </div>
          
          <AccountsListWithActions
            onViewAccount={(account) => {
              setViewingAccount(account);
              setShowViewDialog(true);
            }}
            onEditAccount={(account) => {
              setEditingAccount(account);
              setShowEditDialog(true);
            }}
            onDeleteAccount={(account) => {
              // تم حذف الحساب بنجاح - لا حاجة لإجراء إضافي
              console.log('تم حذف الحساب:', account.account_code);
            }}
            showActions={{
              view: true,
              edit: true,
              delete: true,
              statement: true
            }}
            maxHeight="h-[600px]"
            showFilters={true}
          />
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <ChartValidationPanel />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <AccountTemplateManager />
        </TabsContent>

        {/* Visualization Tab */}
        <TabsContent value="visualization">
          <EnhancedAccountsVisualization />
        </TabsContent>

        {/* Maintenance Tools Tab */}
        <TabsContent value="maintenance">
          <AccountMaintenanceTools />
        </TabsContent>
      </Tabs>

      {/* Smart Wizard Dialog */}
      <Dialog open={showSmartWizard} onOpenChange={setShowSmartWizard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">انشاء حساب جديد</DialogTitle>
          </DialogHeader>
          <SmartAccountWizardTab />
        </DialogContent>
      </Dialog>

      {/* View Account Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">معاينة الحساب</DialogTitle>
          </DialogHeader>
          {viewingAccount && (
            <div dir="rtl" className="w-full">
            <Tabs defaultValue="info" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">معلومات الحساب</TabsTrigger>
                <TabsTrigger value="history">سجل التغييرات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>رمز الحساب</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.account_code}</div>
                  </div>
                  <div>
                    <Label>اسم الحساب</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.account_name}</div>
                  </div>
                  <div>
                    <Label>اسم الحساب بالعربية</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.account_name_ar || '-'}</div>
                  </div>
                  <div>
                    <Label>نوع الحساب</Label>
                    <div className="p-2 bg-muted rounded">{getAccountTypeLabel(viewingAccount.account_type)}</div>
                  </div>
                  <div>
                    <Label>طبيعة الرصيد</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.balance_type === 'debit' ? 'مدين' : 'دائن'}</div>
                  </div>
                  <div>
                    <Label>المستوى</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.account_level}</div>
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <div className="p-2 bg-muted rounded">
                      <Badge variant={viewingAccount.is_active ? 'default' : 'destructive'}>
                        {viewingAccount.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>حساب إجمالي</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.is_header ? 'نعم' : 'لا'}</div>
                  </div>
                  <div className="col-span-2">
                    <Label>الوصف</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.description || '-'}</div>
                  </div>
                  <div>
                    <Label>الرصيد الحالي</Label>
                    <div className="p-2 bg-muted rounded">{viewingAccount.current_balance?.toFixed(3) || '0.000'} د.ك</div>
                  </div>
                  <div>
                    <Label>تاريخ الإنشاء</Label>
                    <div className="p-2 bg-muted rounded">
                      {new Date(viewingAccount.created_at).toLocaleDateString('en-GB', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history">
                <AccountChangeHistory account={viewingAccount} />
              </TabsContent>
              
              <div className="flex justify-end mt-4">
                <Button onClick={() => setShowViewDialog(false)}>
                  إغلاق
                </Button>
              </div>
            </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Account Edit Dialog */}
      <EnhancedAccountEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        account={editingAccount}
        onSuccess={() => {
          setShowEditDialog(false);
          setEditingAccount(null);
        }}
      />

      {/* Simple Delete Account Dialog */}
      <SimpleAccountDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          console.log('[DELETE_DIALOG] Simple dialog closing, clearing account...');
          setShowDeleteDialog(false);
          setEditingAccount(null);
        }}
        accountId={editingAccount?.id || ''}
        accountName={editingAccount?.account_name || ''}
        accountCode={editingAccount?.account_code || ''}
      />

      {/* Account Statement Dialog */}
      <AccountStatementDialog
        open={showStatementDialog}
        onOpenChange={setShowStatementDialog}
        accountId={statementAccount?.id}
        accountCode={statementAccount?.account_code}
        accountName={statementAccount?.account_name_ar || statementAccount?.account_name}
      />


    </div>
  );
};