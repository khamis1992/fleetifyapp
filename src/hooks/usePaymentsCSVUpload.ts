import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { normalizeCsvHeaders } from "@/utils/csvHeaderMapping";
import { parseNumber } from "@/utils/numberFormatter";
import { extractContractFromPaymentData } from "@/utils/contractNumberExtraction";
import { useBulkPaymentOperations } from "./useBulkPaymentOperations";
import { toast } from "sonner";
import { detectDateColumns, isDateColumn, suggestBestFormat, fixDatesInData } from "@/utils/dateDetection";

interface PaymentPreviewItem {
  rowNumber: number;
  data: any;
  paidAmount: number;
  totalAmount?: number;
  balance?: number;
  hasBalance: boolean;
  isZeroPayment: boolean;
  warnings: string[];
  lateFineAmount?: number;
  lateFineStatus?: 'none' | 'paid' | 'waived' | 'pending';
  lateFineType?: 'none' | 'separate_payment' | 'included_with_payment' | 'waived';
  lateFineWaiverReason?: string;
  contractInfo?: {
    contract_id: string;
    contract_number: string;
    contract_amount: number;
    balance_due: number;
    payment_status: string;
    days_overdue?: number;
    late_fine_amount?: number;
  };
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
  
  // استخدام العمليات المجمعة المحسنة
  const { bulkUploadPayments } = useBulkPaymentOperations();

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
    late_fine_amount: 'number' as const,
    late_fine_handling: 'text' as const, // included | separate | waived
    late_fine_waiver_reason: 'text' as const,
    
