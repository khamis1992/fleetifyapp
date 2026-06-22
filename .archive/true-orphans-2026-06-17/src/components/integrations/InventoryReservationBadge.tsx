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

interface InventoryReservationBadgeProps {
  itemId: string;
  quantityReserved: number;
  warehouseId?: string;
  showDetails?: boolean;
  className?: string;
}

/**
 * Inventory Reservation Badge Component
 *
 * Displays reserved quantity for sales orders with color coding:
 * - Green: Stock available for reservation
 * - Yellow: Low stock after reservation
 * - Red: Insufficient stock for reservation
 *
 * Features:
 * - Shows reserved vs available quantity
 * - Color-coded status indicator
 * - Tooltip with detailed breakdown
 */

export const InventoryReservationBadge: React.FC<InventoryReservationBadgeProps> = ({
  itemId,
  quantityReserved,
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

  // Calculate availability
  let totalAvailable = 0;
  let totalAllocated = 0;
  let totalOnHand = 0;
  let warehouseCount = 0;

  if (warehouseId) {
    // Get stock for specific warehouse
    const warehouseStock = stockLevels.find((stock) => stock.warehouse_id === warehouseId);
    if (warehouseStock) {
      totalAvailable = warehouseStock.quantity_available;
      totalAllocated = warehouseStock.quantity_allocated;
      totalOnHand = warehouseStock.quantity_on_hand;
      warehouseCount = 1;
    }
  } else {
    // Sum across all warehouses
    stockLevels.forEach((stock) => {
      totalAvailable += stock.quantity_available;
      totalAllocated += stock.quantity_allocated;
      totalOnHand += stock.quantity_on_hand;
      warehouseCount++;
    });
  }

  // Determine status after reservation
  const availableAfterReservation = totalAvailable - quantityReserved;
  const canReserve = totalAvailable >= quantityReserved;
  const willBeLowStock = canReserve && availableAfterReservation < 10; // Arbitrary low stock threshold

  // Get status details
  const getStatusIcon = () => {
    if (!canReserve) return <XCircle className="h-3 w-3 mr-1" />;
    if (willBeLowStock) return <AlertTriangle className="h-3 w-3 mr-1" />;
    return <CheckCircle2 className="h-3 w-3 mr-1" />;
  };

  const getStatusText = () => {
    if (!canReserve) return 'غير كافي';
    if (willBeLowStock) return 'مخزون منخفض';
    return 'متوفر';
  };

  const getStatusVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!canReserve) return 'destructive';
    if (willBeLowStock) return 'secondary';
    return 'default';
  };

  const shortage = !canReserve ? quantityReserved - totalAvailable : 0;

  // Build detailed tooltip content
  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="font-medium border-b pb-1">تفاصيل الحجز</div>
      <div className="grid grid-cols-2 gap-2">
        <span className="text-muted-foreground">الكمية المطلوب حجزها:</span>
        <span className="font-medium">{quantityReserved}</span>

        <span className="text-muted-foreground">الكمية المتاحة حالياً:</span>
        <span className={`font-medium ${canReserve ? 'text-green-600' : 'text-red-600'}`}>
          {totalAvailable}
        </span>

        <span className="text-muted-foreground">الكمية المخصصة:</span>
        <span className="font-medium">{totalAllocated}</span>

        <span className="text-muted-foreground">إجمالي المخزون:</span>
        <span className="font-medium">{totalOnHand}</span>

        {shortage > 0 && (
          <>
            <span className="text-muted-foreground">النقص:</span>
            <span className="font-medium text-red-600">{shortage}</span>
          </>
        )}

        {canReserve && (
          <>
            <span className="text-muted-foreground">المتبقي بعد الحجز:</span>
            <span
              className={`font-medium ${
                willBeLowStock ? 'text-yellow-600' : 'text-green-600'
              }`}
            >
              {availableAfterReservation}
            </span>
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
                <div className="flex gap-2">
                  <span className="font-medium">
                    متوفر: {stock.quantity_available}
                  </span>
                  {stock.quantity_allocated > 0 && (
                    <span className="text-muted-foreground">
                      (محجوز: {stock.quantity_allocated})
                    </span>
                  )}
                </div>
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
        canReserve && !willBeLowStock
          ? 'bg-green-100 text-green-800 hover:bg-green-100 border-green-300'
          : willBeLowStock
          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300'
          : ''
      }`}
    >
      {getStatusIcon()}
      {getStatusText()}
      {showDetails && ` (${totalAvailable}/${quantityReserved})`}
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
