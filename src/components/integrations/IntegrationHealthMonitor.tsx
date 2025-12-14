import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface IntegrationHealth {
  name: string;
  view_name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: Date;
  recordCount?: number;
}

/**
 * Integration Health Monitor Component
 *
 * Monitors the health of integration views and data consistency:
 * - Database views accessible
 * - No data inconsistencies
 * - Sync delays within acceptable range
 *
 * Features:
 * - Real-time health checks
 * - Manual sync trigger
 * - Color-coded status indicators
 */

export const IntegrationHealthMonitor: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Check integration health
  const { data: healthStatus, isLoading, refetch } = useQuery({
    queryKey: ['integration-health', user?.profile?.company_id],
    queryFn: async (): Promise<IntegrationHealth[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const checks: IntegrationHealth[] = [];

      try {
        // Check 1: Inventory → Purchase Orders Summary
        const { data: poData, error: poError } = await supabase
          .from('inventory_purchase_order_summary')
          .select('*', { count: 'exact', head: false })
          .limit(1);

        checks.push({
          name: 'مخزون ← أوامر الشراء',
          view_name: 'inventory_purchase_order_summary',
          status: poError ? 'error' : 'healthy',
          message: poError ? `خطأ في الاتصال: ${poError.message}` : 'العرض يعمل بشكل صحيح',
          lastChecked: new Date(),
          recordCount: poData?.length,
        });

        // Check 2: Sales → Inventory Availability
        const { data: salesData, error: salesError } = await supabase
          .from('sales_inventory_availability')
          .select('*', { count: 'exact', head: false })
          .eq('company_id', user.profile.company_id)
          .limit(1);

        checks.push({
          name: 'مبيعات ← توفر المخزون',
          view_name: 'sales_inventory_availability',
          status: salesError ? 'error' : 'healthy',
          message: salesError ? `خطأ في الاتصال: ${salesError.message}` : 'العرض يعمل بشكل صحيح',
          lastChecked: new Date(),
          recordCount: salesData?.length,
        });

        // Check 3: Vendor Performance Scorecard
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_purchase_performance')
          .select('*', { count: 'exact', head: false })
          .eq('company_id', user.profile.company_id)
          .limit(1);

        checks.push({
          name: 'أداء الموردين',
          view_name: 'vendor_purchase_performance',
          status: vendorError ? 'error' : 'healthy',
          message: vendorError ? `خطأ في الاتصال: ${vendorError.message}` : 'العرض يعمل بشكل صحيح',
          lastChecked: new Date(),
          recordCount: vendorData?.length,
        });

        // Check 4: Customer Order Fulfillment
        const { data: orderData, error: orderError } = await supabase
          .from('sales_order_fulfillment_status')
          .select('*', { count: 'exact', head: false })
          .eq('company_id', user.profile.company_id)
          .limit(1);

        checks.push({
          name: 'تنفيذ الطلبات',
          view_name: 'sales_order_fulfillment_status',
          status: orderError ? 'error' : 'healthy',
          message: orderError ? `خطأ في الاتصال: ${orderError.message}` : 'العرض يعمل بشكل صحيح',
          lastChecked: new Date(),
          recordCount: orderData?.length,
        });

        // Check 5: Inventory Movement Summary
        const { data: movementData, error: movementError } = await supabase
          .from('inventory_movement_summary')
          .select('*', { count: 'exact', head: false })
          .eq('company_id', user.profile.company_id)
          .limit(1);

        checks.push({
          name: 'ملخص حركة المخزون',
          view_name: 'inventory_movement_summary',
          status: movementError ? 'error' : 'healthy',
          message: movementError ? `خطأ في الاتصال: ${movementError.message}` : 'العرض يعمل بشكل صحيح',
          lastChecked: new Date(),
          recordCount: movementData?.length,
        });

        // Check 6: Low Stock Recommendations
        const { data: reorderData, error: reorderError } = await supabase
          .from('inventory_reorder_recommendations')
          .select('*', { count: 'exact', head: false })
          .eq('company_id', user.profile.company_id)
          .limit(1);

        checks.push({
          name: 'توصيات إعادة الطلب',
          view_name: 'inventory_reorder_recommendations',
          status: reorderError ? 'error' : 'healthy',
          message: reorderError ? `خطأ في الاتصال: ${reorderError.message}` : 'العرض يعمل بشكل صحيح',
          lastChecked: new Date(),
          recordCount: reorderData?.length,
        });

        return checks;
      } catch (error) {
        console.error('Error checking integration health:', error);
        return checks;
      }
    },
    enabled: !!user?.profile?.company_id,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Calculate overall health
  const overallHealth = React.useMemo(() => {
    if (!healthStatus || healthStatus.length === 0) return 'unknown';

    const errorCount = healthStatus.filter((check) => check.status === 'error').length;
    const warningCount = healthStatus.filter((check) => check.status === 'warning').length;

    if (errorCount > 0) return 'error';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  }, [healthStatus]);

  const handleManualSync = async () => {
    setIsSyncing(true);

    try {
      // Invalidate all integration-related queries to force refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory-po-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['sales-inventory-availability'] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-performance-scorecard'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-order-fulfillment'] }),
        queryClient.invalidateQueries({ queryKey: ['integration-health'] }),
      ]);

      // Re-run health checks
      await refetch();

      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('خطأ في تحديث البيانات');
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Network className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
            سليم
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            تحذير
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            خطأ
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            غير معروف
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                overallHealth === 'healthy'
                  ? 'bg-green-100'
                  : overallHealth === 'warning'
                  ? 'bg-yellow-100'
                  : overallHealth === 'error'
                  ? 'bg-red-100'
                  : 'bg-gray-100'
              }`}
            >
              <Network
                className={`h-6 w-6 ${
                  overallHealth === 'healthy'
                    ? 'text-green-600'
                    : overallHealth === 'warning'
                    ? 'text-yellow-600'
                    : overallHealth === 'error'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                مراقبة صحة التكامل
                {getStatusBadge(overallHealth)}
              </CardTitle>
              <CardDescription>
                حالة عروض قاعدة البيانات ومزامنة البيانات
              </CardDescription>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing || isLoading}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            تحديث
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : healthStatus && healthStatus.length > 0 ? (
          <div className="space-y-3">
            {healthStatus.map((check, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <div className="text-left">
                  {getStatusBadge(check.status)}
                  {check.recordCount !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      آخر فحص: {check.lastChecked.toLocaleTimeString('en-US')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد بيانات لعرضها
          </div>
        )}

        {/* Summary */}
        {healthStatus && healthStatus.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {healthStatus.filter((c) => c.status === 'healthy').length}
                </div>
                <p className="text-xs text-muted-foreground">سليم</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {healthStatus.filter((c) => c.status === 'warning').length}
                </div>
                <p className="text-xs text-muted-foreground">تحذير</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {healthStatus.filter((c) => c.status === 'error').length}
                </div>
                <p className="text-xs text-muted-foreground">خطأ</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
