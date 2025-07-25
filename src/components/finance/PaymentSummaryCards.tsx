import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePayments } from "@/hooks/usePayments";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, CreditCard, Activity } from "lucide-react";

export const PaymentSummaryCards = () => {
  const { data: payments, isLoading } = usePayments();

  const summary = useMemo(() => {
    if (!payments) return null;

    const receipts = payments.filter(p => p.payment_type === 'receipt');
    const outgoingPayments = payments.filter(p => p.payment_type === 'payment');
    const totalReceipts = receipts.reduce((sum, p) => sum + p.amount, 0);
    const totalPayments = outgoingPayments.reduce((sum, p) => sum + p.amount, 0);
    const netCashFlow = totalReceipts - totalPayments;

    const pendingPayments = payments.filter(p => p.status === 'pending').length;

    return {
      totalReceipts,
      totalPayments,
      netCashFlow,
      pendingPayments,
      totalTransactions: payments.length
    };
  }, [payments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3
    }).format(amount);
  };

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-20 mb-2"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المقبوضات</CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            {formatCurrency(summary.totalReceipts)}
          </div>
          <p className="text-xs text-muted-foreground">الأموال الواردة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(summary.totalPayments)}
          </div>
          <p className="text-xs text-muted-foreground">الأموال الصادرة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">صافي التدفق النقدي</CardTitle>
          <Activity className={`h-4 w-4 ${summary.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(summary.netCashFlow)}
          </div>
          <p className="text-xs text-muted-foreground">الفرق الصافي</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">المعاملات المعلقة</CardTitle>
          <CreditCard className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {summary.pendingPayments}
          </div>
          <p className="text-xs text-muted-foreground">معاملة معلقة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المعاملات</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {summary.totalTransactions}
          </div>
          <p className="text-xs text-muted-foreground">معاملة كاملة</p>
        </CardContent>
      </Card>
    </div>
  );
};