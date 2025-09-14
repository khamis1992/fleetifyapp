/**
 * Hook محسن لعمليات المدفوعات المجمعة (Bulk Operations)
 * يوفر معالجة سريعة للملفات الكبيرة مع تحسينات الأداء
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { normalizeCsvHeaders } from '@/utils/csvHeaderMapping';
import { parseNumber } from '@/utils/numberFormatter';
import { Constants } from '@/integrations/supabase/types';
import { CSVAutoFix, type AutoFixConfig } from '@/utils/csvAutoFix';
import { extractContractFromPaymentData, normalizeContractNumber } from '@/utils/contractNumberExtraction';

interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  processingTime: number;
}

export function useBulkPaymentOperations() {
  const { companyId } = useUnifiedCompanyAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoFixConfig, setAutoFixConfig] = useState<AutoFixConfig>({
    autoFillEmptyDates: true,
    autoFillEmptyPaymentMethods: true,
    autoFillEmptyTypes: true,
    autoCreateCustomers: true,
    normalizePaymentMethods: true,
    cleanNumericFields: true,
    defaultPaymentMethod: 'cash',
    defaultType: 'receipt'
  });

  // عملية رفع مجمعة محسنة
  const bulkUploadPayments = async (
    data: any[], 
    options: {
      batchSize?: number;
      autoCreateCustomers?: boolean;
      skipValidation?: boolean;
      useAutoFix?: boolean;
    } = {}
  ): Promise<BulkOperationResult & { 
    fixedData?: any[];
    fixes?: Array<{ row: number; field: string; original: any; fixed: any; reason: string }>;
    cleanedCSV?: string;
  }> => {
    const startTime = Date.now();
    const { batchSize = 100, autoCreateCustomers = false, skipValidation = false, useAutoFix = false } = options;
    
    console.log(`🚀 بدء العملية المجمعة للمدفوعات (${data.length} سجل)`);
    setIsProcessing(true);
    setProgress(0);

    try {
      if (!companyId) throw new Error('معرف الشركة غير متوفر');

      let processedData = data;
      let autoFixes: Array<{ row: number; field: string; original: any; fixed: any; reason: string }> = [];
      let cleanedCSV = '';

      // Apply auto-fix if enabled
      if (useAutoFix) {
        const autoFixer = new CSVAutoFix(autoFixConfig);
        const { fixedData, fixes } = autoFixer.autoFixData(data);
        processedData = fixedData;
        autoFixes = fixes;
        cleanedCSV = autoFixer.generateCleanedCSV(fixedData);
        
        console.log(`🔧 تم تطبيق الإصلاح التلقائي: ${fixes.length} إصلاح`);

        if (fixes.length > 0) {
          toast.success(`تم إصلاح ${fixes.length} خطأ تلقائياً في البيانات`);
        }
      }

      // تحضير البيانات للمعالجة المجمعة
      const { payments, errors: preparationErrors } = await prepareBulkPayments(processedData, companyId, { autoCreateCustomers, skipValidation });
      
      // تقسيم البيانات إلى مجموعات
      const batches = [];
      for (let i = 0; i < payments.length; i += batchSize) {
        batches.push(payments.slice(i, i + batchSize));
      }

      let successful = 0;
      let failed = 0;
      const errors: Array<{ row: number; message: string }> = [...preparationErrors];

      // معالجة كل مجموعة
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        try {
          console.log(`📦 معالجة المجموعة ${batchIndex + 1}/${batches.length} (${batch.length} عنصر)`);
          
          // إدراج مجمع باستخدام Supabase
          const { data: insertedData, error } = await supabase
            .from('payments')
            .insert(batch)
            .select('id');

          if (error) {
            console.error(`❌ خطأ في المجموعة ${batchIndex + 1}:`, error);
            failed += batch.length;
            batch.forEach((_, index) => {
              errors.push({
                row: batchIndex * batchSize + index + 1,
                message: `خطأ في المجموعة ${batchIndex + 1}: ${error.message}`
              });
            });
          } else {
            const insertedCount = insertedData?.length || batch.length;
            successful += insertedCount;
            console.log(`✅ تم إدراج ${insertedCount} مدفوعة من المجموعة ${batchIndex + 1}`);
          }
        } catch (batchError: any) {
          console.error(`❌ خطأ في معالجة المجموعة ${batchIndex + 1}:`, batchError);
          failed += batch.length;
          batch.forEach((_, index) => {
            errors.push({
              row: batchIndex * batchSize + index + 1,
              message: `خطأ في معالجة المجموعة ${batchIndex + 1}: ${batchError.message || 'خطأ غير معروف'}`
            });
          });
        }

        // تحديث التقدم
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
        setProgress(progress);
      }

      const processingTime = Date.now() - startTime;
      console.log(`🎯 انتهت العملية المجمعة في ${processingTime}ms`);
      console.log(`📊 النتائج النهائية: ${successful} نجح، ${failed} فشل، ${errors.length} خطأ`);

      return {
        total: data.length,
        successful,
        failed,
        errors,
        processingTime,
        fixedData: useAutoFix ? processedData : undefined,
        fixes: useAutoFix ? autoFixes : undefined,
        cleanedCSV: useAutoFix ? cleanedCSV : undefined
      };

    } catch (error: any) {
      console.error('❌ خطأ في العملية المجمعة:', error);
      toast.error(`خطأ في العملية المجمعة: ${error.message}`);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // تحضير البيانات للعملية المجمعة
  const prepareBulkPayments = async (
    data: any[], 
    companyId: string,
    options: {
      autoCreateCustomers?: boolean;
      skipValidation?: boolean;
    }
  ) => {
    const { autoCreateCustomers = false, skipValidation = false } = options;
    
    console.log('🔧 تحضير البيانات للعملية المجمعة...');
    
    try {
      // تحميل البيانات المرجعية مرة واحدة
      const [customersMap, contractsMap] = await Promise.all([
        loadCustomersMap(companyId),
        loadContractsMap(companyId)
      ]);

      // الحصول على آخر رقم مدفوعة
      let lastPaymentNumber = await getLastPaymentNumber(companyId);
      
      const payments = [];
      const errors: Array<{ row: number; message: string }> = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        try {
          const normalized = normalizeCsvHeaders(row);
          
          // تحديد معرف العميل
          let customerId: string | undefined;
          if (normalized.customer_name) {
            customerId = customersMap.get(normalized.customer_name.toLowerCase().trim());
          }

          // تحديد معرف العقد باستخدام agreement_number أو استخراج ذكي من النصوص
          let contractId: string | undefined;
          const extracted = extractContractFromPaymentData(normalized);
          const agreementCandidate = (normalized.agreement_number || normalized.contract_number || extracted?.contractNumber || '').toString().trim();
          if (agreementCandidate) {
            const contract = contractsMap.get(agreementCandidate) || contractsMap.get(normalizeContractNumber(agreementCandidate));
            contractId = contract?.id;
          }

          // إعداد بيانات المدفوعة
          const txType = normalizeTxType(normalized.transaction_type ?? normalized.type ?? normalized.description_type) || 'receipt';
          const methodInput = normalized.payment_method ?? normalized.payment_type ?? normalized.method ?? normalized.mode;
          let paymentType = normalizePaymentMethod(methodInput);
          let paymentMethod = txType === 'receipt' ? 'received' : 'made';
          
          // تسجيل مفصل للتشخيص
          console.log(`🔍 [ROW ${i + 1}] Payment method processing:`, {
            input: methodInput,
            normalized: paymentType,
            paymentMethod: paymentMethod,
            validMethods: Constants.public.Enums.payment_method,
            isValid: (Constants.public.Enums.payment_method as readonly string[]).includes(paymentType as any)
          });
          
          if (!(Constants.public.Enums.payment_method as readonly string[]).includes(paymentType as any)) {
            console.warn(`⚠️ طريقة دفع غير معروفة في السطر ${i + 1}:`, methodInput, '— سيتم استخدام cash');
            paymentType = 'cash';
          }

          const paymentData = {
            company_id: companyId,
            payment_number: normalized.payment_number || formatPaymentNumber(++lastPaymentNumber),
            payment_date: normalized.payment_date || new Date().toISOString().split('T')[0],
            amount: parseNumber(normalized.amount || normalized.amount_paid || 0),
            payment_method: paymentMethod,
            payment_type: paymentType,
            reference_number: normalized.reference_number || null,
            notes: (normalized.notes || normalized.description) || null,
            customer_id: customerId,
            contract_id: contractId,
            transaction_type: txType,
            currency: normalized.currency || 'QAR',
            payment_status: 'completed',
            agreement_number: agreementCandidate || null,
            due_date: normalized.due_date || null,
            original_due_date: normalized.original_due_date || null,
            late_fine_amount: parseNumber(normalized.late_fine_amount || 0) || null,
            late_fine_days_overdue: parseNumber(normalized.late_fine_days_overdue || 0) || null,
            reconciliation_status: normalized.reconciliation_status || null,
            description_type: normalized.description_type || normalized.transaction_type || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // تسجيل مفصل للبيانات قبل الإدراج
          console.log(`🔍 [ROW ${i + 1}] Final payment data:`, {
            payment_method: paymentData.payment_method,
            transaction_type: paymentData.transaction_type,
            amount: paymentData.amount,
            customer_id: paymentData.customer_id,
            contract_id: paymentData.contract_id
          });

          // التحقق من صحة البيانات إذا لم يتم تخطي التحقق
          if (!skipValidation) {
            const validationErrors = [];
            
            if (!paymentData.payment_date) {
              validationErrors.push('تاريخ الدفع مفقود');
            }
            
            if (paymentData.amount <= 0) {
              validationErrors.push('مبلغ الدفع يجب أن يكون أكبر من صفر');
            }
            
            if (!paymentData.payment_method) {
              validationErrors.push('طريقة الدفع مفقودة');
            }
            
            if (validationErrors.length > 0) {
              console.warn(`⚠️ تخطي السطر ${i + 1}: ${validationErrors.join(', ')}`);
              errors.push({ 
                row: i + 1, 
                message: `بيانات غير صحيحة: ${validationErrors.join(', ')}` 
              });
              continue;
            }
          }

          payments.push(paymentData);
        } catch (error: any) {
          console.warn(`⚠️ خطأ في تحضير السطر ${i + 1}:`, error);
          errors.push({ row: i + 1, message: error.message || 'خطأ في معالجة البيانات' });
        }
      }

      console.log(`✅ تم تحضير ${payments.length} مدفوعة من أصل ${data.length} سطر`);
      console.log(`⚠️ ${errors.length} أخطاء في التحضير`);
      
      return { payments, errors };
    } catch (error: any) {
      console.error('❌ خطأ في تحضير البيانات:', error);
      throw new Error(`خطأ في تحضير البيانات: ${error.message}`);
    }
  };

  // تحميل خريطة العملاء
  const loadCustomersMap = async (companyId: string): Promise<Map<string, string>> => {
    const { data } = await supabase
      .from('customers')
      .select('id, company_name, first_name, last_name')
      .eq('company_id', companyId);
    
    const map = new Map<string, string>();
    data?.forEach(customer => {
      const names = [customer.company_name, customer.first_name, customer.last_name]
        .filter(Boolean)
        .map(name => name?.toLowerCase().trim());
      
      names.forEach(name => {
        if (name) map.set(name, customer.id);
      });
    });
    
    return map;
  };

  // تحميل خريطة العقود
  const loadContractsMap = async (companyId: string): Promise<Map<string, any>> => {
    const { data } = await supabase
      .from('contracts')
      .select('id, contract_number, customer_id')
      .eq('company_id', companyId);
    
    const map = new Map<string, any>();
    data?.forEach(contract => {
      if (!contract?.contract_number) return;
      const original = contract.contract_number;
      const normalized = normalizeContractNumber(original);
      map.set(original, contract);
      // أضف شكلًا موحدًا بدون فواصل لزيادة فرص التطابق
      if (normalized && normalized !== original) {
        map.set(normalized, contract);
      }
    });
    
    return map;
  };

  // دوال مساعدة
  const getLastPaymentNumber = async (companyId: string): Promise<number> => {
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .eq('company_id', companyId)
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
 
  const normalizePaymentMethod = (method?: string): (typeof Constants.public.Enums.payment_method)[number] => {
    if (!method || method === '') {
      console.warn('⚠️ طريقة دفع فارغة، سيتم استخدام cash');
      return 'cash';
    }
    
    const s = method.toString().toLowerCase().trim();
    console.log(`🔄 تطبيع طريقة الدفع: "${method}" -> "${s}"`);
    
    const simplified = s
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const map: Record<string, (typeof Constants.public.Enums.payment_method)[number]> = {
      // نقد
      'cash': 'cash', 'كاش': 'cash', 'نقد': 'cash', 'نقدي': 'cash', 'نقداً': 'cash', 'نقدى': 'cash',
      'received': 'cash', // حالة خاصة من البيانات الموجودة
      // شيك
      'check': 'check', 'cheque': 'check', 'شيك': 'check',
      // تحويل بنكي
      'bank transfer': 'bank_transfer', 'bank_transfer': 'bank_transfer', 'transfer': 'bank_transfer', 'wire': 'bank_transfer',
      'حواله': 'bank_transfer', 'حوالة': 'bank_transfer', 'حوالة بنكية': 'bank_transfer', 'تحويل': 'bank_transfer', 'تحويل بنكي': 'bank_transfer', 'بنكي': 'bank_transfer',
      // بطاقات ائتمان
      'credit card': 'credit_card', 'credit': 'credit_card', 'credit_card': 'credit_card', 'visa': 'credit_card', 'mastercard': 'credit_card', 'بطاقه': 'credit_card', 'بطاقة': 'credit_card', 'بطاقة ائتمان': 'credit_card', 'ائتمان': 'credit_card',
      // بطاقات خصم/مدى
      'debit card': 'debit_card', 'debit': 'debit_card', 'mada': 'debit_card', 'مدى': 'debit_card', 'بطاقة خصم': 'debit_card'
    };

    const candidate = map[simplified] || (Constants.public.Enums.payment_method as readonly string[]).find((m) => m === simplified);
    const result = (candidate as any) || 'cash';
    
    console.log(`✅ نتيجة تطبيع طريقة الدفع: "${method}" -> "${result}"`);
    return result;
  };
 
  const normalizeTxType = (type?: string): 'receipt' | 'payment' => {
    const s = (type ?? '').toString().toLowerCase().trim();
    if (['قبض', 'استلام', 'receipt', 'in', 'income', 'دخل', 'incoming'].includes(s)) return 'receipt';
    if (['صرف', 'دفع', 'payment', 'out', 'expense', 'مصروف', 'outgoing'].includes(s)) return 'payment';
    return 'receipt';
  };
 
  return {
    bulkUploadPayments,
    isProcessing,
    progress,
    autoFixConfig,
    setAutoFixConfig
  };
}