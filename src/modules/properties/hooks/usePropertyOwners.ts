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
        .select(`
          *,
          properties_count:properties(count)
        `)
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

      // حساب عدد العقارات لكل مالك
      const ownersWithPropertiesCount = await Promise.all(
        (data || []).map(async (owner) => {
          const { count } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', owner.id)
            .eq('is_active', true);

          return {
            ...owner,
            properties_count: count || 0
          };
        })
      );

      return ownersWithPropertiesCount;
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
      // Get user company ID from auth context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      // Get user profile to get company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        throw new Error('لم يتم العثور على بيانات الشركة');
      }

      // Validate required fields
      if (!ownerData.full_name || !ownerData.owner_code) {
        throw new Error('الاسم الكامل ورقم المالك مطلوبان');
      }

      // Clean the data and remove empty values
      const cleanedData = Object.fromEntries(
        Object.entries(ownerData).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      // Normalize fields to match DB schema
      const normalized: any = { ...cleanedData };
      // Map legacy bank_account -> bank_account_info JSON
      if (normalized.bank_account) {
        normalized.bank_account_info = { account_number: String(normalized.bank_account) };
        delete normalized.bank_account;
      }

      // Whitelist allowed columns for property_owners
      const allowed = new Set<string>([
        'full_name','full_name_ar','owner_code','civil_id','phone','email','address','address_ar','nationality','commission_percentage','notes','is_active','bank_account_info'
      ]);
      const whitelisted = Object.fromEntries(Object.entries(normalized).filter(([k]) => allowed.has(k)));

      // Add required fields
      const dataToInsert = {
        company_id: profile.company_id,
        created_by: user.id,
        is_active: true,
        ...whitelisted,
      } as any;

      console.log('Creating property owner with data:', dataToInsert);

      const { data, error } = await supabase
        .from('property_owners')
        .insert(dataToInsert as any)
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
      const errorMessage = error.message || 'فشل في إنشاء مالك العقار';
      toast.error(errorMessage);
    },
  });
}

export function useUpdatePropertyOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Sanitize and normalize updates
      const cleaned = Object.fromEntries(Object.entries(updates || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined));
      const normalizedUpdates: any = { ...cleaned };
      if (normalizedUpdates.bank_account) {
        normalizedUpdates.bank_account_info = { account_number: String(normalizedUpdates.bank_account) };
        delete normalizedUpdates.bank_account;
      }
      const allowedUpdate = new Set<string>(['full_name','full_name_ar','owner_code','civil_id','phone','email','address','address_ar','nationality','commission_percentage','notes','is_active','bank_account_info']);
      const safeUpdates = Object.fromEntries(Object.entries(normalizedUpdates).filter(([k]) => allowedUpdate.has(k)));

      const { data, error } = await supabase
        .from('property_owners')
        .update(safeUpdates)
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