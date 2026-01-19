/**
 * useBrowsingMode Hook
 * 
 * Manages browsing mode state and company browsing.
 * Replaces: browsing mode logic from useUnifiedCompanyAccess
 */

import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';

interface BrowsingModeResult {
  isBrowsingMode: boolean;
  browsedCompany: any | null;
  actualUserCompanyId: string | null;
  canBrowse: boolean;
  effectiveBrowsingMode: boolean;
  isBrowsingOwnCompany: boolean;
  toggleBrowsingMode: () => void;
  setBrowsedCompany: (company: any) => void;
  exitBrowsingMode: () => void;
}

/**
 * Hook لإدارة وضع التصفح
 */
export function useBrowsingMode(): BrowsingModeResult {
  const { user } = useAuth();
  const { browsedCompany, isBrowsingMode, toggleBrowsingMode, setBrowsedCompany } = useCompanyContext();

  // Get user's actual company ID
  const actualUserCompanyId = user?.company?.id || (user as any)?.company_id || null;

  // Check if user can browse (only super_admin)
  const rawRoles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
  const roles = Array.from(
    new Set(rawRoles.map((r: any) => String(r || '').trim().toLowerCase()).filter(Boolean))
  ) as string[];
  const canBrowse = roles.includes('super_admin');

  // Effective browsing mode (only if user can browse)
  const effectiveBrowsingMode = isBrowsingMode && canBrowse;

  // Check if browsing own company
  const isBrowsingOwnCompany = effectiveBrowsingMode && browsedCompany 
    && browsedCompany.id === actualUserCompanyId;

  // Exit browsing mode
  const exitBrowsingMode = useCallback(() => {
    if (toggleBrowsingMode) {
      toggleBrowsingMode();
    }
  }, [toggleBrowsingMode]);

  return {
    isBrowsingMode: effectiveBrowsingMode,
    browsedCompany: effectiveBrowsingMode ? browsedCompany : null,
    actualUserCompanyId,
    canBrowse,
    effectiveBrowsingMode,
    isBrowsingOwnCompany,
    toggleBrowsingMode: toggleBrowsingMode || (() => {}),
    setBrowsedCompany: setBrowsedCompany || (() => {}),
    exitBrowsingMode
  };
}

/**
 * Hook to get effective company ID (considering browsing mode)
 */
export function useEffectiveCompanyId(): string | null {
  const { user } = useAuth();
  const { browsedCompany, isBrowsingMode } = useBrowsingMode();

  if (isBrowsingMode && browsedCompany) {
    return browsedCompany.id;
  }

  return user?.company?.id || (user as any)?.company_id || null;
}

