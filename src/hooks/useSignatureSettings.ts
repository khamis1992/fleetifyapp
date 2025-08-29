import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SignatureSettings {
  electronic_signature_enabled: boolean;
  require_customer_signature: boolean;
  require_company_signature: boolean;
  signature_provider: string;
  settings: Record<string, any>;
}

export const useSignatureSettings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['signature-settings', user?.company],
    queryFn: async () => {
      if (!user?.company) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('company_signature_settings')
        .select('*')
        .eq('company_id', user.company.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Return default settings if none found
      if (!data) {
        return {
          electronic_signature_enabled: true,
          require_customer_signature: true,
          require_company_signature: true,
          signature_provider: 'internal',
          settings: {}
        } as SignatureSettings;
      }
      
      return {
        electronic_signature_enabled: data.electronic_signature_enabled,
        require_customer_signature: data.require_customer_signature,
        require_company_signature: data.require_company_signature,
        signature_provider: data.signature_provider,
        settings: data.settings
      } as SignatureSettings;
    },
    enabled: !!user?.company,
  });
};

export const useUpdateSignatureSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<SignatureSettings>) => {
      if (!user?.company) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('company_signature_settings')
        .upsert({
          company_id: user.company.id,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-settings'] });
      toast({
        title: "تم تحديث إعدادات التوقيع",
        description: "تم حفظ إعدادات التوقيع الإلكتروني بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في تحديث الإعدادات",
        description: error.message || "فشل في تحديث إعدادات التوقيع الإلكتروني",
        variant: "destructive",
      });
    },
  });
};