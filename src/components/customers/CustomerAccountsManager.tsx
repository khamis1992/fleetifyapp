import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, CreditCard, Wand2, Star } from 'lucide-react';
import { CustomerAccountForm } from './CustomerAccountForm';
import { 
  useCustomerAccounts, 
  useDeleteCustomerAccount, 
  useAutoCreateCustomerAccounts 
} from '@/hooks/useEnhancedCustomerAccounts';
import { Customer } from '@/types/customer';
import { CustomerAccount } from '@/types/customerAccount';
// Utility function to format currency
const formatCurrency = (amount: number, currency: string = 'KWD') => {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
};

interface CustomerAccountsManagerProps {
  customer: Customer;
}

export const CustomerAccountsManager: React.FC<CustomerAccountsManagerProps> = ({ customer }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CustomerAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [autoCreateDialogOpen, setAutoCreateDialogOpen] = useState(false);

  const { data: accounts = [], isLoading } = useCustomerAccounts(customer.id);
  const deleteAccountMutation = useDeleteCustomerAccount();
  const autoCreateMutation = useAutoCreateCustomerAccounts();

  const handleEditAccount = (account: CustomerAccount) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteAccountMutation.mutate({ accountId: accountToDelete, customerId: customer.id });
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleAutoCreate = () => {
    setAutoCreateDialogOpen(true);
  };

  const confirmAutoCreate = () => {
    autoCreateMutation.mutate({
      customerId: customer.id,
      companyId: customer.company_id
    });
    setAutoCreateDialogOpen(false);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  const getAccountTypeBadge = (account: CustomerAccount) => {
    if (!account.account_type) return null;
    
    const variant = account.account_type.account_category === 'current_assets' ? 'default' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs">
        {account.account_type.type_name_ar}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            الحسابات المحاسبية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">جارٍ تحميل الحسابات...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            الحسابات المحاسبية ({accounts.length})
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoCreate}
              disabled={autoCreateMutation.isPending}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              إنشاء تلقائي
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة حساب
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingAccount ? 'تعديل الحساب المحاسبي' : 'إضافة حساب محاسبي جديد'}
                  </DialogTitle>
                </DialogHeader>
                <CustomerAccountForm
                  customer={customer}
                  account={editingAccount}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground space-y-4">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد حسابات محاسبية مرتبطة بهذا العميل</p>
            <p className="text-sm">
              يمكنك إضافة حساب جديد أو استخدام الإنشاء التلقائي لإنشاء الحسابات الأساسية
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleAutoCreate}
                disabled={autoCreateMutation.isPending}
                className="flex items-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                {autoCreateMutation.isPending ? 'جارِ الإنشاء...' : 'إنشاء تلقائي'}
              </Button>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة حساب يدوياً
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>إضافة حساب محاسبي جديد</DialogTitle>
                  </DialogHeader>
                  <CustomerAccountForm
                    customer={customer}
                    account={null}
                    onSuccess={handleFormClose}
                    onCancel={handleFormClose}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع الحساب</TableHead>
                <TableHead>الحساب المحاسبي</TableHead>
                <TableHead>الرصيد الحالي</TableHead>
                <TableHead>حد الائتمان</TableHead>
                <TableHead>العملة</TableHead>
                <TableHead>افتراضي</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    {getAccountTypeBadge(account)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {account.account?.account_code} - {account.account?.account_name}
                      </div>
                      {account.account_purpose && (
                        <div className="text-sm text-muted-foreground">
                          {account.account_purpose}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(account.account?.current_balance || 0, account.currency)}
                  </TableCell>
                  <TableCell>
                    {account.credit_limit ? formatCurrency(account.credit_limit, account.currency) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.currency}</Badge>
                  </TableCell>
                  <TableCell>
                    {account.is_default && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* مربع حوار تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الحساب المحاسبي؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* مربع حوار تأكيد الإنشاء التلقائي */}
      <AlertDialog open={autoCreateDialogOpen} onOpenChange={setAutoCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إنشاء الحسابات تلقائياً</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد إنشاء الحسابات المحاسبية تلقائياً لهذا العميل؟ سيتم إنشاء الحسابات الافتراضية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoCreate}>إنشاء</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};