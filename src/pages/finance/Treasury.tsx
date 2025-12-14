/**
 * صفحة الخزينة والبنوك - تصميم جديد
 * متوافق مع الداشبورد الرئيسي
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  Plus,
  Search,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  RefreshCw,
  ArrowLeft,
  Wallet,
  PiggyBank,
  ArrowRightLeft,
  Eye,
  Edit,
  Landmark,
  DollarSign,
  Activity,
} from "lucide-react";
import { useBanks, useCreateBank, useBankTransactions, useTreasurySummary, useCreateBankTransaction, useDeleteBankTransaction, Bank, BankTransaction } from "@/hooks/useTreasury";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCompanyCurrency } from "@/hooks/useCompanyCurrency";
import { cn } from "@/lib/utils";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  trend = 'neutral',
  change,
  delay = 0,
}) => (
  <motion.div
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
          trend === 'up' ? 'bg-green-100 text-green-600' :
          trend === 'down' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        )}>
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

export default function Treasury() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("banks");
  const [isCreateBankDialogOpen, setIsCreateBankDialogOpen] = useState(false);
  const [isCreateTransactionDialogOpen, setIsCreateTransactionDialogOpen] = useState(false);
  
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
        return <ArrowDownRight className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge className="bg-green-100 text-green-700 border-green-200">إيداع</Badge>;
      case 'withdrawal':
        return <Badge className="bg-red-100 text-red-700 border-red-200">سحب</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">تحويل</Badge>;
    }
  };

  // Show loading state
  if (!user || banksLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-coral-500" />
          <p className="text-neutral-500">جاري تحميل بيانات الخزينة...</p>
        </div>
      </div>
    );
  }

  if (banksError) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Banknote className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 font-medium">حدث خطأ في تحميل البيانات</p>
          <Button onClick={() => refetch()} className="mt-4">إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <motion.div
        className="bg-gradient-to-r from-coral-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Landmark className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الخزينة والبنوك</h1>
              <p className="text-white/80 text-sm mt-1">
                إدارة الحسابات المصرفية والمعاملات النقدية
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/finance/hub')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
            <Dialog open={isCreateBankDialogOpen} onOpenChange={setIsCreateBankDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  حساب جديد
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
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <Label htmlFor="isPrimary" className="cursor-pointer">حساب رئيسي</Label>
                    <Switch
                      id="isPrimary"
                      checked={newBank.is_primary}
                      onCheckedChange={(checked) => setNewBank({ ...newBank, is_primary: checked })}
                    />
                  </div>
                  <Button onClick={handleCreateBank} className="w-full bg-coral-500 hover:bg-coral-600" disabled={createBank.isPending}>
                    {createBank.isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Summary in Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الأرصدة</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalBalance || 0)}</p>
            <p className="text-xs text-white/60 mt-1">{summary?.totalBanks || 0} حساب</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">الإيداعات الشهرية</p>
            <p className="text-2xl font-bold mt-1 text-green-200">+{formatCurrency(summary?.monthlyDeposits || 0)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">المسحوبات الشهرية</p>
            <p className="text-2xl font-bold mt-1 text-red-200">-{formatCurrency(summary?.monthlyWithdrawals || 0)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">صافي التدفق</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              (summary?.netFlow || 0) >= 0 ? 'text-green-200' : 'text-red-200'
            )}>
              {(summary?.netFlow || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.netFlow || 0)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الأرصدة"
          value={formatCurrency(summary?.totalBalance || 0)}
          subtitle={`${summary?.totalBanks || 0} حساب مصرفي`}
          icon={Banknote}
          iconBg="bg-gradient-to-br from-coral-500 to-orange-500"
          delay={0.1}
        />
        <StatCard
          title="الإيداعات الشهرية"
          value={formatCurrency(summary?.monthlyDeposits || 0)}
          subtitle="آخر 30 يوم"
          icon={ArrowDownRight}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          trend="up"
          change="+إيداع"
          delay={0.2}
        />
        <StatCard
          title="المسحوبات الشهرية"
          value={formatCurrency(summary?.monthlyWithdrawals || 0)}
          subtitle="آخر 30 يوم"
          icon={ArrowUpRight}
          iconBg="bg-gradient-to-br from-red-500 to-rose-500"
          trend="down"
          change="-سحب"
          delay={0.3}
        />
        <StatCard
          title="صافي التدفق النقدي"
          value={formatCurrency(summary?.netFlow || 0)}
          subtitle="آخر 30 يوم"
          icon={Activity}
          iconBg="bg-gradient-to-br from-blue-500 to-indigo-500"
          trend={(summary?.netFlow || 0) >= 0 ? 'up' : 'down'}
          change={(summary?.netFlow || 0) >= 0 ? 'موجب' : 'سالب'}
          delay={0.4}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-sm">
            <TabsTrigger
              value="banks"
              className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2"
            >
              <Building2 className="w-4 h-4" />
              الحسابات المصرفية
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="data-[state=active]:bg-coral-500 data-[state=active]:text-white rounded-lg px-6 py-2.5 gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              المعاملات
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* Banks Tab */}
        <TabsContent value="banks">
          <motion.div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-neutral-900">الحسابات المصرفية</h3>
                <p className="text-sm text-neutral-500">قائمة جميع الحسابات المصرفية المسجلة</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="البحث في الحسابات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-64 h-10 rounded-xl border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="text-right font-semibold text-neutral-700">البنك</TableHead>
                    <TableHead className="text-right font-semibold text-neutral-700">رقم الحساب</TableHead>
                    <TableHead className="text-right font-semibold text-neutral-700">نوع الحساب</TableHead>
                    <TableHead className="text-right font-semibold text-neutral-700">العملة</TableHead>
                    <TableHead className="text-right font-semibold text-neutral-700">الرصيد الحالي</TableHead>
                    <TableHead className="text-right font-semibold text-neutral-700">الحالة</TableHead>
                    <TableHead className="text-right font-semibold text-neutral-700">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredBanks?.map((bank, index) => (
                      <motion.tr
                        key={bank.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">{bank.bank_name}</p>
                              {bank.is_primary && (
                                <Badge className="bg-coral-100 text-coral-700 text-xs mt-0.5">رئيسي</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-neutral-600">{bank.account_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {bank.account_type === 'checking' && 'جاري'}
                            {bank.account_type === 'savings' && 'توفير'}
                            {bank.account_type === 'business' && 'تجاري'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{bank.currency}</TableCell>
                        <TableCell className="font-semibold text-neutral-900">
                          {formatCurrency(bank.current_balance, { currency: bank.currency })}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            bank.is_active
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          )}>
                            {bank.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-neutral-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="w-4 h-4 text-neutral-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>

            {filteredBanks?.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-neutral-600 font-medium">لا توجد حسابات مصرفية</p>
                <p className="text-sm text-neutral-400 mt-1">أضف حساب مصرفي جديد للبدء</p>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <motion.div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-neutral-900">المعاملات المصرفية</h3>
                <p className="text-sm text-neutral-500">تاريخ جميع المعاملات المصرفية</p>
              </div>
              <Dialog open={isCreateTransactionDialogOpen} onOpenChange={setIsCreateTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-coral-500 hover:bg-coral-600 gap-2">
                    <Plus className="h-4 w-4" />
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
                            <span className="flex items-center gap-2">
                              <ArrowDownRight className="w-4 h-4 text-green-500" />
                              إيداع
                            </span>
                          </SelectItem>
                          <SelectItem value="withdrawal">
                            <span className="flex items-center gap-2">
                              <ArrowUpRight className="w-4 h-4 text-red-500" />
                              سحب
                            </span>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <span className="flex items-center gap-2">
                              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                              تحويل
                            </span>
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
                      className="w-full bg-coral-500 hover:bg-coral-600" 
                      disabled={createTransaction.isPending}
                    >
                      {createTransaction.isPending ? "جاري الإنشاء..." : "إنشاء المعاملة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Table */}
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 animate-spin text-coral-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="text-right font-semibold text-neutral-700">رقم المعاملة</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-700">التاريخ</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-700">النوع</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-700">المبلغ</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-700">الوصف</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-700">الحالة</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-700">الإجراءات</TableHead>
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
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                            transaction.transaction_type === 'deposit' && 'bg-green-50/30',
                            transaction.transaction_type === 'withdrawal' && 'bg-red-50/30'
                          )}
                        >
                          <TableCell className="font-mono text-sm text-neutral-600">
                            {transaction.transaction_number}
                          </TableCell>
                          <TableCell className="text-neutral-600">
                            {new Date(transaction.transaction_date).toLocaleDateString('en-US')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.transaction_type)}
                              {getTransactionBadge(transaction.transaction_type)}
                            </div>
                          </TableCell>
                          <TableCell className={cn(
                            "font-semibold",
                            transaction.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {transaction.transaction_type === 'deposit' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-neutral-600 max-w-[200px] truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              transaction.status === 'completed'
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {transaction.status === 'completed' ? 'مكتملة' : 'معلقة'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4" />
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
                                    className="bg-red-500 hover:bg-red-600"
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
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-neutral-600 font-medium">لا توجد معاملات</p>
                <p className="text-sm text-neutral-400 mt-1">أضف معاملة جديدة للبدء</p>
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