    // حقول جديدة لدعم الجدول المرفوع
    agreement_number: 'text' as const,        // رقم الاتفاقية
    due_date: 'date' as const,               // تاريخ الاستحقاق
    original_due_date: 'date' as const,      // تاريخ الاستحقاق الأصلي
    late_fine_days_overdue: 'number' as const, // أيام التأخير
    reconciliation_status: 'text' as const,  // حالة التسوية
    payment_method: 'text' as const,         // طريقة الدفع
    description: 'text' as const,            // وصف الدفعة
    description_type: 'text' as const,       // نوع الوصف
    type: 'text' as const,                   // نوع العملية (INCOME/EXPENSE)
    payment_status: 'text' as const,         // حالة الدفع (completed, pending, etc.)
  };

  const paymentRequiredFields = ['payment_date', 'amount'];

  const enhancePaymentDataWithDates = (data: any[]): any[] => {
    try {
      // اكتشاف الأعمدة التي تحتوي على تواريخ
      const columnResults = detectDateColumns(data);
      const columnFormats: { [column: string]: any } = {};
      
      // تحديد تنسيقات التواريخ للأعمدة ذات الصلة (أكثر ذكاءً)
      for (const [column, results] of Object.entries(columnResults)) {
        const isDateLikeColumn = 
          column.includes('date') || 
          column.includes('تاريخ') ||
          column === 'payment_date' ||
          column === 'original_due_date' ||
          column.endsWith('_date') ||
          column.includes('due') ||
          column.includes('استحقاق') ||
          column.includes('انتهاء');
          
        if (isDateLikeColumn && isDateColumn(results, 50)) { // خفض threshold إلى 50%
          const bestFormat = suggestBestFormat(results);
          if (bestFormat) {
            columnFormats[column] = bestFormat;
            console.log(`🗓️ تم اكتشاف عمود تاريخ: ${column} بتنسيق ${bestFormat.label}`);
          }
        }
      }
      
      // إصلاح التواريخ في البيانات
      if (Object.keys(columnFormats).length > 0) {
        console.log('📅 جميع أعمدة التواريخ المكتشفة:', Object.keys(columnFormats));
        return fixDatesInData(data, columnFormats);
      } else {
        console.warn('⚠️ لم يتم اكتشاف أي أعمدة تواريخ في البيانات');
        // إضافة معلومات تشخيصية
        console.log('الأعمدة الموجودة:', Object.keys(data[0] || {}));
        console.log('نتائج اكتشاف التواريخ:', columnResults);
      }
      
      return data;
    } catch (error) {
      console.error('❌ خطأ في معالجة التواريخ:', error);
      return data; // إرجاع البيانات الأصلية في حالة الخطأ
    }
  };

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
      'agreement_number',
      'due_date',
      'original_due_date',
      'late_fine_days_overdue',
      'late_fine_amount',
      'late_fine_handling',
      'late_fine_waiver_reason',
      'reconciliation_status',
      'description',
      'description_type',
      'type',
      'payment_status',
      'notes'
    ];

    const exampleReceipt = [
      'receipt',
      'cash',
      '2025-01-15',
      '1780',
      '1780',
      '0',
      'REF-123',
      'PAY-0001',
      'شركة الهدى',
      '',
      'INV-2025-001',
      'CON-001',
      'LTO2024177',
      '2024-07-01',
      '2024-07-01',
      '0',
      '0',
      'none',
      '',
      'completed',
      'JULY RENT',
      'INCOME',
      'INCOME',
      'completed',
      'قبض إيجار شهر يوليو'
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
      '',
      '2025-01-20',
      '2025-01-15',
      '3',
      '15.000',
      'included',
      'تأخير بسيط',
      'completed',
      'خدمات استشارية',
      'EXPENSE',
      'EXPENSE',
      'completed',
      'صرف كامل عبر حوالة بنكية مع غرامة تأخير'
    ];

    // إضافة أمثلة أخرى لتوضيح خيارات معالجة الغرامات
    const examplePayment2 = [
      'receipt',
      'cash', 
      '2025-01-19',
      '500.000',
      '500.000',
      '0',
      'CASH-123',
      'LTO2024177',
      '',
      'شركة الخليج للتجارة',
      '',
      '',
      '',
      '2025-01-19',
      '2025-01-15', 
      '4',
      '20.000',
      'separate',
      'تأخير في الدفع',
      'completed',
      'إيجار شهري',
      'INCOME',
      'INCOME', 
      'completed',
      'قبض نقدي مع غرامة تأخير منفصلة'
    ];

    const examplePayment3 = [
      'receipt',
      'check',
      '2025-01-20', 
      '300.000',
      '300.000',
      '0',
      'CHK-456',
      'LTO2024200',
      '',
      'مؤسسة النور',
      '',
      '',
      '',
      '2025-01-20',
      '2025-01-18',
      '2', 
      '10.000',
      'waived',
      'عميل مميز - إعفاء',
      'completed',
      'إيجار أسبوعي',
      'INCOME',
      'INCOME',
      'completed',
      'قبض بشيك مع إعفاء من غرامة التأخير'
    ];

    const csv = [
      headers.join(','), 
      exampleReceipt.join(','), 
      examplePayment.join(','),
      examplePayment2.join(','),
      examplePayment3.join(',')
    ].join('\n');
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

  const findContractByMultipleIdentifiers = async (
    agreementNumber?: string,
    contractNumber?: string,
    targetCompanyId?: string
  ): Promise<{
    contract_id?: string;
    contract_info?: any;
    confidence?: number;
  }> => {
    if (!agreementNumber && !contractNumber) return {};
    
    // البحث برقم الاتفاقية أولاً (أولوية عالية)
    if (agreementNumber) {
      const { data: agreementData } = await supabase
        .from('contracts')
        .select('id, contract_number, contract_amount, balance_due, payment_status, days_overdue, late_fine_amount, total_paid, description')
        .eq('company_id', targetCompanyId)
        .or(`contract_number.eq.${agreementNumber},description.ilike.%${agreementNumber}%`)
        .limit(5);
      
      if (agreementData && agreementData.length > 0) {
        // ترتيب النتائج حسب دقة التطابق
        const exactMatch = agreementData.find(c => c.contract_number === agreementNumber);
        const bestMatch = exactMatch || agreementData[0];
        
        return {
          contract_id: bestMatch.id,
          confidence: exactMatch ? 1.0 : 0.8,
          contract_info: {
            contract_id: bestMatch.id,
            contract_number: bestMatch.contract_number,
            contract_amount: bestMatch.contract_amount,
            balance_due: bestMatch.balance_due || 0,
            payment_status: bestMatch.payment_status || 'unpaid',
            days_overdue: bestMatch.days_overdue || 0,
            late_fine_amount: bestMatch.late_fine_amount || 0,
            total_paid: bestMatch.total_paid || 0
          }
        };
      }
    }
    
    // البحث برقم العقد التقليدي كبديل
    if (contractNumber) {
      const { data: contractData } = await supabase
        .from('contracts')
        .select('id, contract_number, contract_amount, balance_due, payment_status, days_overdue, late_fine_amount, total_paid')
        .eq('company_id', targetCompanyId)
        .eq('contract_number', contractNumber)
        .limit(1)
        .maybeSingle();
      
      if (contractData) {
        return {
          contract_id: contractData.id,
          confidence: 0.95,
          contract_info: {
            contract_id: contractData.id,
            contract_number: contractData.contract_number,
            contract_amount: contractData.contract_amount,
            balance_due: contractData.balance_due || 0,
            payment_status: contractData.payment_status || 'unpaid',
            days_overdue: contractData.days_overdue || 0,
            late_fine_amount: contractData.late_fine_amount || 0,
            total_paid: contractData.total_paid || 0
          }
        };
      }
    }
    
    return {};
  };

  // الحفاظ على الدالة القديمة للتوافق مع الكود الموجود
  const findContractId = async (contractNumber?: string, targetCompanyId?: string): Promise<{
    contract_id?: string;
    contract_info?: any;
  }> => {
    const result = await findContractByMultipleIdentifiers(contractNumber, contractNumber, targetCompanyId);
    return {
      contract_id: result.contract_id,
      contract_info: result.contract_info
    };
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

  // Helper functions for data analysis and validation
  const analyzeDataStructure = (data: any[]) => {
    if (!data || data.length === 0) return { isEmpty: true };
    
    const sampleRow = data[0];
    const normalizedSample = normalizeCsvHeaders(sampleRow);
    const detectedColumns = Object.keys(normalizedSample);
    const requiredFields = ['payment_date', 'amount'];
    
    return {
      isEmpty: false,
      totalRows: data.length,
      detectedColumns,
      requiredFields,
      missingRequired: requiredFields.filter(field => !detectedColumns.includes(field)),
      hasPaymentDate: detectedColumns.includes('payment_date'),
      hasAmount: detectedColumns.includes('amount') || detectedColumns.includes('amount_paid'),
      columnMapping: detectedColumns.reduce((map, col) => {
        map[col] = normalizedSample[col];
        return map;
      }, {} as Record<string, any>)
    };
  };

  const hasRequiredPaymentFields = (row: any) => {
    const hasDate = row.payment_date && String(row.payment_date).trim() !== '';
    const hasAmount = (row.amount && parseNumber(row.amount) > 0) || 
                     (row.amount_paid && parseNumber(row.amount_paid) > 0);
    return hasDate && hasAmount;
  };

  const findMissingRequiredFields = (row: any) => {
    const missing = [];
    if (!row.payment_date || String(row.payment_date).trim() === '') {
      missing.push('تاريخ الدفع (payment_date)');
    }
    if ((!row.amount || parseNumber(row.amount) <= 0) && 
        (!row.amount_paid || parseNumber(row.amount_paid) <= 0)) {
      missing.push('مبلغ الدفع (amount أو amount_paid)');
    }
    return missing;
  };

  const analyzePaymentData = async (rows: any[], targetCompanyId?: string): Promise<PaymentPreviewItem[]> => {
    const companyIdToUse = targetCompanyId || companyId;
    const items: PaymentPreviewItem[] = [];
    
    // إضافة timeout للعملية الكاملة (20 ثانية للتحليل)
    const analysisTimeoutMs = 20000;
    const startTime = Date.now();
    
    console.log(`📊 بدء تحليل ${rows.length} صف - مهلة زمنية: ${analysisTimeoutMs / 1000} ثانية`);
    
    for (let index = 0; index < rows.length; index++) {
      // فحص الوقت المنقضي
      if (Date.now() - startTime > analysisTimeoutMs) {
        console.warn(`⏰ انتهت مهلة التحليل عند الصف ${index + 1} من ${rows.length}`);
        toast.warning(`تم التوقف عند الصف ${index + 1} بسبب انتهاء المهلة الزمنية`);
        break;
      }
      
      const row = rows[index];
      const normalizedRow = normalizeCsvHeaders(row);
      
      // Parse amounts
      const amount = parseNumber(normalizedRow.amount || 0);
      const amountPaid = parseNumber(normalizedRow.amount_paid || normalizedRow.paid_amount || amount);
      const totalAmount = parseNumber(normalizedRow.total_amount || normalizedRow.amount || 0);
      const balance = parseNumber(normalizedRow.balance || 0);
      const lateFineAmount = parseNumber(normalizedRow.late_fine_amount || 0);
      
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
      
      // Look up contract info using enhanced search with timeout
      let contractInfo: any = undefined;
      
      // محاولة استخراج رقم العقد من البيانات
      const extractedContract = extractContractFromPaymentData(normalizedRow);
      const agreementNumber = normalizedRow.agreement_number || (extractedContract?.source === 'extracted' ? extractedContract.contractNumber : null);
      const contractNumber = normalizedRow.contract_number || (extractedContract?.source === 'direct' ? extractedContract.contractNumber : null);
      
      if ((agreementNumber || contractNumber) && companyIdToUse) {
        try {
          // تطبيق timeout على البحث عن العقد (2 ثانية لكل بحث)
          const contractSearchPromise = findContractByMultipleIdentifiers(
            agreementNumber, 
            contractNumber, 
            companyIdToUse
          );
          
          const timeoutPromise = new Promise<{ contract_info?: any; confidence?: number }>((_, reject) => {
            setTimeout(() => reject(new Error('Contract search timeout')), 2000);
          });
          
          const { contract_info, confidence } = await Promise.race([
            contractSearchPromise,
            timeoutPromise
          ]);
          
          if (contract_info) {
            contractInfo = { ...contract_info, confidence };
            
            // Add confidence indicator to warnings
            if (confidence && confidence < 1.0) {
              warnings.push(`تطابق جزئي مع العقد (${Math.round(confidence * 100)}%): ${contract_info.contract_number}`);
            }
            
            // Add contract-specific warnings
            if (finalPaidAmount > contract_info.balance_due && contract_info.balance_due > 0) {
              warnings.push(`المبلغ المدفوع (${finalPaidAmount}) أكبر من رصيد العقد (${contract_info.balance_due})`);
            }
            
            if (contract_info.days_overdue > 0) {
              warnings.push(`العقد متأخر ${contract_info.days_overdue} يوم - غرامة: ${contract_info.late_fine_amount || 0}`);
            }
            
            if (contract_info.payment_status === 'paid') {
              warnings.push('العقد مسدد بالكامل');
            }
            
            // تحذيرات خاصة بأيام التأخير
            const lateDaysFromData = parseNumber(normalizedRow.late_fine_days_overdue || 0);
            if (lateDaysFromData > 0 && lateDaysFromData !== contract_info.days_overdue) {
              warnings.push(`تضارب في أيام التأخير: البيانات (${lateDaysFromData}) vs العقد (${contract_info.days_overdue})`);
            }
          } else {
            const searchTerm = agreementNumber || contractNumber;
            warnings.push(`لم يتم العثور على العقد: ${searchTerm}`);
          }
        } catch (error) {
          const searchTerm = agreementNumber || contractNumber;
          if (error instanceof Error && error.message.includes('timeout')) {
            warnings.push(`انتهت مهلة البحث عن العقد: ${searchTerm}`);
            console.warn(`⏰ انتهت مهلة البحث عن العقد للصف ${index + 1}:`, searchTerm);
          } else {
            warnings.push(`خطأ في البحث عن العقد: ${searchTerm}`);
            console.error(`❌ خطأ في البحث عن العقد للصف ${index + 1}:`, error);
          }
        }
      }
      
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

      // Process late fine handling
      const lateFineHandling = normalizedRow.late_fine_handling?.toLowerCase() || 'none';
      let lateFineStatus: 'none' | 'paid' | 'waived' | 'pending' = 'none';
      let lateFineType: 'none' | 'separate_payment' | 'included_with_payment' | 'waived' = 'none';
      
      if (lateFineAmount > 0) {
        switch (lateFineHandling) {
          case 'included':
          case 'include':
          case 'مدمج':
            lateFineStatus = 'paid';
            lateFineType = 'included_with_payment';
            break;
          case 'separate':
          case 'منفصل':
            lateFineStatus = 'pending';
            lateFineType = 'separate_payment';
            break;
          case 'waived':
          case 'إعفاء':
          case 'معفى':
            lateFineStatus = 'waived';
            lateFineType = 'waived';
            break;
          default:
            lateFineStatus = 'pending';
            lateFineType = 'none';
            warnings.push(`طريقة معالجة الغرامة غير واضحة: ${lateFineHandling}`);
        }
        
        if (lateFineType === 'included_with_payment' && finalPaidAmount < lateFineAmount) {
          warnings.push(`المبلغ المدفوع أقل من الغرامة المطلوبة (${lateFineAmount})`);
        }
      }
      
      items.push({
        rowNumber: row.rowNumber || index + 2,
        data: { ...normalizedRow, amount: finalPaidAmount },
        paidAmount: finalPaidAmount,
        totalAmount: totalAmount > 0 ? totalAmount : undefined,
        balance: finalBalance > 0 ? finalBalance : undefined,
        hasBalance: finalBalance > 0,
        isZeroPayment: finalPaidAmount <= 0,
        warnings,
        lateFineAmount: lateFineAmount > 0 ? lateFineAmount : undefined,
        lateFineStatus,
        lateFineType,
        lateFineWaiverReason: normalizedRow.late_fine_waiver_reason,
        contractInfo
      });
    }
    
    return items;
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
      balanceHandling?: 'ignore' | 'record_debt' | 'create_invoice';
    }
  ): Promise<CSVUploadResults> => {
    const targetCompanyId = options?.targetCompanyId || companyId;
    
    console.log('📊 بدء معالجة CSV:', {
      rowsCount: rows.length,
      targetCompanyId,
      options
    });
    
    // تطبيق التحسينات على التواريخ قبل المعالجة
    const enhancedRows = enhancePaymentDataWithDates(rows);
    
    // تحليل مفصل للبيانات قبل المعالجة
    const dataAnalysis = analyzeDataStructure(enhancedRows);
    console.log('🔍 تحليل هيكل البيانات:', dataAnalysis);
    
    // If in preview mode, just return analyzed data with enhanced error handling
    if (options?.previewMode) {
      try {
        console.log('🔍 بدء وضع المعاينة والتحليل الذكي...');
        const previewData = await analyzePaymentData(enhancedRows, targetCompanyId);
        console.log(`✅ تم تحليل ${previewData.length} عنصر بنجاح`);
        
        return {
          total: enhancedRows.length,
          successful: previewData.length,
          failed: 0,
          skipped: enhancedRows.length - previewData.length,
          errors: [],
          previewData
        };
      } catch (error) {
        console.error('❌ خطأ في وضع المعاينة:', error);
        toast.error('فشل في تحليل البيانات - سيتم المتابعة بدون تحليل ذكي');
        
        // إرجاع بيانات أساسية بدون تحليل ذكي
        const basicPreviewData = enhancedRows.map((row, index) => {
          const normalizedRow = normalizeCsvHeaders(row);
          const amount = parseNumber(normalizedRow.amount || normalizedRow.amount_paid || 0);
          
          return {
            rowNumber: row.rowNumber || index + 2,
            data: normalizedRow,
            paidAmount: amount,
            hasBalance: false,
            isZeroPayment: amount <= 0,
            warnings: ['تم تخطي التحليل الذكي بسبب خطأ تقني'],
            lateFineStatus: 'none' as const,
            lateFineType: 'none' as const
          };
        });
        
        return {
          total: enhancedRows.length,
          successful: basicPreviewData.length,
          failed: 0,
          skipped: 0,
          errors: [{ row: 0, message: `خطأ في التحليل: ${error instanceof Error ? error.message : 'خطأ غير متوقع'}` }],
          previewData: basicPreviewData
        };
      }
    }
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
    
    try {
      console.log('🚀 [UPLOAD] Starting payment upload process...');

    // Prepare payment number sequencing
    let lastNumber = await getLastPaymentNumber(targetCompanyId);

    // Pre-resolve any invoice/customer/vendor ids when provided
    for (let i = 0; i < enhancedRows.length; i++) {
      try {
        const raw = enhancedRows[i] || {};
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

      // Resolve relations using enhanced search
      const invoice_id = await findInvoiceId(raw.invoice_id || raw.invoice_number, targetCompanyId);
      const { contract_id } = await findContractByMultipleIdentifiers(
        raw.agreement_number, 
        raw.contract_number, 
        targetCompanyId
      );
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
                contract_id: contract_id || null,
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

      // Process late fine data
      const lateFineAmount = parseFloat(String(raw.late_fine_amount || '0').replace(/[,\s]/g, '')) || 0;
      const lateFineHandling = raw.late_fine_handling?.toLowerCase() || 'none';
      let lateFineStatus: 'none' | 'paid' | 'waived' | 'pending' = 'none';
      let lateFineType: 'none' | 'separate_payment' | 'included_with_payment' | 'waived' = 'none';
      
      if (lateFineAmount > 0) {
        switch (lateFineHandling) {
          case 'included':
          case 'include':
          case 'مدمج':
            lateFineStatus = 'paid';
            lateFineType = 'included_with_payment';
            break;
          case 'separate':
          case 'منفصل':
            lateFineStatus = 'pending';
            lateFineType = 'separate_payment';
            break;
          case 'waived':
          case 'إعفاء':
          case 'معفى':
            lateFineStatus = 'waived';
            lateFineType = 'waived';
            break;
          default:
            lateFineStatus = 'pending';
            lateFineType = 'none';
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
          notes: raw.notes || raw.description || null,
          customer_id: customer_id || null,
          vendor_id: vendor_id || null,
          invoice_id: invoice_id || null,
          contract_id: contract_id || null,
          currency: raw.currency || null,
          check_number: raw.check_number || null,
          bank_account: raw.bank_account || null,
          payment_status: raw.payment_status || 'completed',
          created_by: user.id,
          late_fine_amount: lateFineAmount,
          late_fine_status: lateFineStatus,
          late_fine_type: lateFineType,
          late_fine_waiver_reason: raw.late_fine_waiver_reason || null,
          
          // الحقول الجديدة المضافة
          agreement_number: raw.agreement_number || null,
          due_date: raw.due_date || null,
          original_due_date: raw.original_due_date || null,
          late_fine_days_overdue: parseNumber(raw.late_fine_days_overdue || 0) || null,
          reconciliation_status: raw.reconciliation_status || 'pending',
          description_type: raw.description_type || raw.transaction_type || null,
        });
        if (error) {
          failed++;
          errors.push({ row: rowNumber, message: `فشل الحفظ: ${error.message}` });
          continue;
        }
        // Handle balance processing based on user selection
        const totalAmount = parseFloat(String(raw.total_amount || raw.amount || '0').replace(/[,\s]/g, '')) || amount;
        const balance = parseFloat(String(raw.balance || '0').replace(/[,\s]/g, '')) || Math.max(0, totalAmount - amount);
        
        if (balance > 0 && options?.balanceHandling && options.balanceHandling !== 'ignore') {
          if (options.balanceHandling === 'record_debt' && contract_id) {
            // Update contract balance_due to include the remaining balance
            try {
              const { data: contract, error: contractErr } = await supabase
                .from('contracts')
                .select('balance_due, total_paid')
                .eq('id', contract_id)
                .single();
              
              if (!contractErr && contract) {
                const newBalanceDue = (contract.balance_due || 0) + balance;
                await supabase
                  .from('contracts')
                  .update({
                    balance_due: newBalanceDue,
                    payment_status: newBalanceDue > 0 ? 'partial' : 'paid',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', contract_id);
              }
            } catch (error) {
              console.error('خطأ في تحديث رصيد العقد:', error);
            }
          } else if (options.balanceHandling === 'create_invoice' && (customer_id || contract_id)) {
            // Create invoice for remaining balance
            try {
              // Generate invoice number
              const { data: lastInvoice } = await supabase
                .from('invoices')
                .select('invoice_number')
                .eq('company_id', targetCompanyId)
                .order('created_at', { ascending: false })
                .limit(1);
              
              let invoiceNumber = 'INV-0001';
              if (lastInvoice && lastInvoice.length > 0) {
                const lastNum = parseInt(lastInvoice[0].invoice_number.split('-')[1] || '0');
                invoiceNumber = `INV-${String(lastNum + 1).padStart(4, '0')}`;
              }
              
              await supabase
                .from('invoices')
                .insert({
                  company_id: targetCompanyId,
                  customer_id: customer_id,
                  contract_id: contract_id,
                  invoice_number: invoiceNumber,
                  invoice_type: 'balance_due',
                  invoice_date: new Date().toISOString().split('T')[0],
                  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
                  subtotal: balance,
                  total_amount: balance,
                  balance_due: balance,
                  payment_status: 'unpaid',
                  notes: `فاتورة للرصيد المتبقي من دفعة ${payment_number}`,
                  created_by: user.id,
                });
            } catch (error) {
              console.error('خطأ في إنشاء فاتورة للرصيد المتبقي:', error);
            }
          }
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
      
      // Final progress update
      const finalProgress = Math.round(((i + 1) / enhancedRows.length) * 100);
      setProgress(finalProgress);
      
      if (finalProgress === 100 || i === enhancedRows.length - 1) {
        console.log(`✅ [UPLOAD] Completed processing all rows. Final progress: ${finalProgress}%`);
      }
      
    } catch (rowError) {
      console.error(`❌ [UPLOAD] Error processing row ${i + 1}:`, rowError);
      failed++;
      errors.push({ 
        row: enhancedRows[i]?.rowNumber || i + 2, 
        message: `خطأ في معالجة الصف: ${rowError.message || 'خطأ غير محدد'}` 
      });
    }
    }

    console.log(`📊 [UPLOAD] Final summary: ${successful} successful, ${failed} failed, ${skipped} skipped, ${errors.length} errors`);
    
    const summary = { total: enhancedRows.length, successful, failed, skipped, errors };
    setResults(summary);
    
    // Ensure we complete the upload process
    setProgress(100);
    setIsUploading(false);
    
    // Reset progress after a short delay
    setTimeout(() => {
      setProgress(0);
    }, 1000);
    
    return summary;
    
  } catch (error) {
    console.error('❌ [UPLOAD] Critical error during upload process:', error);
    
    // إضافة معلومات تشخيصية أكثر تفصيلاً
    let errorMessage = 'خطأ غير محدد في رفع البيانات';
    
    if (error.message) {
      errorMessage = `خطأ في رفع البيانات: ${error.message}`;
    }
    
    if (error.code) {
      errorMessage += ` (كود الخطأ: ${error.code})`;
    }
    
    // إضافة اقتراحات للحلول
    if (error.message?.includes('permission') || error.message?.includes('RLS')) {
      errorMessage += '\n💡 تلميح: تحقق من صلاحيات الوصول للشركة المحددة';
    } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
      errorMessage += '\n💡 تلميح: تحقق من الاتصال بالإنترنت وأعد المحاولة';
    } else if (error.message?.includes('validation')) {
      errorMessage += '\n💡 تلميح: تحقق من صحة البيانات المدخلة';
    }
    
    toast.error(errorMessage);
    
    // إضافة خيار إعادة المحاولة
    toast.message('هل تريد إعادة المحاولة؟', {
      description: 'انقر على زر الرفع مرة أخرى لإعادة المحاولة',
      duration: 5000
    });
    
    // Return error summary
    const errorSummary = {
      total: enhancedRows.length,
      successful,
      failed: enhancedRows.length - successful,
      skipped: 0,
      errors: [{ row: 0, message: `خطأ عام: ${error.message || 'خطأ غير محدد'}` }]
    };
    
    setResults(errorSummary);
    return errorSummary;
    
  } finally {
    console.log('🏁 [UPLOAD] Upload process finished, cleaning up...');
    setIsUploading(false);
    setProgress(0);
  }
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
    findContractByMultipleIdentifiers,
  };
}
