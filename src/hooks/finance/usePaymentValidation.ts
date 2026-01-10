/**
 * Payment Validation Hook
 *
 * Validates payment amounts against contract limits to prevent overpayment
 */

import { useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useCompanyContext } from '@/hooks/company/useCompanyContext';

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
  const { companyId } = useCompanyContext();

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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.warn('Supabase credentials not found');
          return validationResult;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        let contractAmount = 0;
        let totalPaid = 0;
        let monthlyAmount = 0;
        let invoiceAmount = 0;

        // Get contract details if contract is linked
        if (contractId) {
          const { data: contract } = await supabase
            .from('contracts')
            .select('contract_amount, total_paid, monthly_amount')
            .eq('id', contractId)
            .single();

          if (contract) {
            contractAmount = contract.contract_amount || 0;
            totalPaid = contract.total_paid || 0;
            monthlyAmount = contract.monthly_amount || 0;
          }
        }

        // Get invoice details if invoice is linked
        if (invoiceId) {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('id', invoiceId)
            .single();

          if (invoice) {
            invoiceAmount = invoice.total_amount || 0;
          }
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

        // Rule 2: Check for overpayment
        if (contractAmount > 0) {
          const overpaymentThreshold = contractAmount * 1.10; // 10% buffer

          if (newTotal > overpaymentThreshold) {
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

        // Rule 3: Warn if payment differs significantly from invoice amount
        if (invoiceAmount > 0) {
          const difference = Math.abs(amount - invoiceAmount);
          const percentDifference = (difference / invoiceAmount) * 100;

          if (difference > (invoiceAmount * 0.20)) {
            return {
              isValid: true,
              isWarning: true,
              isBlocked: false,
              message: `تنبيه: المبلغ (QAR ${amount.toLocaleString()}) يختلف عن مبلغ الفاتورة (QAR ${invoiceAmount.toLocaleString()}) بنسبة ${percentDifference.toFixed(0)}%. يرجى التحقق من صحة المبلغ.`,
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
          isValid: true,
          isWarning: false,
          isBlocked: false,
          message: '',
          warningLevel: 'info'
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
