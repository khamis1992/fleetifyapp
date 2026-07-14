/**
 * Payment Validation Hook
 *
 * Validates payment amounts against contract limits to prevent overpayment
 */

import { useMemo } from 'react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentValidationResult {
  isValid: boolean;
  isWarning: boolean;
  isBlocked: boolean;
  message: string;
  warningLevel: 'info' | 'warning' | 'error';
  details?: {
    contractAmount: number;
    totalPaid: number;
    newTotal: number;
    monthlyAmount: number;
    maxPayment: number;
    overpaymentAmount?: number;
  };
}

export interface UsePaymentValidationOptions {
  contractId?: string;
  invoiceId?: string;
  amount: number;
  currency?: string;
}

export function usePaymentValidation({
  contractId,
  invoiceId,
  amount,
  currency = 'QAR'
}: UsePaymentValidationOptions) {
  const { companyId } = useUnifiedCompanyAccess();

  const validationResult = useMemo((): PaymentValidationResult => {
    // Default: valid if no context
    if (!contractId && !invoiceId) {
      return {
        isValid: true,
        isWarning: false,
        isBlocked: false,
        message: '',
        warningLevel: 'info'
      };
    }

    // If amount is zero or negative, it's not valid
    if (amount <= 0) {
      return {
        isValid: false,
        isWarning: false,
        isBlocked: false,
        message: 'المبلغ يجب أن يكون أكبر من صفر',
        warningLevel: 'error'
      };
    }

    // Note: This is frontend validation only
    // For complete validation, we need to fetch contract details
    // Since we can't do async in useMemo, we return a validation result
    // that indicates async validation is needed

    return {
      isValid: true,
      isWarning: false,
      isBlocked: false,
      message: '',
      warningLevel: 'info'
    };
  }, [contractId, invoiceId, amount]);

  return {
    validationResult,
    // This would be an async function to call when needed
    validatePayment: async () => {
      if (!contractId && !invoiceId) {
        return {
          isValid: true,
          isWarning: false,
          isBlocked: false,
          message: '',
          warningLevel: 'info'
        };
      }

      try {
        if (!companyId) {
          throw new Error('تعذر تحديد الشركة الحالية للتحقق من الدفعة');
        }

        let contractAmount = 0;
        let totalPaid = 0;
        let monthlyAmount = 0;
        let invoiceBalance = 0;

        if (contractId) {
          const [contractResult, paymentsResult] = await Promise.all([
            supabase
              .from('contracts')
              .select('contract_amount, monthly_amount')
              .eq('id', contractId)
              .eq('company_id', companyId)
              .single(),
            supabase
              .from('payments')
              .select('amount')
              .eq('contract_id', contractId)
              .eq('company_id', companyId)
              .in('payment_status', ['completed', 'paid']),
          ]);
          if (contractResult.error) throw contractResult.error;
          if (paymentsResult.error) throw paymentsResult.error;
          contractAmount = Number(contractResult.data.contract_amount || 0);
          monthlyAmount = Number(contractResult.data.monthly_amount || 0);
          totalPaid = (paymentsResult.data || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        }

        if (invoiceId) {
          const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('contract_id, total_amount, paid_amount, balance_due, status, payment_status')
            .eq('id', invoiceId)
            .eq('company_id', companyId)
            .single();
          if (invoiceError) throw invoiceError;
          if (contractId && invoice.contract_id && invoice.contract_id !== contractId) {
            throw new Error('الفاتورة لا تتبع العقد المحدد');
          }
          if (invoice.status === 'cancelled' || invoice.payment_status === 'cancelled') {
            throw new Error('لا يمكن تسجيل دفعة على فاتورة ملغاة');
          }
          invoiceBalance = Math.max(
            Number(invoice.balance_due ?? Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)),
            0
          );
        }

        const newTotal = totalPaid + amount;

        // Rule 1: Check if payment is suspiciously large
        const maxPaymentThreshold = Math.max(monthlyAmount * 10, 50000);
        if (monthlyAmount > 0 && amount > maxPaymentThreshold) {
          return {
            isValid: false,
            isWarning: false,
            isBlocked: true,
            message: `المبلغ (QAR ${amount.toLocaleString()}) كبير جداً. الحد الأقصى المسموح به هو QAR ${maxPaymentThreshold.toLocaleString()} (10× المبلغ الشهري)`,
            warningLevel: 'error',
            details: {
              contractAmount,
              totalPaid,
              newTotal,
              monthlyAmount,
              maxPayment: maxPaymentThreshold
            }
          };
        }

        if (invoiceId && amount > invoiceBalance + 0.001) {
          const overpaymentAmount = amount - invoiceBalance;
          return {
            isValid: false,
            isWarning: false,
            isBlocked: true,
            message: `مبلغ الدفعة يتجاوز رصيد الفاتورة بمقدار ${currency} ${overpaymentAmount.toLocaleString()}`,
            warningLevel: 'error',
            details: { contractAmount, totalPaid, newTotal, monthlyAmount, maxPayment: maxPaymentThreshold, overpaymentAmount }
          };
        }

        if (contractAmount > 0) {
          if (newTotal > contractAmount + 0.001) {
            const overpaymentAmount = newTotal - contractAmount;
            return {
              isValid: false,
              isWarning: false,
              isBlocked: true,
              message: `هذه الدفعة ستؤدي إلى دفع مبلغ زائد قدره QAR ${overpaymentAmount.toLocaleString()}. المجموع الحالي: QAR ${totalPaid.toLocaleString()}، مبلغ العقد: QAR ${contractAmount.toLocaleString()}`,
              warningLevel: 'error',
              details: {
                contractAmount,
                totalPaid,
                newTotal,
                monthlyAmount,
                maxPayment: maxPaymentThreshold,
                overpaymentAmount
              }
            };
          }
        }

        if (invoiceBalance > 0) {
          const difference = Math.abs(amount - invoiceBalance);
          const percentDifference = (difference / invoiceBalance) * 100;

          if (difference > (invoiceBalance * 0.20)) {
            return {
              isValid: true,
              isWarning: true,
              isBlocked: false,
              message: `تنبيه: المبلغ (${currency} ${amount.toLocaleString()}) يختلف عن رصيد الفاتورة (${currency} ${invoiceBalance.toLocaleString()}) بنسبة ${percentDifference.toFixed(0)}%. يرجى التحقق من صحة المبلغ.`,
              warningLevel: 'warning',
              details: {
                contractAmount,
                totalPaid,
                newTotal,
                monthlyAmount,
                maxPayment: maxPaymentThreshold
              }
            };
          }
        }

        // All checks passed
        return {
          isValid: true,
          isWarning: false,
          isBlocked: false,
          message: '',
          warningLevel: 'info',
          details: {
            contractAmount,
            totalPaid,
            newTotal,
            monthlyAmount,
            maxPayment: maxPaymentThreshold
          }
        };

      } catch (error) {
        console.error('Error validating payment:', error);
        return {
          isValid: false,
          isWarning: false,
          isBlocked: true,
          message: error instanceof Error ? error.message : 'تعذر التحقق من الدفعة؛ تم إيقاف التسجيل لحماية البيانات المالية',
          warningLevel: 'error'
        };
      }
    }
  };
}

export function usePaymentValidationMessages() {
  return {
    getSuspiciousAmountMessage: (amount: number, maxAllowed: number) =>
      `المبلغ (QAR ${amount.toLocaleString()}) يتجاوز الحد المسموح به (QAR ${maxAllowed.toLocaleString()}). يُرجى التحقق من صحة المبلغ.`,

    getOverpaymentMessage: (currentPaid: number, contractAmount: number, newTotal: number) =>
      `هذه الدفعة ستؤدي إلى تجاوز إجمالي المدفوعات (QAR ${newTotal.toLocaleString()}) مبلغ العقد (QAR ${contractAmount.toLocaleString()}). الإجمالي الحالي: QAR ${currentPaid.toLocaleString()}.`,

    getInvoiceDifferenceMessage: (paymentAmount: number, invoiceAmount: number, difference: number) =>
      `المبلغ (QAR ${paymentAmount.toLocaleString()}) يختلف عن مبلغ الفاتورة (QAR ${invoiceAmount.toLocaleString()}) بمقدار QAR ${difference.toLocaleString()}.`,
  };
}
