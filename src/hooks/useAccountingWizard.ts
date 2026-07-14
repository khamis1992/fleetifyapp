import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useTemplateSystem } from './useTemplateSystem';
import { WizardData } from '@/components/finance/AccountingSystemWizard';
import { toast } from 'sonner';
import { ConflictResolutionStrategy } from '@/components/finance/ConflictResolutionDialog';
import type { Database } from '@/integrations/supabase/types';

type ChartAccountInsert = Database['public']['Tables']['chart_of_accounts']['Insert'];
type BankInsert = Database['public']['Tables']['banks']['Insert'];

export const useAccountingWizard = () => {
  const [progress, setProgress] = useState(0);
  const { companyId } = useUnifiedCompanyAccess();
  const { getAccountsByType } = useTemplateSystem();

  const setupAccountingSystem = useMutation({
    mutationFn: async (data: { wizardData: WizardData; conflictStrategy?: ConflictResolutionStrategy }) => {
      const { wizardData, conflictStrategy } = data;
      if (!companyId) throw new Error('Company ID is required');
      
      setProgress(10);
      
      // 1. Create base chart of accounts
      const businessAccounts = getAccountsByType();
      const allAccounts = [
        ...businessAccounts.assets,
        ...businessAccounts.liabilities,
        ...businessAccounts.revenue,
        ...businessAccounts.expenses,
        ...businessAccounts.equity
      ].filter(account => wizardData.selectedAccounts.includes(account.code));
      
      setProgress(30);
      
      // التعامل مع إنشاء الحسابات بناءً على استراتيجية حل التضارب
      const accountsToCreate = allAccounts.map(account => ({
        company_id: companyId,
        account_code: account.code,
        account_name: account.name_en,
        account_name_ar: account.name_ar,
        account_type: account.account_type,
        balance_type: account.balance_type,
        account_level: account.level,
        is_header: false,
        is_active: true,
        is_system: account.essential,
        description: account.description,
        current_balance: 0
      }));
      
      await handleAccountsConflictResolution(companyId, accountsToCreate, conflictStrategy);
      
      setProgress(60);
      
      // 2. Create bank accounts if specified
      if (wizardData.bankAccounts && wizardData.bankAccounts.length > 0) {
        const banksToCreate = wizardData.bankAccounts.map(bank => ({
          company_id: companyId,
          bank_name: bank.name,
          account_number: bank.accountNumber,
          currency: bank.currency,
          opening_balance: bank.openingBalance,
          current_balance: bank.openingBalance,
          is_active: true,
          is_primary: wizardData.bankAccounts?.indexOf(bank) === 0
        }));
        
        await handleBanksConflictResolution(companyId, banksToCreate, conflictStrategy);
      }
      
      setProgress(80);
      
      // 3. Create detailed accounts (levels 5-6) for customers and suppliers
      await createDetailedAccounts(companyId, wizardData.businessType);
      
      setProgress(90);
      
      // 4. Set up account mappings based on business type
      await setupAccountMappings(companyId, wizardData);
      
      setProgress(100);
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success('تم إعداد النظام المحاسبي بنجاح!');
      setProgress(0);
    },
    onError: (error) => {
      console.error('Error setting up accounting system:', error);
      toast.error('حدث خطأ في إعداد النظام المحاسبي');
      setProgress(0);
    }
  });

  return {
    setupAccountingSystem: setupAccountingSystem.mutateAsync,
    isLoading: setupAccountingSystem.isPending,
    progress
  };
};

// دالة للتعامل مع تضارب الحسابات
async function handleAccountsConflictResolution(
  companyId: string, 
  accountsToCreate: ChartAccountInsert[],
  strategy?: ConflictResolutionStrategy
) {
  if (strategy === ('replace' as ConflictResolutionStrategy)) {
    throw new Error('الاستبدال الكامل لدليل الحسابات معطل لحماية القيود والأرصدة. استخدم الدمج أو التخطي.');
  }

  if (!strategy || strategy === 'skip') {
    // استراتيجية التخطي - استخدام UPSERT
    for (const account of accountsToCreate) {
      const { error } = await supabase
        .from('chart_of_accounts')
        .upsert(account, { 
          onConflict: 'company_id,account_code',
          ignoreDuplicates: true 
        });
      
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    }
  } else if (strategy === 'merge') {
    for (const account of accountsToCreate) {
      const { data: existing, error: lookupError } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_code', account.account_code)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (!existing) {
        const { error } = await supabase.from('chart_of_accounts').insert(account);
        if (error) throw error;
        continue;
      }

      const { current_balance: _currentBalance, company_id: _companyId, account_code: _accountCode, ...safeUpdate } = account;
      const { error } = await supabase
        .from('chart_of_accounts')
        .update(safeUpdate)
        .eq('id', existing.id)
        .eq('company_id', companyId);
      if (error) throw error;
    }
  }
}

