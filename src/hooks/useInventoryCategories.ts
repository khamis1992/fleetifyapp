import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryCategory {
  id: string;
  company_id: string;
  category_name: string;
  category_name_ar?: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data for hierarchical display
  parent_category?: {
    category_name: string;
    category_name_ar?: string;
  };
  // Calculated fields
  item_count?: number;
  subcategory_count?: number;
}

export interface CategoryFilters {
  is_active?: boolean;
  parent_category_id?: string | null;
  search?: string;
}

/**
 * Fetch all inventory categories for the current company
 */
export const useInventoryCategories = (filters?: CategoryFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-categories', user?.profile?.company_id, filters],
    queryFn: async (): Promise<InventoryCategory[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_categories')
        .select(`
          *,
          parent_category:inventory_categories!parent_category_id(
            category_name,
            category_name_ar
          )
        `)
        .eq('company_id', user.profile.company_id);

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.parent_category_id !== undefined) {
        if (filters.parent_category_id === null) {
          query = query.is('parent_category_id', null);
        } else {
          query = query.eq('parent_category_id', filters.parent_category_id);
        }
      }

      if (filters?.search) {
        query = query.or(
          `category_name.ilike.%${filters.search}%,category_name_ar.ilike.%${filters.search}%`
        );
      }

      query = query.order('category_name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory categories:', error);
        throw error;
      }

      // Get item counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count: itemCount } = await supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('is_active', true);

          const { count: subcategoryCount } = await supabase
            .from('inventory_categories')
            .select('*', { count: 'exact', head: true })
            .eq('parent_category_id', category.id)
            .eq('is_active', true);

          return {
            ...category,
            item_count: itemCount || 0,
            subcategory_count: subcategoryCount || 0,
          };
        })
      );

      return categoriesWithCounts;
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Fetch a single inventory category by ID
 */
export const useInventoryCategory = (categoryId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-category', categoryId],
    queryFn: async (): Promise<InventoryCategory | null> => {
      if (!user?.profile?.company_id || !categoryId) {
        return null;
      }

      const { data, error } = await supabase
        .from('inventory_categories')
        .select(`
          *,
          parent_category:inventory_categories!parent_category_id(
            category_name,
            category_name_ar
          )
        `)
        .eq('id', categoryId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching inventory category:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!categoryId,
  });
};

/**
 * Get all root categories (categories without parent)
 */
export const useRootCategories = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-root-categories', user?.profile?.company_id],
    queryFn: async (): Promise<InventoryCategory[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .is('parent_category_id', null)
        .eq('is_active', true)
        .order('category_name', { ascending: true });

      if (error) {
        console.error('Error fetching root categories:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Get subcategories for a specific parent category
 */
export const useSubcategories = (parentCategoryId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-subcategories', parentCategoryId],
    queryFn: async (): Promise<InventoryCategory[]> => {
      if (!user?.profile?.company_id || !parentCategoryId) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('parent_category_id', parentCategoryId)
        .eq('is_active', true)
        .order('category_name', { ascending: true });

      if (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id && !!parentCategoryId,
  });
};

/**
 * Create a new inventory category
 */
export const useCreateInventoryCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      categoryData: Omit<InventoryCategory, 'id' | 'created_at' | 'updated_at' | 'company_id'>
    ) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('inventory_categories')
        .insert({
          ...categoryData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating inventory category:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-root-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-subcategories'] });
      toast({
        title: 'تم إضافة التصنيف',
        description: 'تم إنشاء التصنيف بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating inventory category:', error);
      toast({
        title: 'خطأ في إضافة التصنيف',
        description: 'حدث خطأ أثناء إنشاء التصنيف.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Update an existing inventory category
 */
export const useUpdateInventoryCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryCategory> }) => {
      const { data: result, error } = await supabase
        .from('inventory_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating inventory category:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-category'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-root-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-subcategories'] });
      toast({
        title: 'تم تحديث التصنيف',
        description: 'تم تحديث التصنيف بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating inventory category:', error);
      toast({
        title: 'خطأ في تحديث التصنيف',
        description: 'حدث خطأ أثناء تحديث التصنيف.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Delete an inventory category (soft delete by setting is_active to false)
 */
export const useDeleteInventoryCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      // Check if category has items or subcategories
      const { count: itemCount } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      const { count: subcategoryCount } = await supabase
        .from('inventory_categories')
        .select('*', { count: 'exact', head: true })
        .eq('parent_category_id', categoryId);

      if (itemCount && itemCount > 0) {
        throw new Error(`لا يمكن حذف التصنيف لأنه يحتوي على ${itemCount} صنف`);
      }

      if (subcategoryCount && subcategoryCount > 0) {
        throw new Error(`لا يمكن حذف التصنيف لأنه يحتوي على ${subcategoryCount} تصنيف فرعي`);
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('inventory_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting inventory category:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-root-categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-subcategories'] });
      toast({
        title: 'تم حذف التصنيف',
        description: 'تم حذف التصنيف بنجاح.',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting inventory category:', error);
      toast({
        title: 'خطأ في حذف التصنيف',
        description: error.message || 'حدث خطأ أثناء حذف التصنيف.',
        variant: 'destructive',
      });
    },
  });
};

/**
 * Build a hierarchical tree structure from flat category list
 */
export const buildCategoryTree = (categories: InventoryCategory[]): InventoryCategory[] => {
  const categoryMap = new Map<string, InventoryCategory & { children?: InventoryCategory[] }>();
  const rootCategories: InventoryCategory[] = [];

  // First pass: create map of all categories
  categories.forEach((category) => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach((category) => {
    const categoryWithChildren = categoryMap.get(category.id);
    if (!categoryWithChildren) return;

    if (category.parent_category_id) {
      const parent = categoryMap.get(category.parent_category_id);
      if (parent && parent.children) {
        parent.children.push(categoryWithChildren);
      }
    } else {
      rootCategories.push(categoryWithChildren);
    }
  });

  return rootCategories;
};
