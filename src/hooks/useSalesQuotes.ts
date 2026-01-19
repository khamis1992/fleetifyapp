import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SalesQuote {
  id: string;
  company_id: string;
  opportunity_id?: string;
  customer_id?: string;
  quote_number: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  valid_until?: string;
  status: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesQuoteFilters {
  status?: string;
  customer_id?: string;
  opportunity_id?: string;
  is_active?: boolean;
  search?: string;
}

export const useSalesQuotes = (filters?: SalesQuoteFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-quotes', user?.profile?.company_id, filters],
    queryFn: async (): Promise<SalesQuote[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('sales_quotes')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters?.opportunity_id) {
        query = query.eq('opportunity_id', filters.opportunity_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`quote_number.ilike.%${filters.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sales quotes:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useSalesQuote = (quoteId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-quote', quoteId],
    queryFn: async (): Promise<SalesQuote | null> => {
      if (!user?.profile?.company_id || !quoteId) {
        return null;
      }

      const { data, error } = await supabase
        .from('sales_quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching sales quote:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!quoteId,
  });
};

export const useCreateSalesQuote = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteData: Omit<SalesQuote, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('sales_quotes')
        .insert({
          ...quoteData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating sales quote:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-quotes'] });
      toast({
        title: 'تم إنشاء عرض السعر',
        description: 'تم إنشاء عرض السعر بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating sales quote:', error);
      toast({
        title: 'خطأ في إنشاء عرض السعر',
        description: 'حدث خطأ أثناء إنشاء عرض السعر.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSalesQuote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesQuote> }) => {
      const { data: result, error } = await supabase
        .from('sales_quotes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating sales quote:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['sales-quote'] });
      toast({
        title: 'تم تحديث عرض السعر',
        description: 'تم تحديث عرض السعر بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating sales quote:', error);
      toast({
        title: 'خطأ في تحديث عرض السعر',
        description: 'حدث خطأ أثناء تحديث عرض السعر.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSalesQuote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('sales_quotes')
        .update({ is_active: false })
        .eq('id', quoteId);

      if (error) {
        console.error('Error deleting sales quote:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-quotes'] });
      toast({
        title: 'تم حذف عرض السعر',
        description: 'تم حذف عرض السعر بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error deleting sales quote:', error);
      toast({
        title: 'خطأ في حذف عرض السعر',
        description: 'حدث خطأ أثناء حذف عرض السعر.',
        variant: 'destructive',
      });
    },
  });
};

export const useGenerateQuoteNumber = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['generate-quote-number', user?.profile?.company_id],
    queryFn: async (): Promise<string> => {
      if (!user?.profile?.company_id) {
        return '';
      }

      // Get the latest quote number
      const { data, error } = await supabase
        .from('sales_quotes')
        .select('quote_number')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error generating quote number:', error);
        throw error;
      }

      // Generate new quote number
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

      if (data && data.length > 0) {
        const lastNumber = data[0].quote_number;
        const numberPart = parseInt(lastNumber.split('-').pop() || '0');
        return `QT-${currentYear}${currentMonth}-${String(numberPart + 1).padStart(4, '0')}`;
      }

      return `QT-${currentYear}${currentMonth}-0001`;
    },
    enabled: !!user?.profile?.company_id,
  });
};
