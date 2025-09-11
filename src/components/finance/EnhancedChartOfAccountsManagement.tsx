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
import { ChevronRight, ChevronDown, Plus, Search, Eye, Edit, Trash2, FileText, Layers, CheckCircle, Folder, Skull, Upload, BarChart3, Database, Settings } from 'lucide-react';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from '@/hooks/useChartOfAccounts';
import { AccountLevelBadge } from './AccountLevelBadge';
import { AccountBalanceHistory } from './AccountBalanceHistory';
import { AccountChangeHistory } from './AccountChangeHistory';
import { ProfessionalAccountStatement } from './ProfessionalAccountStatement';
import { ChartValidationPanel } from './charts/ChartValidationPanel';
import { SmartAccountWizardTab } from './charts/SmartAccountWizardTab';
import { AccountTemplateManager } from './charts/AccountTemplateManager';
import { EnhancedAccountsVisualization } from './charts/EnhancedAccountsVisualization';
import { EnhancedAccountEditDialog } from './enhanced-editing/EnhancedAccountEditDialog';
import { EnhancedDeleteAllAccountsDialog } from './EnhancedDeleteAllAccountsDialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useDefaultPermissions } from '@/hooks/useDefaultPermissions';
import { supabase } from '@/integrations/supabase/client';
import { ChartOfAccountsCSVUpload } from './ChartOfAccountsCSVUpload';
import { DemoDataGenerator } from './DemoDataGenerator';
import { AccountsTreeView } from './AccountsTreeView';

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
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [statementAccount, setStatementAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  
  
  // تفعيل الصلاحيات الافتراضية
  useDefaultPermissions();
  
  // Check if user is in System Company
  const { user: authUser } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();
  const [isSystemCompany, setIsSystemCompany] = useState<boolean>(false);
  
  React.useEffect(() => {
    const checkCompanyType = async () => {
      if (!companyId) return;

      try {
        const { data: companyData, error } = await supabase
          .from('companies')
          .select('name, name_ar')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        const isSystem = companyData?.name === 'System Company' || 
                        companyData?.name_ar === 'شركة النظام' ||
                        companyData?.name === 'إدارة النظام' ||
                        companyData?.name_ar === 'System Administration' ||
                        companyData?.name?.toLowerCase().includes('system') ||
                        companyData?.name?.toLowerCase().includes('administration') ||
                        companyData?.name_ar?.includes('النظام') ||
                        companyData?.name_ar?.includes('إدارة');

        setIsSystemCompany(isSystem);
      } catch (error) {
        console.error('خطأ في التحقق من نوع الشركة:', error);
        setIsSystemCompany(false);
      }
    };

    checkCompanyType();
  }, [companyId]);
  const {
    data: allAccounts,
    isLoading: allAccountsLoading
  } = useChartOfAccounts(showInactiveAccounts);
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  // دالة لتوليد رقم الحساب الفرعي التالي
  const generateNextChildAccountCode = (parentAccount: any, allAccounts: any[]): string => {
    const parentCode = parentAccount.account_code || parentAccount.accountCode;
    const parentLevel = parentAccount.account_level || parentAccount.level || 1;
    const childLevel = parentLevel + 1;
    
    // البحث عن جميع الحسابات الفرعية للأب
    const childAccounts = allAccounts.filter(acc => 
      acc.parent_account_id === parentAccount.id && 
      acc.account_code.startsWith(parentCode)
    );
    
    // إذا لم توجد حسابات فرعية، ابدأ بـ 01
    if (childAccounts.length === 0) {
      return `${parentCode}01`;
    }
    
    // البحث عن أعلى رقم فرعي
    let maxChildNumber = 0;
    childAccounts.forEach(child => {
      const childCode = child.account_code;
      if (childCode.startsWith(parentCode) && childCode.length > parentCode.length) {
        const suffix = childCode.substring(parentCode.length);
        const childNumber = parseInt(suffix);
        if (!isNaN(childNumber) && childNumber > maxChildNumber) {
          maxChildNumber = childNumber;
        }
      }
    });
    
    // إنشاء الرقم التالي
    const nextNumber = maxChildNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(2, '0');
    return `${parentCode}${paddedNumber}`;
  };

  // دالة لإضافة حساب فرعي مباشرة
  const handleAddChildAccount = async (parentAccount: any) => {
    if (!allAccounts) return;
    
    // التحقق من نوع البيانات القادمة من AccountsTreeView
    const accountData = parentAccount.accountType ? {
      // البيانات قادمة من AccountsTreeView (node)
      id: parentAccount.id,
      account_code: parentAccount.accountCode,
      account_name: parentAccount.accountName,
      account_name_ar: parentAccount.accountNameAr,
      account_type: parentAccount.accountType,
      balance_type: parentAccount.balanceType,
      account_level: parentAccount.level
    } : {
      // البيانات قادمة من الجدول مباشرة
      id: parentAccount.id,
      account_code: parentAccount.account_code,
      account_name: parentAccount.account_name,
      account_name_ar: parentAccount.account_name_ar,
      account_type: parentAccount.account_type,
      balance_type: parentAccount.balance_type,
      account_level: parentAccount.account_level
    };
    
    // التحقق من صحة بيانات الحساب الأب
    if (!accountData.account_type) {
      toast({
        title: "خطأ في بيانات الحساب الأب",
        description: "نوع الحساب الأب غير محدد. يرجى التحقق من بيانات الحساب.",
        variant: "destructive"
      });
      return;
    }

    if (!accountData.balance_type) {
      toast({
        title: "خطأ في بيانات الحساب الأب", 
        description: "نوع الرصيد للحساب الأب غير محدد. يرجى التحقق من بيانات الحساب.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // توليد رقم الحساب الفرعي التالي
      const childAccountCode = generateNextChildAccountCode(accountData, allAccounts);
      const childLevel = (accountData.account_level || 1) + 1;
      
      // إنشاء بيانات الحساب الفرعي
      const childAccountData: AccountFormData = {
        account_code: childAccountCode,
        account_name: `حساب فرعي ${childAccountCode}`,
        account_name_ar: `حساب فرعي ${childAccountCode}`,
        account_type: accountData.account_type,
        balance_type: accountData.balance_type,
        parent_account_id: accountData.id,
        is_header: childLevel <= 3, // الحسابات من المستوى 1-3 تعتبر رئيسية
        description: `حساب فرعي تحت ${accountData.account_name || accountData.account_name_ar}`
      };
      
      // إنشاء الحساب
      await createAccount.mutateAsync(childAccountData);
      
      // إظهار رسالة نجاح
      toast({
        title: "تم إنشاء الحساب الفرعي بنجاح",
        description: `تم إنشاء الحساب ${childAccountCode} تحت ${parentAccount.account_code}`,
      });
      
      // توسيع العقدة الأب لإظهار الحساب الجديد
      setExpandedNodes(prev => new Set([...prev, parentAccount.id]));
      
    } catch (error: any) {
      console.error('خطأ في إنشاء الحساب الفرعي:', error);
      toast({
        title: "خطأ في إنشاء الحساب الفرعي",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    }
  };

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
    parent_account_id: undefined, // تغيير من '' إلى undefined لتجنب خطأ UUID
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
        parent_account_id: undefined, // تغيير من '' إلى undefined
        is_header: false,
        description: ''
      });
      toast({
        title: "تم إنشاء الحساب بنجاح"
      });
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        variant: "destructive",
        title: "حدث خطأ في إنشاء الحساب"
      });
    }
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
      accountMap.set(account.id, {
        ...account,
        children: []
      });
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
    const rows: JSX.Element[] = [<TableRow key={account.id || `row-${level}-${Date.now()}`} className={`${level > 0 ? "bg-muted/30" : ""} ${!isActive ? "opacity-60" : ""}`}>
        <TableCell>
          <div className="flex items-center" style={{
          paddingLeft
        }}>
            {hasChildren ? <button onClick={() => toggleNode(account.id)} className="mr-2 p-1 hover:bg-accent rounded">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button> : <div className="w-6 mr-2" />}
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
          <AccountLevelBadge accountLevel={accountLevel} isHeader={isHeader} />
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
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => {
            setViewingAccount(account);
            setShowViewDialog(true);
          }} title="معاينة">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700" onClick={() => {
            setStatementAccount(account);
            setShowStatementDialog(true);
          }} title="كشف حساب احترافي">
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => {
            setEditingAccount(account);
            setShowEditDialog(true);
          }} title="تعديل متقدم">
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => {
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
                showDeleteDialog: true,
                // This should be true now
                editingAccount: account
              });
            }, 100);
          }} title="حذف">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>];

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
      const matchesSearch = searchTerm === '' || accountName.toLowerCase().includes(searchTerm.toLowerCase()) || accountCode.toLowerCase().includes(searchTerm.toLowerCase()) || accountNameAr.includes(searchTerm);
      const matchesType = filterType === 'all' || account.account_type === filterType;
      const matchesLevel = filterLevel === 'all' || account.account_level?.toString() === filterLevel;

      // Status filter
      const matchesStatus = filterStatus === 'all' || filterStatus === 'active' && account.is_active || filterStatus === 'inactive' && !account.is_active;
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
    return <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center" dir="rtl">
        <div className="text-right">
          <h2 className="text-2xl font-bold">دليل الحسابات </h2>
          <p className="text-muted-foreground">نظام ذكي لإدارة وتنظيم دليل الحسابات</p>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className={`grid w-full ${isSystemCompany ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="tree" className="flex items-center gap-2">
            <span>شجرة الحسابات</span>
            <Folder className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-2">
            <span>العرض التفاعلي</span>
            <Eye className="h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <span>القوالب</span>
            <Folder className="h-4 w-4" />
          </TabsTrigger>
          {isSystemCompany && (
            <TabsTrigger value="demo-data" className="flex items-center gap-2">
              <span>بيانات تجريبية</span>
              <Database className="h-4 w-4" />
            </TabsTrigger>
          )}
        </TabsList>


        {/* Tree Tab */}
        <TabsContent value="tree" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => setShowSmartWizard(true)} className="flex items-center gap-2">
                <span>إضافة حساب جديد</span>
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => setShowCSVUpload(true)} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <span>استيراد من ملف</span>
                <Upload className="h-4 w-4" />
              </Button>
              {canDeleteAll && (
                <Button 
                  onClick={() => setShowDeleteAllDialog(true)} 
                  variant="destructive" 
                  className="flex items-center gap-2"
                >
                  <span>حذف جميع الحسابات</span>
                  <Skull className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>



          {/* Tree View */}
          <AccountsTreeView
            accounts={allAccounts || []}
            onViewAccount={(account) => {
              setViewingAccount(account);
              setShowViewDialog(true);
            }}
            onEditAccount={(account) => {
              setEditingAccount(account);
              setShowEditDialog(true);
            }}
            onDeleteAccount={(account) => {
              setEditingAccount(account);
              setShowDeleteDialog(true);
            }}
            onAddChildAccount={handleAddChildAccount}
            onViewStatement={(account) => {
              setStatementAccount(account);
              setShowStatementDialog(true);
            }}
          />
        </TabsContent>



        {/* Templates Tab */}
        <TabsContent value="templates">
          <AccountTemplateManager />
        </TabsContent>

        {/* Visualization Tab */}
        <TabsContent value="visualization">
          <EnhancedAccountsVisualization />
        </TabsContent>

        {/* Demo Data Tab - Only for System Company */}
        {isSystemCompany && (
          <TabsContent value="demo-data">
            <DemoDataGenerator />
          </TabsContent>
        )}

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
          {viewingAccount && <div dir="rtl" className="w-full">
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
            </div>}
        </DialogContent>
      </Dialog>

      {/* Enhanced Account Edit Dialog */}
      <EnhancedAccountEditDialog open={showEditDialog} onOpenChange={setShowEditDialog} account={editingAccount} onSuccess={() => {
      setShowEditDialog(false);
      setEditingAccount(null);
    }} />

      {/* Simple Delete Dialog */}
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

      {/* Professional Account Statement Dialog */}
      <ProfessionalAccountStatement 
        open={showStatementDialog} 
        onOpenChange={setShowStatementDialog} 
        accountId={statementAccount?.id} 
        accountCode={statementAccount?.account_code} 
        accountName={statementAccount?.account_name_ar || statementAccount?.account_name}
        accountType={statementAccount?.account_type}
        balanceType={statementAccount?.balance_type}
      />

      {/* Enhanced Delete All Accounts Dialog */}
      <EnhancedDeleteAllAccountsDialog 
        open={showDeleteAllDialog} 
        onOpenChange={setShowDeleteAllDialog} 
      />

      {/* CSV Upload Dialog */}
      <ChartOfAccountsCSVUpload 
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false);
          // The data will refresh automatically due to query invalidation
        }}
      />
    </div>;
};