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

// ============================================================================
// BULK DELETE PAYMENTS
// ============================================================================

interface BulkDeleteOptions {
  deleteAll?: boolean;
  onlyUnlinked?: boolean;
  startDate?: string;
  endDate?: string;
  paymentType?: string;
  paymentMethod?: string;
}

interface BulkDeleteResult {
  deletedCount: number;
  processedInvoices: number;
}

/**
 * Bulk delete payments with filters
 * 
 * ✅ Improvements over old version:
 * - Permission checks before deletion
 * - Sentry transaction tracking
 * - Better error handling
 * - Safe audit logging (doesn't fail operation)
 * - Uses sonner toast
 * 
 * @returns Mutation for bulk deleting payments
 */
export const useBulkDeletePayments = () => {
  const queryClient = useQueryClient();
  const { user, companyId: effectiveCompanyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (options: BulkDeleteOptions = {}): Promise<BulkDeleteResult> => {
      try {
        // Track bulk delete operation
        Sentry.addBreadcrumb({
          category: 'payments',
          message: 'Starting bulk delete payments operation',
          level: 'info',
        });
        // ============================================================================
        // PERMISSION CHECK
        // ============================================================================
        if (!hasPermission('payments:delete')) {
          const error = new Error('ليس لديك صلاحية لحذف المدفوعات');
          Sentry.captureException(error, {
            tags: { feature: 'bulk_delete_payments', step: 'permission_check' },
            extra: { userId: user?.id, effectiveCompanyId },
          });
          throw error;
        }

        // ============================================================================
        // VALIDATION
        // ============================================================================
        if (!effectiveCompanyId) {
          const error = new Error('Company ID is required');
          Sentry.captureException(error, {
            tags: { feature: 'bulk_delete_payments', step: 'validation' },
          });
          throw error;
        }

        Sentry.addBreadcrumb({
          category: 'bulk_delete_payments',
          message: 'Starting bulk delete operation',
          level: 'info',
          data: {
            options,
            effectiveCompanyId,
            isBrowsingMode,
            browsedCompany: browsedCompany?.name,
          },
        });

        // ============================================================================
        // BUILD QUERY
        // ============================================================================
        let query = supabase
          .from('payments')
          .select('*')
          .eq('company_id', effectiveCompanyId);

        // Handle deleteAll - ignore all filters when true
        if (options.deleteAll) {
          Sentry.addBreadcrumb({
            category: 'bulk_delete_payments',
            message: 'Delete all mode enabled - ignoring filters',
            level: 'warning',
          });
        } else {
          // Apply filters only if deleteAll is not true
          if (options.onlyUnlinked) {
            query = query.is('invoice_id', null).is('contract_id', null);
          }

          if (options.startDate) {
            query = query.gte('payment_date', options.startDate);
          }

          if (options.endDate) {
            query = query.lte('payment_date', options.endDate);
          }

          if (options.paymentType && options.paymentType !== 'all') {
            query = query.eq('payment_type', options.paymentType);
          }

          if (options.paymentMethod && options.paymentMethod !== 'all') {
            query = query.eq('payment_method', options.paymentMethod);
          }
        }

        // ============================================================================
        // FETCH PAYMENTS TO DELETE
        // ============================================================================
        const fetchSpan = transaction.startChild({
          op: 'db.query',
          description: 'Fetch payments to delete',
        });

        const { data: paymentsToDelete, error: fetchError } = await query;
        fetchSpan.finish();

        if (fetchError) {
          Sentry.captureException(fetchError, {
            tags: { feature: 'bulk_delete_payments', step: 'fetch_payments' },
            extra: { effectiveCompanyId, options },
          });
          throw fetchError;
        }

        if (!paymentsToDelete || paymentsToDelete.length === 0) {
          Sentry.addBreadcrumb({
            category: 'bulk_delete_payments',
            message: 'No payments found to delete',
            level: 'info',
          });

          return { deletedCount: 0, processedInvoices: 0 };
        }

        Sentry.addBreadcrumb({
          category: 'bulk_delete_payments',
          message: `Found ${paymentsToDelete.length} payments to delete`,
          level: 'info',
        });

        // ============================================================================
        // PROCESS LINKED INVOICES
        // ============================================================================
        let processedInvoices = 0;
        const invoicesToUpdate = new Map();

        const invoiceSpan = transaction.startChild({
          op: 'process',
          description: 'Process linked invoices',
        });

        // Process linked invoices first
        for (const payment of paymentsToDelete) {
          if (payment.invoice_id) {
            if (!invoicesToUpdate.has(payment.invoice_id)) {
              const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .select('total_amount, paid_amount')
                .eq('id', payment.invoice_id)
                .single();

              if (!invoiceError && invoice) {
                invoicesToUpdate.set(payment.invoice_id, {
                  ...invoice,
                  paymentsToReverse: [],
                });
              }
            }

            if (invoicesToUpdate.has(payment.invoice_id)) {
              invoicesToUpdate.get(payment.invoice_id).paymentsToReverse.push(payment.amount);
            }
          }
        }

        // Update invoices
        for (const [invoiceId, invoiceData] of invoicesToUpdate) {
          const totalToReverse = invoiceData.paymentsToReverse.reduce(
            (sum: number, amount: number) => sum + amount,
            0
          );
          const newPaidAmount = Math.max(0, (invoiceData.paid_amount || 0) - totalToReverse);
          const newBalanceDue = (invoiceData.total_amount || 0) - newPaidAmount;

          let newPaymentStatus: 'unpaid' | 'partial' | 'paid';
          if (newPaidAmount >= (invoiceData.total_amount || 0)) {
            newPaymentStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newPaymentStatus = 'partial';
          } else {
            newPaymentStatus = 'unpaid';
          }

          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              paid_amount: newPaidAmount,
              balance_due: Math.max(0, newBalanceDue),
              payment_status: newPaymentStatus,
            })
            .eq('id', invoiceId);

          if (updateError) {
            Sentry.captureException(updateError, {
              tags: { feature: 'bulk_delete_payments', step: 'update_invoice' },
              extra: { invoiceId, newPaidAmount, newBalanceDue, newPaymentStatus },
            });
            // Continue with other invoices
          } else {
            processedInvoices++;
          }
        }

        invoiceSpan.finish();

        // ============================================================================
        // DELETE PAYMENTS IN BATCHES
        // ============================================================================
        const deleteSpan = transaction.startChild({
          op: 'db.delete',
          description: 'Delete payments in batches',
        });

        const batchSize = 100;
        let deletedCount = 0;
        const totalToDelete = paymentsToDelete.length;

        for (let i = 0; i < paymentsToDelete.length; i += batchSize) {
          const batch = paymentsToDelete.slice(i, i + batchSize);
          const ids = batch.map((p) => p.id);

          const { error: deleteError, count } = await supabase
            .from('payments')
            .delete({ count: 'exact' })
            .in('id', ids)
            .eq('company_id', effectiveCompanyId);

          if (deleteError) {
            Sentry.captureException(deleteError, {
              tags: { feature: 'bulk_delete_payments', step: 'delete_batch' },
              extra: { batchNumber: Math.floor(i / batchSize) + 1, batchSize: batch.length },
            });
            throw deleteError;
          }

          const actualDeleted = count || batch.length;
          deletedCount += actualDeleted;
        }

        deleteSpan.finish();

        // ============================================================================
        // AUDIT LOG (Safe - doesn't fail the operation)
        // ============================================================================
        try {
          const { createAuditLog } = await import('@/hooks/useAuditLog');
          await createAuditLog(
            'DELETE_BULK',
            'payment',
            null,
            `Bulk delete: ${deletedCount} payments`,
            {
              new_values: null,
              old_values: null,
              changes_summary: `تم حذف ${deletedCount} دفع وتحديث ${processedInvoices} فاتورة`,
              metadata: {
                deletedCount,
                processedInvoices,
                options,
                totalToDelete,
              },
              severity: 'high',
            }
          );
        } catch (auditError) {
          Sentry.captureException(auditError, {
            tags: { feature: 'bulk_delete_payments', step: 'audit_log' },
            level: 'warning',
          });
          // Don't throw - audit log failure shouldn't fail the operation
        }

        Sentry.addBreadcrumb({
          category: 'bulk_delete_payments',
          message: `Successfully deleted ${deletedCount} payments`,
          level: 'info',
          data: { deletedCount, processedInvoices },
        });



        return { deletedCount, processedInvoices };
      } catch (error) {


        Sentry.captureException(error, {
          tags: { feature: 'bulk_delete_payments', step: 'general_error' },
          extra: { options, effectiveCompanyId },
        });

        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      toast.success(
        `تم حذف ${result.deletedCount} دفع وتحديث ${result.processedInvoices} فاتورة`,
        {
          description: 'تم حذف المدفوعات بنجاح',
        }
      );

      Sentry.addBreadcrumb({
        category: 'bulk_delete_payments',
        message: 'Bulk delete completed successfully',
        level: 'info',
        data: result,
      });
    },
    onError: (error: Error) => {
      toast.error('خطأ في حذف المدفوعات', {
        description: error.message,
      });

      Sentry.captureException(error, {
        tags: { feature: 'bulk_delete_payments', step: 'mutation_error' },
      });
    },
  });
};

