import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { usePaymentAnalytics } from "@/hooks/usePaymentAnalytics";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from "recharts";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface PaymentChartsCardProps {
  startDate?: string;
  endDate?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const PaymentChartsCard = ({ startDate, endDate }: PaymentChartsCardProps) => {
  const { data: analytics, isLoading } = usePaymentAnalytics(startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>الرسوم البيانية التفاعلية</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3
    }).format(amount);
  };

  // إعداد بيانات الرسوم البيانية
  const paymentMethodData = analytics.by_payment_method?.map(method => ({
    name: method.payment_method === 'cash' ? 'نقدي' : 
          method.payment_method === 'check' ? 'شيك' :
          method.payment_method === 'bank_transfer' ? 'حوالة بنكية' : 'بطاقة',
    value: method.total_amount,
    count: method.transaction_count
  })) || [];

  const costCenterData = analytics.by_cost_center?.map(center => ({
    name: center.cost_center_name,
    amount: center.total_amount,
    count: center.transaction_count
  })) || [];

  const bankData = analytics.by_bank?.map(bank => ({
    name: bank.bank_name,
    amount: bank.total_amount,
    count: bank.transaction_count
  })) || [];

  const cashFlowData = [
    { name: 'المقبوضات', amount: analytics.total_receipts, type: 'receipt' },
    { name: 'المدفوعات', amount: Math.abs(analytics.total_payments), type: 'payment' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* رسم بياني دائري لطرق الدفع */}
      {paymentMethodData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>توزيع طرق الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "المبلغ",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-md">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-primary">{formatCurrency(data.value)}</p>
                            <p className="text-sm text-muted-foreground">{data.count} معاملة</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* رسم بياني عمودي للتدفق النقدي */}
      <Card>
        <CardHeader>
          <CardTitle>التدفق النقدي</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              amount: {
                label: "المبلغ",
                color: "hsl(var(--primary))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Bar 
                  dataKey="amount" 
                  fill="hsl(var(--primary))"
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-md">
                          <p className="font-medium">{label}</p>
                          <p className="text-primary">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* رسم بياني عمودي لمراكز التكلفة */}
      {costCenterData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>التوزيع حسب مركز التكلفة</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: "المبلغ",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costCenterData} layout="horizontal">
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-md">
                            <p className="font-medium">{label}</p>
                            <p className="text-primary">{formatCurrency(data.amount)}</p>
                            <p className="text-sm text-muted-foreground">{data.count} معاملة</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* رسم بياني للبنوك */}
      {bankData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>التوزيع حسب البنك</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: {
                  label: "المبلغ",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bankData}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="hsl(var(--accent))" />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg p-3 shadow-md">
                            <p className="font-medium">{label}</p>
                            <p className="text-accent">{formatCurrency(data.amount)}</p>
                            <p className="text-sm text-muted-foreground">{data.count} معاملة</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};