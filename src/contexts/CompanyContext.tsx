import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Company } from '@/hooks/useCompanies';

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
  const { user } = useAuth();
  const [browsedCompany, setBrowsedCompanyState] = useState<Company | null>(null);

  // Reset browsed company when user changes or is null
  useEffect(() => {
    if (!user) {
      setBrowsedCompanyState(null);
    }
  }, [user]);

  const setBrowsedCompany = (company: Company | null) => {
    // Only super admins can browse companies
    if (user?.roles?.includes('super_admin')) {
      // Check if trying to browse own company
      const userCompanyId = user?.company?.id || (user as any)?.company_id;
      const isBrowsingOwnCompany = company?.id === userCompanyId;
      
      if (isBrowsingOwnCompany) {
        console.log('🏢 [COMPANY_CONTEXT] Warning: Super admin attempting to browse their own company');
      }
      
      setBrowsedCompanyState(company);
    }
  };

  const exitBrowseMode = () => {
    console.log('🏢 [COMPANY_CONTEXT] Exiting browse mode, current company:', browsedCompany?.name);
    setBrowsedCompanyState(null);
  };

  const isBrowsingMode = browsedCompany !== null;
  
  // Log current state changes
  useEffect(() => {
    console.log('🏢 [COMPANY_CONTEXT] State changed:', {
      isBrowsingMode,
      browsedCompany: browsedCompany ? { id: browsedCompany.id, name: browsedCompany.name } : null,
      user: user?.id
    });
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