// ============================================================================
// UPDATE PAYMENT
// ============================================================================

export interface UpdatePaymentData extends Partial<CreatePaymentData> {
  payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled' | 'cleared' | 'bounced';
}

/**
 * Update an existing payment
 * 
 * ✅ Improvements over old version:
 * - Permission checks before update
 * - Sentry error tracking
 * - Better validation
 * - Safe audit logging
 * - Uses sonner toast
 * 
 * @returns Mutation for updating payments
 */
export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const { user, companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async ({
      paymentId,
      paymentData,
    }: {
      paymentId: string;
      paymentData: UpdatePaymentData;
    }) => {
      // ============================================================================
      // PERMISSION CHECK
      // ============================================================================
      if (!hasPermission('payments:update')) {
        const error = new Error('ليس لديك صلاحية لتحديث المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'update',
            component: 'useUpdatePayment.unified',
          },
          extra: { userId: user?.id, companyId, paymentId },
        });
        throw error;
      }

      // ============================================================================
      // VALIDATION
      // ============================================================================
      if (!paymentId) {
        throw new Error('معرف الدفع مطلوب');
      }

      if (!companyId) {
        throw new Error('معرف الشركة مطلوب');
      }

      // Validate amount if provided
      if (paymentData.amount !== undefined && paymentData.amount <= 0) {
        throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      }

      try {
        Sentry.addBreadcrumb({
          category: 'update_payment',
          message: 'Starting payment update',
          level: 'info',
          data: { paymentId, companyId },
        });

        // ============================================================================
        // UPDATE PAYMENT
        // ============================================================================
        const { data, error } = await supabase
          .from('payments')
          .update({
            ...paymentData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId)
          .eq('company_id', companyId)
          .select()
          .single();

        if (error) {
          Sentry.captureException(error, {
            tags: {
              feature: 'payments',
              action: 'update',
              component: 'useUpdatePayment.unified',
              step: 'update_payment',
            },
            extra: { paymentId, companyId, paymentData },
          });
          throw new Error(`خطأ في تحديث الدفع: ${error.message}`);
        }

        Sentry.addBreadcrumb({
          category: 'update_payment',
          message: 'Payment updated successfully',
          level: 'info',
          data: { paymentId },
        });

        // ============================================================================
        // AUDIT LOG (Safe - doesn't fail the operation)
        // ============================================================================
        try {
          const { createAuditLog } = await import('@/hooks/useAuditLog');
          await createAuditLog(
            'UPDATE',
            'payment',
            paymentId,
            data.payment_number || paymentId,
            {
              new_values: paymentData,
              changes_summary: `تم تحديث دفع ${data.payment_number}`,
              metadata: {
                updated_fields: Object.keys(paymentData),
                payment_number: data.payment_number,
              },
              severity: 'medium',
            }
          );
        } catch (auditError) {
          Sentry.captureException(auditError, {
            tags: {
              feature: 'payments',
              action: 'update',
              component: 'useUpdatePayment.unified',
              step: 'audit_log',
            },
            level: 'warning',
          });
          // Don't throw - audit log failure shouldn't fail the operation
        }

        return data;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'update',
            component: 'useUpdatePayment.unified',
            errorType: 'unexpected',
          },
          extra: { paymentId, companyId, paymentData },
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      toast.success('تم تحديث الدفع بنجاح');

      Sentry.addBreadcrumb({
        category: 'update_payment',
        message: 'Payment update completed successfully',
        level: 'info',
      });
    },
    onError: (error: Error) => {
      toast.error('خطأ في تحديث الدفع', {
        description: error.message,
      });

      Sentry.captureException(error, {
        tags: {
          feature: 'payments',
          action: 'update',
          component: 'useUpdatePayment.unified',
          step: 'mutation_error',
        },
      });
    },
  });
};

