/**
 * useCompanyAccess Hook
 * 
 * Provides basic company access and identification.
 * Replaces: core company_id logic from useUnifiedCompanyAccess
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';

interface CompanyAccessResult {
  company: any | null;
  companyId: string | null;
  companyName: string | null;
  currency: string | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}

/**
 * Hook للوصول الأساسي للشركة
 */
export function useCompanyAccess(): CompanyAccessResult {
  const { user, loading: authLoading } = useAuth();
  const { browsedCompany, isBrowsingMode } = useCompanyContext();

  // Determine effective company ID
  const userCompanyId = user?.company?.id || (user as any)?.company_id || null;
  
  // Check if user can browse (only super_admin)
  const rawRoles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
  const roles = Array.from(
    new Set(rawRoles.map((r: any) => String(r || '').trim().toLowerCase()).filter(Boolean))
  ) as string[];
  const canBrowse = roles.includes('super_admin');
  
  // Effective browsing mode and company ID
  const effectiveBrowsingMode = isBrowsingMode && canBrowse;
  const effectiveCompanyId = effectiveBrowsingMode && browsedCompany 
    ? browsedCompany.id 
    : userCompanyId;

  // Fetch company data with React Query
  const {
    data: company,
    isLoading: companyLoading,
    error
  } = useQuery({
    queryKey: ['company', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', effectiveCompanyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveCompanyId && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  return {
    company,
    companyId: effectiveCompanyId,
    companyName: company?.name || company?.name_ar || null,
    currency: company?.currency || 'QAR',
    isLoading: authLoading || companyLoading,
    error: error as Error | null,
    isAuthenticated: !!user
  };
}

/**
 * Simplified hook for getting just the company ID
 */
export function useCurrentCompanyId(): string | null {
  const { companyId } = useCompanyAccess();
  return companyId;
}

/**
 * Hook for getting company filter object
 */
export function useCompanyFilter(): { company_id?: string } {
  const { companyId } = useCompanyAccess();
  return companyId ? { company_id: companyId } : {};
}

