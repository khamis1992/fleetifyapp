import { useState, useCallback } from 'react';
import * as Sentry from "@sentry/react";
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

// 🧾 واجهات نظام الفواتير التلقائي

interface PaymentData {
  payment_number?: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  description?: string;
  due_date?: string;
  late_fine_handling?: string;
  late_fine_days_overdue?: number;
}

interface ContractData {
  id: string;
  contract_number: string;
  customer?: {
    full_name?: string;
  };
}

interface CustomerData {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

interface LateFineCalculation {
  isApplicable: boolean;
  cappedFine: number;
  daysOverdue: number;
  rawFine?: number;
  cappedAtMaxMonthly?: boolean;
}

interface AutoInvoiceRequest {
  payment: PaymentData;
  contract: ContractData;
  customer: CustomerData;
  lateFineCalculation?: LateFineCalculation;
  invoiceType: 'payment_received' | 'late_fine' | 'combined';
}

interface GeneratedInvoice {
  id: string;
  invoice_number: string;
  type: 'payment_received' | 'late_fine';
  amount: number;
  status: 'paid' | 'pending';
  created_at: string;
  description: string;
}

interface InvoiceGenerationResult {
  success: boolean;
  paymentInvoice?: GeneratedInvoice;
  lateFineInvoice?: GeneratedInvoice;
  errors: string[];
  warnings: string[];
}

export function useAutomaticInvoiceGenerator() {
  const { companyId, user } = useUnifiedCompanyAccess();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<InvoiceGenerationResult[]>([]);

  // 🎯 مولد أرقام الفواتير الذكي
  const generateInvoiceNumber = useCallback(async (type: 'payment' | 'fine'): Promise<string> => {
    const prefix = type === 'payment' ? 'PAY' : 'FINE';
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    
    // البحث عن آخر رقم فاتورة من نفس النوع
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .like('invoice_number', `${prefix}-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let sequence = 1;
    if (lastInvoice && lastInvoice.length > 0) {
      const lastNumber = lastInvoice[0].invoice_number;
      const sequenceMatch = lastNumber.match(/-(\d+)$/);
      if (sequenceMatch) {
        sequence = parseInt(sequenceMatch[1]) + 1;
      }
    }

    return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
  }, [companyId]);

  // 📝 مولد وصف الفاتورة الذكي
  const generateInvoiceDescription = useCallback((
    payment: PaymentData,
    contract: ContractData,
    type: 'payment' | 'fine'
  ): string => {
    const customerName = contract.customer?.full_name || 'عميل غير محدد';
    const contractNumber = contract.contract_number || 'غير محدد';
    
    if (type === 'payment') {
      const period = payment.description?.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{4}/i);
      const periodText = period ? period[0] : 'الفترة الحالية';
      
      return `فاتورة دفع إيجار - ${customerName} - العقد رقم ${contractNumber} - ${periodText}`;
    } else {
      const daysOverdue = payment.late_fine_days_overdue || 'غير محدد';
      return `فاتورة غرامة تأخير - ${customerName} - العقد رقم ${contractNumber} - ${daysOverdue} يوم تأخير`;
    }
  }, []);

  // 🏗️ إنشاء فاتورة الدفع
  const createPaymentInvoice = useCallback(async (
    payment: PaymentData,
    contract: ContractData,
    customer: CustomerData
  ): Promise<GeneratedInvoice> => {
    
    const invoiceNumber = await generateInvoiceNumber('payment');
    const description = generateInvoiceDescription(payment, contract, 'payment');
    
    // إنشاء الفاتورة في قاعدة البيانات
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        customer_id: customer.id,
        contract_id: contract.id,
        invoice_number: invoiceNumber,
        invoice_type: 'sale',
        invoice_date: payment.payment_date || new Date().toISOString().split('T')[0],
        due_date: payment.due_date || new Date().toISOString().split('T')[0],
        subtotal: payment.amount || 0,
        tax_amount: 0,
        total_amount: payment.amount || 0,
        status: 'paid', // مدفوعة لأنها من ملف المدفوعات
        notes: description,
        created_by: user?.id
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // إنشاء عنصر الفاتورة
    const { error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        line_number: 1,
        item_description: description,
        quantity: 1,
        unit_price: payment.amount || 0,
        line_total: payment.amount || 0,
        tax_rate: 0,
        tax_amount: 0
      });

    if (itemError) throw itemError;

    return {
      id: invoice.id,
      invoice_number: invoiceNumber,
      type: 'payment_received',
      amount: payment.amount || 0,
      status: 'paid',
      created_at: invoice.created_at,
      description
    };
  }, [companyId, user, generateInvoiceNumber, generateInvoiceDescription]);

  // ⚖️ إنشاء فاتورة الغرامة
  const createLateFineInvoice = useCallback(async (
    payment: PaymentData,
    contract: ContractData,
    customer: CustomerData,
    lateFineCalculation: LateFineCalculation
  ): Promise<GeneratedInvoice> => {
    
    const invoiceNumber = await generateInvoiceNumber('fine');
    const description = generateInvoiceDescription(payment, contract, 'fine');
    
    // تحديد حالة الفاتورة
    const fineStatus = payment.late_fine_handling === 'paid' || 
                      payment.late_fine_handling === 'included' ? 'paid' : 'pending';
    
    // إنشاء فاتورة الغرامة
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        customer_id: customer.id,
        contract_id: contract.id,
        invoice_number: invoiceNumber,
        invoice_type: 'sale',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: payment.due_date || new Date().toISOString().split('T')[0],
        subtotal: lateFineCalculation.cappedFine,
        tax_amount: 0,
        total_amount: lateFineCalculation.cappedFine,
        status: fineStatus,
        notes: `${description} - ${lateFineCalculation.daysOverdue} يوم × 120 ريال = ${lateFineCalculation.cappedFine} ريال`,
        created_by: user?.id
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // إنشاء عنصر فاتورة الغرامة
    const { error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        line_number: 1,
        item_description: `غرامة تأخير - ${lateFineCalculation.daysOverdue} يوم × 120 ريال`,
        quantity: lateFineCalculation.daysOverdue,
        unit_price: 120,
        line_total: lateFineCalculation.cappedFine,
        tax_rate: 0,
        tax_amount: 0
      });

    if (itemError) throw itemError;

    return {
      id: invoice.id,
      invoice_number: invoiceNumber,
      type: 'late_fine',
      amount: lateFineCalculation.cappedFine,
      status: fineStatus as 'paid' | 'pending',
      created_at: invoice.created_at,
      description
    };
  }, [companyId, user, generateInvoiceNumber, generateInvoiceDescription]);

  // 🚀 المعالج الرئيسي لإنشاء الفواتير
  const generateAutomaticInvoices = useCallback(async (
    requests: AutoInvoiceRequest[]
  ): Promise<InvoiceGenerationResult[]> => {
    
    setIsGenerating(true);
    const results: InvoiceGenerationResult[] = [];

    try {
      for (const request of requests) {
        const result: InvoiceGenerationResult = {
          success: false,
          errors: [],
          warnings: []
        };

        try {
          // إنشاء فاتورة الدفع
          if (request.invoiceType === 'payment_received' || request.invoiceType === 'combined') {
            try {
              result.paymentInvoice = await createPaymentInvoice(
                request.payment,
                request.contract,
                request.customer
              );

              console.log(`✅ تم إنشاء فاتورة الدفع: ${result.paymentInvoice.invoice_number}`);
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
              result.errors.push(`خطأ في إنشاء فاتورة الدفع: ${errorMessage}`);
            }
          }

          // إنشاء فاتورة الغرامة
          if ((request.invoiceType === 'late_fine' || request.invoiceType === 'combined') && 
              request.lateFineCalculation && 
              request.lateFineCalculation.isApplicable) {
            
            try {
              result.lateFineInvoice = await createLateFineInvoice(
                request.payment,
                request.contract,
                request.customer,
                request.lateFineCalculation
              );

              console.log(`✅ تم إنشاء فاتورة الغرامة: ${result.lateFineInvoice.invoice_number}`);
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
              result.errors.push(`خطأ في إنشاء فاتورة الغرامة: ${errorMessage}`);
            }
          }

          // ربط الدفعة بالعقد
          try {
            await supabase
              .from('payments')
              .upsert({
                company_id: companyId,
                contract_id: request.contract.id,
                customer_id: request.customer.id,
                payment_number: request.payment.payment_number || `PAY-${Date.now()}`,
                amount: request.payment.amount,
                payment_date: request.payment.payment_date,
                payment_method: request.payment.payment_method || 'cash',
                payment_type: 'contract_payment',
                payment_status: 'completed',
                reference_number: request.payment.reference_number,
                notes: request.payment.description,
                invoice_id: result.paymentInvoice?.id,
                created_by: user?.id
              });

            console.log(`✅ تم ربط الدفعة بالعقد: ${request.contract.contract_number}`);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
            result.errors.push(`خطأ في ربط الدفعة: ${errorMessage}`);
          }

          result.success = result.errors.length === 0;

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'خطأ عام غير معروف'
          result.errors.push(`خطأ عام: ${errorMessage}`);
        }

        results.push(result);
      }

      setGenerationResults(results);
      
      // إحصائيات النتائج
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalPaymentInvoices = results.filter(r => r.paymentInvoice).length;
      const totalFineInvoices = results.filter(r => r.lateFineInvoice).length;

      if (successful > 0) {
        toast.success(
          `تم إنشاء ${successful} عملية بنجاح - ${totalPaymentInvoices} فاتورة دفع، ${totalFineInvoices} فاتورة غرامة`
        );
      }

      if (failed > 0) {
        toast.error(`فشل في ${failed} عملية`);
      }

      return results;

    } finally {
      setIsGenerating(false);
    }
  }, [companyId, user, createPaymentInvoice, createLateFineInvoice]);

  // 📊 إحصائيات الفواتير المنشأة
  const getGenerationStatistics = useCallback(() => {
    const stats = {
      total: generationResults.length,
      successful: generationResults.filter(r => r.success).length,
      failed: generationResults.filter(r => !r.success).length,
      paymentInvoices: generationResults.filter(r => r.paymentInvoice).length,
      lateFineInvoices: generationResults.filter(r => r.lateFineInvoice).length,
      totalAmount: generationResults.reduce((sum, r) => {
        const paymentAmount = r.paymentInvoice?.amount || 0;
        const fineAmount = r.lateFineInvoice?.amount || 0;
        return sum + paymentAmount + fineAmount;
      }, 0)
    };

    return stats;
  }, [generationResults]);

  return {
    isGenerating,
    generationResults,
    generateAutomaticInvoices,
    createPaymentInvoice,
    createLateFineInvoice,
    getGenerationStatistics
  };
}
