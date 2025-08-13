import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";

interface ContractFinancialEntry {
  contractId: string;
  customerAccountId?: string;
  contractAmount: number;
  monthlyAmount: number;
  revenueAccountId?: string;
  entryType: 'accrual' | 'installment' | 'cancellation';
}

interface SuggestedCustomerAccount {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  current_balance: number;
  is_recommended: boolean;
  recommendation_reason: string;
}

// Hook to get suggested customer accounts for a contract
export const useSuggestedCustomerAccounts = (customerId: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["suggested-customer-accounts", customerId, companyId],
    queryFn: async (): Promise<SuggestedCustomerAccount[]> => {
      if (!customerId || !companyId) return [];

      console.log('[CONTRACT_INTEGRATION] Getting suggested accounts for customer:', customerId);

      // Get customer's linked accounts
      const { data: customerAccounts, error: customerError } = await supabase
        .from("customer_accounts")
        .select(`
          id,
          account_id,
          chart_of_accounts (
            id,
            account_code,
            account_name,
            current_balance
          )
        `)
        .eq("customer_id", customerId)
        .eq("company_id", companyId);

      if (customerError) {
        console.error('Error fetching customer accounts:', customerError);
        throw customerError;
      }

      const suggestions: SuggestedCustomerAccount[] = [];

      if (customerAccounts && customerAccounts.length > 0) {
        // Add existing customer accounts as suggestions
        customerAccounts.forEach((ca: any) => {
          if (ca.chart_of_accounts) {
            suggestions.push({
              id: ca.id,
              account_id: ca.account_id,
              account_code: ca.chart_of_accounts.account_code,
              account_name: ca.chart_of_accounts.account_name,
              current_balance: ca.chart_of_accounts.current_balance || 0,
              is_recommended: true,
              recommendation_reason: "حساب العميل الموجود"
            });
          }
        });
      } else {
        // No customer accounts found, suggest creating one
        console.log('[CONTRACT_INTEGRATION] No customer accounts found, suggesting account creation');
      }

      // Always suggest available receivables accounts as alternatives
      const { data: availableAccounts } = await supabase
        .rpc("get_available_customer_accounts", {
          company_id_param: companyId
        });

      if (availableAccounts) {
        availableAccounts
          .filter((acc: any) => acc.is_available)
          .slice(0, 3) // Limit to 3 suggestions
          .forEach((acc: any) => {
            suggestions.push({
              id: `new-${acc.id}`,
              account_id: acc.id,
              account_code: acc.account_code,
              account_name: acc.account_name,
              current_balance: 0,
              is_recommended: false,
              recommendation_reason: "حساب متاح للربط"
            });
          });
      }

      console.log('[CONTRACT_INTEGRATION] Generated suggestions:', suggestions);
      return suggestions;
    },
    enabled: !!customerId && !!companyId,
  });
};

