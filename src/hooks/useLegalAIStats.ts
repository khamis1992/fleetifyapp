import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLegalAIStats = (companyId: string) => {
  return useQuery({
    queryKey: ['legal-ai-stats', companyId],
    queryFn: async () => {
      const defaultStats = {
        totalConsultations: 0,
        totalDocuments: 0,
        activeCases: 0,
        avgResponseTime: 0,
        costSavings: 0
      };

      if (!companyId) {
        return defaultStats;
      }

      try {
        // Fetch consultations - handle table not existing gracefully
        let consultations: any[] = [];
        try {
          const { data, error } = await supabase
            .from('legal_consultations')
            .select('response_time_ms')
            .eq('company_id', companyId);
          if (!error && data) consultations = data;
        } catch (e) {
          console.warn('legal_consultations table may not exist:', e);
        }

        // Fetch documents - handle table not existing gracefully
        let documents: any[] = [];
        try {
          const { data, error } = await supabase
            .from('legal_documents')
            .select('id')
            .eq('company_id', companyId);
          if (!error && data) documents = data;
        } catch (e) {
          console.warn('legal_documents table may not exist:', e);
        }

        // Fetch legal cases - this table should exist
        let cases: any[] = [];
        try {
          const { data, error } = await supabase
            .from('legal_cases')
            .select('id, status')
            .eq('company_id', companyId);
          if (!error && data) cases = data;
        } catch (e) {
          console.warn('Error fetching legal_cases:', e);
        }

        // Calculate statistics
        const totalConsultations = consultations.length;
        const totalDocuments = documents.length;
        const activeCases = cases.filter(c => c.status === 'active' || c.status === 'open').length;

        // Calculate average response time (in seconds)
        const avgResponseTime = consultations.length > 0
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
      } catch (error) {
        console.error('Error fetching legal AI stats:', error);
        return defaultStats;
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1,
    retryDelay: 1000,
  });
};
