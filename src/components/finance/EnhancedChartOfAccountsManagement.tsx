import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from '@/hooks/useChartOfAccounts';
import { AccountLevelBadge } from './AccountLevelBadge';
import { AccountBalanceHistory } from './AccountBalanceHistory';
import { AccountChangeHistory } from './AccountChangeHistory';
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
  const [viewingAccount, setViewingAccount] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        <TableCell className="text-right">{account.account_name_ar || account.account_name}</TableCell>
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
                setEditingAccount(account);
                setFormData({
                  account_code: account.account_code,
                  account_name: account.account_name,
                  account_name_ar: account.account_name_ar || '',
                  account_type: account.account_type,
                  account_subtype: account.account_subtype || '',
                  balance_type: account.balance_type,
                  parent_account_id: account.parent_account_id || '',
                  is_header: account.is_header,
                  description: account.description || ''
                });
                setShowEditDialog(true);
              }}
              title="تعديل"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => {
                setEditingAccount(account);
                setShowDeleteDialog(true);
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

      {/* View Account Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
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

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل الحساب</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateAccount.mutateAsync({ id: editingAccount.id, updates: formData });
              setShowEditDialog(false);
              toast.success('تم تحديث الحساب بنجاح');
            } catch (error) {
              toast.error('حدث خطأ في تحديث الحساب');
            }
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_account_code">رمز الحساب</Label>
                <Input
                  id="edit_account_code"
                  value={formData.account_code}
                  onChange={(e) => setFormData({...formData, account_code: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_account_name">اسم الحساب</Label>
                <Input
                  id="edit_account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_account_name_ar">اسم الحساب بالعربية</Label>
                <Input
                  id="edit_account_name_ar"
                  value={formData.account_name_ar}
                  onChange={(e) => setFormData({...formData, account_name_ar: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_account_type">نوع الحساب</Label>
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
                <Label htmlFor="edit_balance_type">نوع الرصيد</Label>
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
                <Label htmlFor="edit_parent_account">الحساب الأب</Label>
                <Select
                  value={formData.parent_account_id}
                  onValueChange={(value) => setFormData({...formData, parent_account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب الأب (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAccounts?.filter(acc => acc.is_header && acc.id !== editingAccount?.id).map((account) => (
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
                id="edit_is_header"
                checked={formData.is_header}
                onCheckedChange={(checked) => setFormData({...formData, is_header: checked})}
              />
              <Label htmlFor="edit_is_header">حساب إجمالي (للتقارير فقط)</Label>
            </div>
            <div>
              <Label htmlFor="edit_description">الوصف</Label>
              <Input
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="وصف اختياري للحساب"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الحساب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>هل أنت متأكد من رغبتك في حذف هذا الحساب؟</p>
            {editingAccount && (
              <div className="p-4 bg-muted rounded">
                <p><strong>رمز الحساب:</strong> {editingAccount.account_code}</p>
                <p><strong>اسم الحساب:</strong> {editingAccount.account_name}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              ملاحظة: لا يمكن حذف الحسابات النظام أو الحسابات التي تحتوي على معاملات
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                إلغاء
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  toast.info('وظيفة الحذف غير مفعلة حالياً');
                  setShowDeleteDialog(false);
                }}
              >
                حذف الحساب
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};