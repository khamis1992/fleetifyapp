import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { HelpIcon } from '@/components/help/HelpIcon';
import { ChartOfAccountsCSVUpload } from './ChartOfAccountsCSVUpload';
import { DemoDataGenerator } from './DemoDataGenerator';
import { AccountsTreeView } from './AccountsTreeView';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

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

const chartManagementTheme = systemColorPattern.colors;

const accountTypeFilters = [
  { value: 'all', label: 'الكل', helper: 'All', color: chartManagementTheme.success },
  { value: 'assets', label: 'الأصول', helper: '1xxx', color: chartManagementTheme.success },
  { value: 'liabilities', label: 'الخصوم', helper: '2xxx', color: chartManagementTheme.alert },
  { value: 'equity', label: 'حقوق الملكية', helper: '3xxx', color: chartManagementTheme.info },
  { value: 'revenue', label: 'الإيرادات', helper: '4xxx', color: chartManagementTheme.focus },
  { value: 'expenses', label: 'المصروفات', helper: '5xxx', color: chartManagementTheme.alert },
];

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
  const [searchParams, setSearchParams] = useSearchParams();
  
  
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
  const { formatCurrency } = useCurrencyFormatter();
  const formatQar = React.useCallback(
    (amount: number) => formatCurrency(amount || 0, { currency: 'QAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [formatCurrency]
  );

  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowSmartWizard(true);
    }
  }, [searchParams]);

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
      
    } catch (error: unknown) {
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

  const filteredAccounts = React.useMemo(() => {
    return filterAccounts(allAccounts || []);
  }, [allAccounts, searchTerm, filterType, filterLevel, filterStatus]);

  const accountSummary = React.useMemo(() => {
    const list = allAccounts || [];
    const active = list.filter(account => account.is_active !== false);
    const headers = list.filter(account => account.is_header);
    const maxLevel = list.reduce((max, account) => Math.max(max, account.account_level || 1), 1);
    const visible = filteredAccounts.length;

    return {
      total: list.length,
      visible,
      active: active.length,
      inactive: Math.max(list.length - active.length, 0),
      headers: headers.length,
      posting: Math.max(list.length - headers.length, 0),
      maxLevel,
    };
  }, [allAccounts, filteredAccounts]);

  const closeSmartWizard = (open: boolean) => {
    setShowSmartWizard(open);
    if (!open && searchParams.get('action') === 'new') {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  };

  if (allAccountsLoading) {
    return <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>;
  }
  return <div className="chart-management space-y-5" dir="rtl">
      <section className="chart-management-toolbar">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-normal">مركز دليل الحسابات</h2>
              <HelpIcon topic="chartOfAccounts" />
            </div>
            <p className="mt-1 text-sm">
              ابحث، صف الحسابات، وافتح القوالب أو العرض التفاعلي من نفس المساحة.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowSmartWizard(true)} className="chart-management-primary">
              <Plus className="h-4 w-4 ml-2" />
              حساب جديد
            </Button>
            <Button onClick={() => setShowCSVUpload(true)} variant="outline" className="chart-management-action">
              <Upload className="h-4 w-4 ml-2" />
              استيراد
            </Button>
            {canDeleteAll && (
              <Button onClick={() => setShowDeleteAllDialog(true)} variant="destructive" className="gap-2">
                <Skull className="h-4 w-4" />
                حذف الجميع
              </Button>
            )}
          </div>
        </div>

        <div className="chart-management-summary">
          <div>
            <span>{accountSummary.total}</span>
            <p>إجمالي الحسابات</p>
          </div>
          <div>
            <span>{accountSummary.visible}</span>
            <p>نتائج الفلترة</p>
          </div>
          <div>
            <span>{accountSummary.active}</span>
            <p>حساب نشط</p>
          </div>
          <div>
            <span>{accountSummary.headers}</span>
            <p>حساب رئيسي</p>
          </div>
          <div>
            <span>{accountSummary.maxLevel}</span>
            <p>أعمق مستوى</p>
          </div>
        </div>

        <div className="chart-management-controls">
          <div className="chart-management-search">
            <Search className="h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث برقم الحساب، الاسم العربي، أو الاسم الإنجليزي..."
              dir="rtl"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="chart-management-select">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">النشطة فقط</SelectItem>
                <SelectItem value="inactive">غير النشطة</SelectItem>
                <SelectItem value="all">كل الحالات</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="chart-management-select">
                <SelectValue placeholder="المستوى" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المستويات</SelectItem>
                {[1, 2, 3, 4, 5, 6].map(level => (
                  <SelectItem key={level} value={String(level)}>مستوى {level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="chart-management-switch">
              <Switch checked={showInactiveAccounts} onCheckedChange={setShowInactiveAccounts} />
              <span>تحميل غير النشطة</span>
            </label>
          </div>

          <div className="chart-management-result">
            <strong>{accountSummary.visible}</strong>
            <span>حساب ظاهر</span>
          </div>
        </div>

        <div className="chart-management-type-filters" aria-label="تصفية حسب نوع الحساب">
          {accountTypeFilters.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFilterType(type.value)}
              className={filterType === type.value ? 'is-active' : ''}
              style={{ '--type-color': type.color } as React.CSSProperties}
            >
              <span>{type.label}</span>
              <small>{type.helper}</small>
            </button>
          ))}
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className={`chart-management-tabs ${isSystemCompany ? 'chart-management-tabs-system' : ''}`}>
          <TabsTrigger value="tree">
            <Folder className="h-4 w-4" />
            <span>الشجرة</span>
          </TabsTrigger>
          <TabsTrigger value="visualization">
            <Eye className="h-4 w-4" />
            <span>العرض التفاعلي</span>
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4" />
            <span>القوالب</span>
          </TabsTrigger>
          {isSystemCompany && (
            <TabsTrigger value="demo-data">
              <Database className="h-4 w-4" />
              <span>بيانات تجريبية</span>
            </TabsTrigger>
          )}
        </TabsList>


        {/* Tree Tab */}
        <TabsContent value="tree" className="mt-4 space-y-4">
          {/* Tree View */}
          <AccountsTreeView
            accounts={filteredAccounts}
            searchEnabled={false}
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
        <TabsContent value="templates" className="mt-4">
          <AccountTemplateManager />
        </TabsContent>

        {/* Visualization Tab */}
        <TabsContent value="visualization" className="mt-4">
          <EnhancedAccountsVisualization />
        </TabsContent>

        {/* Demo Data Tab - Only for System Company */}
        {isSystemCompany && (
          <TabsContent value="demo-data" className="mt-4">
            <DemoDataGenerator />
          </TabsContent>
        )}

      </Tabs>

      {/* Smart Wizard Dialog */}
      <Dialog open={showSmartWizard} onOpenChange={closeSmartWizard}>
        <DialogContent className="chart-management-dialog max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="chart-management-dialog-header">
            <DialogTitle className="text-right">إنشاء حساب جديد</DialogTitle>
          </DialogHeader>
          <SmartAccountWizardTab />
        </DialogContent>
      </Dialog>

      {/* View Account Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="chart-account-view-dialog max-w-2xl" dir="rtl">
          <DialogHeader className="chart-account-view-header">
            <DialogTitle className="text-right">معاينة الحساب</DialogTitle>
          </DialogHeader>
          {viewingAccount && <div dir="rtl" className="w-full">
            <Tabs defaultValue="info" className="w-full" dir="rtl">
              <TabsList className="chart-account-view-tabs grid w-full grid-cols-2">
                <TabsTrigger value="info">معلومات الحساب</TabsTrigger>
                <TabsTrigger value="history">سجل التغييرات</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="chart-account-view-content text-right">
                <div className="chart-account-balance-card">
                  <div>
                    <p>الرصيد الحالي</p>
                    <strong>{formatQar(viewingAccount.current_balance || 0)}</strong>
                    <span>{viewingAccount.balance_type === 'debit' ? 'رصيد مدين' : 'رصيد دائن'}</span>
                  </div>
                  <Badge className={viewingAccount.is_active ? 'chart-badge-active' : 'chart-badge-inactive'}>
                    {viewingAccount.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>

                <div className="chart-account-info-grid">
                  {[
                    ['رمز الحساب', viewingAccount.account_code],
                    ['اسم الحساب', viewingAccount.account_name],
                    ['اسم الحساب بالعربية', viewingAccount.account_name_ar || '-'],
                    ['نوع الحساب', getAccountTypeLabel(viewingAccount.account_type)],
                    ['طبيعة الرصيد', viewingAccount.balance_type === 'debit' ? 'مدين' : 'دائن'],
                    ['المستوى', viewingAccount.account_level],
                    ['حساب إجمالي', viewingAccount.is_header ? 'نعم' : 'لا'],
                    ['تاريخ الإنشاء', viewingAccount.created_at ? new Date(viewingAccount.created_at).toLocaleDateString('en-GB', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }) : '-'],
                  ].map(([label, value]) => (
                    <div className="chart-account-info-item" key={label}>
                      <Label>{label}</Label>
                      <div>{value}</div>
                    </div>
                  ))}
                  <div className="chart-account-info-item chart-account-info-wide">
                    <Label>الوصف</Label>
                    <div>{viewingAccount.description || '-'}</div>
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
      <style>{`
        .chart-management {
          color: ${chartManagementTheme.text};
        }
        .chart-management-toolbar,
        .chart-management-dialog,
        .chart-management-tabs {
          border-color: ${chartManagementTheme.border} !important;
        }
        .chart-management-toolbar {
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 12px;
          background: ${chartManagementTheme.surface};
          padding: 18px;
          box-shadow: 0 12px 28px rgba(2, 6, 23, 0.05);
        }
        .chart-management-toolbar h2 {
          color: ${chartManagementTheme.text};
        }
        .chart-management-toolbar p {
          color: ${chartManagementTheme.secondaryText};
        }
        .chart-management-primary {
          background: ${chartManagementTheme.success} !important;
          color: white !important;
          border-radius: 10px !important;
          box-shadow: 0 10px 20px rgba(34, 199, 161, 0.18);
        }
        .chart-management-primary:hover {
          background: #1fb391 !important;
        }
        .chart-management-action,
        .chart-management-select {
          border-color: ${chartManagementTheme.border} !important;
          background: white !important;
          color: ${chartManagementTheme.text} !important;
          border-radius: 10px !important;
        }
        .chart-management-action:hover {
          background: ${chartManagementTheme.innerSurface} !important;
        }
        .chart-management-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .chart-management-summary > div {
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 10px;
          background: ${chartManagementTheme.innerSurface};
          padding: 12px;
          min-height: 74px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .chart-management-summary span,
        .chart-management-result strong {
          display: block;
          color: ${chartManagementTheme.text};
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
        }
        .chart-management-summary p,
        .chart-management-result span,
        .chart-management-switch span {
          margin-top: 6px;
          color: ${chartManagementTheme.secondaryText};
          font-size: 12px;
          font-weight: 800;
        }
        .chart-management-search {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 10px;
          background: ${chartManagementTheme.innerSurface};
          min-height: 46px;
          padding: 0 12px;
        }
        .chart-management-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 128px;
          align-items: stretch;
          gap: 10px;
          margin-top: 12px;
        }
        .chart-management-controls .chart-management-search {
          grid-column: 1 / -1;
        }
        .chart-management-controls > * {
          min-height: 46px;
        }
        .chart-management-controls > .grid {
          min-height: 46px;
          align-content: stretch;
        }
        .chart-management-controls > .grid > * {
          height: 46px;
        }
        .chart-management-select {
          height: 46px !important;
        }
        .chart-management-search svg {
          color: ${chartManagementTheme.secondaryText};
          flex: 0 0 auto;
        }
        .chart-management-search input {
          height: 44px;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: ${chartManagementTheme.text};
        }
        .chart-management-switch {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 10px;
          background: white;
          padding: 0 10px;
        }
        .chart-management-result {
          min-width: 118px;
          min-height: 46px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 10px;
          background: ${chartManagementTheme.innerSurface};
          padding: 8px 12px;
          text-align: center;
        }
        .chart-management-type-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }
        .chart-management-type-filters button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 999px;
          background: white;
          color: ${chartManagementTheme.text};
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          transition: 160ms ease;
          min-height: 38px;
        }
        .chart-management-type-filters button small {
          color: ${chartManagementTheme.secondaryText};
          font-size: 11px;
          font-weight: 900;
        }
        .chart-management-type-filters button.is-active {
          border-color: color-mix(in srgb, var(--type-color) 38%, white);
          background: color-mix(in srgb, var(--type-color) 12%, white);
          color: var(--type-color);
        }
        .chart-management-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          height: auto !important;
          gap: 8px;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 12px;
          background: ${chartManagementTheme.innerSurface} !important;
          padding: 8px !important;
        }
        .chart-management-tabs-system {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .chart-management-tabs [role="tab"] {
          min-height: 42px;
          gap: 8px;
          border-radius: 9px !important;
          color: ${chartManagementTheme.secondaryText} !important;
          font-weight: 900;
        }
        .chart-management-tabs [role="tab"][data-state="active"] {
          background: ${chartManagementTheme.success} !important;
          color: white !important;
          box-shadow: 0 10px 20px rgba(34, 199, 161, 0.16);
        }
        .chart-management-dialog {
          border-radius: 14px !important;
          background: ${chartManagementTheme.surface} !important;
        }
        .chart-management-dialog-header {
          border-bottom: 1px solid ${chartManagementTheme.border};
          padding-bottom: 14px;
        }
        .chart-account-view-dialog {
          border: 1px solid ${chartManagementTheme.border} !important;
          border-radius: 14px !important;
          background: ${chartManagementTheme.surface} !important;
          color: ${chartManagementTheme.text};
        }
        .chart-account-view-header {
          border-bottom: 1px solid ${chartManagementTheme.border};
          padding-bottom: 12px;
        }
        .chart-account-view-tabs {
          height: auto !important;
          gap: 8px;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 12px;
          background: ${chartManagementTheme.innerSurface} !important;
          padding: 6px !important;
        }
        .chart-account-view-tabs [role="tab"] {
          min-height: 38px;
          border-radius: 9px !important;
          color: ${chartManagementTheme.secondaryText} !important;
          font-weight: 900;
        }
        .chart-account-view-tabs [role="tab"][data-state="active"] {
          background: ${chartManagementTheme.success} !important;
          color: white !important;
        }
        .chart-account-view-content {
          margin-top: 14px;
          display: grid;
          gap: 12px;
        }
        .chart-account-balance-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 12px;
          background: ${chartManagementTheme.innerSurface};
          padding: 14px;
        }
        .chart-account-balance-card p,
        .chart-account-balance-card span,
        .chart-account-info-item label {
          color: ${chartManagementTheme.secondaryText};
          font-size: 12px;
          font-weight: 900;
        }
        .chart-account-balance-card strong {
          display: block;
          color: ${chartManagementTheme.success};
          font-size: 24px;
          font-weight: 950;
          line-height: 1.2;
          direction: ltr;
          text-align: right;
        }
        .chart-account-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .chart-account-info-item {
          border: 1px solid ${chartManagementTheme.border};
          border-radius: 10px;
          background: white;
          padding: 10px 12px;
          min-height: 64px;
        }
        .chart-account-info-item div {
          margin-top: 5px;
          color: ${chartManagementTheme.text};
          font-weight: 900;
          word-break: break-word;
        }
        .chart-account-info-wide {
          grid-column: 1 / -1;
        }
        .chart-badge-active {
          border: 1px solid color-mix(in srgb, ${chartManagementTheme.success} 35%, white) !important;
          background: color-mix(in srgb, ${chartManagementTheme.success} 14%, white) !important;
          color: ${chartManagementTheme.success} !important;
        }
        .chart-badge-inactive {
          border: 1px solid color-mix(in srgb, ${chartManagementTheme.alert} 35%, white) !important;
          background: color-mix(in srgb, ${chartManagementTheme.alert} 12%, white) !important;
          color: ${chartManagementTheme.alert} !important;
        }
        @media (max-width: 900px) {
          .chart-management-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .chart-management-tabs,
          .chart-management-tabs-system {
            grid-template-columns: 1fr;
          }
          .chart-management-controls {
            grid-template-columns: 1fr;
          }
          .chart-management-controls .chart-management-search {
            grid-column: auto;
          }
          .chart-account-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>;
};
