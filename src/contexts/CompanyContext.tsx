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
    console.log('🏢 [COMPANY_CONTEXT] User changed:', user?.id, 'roles:', user?.roles);
    if (!user) {
      console.log('🏢 [COMPANY_CONTEXT] No user, resetting browsed company');
      setBrowsedCompanyState(null);
    }
  }, [user]);

  const setBrowsedCompany = (company: Company | null) => {
    console.log('🏢 [COMPANY_CONTEXT] setBrowsedCompany called with:', {
      company: company ? { id: company.id, name: company.name } : null,
      user: user?.id,
      roles: user?.roles,
      isSuperAdmin: user?.roles?.includes('super_admin')
    });

    // Only super admins can browse companies
    if (user?.roles?.includes('super_admin')) {
      console.log('🏢 [COMPANY_CONTEXT] Setting browsed company:', company?.name);
      setBrowsedCompanyState(company);
    } else {
      console.warn('🏢 [COMPANY_CONTEXT] User is not super admin, cannot browse companies');
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