// Hook to create financial entries for contracts
export const useCreateContractFinancialEntry = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ContractFinancialEntry) => {
      if (!companyId) throw new Error("Company ID is required");

      console.log('[CONTRACT_FINANCIAL_ENTRY] Creating entry:', data);

      try {
        // Get or create customer account link
        let customerAccountId = data.customerAccountId;
        
        if (!customerAccountId) {
          throw new Error("Customer account is required for financial entry");
        }

        // Get revenue account mapping
        let revenueAccountId = data.revenueAccountId;
        if (!revenueAccountId) {
          // Try to get default rental revenue account
          const { data: mapping } = await supabase
            .from("account_mappings")
            .select(`
              chart_of_accounts_id,
              default_account_types (type_code)
            `)
            .eq("company_id", companyId)
            .eq("default_account_types.type_code", "RENTAL_REVENUE")
            .eq("is_active", true)
            .single();

          if (mapping) {
            revenueAccountId = mapping.chart_of_accounts_id;
          } else {
            throw new Error("No revenue account mapping found");
          }
        }

        // Create journal entry based on entry type
        const entryNumber = `CNT-${data.entryType.toUpperCase()}-${Date.now().toString().slice(-6)}`;
        let description = "";
        let debitAccountId = "";
        let creditAccountId = "";
        let amount = 0;

        switch (data.entryType) {
          case 'accrual':
            description = `Contract accrual entry - Contract ${data.contractId}`;
            debitAccountId = customerAccountId; // Customer receivable (increase)
            creditAccountId = revenueAccountId; // Revenue (increase)
            amount = data.contractAmount;
            break;
            
          case 'installment':
            description = `Monthly installment accrual - Contract ${data.contractId}`;
            debitAccountId = customerAccountId; // Customer receivable (increase)
            creditAccountId = revenueAccountId; // Revenue (increase)
            amount = data.monthlyAmount;
            break;
            
          case 'cancellation':
            description = `Contract cancellation reversal - Contract ${data.contractId}`;
            debitAccountId = revenueAccountId; // Revenue (decrease)
            creditAccountId = customerAccountId; // Customer receivable (decrease)
            amount = data.contractAmount;
            break;
        }

        // Create journal entry
        const { data: journalEntry, error: journalError } = await supabase
          .from("journal_entries")
          .insert({
            company_id: companyId,
            entry_number: entryNumber,
            entry_date: new Date().toISOString().split('T')[0],
            description,
            reference_number: `CONTRACT-${data.contractId.slice(0, 8)}`,
            status: 'posted'
          })
          .select()
          .single();

        if (journalError) throw journalError;

        // Create journal entry lines
        const journalLines = [
          {
            journal_entry_id: journalEntry.id,
            account_id: debitAccountId,
            line_number: 1,
            debit_amount: amount,
            credit_amount: 0,
            line_description: `${description} - Debit`
          },
          {
            journal_entry_id: journalEntry.id,
            account_id: creditAccountId,
            line_number: 2,
            debit_amount: 0,
            credit_amount: amount,
            line_description: `${description} - Credit`
          }
        ];

        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert(journalLines);

        if (linesError) throw linesError;

        console.log('[CONTRACT_FINANCIAL_ENTRY] Entry created successfully:', journalEntry);
        return journalEntry;

      } catch (error) {
        console.error('[CONTRACT_FINANCIAL_ENTRY] Failed to create entry:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["journal-entries", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      
      toast({
        title: "تم إنشاء القيد المحاسبي",
        description: "تم تسجيل القيد المحاسبي للعقد بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('[CONTRACT_FINANCIAL_ENTRY] Error:', error);
      toast({
        variant: "destructive",
        title: "خطأ في القيد المحاسبي",
        description: error.message || "فشل في إنشاء القيد المحاسبي",
      });
    },
  });
};

// Hook to link contract to customer account
export const useLinkContractToCustomerAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { contractId: string; customerAccountId: string; createFinancialEntry?: boolean }) => {
      if (!companyId) throw new Error("Company ID is required");

      console.log('[LINK_CONTRACT_ACCOUNT] Linking contract to account:', data);

      try {
        // Update contract with account_id
        const { data: contract, error: contractError } = await supabase
          .from("contracts")
          .update({ account_id: data.customerAccountId })
          .eq("id", data.contractId)
          .select()
          .single();

        if (contractError) throw contractError;

        console.log('[LINK_CONTRACT_ACCOUNT] Contract updated successfully');
        return contract;

      } catch (error) {
        console.error('[LINK_CONTRACT_ACCOUNT] Failed to link:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["customer-linked-accounts", companyId] });
      
      toast({
        title: "تم ربط العقد",
        description: "تم ربط العقد بالحساب المحاسبي بنجاح",
      });
    },
    onError: (error: any) => {
      console.error('[LINK_CONTRACT_ACCOUNT] Error:', error);
      toast({
        variant: "destructive",
        title: "خطأ في ربط العقد",
        description: error.message || "فشل في ربط العقد بالحساب",
      });
    },
  });
};