import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { CommandPalette } from '@/components/command-palette';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Link as LinkIcon,
  Network,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
} from 'lucide-react';
import { useExport } from '@/hooks/useExport';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  useItemsWithPendingPOs,
  useLowStockItems,
  useOutOfStockItems,
  useTopVendorsByPerformance,
  useFulfillmentSummary,
  useDelayedOrders,
} from '@/hooks/integrations';
import { IntegrationHealthMonitor } from '@/components/integrations/IntegrationHealthMonitor';

/**
 * Integration Dashboard Page
 *
 * Unified dashboard showing cross-module integration status:
 * - Inventory ↔ Purchase Orders
 * - Sales ↔ Inventory Availability
 * - Vendor Performance
 * - Order Fulfillment Pipeline
 */

const IntegrationDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const navigate = useNavigate();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { exportDashboardPDF, state: exportState } = useExport();

  // Refs for export
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenSearch: () => {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
      searchInput?.focus();
    },
    onExport: () => {
      const exportButton = document.querySelector<HTMLButtonElement>('[data-action="export"]');
      exportButton?.click();
    },
  });

  // Integration data hooks
  const { data: itemsWithPendingPOs, isLoading: pendingPOsLoading } = useItemsWithPendingPOs();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  const { data: outOfStockItems, isLoading: outOfStockLoading } = useOutOfStockItems();
  const { data: topVendors, isLoading: vendorsLoading } = useTopVendorsByPerformance(5);
  const { data: fulfillmentStats, isLoading: fulfillmentLoading } = useFulfillmentSummary();
  const { data: delayedOrders, isLoading: delayedLoading } = useDelayedOrders();

  // Calculate integration health score
  const calculateHealthScore = (): number => {
    let score = 100;

    // Deduct points for issues
    if (outOfStockItems && outOfStockItems.length > 0) score -= 20;
    if (lowStockItems && lowStockItems.length > 5) score -= 15;
    if (delayedOrders && delayedOrders.length > 0) score -= 20;
    if (fulfillmentStats && fulfillmentStats.fulfillment_rate < 80) score -= 15;
    if (topVendors && topVendors.length > 0) {
      const avgOnTimeRate = topVendors.reduce((sum, v) => sum + v.on_time_delivery_rate, 0) / topVendors.length;
      if (avgOnTimeRate < 80) score -= 10;
    }

    return Math.max(0, score);
  };

  const healthScore = calculateHealthScore();
  const healthStatus = healthScore >= 80 ? 'excellent' : healthScore >= 60 ? 'good' : healthScore >= 40 ? 'fair' : 'poor';
  const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-blue-600' : healthScore >= 40 ? 'text-yellow-600' : 'text-red-600';
  const healthBgColor = healthScore >= 80 ? 'bg-green-100' : healthScore >= 60 ? 'bg-blue-100' : healthScore >= 40 ? 'bg-yellow-100' : 'bg-red-100';

  // Handle Export All
  const handleExportAll = async () => {
    try {
      if (!dashboardRef.current) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }

      const charts = [
        { element: dashboardRef.current, title: 'لوحة التكامل' },
      ];

      await exportDashboardPDF(charts, 'integration_dashboard.pdf', 'لوحة التكامل بين الوحدات');
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <>
      <CommandPalette open={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <div className="container mx-auto p-6 space-y-6" dir="rtl" ref={dashboardRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            لوحة التكامل بين الوحدات
          </h1>
          <p className="text-muted-foreground mt-1">
            مراقبة التكامل والتزامن بين المخزون والمبيعات والمشتريات
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Browse Mode Badge */}
          {isBrowsingMode && browsedCompany && (
            <Badge variant="outline" className="text-lg py-2 px-4">
              <Network className="h-4 w-4 mr-2" />
              تصفح: {browsedCompany.name}
            </Badge>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExportAll}
            disabled={exportState.isExporting}
            variant="outline"
            size="default"
            className="gap-2"
            data-action="export"
          >
            <Download className="h-4 w-4" />
            {exportState.isExporting ? 'جاري التصدير...' : 'تصدير لوحة المعلومات'}
          </Button>
        </div>
      </div>

      {/* Integration Health Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`border-2 ${healthBgColor} border-opacity-20`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${healthBgColor}`}>
                  <Network className={`h-6 w-6 ${healthColor}`} />
                </div>
                <div>
                  <CardTitle className="text-xl">حالة التكامل</CardTitle>
                  <CardDescription>تقييم شامل لصحة التكامل بين الوحدات</CardDescription>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-bold ${healthColor}`}>{healthScore}%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {healthStatus === 'excellent' && 'ممتاز'}
                  {healthStatus === 'good' && 'جيد'}
                  {healthStatus === 'fair' && 'مقبول'}
                  {healthStatus === 'poor' && 'ضعيف'}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Integration Health Monitor */}
      <IntegrationHealthMonitor />

      {/* Main Integration Tabs */}
      <Tabs defaultValue="inventory-po" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 gap-2">
          <TabsTrigger value="inventory-po" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>المخزون وأوامر الشراء</span>
          </TabsTrigger>
          <TabsTrigger value="sales-inventory" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span>المبيعات والمخزون</span>
          </TabsTrigger>
          <TabsTrigger value="vendor-performance" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>أداء الموردين</span>
          </TabsTrigger>
          <TabsTrigger value="order-fulfillment" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>تنفيذ الطلبات</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Inventory ↔ Purchase Orders */}
        <TabsContent value="inventory-po" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Items with Pending POs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  أصناف بأوامر شراء معلقة
                </CardTitle>
                <CardDescription>
                  الأصناف التي لديها أوامر شراء لم تستلم بعد
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingPOsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : itemsWithPendingPOs && itemsWithPendingPOs.length > 0 ? (
                  <div className="space-y-3">
                    {itemsWithPendingPOs.slice(0, 5).map((item) => (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            الكمية المعلقة: {item.pending_quantity} {item.unit_of_measure}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-blue-600">
                            {item.total_pos} أمر
                          </p>
                          {item.next_expected_delivery && (
                            <p className="text-xs text-muted-foreground">
                              التسليم: {new Date(item.next_expected_delivery).toLocaleDateString('en-US')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {itemsWithPendingPOs.length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/inventory')}
                      >
                        عرض الكل ({itemsWithPendingPOs.length})
                        <ArrowRight className="h-4 w-4 mr-2" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    لا توجد أوامر شراء معلقة
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  مخزون منخفض
                </CardTitle>
                <CardDescription>
                  الأصناف التي تحتاج إلى إعادة طلب
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockLoading ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : lowStockItems && lowStockItems.length > 0 ? (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 5).map((item) => (
                      <div
                        key={item.item_id}
                        className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                      >
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            متوفر: {item.quantity_available} {item.unit_of_measure}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/finance/purchase-orders')}
                        >
                          إنشاء طلب
                        </Button>
                      </div>
                    ))}
                    {lowStockItems.length > 5 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate('/inventory')}
                      >
                        عرض الكل ({lowStockItems.length})
                        <ArrowRight className="h-4 w-4 mr-2" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                    جميع الأصناف فوق الحد الأدنى
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Out of Stock Items */}
          {outOfStockItems && outOfStockItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  أصناف نفذت من المخزون ({outOfStockItems.length})
                </CardTitle>
                <CardDescription>
                  هذه الأصناف غير متوفرة حالياً وتحتاج إلى إعادة طلب فورية
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {outOfStockItems.slice(0, 6).map((item) => (
                    <div
                      key={item.item_id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50"
                    >
                      <div>
                        <p className="font-medium text-red-900">{item.item_name}</p>
                        <p className="text-sm text-red-700">
                          المستودع: {item.warehouse_name}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => navigate('/finance/purchase-orders')}
                      >
                        طلب عاجل
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Sales ↔ Inventory */}
        <TabsContent value="sales-inventory" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">الأصناف المتاحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {lowStockItems ? (lowStockItems.filter(i => i.stock_status === 'available').length) : 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">صنف جاهز للبيع</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">مخزون منخفض</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {lowStockItems ? lowStockItems.length : 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">صنف تحت الحد الأدنى</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">غير متوفر</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {outOfStockItems ? outOfStockItems.length : 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">صنف نفد من المخزون</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>توافر المخزون للمبيعات</CardTitle>
              <CardDescription>
                حالة المخزون الحالية ومدى جاهزيتها لعمليات البيع
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                <p className="text-lg font-medium">نظام مراقبة المخزون نشط</p>
                <p className="text-sm text-muted-foreground mt-2">
                  يتم التحقق من التوافر تلقائياً عند إنشاء عروض الأسعار والطلبات
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/sales/opportunities')}
                >
                  إنشاء فرصة بيع جديدة
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Vendor Performance */}
        <TabsContent value="vendor-performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                أفضل 5 موردين
              </CardTitle>
              <CardDescription>
                الموردون الأكثر أداءً بناءً على معدل التسليم في الوقت المحدد
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : topVendors && topVendors.length > 0 ? (
                <div className="space-y-4">
                  {topVendors.map((vendor, index) => (
                    <div
                      key={vendor.vendor_id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{vendor.vendor_name}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{vendor.total_orders} طلب</span>
                          <span>•</span>
                          <span>{vendor.total_purchase_value.toLocaleString('en-US')} ر.ق</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-green-600">
                            {vendor.on_time_delivery_rate.toFixed(0)}%
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          معدل التسليم في الوقت
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/finance/vendors')}
                  >
                    عرض جميع الموردين
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات أداء الموردين
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Order Fulfillment */}
        <TabsContent value="order-fulfillment" className="space-y-6">
          {/* Fulfillment Stats */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">إجمالي الطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {fulfillmentStats?.total_orders || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">طلب بيع</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">تم التنفيذ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {fulfillmentStats?.fulfilled_orders || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">طلب مكتمل</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">قيد التنفيذ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {fulfillmentStats?.pending_orders || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">طلب معلق</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">معدل التنفيذ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {fulfillmentStats?.fulfillment_rate.toFixed(0) || 0}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">نسبة الإنجاز</p>
              </CardContent>
            </Card>
          </div>

          {/* Delayed Orders */}
          {delayedOrders && delayedOrders.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Clock className="h-5 w-5" />
                  طلبات متأخرة ({delayedOrders.length})
                </CardTitle>
                <CardDescription>
                  طلبات تجاوزت تاريخ التسليم المتوقع
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {delayedOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.order_id}
                      className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50"
                    >
                      <div>
                        <p className="font-medium">طلب #{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          تاريخ التسليم: {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-US') : 'غير محدد'}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-yellow-700">
                          {order.order_total.toLocaleString('en-US')} ر.ق
                        </p>
                        <Badge variant="outline" className="text-xs border-yellow-400">
                          متأخر
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {delayedOrders.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/sales/orders')}
                    >
                      عرض الكل ({delayedOrders.length})
                      <ArrowRight className="h-4 w-4 mr-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
};

export default IntegrationDashboard;
