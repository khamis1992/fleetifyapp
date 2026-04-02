/**
 * Treasury - Professional Bank & Cash Management Redesign
 * Clean design with bank cards, progress bars, and transaction table
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Landmark,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Wallet,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { useBanks, useCreateBank, useBankTransactions, useTreasurySummary, useCreateBankTransaction, useDeleteBankTransaction, Bank, BankTransaction } from "@/hooks/useTreasury";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Treasury() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("banks");
  const [isCreateBankDialogOpen, setIsCreateBankDialogOpen] = useState(false);
  const [isCreateTransactionDialogOpen, setIsCreateTransactionDialogOpen] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: banks, isLoading: banksLoading, error: banksError, refetch } = useBanks();
  const { data: transactions, isLoading: transactionsLoading } = useBankTransactions();
  const { data: summary, isLoading: summaryLoading } = useTreasurySummary();
  const createBank = useCreateBank();
  const createTransaction = useCreateBankTransaction();
  const deleteTransaction = useDeleteBankTransaction();
  const { formatCurrency } = useCurrencyFormatter();
  const { currency: companyCurrency } = useCompanyCurrency();

  const [newBank, setNewBank] = useState<Partial<Bank>>({
    bank_name: '',
    account_number: '',
    account_type: 'checking',
    currency: companyCurrency,
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
      currency: companyCurrency,
      current_balance: 0,
      opening_balance: 0,
      is_active: true,
      is_primary: false
    });
    setIsCreateBankDialogOpen(false);
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.description) {
      toast.error('يرجى إدخال وصف المعاملة');
      return;
    }
    if (!newTransaction.bank_id) {
      toast.error('يرجى اختيار البنك');
      return;
    }
    if (!newTransaction.amount || newTransaction.amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    if (!user?.profile?.company_id) {
      toast.error('خطأ في بيانات المستخدم');
      return;
    }

    const transactionNumber = `TRX-${Date.now()}`;
    const selectedBank = banks?.find(bank => bank.id === newTransaction.bank_id);
    if (!selectedBank) {
      toast.error('البنك المحدد غير موجود');
      return;
    }

    const balanceAfter = newTransaction.transaction_type === 'deposit' 
      ? selectedBank.current_balance + newTransaction.amount
      : selectedBank.current_balance - newTransaction.amount;

    try {
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
      
      setNewTransaction({
        transaction_type: 'deposit',
        amount: 0,
        description: '',
        reference_number: '',
        bank_id: ''
      });
      setIsCreateTransactionDialogOpen(false);
    } catch (error) {
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
        return <ArrowDownRight className="h-4 w-4 text-emerald-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-rose-600" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-sky-600" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">إيداع</Badge>;
      case 'withdrawal':
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200">سحب</Badge>;
      default:
        return <Badge className="bg-sky-100 text-sky-700 border-sky-200">تحويل</Badge>;
    }
  };

  if (!user || banksLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
          <p className="text-slate-500">جاري تحميل بيانات الخزينة...</p>
        </div>
      </div>
    );
  }

  if (banksError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <Landmark className="w-8 h-8 text-rose-500" />
          </div>
          <p className="text-rose-600 font-medium">حدث خطأ في تحميل البيانات</p>
          <Button onClick={() => refetch()} className="mt-4">إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Landmark className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">الخزينة والبنوك</h1>
              <p className="text-sm text-slate-500">إدارة الحسابات المصرفية والمعاملات النقدية</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/finance/hub')}>
              العودة للوحة التحكم
            </Button>
            <Button className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg" onClick={() => setIsCreateBankDialogOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              حساب جديد
            </Button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الأرصدة"
          value={formatCurrency(summary?.totalBalance || 0)}
          subtitle={`${summary?.totalBanks || 0} حساب مصرفي`}
          icon={Wallet}
          variant="coral"
          delay={0.1}
        />
        <StatCard
          title="الإيداعات الشهرية"
          value={formatCurrency(summary?.monthlyDeposits || 0)}
          subtitle="آخر 30 يوم"
          icon={ArrowDownRight}
          variant="success"
          trend="up"
          change="+إيداع"
          delay={0.15}
        />
        <StatCard
          title="المسحوبات الشهرية"
          value={formatCurrency(summary?.monthlyWithdrawals || 0)}
          subtitle="آخر 30 يوم"
          icon={ArrowUpRight}
          variant="danger"
          trend="down"
          change="-سحب"
          delay={0.2}
        />
        <StatCard
          title="صافي التدفق النقدي"
          value={formatCurrency(summary?.netFlow || 0)}
          subtitle="آخر 30 يوم"
          icon={Activity}
          variant="sky"
          trend={(summary?.netFlow || 0) >= 0 ? 'up' : 'down'}
          change={(summary?.netFlow || 0) >= 0 ? 'موجب' : 'سالب'}
          delay={0.25}
        />
      </div>

      {/* Bank Cards Grid */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">الحسابات المصرفية</h2>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('banks')}>
            عرض الكل
            <ArrowRightLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBanks?.slice(0, 4).map((bank, index) => {
            const creditLimit = bank.opening_balance * 1.5;
            const usagePercent = (bank.current_balance / creditLimit) * 100;
            return (
              <motion.div
                key={bank.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all"
                onClick={() => setActiveTab('banks')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  {bank.is_primary && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                      رئيسي
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{bank.bank_name}</h3>
                <p className="text-xs text-slate-500 mb-3">{bank.account_number}</p>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">الرصيد الحالي</span>
                    <span className="font-bold text-slate-900">{formatCurrency(bank.current_balance, { currency: bank.currency })}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={cn(
                        "h-2 rounded-full transition-all",
                        usagePercent > 80 ? "bg-rose-500" : usagePercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {bank.account_type === 'checking' && 'جاري'}
                    {bank.account_type === 'savings' && 'توفير'}
                    {bank.account_type === 'business' && 'تجاري'}
                  </Badge>
                  <Badge className={cn(
                    bank.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                  )}>
                    {bank.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
          
          {/* Add New Bank Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 4 * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-slate-50 rounded-xl p-5 border-2 border-dashed border-slate-300 hover:border-rose-500 cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
            onClick={() => setIsCreateBankDialogOpen(true)}
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">إضافة حساب جديد</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div
        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <ArrowRightLeft className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">المعاملات البنكية</h3>
                <p className="text-sm text-slate-500">تاريخ جميع المعاملات المصرفية</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="البحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 w-64"
                />
              </div>
              <Button className="bg-gradient-to-r from-rose-500 to-orange-500" onClick={() => setIsCreateTransactionDialogOpen(true)}>
                <Plus className="w-4 h-4 ml-2" />
                معاملة جديدة
              </Button>
            </div>
          </div>
        </div>

        {transactionsLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-10 h-10 animate-spin text-rose-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-100">
                  <TableHead className="text-right font-semibold">رقم المعاملة</TableHead>
                  <TableHead className="text-right font-semibold">التاريخ</TableHead>
                  <TableHead className="text-right font-semibold">النوع</TableHead>
                  <TableHead className="text-right font-semibold">المبلغ</TableHead>
                  <TableHead className="text-right font-semibold">الوصف</TableHead>
                  <TableHead className="text-right font-semibold">الحالة</TableHead>
                  <TableHead className="text-right font-semibold">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {transactions?.slice(0, 10).map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "border-b border-slate-50 hover:bg-slate-50/50 transition-colors",
                        transaction.transaction_type === 'deposit' && 'bg-emerald-50/30',
                        transaction.transaction_type === 'withdrawal' && 'bg-rose-50/30'
                      )}
                    >
                      <TableCell className="font-mono text-sm text-slate-600">
                        {transaction.transaction_number}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(transaction.transaction_date).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          {getTransactionBadge(transaction.transaction_type)}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "font-semibold",
                        transaction.transaction_type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {transaction.transaction_type === 'deposit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-[200px] truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          transaction.status === 'completed'
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        )}>
                          {transaction.status === 'completed' ? 'مكتملة' : 'معلقة'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد حذف المعاملة</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف المعاملة رقم {transaction.transaction_number}؟
                                <br />
                                هذا الإجراء لا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTransaction.mutate(transaction.id)}
                                className="bg-rose-500 hover:bg-rose-600"
                                disabled={deleteTransaction.isPending}
                              >
                                {deleteTransaction.isPending ? "جاري الحذف..." : "حذف"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}

        {transactions?.length === 0 && !transactionsLoading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ArrowRightLeft className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">لا توجد معاملات</p>
            <p className="text-sm text-slate-400 mt-1">أضف معاملة جديدة للبدء</p>
          </div>
        )}
      </motion.div>

      {/* Create Bank Dialog */}
      <Dialog open={isCreateBankDialogOpen} onOpenChange={setIsCreateBankDialogOpen}>
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
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">رقم الحساب</Label>
              <Input
                id="accountNumber"
                value={newBank.account_number}
                onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                placeholder="رقم الحساب"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="accountType">نوع الحساب</Label>
              <Select
                value={newBank.account_type}
                onValueChange={(value) => setNewBank({ ...newBank, account_type: value })}
              >
                <SelectTrigger className="mt-1">
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
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <Label htmlFor="isPrimary" className="cursor-pointer">حساب رئيسي</Label>
              <Switch
                id="isPrimary"
                checked={newBank.is_primary}
                onCheckedChange={(checked) => setNewBank({ ...newBank, is_primary: checked })}
              />
            </div>
            <Button
              onClick={handleCreateBank}
              className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
              disabled={createBank.isPending}
            >
              {createBank.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Transaction Dialog */}
      <Dialog open={isCreateTransactionDialogOpen} onOpenChange={setIsCreateTransactionDialogOpen}>
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
                <SelectTrigger className="mt-1">
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
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                      إيداع
                    </div>
                  </SelectItem>
                  <SelectItem value="withdrawal">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-rose-500" />
                      سحب
                    </div>
                  </SelectItem>
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
                className="mt-1"
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
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="referenceNumber">رقم المرجع (اختياري)</Label>
              <Input
                id="referenceNumber"
                value={newTransaction.reference_number}
                onChange={(e) => setNewTransaction({ ...newTransaction, reference_number: e.target.value })}
                placeholder="رقم المرجع"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCreateTransaction}
              className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
              disabled={createTransaction.isPending}
            >
              {createTransaction.isPending ? "جاري الإنشاء..." : "إنشاء المعاملة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}