// ============================================================================
// DELETE PAYMENT
// ============================================================================

/**
 * Delete a payment and reverse invoice changes
 * 
 * ✅ Improvements over old version:
 * - Permission checks before deletion
 * - Sentry error tracking
 * - Better error handling
 * - Safe audit logging
 * - Uses sonner toast
 * - Reverses invoice payment status
 * 
 * @returns Mutation for deleting payments
 */
export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  const { user, companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      // ============================================================================
      // PERMISSION CHECK
      // ============================================================================
      if (!hasPermission('payments:delete')) {
        const error = new Error('ليس لديك صلاحية لحذف المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'delete',
            component: 'useDeletePayment.unified',
          },
          extra: { userId: user?.id, companyId, paymentId },
        });
        throw error;
      }

      // ============================================================================
      // VALIDATION
      // ============================================================================
      if (!paymentId) {
        throw new Error('معرف الدفع مطلوب');
      }

      if (!companyId) {
        throw new Error('معرف الشركة مطلوب');
      }

      try {
        Sentry.addBreadcrumb({
          category: 'delete_payment',
          message: 'Starting payment deletion',
          level: 'info',
          data: { paymentId, companyId },
        });

        // ============================================================================
        // FETCH PAYMENT DATA
        // ============================================================================
        const { data: payment, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .eq('company_id', companyId)
          .single();

        if (fetchError) {
          Sentry.captureException(fetchError, {
            tags: {
              feature: 'payments',
              action: 'delete',
              component: 'useDeletePayment.unified',
              step: 'fetch_payment',
            },
            extra: { paymentId, companyId },
          });
          throw new Error(`خطأ في جلب بيانات الدفع: ${fetchError.message}`);
        }

        if (!payment) {
          throw new Error('الدفع غير موجود');
        }

        // ============================================================================
        // REVERSE INVOICE PAYMENT
        // ============================================================================
        if (payment.invoice_id) {
          Sentry.addBreadcrumb({
            category: 'delete_payment',
            message: 'Reversing invoice payment',
            level: 'info',
            data: { invoiceId: payment.invoice_id },
          });

          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('total_amount, paid_amount')
            .eq('id', payment.invoice_id)
            .single();

          if (invoiceError) {
            Sentry.captureException(invoiceError, {
              tags: {
                feature: 'payments',
                action: 'delete',
                component: 'useDeletePayment.unified',
                step: 'fetch_invoice',
              },
              extra: { invoiceId: payment.invoice_id },
            });
            throw new Error(`خطأ في جلب بيانات الفاتورة: ${invoiceError.message}`);
          }

          const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - payment.amount);
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
            .from('invoices')
            .update({
              paid_amount: newPaidAmount,
              balance_due: Math.max(0, newBalanceDue),
              payment_status: newPaymentStatus,
            })
            .eq('id', payment.invoice_id);

          if (updateError) {
            Sentry.captureException(updateError, {
              tags: {
                feature: 'payments',
                action: 'delete',
                component: 'useDeletePayment.unified',
                step: 'update_invoice',
              },
              extra: {
                invoiceId: payment.invoice_id,
                newPaidAmount,
                newBalanceDue,
                newPaymentStatus,
              },
            });
            throw new Error(`خطأ في تحديث الفاتورة: ${updateError.message}`);
          }

          Sentry.addBreadcrumb({
            category: 'delete_payment',
            message: 'Invoice payment reversed successfully',
            level: 'info',
            data: { invoiceId: payment.invoice_id, newPaymentStatus },
          });
        }

        // ============================================================================
        // DELETE PAYMENT
        // ============================================================================
        const { error: deleteError } = await supabase
          .from('payments')
          .delete()
          .eq('id', paymentId)
          .eq('company_id', companyId);

        if (deleteError) {
          Sentry.captureException(deleteError, {
            tags: {
              feature: 'payments',
              action: 'delete',
              component: 'useDeletePayment.unified',
              step: 'delete_payment',
            },
            extra: { paymentId, companyId },
          });
          throw new Error(`خطأ في حذف الدفع: ${deleteError.message}`);
        }

        Sentry.addBreadcrumb({
          category: 'delete_payment',
          message: 'Payment deleted successfully',
          level: 'info',
          data: { paymentId },
        });

        return { paymentId, payment };
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'delete',
            component: 'useDeletePayment.unified',
            errorType: 'unexpected',
          },
          extra: { paymentId, companyId },
        });
        throw error;
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // ============================================================================
      // AUDIT LOG (Safe - doesn't fail the operation)
      // ============================================================================
      try {
        const { createAuditLog } = await import('@/hooks/useAuditLog');
        await createAuditLog(
          'DELETE',
          'payment',
          result.paymentId,
          result.payment.payment_number || result.paymentId,
          {
            old_values: {
              payment_number: result.payment.payment_number,
              amount: result.payment.amount,
              payment_method: result.payment.payment_method,
              payment_date: result.payment.payment_date,
              invoice_id: result.payment.invoice_id,
            },
            changes_summary: `تم حذف دفع ${result.payment.payment_number || result.paymentId}`,
            metadata: {
              amount: result.payment.amount,
              payment_method: result.payment.payment_method,
              invoice_linked: !!result.payment.invoice_id,
            },
            severity: 'high',
          }
        );
      } catch (auditError) {
        Sentry.captureException(auditError, {
          tags: {
            feature: 'payments',
            action: 'delete',
            component: 'useDeletePayment.unified',
            step: 'audit_log',
          },
          level: 'warning',
        });
        // Don't throw - audit log failure shouldn't fail the operation
      }

      toast.success('تم حذف الدفع بنجاح', {
        description: 'تم تحديث حالة الفاتورة',
      });

      Sentry.addBreadcrumb({
        category: 'delete_payment',
        message: 'Payment deletion completed successfully',
        level: 'info',
      });
    },
    onError: (error: Error) => {
      toast.error('خطأ في حذف الدفع', {
        description: error.message,
      });

      Sentry.captureException(error, {
        tags: {
          feature: 'payments',
          action: 'delete',
          component: 'useDeletePayment.unified',
          step: 'mutation_error',
        },
      });
    },
  });
};

