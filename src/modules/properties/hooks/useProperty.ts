import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '../types';
import { toast } from 'sonner';

export function useProperty(id?: string) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching property:', error);
        throw error;
      }

      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyData: any) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(propertyData)
        .select()
        .single();

      if (error) {
        console.error('Error creating property:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-stats'] });
      toast.success('تم إنشاء العقار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating property:', error);
      toast.error('فشل في إنشاء العقار');
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating property:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', data.id] });
      queryClient.invalidateQueries({ queryKey: ['properties-stats'] });
      toast.success('تم تحديث العقار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating property:', error);
      toast.error('فشل في تحديث العقار');
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // حذف ناعم - تغيير is_active إلى false
      const { data, error } = await supabase
        .from('properties')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deleting property:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-stats'] });
      toast.success('تم حذف العقار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting property:', error);
      toast.error('فشل في حذف العقار');
    },
  });
}

export function usePropertysByOwner(ownerId?: string) {
  return useQuery({
    queryKey: ['properties', 'by-owner', ownerId],
    queryFn: async () => {
      if (!ownerId) return [];

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties by owner:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: !!ownerId,
  });
}