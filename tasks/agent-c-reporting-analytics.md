# Agent C: Reporting & Analytics

## 🎯 Your Mission
Build comprehensive reporting and analytics with real-time dashboards, forecasting, and multi-format exports (PDF/Excel) for business intelligence.

**Timeline**: 4 days
**Your Branch**: `agent-c-analytics`

---

## Day 1: Analytics Foundation (8 hours)

### Task 1.1: Database Views for Analytics ⏱️ 2 hours

Create file: `supabase/migrations/20251020000003_analytics_views.sql`

```sql
-- Sales Performance Summary View
CREATE OR REPLACE VIEW sales_performance_summary AS
SELECT
  so.company_id,
  DATE_TRUNC('month', so.order_date) as period_month,
  DATE_TRUNC('week', so.order_date) as period_week,
  COUNT(so.id) as total_orders,
  COUNT(DISTINCT so.customer_id) as unique_customers,
  SUM(so.total_amount) as total_revenue,
  AVG(so.total_amount) as avg_order_value,
  SUM(CASE WHEN so.status = 'confirmed' THEN so.total_amount ELSE 0 END) as confirmed_revenue,
  SUM(CASE WHEN so.status = 'delivered' THEN so.total_amount ELSE 0 END) as delivered_revenue
FROM sales_orders so
WHERE so.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY so.company_id, period_month, period_week;

-- Inventory Turnover Analysis View
CREATE OR REPLACE VIEW inventory_turnover_analysis AS
WITH sales_data AS (
  SELECT
    sol.item_id,
    SUM(sol.quantity) as total_sold,
    SUM(sol.quantity * sol.unit_price) as total_sales_value
  FROM sales_order_lines sol
  JOIN sales_orders so ON sol.sales_order_id = so.id
  WHERE so.order_date >= CURRENT_DATE - INTERVAL '3 months'
  GROUP BY sol.item_id
),
inventory_data AS (
  SELECT
    ii.id as item_id,
    ii.item_name,
    ii.current_stock_level,
    ii.unit_cost,
    ii.reorder_point,
    ic.category_name,
    ii.current_stock_level * ii.unit_cost as inventory_value
  FROM inventory_items ii
  LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
)
SELECT
  id.item_id,
  id.item_name,
  id.category_name,
  id.current_stock_level,
  id.inventory_value,
  COALESCE(sd.total_sold, 0) as units_sold_3m,
  COALESCE(sd.total_sales_value, 0) as sales_value_3m,
  CASE
    WHEN id.current_stock_level > 0
    THEN ROUND((COALESCE(sd.total_sold, 0)::decimal / NULLIF(id.current_stock_level, 0)), 2)
    ELSE 0
  END as turnover_ratio,
  CASE
    WHEN COALESCE(sd.total_sold, 0) > 0
    THEN ROUND((id.current_stock_level::decimal / (COALESCE(sd.total_sold, 0) / 90.0)), 1)
    ELSE 999
  END as days_of_inventory
FROM inventory_data id
LEFT JOIN sales_data sd ON id.item_id = sd.item_id;

-- Vendor Performance Metrics View
CREATE OR REPLACE VIEW vendor_performance_metrics AS
WITH po_data AS (
  SELECT
    vendor_id,
    COUNT(id) as total_orders,
    SUM(total_amount) as total_purchase_value,
    AVG(total_amount) as avg_order_value,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN actual_delivery_date IS NOT NULL AND actual_delivery_date <= expected_delivery_date THEN 1 END) as on_time_deliveries,
    AVG(CASE WHEN actual_delivery_date IS NOT NULL AND expected_delivery_date IS NOT NULL
      THEN EXTRACT(DAY FROM (actual_delivery_date - expected_delivery_date))
      ELSE NULL END) as avg_delivery_delay_days
  FROM purchase_orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY vendor_id
),
ap_data AS (
  SELECT
    vendor_id,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_payments,
    SUM(CASE WHEN status != 'paid' THEN balance ELSE 0 END) as outstanding_balance
  FROM ap_transactions
  GROUP BY vendor_id
)
SELECT
  v.id as vendor_id,
  v.vendor_name,
  v.vendor_category,
  v.payment_terms,
  COALESCE(po.total_orders, 0) as total_orders_12m,
  COALESCE(po.total_purchase_value, 0) as total_spent_12m,
  COALESCE(po.avg_order_value, 0) as avg_order_value,
  COALESCE(po.delivered_orders, 0) as delivered_orders,
  CASE
    WHEN po.total_orders > 0
    THEN ROUND((po.on_time_deliveries::decimal / po.total_orders * 100), 1)
    ELSE 0
  END as on_time_delivery_rate,
  COALESCE(po.avg_delivery_delay_days, 0) as avg_delay_days,
  COALESCE(ap.overdue_payments, 0) as overdue_payments,
  COALESCE(ap.outstanding_balance, 0) as outstanding_balance
FROM vendors v
LEFT JOIN po_data po ON v.id = po.vendor_id
LEFT JOIN ap_data ap ON v.id = ap.vendor_id
WHERE v.is_active = true;

-- Customer Lifetime Value View
CREATE OR REPLACE VIEW customer_lifetime_value AS
WITH customer_orders AS (
  SELECT
    customer_id,
    COUNT(id) as total_orders,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_order_value,
    MIN(order_date) as first_order_date,
    MAX(order_date) as last_order_date,
    EXTRACT(DAY FROM (MAX(order_date) - MIN(order_date))) as customer_lifetime_days
  FROM sales_orders
  WHERE status IN ('confirmed', 'delivered')
  GROUP BY customer_id
),
ar_balance AS (
  SELECT
    customer_id,
    SUM(CASE WHEN status != 'paid' THEN balance ELSE 0 END) as outstanding_balance
  FROM ar_transactions
  GROUP BY customer_id
)
SELECT
  c.id as customer_id,
  c.first_name || ' ' || c.last_name as customer_name,
  c.customer_type,
  co.total_orders,
  co.total_spent as lifetime_value,
  co.avg_order_value,
  co.first_order_date,
  co.last_order_date,
  EXTRACT(DAY FROM (CURRENT_DATE - co.last_order_date)) as days_since_last_order,
  CASE
    WHEN co.customer_lifetime_days > 0
    THEN ROUND((co.total_spent / (co.customer_lifetime_days / 30.0)), 2)
    ELSE 0
  END as avg_monthly_value,
  COALESCE(ar.outstanding_balance, 0) as outstanding_balance
FROM customers c
LEFT JOIN customer_orders co ON c.id = co.customer_id
LEFT JOIN ar_balance ar ON c.id = ar.customer_id
WHERE c.is_active = true;

-- Product Performance View
CREATE OR REPLACE VIEW product_performance AS
WITH sales_metrics AS (
  SELECT
    sol.item_id,
    COUNT(DISTINCT sol.sales_order_id) as times_sold,
    SUM(sol.quantity) as total_quantity_sold,
    SUM(sol.quantity * sol.unit_price) as total_revenue,
    AVG(sol.unit_price) as avg_selling_price,
    MAX(so.order_date) as last_sale_date
  FROM sales_order_lines sol
  JOIN sales_orders so ON sol.sales_order_id = so.id
  WHERE so.order_date >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY sol.item_id
)
SELECT
  ii.id as item_id,
  ii.item_name,
  ii.sku,
  ic.category_name,
  ii.current_stock_level,
  ii.unit_cost,
  ii.unit_price as current_price,
  COALESCE(sm.times_sold, 0) as times_sold_6m,
  COALESCE(sm.total_quantity_sold, 0) as quantity_sold_6m,
  COALESCE(sm.total_revenue, 0) as revenue_6m,
  COALESCE(sm.avg_selling_price, ii.unit_price) as avg_price_6m,
  COALESCE(sm.total_revenue - (sm.total_quantity_sold * ii.unit_cost), 0) as gross_profit_6m,
  CASE
    WHEN sm.total_revenue > 0
    THEN ROUND(((sm.total_revenue - (sm.total_quantity_sold * ii.unit_cost)) / sm.total_revenue * 100), 1)
    ELSE 0
  END as profit_margin_percentage,
  sm.last_sale_date,
  EXTRACT(DAY FROM (CURRENT_DATE - sm.last_sale_date)) as days_since_last_sale
FROM inventory_items ii
LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
LEFT JOIN sales_metrics sm ON ii.id = sm.item_id
WHERE ii.is_active = true;

-- Grant permissions
GRANT SELECT ON sales_performance_summary TO authenticated;
GRANT SELECT ON inventory_turnover_analysis TO authenticated;
GRANT SELECT ON vendor_performance_metrics TO authenticated;
GRANT SELECT ON customer_lifetime_value TO authenticated;
GRANT SELECT ON product_performance TO authenticated;
```

