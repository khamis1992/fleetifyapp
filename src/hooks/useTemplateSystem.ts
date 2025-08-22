import { useState, useEffect } from 'react';

export interface AccountTemplate {
  code: string;
  name_ar: string;
  name_en: string;
  account_type: 'assets' | 'liabilities' | 'revenue' | 'expenses' | 'equity';
  level: number;
  balance_type: 'debit' | 'credit';
  parent_code: string | null;
  is_header: boolean;
  is_entry: boolean;
  essential: boolean;
  description: string;
}

export interface TemplateMetadata {
  name: string;
  name_en: string;
  version: string;
  created_date: string;
  business_type: string;
  total_accounts: number;
  levels_description: Record<string, string>;
}

export interface CompleteTemplate {
  template_metadata: TemplateMetadata;
  chart_of_accounts: AccountTemplate[];
}

export interface TemplateStats {
  totalAccounts: number;
  accountsByType: Record<string, number>;
  accountsByLevel: Record<number, number>;
  essentialAccounts: number;
  entryLevelAccounts: number;
}

export const useTemplateSystem = () => {
  const [template, setTemplate] = useState<CompleteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔄 Loading car rental template from JSON...');
        // Add cache-busting parameter to ensure fresh load
        const timestamp = new Date().getTime();
        const response = await fetch(`/car_rental_complete_template.json?v=${timestamp}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Raw template data received:', {
          hasMetadata: !!data.template_metadata,
          hasAccounts: !!data.chart_of_accounts,
          accountsType: Array.isArray(data.chart_of_accounts) ? 'array' : typeof data.chart_of_accounts,
          accountsLength: Array.isArray(data.chart_of_accounts) ? data.chart_of_accounts.length : 'N/A',
          metadataCount: data.template_metadata?.total_accounts
        });
        
        // Validate template structure
        if (!data.template_metadata || !data.chart_of_accounts) {
          throw new Error('Invalid template structure - missing metadata or accounts');
        }
        
        if (!Array.isArray(data.chart_of_accounts)) {
          throw new Error('Chart of accounts must be an array');
        }

        // Detailed validation
        const accounts = data.chart_of_accounts;
        const actualCount = accounts.length;
        const expectedCount = data.template_metadata.total_accounts;
        
        console.log(`📈 Template validation:`, {
          expectedAccounts: expectedCount,
          actualAccounts: actualCount,
          difference: actualCount - expectedCount,
          match: actualCount === expectedCount
        });

        if (actualCount !== expectedCount) {
          console.warn(`⚠️ Account count mismatch: expected ${expectedCount}, got ${actualCount}`);
          // Update metadata to reflect actual count
          data.template_metadata.total_accounts = actualCount;
        }

        console.log(`✅ Template loaded successfully: ${actualCount} accounts validated`);
        setTemplate(data);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error loading template';
        console.error('❌ Template loading failed:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, []);

  const getTemplateStats = (): TemplateStats => {
    if (!template) {
      console.log('📊 No template available for stats');
      return {
        totalAccounts: 0,
        accountsByType: {},
        accountsByLevel: {},
        essentialAccounts: 0,
        entryLevelAccounts: 0
      };
    }

    console.log('📊 Calculating template statistics...');
    const accounts = template.chart_of_accounts;
    
    const stats: TemplateStats = {
      totalAccounts: accounts.length,
      accountsByType: {},
      accountsByLevel: {},
      essentialAccounts: 0,
      entryLevelAccounts: 0
    };

    accounts.forEach(account => {
      // Count by type
      const type = account.account_type || 'unknown';
      stats.accountsByType[type] = (stats.accountsByType[type] || 0) + 1;
      
      // Count by level
      const level = account.level || 1;
      stats.accountsByLevel[level] = (stats.accountsByLevel[level] || 0) + 1;
      
      // Count essential accounts
      if (account.essential) {
        stats.essentialAccounts++;
      }
      
      // Count entry level accounts (levels 5 and 6 or marked as entry)
      if (account.is_entry || level >= 5) {
        stats.entryLevelAccounts++;
      }
    });

    console.log('📊 Calculated stats:', {
      totalAccounts: stats.totalAccounts,
      accountsByType: stats.accountsByType,
      accountsByLevel: stats.accountsByLevel,
      essentialAccounts: stats.essentialAccounts,
      entryLevelAccounts: stats.entryLevelAccounts
    });

    return stats;
  };

  const getAccountsByType = () => {
    if (!template) {
      return {
        assets: [],
        liabilities: [],
        revenue: [],
        expenses: [],
        equity: []
      };
    }

    return {
      assets: template.chart_of_accounts.filter(acc => acc.account_type === 'assets'),
      liabilities: template.chart_of_accounts.filter(acc => acc.account_type === 'liabilities'),
      revenue: template.chart_of_accounts.filter(acc => acc.account_type === 'revenue'),
      expenses: template.chart_of_accounts.filter(acc => acc.account_type === 'expenses'),
      equity: template.chart_of_accounts.filter(acc => acc.account_type === 'equity')
    };
  };

  const getAccountsByLevel = (level: number): AccountTemplate[] => {
    if (!template) return [];
    return template.chart_of_accounts.filter(acc => acc.level === level);
  };

  const searchAccounts = (searchTerm: string): AccountTemplate[] => {
    if (!template || !searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return template.chart_of_accounts.filter(acc => 
      acc.name_ar.toLowerCase().includes(term) ||
      acc.name_en.toLowerCase().includes(term) ||
      acc.code.includes(term) ||
      acc.description.toLowerCase().includes(term)
    );
  };

  const validateHierarchy = () => {
    if (!template) return { isValid: true, issues: [] };
    
    const issues: string[] = [];
    const codeMap = new Map<string, AccountTemplate>();
    
    // Build code map
    template.chart_of_accounts.forEach(acc => {
      if (codeMap.has(acc.code)) {
        issues.push(`Duplicate code: ${acc.code}`);
      }
      codeMap.set(acc.code, acc);
    });
    
    // Check parent references
    template.chart_of_accounts.forEach(acc => {
      if (acc.parent_code && !codeMap.has(acc.parent_code)) {
        issues.push(`Invalid parent code ${acc.parent_code} for account ${acc.code}`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  const getAllAccounts = (): AccountTemplate[] => {
    return template?.chart_of_accounts || [];
  };

  const getMetadata = (): TemplateMetadata | null => {
    return template?.template_metadata || null;
  };

  return {
    template,
    loading,
    error,
    isReady: !loading && !error && template !== null,
    totalAccounts: template?.template_metadata.total_accounts || 0,
    
    // Data access methods
    getAllAccounts,
    getTemplateStats,
    getAccountsByType,
    getAccountsByLevel,
    searchAccounts,
    validateHierarchy,
    getMetadata
  };
};