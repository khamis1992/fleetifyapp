import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { BarChart3, TrendingUp, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface CategoryPerformanceWidgetProps {
  className?: string;
}

export const CategoryPerformanceWidget: React.FC<CategoryPerformanceWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();

  const { data: salesOrders = [], isLoading: loadingSales } = useSalesOrders({
    status: 'completed'
  });

  const { data: inventoryItems = [], isLoading: loadingInventory } = useInventoryItems({
    is_active: true
  });

  const isLoading = loadingSales || loadingInventory;

  // Calculate category performance
  const analytics = useMemo(() => {
    // Build item map
    const itemsMap = new Map(inventoryItems.map(item => [item.id, item]));

    // Calculate current period (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Calculate previous period (30-60 days ago)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const currentPeriodSales = salesOrders.filter(order => {
      return new Date(order.order_date) >= thirtyDaysAgo;
    });

    const previousPeriodSales = salesOrders.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
    });

    // Build category performance map
    const categoryPerformance = new Map<string, {
      revenue: number;
      previousRevenue: number;
      cost: number;
      profit: number;
      profitMargin: number;
      unitsSold: number;
      growthRate: number;
    }>();

    const processSales = (sales: typeof salesOrders, isPrevious: boolean) => {
      sales.forEach(order => {
        const items = order.items || [];
        items.forEach((item: any) => {
          const itemId = item.item_id || item.id;
          const inventoryItem = itemsMap.get(itemId);
          const category = inventoryItem?.item_type || 'غير مصنف';

          if (!categoryPerformance.has(category)) {
            categoryPerformance.set(category, {
              revenue: 0,
              previousRevenue: 0,
              cost: 0,
              profit: 0,
              profitMargin: 0,
              unitsSold: 0,
              growthRate: 0
            });
          }

          const cat = categoryPerformance.get(category)!;
          const quantity = item.quantity || 1;
          const unitPrice = item.unit_price || inventoryItem?.unit_price || 0;
          const costPrice = inventoryItem?.cost_price || 0;
          const revenue = quantity * unitPrice;
          const cost = quantity * costPrice;

          if (isPrevious) {
            cat.previousRevenue += revenue;
          } else {
            cat.revenue += revenue;
            cat.cost += cost;
            cat.unitsSold += quantity;
          }
        });
      });
    };

    processSales(currentPeriodSales, false);
    processSales(previousPeriodSales, true);

    // Calculate derived metrics
    categoryPerformance.forEach((cat) => {
      cat.profit = cat.revenue - cat.cost;
      cat.profitMargin = cat.revenue > 0 ? (cat.profit / cat.revenue) * 100 : 0;
      cat.growthRate = cat.previousRevenue > 0
        ? ((cat.revenue - cat.previousRevenue) / cat.previousRevenue) * 100
        : 0;
    });

    // Convert to array and sort by revenue
    const categoriesArray = Array.from(categoryPerformance.entries())
      .map(([name, data]) => ({
        name: name === 'product' ? 'منتجات' : name === 'service' ? 'خدمات' : name,
        ...data
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Find underperforming categories (negative growth)
    const underperforming = categoriesArray.filter(cat => cat.growthRate < -5);

    return {
      categories: categoriesArray,
      underperforming
    };
  }, [salesOrders, inventoryItems]);

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            أداء الفئات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              أداء الفئات
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory/categories')}
              className="text-orange-600 hover:text-orange-700"
            >
              تفاصيل الفئات
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category Performance Chart */}
          {analytics.categories.length > 0 ? (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-3">الإيرادات حسب الفئة (آخر 30 يوم)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.categories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#888" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#888"
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'revenue') return [formatCurrency(value), 'الإيرادات'];
                        if (name === 'profit') return [formatCurrency(value), 'الربح'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="الإيرادات" radius={[0, 4, 4, 0]}>
                      {analytics.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                    <Bar dataKey="profit" name="الربح" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Cards */}
              <div>
                <h3 className="text-sm font-semibold mb-3">ملخص الفئات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analytics.categories.map((category, index) => (
                    <div
                      key={category.name}
                      className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div className="font-semibold text-gray-900">{category.name}</div>
                        </div>
                        {category.growthRate >= 0 ? (
                          <Badge className="bg-green-500">
                            +{category.growthRate.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {category.growthRate.toFixed(1)}%
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <div className="text-xs text-gray-500">الإيرادات</div>
                          <div className="font-bold text-sm text-gray-900">
                            {formatCurrency(category.revenue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">الربح</div>
                          <div className="font-bold text-sm text-green-600">
                            {formatCurrency(category.profit)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">هامش الربح</div>
                          <div className="font-bold text-sm text-blue-600">
                            {category.profitMargin.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">وحدات مباعة</div>
                          <div className="font-bold text-sm text-orange-600">
                            {category.unitsSold}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Underperforming Alert */}
              {analytics.underperforming.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5 transform rotate-180" />
                    <div className="flex-1">
                      <div className="font-semibold text-yellow-900">
                        فئات ضعيفة الأداء
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        {analytics.underperforming.length} فئة تظهر انخفاضاً في الأداء مقارنة بالفترة السابقة:
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analytics.underperforming.map((cat) => (
                          <Badge key={cat.name} variant="outline" className="border-yellow-400">
                            {cat.name} ({cat.growthRate.toFixed(1)}%)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <div className="font-medium">لا توجد بيانات مبيعات</div>
              <div className="text-sm mt-1">ابدأ بتسجيل المبيعات لرؤية أداء الفئات</div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
