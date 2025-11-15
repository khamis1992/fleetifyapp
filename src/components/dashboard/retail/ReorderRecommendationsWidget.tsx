import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { AlertTriangle, Package, Clock, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';

interface ReorderRecommendationsWidgetProps {
  className?: string;
}

interface ReorderItem {
  id: string;
  itemName: string;
  itemCode: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  dailySalesVelocity: number;
  daysUntilStockout: number;
  estimatedCost: number;
  unitCost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export const ReorderRecommendationsWidget: React.FC<ReorderRecommendationsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const chartRef = React.useRef<HTMLDivElement>(null);

  const { data: inventoryItems = [], isLoading: loadingInventory } = useInventoryItems({
    is_active: true
  });

  const { data: salesOrders = [], isLoading: loadingSales } = useSalesOrders({
    status: 'completed'
  });

  const isLoading = loadingInventory || loadingSales;

  // Calculate reorder recommendations
  const recommendations = useMemo(() => {
    // Calculate sales velocity for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = salesOrders.filter(order => {
      return new Date(order.order_date) >= thirtyDaysAgo;
    });

    // Build sales velocity map
    const salesVelocityMap = new Map<string, number>();
    recentSales.forEach(order => {
      const items = order.items || [];
      items.forEach((item: any) => {
        const itemId = item.item_id || item.id;
        const quantity = item.quantity || 1;
        salesVelocityMap.set(
          itemId,
          (salesVelocityMap.get(itemId) || 0) + quantity
        );
      });
    });

    // Convert to daily velocity (divide by 30)
    salesVelocityMap.forEach((value, key) => {
      salesVelocityMap.set(key, value / 30);
    });

    // Find items that need reordering
    const reorderItems: ReorderItem[] = [];

    inventoryItems.forEach(item => {
      const currentStock = item.min_stock_level || 0;
      const reorderPoint = item.reorder_point || currentStock * 0.3;
      const reorderQuantity = item.reorder_quantity || Math.max(50, currentStock * 0.5);
      const dailyVelocity = salesVelocityMap.get(item.id) || 0;

      // Check if item needs reordering
      if (currentStock <= reorderPoint) {
        const daysUntilStockout = dailyVelocity > 0
          ? Math.max(0, currentStock / dailyVelocity)
          : 999;

        const estimatedCost = reorderQuantity * (item.cost_price || 0);

        // Determine urgency
        let urgency: 'critical' | 'high' | 'medium' | 'low';
        if (currentStock === 0) {
          urgency = 'critical';
        } else if (daysUntilStockout <= 3) {
          urgency = 'critical';
        } else if (daysUntilStockout <= 7) {
          urgency = 'high';
        } else if (daysUntilStockout <= 14) {
          urgency = 'medium';
        } else {
          urgency = 'low';
        }

        reorderItems.push({
          id: item.id,
          itemName: item.item_name_ar || item.item_name,
          itemCode: item.item_code || item.sku || '',
          currentStock,
          reorderPoint,
          reorderQuantity,
          dailySalesVelocity: dailyVelocity,
          daysUntilStockout,
          estimatedCost,
          unitCost: item.cost_price || 0,
          urgency
        });
      }
    });

    // Sort by urgency and days until stockout
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    reorderItems.sort((a, b) => {
      if (a.urgency !== b.urgency) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    // Calculate totals
    const totalEstimatedCost = reorderItems.reduce(
      (sum, item) => sum + item.estimatedCost,
      0
    );

    const urgencyCount = {
      critical: reorderItems.filter(i => i.urgency === 'critical').length,
      high: reorderItems.filter(i => i.urgency === 'high').length,
      medium: reorderItems.filter(i => i.urgency === 'medium').length,
      low: reorderItems.filter(i => i.urgency === 'low').length
    };

    return {
      items: reorderItems,
      totalEstimatedCost,
      urgencyCount
    };
  }, [inventoryItems, salesOrders]);

  const exportData = React.useMemo(() =>
    recommendations.items.map(item => ({
      'اسم المنتج': item.itemName,
      'رمز المنتج': item.itemCode,
      'المخزون الحالي': item.currentStock,
      'الكمية الموصى بها': item.reorderQuantity,
      'أيام حتى النفاد': item.daysUntilStockout < 999 ? item.daysUntilStockout : 'غير محدد',
      'التكلفة المقدرة': item.estimatedCost,
      'الأولوية': item.urgency
    })),
    [recommendations.items]
  );

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <Badge variant="destructive">حرج</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">عالي</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">متوسط</Badge>;
      default:
        return <Badge variant="secondary">منخفض</Badge>;
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectedItemsCost = useMemo(() => {
    return recommendations.items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.estimatedCost, 0);
  }, [recommendations.items, selectedItems]);

  if (isLoading) {
    return <WidgetSkeleton hasChart={false} hasStats statCount={4} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              توصيات إعادة الطلب
            </CardTitle>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="reorder_recommendations"
                title="توصيات إعادة الطلب"
                variant="ghost"
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/inventory/reports')}
                className="text-orange-600 hover:text-orange-700"
              >
                تقرير إعادة الطلب
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-3 rounded-lg border border-red-100">
              <div className="text-2xl font-bold text-red-600">
                {recommendations.urgencyCount.critical}
              </div>
              <div className="text-xs text-gray-600 mt-1">حرج</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 rounded-lg border border-orange-100">
              <div className="text-2xl font-bold text-orange-600">
                {recommendations.urgencyCount.high}
              </div>
              <div className="text-xs text-gray-600 mt-1">عالي</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-3 rounded-lg border border-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">
                {recommendations.urgencyCount.medium}
              </div>
              <div className="text-xs text-gray-600 mt-1">متوسط</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-100">
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(recommendations.totalEstimatedCost)}
              </div>
              <div className="text-xs text-gray-600 mt-1">التكلفة المقدرة</div>
            </div>
          </div>

          {/* Reorder Items List */}
          {recommendations.items.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                المنتجات التي تحتاج إعادة طلب ({recommendations.items.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recommendations.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {item.itemName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.itemCode && `رمز: ${item.itemCode}`}
                          </div>
                        </div>
                        {getUrgencyBadge(item.urgency)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                        <div>
                          <div className="text-gray-500">المخزون الحالي</div>
                          <div className="font-semibold text-red-600">{item.currentStock}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">الكمية الموصى بها</div>
                          <div className="font-semibold text-green-600">{item.reorderQuantity}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">أيام حتى النفاد</div>
                          <div className="font-semibold text-orange-600">
                            {item.daysUntilStockout < 999
                              ? `${Math.ceil(item.daysUntilStockout)} يوم`
                              : 'غير محدد'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">التكلفة المقدرة</div>
                          <div className="font-semibold text-blue-600">
                            {formatCurrency(item.estimatedCost)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          سرعة البيع: {item.dailySalesVelocity.toFixed(1)} وحدة/يوم
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          تكلفة الوحدة: {formatCurrency(item.unitCost)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyStateCompact
              type="no-data"
              title="جميع المنتجات في مستويات مخزون آمنة"
              description="لا توجد منتجات تحتاج إعادة طلب حالياً"
            />
          )}

          {/* Selected Items Summary */}
          {selectedItems.size > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    تم اختيار {selectedItems.size} منتج
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    التكلفة الإجمالية: {formatCurrency(selectedItemsCost)}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/purchase-orders/new')}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  إنشاء أمر شراء
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {recommendations.items.length > 0 && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allIds = new Set(recommendations.items.map(i => i.id));
                  setSelectedItems(selectedItems.size === recommendations.items.length ? new Set() : allIds);
                }}
                className="flex-1"
              >
                {selectedItems.size === recommendations.items.length ? 'إلغاء التحديد' : 'تحديد الكل'}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/purchase-orders/new')}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={selectedItems.size === 0}
              >
                إنشاء أمر شراء للمحدد
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