// ============================================================================
// GET SINGLE PAYMENT
// ============================================================================

/**
 * Get a single payment by ID
 * 
 * ✅ Improvements over old version:
 * - Permission checks
 * - Better error handling
 * - Sentry tracking
 * 
 * @param paymentId - Payment ID
 * @returns Query for single payment
 */
export const usePayment = (paymentId: string) => {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: paymentKeys.detail(paymentId),
    queryFn: async () => {
      // Permission check
      if (!hasPermission('payments:read')) {
        const error = new Error('ليس لديك صلاحية لعرض المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read_single',
            component: 'usePayment.unified',
          },
          extra: { paymentId },
        });
        throw error;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'get_payment',
          message: 'Fetching single payment',
          level: 'info',
          data: { paymentId },
        });

        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .single();

        if (error) {
          Sentry.captureException(error, {
            tags: {
              feature: 'payments',
              action: 'read_single',
              component: 'usePayment.unified',
            },
            extra: { paymentId },
          });
          throw new Error(`خطأ في جلب الدفع: ${error.message}`);
        }

        return data;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read_single',
            component: 'usePayment.unified',
            errorType: 'unexpected',
          },
          extra: { paymentId },
        });
        throw error;
      }
    },
    enabled: !!paymentId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};

// ============================================================================
// ADVANCED PAYMENT OPERATIONS (from data/usePayments.ts)
// ============================================================================

