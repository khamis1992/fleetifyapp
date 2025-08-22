import { useState, useEffect } from 'react';
import { AccountTemplate } from './useBusinessTypeAccounts';

export interface CompleteTemplateMetadata {
  name: string;
  name_en: string;
  version: string;
  created_date: string;
  business_type: string;
  total_accounts: number;
  levels_description: Record<string, string>;
}

export interface CompleteTemplateAccount {
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

export interface CompleteTemplate {
  template_metadata: CompleteTemplateMetadata;
  chart_of_accounts: CompleteTemplateAccount[];
}

export interface CompleteTemplateStats {
  total: number;
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  byLevel: Record<number, number>;
  headerAccounts: number;
  entryAccounts: number;
}

export const useCompleteCarRentalTemplate = () => {
  const [template, setTemplate] = useState<CompleteTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/car_rental_complete_template.json');
        if (!response.ok) {
          throw new Error(`فشل في تحميل القالب: ${response.statusText}`);
        }
        
        const data: CompleteTemplate = await response.json();
        
        // التحقق من صحة البيانات
        if (!data.template_metadata || !data.chart_of_accounts || !Array.isArray(data.chart_of_accounts)) {
          throw new Error('بنية القالب غير صحيحة');
        }
        
        console.log('✅ [COMPLETE_TEMPLATE] تم تحميل القالب بنجاح:', {
          total_accounts: data.template_metadata.total_accounts,
          actual_accounts: data.chart_of_accounts.length,
          business_type: data.template_metadata.business_type
        });
        
        setTemplate(data);
      } catch (err) {
        console.error('❌ [COMPLETE_TEMPLATE] خطأ في تحميل القالب:', err);
        setError(err instanceof Error ? err.message : 'خطأ غير معروف');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, []);

  // تحويل إلى تنسيق AccountTemplate للتوافق مع النظام الحالي
  const getAccountTemplates = (): AccountTemplate[] => {
    if (!template) return [];
    
    return template.chart_of_accounts.map((account, index) => ({
      id: `complete_${account.code}`,
      code: account.code,
      nameEn: account.name_en,
      nameAr: account.name_ar,
      accountType: account.account_type,
      accountLevel: account.level,
      balanceType: account.balance_type,
      parentCode: account.parent_code || undefined,
      essential: account.essential,
      recommended: true,
      description: account.description,
      isEntryLevel: account.is_entry,
      isHeader: account.is_header
    }));
  };

  // إحصائيات القالب
  const getTemplateStats = (): CompleteTemplateStats => {
    if (!template) {
      return {
        total: 0,
        assets: 0,
        liabilities: 0,
        equity: 0,
        revenue: 0,
        expenses: 0,
        byLevel: {},
        headerAccounts: 0,
        entryAccounts: 0
      };
    }

    const accounts = template.chart_of_accounts;
    const stats: CompleteTemplateStats = {
      total: accounts.length,
      assets: accounts.filter(a => a.account_type === 'assets').length,
      liabilities: accounts.filter(a => a.account_type === 'liabilities').length,
      equity: accounts.filter(a => a.account_type === 'equity').length,
      revenue: accounts.filter(a => a.account_type === 'revenue').length,
      expenses: accounts.filter(a => a.account_type === 'expenses').length,
      byLevel: {},
      headerAccounts: accounts.filter(a => a.is_header).length,
      entryAccounts: accounts.filter(a => a.is_entry).length
    };

    // إحصائيات حسب المستوى
    accounts.forEach(account => {
      stats.byLevel[account.level] = (stats.byLevel[account.level] || 0) + 1;
    });

    return stats;
  };

  // الحصول على حسابات حسب النوع (للتوافق مع النظام الحالي)
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

    const allAccounts = getAccountTemplates();
    
    return {
      assets: allAccounts.filter(a => a.accountType === 'assets'),
      liabilities: allAccounts.filter(a => a.accountType === 'liabilities'),
      revenue: allAccounts.filter(a => a.accountType === 'revenue'),
      expenses: allAccounts.filter(a => a.accountType === 'expenses'),
      equity: allAccounts.filter(a => a.accountType === 'equity')
    };
  };

  // الحصول على حسابات حسب المستوى
  const getAccountsByLevel = (level: number): CompleteTemplateAccount[] => {
    if (!template) return [];
    return template.chart_of_accounts.filter(account => account.level === level);
  };

  // البحث في الحسابات
  const searchAccounts = (searchTerm: string): CompleteTemplateAccount[] => {
    if (!template || !searchTerm.trim()) return template?.chart_of_accounts || [];
    
    const term = searchTerm.toLowerCase();
    return template.chart_of_accounts.filter(account => 
      account.name_ar.toLowerCase().includes(term) ||
      account.name_en.toLowerCase().includes(term) ||
      account.code.includes(term) ||
      account.description.toLowerCase().includes(term)
    );
  };

  // التحقق من التسلسل الهرمي
  const validateHierarchy = (): { valid: boolean; issues: string[] } => {
    if (!template) return { valid: false, issues: ['القالب غير محمل'] };

    const issues: string[] = [];
    const accounts = template.chart_of_accounts;
    const accountCodes = new Set(accounts.map(a => a.code));

    // التحقق من الحسابات الأب
    accounts.forEach(account => {
      if (account.parent_code && !accountCodes.has(account.parent_code)) {
        issues.push(`الحساب ${account.code} يشير لحساب أب غير موجود: ${account.parent_code}`);
      }
    });

    // التحقق من التسلسل المنطقي للمستويات
    accounts.forEach(account => {
      if (account.parent_code) {
        const parentAccount = accounts.find(a => a.code === account.parent_code);
        if (parentAccount && parentAccount.level >= account.level) {
          issues.push(`الحساب ${account.code} مستواه (${account.level}) يجب أن يكون أكبر من مستوى الحساب الأب (${parentAccount.level})`);
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  };

  return {
    template,
    loading,
    error,
    metadata: template?.template_metadata || null,
    accounts: template?.chart_of_accounts || [],
    getAccountTemplates,
    getTemplateStats,
    getAccountsByType,
    getAccountsByLevel,
    searchAccounts,
    validateHierarchy,
    // إحصائيات سريعة
    totalAccounts: template?.chart_of_accounts.length || 0,
    isReady: !loading && !error && !!template
  };
};