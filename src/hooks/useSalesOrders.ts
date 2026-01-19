import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SalesOrder {
  id: string;
  company_id: string;
  quote_id?: string;
  customer_id?: string;
  order_number: string;
  order_date: string;
  delivery_date?: string;
  status: string;
  items: any[];
  total: number;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrderFilters {
  status?: string;
  customer_id?: string;
  quote_id?: string;
  is_active?: boolean;
  search?: string;
}

export const useSalesOrders = (filters?: SalesOrderFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-orders', user?.profile?.company_id, filters],
    queryFn: async (): Promise<SalesOrder[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('sales_orders')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters?.quote_id) {
        query = query.eq('quote_id', filters.quote_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%`);
      }

      query = query.order('order_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales orders:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useSalesOrder = (orderId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-order', orderId],
    queryFn: async (): Promise<SalesOrder | null> => {
      if (!user?.profile?.company_id || !orderId) {
        return null;
      }

      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching sales order:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!orderId,
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderData: Omit<SalesOrder, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('sales_orders')
        .insert({
          ...orderData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sales order:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({
        title: 'تم إنشاء الطلبية',
        description: 'تم إنشاء الطلبية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating sales order:', error);
      toast({
        title: 'خطأ في إنشاء الطلبية',
        description: 'حدث خطأ أثناء إنشاء الطلبية.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSalesOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesOrder> }) => {
      const { data: result, error } = await supabase
        .from('sales_orders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating sales order:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
      toast({
        title: 'تم تحديث الطلبية',
        description: 'تم تحديث الطلبية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating sales order:', error);
      toast({
        title: 'خطأ في تحديث الطلبية',
        description: 'حدث خطأ أثناء تحديث الطلبية.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSalesOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('sales_orders')
        .update({ is_active: false })
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting sales order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({
        title: 'تم حذف الطلبية',
        description: 'تم حذف الطلبية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error deleting sales order:', error);
      toast({
        title: 'خطأ في حذف الطلبية',
        description: 'حدث خطأ أثناء حذف الطلبية.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order'] });
      toast({
        title: 'تم تحديث حالة الطلبية',
        description: 'تم تحديث حالة الطلبية بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast({
        title: 'خطأ في تحديث الحالة',
        description: 'حدث خطأ أثناء تحديث حالة الطلبية.',
        variant: 'destructive',
      });
    },
  });
};

export const useGenerateOrderNumber = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['generate-order-number', user?.profile?.company_id],
    queryFn: async (): Promise<string> => {
      if (!user?.profile?.company_id) {
        return '';
      }

      // Get the latest order number
      const { data, error } = await supabase
        .from('sales_orders')
        .select('order_number')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error generating order number:', error);
        throw error;
      }

      // Generate new order number
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

      if (data && data.length > 0) {
        const lastNumber = data[0].order_number;
        const numberPart = parseInt(lastNumber.split('-').pop() || '0');
        return `SO-${currentYear}${currentMonth}-${String(numberPart + 1).padStart(4, '0')}`;
      }

      return `SO-${currentYear}${currentMonth}-0001`;
    },
    enabled: !!user?.profile?.company_id,
  });
};
