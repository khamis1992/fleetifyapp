import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/hooks/useCompanyScope";
import { toast } from "sonner";

export interface LegalCorrespondence {
  id: string;
  case_id: string;
  company_id: string;
  correspondence_type: string;
  subject: string;
  content?: string;
  sender_name?: string;
  sender_email?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  communication_date: string;
  direction: string;
  status: string;
  attachments: any[];
  requires_response: boolean;
  response_deadline?: string;
  is_confidential: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalCorrespondenceFormData {
  case_id: string;
  correspondence_type: string;
  subject: string;
  content?: string;
  sender_name?: string;
  sender_email?: string;
  sender_phone?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  communication_date: string;
  direction: string;
  status: string;
  requires_response: boolean;
  response_deadline?: string;
  is_confidential: boolean;
}

interface UseLegalCorrespondenceFilters {
  case_id?: string;
  correspondence_type?: string;
  direction?: string;
  status?: string;
  search?: string;
}

export const useLegalCorrespondence = (filters?: UseLegalCorrespondenceFilters) => {
  const { user } = useAuth();
  const companyFilter = useCompanyFilter();

  return useQuery({
    queryKey: ['legal-correspondence', companyFilter, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      let query = supabase
        .from('legal_case_correspondence')
        .select('*')
        .order('communication_date', { ascending: false });

      // Apply company filter
      if (companyFilter.company_id) {
        query = query.eq('company_id', companyFilter.company_id);
      }

      // Apply filters
      if (filters?.case_id) {
        query = query.eq('case_id', filters.case_id);
      }
      if (filters?.correspondence_type) {
        query = query.eq('correspondence_type', filters.correspondence_type);
      }
      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,content.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,recipient_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LegalCorrespondence[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateLegalCorrespondence = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: LegalCorrespondenceFormData) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('لم يتم العثور على الشركة');

      const { data, error } = await supabase
        .from('legal_case_correspondence')
        .insert({
          ...formData,
          company_id: profile.company_id,
          attachments: [],
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create activity log
      await supabase
        .from('legal_case_activities')
        .insert({
          case_id: formData.case_id,
          company_id: profile.company_id,
          activity_type: 'correspondence_added',
          activity_title: 'تم إضافة مراسلة',
          activity_description: `تم إضافة مراسلة: ${formData.subject}`,
          related_correspondence_id: data.id,
          created_by: user.id,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-correspondence'] });
      queryClient.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('تم إضافة المراسلة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating legal correspondence:', error);
      toast.error('حدث خطأ أثناء إضافة المراسلة');
    },
  });
};

export const useUpdateLegalCorrespondence = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LegalCorrespondenceFormData> }) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      const { data: result, error } = await supabase
        .from('legal_case_correspondence')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-correspondence'] });
      toast.success('تم تحديث المراسلة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating legal correspondence:', error);
      toast.error('حدث خطأ أثناء تحديث المراسلة');
    },
  });
};

export const useDeleteLegalCorrespondence = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (correspondenceId: string) => {
      if (!user?.id) throw new Error('المستخدم غير مصرح له');

      // Get correspondence details for activity log
      const { data: correspondence } = await supabase
        .from('legal_case_correspondence')
        .select('subject, case_id')
        .eq('id', correspondenceId)
        .single();

      // Delete correspondence record
      const { error } = await supabase
        .from('legal_case_correspondence')
        .delete()
        .eq('id', correspondenceId);

      if (error) throw error;

      // Create activity log
      if (correspondence) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.company_id) {
          await supabase
            .from('legal_case_activities')
            .insert({
              case_id: correspondence.case_id,
              company_id: profile.company_id,
              activity_type: 'correspondence_deleted',
              activity_title: 'تم حذف مراسلة',
              activity_description: `تم حذف المراسلة: ${correspondence.subject}`,
              created_by: user.id,
            });
        }
      }

      return correspondenceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-correspondence'] });
      toast.success('تم حذف المراسلة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting legal correspondence:', error);
      toast.error('حدث خطأ أثناء حذف المراسلة');
    },
  });
};