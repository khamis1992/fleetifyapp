import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface WarehouseTransfer {
  id: string;
  company_id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  transfer_date: string;
  completed_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  from_warehouse_name: string;
  to_warehouse_name: string;
  created_by_name: string;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  item_id: string;
  item_name: string;
  item_code?: string;
  sku?: string;
  quantity_requested: number;
  quantity_shipped?: number;
  quantity_received?: number;
  unit_of_measure: string;
  notes?: string;
}

export interface CreateTransferData {
  from_warehouse_id: string;
  to_warehouse_id: string;
  items: Array<{
    item_id: string;
    quantity_requested: number;
    notes?: string;
  }>;
  transfer_date?: string;
  notes?: string;
}

export const useWarehouseTransfers = (filters?: {
  status?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  date_from?: string;
  date_to?: string;
}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['warehouse-transfers', user?.profile?.company_id, filters],
    queryFn: async (): Promise<WarehouseTransfer[]> => {
      if (!user?.profile?.company_id) return [];

      let query = supabase
        .from('inventory_warehouse_transfers')
        .select(`
          *,
          from_warehouse:inventory_warehouses!from_warehouse_id(warehouse_name),
          to_warehouse:inventory_warehouses!to_warehouse_id(warehouse_name),
          created_by_user:auth.users(name)
        `)
        .eq('company_id', user.profile.company_id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.from_warehouse_id) {
        query = query.eq('from_warehouse_id', filters.from_warehouse_id);
      }
      if (filters?.to_warehouse_id) {
        query = query.eq('to_warehouse_id', filters.to_warehouse_id);
      }
      if (filters?.date_from) {
        query = query.gte('transfer_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('transfer_date', filters.date_to);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(transfer => ({
        ...transfer,
        from_warehouse_name: transfer.from_warehouse?.warehouse_name,
        to_warehouse_name: transfer.to_warehouse?.warehouse_name,
        created_by_name: transfer.created_by_user?.name || 'Unknown',
      })) || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useWarehouseTransfer = (transferId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['warehouse-transfer', transferId],
    queryFn: async (): Promise<{ transfer: WarehouseTransfer; items: TransferItem[] } | null> => {
      if (!user?.profile?.company_id || !transferId) return null;

      // Get transfer details
      const { data: transfer, error: transferError } = await supabase
        .from('inventory_warehouse_transfers')
        .select(`
          *,
          from_warehouse:inventory_warehouses!from_warehouse_id(warehouse_name),
          to_warehouse:inventory_warehouses!to_warehouse_id(warehouse_name),
          created_by_user:auth.users(name)
        `)
        .eq('id', transferId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (transferError) throw transferError;

      // Get transfer items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_warehouse_transfer_items')
        .select(`
          *,
          item:inventory_items(item_name, item_code, sku, unit_of_measure)
        `)
        .eq('transfer_id', transferId);

      if (itemsError) throw itemsError;

      const formattedTransfer: WarehouseTransfer = {
        ...transfer,
        from_warehouse_name: transfer.from_warehouse?.warehouse_name,
        to_warehouse_name: transfer.to_warehouse?.warehouse_name,
        created_by_name: transfer.created_by_user?.name || 'Unknown',
      };

      const formattedItems: TransferItem[] = items?.map(item => ({
        ...item,
        item_name: item.item?.item_name,
        item_code: item.item?.item_code,
        sku: item.item?.sku,
        unit_of_measure: item.item?.unit_of_measure,
      })) || [];

      return {
        transfer: formattedTransfer,
        items: formattedItems,
      };
    },
    enabled: !!user?.profile?.company_id && !!transferId,
  });
};

