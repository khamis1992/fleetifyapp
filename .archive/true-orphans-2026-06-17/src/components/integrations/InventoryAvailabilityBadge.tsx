import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useItemStockLevels } from '@/hooks/useInventoryStockLevels';

interface InventoryAvailabilityBadgeProps {
  itemId: string;
  quantityNeeded: number;
  warehouseId?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * Inventory Availability Badge Component
 *
 * Displays real-time stock availability status with color coding:
 * - Green: In Stock (available >= needed)
 * - Orange: Low Stock (available < needed but > 0)
 * - Red: Out of Stock (available = 0)
 *
 * Features:
 * - Tooltip with detailed stock information
 * - Multi-warehouse support
 * - Real-time stock level checking
 */
export const InventoryAvailabilityBadge: React.FC<InventoryAvailabilityBadgeProps> = ({
  itemId,
  quantityNeeded,
  warehouseId,
  showDetails = false,
  className = '',
}) => {
  const { data: stockLevels, isLoading } = useItemStockLevels(itemId);

  if (isLoading) {
    return (
      <Badge variant="outline" className={className}>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        جاري التحميل...
      </Badge>
    );
  }

  if (!stockLevels || stockLevels.length === 0) {
    return (
      <Badge variant="destructive" className={className}>
        <XCircle className="h-3 w-3 mr-1" />
        غير متوفر
      </Badge>
    );
  }

  // Calculate total or specific warehouse availability
  let totalAvailable = 0;
  let totalAllocated = 0;
  let warehouseCount = 0;

  if (warehouseId) {
    // Get stock for specific warehouse
    const warehouseStock = stockLevels.find((stock) => stock.warehouse_id === warehouseId);
    if (warehouseStock) {
      totalAvailable = warehouseStock.quantity_available;
      totalAllocated = warehouseStock.quantity_allocated;
      warehouseCount = 1;
    }
  } else {
    // Sum across all warehouses
    stockLevels.forEach((stock) => {
      totalAvailable += stock.quantity_available;
      totalAllocated += stock.quantity_allocated;
      warehouseCount++;
    });
  }

  // Determine status
  const isAvailable = totalAvailable >= quantityNeeded;
  const isLowStock = totalAvailable > 0 && totalAvailable < quantityNeeded;
  const isOutOfStock = totalAvailable === 0;

  // Get status details
  const getStatusIcon = () => {
    if (isAvailable) return <CheckCircle2 className="h-3 w-3 mr-1" />;
    if (isLowStock) return <AlertTriangle className="h-3 w-3 mr-1" />;
    return <XCircle className="h-3 w-3 mr-1" />;
  };

  const getStatusText = () => {
    if (isAvailable) return 'متوفر';
    if (isLowStock) return 'مخزون منخفض';
    return 'غير متوفر';
  };

  const getStatusVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (isAvailable) return 'default';
    if (isLowStock) return 'secondary';
    return 'destructive';
  };

  const shortage = isLowStock ? quantityNeeded - totalAvailable : 0;

  // Build detailed tooltip content
  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="font-medium border-b pb-1">تفاصيل المخزون</div>
      <div className="grid grid-cols-2 gap-2">
        <span className="text-muted-foreground">الكمية المطلوبة:</span>
        <span className="font-medium">{quantityNeeded}</span>

        <span className="text-muted-foreground">الكمية المتاحة:</span>
        <span className={`font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
          {totalAvailable}
        </span>

        <span className="text-muted-foreground">الكمية المخصصة:</span>
        <span className="font-medium">{totalAllocated}</span>

        {shortage > 0 && (
          <>
            <span className="text-muted-foreground">النقص:</span>
            <span className="font-medium text-red-600">{shortage}</span>
          </>
        )}

        {!warehouseId && warehouseCount > 1 && (
          <>
            <span className="text-muted-foreground">عدد المستودعات:</span>
            <span className="font-medium">{warehouseCount}</span>
          </>
        )}
      </div>

      {/* Warehouse breakdown */}
      {!warehouseId && stockLevels.length > 1 && (
        <div className="mt-2 pt-2 border-t">
          <div className="font-medium mb-1">توزيع المستودعات:</div>
          <div className="space-y-1">
            {stockLevels.map((stock) => (
              <div key={stock.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {stock.warehouse_name || 'مستودع غير معروف'}
                </span>
                <span className="font-medium">{stock.quantity_available}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const badgeContent = (
    <Badge
      variant={getStatusVariant()}
      className={`${className} ${
        isAvailable
          ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300'
          : isLowStock
          ? 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300'
          : ''
      }`}
    >
      {getStatusIcon()}
      {getStatusText()}
      {showDetails && ` (${totalAvailable}/${quantityNeeded})`}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Simplified version for quick stock status check
 */
export const StockStatusIcon: React.FC<{
  itemId: string;
  quantityNeeded: number;
  warehouseId?: string;
}> = ({ itemId, quantityNeeded, warehouseId }) => {
  const { data: stockLevels, isLoading } = useItemStockLevels(itemId);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
  }

  if (!stockLevels || stockLevels.length === 0) {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }

  let totalAvailable = 0;

  if (warehouseId) {
    const warehouseStock = stockLevels.find((stock) => stock.warehouse_id === warehouseId);
    totalAvailable = warehouseStock?.quantity_available || 0;
  } else {
    totalAvailable = stockLevels.reduce((sum, stock) => sum + stock.quantity_available, 0);
  }

  const isAvailable = totalAvailable >= quantityNeeded;
  const isLowStock = totalAvailable > 0 && totalAvailable < quantityNeeded;

  if (isAvailable) {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }

  if (isLowStock) {
    return <AlertTriangle className="h-4 w-4 text-orange-600" />;
  }

  return <XCircle className="h-4 w-4 text-destructive" />;
};
