import * as React from 'react';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Company } from '@/hooks/useCompanies';
import { useQueryClient } from '@tanstack/react-query';

interface CompanyContextType {
  browsedCompany: Company | null;
  setBrowsedCompany: (company: Company | null) => void;
  isBrowsingMode: boolean;
  exitBrowseMode: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyContextProvider');
  }
  return context;
};

interface CompanyContextProviderProps {
  children: React.ReactNode;
}

export const CompanyContextProvider: React.FC<CompanyContextProviderProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [browsedCompany, setBrowsedCompanyState] = useState<Company | null>(null);
  const queryClient = useQueryClient();
  
  // Track previous companyId to detect changes
  const prevCompanyIdRef = useRef<string | null>(null);
  
  // Extract company_id early for dependency tracking
  const userCompanyId = user?.company?.id || (user as any)?.company_id || null;

  // Reset browsed company when user changes or is null
  useEffect(() => {
    if (!user) {
      setBrowsedCompanyState(null);
    }
  }, [user]);

  // CRITICAL FIX: Centralized query invalidation when company context changes
  // This logic was previously in useUnifiedCompanyAccess hook, causing excessive
  // invalidations when multiple components used the hook.
  useEffect(() => {
    const prevId = prevCompanyIdRef.current;
    const currentId = browsedCompany?.id || userCompanyId;
    
    // Skip if still loading auth
    if (loading) return;
    
    // Only invalidate if we have a valid ID change
    if (currentId && prevId !== currentId) {
      if (import.meta.env.DEV) {
        console.log('🔄 [COMPANY_CONTEXT] Company context changed, invalidating queries...', {
          prevId,
          newId: currentId,
          reason: browsedCompany ? 'browsing' : 'user_company'
        });
      }
      
      // Invalidate all queries to force refetch with the new companyId
      // Using a small delay to ensure state has propagated
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 50);
    }
    
    // CRITICAL FIX: Only update prevCompanyIdRef when we have a valid ID.
    // Don't reset to null during auth transitions — this prevents
    // false "company changed" detection (null → sameId) on tab restore/refresh.
    if (currentId) {
      prevCompanyIdRef.current = currentId;
    }
  }, [userCompanyId, browsedCompany?.id, loading, queryClient]);

  const setBrowsedCompany = (company: Company | null) => {
    // Only super admins can browse companies
    if (!user?.roles?.includes('super_admin')) {
      console.warn('🏢 [COMPANY_CONTEXT] Unauthorized attempt to set browsed company by non-super-admin');
      return;
    }
    
    // Check if trying to browse own company
    const userCompanyId = user?.company?.id || (user as any)?.company_id;
    const isBrowsingOwnCompany = company?.id === userCompanyId;
    
    if (isBrowsingOwnCompany) {
      console.log('🏢 [COMPANY_CONTEXT] Warning: Super admin attempting to browse their own company');
    }
    
    setBrowsedCompanyState(company);
  };

  const exitBrowseMode = () => {
    // Only super admins can exit browse mode
    if (!user?.roles?.includes('super_admin')) {
      console.warn('🏢 [COMPANY_CONTEXT] Unauthorized attempt to exit browse mode by non-super-admin');
      return;
    }
    console.log('🏢 [COMPANY_CONTEXT] Exiting browse mode, current company:', browsedCompany?.name);
    setBrowsedCompanyState(null);
  };

  const isBrowsingMode = browsedCompany !== null;
  
  // Log current state changes (only in dev)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🏢 [COMPANY_CONTEXT] State changed:', {
        isBrowsingMode,
        browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
        user: user?.id
      });
    }
  }, [isBrowsingMode, browsedCompany, user]);

  const value: CompanyContextType = {
    browsedCompany,
    setBrowsedCompany,
    isBrowsingMode,
    exitBrowseMode,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};