import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import { CustomerFormData } from "@/types/customer";

interface CreateCustomerWithAccountData extends CustomerFormData {
  createFinancialAccount?: boolean;
  selectedAccountId?: string;
  initialBalance?: number;
  contraAccountId?: string; // Owner's equity or cash account for initial balance contra entry
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

export const useCreateCustomerWithAccount = (targetCompanyId?: string) => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  
  // Use target company ID if provided, otherwise use current company ID
  const effectiveCompanyId = targetCompanyId || companyId;

  return useMutation({
    mutationFn: async (data: CreateCustomerWithAccountData): Promise<CreateCustomerWithAccountResult> => {
      if (!effectiveCompanyId) throw new Error("Company ID is required");

      console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Starting customer creation process', { 
        data, 
        companyId: effectiveCompanyId 
      });

      try {
        // Step 1: Create the customer
        const customerPayload = {
          company_id: effectiveCompanyId,
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

        // Step 2: Handle financial account linking
        if (data.selectedAccountId) {
          console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Linking customer to existing account:', data.selectedAccountId);
          
          // Link the customer to the selected existing account
          const { error: linkError } = await supabase
            .from("customer_accounts")
            .insert({
              company_id: effectiveCompanyId,
              customer_id: customer.id,
              account_id: data.selectedAccountId
            });

          if (linkError) {
            console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Account linking failed:', linkError);
            toast({
              variant: "destructive",
              title: "تحذير",
              description: "تم إنشاء العميل بنجاح لكن فشل في ربط الحساب المحاسبي",
            });
          } else {
            // Get account details
            const { data: accountDetails } = await supabase
              .from("chart_of_accounts")
              .select("id, account_code, account_name")
              .eq("id", data.selectedAccountId)
              .single();

            if (accountDetails) {
              result.financialAccount = accountDetails;
            }
            console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Customer linked to existing account successfully');
          }
        } else if (data.createFinancialAccount) {
          console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Creating financial account for customer');

          const { data: accountId, error: accountError } = await supabase
            .rpc('create_customer_financial_account_fixed', {
              customer_id_param: customer.id,
              company_id_param: effectiveCompanyId
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

              // Validate contra account is provided
              if (!data.contraAccountId) {
                console.warn('[CREATE_CUSTOMER_WITH_ACCOUNT] Contra account not provided for initial balance');
                toast({
                  variant: "destructive",
                  title: "تحذير",
                  description: "يجب تحديد حساب المقابلة (النقدية أو حقوق الملكية) لإنشاء الرصيد الافتتاحي",
                });
              } else {
                try {
                  // Verify contra account exists
                  const { data: contraAccount, error: contraError } = await supabase
                    .from("chart_of_accounts")
                    .select("id, account_code, account_name")
                    .eq("id", data.contraAccountId)
                    .eq("company_id", effectiveCompanyId)
                    .single();

                  if (contraError || !contraAccount) {
                    console.error('[CREATE_CUSTOMER_WITH_ACCOUNT] Contra account not found:', contraError);
                    toast({
                      variant: "destructive",
                      title: "خطأ",
                      description: "حساب المقابلة المحدد غير موجود",
                    });
                  } else {
                    // Generate entry number
                    const entryNumber = `JE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

                    const journalPayload = {
                      company_id: effectiveCompanyId,
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

                    // Create journal entry lines with proper contra account
                    // Debit customer if balance > 0 (customer owes us), Credit contra account
                    // Credit customer if balance < 0 (we owe customer), Debit contra account
                    const journalLines = [
                      {
                        journal_entry_id: journalEntry.id,
                        account_id: accountId as string,
                        line_number: 1,
                        debit_amount: data.initialBalance > 0 ? Math.abs(data.initialBalance) : 0,
                        credit_amount: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                        line_description: `Customer opening balance - ${customer.customer_type === 'individual'
                          ? `${customer.first_name} ${customer.last_name}`.trim()
                          : customer.company_name}`
                      },
                      {
                        journal_entry_id: journalEntry.id,
                        account_id: data.contraAccountId, // Use selected contra account (Owner's Equity or Cash)
                        line_number: 2,
                        debit_amount: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                        credit_amount: data.initialBalance > 0 ? Math.abs(data.initialBalance) : 0,
                        line_description: `Contra entry - ${contraAccount.account_name} (${contraAccount.account_code})`
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

                    console.log('[CREATE_CUSTOMER_WITH_ACCOUNT] Initial balance journal entry created with contra account:', contraAccount.account_name);
                  }
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
      queryClient.invalidateQueries({ queryKey: ["customers", effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["customer-linked-accounts", result.customer.id, effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["available-customer-accounts", effectiveCompanyId] });
      
      if (result.financialAccount) {
        queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", effectiveCompanyId] });
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