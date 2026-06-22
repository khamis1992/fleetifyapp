import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Branch {
  id: string;
  company_id: string;
  branch_code: string;
  branch_name: string;
  branch_name_ar?: string;
  manager_id?: string;
  address?: string;
  address_ar?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBranches = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['branches', user?.profile?.company_id],
    queryFn: async (): Promise<Branch[]> => {
      if (!user?.profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('branch_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateBranch = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (branchData: Omit<Branch, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('branches')
        .insert({
          ...branchData,
          company_id: user.profile.company_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({
        title: "تم إنشاء الفرع بنجاح",
        description: "تم إضافة الفرع الجديد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء الفرع",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateBranch = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Branch> }) => {
      const { data: updated, error } = await supabase
        .from('branches')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast({
        title: "تم تحديث الفرع بنجاح",
        description: "تم حفظ التغييرات",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث الفرع",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};