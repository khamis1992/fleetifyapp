/**
 * Unified Payments Hook
 * 
 * ⚠️ EXPERIMENTAL - Safe Migration Approach
 * 
 * This file represents the unified, improved version of payment hooks.
 * We're migrating functions one at a time to ensure stability.
 * 
 * Migration Strategy:
 * 1. Create new function here
 * 2. Test thoroughly
 * 3. Update one component at a time
 * 4. Monitor production for 48 hours
 * 5. Move to next function
 * 
 * DO NOT delete old hooks until ALL components are migrated and tested!
 * 
 * @version 1.0.0 - Initial creation with usePayments only
 * @date 2025-11-14
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface Payment {
  id: string;
  company_id: string;
  payment_type: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online_transfer';
  payment_method: 'received' | 'made';
  payment_number: string;
  amount: number;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'cleared' | 'bounced';
  late_fine_amount?: number;
  late_fine_status?: 'none' | 'paid' | 'waived' | 'pending';
  late_fine_type?: 'none' | 'separate_payment' | 'included_with_payment' | 'waived';
  late_fine_waiver_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customers?: {
    first_name: string;
    last_name: string;
    company_name?: string;
    customer_type: string;
  };
  vendors?: {
    vendor_name: string;
  };
  invoices?: {
    invoice_number: string;
    total_amount: number;
  };
  contracts?: {
    contract_number: string;
  };
}

export interface PaymentFilters {
  method?: string;
  status?: string;
  type?: string;
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  onlyUnlinked?: boolean;
  payment_date_gte?: string;
  payment_date_lte?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const paymentKeys = {
  all: ['payments-unified'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (companyId: string, filters?: PaymentFilters) => 
    [...paymentKeys.lists(), companyId, filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get all payments with filters
 * 
 * ✅ Improvements over old version:
 * - Uses permission checks
 * - Sentry error tracking
 * - Optimized field selection (no select('*'))
 * - Better error messages
 * - Proper TypeScript types
 * 
 * @param filters - Optional filters for payments
 * @returns Query result with payments data
 */
export const usePayments = (filters?: PaymentFilters) => {
  const { companyId, user, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: paymentKeys.list(companyId || '', filters),
    queryFn: async () => {
      // Permission check
      if (!hasPermission('payments:read')) {
        const error = new Error('ليس لديك صلاحية لعرض المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read',
            component: 'usePayments.unified'
          },
          extra: { userId: user?.id, companyId }
        });
        throw error;
      }

      if (!companyId) {
        throw new Error('معرف الشركة مطلوب للوصول للمدفوعات');
      }

      try {
        // Build query with optimized field selection
        let query = supabase
          .from('payments')
          .select(`
            id,
            company_id,
            payment_type,
            payment_method,
            payment_number,
            amount,
            payment_date,
            reference_number,
            notes,
            customer_id,
            vendor_id,
            invoice_id,
            contract_id,
            payment_status,
            late_fine_amount,
            late_fine_status,
            late_fine_type,
            late_fine_waiver_reason,
            created_by,
            created_at,
            updated_at,
            customers (
              first_name,
              last_name,
              company_name,
              customer_type
            ),
            vendors (
              vendor_name
            ),
            invoices (
              invoice_number,
              total_amount
            ),
            contracts (
              contract_number
            )
          `)
          .eq('company_id', companyId)
          .order('payment_date', { ascending: false });

        // Apply filters
        if (filters?.method) {
          query = query.eq('payment_method', filters.method);
        }
        if (filters?.status) {
          query = query.eq('payment_status', filters.status);
        }
        if (filters?.type) {
          query = query.eq('payment_type', filters.type);
        }
        if (filters?.customer_id) {
          query = query.eq('customer_id', filters.customer_id);
        }
        if (filters?.vendor_id) {
          query = query.eq('vendor_id', filters.vendor_id);
        }
        if (filters?.invoice_id) {
          query = query.eq('invoice_id', filters.invoice_id);
        }
        if (filters?.contract_id) {
          query = query.eq('contract_id', filters.contract_id);
        }
        if (filters?.onlyUnlinked) {
          query = query.is('invoice_id', null).is('contract_id', null);
        }
        if (filters?.payment_date_gte) {
          query = query.gte('payment_date', filters.payment_date_gte);
        }
        if (filters?.payment_date_lte) {
          query = query.lte('payment_date', filters.payment_date_lte);
        }

        const { data, error } = await query;

        if (error) {
          Sentry.captureException(error, {
            tags: {
              feature: 'payments',
              action: 'read',
              component: 'usePayments.unified'
            },
            extra: { 
              userId: user?.id, 
              companyId, 
              filters,
              errorCode: error.code,
              errorMessage: error.message
            }
          });

          // Check if it's an authentication error
          if (error.message?.includes('JWT') || error.message?.includes('auth') || error.code === 'PGRST301') {
            throw new Error('انتهت جلسة العمل. يرجى تسجيل الدخول مرة أخرى');
          }

          throw new Error(`خطأ في تحميل المدفوعات: ${error.message}`);
        }

        return (data || []) as Payment[];
      } catch (error) {
        // Log unexpected errors
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read',
            component: 'usePayments.unified',
            errorType: 'unexpected'
          },
          extra: { userId: user?.id, companyId, filters }
        });
        throw error;
      }
    },
    enabled: !!user?.id && !!companyId && !isAuthenticating,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('JWT') || 
          error?.message?.includes('auth') || 
          error?.message?.includes('تسجيل الدخول') ||
          error?.message?.includes('صلاحية')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ============================================================================
// Migration Notes
// ============================================================================

/**
 * MIGRATION CHECKLIST:
 * 
 * Phase 1: usePayments (Current) ✅
 * - [x] Create function
 * - [ ] Test in one component
 * - [ ] Monitor for 48 hours
 * - [ ] Roll out to all components
 * 
 * Phase 2: useCreatePayment (Next)
 * - [ ] Add stored procedure support
 * - [ ] Add permission checks
 * - [ ] Add Sentry tracking
 * - [ ] Test thoroughly
 * 
 * Phase 3: useUpdatePayment
 * Phase 4: useDeletePayment
 * Phase 5: usePaymentWithDetails
 * Phase 6: useUnmatchedPayments
 * Phase 7: usePaymentStats
 * Phase 8: usePaymentSchedules
 * ... (continue with other functions)
 * 
 * IMPORTANT:
 * - Do NOT delete old hooks until ALL components are migrated
 * - Monitor Sentry for errors after each migration
 * - Keep this file as the single source of truth
 * - Document any issues or learnings here
 */

/**
 * KNOWN ISSUES:
 * - None yet (first function)
 * 
 * LEARNINGS:
 * - TBD after first deployment
 */
