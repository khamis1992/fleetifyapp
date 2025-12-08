/**
 * صفحة القيود اليومية - تصميم جديد متوافق مع الداشبورد
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useEnhancedJournalEntries } from '@/hooks/useGeneralLedger';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  Download,
  CalendarDays,
  Receipt,
  Loader2,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
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
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const Ledger = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch journal entries from database
  const { 
    data: journalEntries, 
    isLoading: isLoadingEntries, 
    error: entriesError,
    refetch: refetchEntries
  } = useEnhancedJournalEntries({
    searchTerm: searchTerm || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    accountId: selectedAccount !== 'all' ? selectedAccount : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Fetch chart of accounts for filtering
  const { 
    data: accounts, 
    isLoading: isLoadingAccounts 
  } = useChartOfAccounts();

  // Calculate statistics
  const stats = useMemo(() => {
    if (!journalEntries) {
      return {
        totalEntries: 0,
        postedEntries: 0,
        draftEntries: 0,
        cancelledEntries: 0,
        totalDebit: 0,
        totalCredit: 0,
      };
    }

    const posted = journalEntries.filter(e => e.status === 'posted');
    const draft = journalEntries.filter(e => e.status === 'draft');
    const cancelled = journalEntries.filter(e => e.status === 'cancelled' || e.status === 'reversed');
    
    const totalDebit = journalEntries.reduce((sum, e) => sum + (e.total_debit || 0), 0);
    const totalCredit = journalEntries.reduce((sum, e) => sum + (e.total_credit || 0), 0);

    return {
      totalEntries: journalEntries.length,
      postedEntries: posted.length,
      draftEntries: draft.length,
      cancelledEntries: cancelled.length,
      totalDebit,
      totalCredit,
    };
  }, [journalEntries]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'posted': return 'مرحّل';
      case 'draft': return 'مسودة';
      case 'cancelled': return 'ملغي';
      case 'reversed': return 'معكوس';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{getStatusText(status)}</Badge>;
      case 'draft':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{getStatusText(status)}</Badge>;
      case 'cancelled':
      case 'reversed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{getStatusText(status)}</Badge>;
      default:
        return <Badge variant="outline">{getStatusText(status)}</Badge>;
    }
  };

  return (
    <FinanceErrorBoundary
      error={entriesError}
      isLoading={isLoadingEntries}
      onRetry={refetchEntries}
      title="خطأ في القيود اليومية"
      context="صفحة القيود اليومية"
    >
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
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">القيود اليومية</h1>
                <p className="text-white/80 text-sm mt-1">
                  إنشاء وإدارة القيود المحاسبية والحركات المالية
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                className="bg-white text-coral-600 hover:bg-white/90"
              >
                <Link to="/finance/new-entry">
                  <Plus className="h-4 w-4 ml-2" />
                  قيد جديد
                </Link>
              </Button>
              <Button
                onClick={() => refetchEntries()}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button
                onClick={() => navigate('/finance/accounting')}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                <ArrowLeft className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">إجمالي القيود</p>
              <p className="text-2xl font-bold mt-1">{stats.totalEntries}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">القيود المرحّلة</p>
              <p className="text-2xl font-bold mt-1 text-green-200">{stats.postedEntries}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">إجمالي المدين</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalDebit)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">إجمالي الدائن</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalCredit)}</p>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="إجمالي القيود"
            value={stats.totalEntries}
            subtitle="جميع القيود"
            icon={FileText}
            iconBg="bg-gradient-to-br from-coral-500 to-orange-500"
            delay={0.1}
          />
          <StatCard
            title="القيود المرحّلة"
            value={stats.postedEntries}
            subtitle="Posted Entries"
            icon={CheckCircle}
            iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
            delay={0.15}
          />
          <StatCard
            title="المسودات"
            value={stats.draftEntries}
            subtitle="Draft Entries"
            icon={Clock}
            iconBg="bg-gradient-to-br from-amber-500 to-yellow-500"
            delay={0.2}
          />
          <StatCard
            title="الملغاة"
            value={stats.cancelledEntries}
            subtitle="Cancelled/Reversed"
            icon={XCircle}
            iconBg="bg-gradient-to-br from-red-500 to-rose-500"
            delay={0.25}
          />
        </div>

        {/* Filters Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-sm p-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-coral-500" />
            <h3 className="font-semibold text-neutral-900">البحث والفلترة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
              <Input
                placeholder="البحث في القيود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-gray-50 border-gray-200"
              />
            </div>
            
            <Input
              type="date"
              placeholder="من تاريخ"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-50 border-gray-200"
            />
            
            <Input
              type="date"
              placeholder="إلى تاريخ"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-50 border-gray-200"
            />

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
                <SelectValue placeholder="اختر الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحسابات</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_code} - {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-50 border-gray-200">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="posted">مرحّل</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Journal Entries */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isLoadingEntries ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-coral-500" />
              <p className="text-neutral-500">جاري تحميل القيود المحاسبية...</p>
            </div>
          ) : !journalEntries || journalEntries.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-coral-100 flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-coral-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-neutral-900">لا توجد قيود محاسبية</h3>
              <p className="text-neutral-500 mb-4">لم يتم العثور على قيود محاسبية تطابق معايير البحث</p>
              <Button asChild className="bg-coral-500 hover:bg-coral-600">
                <Link to="/finance/new-entry">
                  <Plus className="h-4 w-4 ml-2" />
                  إنشاء قيد جديد
                </Link>
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {journalEntries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow border-0 shadow-sm">
                    <CardHeader className="bg-gradient-to-l from-gray-50 to-white border-b py-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-coral-100 flex items-center justify-center">
                              <Receipt className="h-5 w-5 text-coral-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-neutral-900">
                                سند قيد رقم {entry.entry_number || entry.id?.slice(0, 8)}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-neutral-500">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-4 w-4" />
                                  {new Date(entry.entry_date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                                </span>
                                {entry.reference_type && (
                                  <span>المرجع: {entry.reference_type}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(entry.status)}
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4 text-neutral-500" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4 text-neutral-500" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {entry.description && (
                        <div className="bg-blue-50 px-6 py-3 border-b">
                          <p className="text-sm font-medium text-blue-800">
                            البيان: {entry.description}
                          </p>
                        </div>
                      )}
                    
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50">
                            <TableHead className="text-right font-semibold">رمز الحساب</TableHead>
                            <TableHead className="text-right font-semibold">اسم الحساب</TableHead>
                            <TableHead className="text-center font-semibold">البيان</TableHead>
                            <TableHead className="text-center font-semibold text-green-700">مدين</TableHead>
                            <TableHead className="text-center font-semibold text-red-700">دائن</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entry.journal_entry_lines?.map((line, idx) => (
                            <TableRow key={line.id || idx} className="hover:bg-gray-50/50">
                              <TableCell className="font-mono text-center font-medium">
                                {line.chart_of_accounts?.account_code}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="space-y-1">
                                  <div className="font-medium">{line.chart_of_accounts?.account_name}</div>
                                  {line.chart_of_accounts?.account_name_ar && (
                                    <div className="text-xs text-neutral-500">{line.chart_of_accounts?.account_name_ar}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-sm text-neutral-500">
                                {line.line_description || entry.description}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {line.debit_amount > 0 ? (
                                  <span className="text-green-700 font-semibold">
                                    {formatCurrency(line.debit_amount)}
                                  </span>
                                ) : (
                                  <span className="text-neutral-300">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center font-mono">
                                {line.credit_amount > 0 ? (
                                  <span className="text-red-700 font-semibold">
                                    {formatCurrency(line.credit_amount)}
                                  </span>
                                ) : (
                                  <span className="text-neutral-300">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    
                      {/* Totals */}
                      <div className="bg-gradient-to-l from-gray-100 to-gray-50 border-t">
                        <Table>
                          <TableBody>
                            <TableRow className="border-0">
                              <TableCell className="font-bold text-right" colSpan={3}>
                                المجموع
                              </TableCell>
                              <TableCell className="text-center font-mono font-bold text-green-700">
                                {formatCurrency(entry.total_debit || 0)}
                              </TableCell>
                              <TableCell className="text-center font-mono font-bold text-red-700">
                                {formatCurrency(entry.total_credit || 0)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </FinanceErrorBoundary>
  );
};

export default Ledger;
