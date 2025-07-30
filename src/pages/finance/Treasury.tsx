import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { TrendingUp, TrendingDown, Banknote, CreditCard, Plus, Search, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useBanks, useCreateBank, useBankTransactions, useTreasurySummary, useCreateBankTransaction, Bank, BankTransaction } from "@/hooks/useTreasury";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Treasury() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateBankDialogOpen, setIsCreateBankDialogOpen] = useState(false);
  const [isCreateTransactionDialogOpen, setIsCreateTransactionDialogOpen] = useState(false);
  
  const { user } = useAuth();
  const { data: banks, isLoading: banksLoading, error: banksError } = useBanks();
  const { data: transactions, isLoading: transactionsLoading } = useBankTransactions();
  const { data: summary, isLoading: summaryLoading } = useTreasurySummary();
  const createBank = useCreateBank();
  const createTransaction = useCreateBankTransaction();

  const [newBank, setNewBank] = useState<Partial<Bank>>({
    bank_name: '',
    account_number: '',
    account_type: 'checking',
    currency: 'KWD',
    current_balance: 0,
    opening_balance: 0,
    is_active: true,
    is_primary: false
  });

  const [newTransaction, setNewTransaction] = useState({
    transaction_type: 'deposit',
    amount: 0,
    description: '',
    reference_number: '',
    bank_id: ''
  });

  const handleCreateBank = async () => {
    if (!newBank.bank_name || !newBank.account_number || !user?.profile?.company_id) return;

    await createBank.mutateAsync({
      ...newBank,
      company_id: user.profile.company_id,
    } as Omit<Bank, 'id' | 'created_at' | 'updated_at'>);

    setNewBank({
      bank_name: '',
      account_number: '',
      account_type: 'checking',
      currency: 'KWD',
      current_balance: 0,
      opening_balance: 0,
      is_active: true,
      is_primary: false
    });
    setIsCreateBankDialogOpen(false);
  };

  const handleCreateTransaction = async () => {
    console.log('🔄 handleCreateTransaction called');
    console.log('📝 Transaction data:', newTransaction);
    console.log('👤 User data:', user?.profile);
    console.log('🏦 Banks data:', banks);

    if (!newTransaction.description) {
      console.log('❌ Missing description');
      toast.error('يرجى إدخال وصف المعاملة');
      return;
    }
    if (!newTransaction.bank_id) {
      console.log('❌ Missing bank_id');
      toast.error('يرجى اختيار البنك');
      return;
    }
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      console.log('❌ Invalid amount:', newTransaction.amount);
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!user?.profile?.company_id) {
      console.log('❌ Missing company_id');
      toast.error('خطأ في بيانات المستخدم');
      return;
    }

    console.log('✅ All validations passed');

    // Generate transaction number
    const transactionNumber = `TRX-${Date.now()}`;
    
    // Get selected bank details for balance calculation
    const selectedBank = banks?.find(bank => bank.id === newTransaction.bank_id);
    if (!selectedBank) {
      console.log('❌ Bank not found:', newTransaction.bank_id);
      toast.error('البنك المحدد غير موجود');
      return;
    }

    console.log('🏦 Selected bank:', selectedBank);

    const balanceAfter = newTransaction.transaction_type === 'deposit' 
      ? selectedBank.current_balance + newTransaction.amount
      : selectedBank.current_balance - newTransaction.amount;

    console.log('💰 Balance calculation:', {
      current: selectedBank.current_balance,
      amount: newTransaction.amount,
      type: newTransaction.transaction_type,
      after: balanceAfter
    });

    try {
      console.log('🚀 Starting transaction creation...');
      await createTransaction.mutateAsync({
        company_id: user.profile.company_id,
        bank_id: newTransaction.bank_id,
        transaction_number: transactionNumber,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: newTransaction.transaction_type,
        amount: newTransaction.amount,
        balance_after: balanceAfter,
        description: newTransaction.description,
        reference_number: newTransaction.reference_number,
        status: 'completed',
        reconciled: false
      } as Omit<BankTransaction, 'id' | 'created_at' | 'updated_at'>);

      console.log('✅ Transaction created successfully');
      
      setNewTransaction({
        transaction_type: 'deposit',
        amount: 0,
        description: '',
        reference_number: '',
        bank_id: ''
      });
      setIsCreateTransactionDialogOpen(false);
    } catch (error) {
      console.error('❌ Transaction creation failed:', error);
      toast.error('حدث خطأ في إنشاء المعاملة: ' + (error as Error).message);
    }
  };

  const filteredBanks = banks?.filter(bank =>
    bank.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.account_number.includes(searchTerm)
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600';
      case 'withdrawal':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  // Show loading if user is not loaded yet
  if (!user || banksLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  if (banksError) {
    return (
      <div className="text-center text-destructive">
        حدث خطأ في تحميل البيانات
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>الخزينة والبنوك</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الخزينة والبنوك</h1>
          <p className="text-muted-foreground">
            إدارة الحسابات المصرفية والمعاملات النقدية
          </p>
        </div>
        <Dialog open={isCreateBankDialogOpen} onOpenChange={setIsCreateBankDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              حساب مصرفي جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء حساب مصرفي جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الحساب المصرفي الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bankName">اسم البنك</Label>
                <Input
                  id="bankName"
                  value={newBank.bank_name}
                  onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                  placeholder="اسم البنك"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">رقم الحساب</Label>
                <Input
                  id="accountNumber"
                  value={newBank.account_number}
                  onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                  placeholder="رقم الحساب"
                />
              </div>
              <div>
                <Label htmlFor="accountType">نوع الحساب</Label>
                <Select
                  value={newBank.account_type}
                  onValueChange={(value) => setNewBank({ ...newBank, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">حساب جاري</SelectItem>
                    <SelectItem value="savings">حساب توفير</SelectItem>
                    <SelectItem value="business">حساب تجاري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="openingBalance">الرصيد الافتتاحي</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  value={newBank.opening_balance}
                  onChange={(e) => setNewBank({ ...newBank, opening_balance: Number(e.target.value), current_balance: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPrimary"
                  checked={newBank.is_primary}
                  onCheckedChange={(checked) => setNewBank({ ...newBank, is_primary: checked })}
                />
                <Label htmlFor="isPrimary">حساب رئيسي</Label>
              </div>
              <Button onClick={handleCreateBank} className="w-full" disabled={createBank.isPending}>
                {createBank.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalBalance?.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              في {summary?.totalBanks} حساب مصرفي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيداعات الشهرية</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{summary?.monthlyDeposits?.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              آخر 30 يوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المسحوبات الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{summary?.monthlyWithdrawals?.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              آخر 30 يوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي التدفق</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.netFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(summary?.netFlow || 0) >= 0 ? '+' : ''}{summary?.netFlow?.toFixed(3)} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              آخر 30 يوم
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="banks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="banks">الحسابات المصرفية</TabsTrigger>
          <TabsTrigger value="transactions">المعاملات</TabsTrigger>
        </TabsList>

        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>الحسابات المصرفية</CardTitle>
                  <CardDescription>قائمة جميع الحسابات المصرفية المسجلة</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث في الحسابات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم البنك</TableHead>
                    <TableHead>رقم الحساب</TableHead>
                    <TableHead>نوع الحساب</TableHead>
                    <TableHead>العملة</TableHead>
                    <TableHead>الرصيد الحالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBanks?.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <span>{bank.bank_name}</span>
                          {bank.is_primary && (
                            <Badge variant="secondary" className="text-xs">رئيسي</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{bank.account_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {bank.account_type === 'checking' && 'جاري'}
                          {bank.account_type === 'savings' && 'توفير'}
                          {bank.account_type === 'business' && 'تجاري'}
                        </Badge>
                      </TableCell>
                      <TableCell>{bank.currency}</TableCell>
                      <TableCell className="font-medium">
                        {bank.current_balance.toFixed(3)} {bank.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bank.is_active ? "default" : "secondary"}>
                          {bank.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">عرض</Button>
                        <Button variant="ghost" size="sm">تعديل</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredBanks?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد حسابات مصرفية
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>المعاملات المصرفية</CardTitle>
                  <CardDescription>تاريخ جميع المعاملات المصرفية</CardDescription>
                </div>
                <Dialog open={isCreateTransactionDialogOpen} onOpenChange={setIsCreateTransactionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      معاملة جديدة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>إنشاء معاملة مصرفية جديدة</DialogTitle>
                      <DialogDescription>
                        أدخل تفاصيل المعاملة المصرفية الجديدة
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bankSelect">البنك</Label>
                        <Select
                          value={newTransaction.bank_id}
                          onValueChange={(value) => setNewTransaction({ ...newTransaction, bank_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر البنك" />
                          </SelectTrigger>
                          <SelectContent>
                            {banks?.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>
                                {bank.bank_name} - {bank.account_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="transactionType">نوع المعاملة</Label>
                        <Select
                          value={newTransaction.transaction_type}
                          onValueChange={(value) => setNewTransaction({ ...newTransaction, transaction_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deposit">إيداع</SelectItem>
                            <SelectItem value="withdrawal">سحب</SelectItem>
                            <SelectItem value="transfer">تحويل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">المبلغ</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
                          placeholder="0.000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">الوصف</Label>
                        <Textarea
                          id="description"
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                          placeholder="وصف المعاملة"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="referenceNumber">رقم المرجع (اختياري)</Label>
                        <Input
                          id="referenceNumber"
                          value={newTransaction.reference_number}
                          onChange={(e) => setNewTransaction({ ...newTransaction, reference_number: e.target.value })}
                          placeholder="رقم المرجع"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateTransaction} 
                        className="w-full" 
                        disabled={createTransaction.isPending}
                      >
                        {createTransaction.isPending ? "جاري الإنشاء..." : "إنشاء المعاملة"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم المعاملة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.slice(0, 10).map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.transaction_number}</TableCell>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString('en-GB')}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            <span className={getTransactionColor(transaction.transaction_type)}>
                              {transaction.transaction_type === 'deposit' && 'إيداع'}
                              {transaction.transaction_type === 'withdrawal' && 'سحب'}
                              {transaction.transaction_type === 'transfer' && 'تحويل'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={getTransactionColor(transaction.transaction_type)}>
                          {transaction.transaction_type === 'deposit' ? '+' : '-'}{transaction.amount.toFixed(3)} د.ك
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.status === 'completed' ? "default" : "secondary"}>
                            {transaction.status === 'completed' ? 'مكتملة' : 'معلقة'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {transactions?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد معاملات
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}