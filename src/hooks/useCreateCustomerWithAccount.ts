import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyScope } from "./useCompanyScope";
import { useToast } from "./use-toast";
import { CustomerFormData } from "@/types/customer";

interface CreateCustomerWithAccountData extends CustomerFormData {
  createFinancialAccount?: boolean;
  initialBalance?: number;
}

interface CreateCustomerWithAccountResult {
  customer: any;
  financialAccount?: {
    id: string;
    account_code: string;
    account_name: string;
  };
  journalEntry?: {
    id: string;
    entry_number: string;
  };
}

export const useCreateCustomerWithAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompanyScope();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateCustomerWithAccountData): Promise<CreateCustomerWithAccountResult> => {
      if (!companyId) throw new Error("Company ID is required");

      console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Starting customer creation process', { 
        data, 
        companyId 
      });

      try {
        // Step 1: Create the customer
        const customerPayload = {
          company_id: companyId,
          customer_type: data.customer_type,
          first_name: data.first_name,
          last_name: data.last_name,
          first_name_ar: data.first_name_ar,
          last_name_ar: data.last_name_ar,
          company_name: data.company_name,
          company_name_ar: data.company_name_ar,
          email: data.email,
          phone: data.phone,
          alternative_phone: data.alternative_phone,
          national_id: data.national_id,
          passport_number: data.passport_number,
          license_number: data.license_number,
          license_expiry: data.license_expiry,
          address: data.address,
          address_ar: data.address_ar,
          city: data.city,
          country: data.country,
          date_of_birth: data.date_of_birth,
          credit_limit: data.credit_limit,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_phone: data.emergency_contact_phone,
          notes: data.notes,
          is_active: true,
        };

        console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Creating customer with payload:', customerPayload);

        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .insert(customerPayload)
          .select()
          .single();

        if (customerError) {
          console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Customer creation failed:', customerError);
          throw customerError;
        }

        console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Customer created successfully:', customer);

        const result: CreateCustomerWithAccountResult = { customer };

        // Step 2: Create financial account if requested
        if (data.createFinancialAccount) {
          console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Creating financial account for customer');

          const { data: accountId, error: accountError } = await supabase
            .rpc('create_customer_financial_account_fixed', {
              customer_id_param: customer.id,
              company_id_param: companyId
            });

          if (accountError) {
            console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Financial account creation failed:', accountError);
            // Don't throw error, just log it - customer is already created
            toast({
              variant: "destructive",
              title: "تحذير",
              description: "تم إنشاء العميل بنجاح لكن فشل في إنشاء الحساب المحاسبي",
            });
          } else if (accountId) {
            console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Financial account created:', accountId);

            // Get account details
            const { data: accountDetails } = await supabase
              .from("chart_of_accounts")
              .select("id, account_code, account_name")
              .eq("id", accountId as string)
              .single();

            if (accountDetails) {
              result.financialAccount = accountDetails;
            }

            // Step 3: Create initial balance journal entry if specified
            if (data.initialBalance && data.initialBalance !== 0) {
              console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Creating initial balance entry');

              try {
                // Generate entry number
                const entryNumber = `JE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
                
                const journalPayload = {
                  company_id: companyId,
                  entry_date: new Date().toISOString().split('T')[0],
                  entry_number: entryNumber,
                  description: `Opening balance for customer: ${customer.customer_type === 'individual' 
                    ? `${customer.first_name} ${customer.last_name}`.trim() 
                    : customer.company_name}`,
                  reference_number: `CUST-OPENING-${customer.id.slice(0, 8)}`,
                  status: 'posted',
                  created_by: customer.created_by
                };

                const { data: journalEntry, error: journalError } = await supabase
                  .from("journal_entries")
                  .insert(journalPayload)
                  .select()
                  .single();

                if (journalError) throw journalError;

                // Create journal entry lines
                const journalLines = [
                  {
                    journal_entry_id: journalEntry.id,
                    account_id: accountId as string,
                    line_number: 1,
                    debit_amount: data.initialBalance > 0 ? Math.abs(data.initialBalance) : 0,
                    credit_amount: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                    line_description: "Customer opening balance"
                  },
                  {
                    journal_entry_id: journalEntry.id,
                    account_id: accountId as string, // TODO: This should be the owner's equity or cash account
                    line_number: 2,
                    debit_amount: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                    credit_amount: data.initialBalance > 0 ? Math.abs(data.initialBalance) : 0,
                    line_description: "Contra entry for customer opening balance"
                  }
                ];

                const { error: linesError } = await supabase
                  .from("journal_entry_lines")
                  .insert(journalLines);

                if (linesError) throw linesError;

                result.journalEntry = {
                  id: journalEntry.id,
                  entry_number: journalEntry.entry_number
                };

                console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Initial balance journal entry created');
              } catch (balanceError) {
                console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Initial balance entry failed:', balanceError);
                toast({
                  variant: "destructive",
                  title: "تحذير",
                  description: "تم إنشاء العميل والحساب لكن فشل في إنشاء الرصيد الافتتاحي",
                });
              }
            }
          }
        }

        console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Process completed successfully:', result);
        return result;

      } catch (error) {
        console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Process failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["customers", companyId] });
      queryClient.invalidateQueries({ queryKey: ["customer-linked-accounts", result.customer.id, companyId] });
      queryClient.invalidateQueries({ queryKey: ["available-customer-accounts", companyId] });
      
      if (result.financialAccount) {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      }

      const successMessage = result.financialAccount 
        ? "تم إنشاء العميل والحساب المحاسبي بنجاح"
        : "تم إنشاء العميل بنجاح";

      toast({
        title: "نجح العملية",
        description: successMessage,
      });
    },
    onError: (error: any) => {
      console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Mutation error:', error);
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء العميل",
        description: error.message || "حدث خطأ غير متوقع",
      });
    },
  });
};