import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SignatureSettings {
  electronic_signature_enabled: boolean;
  require_customer_signature: boolean;
  require_company_signature: boolean;
  signature_provider: string;
  settings: Record<string, any>;
}

// Mock implementation since company_signature_settings table doesn't exist yet
export const useSignatureSettings = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['signature-settings', user?.company],
    queryFn: async () => {
      // Return default mock settings since table doesn't exist yet
      return {
        electronic_signature_enabled: true,
        require_customer_signature: true,
        require_company_signature: true,
        signature_provider: 'internal',
        settings: {}
      } as SignatureSettings;
    },
    enabled: false, // Disabled until table is created
  });
};

export const useUpdateSignatureSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newSettings: Partial<SignatureSettings>) => {
      // Mock implementation
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-settings'] });
      toast({
        title: 'نجح التحديث',
        description: 'تحديث إعدادات التوقيع غير مُفعل حالياً',
      });
    },
    onError: (error: unknown) => {
      console.error('Error updating signature settings:', error);
      toast({
        title: 'خطأ في التحديث',
        description: `خطأ في تحديث إعدادات التوقيع: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useCreateSignatureSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: SignatureSettings) => {
      // Mock implementation
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-settings'] });
      toast({
        title: 'نجح الإنشاء',
        description: 'إنشاء إعدادات التوقيع غير مُفعل حالياً',
      });
    },
    onError: (error: unknown) => {
      console.error('Error creating signature settings:', error);
      toast({
        title: 'خطأ في الإنشاء',
        description: `خطأ في إنشاء إعدادات التوقيع: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};