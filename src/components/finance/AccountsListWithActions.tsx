import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  Trash2, 
  Search, 
  Eye,
  Edit,
  FileText,
  Filter
} from 'lucide-react';
import { useChartOfAccounts, useDeleteAccount } from '@/hooks/useChartOfAccounts';
import { toast } from 'sonner';

interface AccountsListWithActionsProps {
  onViewAccount?: (account: any) => void;
  onEditAccount?: (account: any) => void;
  onDeleteAccount?: (account: any) => void;
  showActions?: {
    view?: boolean;
    edit?: boolean;
    delete?: boolean;
    statement?: boolean;
  };
  maxHeight?: string;
  showFilters?: boolean;
}

export const AccountsListWithActions: React.FC<AccountsListWithActionsProps> = ({
  onViewAccount,
  onEditAccount,
  onDeleteAccount,
  showActions = { view: true, edit: true, delete: true, statement: true },
  maxHeight = "h-96",
  showFilters = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const { data: allAccounts, isLoading } = useChartOfAccounts();
  const deleteAccount = useDeleteAccount();

  const handleDeleteSingle = async (account: any) => {
    if (!account?.id) return;
    
    setDeletingAccountId(account.id);
    
    try {
      console.log('[DELETE_SINGLE] حذف حساب منفرد:', {
        accountId: account.id,
        accountCode: account.account_code,
        accountName: account.account_name
      });
      
      await deleteAccount.mutateAsync(account.id);
      
      toast.success(`تم حذف الحساب ${account.account_code} بنجاح`);
      
      // استدعاء callback إذا كان موجود
      onDeleteAccount?.(account);
      
    } catch (error: any) {
      console.error('[DELETE_SINGLE] فشل حذف الحساب:', error);
      toast.error(`فشل في حذف الحساب ${account.account_code}: ${error.message}`);
    } finally {
      setDeletingAccountId(null);
    }
  };

  // تصفية الحسابات
  const filteredAccounts = allAccounts?.filter(account => {
    const matchesSearch = !searchTerm || 
      account.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_name_ar?.includes(searchTerm);
    
    const matchesType = filterType === 'all' || account.account_type === filterType;
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && account.is_active) ||
      (filterStatus === 'inactive' && !account.is_active) ||
      (filterStatus === 'system' && account.is_system) ||
      (filterStatus === 'regular' && !account.is_system);
    
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return 'أصول';
      case 'liability': return 'خصوم';
      case 'equity': return 'حقوق ملكية';
      case 'revenue': return 'إيرادات';
      case 'expense': return 'مصروفات';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>جاري تحميل الحسابات...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          قائمة الحسابات ({filteredAccounts.length} من {allAccounts?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* فلاتر البحث */}
        {showFilters && (
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الحسابات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 text-right"
                dir="rtl"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="asset">الأصول</SelectItem>
                <SelectItem value="liability">الخصوم</SelectItem>
                <SelectItem value="equity">حقوق الملكية</SelectItem>
                <SelectItem value="revenue">الإيرادات</SelectItem>
                <SelectItem value="expense">المصروفات</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشط فقط</SelectItem>
                <SelectItem value="inactive">غير نشط فقط</SelectItem>
                <SelectItem value="system">نظامي فقط</SelectItem>
                <SelectItem value="regular">عادي فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* قائمة الحسابات */}
        <ScrollArea className={maxHeight}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رمز الحساب</TableHead>
                <TableHead className="text-right">اسم الحساب</TableHead>
                <TableHead className="text-center">النوع</TableHead>
                <TableHead className="text-center">المستوى</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">الرصيد</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد حسابات مطابقة للفلاتر المحددة
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {account.account_code}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <div className="font-medium">
                          {account.account_name_ar || account.account_name}
                        </div>
                        {account.account_name_ar && account.account_name !== account.account_name_ar && (
                          <div className="text-xs text-muted-foreground">
                            {account.account_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {getAccountTypeLabel(account.account_type)}
                        </Badge>
                        {account.is_system && (
                          <Badge variant="destructive" className="text-xs">
                            نظامي
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        المستوى {account.account_level || 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {account.current_balance ? 
                        new Intl.NumberFormat('ar-KW', {
                          style: 'currency',
                          currency: 'KWD',
                          minimumFractionDigits: 3
                        }).format(account.current_balance) : 
                        '0.000'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {showActions.view && onViewAccount && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewAccount(account)}
                            className="h-8 w-8 p-0"
                            title="عرض تفاصيل الحساب"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {showActions.statement && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // يمكن إضافة logic لكشف الحساب هنا
                              toast.info(`كشف حساب ${account.account_code} - قريباً`);
                            }}
                            className="h-8 w-8 p-0"
                            title="كشف حساب"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {showActions.edit && onEditAccount && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditAccount(account)}
                            className="h-8 w-8 p-0"
                            title="تعديل الحساب"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {showActions.delete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSingle(account)}
                            disabled={deletingAccountId === account.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="حذف الحساب"
                          >
                            {deletingAccountId === account.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* إحصائيات سريعة */}
        {filteredAccounts.length > 0 && (
          <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <div>
              إجمالي الحسابات المعروضة: <strong>{filteredAccounts.length}</strong>
            </div>
            <div className="flex gap-4">
              <span>نشط: <strong>{filteredAccounts.filter(acc => acc.is_active).length}</strong></span>
              <span>غير نشط: <strong>{filteredAccounts.filter(acc => !acc.is_active).length}</strong></span>
              <span>نظامي: <strong>{filteredAccounts.filter(acc => acc.is_system).length}</strong></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsListWithActions;
