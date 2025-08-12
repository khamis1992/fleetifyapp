import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePaymentAnalytics } from "@/hooks/usePaymentAnalytics";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface PaymentAnalyticsCardProps {
  startDate?: string;
  endDate?: string;
}

export const PaymentAnalyticsCard = ({ startDate, endDate }: PaymentAnalyticsCardProps) => {
  const { data: analytics, isLoading } = usePaymentAnalytics(startDate, endDate);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
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

  if (!analytics) return null;

  const { formatCurrency } = useCurrencyFormatter();

  return (
    <div className="space-y-6">
      {/* المؤشرات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المقبوضات</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(analytics.total_receipts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(analytics.total_payments)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي التدفق النقدي</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.net_cash_flow >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(analytics.net_cash_flow)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طرق الدفع</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.by_payment_type?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">طريقة مختلفة</p>
          </CardContent>
        </Card>
      </div>

      {/* تحليل مراكز التكلفة */}
      {analytics.by_cost_center && analytics.by_cost_center.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>التحليل حسب مركز التكلفة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.by_cost_center.map((center, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{center.cost_center_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {center.transaction_count} معاملة
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatCurrency(center.total_amount)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* تحليل طرق الدفع */}
      {analytics.by_payment_type && analytics.by_payment_type.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>التحليل حسب طريقة الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.by_payment_type.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {method.payment_type === 'cash' && 'نقدي'}
                      {method.payment_type === 'check' && 'شيك'}
                      {method.payment_type === 'bank_transfer' && 'حوالة بنكية'}
                      {method.payment_type === 'credit_card' && 'بطاقة ائتمان'}
                      {method.payment_type === 'online_transfer' && 'تحويل إلكتروني'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {method.transaction_count} معاملة
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatCurrency(method.total_amount)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* تحليل البنوك */}
      {analytics.by_bank && analytics.by_bank.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>التحليل حسب البنك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.by_bank.map((bank, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{bank.bank_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {bank.transaction_count} معاملة
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatCurrency(bank.total_amount)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};