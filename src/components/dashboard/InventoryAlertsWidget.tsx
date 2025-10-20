import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLowStockItems, useInventoryItems } from '@/hooks/useInventoryItems';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const InventoryAlertsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: lowStockItems, isLoading: lowStockLoading } = useLowStockItems();
  const { data: allItems, isLoading: allItemsLoading } = useInventoryItems({ is_active: true });

  const isLoading = lowStockLoading || allItemsLoading;

  // Calculate stats
  const lowStockCount = lowStockItems?.length || 0;
  const outOfStockCount = lowStockItems?.filter(item => item.current_quantity === 0).length || 0;
  const totalInventoryValue = allItems?.reduce((sum, item) => sum + (item.unit_price * 0), 0) || 0; // Would need actual quantity

  // Determine color based on status
  const getStatusColor = () => {
    if (outOfStockCount > 0) return 'destructive';
    if (lowStockCount > 0) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (outOfStockCount > 0) return 'حرج';
    if (lowStockCount > 0) return 'تنبيه';
    return 'جيد';
  };

  const statusColor = getStatusColor();
  const statusText = getStatusText();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                statusColor === 'destructive' ? 'bg-destructive/10 text-destructive' :
                statusColor === 'warning' ? 'bg-orange-500/10 text-orange-500' :
                'bg-success/10 text-success'
              }`}>
                {statusColor === 'success' ? <Package size={20} /> : <AlertTriangle size={20} />}
              </div>
              <h3 className="text-lg font-semibold text-foreground">تنبيهات المخزون</h3>
            </div>
            <Badge
              variant="outline"
              className={`${
                statusColor === 'destructive' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                statusColor === 'warning' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                'bg-success/10 text-success border-success/20'
              }`}
            >
              {statusText}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">مخزون منخفض</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-orange-500">{lowStockCount}</p>
                    {lowStockCount > 0 && (
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                        !
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">نفذ من المخزون</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-destructive">{outOfStockCount}</p>
                    {outOfStockCount > 0 && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                        !!
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Low Stock Items Preview */}
              {lowStockItems && lowStockItems.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">أصناف تحتاج إعادة طلب:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {lowStockItems.slice(0, 3).map((item, index) => (
                      <div
                        key={item.item_id || index}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {item.item_name_ar || item.item_name || 'صنف'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            الكمية: {item.current_quantity || 0} / الحد الأدنى: {item.min_stock_level || 0}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            item.current_quantity === 0
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                          }`}
                        >
                          {item.shortage || 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {lowStockItems.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      + {lowStockItems.length - 3} صنف آخر
                    </p>
                  )}
                </div>
              )}

              {/* Empty State */}
              {(!lowStockItems || lowStockItems.length === 0) && (
                <div className="text-center py-6">
                  <Package className="h-12 w-12 mx-auto text-success/50 mb-2" />
                  <p className="text-sm text-muted-foreground">جميع المخزون في مستويات جيدة</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/inventory')}
            className="w-full h-9 hover:bg-primary/10 hover:text-primary"
          >
            عرض المخزون المنخفض
            <ArrowRight size={14} className="mr-2" />
          </Button>
          {lowStockCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/purchase-orders')}
              className="w-full h-9"
            >
              إنشاء أمر شراء
            </Button>
          )}
        </div>

        {/* Bottom accent */}
        <div className={`absolute bottom-0 left-0 h-1 w-full ${
          statusColor === 'destructive' ? 'bg-gradient-to-r from-destructive/50 to-destructive/20' :
          statusColor === 'warning' ? 'bg-gradient-to-r from-orange-500/50 to-orange-500/20' :
          'bg-gradient-to-r from-success/50 to-success/20'
        }`} />
      </Card>
    </motion.div>
  );
};