// دالة للتعامل مع تضارب البنوك
async function handleBanksConflictResolution(
  companyId: string, 
  banksToCreate: BankInsert[],
  strategy?: ConflictResolutionStrategy
) {
  if (strategy === ('replace' as ConflictResolutionStrategy)) {
    throw new Error('الاستبدال الكامل للحسابات البنكية معطل لحماية الأرصدة والمعاملات. استخدم الدمج أو التخطي.');
  }

  if (!strategy || strategy === 'skip') {
    // استراتيجية التخطي
    for (const bank of banksToCreate) {
      const { error } = await supabase
        .from('banks')
        .upsert(bank, { 
          onConflict: 'company_id,account_number',
          ignoreDuplicates: true 
        });
      
      if (error && !error.message.includes('duplicate')) {
        throw error;
      }
    }
  } else if (strategy === 'merge') {
    for (const bank of banksToCreate) {
      const { data: existing, error: lookupError } = await supabase
        .from('banks')
        .select('id')
        .eq('company_id', companyId)
        .eq('account_number', bank.account_number)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (!existing) {
        const { error } = await supabase.from('banks').insert(bank);
        if (error) throw error;
        continue;
      }

      const {
        current_balance: _currentBalance,
        opening_balance: _openingBalance,
        company_id: _companyId,
        account_number: _accountNumber,
        ...safeUpdate
      } = bank;
      const { error } = await supabase
        .from('banks')
        .update(safeUpdate)
        .eq('id', existing.id)
        .eq('company_id', companyId);
      if (error) throw error;
    }
  }
}

// Helper function to create detailed accounts (levels 5-6)
async function createDetailedAccounts(companyId: string, businessType: string) {
  const detailedAccounts = [];
  
  // Create customer detail accounts
  detailedAccounts.push(
    {
      company_id: companyId,
      account_code: '11211',
      account_name: 'Individual Customers',
      account_name_ar: 'عملاء أفراد',
      account_type: 'assets',
      balance_type: 'debit',
      account_level: 5,
      parent_account_id: null, // Will be linked to accounts receivable
      is_header: true,
      is_active: true,
      description: 'حسابات العملاء الأفراد'
    },
    {
      company_id: companyId,
      account_code: '11212',
      account_name: 'Corporate Customers',
      account_name_ar: 'عملاء شركات',
      account_type: 'assets',
      balance_type: 'debit',
      account_level: 5,
      parent_account_id: null,
      is_header: true,
      is_active: true,
      description: 'حسابات العملاء من الشركات'
    }
  );
  
  // Create supplier detail accounts
  detailedAccounts.push(
    {
      company_id: companyId,
      account_code: '21111',
      account_name: 'Local Suppliers',
      account_name_ar: 'موردون محليون',
      account_type: 'liabilities',
      balance_type: 'credit',
      account_level: 5,
      parent_account_id: null,
      is_header: true,
      is_active: true,
      description: 'حسابات الموردين المحليين'
    },
    {
      company_id: companyId,
      account_code: '21112',
      account_name: 'Foreign Suppliers',
      account_name_ar: 'موردون خارجيون',
      account_type: 'liabilities',
      balance_type: 'credit',
      account_level: 5,
      parent_account_id: null,
      is_header: true,
      is_active: true,
      description: 'حسابات الموردين الخارجيين'
    }
  );
  
  // Business-specific detailed accounts
  if (businessType === 'car_rental') {
    detailedAccounts.push(
      {
        company_id: companyId,
        account_code: '42111',
        account_name: 'Daily Rental Revenue',
        account_name_ar: 'إيرادات التأجير اليومي',
        account_type: 'revenue',
        balance_type: 'credit',
        account_level: 5,
        parent_account_id: null,
        is_header: false,
        is_active: true,
        description: 'إيرادات تأجير المركبات بنظام يومي'
      },
      {
        company_id: companyId,
        account_code: '42112',
        account_name: 'Monthly Rental Revenue',
        account_name_ar: 'إيرادات التأجير الشهري',
        account_type: 'revenue',
        balance_type: 'credit',
        account_level: 5,
        parent_account_id: null,
        is_header: false,
        is_active: true,
        description: 'إيرادات تأجير المركبات بنظام شهري'
      }
    );
  }
  
  const { error } = await supabase
    .from('chart_of_accounts')
    .insert(detailedAccounts);
  
  if (error) throw error;
}

// Helper function to set up account mappings
async function setupAccountMappings(companyId: string, wizardData: WizardData) {
  // Get created accounts to find their IDs
  const { data: accounts, error: fetchError } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name')
    .eq('company_id', companyId);
  
  if (fetchError) throw fetchError;
  if (!accounts) return;
  
  // Find key accounts for mapping
  const findAccount = (code: string) => accounts.find(acc => acc.account_code === code);
  
  const receivablesAccount = findAccount('1211');
  const payablesAccount = findAccount('2111');
  const revenueAccount = findAccount('4111') || findAccount('4211'); // Sales or Rental revenue
  const cashAccount = findAccount('1111');
  const bankAccount = findAccount('1121');
  
  // Update company settings with account mappings
  const accountMappings = {
    default_receivables_account_id: receivablesAccount?.id,
    default_payables_account_id: payablesAccount?.id,
    default_revenue_account_id: revenueAccount?.id,
    default_cash_account_id: cashAccount?.id,
    default_bank_account_id: bankAccount?.id,
    auto_create_customer_accounts: true,
    customer_account_prefix: 'CUST-',
    supplier_account_prefix: 'SUPP-'
  };
  
  // Update company customer account settings
  const { error: updateError } = await supabase
    .from('companies')
    .update({
      customer_account_settings: {
        ...accountMappings,
        enable_account_selection: true,
        auto_create_account: true,
        account_naming_pattern: 'customer_name',
        account_group_by: 'customer_type'
      }
    })
    .eq('id', companyId);
  
  if (updateError) throw updateError;
}