/**
 * Get payment with full details
 * 
 * Note: Uses paymentService which may have additional logic
 * 
 * @param id - Payment ID
 * @returns Query for payment with details
 */
export function usePaymentWithDetails(id: string) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: ['payment-with-details', id],
    queryFn: async () => {
      // Permission check
      if (!hasPermission('payments:read')) {
        const error = new Error('ليس لديك صلاحية لعرض المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read_with_details',
            component: 'usePaymentWithDetails.unified',
          },
          extra: { id },
        });
        throw error;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'get_payment_details',
          message: 'Fetching payment with details',
          level: 'info',
          data: { id },
        });

        // Import paymentService dynamically to avoid circular dependencies
        const { paymentService } = await import('@/services');
        return await paymentService.getPaymentWithDetails(id);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read_with_details',
            component: 'usePaymentWithDetails.unified',
          },
          extra: { id },
        });
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get unmatched payments (not linked to invoices/contracts)
 * 
 * @param companyId - Company ID (optional)
 * @returns Query for unmatched payments
 */
export function useUnmatchedPayments(companyId?: string) {
  const { hasPermission } = usePermissions();
  const { companyId: contextCompanyId } = useUnifiedCompanyAccess();
  const finalCompanyId = companyId || contextCompanyId;

  return useQuery({
    queryKey: paymentKeys.unmatched(finalCompanyId!),
    queryFn: async () => {
      if (!finalCompanyId) throw new Error('No company access');

      // Permission check
      if (!hasPermission('payments:read')) {
        const error = new Error('ليس لديك صلاحية لعرض المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read_unmatched',
            component: 'useUnmatchedPayments.unified',
          },
          extra: { companyId: finalCompanyId },
        });
        throw error;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'get_unmatched_payments',
          message: 'Fetching unmatched payments',
          level: 'info',
          data: { companyId: finalCompanyId },
        });

        const { paymentService } = await import('@/services');
        return await paymentService.getUnmatchedPayments(finalCompanyId);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'read_unmatched',
            component: 'useUnmatchedPayments.unified',
          },
          extra: { companyId: finalCompanyId },
        });
        throw error;
      }
    },
    enabled: !!finalCompanyId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get payment matching suggestions (AI-powered)
 * 
 * @param paymentId - Payment ID
 * @returns Query for matching suggestions
 */
