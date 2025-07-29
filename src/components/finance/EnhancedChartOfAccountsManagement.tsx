import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Plus, Search } from 'lucide-react';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from '@/hooks/useChartOfAccounts';
import { AccountLevelBadge } from './AccountLevelBadge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

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
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: allAccounts, isLoading: allAccountsLoading } = useChartOfAccounts();
  
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

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
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const paddingLeft = level * 24;

    const rows: JSX.Element[] = [
      <TableRow key={account.id} className={level > 0 ? "bg-muted/30" : ""}>
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
            <span className="font-mono text-left">{account.account_code}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">{account.account_name}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline">
            {getAccountTypeLabel(account.account_type)}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={account.balance_type === 'debit' ? 'default' : 'secondary'}>
            {account.balance_type === 'debit' ? 'مدين' : 'دائن'}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={account.is_active ? 'default' : 'destructive'}>
            {account.is_active ? 'نشط' : 'غير نشط'}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex gap-1 justify-center">
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
              أصول
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
              مدين
            </Button>
            <Button size="sm" variant="destructive" className="h-6 px-2 text-xs">
              نشط
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
    if (!accounts) return [];
    
    return accounts.filter(account => {
      const matchesSearch = 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.account_name_ar && account.account_name_ar.includes(searchTerm));
      
      const matchesType = filterType === 'all' || account.account_type === filterType;
      
      return matchesSearch && matchesType;
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">إدارة دليل الحسابات</h2>
          <p className="text-muted-foreground">
            إدارة الحسابات وفقاً لقواعد المحاسبة (القيود مسموحة فقط على المستوى 5 و 6)
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إضافة حساب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة حساب جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_code">رمز الحساب</Label>
                  <Input
                    id="account_code"
                    value={formData.account_code}
                    onChange={(e) => setFormData({...formData, account_code: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account_name">اسم الحساب</Label>
                  <Input
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account_name_ar">اسم الحساب بالعربية</Label>
                  <Input
                    id="account_name_ar"
                    value={formData.account_name_ar}
                    onChange={(e) => setFormData({...formData, account_name_ar: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="account_type">نوع الحساب</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => setFormData({...formData, account_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">الأصول</SelectItem>
                      <SelectItem value="liabilities">الخصوم</SelectItem>
                      <SelectItem value="equity">حقوق الملكية</SelectItem>
                      <SelectItem value="revenue">الإيرادات</SelectItem>
                      <SelectItem value="expenses">المصروفات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="balance_type">نوع الرصيد</Label>
                  <Select
                    value={formData.balance_type}
                    onValueChange={(value) => setFormData({...formData, balance_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">مدين</SelectItem>
                      <SelectItem value="credit">دائن</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="parent_account">الحساب الأب</Label>
                  <Select
                    value={formData.parent_account_id}
                    onValueChange={(value) => setFormData({...formData, parent_account_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحساب الأب (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAccounts?.filter(acc => acc.is_header).map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_header"
                  checked={formData.is_header}
                  onCheckedChange={(checked) => setFormData({...formData, is_header: checked})}
                />
                <Label htmlFor="is_header">حساب إجمالي (للتقارير فقط)</Label>
              </div>
              <div>
                <Label htmlFor="description">الوصف</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="وصف اختياري للحساب"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={createAccount.isPending}>
                  {createAccount.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الحسابات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب النوع" />
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
        </CardContent>
      </Card>

      {/* All Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>جميع الحسابات</CardTitle>
          <CardDescription>
            عرض جميع الحسابات في دليل الحسابات مع بيان القواعد المطبقة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">كود الحساب</TableHead>
                <TableHead className="text-right">اسم الحساب</TableHead>
                <TableHead className="text-center">نوع الحساب</TableHead>
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
    </div>
  );
};