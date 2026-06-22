import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RealTimeStockUpdate {
  item_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_available: number;
  last_movement_at: string;
  movement_type: string;
}

interface UseRealTimeInventoryOptions {
  warehouseId?: string;
  itemId?: string;
  debounceMs?: number;
}

export const useRealTimeInventory = (options: UseRealTimeInventoryOptions = {}) => {
  const { warehouseId, itemId, debounceMs = 1000 } = options;
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscriptionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingUpdatesRef = useRef<Map<string, RealTimeStockUpdate>>(new Map());

  useEffect(() => {
    if (!user?.profile?.company_id) return;

    const channelName = `inventory-updates-${user.profile.company_id}${warehouseId ? `-${warehouseId}` : ''}${itemId ? `-${itemId}` : ''}`;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_stock_levels',
          filter: warehouseId ? `warehouse_id=eq.${warehouseId}` : undefined,
        },
        (payload) => {
          handleStockUpdate(payload.new as RealTimeStockUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_movements',
          filter: itemId ? `item_id=eq.${itemId}` : undefined,
        },
        (payload) => {
          handleMovementUpdate(payload.new as any);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          console.log('Real-time inventory subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          setConnected(false);
          console.error('Real-time inventory subscription failed');
          toast({
            title: 'خطأ في الاتصال',
            description: 'فشل الاتصال بالتحديثات الفورية للمخزون',
            variant: 'destructive',
          });
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setConnected(false);
    };
  }, [user?.profile?.company_id, warehouseId, itemId, toast]);

  const handleStockUpdate = (update: RealTimeStockUpdate) => {
    const key = `${update.item_id}-${update.warehouse_id}`;
    pendingUpdatesRef.current.set(key, update);

    // Debounce updates to prevent UI thrashing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Process all pending updates
      const updates = Array.from(pendingUpdatesRef.current.values());
      pendingUpdatesRef.current.clear();

      // Dispatch custom event with updates
      window.dispatchEvent(new CustomEvent('inventory-stock-updated', {
        detail: updates
      }));

      setLastUpdate(new Date());
    }, debounceMs);
  };

  const handleMovementUpdate = (movement: any) => {
    // Show notification for critical stock movements
    if (movement.quantity > 100 || movement.movement_type === 'SALE') {
      const movementType = movement.movement_type === 'SALE' ? 'بيع' : 'شراء';
      toast({
        title: `حركة مخزون: ${movementType}`,
        description: `تم ${movementType} ${Math.abs(movement.quantity)} وحدة من ${movement.item_name || 'صنف ما'}`,
      });
    }
  };

  // Manual refresh function
  const refreshStock = async (itemId?: string, warehouseId?: string) => {
    if (!user?.profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('inventory_stock_levels')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq(itemId ? 'item_id' : 'true', itemId || 'true')
        .eq(warehouseId ? 'warehouse_id' : 'true', warehouseId || 'true');

      if (error) throw error;

      // Trigger update event
      window.dispatchEvent(new CustomEvent('inventory-stock-refreshed', {
        detail: data
      }));

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing stock data:', error);
      toast({
        title: 'خطأ في التحديث',
        description: 'فشل تحديث بيانات المخزون',
        variant: 'destructive',
      });
    }
  };

  return {
    connected,
    lastUpdate,
    refreshStock,
  };
};

// Hook for listening to real-time updates in components
export const useRealTimeInventoryListener = (callback: (updates: RealTimeStockUpdate[]) => void) => {
  useEffect(() => {
    const handleStockUpdate = (event: CustomEvent) => {
      callback(event.detail);
    };

    const handleStockRefresh = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('inventory-stock-updated', handleStockUpdate as EventListener);
    window.addEventListener('inventory-stock-refreshed', handleStockRefresh as EventListener);

    return () => {
      window.removeEventListener('inventory-stock-updated', handleStockUpdate as EventListener);
      window.removeEventListener('inventory-stock-refreshed', handleStockRefresh as EventListener);
    };
  }, [callback]);
};