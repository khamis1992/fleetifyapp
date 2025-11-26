/**
 * Purchase Order Financial Integration
 * Handles automatic journal entry creation for purchase orders and vendor payments
 * 
 * Journal Entry Flow:
 * 1. When PO is received → Create AP entry (Debit: Inventory/Purchases, Credit: AP)
 * 2. When vendor is paid → Create payment entry (Debit: AP, Credit: Cash/Bank)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '../useUnifiedCompanyAccess';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface POJournalEntryData {
  purchase_order_id: string;
  entry_date: string;
  description?: string;
}

export interface VendorPaymentJournalData {
  vendor_payment_id: string;
  entry_date: string;
  description?: string;
}

export interface PurchaseAccountMapping {
  purchases_account_id: string;
  inventory_account_id: string;
  accounts_payable_id: string;
  cash_account_id: string;
  bank_account_id: string;
}

// Default account type codes for purchase orders
const ACCOUNT_TYPE_CODES = {
  PURCHASES: 'purchases',
  INVENTORY: 'inventory',
  ACCOUNTS_PAYABLE: 'accounts_payable',
  CASH: 'cash',
  BANK: 'bank',
};

// ============================================================================
// Get Purchase Account Mappings
// ============================================================================

export const usePurchaseAccountMappings = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['purchase-account-mappings', companyId],
    queryFn: async (): Promise<PurchaseAccountMapping | null> => {
      if (!companyId) return null;

      // Get account mappings for purchase-related accounts
      const { data: mappings, error } = await supabase
        .from('account_mappings')
        .select(`
          chart_of_accounts_id,
          default_account_type:default_account_types(type_code)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('default_account_type.type_code', [
          ACCOUNT_TYPE_CODES.PURCHASES,
          ACCOUNT_TYPE_CODES.INVENTORY,
          ACCOUNT_TYPE_CODES.ACCOUNTS_PAYABLE,
          ACCOUNT_TYPE_CODES.CASH,
          ACCOUNT_TYPE_CODES.BANK,
        ]);

      if (error) {
        console.error('Error fetching purchase account mappings:', error);
        return null;
      }

      // Map the results
      const result: Partial<PurchaseAccountMapping> = {};
      
      mappings?.forEach((mapping: any) => {
        const typeCode = mapping.default_account_type?.type_code;
        if (typeCode === ACCOUNT_TYPE_CODES.PURCHASES) {
          result.purchases_account_id = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.INVENTORY) {
          result.inventory_account_id = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.ACCOUNTS_PAYABLE) {
          result.accounts_payable_id = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.CASH) {
          result.cash_account_id = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.BANK) {
          result.bank_account_id = mapping.chart_of_accounts_id;
        }
      });

      // If no mappings found, try to get default accounts by code pattern
      if (!result.purchases_account_id || !result.accounts_payable_id) {
        const { data: defaultAccounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, account_name')
          .eq('company_id', companyId)
          .eq('is_header', false)
          .gte('account_level', 3)
          .or('account_code.like.51%,account_code.like.21%,account_code.like.11%');

        defaultAccounts?.forEach((acc: any) => {
          // Purchases account (5xxxx)
          if (acc.account_code.startsWith('51') && !result.purchases_account_id) {
            result.purchases_account_id = acc.id;
          }
          // Accounts Payable (2xxxx)
          if (acc.account_code.startsWith('21') && !result.accounts_payable_id) {
            result.accounts_payable_id = acc.id;
          }
          // Cash (111xx)
          if (acc.account_code.startsWith('111') && !result.cash_account_id) {
            result.cash_account_id = acc.id;
          }
          // Bank (1115x)
          if (acc.account_code.startsWith('1115') && !result.bank_account_id) {
            result.bank_account_id = acc.id;
          }
        });
      }

      return result as PurchaseAccountMapping;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// Create Journal Entry for PO Receipt
// ============================================================================

export const useCreatePOReceiptJournalEntry = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: POJournalEntryData) => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      // 1. Get Purchase Order details
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(vendor_name, vendor_name_ar),
          purchase_order_items(*)
        `)
        .eq('id', data.purchase_order_id)
        .eq('company_id', companyId)
        .single();

      if (poError) throw poError;
      if (!po) throw new Error('أمر الشراء غير موجود');

      // Check if journal entry already exists
      const { data: existingEntry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'PURCHASE_ORDER')
        .eq('reference_id', po.id)
        .maybeSingle();

      if (existingEntry) {
        throw new Error('تم إنشاء القيد المحاسبي لهذا الأمر مسبقاً');
      }

      // 2. Get account mappings
      const { data: mappings } = await supabase
        .from('account_mappings')
        .select(`
          chart_of_accounts_id,
          default_account_type:default_account_types(type_code)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      let purchasesAccountId: string | null = null;
      let apAccountId: string | null = null;

      mappings?.forEach((mapping: any) => {
        const typeCode = mapping.default_account_type?.type_code;
        if (typeCode === ACCOUNT_TYPE_CODES.PURCHASES || typeCode === ACCOUNT_TYPE_CODES.INVENTORY) {
          purchasesAccountId = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.ACCOUNTS_PAYABLE) {
          apAccountId = mapping.chart_of_accounts_id;
        }
      });

      // Fallback: Get accounts by code pattern
      if (!purchasesAccountId || !apAccountId) {
        const { data: defaultAccounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code')
          .eq('company_id', companyId)
          .eq('is_header', false)
          .gte('account_level', 3);

        defaultAccounts?.forEach((acc: any) => {
          if (acc.account_code.startsWith('51') && !purchasesAccountId) {
            purchasesAccountId = acc.id;
          }
          if (acc.account_code.startsWith('21') && !apAccountId) {
            apAccountId = acc.id;
          }
        });
      }

      if (!purchasesAccountId) throw new Error('حساب المشتريات غير معين');
      if (!apAccountId) throw new Error('حساب الذمم الدائنة غير معين');

      // 3. Generate entry number
      const { data: entryNumber, error: numError } = await supabase
        .rpc('generate_journal_entry_number', { company_id_param: companyId });

      if (numError) {
        // Fallback entry number
        const timestamp = Date.now().toString().slice(-6);
        const fallbackNumber = `JE-PO-${timestamp}`;
        console.warn('Using fallback entry number:', fallbackNumber);
      }

      const finalEntryNumber = entryNumber || `JE-PO-${Date.now().toString().slice(-6)}`;

      // 4. Create journal entry
      const vendorName = po.vendor?.vendor_name_ar || po.vendor?.vendor_name || 'مورد';
      const entryDescription = data.description || 
        `استلام أمر شراء رقم ${po.order_number} - ${vendorName}`;

      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: finalEntryNumber,
          entry_date: data.entry_date,
          description: entryDescription,
          reference_type: 'PURCHASE_ORDER',
          reference_id: po.id,
          total_debit: po.total_amount,
          total_credit: po.total_amount,
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // 5. Create journal entry lines
      const lines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: purchasesAccountId,
          line_description: `مشتريات - أمر شراء ${po.order_number}`,
          debit_amount: po.total_amount,
          credit_amount: 0,
          line_number: 1,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: apAccountId,
          line_description: `ذمم دائنة - ${vendorName}`,
          debit_amount: 0,
          credit_amount: po.total_amount,
          line_number: 2,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      // Journal entry is linked via reference_type and reference_id fields
      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      toast.success('تم إنشاء القيد المحاسبي لاستلام أمر الشراء بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error creating PO receipt journal entry:', error);
      toast.error(`خطأ في إنشاء القيد المحاسبي: ${error.message}`);
    },
  });
};

// ============================================================================
// Create Journal Entry for Vendor Payment
// ============================================================================

export const useCreateVendorPaymentJournalEntry = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: VendorPaymentJournalData) => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      // 1. Get Vendor Payment details
      const { data: payment, error: paymentError } = await supabase
        .from('vendor_payments')
        .select(`
          *,
          vendor:vendors(vendor_name, vendor_name_ar),
          bank:banks(bank_name),
          purchase_order:purchase_orders(order_number)
        `)
        .eq('id', data.vendor_payment_id)
        .eq('company_id', companyId)
        .single();

      if (paymentError) throw paymentError;
      if (!payment) throw new Error('دفعة المورد غير موجودة');

      // Check if journal entry already exists
      if (payment.journal_entry_id) {
        throw new Error('تم إنشاء القيد المحاسبي لهذه الدفعة مسبقاً');
      }

      // 2. Get account mappings
      const { data: mappings } = await supabase
        .from('account_mappings')
        .select(`
          chart_of_accounts_id,
          default_account_type:default_account_types(type_code)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      let apAccountId: string | null = null;
      let cashAccountId: string | null = null;
      let bankAccountId: string | null = null;

      mappings?.forEach((mapping: any) => {
        const typeCode = mapping.default_account_type?.type_code;
        if (typeCode === ACCOUNT_TYPE_CODES.ACCOUNTS_PAYABLE) {
          apAccountId = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.CASH) {
          cashAccountId = mapping.chart_of_accounts_id;
        } else if (typeCode === ACCOUNT_TYPE_CODES.BANK) {
          bankAccountId = mapping.chart_of_accounts_id;
        }
      });

      // Fallback: Get accounts by code pattern
      if (!apAccountId || !cashAccountId || !bankAccountId) {
        const { data: defaultAccounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code')
          .eq('company_id', companyId)
          .eq('is_header', false)
          .gte('account_level', 3);

        defaultAccounts?.forEach((acc: any) => {
          if (acc.account_code.startsWith('21') && !apAccountId) {
            apAccountId = acc.id;
          }
          if (acc.account_code.startsWith('1111') && !cashAccountId) {
            cashAccountId = acc.id;
          }
          if (acc.account_code.startsWith('1115') && !bankAccountId) {
            bankAccountId = acc.id;
          }
        });
      }

      if (!apAccountId) throw new Error('حساب الذمم الدائنة غير معين');

      // Determine credit account based on payment method
      let creditAccountId: string | null = null;
      let creditAccountName = '';

      if (payment.payment_method === 'cash') {
        creditAccountId = cashAccountId;
        creditAccountName = 'الصندوق';
      } else {
        creditAccountId = bankAccountId || payment.bank_id;
        creditAccountName = payment.bank?.bank_name || 'البنك';
      }

      if (!creditAccountId) throw new Error('حساب النقدية/البنك غير معين');

      // 3. Generate entry number
      const { data: entryNumber } = await supabase
        .rpc('generate_journal_entry_number', { company_id_param: companyId });

      const finalEntryNumber = entryNumber || `JE-VP-${Date.now().toString().slice(-6)}`;

      // 4. Create journal entry
      const vendorName = payment.vendor?.vendor_name_ar || payment.vendor?.vendor_name || 'مورد';
      const poRef = payment.purchase_order?.order_number ? ` - أمر شراء ${payment.purchase_order.order_number}` : '';
      const entryDescription = data.description || 
        `دفع للمورد ${vendorName}${poRef}`;

      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: finalEntryNumber,
          entry_date: data.entry_date,
          description: entryDescription,
          reference_type: 'VENDOR_PAYMENT',
          reference_id: payment.id,
          total_debit: payment.amount,
          total_credit: payment.amount,
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // 5. Create journal entry lines
      const lines = [
        {
          journal_entry_id: journalEntry.id,
          account_id: apAccountId,
          line_description: `تسديد ذمم دائنة - ${vendorName}`,
          debit_amount: payment.amount,
          credit_amount: 0,
          line_number: 1,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: creditAccountId,
          line_description: `دفع من ${creditAccountName}`,
          debit_amount: 0,
          credit_amount: payment.amount,
          line_number: 2,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      // 6. Update vendor payment with journal entry reference
      const { error: updateError } = await supabase
        .from('vendor_payments')
        .update({ journal_entry_id: journalEntry.id })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error linking journal entry to vendor payment:', updateError);
      }

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-overview'] });
      toast.success('تم إنشاء القيد المحاسبي لدفعة المورد بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error creating vendor payment journal entry:', error);
      toast.error(`خطأ في إنشاء القيد المحاسبي: ${error.message}`);
    },
  });
};

// ============================================================================
// Auto-create Journal Entry on PO Status Change
// ============================================================================

export const useAutoCreatePOJournalEntry = () => {
  const createJournalEntry = useCreatePOReceiptJournalEntry();

  return useMutation({
    mutationFn: async (purchaseOrderId: string) => {
      return createJournalEntry.mutateAsync({
        purchase_order_id: purchaseOrderId,
        entry_date: new Date().toISOString().split('T')[0],
      });
    },
  });
};

// ============================================================================
// Get Accounts Payable Balance by Vendor
// ============================================================================

export const useAccountsPayableByVendor = (vendorId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['accounts-payable-by-vendor', companyId, vendorId],
    queryFn: async () => {
      if (!companyId) return null;

      // Get all POs for vendor
      let query = supabase
        .from('purchase_orders')
        .select('id, order_number, total_amount, status')
        .eq('company_id', companyId)
        .in('status', ['approved', 'sent_to_vendor', 'received', 'partially_received']);

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data: pos, error: posError } = await query;
      if (posError) throw posError;

      // Get all vendor payments
      let paymentsQuery = supabase
        .from('vendor_payments')
        .select('id, amount, status, purchase_order_id')
        .eq('company_id', companyId)
        .eq('status', 'completed');

      if (vendorId) {
        paymentsQuery = paymentsQuery.eq('vendor_id', vendorId);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Calculate totals
      const totalPurchases = pos?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
      const totalPayments = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const balance = totalPurchases - totalPayments;

      return {
        totalPurchases,
        totalPayments,
        balance,
        purchaseOrdersCount: pos?.length || 0,
        paymentsCount: payments?.length || 0,
      };
    },
    enabled: !!companyId,
  });
};

