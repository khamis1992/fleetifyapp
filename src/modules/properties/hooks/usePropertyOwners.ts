import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PropertyOwner } from '../types';
import { toast } from 'sonner';

export function usePropertyOwners(search?: string) {
  return useQuery({
    queryKey: ['property-owners', search],
    queryFn: async () => {
      let query = supabase
        .from('property_owners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,full_name_ar.ilike.%${search}%,owner_code.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching property owners:', error);
        throw error;
      }

      return data as any[];
    },
    enabled: true,
  });
}

export function usePropertyOwner(id?: string) {
  return useQuery({
    queryKey: ['property-owner', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('property_owners')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching property owner:', error);
        throw error;
      }

      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreatePropertyOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ownerData: any) => {
      const { data, error } = await supabase
        .from('property_owners')
        .insert(ownerData)
        .select()
        .single();

      if (error) {
        console.error('Error creating property owner:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-owners'] });
      toast.success('تم إنشاء مالك العقار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating property owner:', error);
      toast.error('فشل في إنشاء مالك العقار');
    },
  });
}

export function useUpdatePropertyOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('property_owners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating property owner:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['property-owners'] });
      queryClient.invalidateQueries({ queryKey: ['property-owner', data.id] });
      toast.success('تم تحديث مالك العقار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating property owner:', error);
      toast.error('فشل في تحديث مالك العقار');
    },
  });
}

export function useDeletePropertyOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // التحقق من وجود عقارات مرتبطة بالمالك
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', id)
        .eq('is_active', true);

      if (propertiesError) {
        throw propertiesError;
      }

      if (properties && properties.length > 0) {
        throw new Error('لا يمكن حذف المالك لوجود عقارات مرتبطة به');
      }

      // حذف ناعم - تغيير is_active إلى false
      const { data, error } = await supabase
        .from('property_owners')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deleting property owner:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-owners'] });
      toast.success('تم حذف مالك العقار بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting property owner:', error);
      toast.error(error.message || 'فشل في حذف مالك العقار');
    },
  });
}

export function usePropertyOwnersOptions() {
  return useQuery({
    queryKey: ['property-owners-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_owners')
        .select('id, full_name, full_name_ar, owner_code')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Error fetching property owners options:', error);
        throw error;
      }

      return data.map(owner => ({
        value: owner.id,
        label: owner.full_name || owner.full_name_ar || owner.owner_code,
        code: owner.owner_code,
      }));
    },
    enabled: true,
  });
}