export function usePaymentMatchSuggestions(paymentId: string) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: paymentKeys.matches(paymentId),
    queryFn: async () => {
      // Permission check
      if (!hasPermission('payments:read')) {
        const error = new Error('ليس لديك صلاحية لعرض المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'get_match_suggestions',
            component: 'usePaymentMatchSuggestions.unified',
          },
          extra: { paymentId },
        });
        throw error;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'get_match_suggestions',
          message: 'Finding payment match suggestions',
          level: 'info',
          data: { paymentId },
        });

        const { paymentService } = await import('@/services');
        const payment = await paymentService.getById(paymentId);
        if (!payment) throw new Error('Payment not found');
        
        return await paymentService.findMatchingSuggestions(payment);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'get_match_suggestions',
            component: 'usePaymentMatchSuggestions.unified',
          },
          extra: { paymentId },
        });
        throw error;
      }
    },
    enabled: !!paymentId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get payment statistics
 * 
 * @param companyId - Company ID
 * @param startDate - Start date (optional)
 * @param endDate - End date (optional)
 * @returns Query for payment stats
 */
export function usePaymentStats(companyId: string, startDate?: string, endDate?: string) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: ['payment-stats', companyId, startDate, endDate],
    queryFn: async () => {
      // Permission check
      if (!hasPermission('payments:read')) {
        const error = new Error('ليس لديك صلاحية لعرض إحصائيات المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'get_stats',
            component: 'usePaymentStats.unified',
          },
          extra: { companyId, startDate, endDate },
        });
        throw error;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'get_payment_stats',
          message: 'Fetching payment statistics',
          level: 'info',
          data: { companyId, startDate, endDate },
        });

        const { paymentService } = await import('@/services');
        return await paymentService.getPaymentStats(companyId, startDate, endDate);
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'get_stats',
            component: 'usePaymentStats.unified',
          },
          extra: { companyId, startDate, endDate },
        });
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes for stats
  });
}

/**
 * Match payment to invoice or contract
 * 
 * @returns Mutation for matching payment
 */
export function useMatchPayment() {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      paymentId: string;
      targetType: 'invoice' | 'contract';
      targetId: string;
    }) => {
      // Permission check
      if (!hasPermission('payments:update')) {
        const error = new Error('ليس لديك صلاحية لربط المدفوعات');
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'match',
            component: 'useMatchPayment.unified',
          },
          extra: variables,
        });
        throw error;
      }

      try {
        Sentry.addBreadcrumb({
          category: 'match_payment',
          message: 'Matching payment to target',
          level: 'info',
          data: variables,
        });

        const { paymentService } = await import('@/services');
        const result = await paymentService.matchPayment(
          variables.paymentId,
          variables.targetType,
          variables.targetId
        );

        return result;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'payments',
            action: 'match',
            component: 'useMatchPayment.unified',
          },
          extra: variables,
        });
        throw error;
      }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        toast.success('✅ تم ربط الدفعة بنجاح', {
          description: `الثقة: ${result.confidence}%`,
        });

        queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      }
    },
    
    onError: (error: Error) => {
      toast.error('خطأ في ربط الدفعة', {
        description: error.message,
      });
    },
  });
}