export const useCreateWarehouseTransfer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transferData: CreateTransferData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      // Generate transfer number
      const { data: maxTransfer } = await supabase
        .from('inventory_warehouse_transfers')
        .select('transfer_number')
        .eq('company_id', user.profile.company_id)
        .like('transfer_number', 'TR-%')
        .order('transfer_number', { ascending: false })
        .limit(1)
        .single();

      const transferNumber = maxTransfer?.transfer_number
        ? `TR-${parseInt(maxTransfer.transfer_number.split('-')[1]) + 1}`
        : 'TR-1001';

      // Create transfer
      const { data: transfer, error: transferError } = await supabase
        .from('inventory_warehouse_transfers')
        .insert({
          company_id: user.profile.company_id,
          transfer_number: transferNumber,
          from_warehouse_id: transferData.from_warehouse_id,
          to_warehouse_id: transferData.to_warehouse_id,
          transfer_date: transferData.transfer_date || new Date().toISOString(),
          status: 'PENDING',
          notes: transferData.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (transferError) throw transferError;

      // Create transfer items
      const transferItems = transferData.items.map(item => ({
        transfer_id: transfer.id,
        item_id: item.item_id,
        quantity_requested: item.quantity_requested,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('inventory_warehouse_transfer_items')
        .insert(transferItems);

      if (itemsError) throw itemsError;

      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      toast({
        title: 'تم إنشاء طلب التحويل',
        description: 'تم إنشاء طلب تحويل المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating warehouse transfer:', error);
      toast({
        title: 'خطأ في إنشاء التحويل',
        description: 'حدث خطأ أثناء إنشاء طلب تحويل المخزون.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTransferStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      transferId,
      status,
      items }: {
      transferId: string;
      status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      items?: Array<{ item_id: string; quantity_shipped?: number; quantity_received?: number }>;
    }) => {
      // Update transfer status
      const { error: transferError } = await supabase
        .from('inventory_warehouse_transfers')
        .update({
          status,
          ...(status === 'COMPLETED' ? { completed_date: new Date().toISOString() } : {})
        })
        .eq('id', transferId);

      if (transferError) throw transferError;

      // Update items if provided and status is IN_PROGRESS or COMPLETED
      if (items && (status === 'IN_PROGRESS' || status === 'COMPLETED')) {
        for (const item of items) {
          const updateData: any = {};

          if (status === 'IN_PROGRESS' && item.quantity_shipped !== undefined) {
            updateData.quantity_shipped = item.quantity_shipped;
          }

          if (status === 'COMPLETED' && item.quantity_received !== undefined) {
            updateData.quantity_received = item.quantity_received;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: itemError } = await supabase
              .from('inventory_warehouse_transfer_items')
              .update(updateData)
              .eq('transfer_id', transferId)
              .eq('item_id', item.item_id);

            if (itemError) throw itemError;
          }
        }
      }

      return transferId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfer'] });
      toast({
        title: 'تم تحديث حالة التحويل',
        description: 'تم تحديث حالة طلب التحويل بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating transfer status:', error);
      toast({
        title: 'خطأ في تحديث الحالة',
        description: 'حدث خطأ أثناء تحديث حالة التحويل.',
        variant: 'destructive',
      });
    },
  });
};

export const useProcessTransferShipment = () => {
  const updateStatus = useUpdateTransferStatus();

  return useMutation({
    mutationFn: async ({
      transferId,
      items }: {
      transferId: string;
      items: Array<{ item_id: string; quantity_shipped: number }>;
    }) => {
      // Create outbound movements for shipped items
      for (const item of items) {
        const { error } = await supabase
          .from('inventory_movements')
          .insert({
            transfer_id: transferId,
            item_id: item.item_id,
            movement_type: 'TRANSFER_OUT',
            quantity: item.quantity_shipped,
            reference_type: 'WAREHOUSE_TRANSFER',
            notes: 'تحويل بين المستودعات',
          });

        if (error) throw error;
      }

      // Update transfer status
      await updateStatus.mutateAsync({
        transferId,
        status: 'IN_PROGRESS',
        items: items.map(item => ({ ...item, quantity_shipped: item.quantity_shipped })),
      });

      return transferId;
    },
  });
};

export const useProcessTransferReceipt = () => {
  const updateStatus = useUpdateTransferStatus();

  return useMutation({
    mutationFn: async ({
      transferId,
      items }: {
      transferId: string;
      items: Array<{ item_id: string; quantity_received: number }>;
    }) => {
      // Get transfer details
      const { data: transfer, error: transferError } = await supabase
        .from('inventory_warehouse_transfers')
        .select('from_warehouse_id, to_warehouse_id')
        .eq('id', transferId)
        .single();

      if (transferError) throw transferError;

      // Create inbound movements for received items
      for (const item of items) {
        const { error } = await supabase
          .from('inventory_movements')
          .insert({
            transfer_id: transferId,
            item_id: item.item_id,
            warehouse_id: transfer.to_warehouse_id,
            movement_type: 'TRANSFER_IN',
            quantity: item.quantity_received,
            from_warehouse_id: transfer.from_warehouse_id,
            to_warehouse_id: transfer.to_warehouse_id,
            reference_type: 'WAREHOUSE_TRANSFER',
            notes: 'استلام تحويل بين المستودعات',
          });

        if (error) throw error;
      }

      // Update transfer status
      await updateStatus.mutateAsync({
        transferId,
        status: 'COMPLETED',
        items: items.map(item => ({ ...item, quantity_received: item.quantity_received })),
      });

      return transferId;
    },
  });
};