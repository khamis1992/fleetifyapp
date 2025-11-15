import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { TrendingUp, Package, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

interface TopProductsWidgetProps {
  className?: string;
}

type TimePeriod = 'today' | 'week' | 'month' | 'year';

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [viewMode, setViewMode] = useState<'revenue' | 'quantity'>('revenue');
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: salesOrders = [], isLoading: loadingSales } = useSalesOrders({
    status: 'completed'
  });

  const { data: inventoryItems = [], isLoading: loadingInventory } = useInventoryItems({
    is_active: true
  });

  const isLoading = loadingSales || loadingInventory;

  // Calculate date range based on selected period
  const getDateRange = (period: TimePeriod) => {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { startDate, endDate: now };
  };

  // Calculate top products analytics
  const analytics = useMemo(() => {
    const { startDate } = getDateRange(timePeriod);

    // Filter sales by date range
    const filteredSales = salesOrders.filter(order => {
      return new Date(order.order_date) >= startDate;
    });

    // Build a map of item ID to inventory item
    const itemsMap = new Map(inventoryItems.map(item => [item.id, item]));

    // Aggregate sales by product
    const productSales = new Map<string, {
      itemId: string;
      itemName: string;
      itemCode: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
      profitMargin: number;
      unitPrice: number;
      costPrice: number;
      imageUrl?: string;
    }>();

    filteredSales.forEach(order => {
      const items = order.items || [];
      items.forEach((item: any) => {
        const itemId = item.item_id || item.id;
        const inventoryItem = itemsMap.get(itemId);

        if (!productSales.has(itemId)) {
          const unitPrice = item.unit_price || inventoryItem?.unit_price || 0;
          const costPrice = inventoryItem?.cost_price || 0;

          productSales.set(itemId, {
            itemId,
            itemName: item.item_name || inventoryItem?.item_name_ar || inventoryItem?.item_name || 'منتج غير معروف',
            itemCode: inventoryItem?.item_code || inventoryItem?.sku || '',
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            profitMargin: 0,
            unitPrice,
            costPrice,
            imageUrl: inventoryItem?.image_url
          });
        }

        const product = productSales.get(itemId)!;
        const quantity = item.quantity || 1;
        const revenue = quantity * (item.unit_price || product.unitPrice);
        const cost = quantity * product.costPrice;

        product.quantity += quantity;
        product.revenue += revenue;
        product.cost += cost;
        product.profit = product.revenue - product.cost;
        product.profitMargin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
      });
    });

    // Convert to array and sort
    const productsArray = Array.from(productSales.values());

    // Top 10 by revenue
    const topByRevenue = [...productsArray]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top 10 by quantity
    const topByQuantity = [...productsArray]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Calculate category performance (simplified by item type)
    const categoryPerformance = new Map<string, {
      revenue: number;
      quantity: number;
      profit: number;
    }>();

    productsArray.forEach(product => {
      const inventoryItem = itemsMap.get(product.itemId);
      const category = inventoryItem?.item_type || 'غير مصنف';

      if (!categoryPerformance.has(category)) {
        categoryPerformance.set(category, {
          revenue: 0,
          quantity: 0,
          profit: 0
        });
      }

      const cat = categoryPerformance.get(category)!;
      cat.revenue += product.revenue;
      cat.quantity += product.quantity;
      cat.profit += product.profit;
    });

    const topCategories = Array.from(categoryPerformance.entries())
      .map(([name, data]) => ({
        name: name === 'product' ? 'منتجات' : name === 'service' ? 'خدمات' : name,
        ...data,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate turnover for fastest moving items
    const fastestMoving = [...productsArray]
      .map(product => {
        const inventoryItem = itemsMap.get(product.itemId);
        const avgInventory = inventoryItem?.min_stock_level || 1;
        const turnover = product.quantity / avgInventory;
        return { ...product, turnover };
      })
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 10);

    return {
      topByRevenue,
      topByQuantity,
      topCategories,
      fastestMoving
    };
  }, [salesOrders, inventoryItems, timePeriod]);

  const exportData = useMemo(() => {
    const displayData = viewMode === 'revenue' ? analytics.topByRevenue : analytics.topByQuantity;
    return displayData.map(item => ({
      'اسم المنتج': item.itemName,
      'رمز المنتج': item.itemCode,
      'الإيرادات': item.revenue,
      'الكمية المباعة': item.quantity,
      'الربح': item.profit,
      'هامش الربح %': item.profitMargin.toFixed(2)
    }));
  }, [analytics.topByRevenue, analytics.topByQuantity, viewMode]);

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={3} />;
  }

  const displayData = viewMode === 'revenue' ? analytics.topByRevenue : analytics.topByQuantity;
  const chartData = displayData.map(product => ({
    name: product.itemName.length > 20 ? product.itemName.substring(0, 20) + '...' : product.itemName,
    value: viewMode === 'revenue' ? product.revenue : product.quantity,
    profit: product.profit,
    margin: product.profitMargin
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              أفضل المنتجات
            </CardTitle>
            <div className="flex gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="top_products"
                title="أفضل المنتجات"
                variant="ghost"
                size="sm"
              />
              <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">الأسبوع</SelectItem>
                  <SelectItem value="month">الشهر</SelectItem>
                  <SelectItem value="year">السنة</SelectItem>
                </SelectContent>
              </Select>
              <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'revenue' | 'quantity')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">الإيرادات</SelectItem>
                  <SelectItem value="quantity">الكمية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className="space-y-6">
          {/* Chart */}
          {chartData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="#888"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="#888"
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'value') {
                        return viewMode === 'revenue'
                          ? [formatCurrency(value), 'الإيرادات']
                          : [value, 'الكمية المباعة'];
                      }
                      if (name === 'profit') {
                        return [formatCurrency(value), 'الربح'];
                      }
                      if (name === 'margin') {
                        return [value.toFixed(1) + '%', 'هامش الربح'];
                      }
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="value"
                    fill="#f97316"
                    name={viewMode === 'revenue' ? 'الإيرادات' : 'الكمية'}
                    radius={[0, 4, 4, 0]}
                  />
                  {viewMode === 'revenue' && (
                    <Bar
                      dataKey="profit"
                      fill="#10b981"
                      name="الربح"
                      radius={[0, 4, 4, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyStateCompact
              type="no-data"
              title="لا توجد بيانات مبيعات"
              description="لا توجد بيانات مبيعات للفترة المحددة"
            />
          )}

          {/* Top Products List */}
          {displayData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">أفضل 5 منتجات</h3>
              <div className="space-y-2">
                {displayData.slice(0, 5).map((product, index) => (
                  <div
                    key={product.itemId}
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.itemName}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {product.itemName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {product.itemCode && `رمز: ${product.itemCode} | `}
                        هامش ربح: {product.profitMargin.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-orange-600">
                        {viewMode === 'revenue' ? formatCurrency(product.revenue) : `${product.quantity} وحدة`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ربح: {formatCurrency(product.profit)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Performance */}
          {analytics.topCategories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">أداء الفئات</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analytics.topCategories.slice(0, 3).map((category) => (
                  <div
                    key={category.name}
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <Badge variant="secondary" className="text-xs">
                        {category.profitMargin.toFixed(1)}% هامش
                      </Badge>
                    </div>
                    <div className="font-semibold text-gray-900">{category.name}</div>
                    <div className="text-sm text-gray-600 mt-2">
                      {formatCurrency(category.revenue)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {category.quantity} وحدة مباعة
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory')}
              className="w-full"
            >
              <Package className="h-4 w-4 ml-2" />
              عرض تفاصيل المنتجات
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
