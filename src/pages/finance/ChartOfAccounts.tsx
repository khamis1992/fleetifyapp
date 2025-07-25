import React, { useState } from 'react';
import { Plus, Search, Filter, TreePine, Copy, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useChartOfAccounts, useCreateAccount, useCopyDefaultAccounts, ChartOfAccount } from '@/hooks/useFinance';
import { HierarchicalAccountsList } from '@/components/finance/HierarchicalAccountsList';
import { useAuth } from '@/contexts/AuthContext';

const ChartOfAccounts = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'hierarchical' | 'flat'>('hierarchical');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  
  const { data: accounts, isLoading, error } = useChartOfAccounts();
  const createAccountMutation = useCreateAccount();
  const copyDefaultAccountsMutation = useCopyDefaultAccounts();
  const { user } = useAuth();

  const [newAccount, setNewAccount] = useState<{
    account_code: string;
    account_name: string;
    account_name_ar: string;
    account_type: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';
    account_subtype: string;
    balance_type: 'debit' | 'credit';
    parent_account_id?: string;
    description: string;
  }>({
    account_code: '',
    account_name: '',
    account_name_ar: '',
    account_type: 'assets',
    account_subtype: '',
    balance_type: 'debit',
    parent_account_id: undefined,
    description: '',
  });

  const handleCreateAccount = async () => {
    try {
      await createAccountMutation.mutateAsync(newAccount);
      setNewAccount({
        account_code: '',
        account_name: '',
        account_name_ar: '',
        account_type: 'assets',
        account_subtype: '',
        balance_type: 'debit',
        parent_account_id: undefined,
        description: '',
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleCopyDefaultAccounts = async () => {
    if (!user?.profile?.company_id) return;
    try {
      await copyDefaultAccountsMutation.mutateAsync(user.profile.company_id);
    } catch (error) {
      console.error('Error copying default accounts:', error);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts?.filter(account => {
    const matchesSearch = searchTerm === '' || 
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || account.account_type === filterType;
    
    return matchesSearch && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        حدث خطأ في تحميل البيانات
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-primary p-8 rounded-2xl text-primary-foreground shadow-elevated">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Search className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">دليل الحسابات</h1>
            <p className="text-primary-foreground/80">
              إدارة الهيكل المحاسبي الهرمي للشركة
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث في الحسابات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="نوع الحساب" />
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

            <div className="flex items-center gap-2">
              {(!accounts || accounts.length === 0) && (
                <Button
                  variant="outline"
                  onClick={handleCopyDefaultAccounts}
                  disabled={copyDefaultAccountsMutation.isPending}
                >
                  <Copy className="h-4 w-4 ml-2" />
                  نسخ دليل الحسابات الافتراضي
                </Button>
              )}
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة حساب جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>إنشاء حساب جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>كود الحساب</Label>
                        <Input
                          value={newAccount.account_code}
                          onChange={(e) => setNewAccount({...newAccount, account_code: e.target.value})}
                          placeholder="1001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>نوع الحساب</Label>
                        <Select 
                          value={newAccount.account_type} 
                          onValueChange={(value: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses') => 
                            setNewAccount({...newAccount, account_type: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assets">أصول</SelectItem>
                            <SelectItem value="liabilities">خصوم</SelectItem>
                            <SelectItem value="equity">حقوق ملكية</SelectItem>
                            <SelectItem value="revenue">إيرادات</SelectItem>
                            <SelectItem value="expenses">مصروفات</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>اسم الحساب</Label>
                      <Input
                        value={newAccount.account_name}
                        onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                        placeholder="اسم الحساب"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>طبيعة الرصيد</Label>
                      <Select 
                        value={newAccount.balance_type} 
                        onValueChange={(value: 'debit' | 'credit') => 
                          setNewAccount({...newAccount, balance_type: value})
                        }
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

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        إلغاء
                      </Button>
                      <Button onClick={handleCreateAccount} disabled={createAccountMutation.isPending}>
                        إنشاء الحساب
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {!accounts || accounts.length === 0 ? (
                <div className="space-y-4">
                  <p>لا توجد حسابات في دليل الحسابات</p>
                  <Button
                    onClick={handleCopyDefaultAccounts}
                    disabled={copyDefaultAccountsMutation.isPending}
                  >
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ دليل الحسابات الافتراضي
                  </Button>
                </div>
              ) : (
                'لا توجد حسابات تطابق معايير البحث'
              )}
            </div>
          ) : (
            <HierarchicalAccountsList
              accounts={filteredAccounts}
              expandedAccounts={expandedAccounts}
              onToggleExpanded={(accountId) => {
                const newExpanded = new Set(expandedAccounts);
                if (newExpanded.has(accountId)) {
                  newExpanded.delete(accountId);
                } else {
                  newExpanded.add(accountId);
                }
                setExpandedAccounts(newExpanded);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartOfAccounts;