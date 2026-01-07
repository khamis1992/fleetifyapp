import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCustomers } from '@/hooks/useCustomers';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { Users, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

interface CustomerInsightsWidgetProps {
  className?: string;
}

export const CustomerInsightsWidget: React.FC<CustomerInsightsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const chartRef = React.useRef<HTMLDivElement>(null);

  const { data: customersData, isLoading: loadingCustomers } = useCustomers({
    includeInactive: false
  });

  const { data: salesOrders = [], isLoading: loadingSales } = useSalesOrders({
    status: 'completed'
  });

  const isLoading = loadingCustomers || loadingSales;

  // Extract customers array from the response
  const customers = useMemo(() => {
    if (Array.isArray(customersData)) {
      return customersData;
    }
    return customersData?.data || [];
  }, [customersData]);

  // Calculate customer analytics
  const analytics = useMemo(() => {
    // Calculate date ranges
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // New customers this month
    const newCustomers = customers.filter(customer => {
      return new Date(customer.created_at) >= monthStart;
    });

    // Build customer purchase map
    const customerPurchases = new Map<string, {
      customerId: string;
      customerName: string;
      totalSpent: number;
      purchaseCount: number;
      lastPurchaseDate: Date;
      firstPurchaseDate: Date;
    }>();

    salesOrders.forEach(order => {
      const customerId = order.customer_id;
      if (!customerId) return;

      if (!customerPurchases.has(customerId)) {
        const customer = customers.find(c => c.id === customerId);
        const customerName = customer?.customer_type === 'individual'
          ? `${customer.first_name} ${customer.last_name}`
          : customer?.company_name || 'عميل غير معروف';

        customerPurchases.set(customerId, {
          customerId,
          customerName,
          totalSpent: 0,
          purchaseCount: 0,
          lastPurchaseDate: new Date(order.order_date),
          firstPurchaseDate: new Date(order.order_date)
        });
      }

      const customerData = customerPurchases.get(customerId)!;
      customerData.totalSpent += order.total || 0;
      customerData.purchaseCount += 1;

      const orderDate = new Date(order.order_date);
      if (orderDate > customerData.lastPurchaseDate) {
        customerData.lastPurchaseDate = orderDate;
      }
      if (orderDate < customerData.firstPurchaseDate) {
        customerData.firstPurchaseDate = orderDate;
      }
    });

    // Calculate returning customers (customers with 2+ purchases)
    const returningCustomers = Array.from(customerPurchases.values()).filter(
      customer => customer.purchaseCount >= 2
    );
    const returningCustomersRate = customers.length > 0
      ? (returningCustomers.length / customers.length) * 100
      : 0;

    // Calculate average CLV
    const totalRevenue = Array.from(customerPurchases.values()).reduce(
      (sum, customer) => sum + customer.totalSpent,
      0
    );
    const avgCLV = customers.length > 0 ? totalRevenue / customers.length : 0;

    // Top customers by spending
    const topCustomers = Array.from(customerPurchases.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Customer segmentation
    const segments = {
      new: 0,       // First purchase
      regular: 0,   // 2-5 purchases
      vip: 0,       // 6+ purchases
      atRisk: 0     // No purchase in 90 days
    };

    customerPurchases.forEach(customer => {
      const daysSinceLastPurchase = Math.floor(
        (now.getTime() - customer.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastPurchase > 90) {
        segments.atRisk++;
      } else if (customer.purchaseCount === 1) {
        segments.new++;
      } else if (customer.purchaseCount <= 5) {
        segments.regular++;
      } else {
        segments.vip++;
      }
    });

    const segmentData = [
      { name: 'جديد', value: segments.new, color: '#10b981' },
      { name: 'منتظم', value: segments.regular, color: '#3b82f6' },
      { name: 'VIP', value: segments.vip, color: '#f59e0b' },
      { name: 'معرض للخطر', value: segments.atRisk, color: '#ef4444' }
    ].filter(segment => segment.value > 0);

    // Calculate purchase frequency distribution
    const frequencyDistribution = new Map<string, number>();
    customerPurchases.forEach(customer => {
      const key = customer.purchaseCount <= 1 ? '1'
        : customer.purchaseCount <= 3 ? '2-3'
        : customer.purchaseCount <= 5 ? '4-5'
        : '6+';
      frequencyDistribution.set(key, (frequencyDistribution.get(key) || 0) + 1);
    });

    return {
      newCustomersCount: newCustomers.length,
      returningCustomersRate,
      avgCLV,
      topCustomers,
      segments,
      segmentData,
      totalCustomers: customers.length,
      activeCustomers: customerPurchases.size
    };
  }, [customers, salesOrders]);

  const exportData = React.useMemo(() =>
    analytics.topCustomers.map(item => ({
      'اسم العميل': item.customerName,
      'إجمالي الإنفاق': item.totalSpent,
      'عدد المشتريات': item.purchaseCount,
      'متوسط قيمة الشراء': item.totalSpent / item.purchaseCount
    })),
    [analytics.topCustomers]
  );

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={4} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              رؤى العملاء
            </CardTitle>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="customer_insights"
                title="رؤى العملاء"
                variant="ghost"
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/tenants')}
                className="text-orange-600 hover:text-orange-700"
              >
                عرض العملاء
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Customers */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {analytics.totalCustomers}
              </div>
              <div className="text-xs text-slate-600 mt-1">إجمالي العملاء</div>
              <div className="text-xs text-slate-500 mt-1">
                {analytics.activeCustomers} نشط
              </div>
            </div>

            {/* New Customers */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {analytics.newCustomersCount}
              </div>
              <div className="text-xs text-slate-600 mt-1">عملاء جدد</div>
              <div className="text-xs text-slate-500 mt-1">
                هذا الشهر
              </div>
            </div>

            {/* Returning Rate */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <Award className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {analytics.returningCustomersRate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-600 mt-1">معدل العودة</div>
              <div className="text-xs text-slate-500 mt-1">
                عملاء متكررون
              </div>
            </div>

            {/* Average CLV */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <Award className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-xl font-bold text-slate-900">
                {formatCurrency(analytics.avgCLV)}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                <EnhancedTooltip kpi={kpiDefinitions.clv}>
                  <span>القيمة الدائمة</span>
                </EnhancedTooltip>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                متوسط CLV
              </div>
            </div>
          </div>

          {/* Customer Segmentation Chart */}
          {analytics.segmentData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">تصنيف العملاء</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.segmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.segmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="text-center p-2 bg-green-50 rounded border border-green-100">
                  <div className="text-lg font-bold text-green-600">{analytics.segments.new}</div>
                  <div className="text-xs text-slate-600">جديد</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="text-lg font-bold text-blue-600">{analytics.segments.regular}</div>
                  <div className="text-xs text-slate-600">منتظم</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded border border-amber-100">
                  <div className="text-lg font-bold text-amber-600">{analytics.segments.vip}</div>
                  <div className="text-xs text-slate-600">VIP</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded border border-red-100">
                  <div className="text-lg font-bold text-red-600">{analytics.segments.atRisk}</div>
                  <div className="text-xs text-slate-600">معرض للخطر</div>
                </div>
              </div>
            </div>
          )}

          {/* Top Customers */}
          {analytics.topCustomers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">أفضل 5 عملاء</h3>
              <div className="space-y-2">
                {analytics.topCustomers.map((customer, index) => (
                  <div
                    key={customer.customerId}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-900">
                          {customer.customerName}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {customer.purchaseCount} عملية شراء
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-orange-600">
                        {formatCurrency(customer.totalSpent)}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {customer.purchaseCount >= 6 ? 'VIP' : 'منتظم'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* At-Risk Customers Alert */}
          {analytics.segments.atRisk > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-red-900">
                    عملاء معرضون للخطر
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {analytics.segments.atRisk} عميل لم يقم بالشراء منذ 90 يوماً. قد تحتاج إلى حملة استعادة العملاء.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/tenants')}
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    عرض العملاء المعرضين للخطر
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
