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

// ============================================================================
// Create Payment
// ============================================================================

export interface CreatePaymentData {
  payment_type: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online_transfer';
  payment_method: 'received' | 'made';
  amount: number;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  late_fine_amount?: number;
  late_fine_status?: 'none' | 'paid' | 'waived' | 'pending';
  late_fine_type?: 'none' | 'separate_payment' | 'included_with_payment' | 'waived';
  late_fine_waiver_reason?: string;
}

/**
 * Create a new payment
 * 
 * ✅ Improvements over old version:
 * - Permission checks before creation
 * - Sentry error tracking
 * - Better error messages
 * - Validation before submission
 * - Proper audit logging
 * - Automatic invoice update
 * 
 * @returns Mutation for creating payments
 */
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { user, companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();
  
  return useMutation({
    mutationFn: async (paymentData: CreatePaymentData) => {
      // Permission check
      if (!hasPermission('payments:create')) {
        const error = new Error('ليس لديك صلاحية لإنشاء مدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'create',
            component: 'useCreatePayment.unified'
          },
          extra: { userId: user?.id, companyId }
        });
        throw error;
      }

      // Validation
      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      }

      if (!paymentData.payment_type) {
        throw new Error('نوع الدفع مطلوب');
      }

      if (!paymentData.payment_method) {
        throw new Error('طريقة الدفع مطلوبة');
      }

      try {
        // Get company_id from invoice if available, otherwise from user
        let targetCompanyId: string | undefined;
        
        if (paymentData.invoice_id) {
          // Get company_id from invoice
          const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select("company_id")
            .eq("id", paymentData.invoice_id)
            .single();
          
          if (invoiceError) {
            Sentry.captureException(invoiceError, {
              tags: {
                feature: 'payments',
                action: 'create',
                component: 'useCreatePayment.unified',
                step: 'fetch_invoice'
              },
              extra: { 
                userId: user?.id, 
                invoiceId: paymentData.invoice_id 
              }
            });
            throw new Error('خطأ في جلب بيانات الفاتورة');
          }
          
          if (invoice?.company_id) {
            targetCompanyId = invoice.company_id;
          }
        }
        
        // Use companyId from useUnifiedCompanyAccess as fallback
        if (!targetCompanyId) {
          targetCompanyId = companyId || user?.profile?.company_id;
        }
        
        if (!targetCompanyId || !user?.id) {
          throw new Error('بيانات المستخدم والشركة مطلوبة');
        }
        
        // Generate payment number
        const { data: existingPayments, error: fetchError } = await supabase
          .from("payments")
          .select("payment_number")
          .eq("company_id", targetCompanyId)
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (fetchError) {
          Sentry.captureException(fetchError, {
            tags: {
              feature: 'payments',
              action: 'create',
              component: 'useCreatePayment.unified',
              step: 'generate_number'
            },
            extra: { userId: user?.id, companyId: targetCompanyId }
          });
          throw new Error('خطأ في توليد رقم الدفع');
        }
        
        let newNumber = 1;
        if (existingPayments && existingPayments.length > 0) {
          const lastNumber = existingPayments[0]?.payment_number || "PAY-0000";
          const numberPart = lastNumber.split('-')[1];
          newNumber = parseInt(numberPart) + 1;
        }
        const paymentNumber = `PAY-${newNumber.toString().padStart(4, '0')}`;
        
        // Create payment
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            ...paymentData,
            payment_number: paymentNumber,
            company_id: targetCompanyId,
            payment_status: 'completed',
            transaction_type: paymentData.customer_id ? 'receipt' : 'payment',
            created_by: user.id
          })
          .select()
          .single();
        
        if (paymentError) {
          Sentry.captureException(paymentError, {
            tags: {
              feature: 'payments',
              action: 'create',
              component: 'useCreatePayment.unified',
              step: 'insert_payment'
            },
            extra: { 
              userId: user?.id, 
              companyId: targetCompanyId,
              paymentData 
            }
          });
          throw new Error(`خطأ في إنشاء الدفع: ${paymentError.message}`);
        }
        
        // If this is a payment for an invoice, update the invoice
        if (paymentData.invoice_id) {
          // Get current invoice data
          const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select("total_amount, paid_amount, balance_due")
            .eq("id", paymentData.invoice_id)
            .single();
            
          if (invoiceError) {
            Sentry.captureException(invoiceError, {
              tags: {
                feature: 'payments',
                action: 'create',
                component: 'useCreatePayment.unified',
                step: 'fetch_invoice_for_update'
              },
              extra: { 
                userId: user?.id, 
                invoiceId: paymentData.invoice_id 
              }
            });
            throw new Error('خطأ في جلب بيانات الفاتورة للتحديث');
          }
          
          const newPaidAmount = (invoice.paid_amount || 0) + paymentData.amount;
          const newBalanceDue = (invoice.total_amount || 0) - newPaidAmount;
          
          let newPaymentStatus: 'unpaid' | 'partial' | 'paid';
          if (newPaidAmount >= (invoice.total_amount || 0)) {
            newPaymentStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newPaymentStatus = 'partial';
          } else {
            newPaymentStatus = 'unpaid';
          }
          
          // Update invoice
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              paid_amount: newPaidAmount,
              balance_due: Math.max(0, newBalanceDue),
              payment_status: newPaymentStatus,
              updated_at: new Date().toISOString()
            })
            .eq("id", paymentData.invoice_id);
            
          if (updateError) {
            Sentry.captureException(updateError, {
              tags: {
                feature: 'payments',
                action: 'create',
                component: 'useCreatePayment.unified',
                step: 'update_invoice'
              },
              extra: { 
                userId: user?.id, 
                invoiceId: paymentData.invoice_id,
                newPaidAmount,
                newBalanceDue,
                newPaymentStatus
              }
            });
            throw new Error('خطأ في تحديث الفاتورة');
          }
        }
        
        return payment;
      } catch (error) {
        // Log unexpected errors
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'create',
            component: 'useCreatePayment.unified',
            errorType: 'unexpected'
          },
          extra: { 
            userId: user?.id, 
            companyId,
            paymentData 
          }
        });
        throw error;
      }
    },
    onSuccess: async (payment) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      
      // Log audit trail (import createAuditLog if needed)
      try {
        const { createAuditLog } = await import('@/hooks/useAuditLog');
        await createAuditLog(
          'CREATE',
          'payment',
          payment.id,
          payment.payment_number,
          {
            new_values: {
              payment_number: payment.payment_number,
              amount: payment.amount,
              payment_method: payment.payment_method,
              payment_type: payment.payment_type,
              payment_date: payment.payment_date,
              invoice_id: payment.invoice_id,
            },
            changes_summary: `تم إنشاء دفع ${payment.payment_number}`,
            metadata: {
              amount: payment.amount,
              payment_method: payment.payment_method,
              invoice_linked: !!payment.invoice_id,
            },
            severity: 'medium',
          }
        );
      } catch (auditError) {
        // Don't fail the whole operation if audit logging fails
        Sentry.captureException(auditError, {
          tags: {
            feature: 'payments',
            action: 'create',
            component: 'useCreatePayment.unified',
            step: 'audit_log'
          },
          extra: { paymentId: payment.id }
        });
      }
      
      toast.success("تم تسجيل الدفع بنجاح", {
        description: "تم تحديث حالة الفاتورة"
      });
    },
    onError: (error: Error) => {
      toast.error("خطأ في تسجيل الدفع", {
        description: error.message
      });
    }
  });
};
