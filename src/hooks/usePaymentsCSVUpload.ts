import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { normalizeCsvHeaders } from "@/utils/csv";
import { parseNumber } from "@/utils/numberFormatter";
import { toast } from "sonner";

interface PaymentPreviewItem {
  rowNumber: number;
  data: any;
  paidAmount: number;
  totalAmount?: number;
  balance?: number;
  hasBalance: boolean;
  isZeroPayment: boolean;
  warnings: string[];
}

interface CSVUploadResults {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  previewData?: PaymentPreviewItem[];
}

export function usePaymentsCSVUpload() {
  const { user, companyId, isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CSVUploadResults | null>(null);

  // Field types and required fields for SmartCSVUpload
  const paymentFieldTypes = {
    transaction_type: 'text' as const, // receipt | payment
    payment_type: 'text' as const,     // cash | check | bank_transfer | credit_card | debit_card
    payment_date: 'date' as const,
    amount: 'number' as const,
    amount_paid: 'number' as const,
    total_amount: 'number' as const,
    balance: 'number' as const,
    reference_number: 'text' as const,
    payment_number: 'text' as const,
    notes: 'text' as const,
    customer_id: 'text' as const,
    customer_name: 'text' as const,
    customer_phone: 'phone' as const,
    vendor_id: 'text' as const,
    vendor_name: 'text' as const,
    invoice_id: 'text' as const,
    invoice_number: 'text' as const,
    contract_id: 'text' as const,
    contract_number: 'text' as const,
    check_number: 'text' as const,
    bank_account: 'text' as const,
    currency: 'text' as const,
  };

  const paymentRequiredFields = ['payment_date', 'amount'];

  const downloadTemplate = () => {
    const headers = [
      'transaction_type',
      'payment_type',
      'payment_date',
      'amount_paid',
      'total_amount',
      'balance',
      'reference_number',
      'payment_number',
      'customer_name',
      'vendor_name',
      'invoice_number',
      'contract_number',
      'notes'
    ];

    const exampleReceipt = [
      'receipt',
      'cash',
      '2025-01-15',
      '150.000',
      '200.000',
      '50.000',
      'REF-123',
      'PAY-0001',
      'شركة الهدى',
      '',
      'INV-2025-001',
      '',
      'قبض دفعة جزئية'
    ];

    const examplePayment = [
      'payment',
      'bank_transfer',
      '2025-01-18',
      '250.000',
      '250.000',
      '0',
      'TRX-777',
      '',
      '',
      'مزود الخدمات الدولية',
      '',
      '',
      'صرف كامل عبر حوالة بنكية'
    ];

    const csv = [headers.join(','), exampleReceipt.join(','), examplePayment.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'payments_template.csv';
    link.click();
  };

  // Helpers
  const normalize = (s?: any) => (s ?? '').toString().trim().toLowerCase();

  type TxType = 'receipt' | 'payment';
  const normalizeTxType = (v?: any): TxType | undefined => {
    const s = normalize(v);
    if (!s) return undefined;
    if (['قبض','receipt','in','incoming','استلام'].includes(s)) return 'receipt';
    if (['صرف','دفع','payment','out','outgoing'].includes(s)) return 'payment';
    return undefined;
  };

  type PayMethod = 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'debit_card';
  const normalizePayMethod = (v?: any): PayMethod | undefined => {
    const s = normalize(v);
    const map: Record<string, PayMethod> = {
      'cash': 'cash', 'نقدي': 'cash', 'نقد': 'cash',
      'check': 'check', 'cheque': 'check', 'شيك': 'check',
      'bank transfer': 'bank_transfer', 'transfer': 'bank_transfer', 'wire': 'bank_transfer', 'حوالة': 'bank_transfer', 'حوالة بنكية': 'bank_transfer',
      'credit card': 'credit_card', 'visa': 'credit_card', 'mastercard': 'credit_card', 'بطاقة ائتمان': 'credit_card',
      'debit card': 'debit_card', 'بطاقة خصم': 'debit_card'
    };
    return map[s];
  };

  const findCustomerId = async (name?: string, id?: string, phone?: string, targetCompanyId?: string): Promise<string | undefined> => {
    if (id) return id;
    const like = `%${name || ''}%`;
    if (!like || like === '%%') return undefined;
    const { data } = await supabase
      .from('customers')
      .select('id, company_name, first_name, last_name, phone')
      .eq('company_id', targetCompanyId)
      .or(`company_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(5);
    return data && data.length === 1 ? data[0].id : undefined;
  };

  const findVendorId = async (name?: string, id?: string, targetCompanyId?: string): Promise<string | undefined> => {
    if (id) return id;
    const like = `%${name || ''}%`;
    if (!like || like === '%%') return undefined;
    const { data } = await supabase
      .from('vendors')
      .select('id, vendor_name')
      .eq('company_id', targetCompanyId)
      .ilike('vendor_name', like)
      .limit(5);
    return data && data.length === 1 ? data[0].id : undefined;
  };

  const findInvoiceId = async (invoiceNumber?: string, targetCompanyId?: string): Promise<string | undefined> => {
    if (!invoiceNumber) return undefined;
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('company_id', targetCompanyId)
      .eq('invoice_number', invoiceNumber)
      .limit(1)
      .maybeSingle();
    return (data as any)?.id;
  };

  const getLastPaymentNumber = async (targetCompanyId: string): Promise<number> => {
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const last = data[0].payment_number || 'PAY-0000';
      const num = parseInt(String(last).split('-')[1] || '0');
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const formatPaymentNumber = (n: number) => `PAY-${String(n).padStart(4, '0')}`;

  const analyzePaymentData = (rows: any[]): PaymentPreviewItem[] => {
    return rows.map((row, index) => {
      const normalizedRow = normalizeCsvHeaders(row);
      
      // Parse amounts
      const amount = parseNumber(normalizedRow.amount || 0);
      const amountPaid = parseNumber(normalizedRow.amount_paid || normalizedRow.paid_amount || amount);
      const totalAmount = parseNumber(normalizedRow.total_amount || normalizedRow.amount || 0);
      const balance = parseNumber(normalizedRow.balance || 0);
      
      // Calculate actual paid amount and balance
      let finalPaidAmount = amountPaid;
      let finalBalance = 0;
      
      // If we have both total_amount and amount_paid, use amount_paid as the paid amount
      if (normalizedRow.total_amount && normalizedRow.amount_paid !== undefined) {
        finalPaidAmount = amountPaid;
        finalBalance = totalAmount - amountPaid;
      }
      // If we have amount and balance, calculate paid amount
      else if (normalizedRow.amount && normalizedRow.balance !== undefined) {
        finalPaidAmount = amount - balance;
        finalBalance = balance;
      }
      // If only amount is provided, assume it's fully paid
      else {
        finalPaidAmount = amount;
        finalBalance = 0;
      }
      
      const warnings: string[] = [];
      
      // Validation warnings
      if (finalPaidAmount > totalAmount && totalAmount > 0) {
        warnings.push('المبلغ المدفوع أكبر من المبلغ الإجمالي');
      }
      
      if (finalBalance > 0) {
        warnings.push(`رصيد متبقي: ${finalBalance}`);
      }
      
      if (finalPaidAmount <= 0) {
        warnings.push('مبلغ مدفوع صفر أو سالب');
      }
      
      return {
        rowNumber: row.rowNumber || index + 2,
        data: { ...normalizedRow, amount: finalPaidAmount },
        paidAmount: finalPaidAmount,
        totalAmount: totalAmount > 0 ? totalAmount : undefined,
        balance: finalBalance > 0 ? finalBalance : undefined,
        hasBalance: finalBalance > 0,
        isZeroPayment: finalPaidAmount <= 0,
        warnings
      };
    });
  };

  const smartUploadPayments = async (
    rows: any[],
    options?: { 
      upsert?: boolean; 
      targetCompanyId?: string; 
      autoCreateCustomers?: boolean; 
      autoCompleteDates?: boolean; 
      autoCompleteType?: boolean; 
      autoCompleteAmounts?: boolean; 
      dryRun?: boolean;
      previewMode?: boolean;
    }
  ): Promise<CSVUploadResults> => {
    // If in preview mode, just return analyzed data
    if (options?.previewMode) {
      return {
        total: rows.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        previewData: analyzePaymentData(rows)
      };
    }

    const targetCompanyId = options?.targetCompanyId || companyId;
    if (!user?.id || !targetCompanyId) {
      toast.error('لا يمكن الرفع بدون مستخدم وشركة');
      return { total: 0, successful: 0, failed: 0, skipped: 0, errors: [{ row: 0, message: 'بيانات المستخدم/الشركة غير مكتملة' }] };
    }

    setIsUploading(true);
    setProgress(0);

    const errors: Array<{ row: number; message: string }> = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Prepare payment number sequencing
    let lastNumber = await getLastPaymentNumber(targetCompanyId);

    // Pre-resolve any invoice/customer/vendor ids when provided
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      const rowNumber = raw.rowNumber || i + 2;

      // Normalize fields
      const tx = normalizeTxType(raw.transaction_type) || (options?.autoCompleteType ? 'receipt' : undefined);
      const method = normalizePayMethod(raw.payment_type);
      const date = raw.payment_date || (options?.autoCompleteDates ? new Date().toISOString().split('T')[0] : undefined);
      const amount = parseFloat(String(raw.amount ?? raw.payment_amount ?? '').replace(/[,\s]/g, ''));

      if (!date) {
        failed++;
        errors.push({ row: rowNumber, message: 'تاريخ الدفع مفقود' });
        continue;
      }
      if (!amount || isNaN(amount) || amount <= 0) {
        failed++;
        errors.push({ row: rowNumber, message: 'المبلغ غير صالح' });
        continue;
      }

      // Determine direction fields
      const transaction_type: TxType = tx || 'receipt';
      const payment_method = transaction_type === 'receipt' ? 'received' : 'made';
      const payment_type: PayMethod = method || 'cash';

      // Resolve relations
      const invoice_id = await findInvoiceId(raw.invoice_id || raw.invoice_number, targetCompanyId);
      const customer_id = transaction_type === 'receipt'
        ? await findCustomerId(raw.customer_name, raw.customer_id, raw.customer_phone, targetCompanyId)
        : undefined;
      const vendor_id = transaction_type === 'payment'
        ? await findVendorId(raw.vendor_name, raw.vendor_id, targetCompanyId)
        : undefined;

      // Compute payment number
      let payment_number: string | undefined = raw.payment_number;
      if (!payment_number) {
        lastNumber += 1;
        payment_number = formatPaymentNumber(lastNumber);
      }

      // Duplicate check by payment_number
      if (payment_number) {
        const { data: existing } = await supabase
          .from('payments')
          .select('id')
          .eq('company_id', targetCompanyId)
          .eq('payment_number', payment_number)
          .limit(1);
        if (existing && existing.length > 0) {
          if (options?.upsert) {
            // Update existing
            if (!options?.dryRun) {
              await supabase.from('payments').update({
                payment_date: date,
                amount,
                payment_method,
                payment_type,
                transaction_type,
                reference_number: raw.reference_number || null,
                notes: raw.notes || null,
                customer_id: customer_id || null,
                vendor_id: vendor_id || null,
                invoice_id: invoice_id || null,
                currency: raw.currency || null,
                check_number: raw.check_number || null,
                bank_account: raw.bank_account || null,
                updated_at: new Date().toISOString(),
              }).eq('company_id', targetCompanyId).eq('payment_number', payment_number);
            }
            successful++;
            continue;
          } else {
            skipped++;
            continue;
          }
        }
      }

      if (!options?.dryRun) {
        const { error } = await supabase.from('payments').insert({
          company_id: targetCompanyId,
          payment_number,
          payment_date: date,
          amount,
          payment_method,
          payment_type,
          transaction_type,
          reference_number: raw.reference_number || null,
          notes: raw.notes || null,
          customer_id: customer_id || null,
          vendor_id: vendor_id || null,
          invoice_id: invoice_id || null,
          currency: raw.currency || null,
          check_number: raw.check_number || null,
          bank_account: raw.bank_account || null,
          payment_status: 'completed',
          created_by: user.id,
        });
        if (error) {
          failed++;
          errors.push({ row: rowNumber, message: `فشل الحفظ: ${error.message}` });
          continue;
        }
        // Update linked invoice totals if applicable (new inserts only)
        if (invoice_id && transaction_type === 'receipt') {
          const { data: invoice, error: invErr } = await supabase
            .from('invoices')
            .select('total_amount, paid_amount')
            .eq('id', invoice_id)
            .single();
          if (!invErr && invoice) {
            const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) + amount);
            const newBalanceDue = (invoice.total_amount || 0) - newPaidAmount;
            const newStatus = newPaidAmount >= (invoice.total_amount || 0)
              ? 'paid'
              : newPaidAmount > 0
                ? 'partial'
                : 'unpaid';
            await supabase
              .from('invoices')
              .update({
                paid_amount: newPaidAmount,
                balance_due: Math.max(0, newBalanceDue),
                payment_status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', invoice_id);
          }
        }
      }

      successful++;
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    const summary = { total: rows.length, successful, failed, skipped, errors };
    setResults(summary);
    setIsUploading(false);
    setProgress(0);
    return summary;
  };

  return {
    isUploading,
    progress,
    results,
    downloadTemplate,
    analyzePaymentData,
    paymentFieldTypes,
    paymentRequiredFields,
    smartUploadPayments,
  };
}
