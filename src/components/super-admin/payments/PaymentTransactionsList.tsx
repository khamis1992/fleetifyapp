import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Calendar, CreditCard, Download, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

type TransactionRow = Database['public']['Tables']['subscription_transactions']['Row'];

interface PaymentTransaction extends TransactionRow {
  company_name: string;
  subscription_plan: string;
}

const getDateCutoff = (range: string): number => {
  const now = new Date();
  if (range === 'year') return new Date(now.getFullYear(), 0, 1).getTime();
  const days = range === '7days' ? 7 : range === '90days' ? 90 : 30;
  return now.getTime() - days * 24 * 60 * 60 * 1000;
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const PaymentTransactionsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30days');
  const { formatCurrency } = useCurrencyFormatter();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['subscription-transactions'],
    queryFn: async (): Promise<PaymentTransaction[]> => {
      const { data: rows, error: rowsError } = await supabase
        .from('subscription_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (rowsError) throw rowsError;

      const companyIds = [...new Set((rows || []).map(row => row.company_id))];
      const planIds = [...new Set((rows || []).map(row => row.subscription_plan_id))];
      const [companiesResult, plansResult] = await Promise.all([
        companyIds.length
          ? supabase.from('companies').select('id,name,name_ar').in('id', companyIds)
          : Promise.resolve({ data: [], error: null }),
        planIds.length
          ? supabase.from('subscription_plans').select('id,name,name_ar,plan_code').in('id', planIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (companiesResult.error) throw companiesResult.error;
      if (plansResult.error) throw plansResult.error;

      const companyMap = new Map(
        (companiesResult.data || []).map(company => [company.id, company.name_ar || company.name])
      );
      const planMap = new Map(
        (plansResult.data || []).map(plan => [plan.id, plan.name_ar || plan.name || plan.plan_code || 'غير محدد'])
      );

      return (rows || []).map(row => ({
        ...row,
        company_name: companyMap.get(row.company_id) || 'شركة غير معروفة',
        subscription_plan: planMap.get(row.subscription_plan_id) || 'خطة غير معروفة',
      }));
    },
  });

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const cutoff = getDateCutoff(dateRange);
    return transactions.filter(transaction => {
      const transactionDate = transaction.processed_at || transaction.created_at;
      const matchesDate = !!transactionDate && new Date(transactionDate).getTime() >= cutoff;
      const matchesSearch = !query ||
        transaction.company_name.toLowerCase().includes(query) ||
        (transaction.transaction_reference || '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      const matchesMethod = methodFilter === 'all' || transaction.payment_method === methodFilter;
      return matchesDate && matchesSearch && matchesStatus && matchesMethod;
    });
  }, [dateRange, methodFilter, searchTerm, statusFilter, transactions]);

  const exportTransactions = () => {
    const headers = ['reference', 'company', 'amount', 'currency', 'status', 'method', 'plan', 'date', 'notes'];
    const lines = filteredTransactions.map(transaction => [
      transaction.transaction_reference,
      transaction.company_name,
      transaction.amount,
      transaction.currency || 'QAR',
      transaction.status,
      transaction.payment_method,
      transaction.subscription_plan,
      transaction.processed_at || transaction.created_at,
      transaction.notes,
    ].map(escapeCsv).join(','));
    const blob = new Blob([`\uFEFF${[headers.join(','), ...lines].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subscription-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalAmount = filteredTransactions
    .filter(transaction => transaction.status === 'completed')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const statusBadge = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'مكتملة', pending: 'معلقة', failed: 'فاشلة', refunded: 'مستردة', cancelled: 'ملغاة',
    };
    const variant = status === 'failed' ? 'destructive' : status === 'completed' ? 'default' : 'secondary';
    return <Badge variant={variant}>{labels[status] || status}</Badge>;
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري تحميل المعاملات...</div>;
  if (error) return <div className="p-8 text-center text-destructive">تعذر تحميل معاملات الاشتراك</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">المعاملات</p><p className="text-2xl font-bold">{filteredTransactions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">المكتملة</p><p className="text-2xl font-bold text-green-600">{filteredTransactions.filter(item => item.status === 'completed').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">المبلغ المكتمل</p><p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">المعلقة</p><p className="text-2xl font-bold text-amber-600">{filteredTransactions.filter(item => item.status === 'pending').length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>سجل معاملات الاشتراك</CardTitle><CardDescription>بيانات فعلية من سجل معاملات الاشتراكات</CardDescription></div>
            <Button variant="outline" size="sm" onClick={exportTransactions} disabled={!filteredTransactions.length}>
              <Download className="ml-2 h-4 w-4" />تصدير
            </Button>
          </div>
          <div className="grid gap-3 pt-3 sm:grid-cols-4">
            <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="بحث..." /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="completed">مكتملة</SelectItem><SelectItem value="pending">معلقة</SelectItem><SelectItem value="failed">فاشلة</SelectItem><SelectItem value="refunded">مستردة</SelectItem></SelectContent></Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل طرق الدفع</SelectItem><SelectItem value="credit_card">بطاقة</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem><SelectItem value="cash">نقدي</SelectItem></SelectContent></Select>
            <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7days">آخر 7 أيام</SelectItem><SelectItem value="30days">آخر 30 يومًا</SelectItem><SelectItem value="90days">آخر 90 يومًا</SelectItem><SelectItem value="year">السنة الحالية</SelectItem></SelectContent></Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>الشركة</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead><TableHead>الطريقة</TableHead><TableHead>الخطة</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredTransactions.map(transaction => {
                  const date = transaction.processed_at || transaction.created_at;
                  return <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">{transaction.transaction_reference || transaction.id.slice(0, 8)}</TableCell>
                    <TableCell><span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{transaction.company_name}</span></TableCell>
                    <TableCell>{formatCurrency(Number(transaction.amount || 0))}</TableCell>
                    <TableCell>{statusBadge(transaction.status)}</TableCell>
                    <TableCell><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{transaction.payment_method || 'غير محدد'}</span></TableCell>
                    <TableCell>{transaction.subscription_plan}</TableCell>
                    <TableCell>{date ? <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar })}</span> : 'غير متوفر'}</TableCell>
                  </TableRow>;
                })}
                {!filteredTransactions.length && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">لا توجد معاملات مطابقة</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
