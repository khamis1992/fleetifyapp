import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { Package, AlertTriangle, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
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
import { EmptyStateCompact } from '@/components/ui/EmptyState';

interface InventoryLevelsWidgetProps {
  className?: string;
}

export const InventoryLevelsWidget: React.FC<InventoryLevelsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: inventoryItems = [], isLoading: loadingInventory } = useInventoryItems({
    is_active: true
  });

  const { data: salesOrders = [], isLoading: loadingSales } = useSalesOrders({
    status: 'completed'
  });

  const isLoading = loadingInventory || loadingSales;

  // Calculate inventory analytics
  const analytics = useMemo(() => {
    // Calculate total inventory value
    const totalValue = inventoryItems.reduce((sum, item) => {
      // For items without stock levels, use min_stock_level as estimate
      const quantity = item.min_stock_level || 0;
      return sum + (quantity * (item.cost_price || 0));
    }, 0);

    // Find low stock items (current_stock <= reorder_point)
    const lowStockItems = inventoryItems.filter(item => {
      const minStock = item.min_stock_level || 0;
      const reorderPoint = item.reorder_point || minStock * 0.3;
      return minStock <= reorderPoint;
    });

    // Find out of stock items (current_stock = 0)
    const outOfStockItems = inventoryItems.filter(item => {
      return (item.min_stock_level || 0) === 0;
    });

    // Calculate stock turnover rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = salesOrders.filter(order => {
      return new Date(order.order_date) >= thirtyDaysAgo;
    });

    // Calculate total sales value for turnover
    const totalSalesValue = recentSales.reduce((sum, order) => sum + (order.total || 0), 0);
    const avgInventoryValue = totalValue; // Simplified: using current value
    const turnoverRate = avgInventoryValue > 0 ? totalSalesValue / avgInventoryValue : 0;

    // Find dead stock (items not sold in 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentSaleItems = new Set(
      recentSales.flatMap(order =>
        (order.items || []).map((item: any) => item.item_id)
      )
    );

    const deadStockItems = inventoryItems.filter(item => {
      return !recentSaleItems.has(item.id);
    });

    // Calculate inventory distribution by category (simplified)
    // Since we don't have category names, we'll group by item_type
    const categoryDistribution = inventoryItems.reduce((acc, item) => {
      const category = item.item_type || 'غير مصنف';
      const value = (item.min_stock_level || 0) * (item.cost_price || 0);
      acc[category] = (acc[category] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryDistribution)
      .map(([category, value]) => ({
        name: category === 'product' ? 'منتجات' : category === 'service' ? 'خدمات' : category,
        value
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Top low stock items (sorted by shortage severity)
    const topLowStockItems = lowStockItems
      .map(item => {
        const minStock = item.min_stock_level || 0;
        const reorderPoint = item.reorder_point || minStock * 0.3;
        const shortage = reorderPoint - minStock;
        return {
          ...item,
          shortage
        };
      })
      .sort((a, b) => b.shortage - a.shortage)
      .slice(0, 5);

    return {
      totalValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      turnoverRate,
      deadStockCount: deadStockItems.length,
      categoryData,
      topLowStockItems
    };
  }, [inventoryItems, salesOrders]);

  const exportData = useMemo(() =>
    analytics.categoryData.map(item => ({
      'الفئة': item.name,
      'القيمة': item.value
    })),
    [analytics.categoryData]
  );

  const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={5} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              مستويات المخزون
            </CardTitle>
            <div className="flex gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="inventory_levels"
                title="مستويات المخزون"
                variant="ghost"
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/inventory')}
                className="text-orange-600 hover:text-orange-700"
              >
                عرض المخزون المنخفض
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Value */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(analytics.totalValue)}
              </div>
              <div className="text-xs text-gray-600 mt-1">قيمة المخزون</div>
            </div>

            {/* Low Stock */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-100">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {analytics.lowStockCount}
              </div>
              <div className="text-xs text-gray-600 mt-1">مخزون منخفض</div>
            </div>

            {/* Out of Stock */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {analytics.outOfStockCount}
              </div>
              <div className="text-xs text-gray-600 mt-1">نفذت الكمية</div>
            </div>

            {/* Turnover Rate */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {analytics.turnoverRate.toFixed(2)}x
              </div>
              <div className="text-xs text-gray-600 mt-1">معدل الدوران</div>
            </div>

            {/* Dead Stock */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-4 w-4 text-gray-500" />
              </div>
              <div className="text-xl font-bold text-gray-900">
                {analytics.deadStockCount}
              </div>
              <div className="text-xs text-gray-600 mt-1">مخزون راكد</div>
              <div className="text-xs text-gray-500 mt-1">
                90+ يوم بدون بيع
              </div>
            </div>
          </div>

          {/* Category Distribution Chart */}
          {analytics.categoryData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">توزيع المخزون حسب الفئة</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Low Stock Items */}
          {analytics.topLowStockItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">أهم المنتجات ذات المخزون المنخفض</h3>
              <div className="space-y-2">
                {analytics.topLowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {item.item_name_ar || item.item_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        رمز: {item.item_code || item.sku || 'غير محدد'}
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant="destructive" className="text-xs">
                        {item.min_stock_level || 0} متبقي
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        نقطة الطلب: {item.reorder_point || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/purchase-orders/new')}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              إنشاء أمر شراء
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory/reports')}
              className="flex-1"
            >
              تقرير إعادة الطلب
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