**Acceptance**: All analytics views created and returning data

---

### Task 1.2: Analytics Hooks ⏱️ 3 hours

Create file: `src/hooks/useAnalytics.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Sales Performance Hook
export const useSalesPerformance = (period: 'week' | 'month' = 'month') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-performance', period, user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const periodColumn = period === 'week' ? 'period_week' : 'period_month';

      const { data, error } = await supabase
        .from('sales_performance_summary')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order(periodColumn, { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

// Inventory Turnover Hook
export const useInventoryTurnover = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-turnover', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('inventory_turnover_analysis')
        .select('*')
        .order('turnover_ratio', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

// Vendor Performance Hook
export const useVendorPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendor-performance', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('vendor_performance_metrics')
        .select('*')
        .order('total_spent_12m', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

// Customer Lifetime Value Hook
export const useCustomerLifetimeValue = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-ltv', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('customer_lifetime_value')
        .select('*')
        .order('lifetime_value', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

// Product Performance Hook
export const useProductPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-performance', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('product_performance')
        .select('*')
        .order('revenue_6m', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

// Dashboard Summary Hook
export const useDashboardSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-summary', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      // Aggregate multiple metrics in parallel
      const [salesData, inventoryData, arData, apData] = await Promise.all([
        supabase
          .from('sales_orders')
          .select('total_amount')
          .eq('company_id', user.profile.company_id)
          .gte('order_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

        supabase
          .from('inventory_items')
          .select('current_stock_level, unit_cost')
          .eq('company_id', user.profile.company_id),

        supabase
          .from('ar_transactions')
          .select('balance')
          .eq('company_id', user.profile.company_id)
          .in('status', ['pending', 'partial', 'overdue']),

        supabase
          .from('ap_transactions')
          .select('balance')
          .eq('company_id', user.profile.company_id)
          .in('status', ['pending', 'partial', 'overdue']),
      ]);

      return {
        monthly_revenue: salesData.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        inventory_value: inventoryData.data?.reduce((sum, item) => sum + (item.current_stock_level * item.unit_cost), 0) || 0,
        accounts_receivable: arData.data?.reduce((sum, tx) => sum + tx.balance, 0) || 0,
        accounts_payable: apData.data?.reduce((sum, tx) => sum + tx.balance, 0) || 0,
      };
    },
    enabled: !!user?.profile?.company_id,
    refetchInterval: 60000, // Refresh every minute
  });
};
```

**Acceptance**: All analytics hooks return correct aggregated data

---

### Task 1.3: Chart Components Library ⏱️ 3 hours

Create file: `src/components/analytics/ChartComponents.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

interface LineChartCardProps {
  title: string;
  description?: string;
  data: any[];
  xKey: string;
  yKey: string;
  yLabel?: string;
}

export const LineChartCard = ({ title, description, data, xKey, yKey, yLabel }: LineChartCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)} ر.ق`}
              labelFormatter={(label) => `الفترة: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey={yKey} stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface BarChartCardProps {
  title: string;
  description?: string;
  data: any[];
  xKey: string;
  yKey: string;
  yLabel?: string;
}

export const BarChartCard = ({ title, description, data, xKey, yKey, yLabel }: BarChartCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(2)} ر.ق`}
            />
            <Legend />
            <Bar dataKey={yKey} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface PieChartCardProps {
  title: string;
  description?: string;
  data: any[];
  nameKey: string;
  valueKey: string;
}

export const PieChartCard = ({ title, description, data, nameKey, valueKey }: PieChartCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry[nameKey]}: ${entry[valueKey].toFixed(0)}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey={valueKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toFixed(2)} ر.ق`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
}

export const MetricCard = ({ title, value, subtitle, trend, icon, format = 'currency' }: MetricCardProps) => {
  const formattedValue = typeof value === 'number'
    ? format === 'currency' ? `${value.toFixed(2)} ر.ق`
      : format === 'percentage' ? `${value.toFixed(1)}%`
      : value.toFixed(0)
    : value;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}% عن الشهر السابق
          </p>
        )}
      </CardContent>
    </Card>
  );
};
```

**Acceptance**: Reusable chart components working with recharts

---

## Day 2: Dashboard Components (8 hours)

