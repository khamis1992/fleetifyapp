import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLegalAIStats = (companyId: string) => {
  return useQuery({
    queryKey: ['legal-ai-stats', companyId],
    queryFn: async () => {
      if (!companyId) {
        return {
          totalConsultations: 0,
          totalDocuments: 0,
          activeCases: 0,
          avgResponseTime: 0,
          costSavings: 0
        };
      }

      // Fetch consultations
      const { data: consultations, error: consultationsError } = await supabase
        .from('legal_consultations')
        .select('*')
        .eq('company_id', companyId);

      if (consultationsError) {
        console.error('Error fetching consultations:', consultationsError);
      }

      // Fetch documents
      const { data: documents, error: documentsError } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('company_id', companyId);

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
      }

      // Fetch legal cases
      const { data: cases, error: casesError } = await supabase
        .from('legal_cases')
        .select('*')
        .eq('company_id', companyId);

      if (casesError) {
        console.error('Error fetching cases:', casesError);
      }

      // Calculate statistics
      const totalConsultations = consultations?.length || 0;
      const totalDocuments = documents?.length || 0;
      const activeCases = cases?.filter(c => c.status === 'active').length || 0;

      // Calculate average response time (in seconds)
      const avgResponseTime = consultations && consultations.length > 0
        ? consultations.reduce((sum, c) => sum + (c.response_time_ms || 0), 0) / consultations.length / 1000
        : 0;

      // Calculate cost savings (assuming $0.02 per consultation without AI vs $0.005 with AI)
      const costSavings = totalConsultations * 0.015;

      return {
        totalConsultations,
        totalDocuments,
        activeCases,
        avgResponseTime,
        costSavings
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};