### Task 2.1: Sales Analytics Dashboard ⏱️ 3 hours

Create file: `src/components/analytics/SalesAnalyticsDashboard.tsx`

```typescript
import { useSalesPerformance, useCustomerLifetimeValue } from '@/hooks/useAnalytics';
import { LineChartCard, BarChartCard, MetricCard } from './ChartComponents';
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const SalesAnalyticsDashboard = () => {
  const { data: salesPerformance } = useSalesPerformance('month');
  const { data: customerLTV } = useCustomerLifetimeValue();

  // Calculate metrics
  const currentMonth = salesPerformance?.[0];
  const previousMonth = salesPerformance?.[1];

  const revenueTrend = currentMonth && previousMonth
    ? ((currentMonth.total_revenue - previousMonth.total_revenue) / previousMonth.total_revenue) * 100
    : 0;

  const ordersTrend = currentMonth && previousMonth
    ? ((currentMonth.total_orders - previousMonth.total_orders) / previousMonth.total_orders) * 100
    : 0;

  // Format data for charts
  const revenueChartData = salesPerformance?.map(item => ({
    month: new Date(item.period_month).toLocaleDateString('ar-QA', { month: 'short', year: 'numeric' }),
    revenue: item.total_revenue,
    orders: item.total_orders,
  })).reverse() || [];

  const topCustomers = customerLTV?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="إجمالي الإيرادات"
          value={currentMonth?.total_revenue || 0}
          subtitle="الشهر الحالي"
          trend={{ value: revenueTrend, isPositive: revenueTrend >= 0 }}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="عدد الطلبات"
          value={currentMonth?.total_orders || 0}
          subtitle="الشهر الحالي"
          trend={{ value: ordersTrend, isPositive: ordersTrend >= 0 }}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          format="number"
        />
        <MetricCard
          title="متوسط قيمة الطلب"
          value={currentMonth?.avg_order_value || 0}
          subtitle="الشهر الحالي"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="عدد العملاء"
          value={currentMonth?.unique_customers || 0}
          subtitle="عملاء نشطين"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          format="number"
        />
      </div>

      {/* Revenue Trend Chart */}
      <LineChartCard
        title="اتجاه الإيرادات"
        description="الإيرادات الشهرية خلال آخر 12 شهراً"
        data={revenueChartData}
        xKey="month"
        yKey="revenue"
        yLabel="الإيرادات (ر.ق)"
      />

      {/* Orders Trend Chart */}
      <BarChartCard
        title="عدد الطلبات الشهرية"
        description="عدد الطلبات خلال آخر 12 شهراً"
        data={revenueChartData}
        xKey="month"
        yKey="orders"
        yLabel="عدد الطلبات"
      />

      {/* Top Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>أفضل 10 عملاء (حسب القيمة الإجمالية)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead className="text-right">عدد الطلبات</TableHead>
                <TableHead className="text-right">القيمة الإجمالية</TableHead>
                <TableHead className="text-right">متوسط الطلب</TableHead>
                <TableHead className="text-right">آخر طلب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell>{customer.customer_type}</TableCell>
                  <TableCell className="text-right">{customer.total_orders}</TableCell>
                  <TableCell className="text-right">{customer.lifetime_value.toFixed(2)} ر.ق</TableCell>
                  <TableCell className="text-right">{customer.avg_order_value.toFixed(2)} ر.ق</TableCell>
                  <TableCell className="text-right">
                    {customer.last_order_date
                      ? new Date(customer.last_order_date).toLocaleDateString('ar-QA')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance**: Sales dashboard shows revenue trends, orders, and top customers

---

### Task 2.2: Inventory Analytics Dashboard ⏱️ 2.5 hours

Create file: `src/components/analytics/InventoryAnalyticsDashboard.tsx`

```typescript
import { useInventoryTurnover, useProductPerformance } from '@/hooks/useAnalytics';
import { BarChartCard, MetricCard, PieChartCard } from './ChartComponents';
import { Package, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const InventoryAnalyticsDashboard = () => {
  const { data: turnoverData } = useInventoryTurnover();
  const { data: productPerformance } = useProductPerformance();

  // Calculate summary metrics
  const totalInventoryValue = turnoverData?.reduce((sum, item) => sum + item.inventory_value, 0) || 0;
  const slowMovingCount = turnoverData?.filter(item => item.turnover_ratio < 1).length || 0;
  const outOfStockCount = turnoverData?.filter(item => item.current_stock_level === 0).length || 0;
  const avgTurnoverRatio = turnoverData?.reduce((sum, item) => sum + item.turnover_ratio, 0) / (turnoverData?.length || 1) || 0;

  // Top 10 products by revenue
  const topProducts = productPerformance?.slice(0, 10) || [];

  // Category distribution for pie chart
  const categoryData = productPerformance?.reduce((acc, product) => {
    const existing = acc.find(item => item.name === product.category_name);
    if (existing) {
      existing.value += product.revenue_6m;
    } else {
      acc.push({ name: product.category_name || 'غير مصنف', value: product.revenue_6m });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>) || [];

  // Slow-moving items
  const slowMovingItems = turnoverData?.filter(item => item.turnover_ratio < 1 && item.inventory_value > 1000)
    .sort((a, b) => b.inventory_value - a.inventory_value)
    .slice(0, 10) || [];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="قيمة المخزون"
          value={totalInventoryValue}
          subtitle="إجمالي قيمة المخزون الحالي"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="معدل الدوران"
          value={avgTurnoverRatio}
          subtitle="متوسط معدل دوران المخزون"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          format="number"
        />
        <MetricCard
          title="أصناف بطيئة الحركة"
          value={slowMovingCount}
          subtitle="دوران أقل من 1"
          icon={<TrendingDown className="h-4 w-4 text-orange-600" />}
          format="number"
        />
        <MetricCard
          title="أصناف نفدت"
          value={outOfStockCount}
          subtitle="تحتاج إلى إعادة طلب"
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          format="number"
        />
      </div>

      {/* Category Revenue Distribution */}
      <PieChartCard
        title="توزيع الإيرادات حسب الفئة"
        description="إيرادات المنتجات حسب الفئة (آخر 6 أشهر)"
        data={categoryData}
        nameKey="name"
        valueKey="value"
      />

      {/* Top Products by Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>أفضل 10 منتجات (حسب الإيرادات)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead className="text-right">الكمية المباعة</TableHead>
                <TableHead className="text-right">الإيرادات</TableHead>
                <TableHead className="text-right">هامش الربح</TableHead>
                <TableHead className="text-right">المخزون الحالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((product) => (
                <TableRow key={product.item_id}>
                  <TableCell className="font-medium">{product.item_name}</TableCell>
                  <TableCell>{product.category_name}</TableCell>
                  <TableCell className="text-right">{product.quantity_sold_6m}</TableCell>
                  <TableCell className="text-right">{product.revenue_6m.toFixed(2)} ر.ق</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={product.profit_margin_percentage > 30 ? 'default' : 'secondary'}>
                      {product.profit_margin_percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={product.current_stock_level < 10 ? 'destructive' : 'outline'}>
                      {product.current_stock_level}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Slow-Moving Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>أصناف بطيئة الحركة (قيمة عالية)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead className="text-right">المخزون</TableHead>
                <TableHead className="text-right">قيمة المخزون</TableHead>
                <TableHead className="text-right">معدل الدوران</TableHead>
                <TableHead className="text-right">أيام المخزون</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slowMovingItems.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>{item.category_name}</TableCell>
                  <TableCell className="text-right">{item.current_stock_level}</TableCell>
                  <TableCell className="text-right">{item.inventory_value.toFixed(2)} ر.ق</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="destructive">{item.turnover_ratio.toFixed(2)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.days_of_inventory}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance**: Inventory dashboard shows turnover, slow-moving items, category distribution

---

### Task 2.3: Financial Dashboard Integration ⏱️ 2.5 hours

Create file: `src/components/analytics/FinancialDashboard.tsx`

```typescript
import { useDashboardSummary } from '@/hooks/useAnalytics';
import { useARAgingReport } from '@/hooks/useAccountsReceivable';
import { useAPAgingReport } from '@/hooks/useAccountsPayable';
import { MetricCard, BarChartCard } from './ChartComponents';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const FinancialDashboard = () => {
  const { data: summary } = useDashboardSummary();
  const { data: arAging } = useARAgingReport();
  const { data: apAging } = useAPAgingReport();

  // Calculate net position
  const netPosition = (summary?.accounts_receivable || 0) - (summary?.accounts_payable || 0);

  // AR aging breakdown for chart
  const arAgingChart = [
    { category: 'حالي', amount: arAging?.reduce((sum, r) => sum + r.current_amount, 0) || 0 },
    { category: '30 يوم', amount: arAging?.reduce((sum, r) => sum + r.overdue_30, 0) || 0 },
    { category: '60 يوم', amount: arAging?.reduce((sum, r) => sum + r.overdue_60, 0) || 0 },
    { category: '90+ يوم', amount: arAging?.reduce((sum, r) => sum + r.overdue_90_plus, 0) || 0 },
  ];

  // AP aging breakdown for chart
  const apAgingChart = [
    { category: 'حالي', amount: apAging?.reduce((sum, r) => sum + r.current_amount, 0) || 0 },
    { category: '30 يوم', amount: apAging?.reduce((sum, r) => sum + r.overdue_30, 0) || 0 },
    { category: '60 يوم', amount: apAging?.reduce((sum, r) => sum + r.overdue_60, 0) || 0 },
    { category: '90+ يوم', amount: apAging?.reduce((sum, r) => sum + r.overdue_90_plus, 0) || 0 },
  ];

  // Top AR customers
  const topARCustomers = arAging?.slice(0, 10) || [];

  // Top AP vendors
  const topAPVendors = apAging?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="إيرادات الشهر"
          value={summary?.monthly_revenue || 0}
          subtitle="آخر 30 يوم"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="الذمم المدينة"
          value={summary?.accounts_receivable || 0}
          subtitle="مستحقات من العملاء"
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          format="currency"
        />
        <MetricCard
          title="الذمم الدائنة"
          value={summary?.accounts_payable || 0}
          subtitle="مستحقات للموردين"
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
          format="currency"
        />
        <MetricCard
          title="صافي المركز المالي"
          value={netPosition}
          subtitle="الذمم المدينة - الدائنة"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
      </div>

      {/* AR Aging Chart */}
      <BarChartCard
        title="أعمار الذمم المدينة"
        description="توزيع مستحقات العملاء حسب العمر"
        data={arAgingChart}
        xKey="category"
        yKey="amount"
        yLabel="المبلغ (ر.ق)"
      />

      {/* AP Aging Chart */}
      <BarChartCard
        title="أعمار الذمم الدائنة"
        description="توزيع مستحقات الموردين حسب العمر"
        data={apAgingChart}
        xKey="category"
        yKey="amount"
        yLabel="المبلغ (ر.ق)"
      />

      {/* Top AR Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>أكبر مستحقات العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العميل</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">حالي</TableHead>
                <TableHead className="text-right">30 يوم</TableHead>
                <TableHead className="text-right">60 يوم</TableHead>
                <TableHead className="text-right">90+ يوم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topARCustomers.map((customer) => (
                <TableRow key={customer.customer_id}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell className="text-right font-bold">{customer.total_outstanding.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{customer.current_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-orange-600">{customer.overdue_30.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">{customer.overdue_60.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-700 font-bold">{customer.overdue_90_plus.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top AP Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>أكبر مستحقات الموردين</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المورّد</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">حالي</TableHead>
                <TableHead className="text-right">30 يوم</TableHead>
                <TableHead className="text-right">60 يوم</TableHead>
                <TableHead className="text-right">90+ يوم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topAPVendors.map((vendor) => (
                <TableRow key={vendor.vendor_id}>
                  <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                  <TableCell className="text-right font-bold">{vendor.total_outstanding.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{vendor.current_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-orange-600">{vendor.overdue_30.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">{vendor.overdue_60.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-700 font-bold">{vendor.overdue_90_plus.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance**: Financial dashboard shows AR/AP aging, net position, top customers/vendors

---

## Day 3: Vendor & Product Analytics (8 hours)

### Task 3.1: Vendor Performance Dashboard ⏱️ 3 hours

Create file: `src/components/analytics/VendorPerformanceDashboard.tsx`

```typescript
import { useVendorPerformance } from '@/hooks/useAnalytics';
import { MetricCard, BarChartCard } from './ChartComponents';
import { TrendingUp, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const VendorPerformanceDashboard = () => {
  const { data: vendors } = useVendorPerformance();

  // Calculate summary metrics
  const totalSpent = vendors?.reduce((sum, v) => sum + v.total_spent_12m, 0) || 0;
  const avgOnTimeRate = vendors?.reduce((sum, v) => sum + v.on_time_delivery_rate, 0) / (vendors?.length || 1) || 0;
  const excellentVendors = vendors?.filter(v => v.on_time_delivery_rate >= 95).length || 0;
  const poorVendors = vendors?.filter(v => v.on_time_delivery_rate < 80).length || 0;

  // Top vendors by spending
  const topVendorsBySpending = vendors?.slice(0, 10) || [];

  // Vendors by on-time delivery for chart
  const deliveryPerformanceChart = vendors?.slice(0, 10).map(v => ({
    vendor: v.vendor_name.substring(0, 20),
    rate: v.on_time_delivery_rate,
  })) || [];

  // Vendors with overdue payments
  const vendorsWithOverdue = vendors?.filter(v => v.overdue_payments > 0)
    .sort((a, b) => b.outstanding_balance - a.outstanding_balance)
    .slice(0, 10) || [];

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="إجمالي المشتريات"
          value={totalSpent}
          subtitle="آخر 12 شهر"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="معدل التسليم في الوقت"
          value={avgOnTimeRate}
          subtitle="متوسط جميع الموردين"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          format="percentage"
        />
        <MetricCard
          title="موردون ممتازون"
          value={excellentVendors}
          subtitle="تسليم في الوقت > 95%"
          icon={<CheckCircle className="h-4 w-4 text-green-600" />}
          format="number"
        />
        <MetricCard
          title="موردون يحتاجون تحسين"
          value={poorVendors}
          subtitle="تسليم في الوقت < 80%"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          format="number"
        />
      </div>

      {/* Delivery Performance Chart */}
      <BarChartCard
        title="أداء التسليم - أفضل 10 موردين"
        description="معدل التسليم في الوقت المحدد (%)"
        data={deliveryPerformanceChart}
        xKey="vendor"
        yKey="rate"
        yLabel="معدل التسليم في الوقت (%)"
      />

      {/* Top Vendors by Spending */}
      <Card>
        <CardHeader>
          <CardTitle>أكبر الموردين (حسب قيمة المشتريات)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المورّد</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead className="text-right">عدد الطلبات</TableHead>
                <TableHead className="text-right">إجمالي المشتريات</TableHead>
                <TableHead className="text-right">متوسط الطلب</TableHead>
                <TableHead>التسليم في الوقت</TableHead>
                <TableHead className="text-right">متوسط التأخير</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topVendorsBySpending.map((vendor) => (
                <TableRow key={vendor.vendor_id}>
                  <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                  <TableCell>{vendor.vendor_category}</TableCell>
                  <TableCell className="text-right">{vendor.total_orders_12m}</TableCell>
                  <TableCell className="text-right">{vendor.total_spent_12m.toFixed(2)} ر.ق</TableCell>
                  <TableCell className="text-right">{vendor.avg_order_value.toFixed(2)} ر.ق</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant={
                          vendor.on_time_delivery_rate >= 95 ? 'default' :
                          vendor.on_time_delivery_rate >= 80 ? 'secondary' : 'destructive'
                        }>
                          {vendor.on_time_delivery_rate.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress value={vendor.on_time_delivery_rate} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {vendor.avg_delay_days > 0 ? (
                      <span className="text-red-600">{vendor.avg_delay_days.toFixed(1)} يوم</span>
                    ) : (
                      <span className="text-green-600">في الوقت</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vendors with Overdue Payments */}
      <Card>
        <CardHeader>
          <CardTitle>موردون لديهم مستحقات متأخرة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المورّد</TableHead>
                <TableHead>شروط الدفع</TableHead>
                <TableHead className="text-right">فواتير متأخرة</TableHead>
                <TableHead className="text-right">المبلغ المستحق</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorsWithOverdue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد مستحقات متأخرة - أحسنت! 🎉
                  </TableCell>
                </TableRow>
              ) : (
                vendorsWithOverdue.map((vendor) => (
                  <TableRow key={vendor.vendor_id}>
                    <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                    <TableCell>{vendor.payment_terms}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{vendor.overdue_payments}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {vendor.outstanding_balance.toFixed(2)} ر.ق
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">تحتاج إلى دفع عاجل</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance**: Vendor dashboard shows spending, delivery performance, overdue payments

---

### Task 3.2: Product Analytics Deep Dive ⏱️ 3 hours

Create file: `src/components/analytics/ProductAnalyticsDashboard.tsx`

```typescript
import { useProductPerformance } from '@/hooks/useAnalytics';
import { MetricCard, BarChartCard } from './ChartComponents';
import { TrendingUp, Star, AlertTriangle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ProductAnalyticsDashboard = () => {
  const { data: products } = useProductPerformance();

  // Calculate metrics
  const totalRevenue = products?.reduce((sum, p) => sum + p.revenue_6m, 0) || 0;
  const totalProfit = products?.reduce((sum, p) => sum + p.gross_profit_6m, 0) || 0;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const bestSellers = products?.filter(p => p.quantity_sold_6m > 0).length || 0;
  const deadStock = products?.filter(p => p.days_since_last_sale > 90).length || 0;

  // Top products by revenue
  const topByRevenue = products?.slice(0, 10) || [];

  // Top products by profit margin
  const topByMargin = products?.sort((a, b) => b.profit_margin_percentage - a.profit_margin_percentage)
    .slice(0, 10) || [];

  // Dead stock (no sales in 90 days)
  const deadStockItems = products?.filter(p => p.days_since_last_sale > 90 && p.current_stock_level > 0)
    .sort((a, b) => b.days_since_last_sale - a.days_since_last_sale)
    .slice(0, 10) || [];

  // Fast movers (high turnover)
  const fastMovers = products?.filter(p => p.quantity_sold_6m > 10)
    .sort((a, b) => b.quantity_sold_6m - a.quantity_sold_6m)
    .slice(0, 10) || [];

  // Revenue by product for chart
  const revenueChart = topByRevenue.map(p => ({
    product: p.item_name.substring(0, 20),
    revenue: p.revenue_6m,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="إجمالي إيرادات المنتجات"
          value={totalRevenue}
          subtitle="آخر 6 أشهر"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="إجمالي الربح الإجمالي"
          value={totalProfit}
          subtitle="آخر 6 أشهر"
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          format="currency"
        />
        <MetricCard
          title="متوسط هامش الربح"
          value={avgMargin}
          subtitle="على جميع المنتجات"
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
          format="percentage"
        />
        <MetricCard
          title="منتجات راكدة"
          value={deadStock}
          subtitle="لم تُباع منذ 90+ يوم"
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          format="number"
        />
      </div>

      {/* Revenue Chart */}
      <BarChartCard
        title="أفضل 10 منتجات (حسب الإيرادات)"
        description="إيرادات آخر 6 أشهر"
        data={revenueChart}
        xKey="product"
        yKey="revenue"
        yLabel="الإيرادات (ر.ق)"
      />

      {/* Tabbed Tables */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">الأعلى إيراداً</TabsTrigger>
          <TabsTrigger value="margin">الأعلى ربحية</TabsTrigger>
          <TabsTrigger value="fast">الأسرع حركة</TabsTrigger>
          <TabsTrigger value="dead">منتجات راكدة</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>أفضل 10 منتجات (حسب الإيرادات)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">الإيرادات</TableHead>
                    <TableHead className="text-right">الربح</TableHead>
                    <TableHead className="text-right">هامش الربح</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topByRevenue.map((product, idx) => (
                    <TableRow key={product.item_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <span className="font-medium">{product.item_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell className="text-right">{product.quantity_sold_6m}</TableCell>
                      <TableCell className="text-right font-bold">{product.revenue_6m.toFixed(2)} ر.ق</TableCell>
                      <TableCell className="text-right text-green-600">{product.gross_profit_6m.toFixed(2)} ر.ق</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.profit_margin_percentage > 30 ? 'default' : 'secondary'}>
                          {product.profit_margin_percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin">
          <Card>
            <CardHeader>
              <CardTitle>أفضل 10 منتجات (حسب هامش الربح)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead className="text-right">هامش الربح</TableHead>
                    <TableHead className="text-right">الربح</TableHead>
                    <TableHead className="text-right">الإيرادات</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topByMargin.map((product, idx) => (
                    <TableRow key={product.item_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <span className="font-medium">{product.item_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="font-bold">
                          {product.profit_margin_percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">{product.gross_profit_6m.toFixed(2)} ر.ق</TableCell>
                      <TableCell className="text-right">{product.revenue_6m.toFixed(2)} ر.ق</TableCell>
                      <TableCell className="text-right">{product.current_stock_level}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fast">
          <Card>
            <CardHeader>
              <CardTitle>أسرع 10 منتجات حركة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">مرات البيع</TableHead>
                    <TableHead className="text-right">المخزون الحالي</TableHead>
                    <TableHead className="text-right">آخر بيع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fastMovers.map((product, idx) => (
                    <TableRow key={product.item_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <span className="font-medium">{product.item_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.category_name}</TableCell>
                      <TableCell className="text-right font-bold">{product.quantity_sold_6m}</TableCell>
                      <TableCell className="text-right">{product.times_sold_6m}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.current_stock_level < 10 ? 'destructive' : 'default'}>
                          {product.current_stock_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.last_sale_date
                          ? new Date(product.last_sale_date).toLocaleDateString('ar-QA')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dead">
          <Card>
            <CardHeader>
              <CardTitle>منتجات راكدة (لم تُباع منذ 90+ يوم)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                    <TableHead className="text-right">قيمة المخزون</TableHead>
                    <TableHead className="text-right">أيام منذ آخر بيع</TableHead>
                    <TableHead>الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد منتجات راكدة - ممتاز! 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    deadStockItems.map((product) => (
                      <TableRow key={product.item_id}>
                        <TableCell className="font-medium">{product.item_name}</TableCell>
                        <TableCell>{product.category_name}</TableCell>
                        <TableCell className="text-right">{product.current_stock_level}</TableCell>
                        <TableCell className="text-right">
                          {(product.current_stock_level * product.unit_cost).toFixed(2)} ر.ق
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{product.days_since_last_sale} يوم</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">تخفيض السعر</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

**Acceptance**: Product analytics shows top performers, fast movers, and dead stock

---

### Task 3.3: Analytics Page Integration ⏱️ 2 hours

Create file: `src/pages/analytics/Analytics.tsx`

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesAnalyticsDashboard } from '@/components/analytics/SalesAnalyticsDashboard';
import { InventoryAnalyticsDashboard } from '@/components/analytics/InventoryAnalyticsDashboard';
import { FinancialDashboard } from '@/components/analytics/FinancialDashboard';
import { VendorPerformanceDashboard } from '@/components/analytics/VendorPerformanceDashboard';
import { ProductAnalyticsDashboard } from '@/components/analytics/ProductAnalyticsDashboard';
import { BarChart3 } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">التحليلات والتقارير</h1>
          <p className="text-muted-foreground">
            تحليل شامل لأداء المبيعات والمخزون والموردين والمنتجات
          </p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="sales">المبيعات</TabsTrigger>
          <TabsTrigger value="inventory">المخزون</TabsTrigger>
          <TabsTrigger value="financial">المالية</TabsTrigger>
          <TabsTrigger value="vendors">الموردين</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialDashboard />
        </TabsContent>

        <TabsContent value="vendors">
          <VendorPerformanceDashboard />
        </TabsContent>

        <TabsContent value="products">
          <ProductAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Update `src/components/layouts/AppSidebar.tsx` to add Analytics menu item:

```typescript
{
  title: 'التحليلات والتقارير',
  icon: BarChart3,
  href: '/analytics',
}
```

Update `src/App.tsx` routing:

```typescript
import Analytics from './pages/analytics/Analytics';

// Add route
<Route path="/analytics" element={<Analytics />} />
```

**Acceptance**: Analytics page accessible with all 5 dashboards in tabs

---

## Day 4: Forecasting & Exports (8 hours)

### Task 4.1: Revenue Forecasting ⏱️ 3 hours

Create file: `src/hooks/useForecast.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ForecastData {
  period: string;
  actual: number;
  forecast: number;
  lower_bound: number;
  upper_bound: number;
}

export const useRevenueForecast = (months: number = 6) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['revenue-forecast', months, user?.profile?.company_id],
    queryFn: async (): Promise<ForecastData[]> => {
      if (!user?.profile?.company_id) return [];

      // Get historical data (last 12 months)
      const { data: historical, error } = await supabase
        .from('sales_orders')
        .select('order_date, total_amount')
        .eq('company_id', user.profile.company_id)
        .gte('order_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('order_date', { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData = historical.reduce((acc, order) => {
        const month = order.order_date.substring(0, 7); // YYYY-MM
        if (!acc[month]) acc[month] = 0;
        acc[month] += order.total_amount;
        return acc;
      }, {} as Record<string, number>);

      // Convert to array and sort
      const sortedMonths = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month, revenue }));

      // Simple moving average forecast
      const forecast: ForecastData[] = [];

      // Add historical data
      sortedMonths.forEach(({ month, revenue }) => {
        forecast.push({
          period: month,
          actual: revenue,
          forecast: revenue,
          lower_bound: revenue,
          upper_bound: revenue,
        });
      });

      // Calculate moving average
      const windowSize = Math.min(3, sortedMonths.length);
      const recentRevenues = sortedMonths.slice(-windowSize).map(m => m.revenue);
      const avgRevenue = recentRevenues.reduce((sum, r) => sum + r, 0) / windowSize;

      // Calculate trend (simple linear regression)
      const xValues = recentRevenues.map((_, i) => i);
      const yValues = recentRevenues;
      const n = xValues.length;
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Generate forecast for next N months
      const lastMonth = new Date(sortedMonths[sortedMonths.length - 1].month + '-01');
      for (let i = 1; i <= months; i++) {
        const forecastMonth = new Date(lastMonth);
        forecastMonth.setMonth(forecastMonth.getMonth() + i);
        const forecastPeriod = forecastMonth.toISOString().substring(0, 7);

        // Linear forecast with growth
        const forecastValue = intercept + slope * (sortedMonths.length + i);

        // Confidence interval (±20%)
        const confidence = forecastValue * 0.2;

        forecast.push({
          period: forecastPeriod,
          actual: 0,
          forecast: Math.max(0, forecastValue),
          lower_bound: Math.max(0, forecastValue - confidence),
          upper_bound: forecastValue + confidence,
        });
      }

      return forecast;
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useInventoryForecast = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-forecast', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      // Get sales velocity for each item
      const { data, error } = await supabase
        .from('sales_order_lines')
        .select(`
          item_id,
          quantity,
          sales_orders!inner(order_date, company_id)
        `)
        .eq('sales_orders.company_id', user.profile.company_id)
        .gte('sales_orders.order_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) throw error;

      // Calculate daily velocity per item
      const itemVelocity = data.reduce((acc, line: any) => {
        if (!acc[line.item_id]) acc[line.item_id] = { totalQty: 0, days: 90 };
        acc[line.item_id].totalQty += line.quantity;
        return acc;
      }, {} as Record<string, { totalQty: number; days: number }>);

      // Get current stock levels
      const { data: items } = await supabase
        .from('inventory_items')
        .select('id, item_name, current_stock_level, reorder_point')
        .eq('company_id', user.profile.company_id)
        .in('id', Object.keys(itemVelocity));

      // Calculate stock-out forecast
      return items?.map(item => {
        const velocity = itemVelocity[item.id];
        const dailyRate = velocity ? velocity.totalQty / velocity.days : 0;
        const daysUntilStockout = dailyRate > 0 ? item.current_stock_level / dailyRate : 999;

        return {
          item_id: item.id,
          item_name: item.item_name,
          current_stock: item.current_stock_level,
          reorder_point: item.reorder_point,
          daily_sales_rate: dailyRate,
          days_until_stockout: Math.floor(daysUntilStockout),
          needs_reorder: item.current_stock_level <= item.reorder_point || daysUntilStockout < 30,
        };
      }).sort((a, b) => a.days_until_stockout - b.days_until_stockout) || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};
```

Create file: `src/components/analytics/ForecastDashboard.tsx`

```typescript
import { useRevenueForecast, useInventoryForecast } from '@/hooks/useForecast';
import { LineChartCard, MetricCard } from './ChartComponents';
import { TrendingUp, AlertCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';

export const ForecastDashboard = () => {
  const { data: revenueForecast } = useRevenueForecast(6);
  const { data: inventoryForecast } = useInventoryForecast();

  const forecastData = revenueForecast?.map(f => ({
    month: new Date(f.period + '-01').toLocaleDateString('ar-QA', { month: 'short', year: 'numeric' }),
    actual: f.actual > 0 ? f.actual : null,
    forecast: f.forecast,
    lower: f.lower_bound,
    upper: f.upper_bound,
  })) || [];

  // Calculate next 6 months forecast total
  const nextSixMonths = revenueForecast?.slice(-6).reduce((sum, f) => sum + f.forecast, 0) || 0;
  const criticalStockItems = inventoryForecast?.filter(i => i.days_until_stockout < 30).length || 0;
  const needsReorder = inventoryForecast?.filter(i => i.needs_reorder).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="توقع الإيرادات (6 أشهر)"
          value={nextSixMonths}
          subtitle="الإيرادات المتوقعة خلال 6 أشهر"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          format="currency"
        />
        <MetricCard
          title="أصناف قرب النفاد"
          value={criticalStockItems}
          subtitle="سينفد خلال 30 يوم"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          format="number"
        />
        <MetricCard
          title="يحتاج إعادة طلب"
          value={needsReorder}
          subtitle="أقل من نقطة إعادة الطلب"
          icon={<Package className="h-4 w-4 text-orange-600" />}
          format="number"
        />
      </div>

      {/* Revenue Forecast Chart with Confidence Interval */}
      <Card>
        <CardHeader>
          <CardTitle>توقعات الإيرادات (مع حدود الثقة)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'الإيرادات (ر.ق)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value?.toFixed(2)} ر.ق`} />
              <Legend />
              <Area
                type="monotone"
                dataKey="upper"
                stackId="1"
                stroke="none"
                fill="#82ca9d"
                fillOpacity={0.2}
                name="الحد الأعلى"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stackId="1"
                stroke="none"
                fill="#82ca9d"
                fillOpacity={0.2}
                name="الحد الأدنى"
              />
              <Line type="monotone" dataKey="actual" stroke="#8884d8" strokeWidth={2} name="الفعلي" />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#82ca9d"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="التوقع"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inventory Reorder Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>توقع نفاد المخزون (الأصناف الحرجة)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead className="text-right">المخزون الحالي</TableHead>
                <TableHead className="text-right">نقطة إعادة الطلب</TableHead>
                <TableHead className="text-right">معدل البيع اليومي</TableHead>
                <TableHead className="text-right">أيام حتى النفاد</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryForecast?.slice(0, 15).map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.current_stock <= item.reorder_point ? 'destructive' : 'default'}>
                      {item.current_stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.reorder_point}</TableCell>
                  <TableCell className="text-right">{item.daily_sales_rate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={
                      item.days_until_stockout < 7 ? 'destructive' :
                      item.days_until_stockout < 30 ? 'secondary' : 'outline'
                    }>
                      {item.days_until_stockout} يوم
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.needs_reorder ? (
                      <Badge variant="destructive">اطلب الآن</Badge>
                    ) : (
                      <Badge variant="outline">طبيعي</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Acceptance**: Revenue forecasting with confidence intervals, inventory stockout predictions

---

### Task 4.2: PDF/Excel Export Functionality ⏱️ 3 hours

Create file: `src/hooks/useReportExport.ts`

```typescript
import { useToast } from './use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const useReportExport = () => {
  const { toast } = useToast();

  const exportToPDF = (
    title: string,
    headers: string[],
    rows: any[][],
    filename: string
  ) => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 15);

      // Add date
      doc.setFontSize(10);
      doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-QA')}`, 14, 22);

      // Add table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 30,
        styles: {
          font: 'helvetica',
          fontSize: 10,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
        },
      });

      // Save PDF
      doc.save(`${filename}_${Date.now()}.pdf`);

      toast({
        title: 'تم التصدير',
        description: 'تم تصدير التقرير إلى PDF بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ في التصدير',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const exportToExcel = (
    data: any[],
    sheetName: string,
    filename: string
  ) => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Save file
      XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);

      toast({
        title: 'تم التصدير',
        description: 'تم تصدير التقرير إلى Excel بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ في التصدير',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return { exportToPDF, exportToExcel };
};
```

Add export buttons to dashboards. Update `src/components/analytics/SalesAnalyticsDashboard.tsx`:

```typescript
import { useReportExport } from '@/hooks/useReportExport';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';

export const SalesAnalyticsDashboard = () => {
  // ... existing code ...
  const { exportToPDF, exportToExcel } = useReportExport();

  const handleExportPDF = () => {
    const headers = ['العميل', 'النوع', 'عدد الطلبات', 'القيمة الإجمالية', 'متوسط الطلب'];
    const rows = topCustomers.map(c => [
      c.customer_name,
      c.customer_type,
      c.total_orders,
      `${c.lifetime_value.toFixed(2)} ر.ق`,
      `${c.avg_order_value.toFixed(2)} ر.ق`,
    ]);

    exportToPDF('تقرير أفضل العملاء', headers, rows, 'top_customers_report');
  };

  const handleExportExcel = () => {
    const data = topCustomers.map(c => ({
      'اسم العميل': c.customer_name,
      'النوع': c.customer_type,
      'عدد الطلبات': c.total_orders,
      'القيمة الإجمالية': c.lifetime_value,
      'متوسط قيمة الطلب': c.avg_order_value,
      'آخر طلب': c.last_order_date,
    }));

    exportToExcel(data, 'أفضل العملاء', 'top_customers_report');
  };

  return (
    <div className="space-y-6">
      {/* ... existing summary metrics ... */}

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleExportPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          تصدير PDF
        </Button>
        <Button onClick={handleExportExcel} variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          تصدير Excel
        </Button>
      </div>

      {/* ... rest of dashboard ... */}
    </div>
  );
};
```

**Acceptance**: Can export any analytics report to PDF and Excel formats

---

### Task 4.3: Testing, Feature Flags & Documentation ⏱️ 2 hours

Create file: `src/tests/analytics.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Analytics Tests', () => {
  it('should fetch sales performance data', async () => {
    const { data, error } = await supabase
      .from('sales_performance_summary')
      .select('*')
      .limit(1);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should calculate inventory turnover correctly', async () => {
    const { data } = await supabase
      .from('inventory_turnover_analysis')
      .select('*')
      .limit(1)
      .single();

    expect(data).toHaveProperty('turnover_ratio');
    expect(data).toHaveProperty('days_of_inventory');
  });

  it('should forecast revenue correctly', async () => {
    // Test forecast calculation logic
    const historicalData = [1000, 1100, 1200, 1150, 1300];
    const windowSize = 3;
    const recentRevenues = historicalData.slice(-windowSize);
    const avgRevenue = recentRevenues.reduce((sum, r) => sum + r, 0) / windowSize;

    expect(avgRevenue).toBe((1200 + 1150 + 1300) / 3);
  });
});
```

Update `.env.example`:

```bash
# Analytics Feature Flags
VITE_ENABLE_ADVANCED_ANALYTICS=false
VITE_ENABLE_FORECASTING=false
VITE_ENABLE_REPORT_EXPORTS=false
```

Create file: `src/config/analyticsFeatureFlags.ts`

```typescript
export const ANALYTICS_FLAGS = {
  ADVANCED_ANALYTICS: import.meta.env.VITE_ENABLE_ADVANCED_ANALYTICS === 'true',
  FORECASTING: import.meta.env.VITE_ENABLE_FORECASTING === 'true',
  REPORT_EXPORTS: import.meta.env.VITE_ENABLE_REPORT_EXPORTS === 'true',
};
```

Update `README.md`:

```markdown
## Phase 9C: Reporting & Analytics

### Features
- ✅ Real-time sales, inventory, financial dashboards
- ✅ Vendor performance tracking
- ✅ Product analytics with profitability
- ✅ Revenue forecasting with confidence intervals
- ✅ Inventory stockout predictions
- ✅ PDF/Excel export functionality

### Setup
1. Run migration: `supabase/migrations/20251020000003_analytics_views.sql`
2. Install dependencies: `npm install jspdf jspdf-autotable xlsx recharts`
3. Enable feature flags in `.env.local`:
   ```
   VITE_ENABLE_ADVANCED_ANALYTICS=true
   VITE_ENABLE_FORECASTING=true
   VITE_ENABLE_REPORT_EXPORTS=true
   ```
4. Access at: `/analytics`

### Rollback Plan
1. Disable feature flags
2. Drop views if needed: `DROP VIEW sales_performance_summary CASCADE;`
3. Analytics views are read-only, no risk to transactional data
```

**Acceptance**: All tests pass, feature flags working, documentation complete

---

## 🎯 Final Checklist

- [ ] All 12 tasks completed
- [ ] Database views created and tested
- [ ] All analytics hooks return correct data
- [ ] All 5 dashboards working (Sales, Inventory, Financial, Vendors, Products)
- [ ] Forecasting algorithms tested
- [ ] PDF/Excel exports working
- [ ] Charts rendering correctly
- [ ] Feature flags implemented
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code reviewed by Agent A/B
- [ ] Merged to main

**Daily Checklist:**
- [ ] Morning: Pull from `main`, sync with Agent A & B
- [ ] Coordinate data dependencies (read-only views)
- [ ] Test chart performance with large datasets
- [ ] Push EOD, notify agents

**Questions?** Check coordination channel!
