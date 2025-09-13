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

  // عملية رفع مجمعة محسنة
  const bulkUploadPayments = async (
    data: any[], 
    options: {
      batchSize?: number;
      autoCreateCustomers?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<BulkOperationResult> => {
    const startTime = Date.now();
    const { batchSize = 100, autoCreateCustomers = false, skipValidation = false } = options;
    
    console.log(`🚀 بدء العملية المجمعة للمدفوعات (${data.length} سجل)`);
    setIsProcessing(true);
    setProgress(0);

    try {
      if (!companyId) throw new Error('معرف الشركة غير متوفر');

      // تحضير البيانات للمعالجة المجمعة
      const payments = await prepareBulkPayments(data, companyId, { autoCreateCustomers, skipValidation });
      
      // تقسيم البيانات إلى مجموعات
      const batches = [];
      for (let i = 0; i < payments.length; i += batchSize) {
        batches.push(payments.slice(i, i + batchSize));
      }

      let successful = 0;
      let failed = 0;
      const errors: Array<{ row: number; message: string }> = [];

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
                message: error.message
              });
            });
          } else {
            successful += insertedData?.length || batch.length;
            console.log(`✅ تم إدراج ${insertedData?.length || batch.length} مدفوعة من المجموعة ${batchIndex + 1}`);
          }
        } catch (batchError: any) {
          console.error(`❌ خطأ في معالجة المجموعة ${batchIndex + 1}:`, batchError);
          failed += batch.length;
          batch.forEach((_, index) => {
            errors.push({
              row: batchIndex * batchSize + index + 1,
              message: batchError.message || 'خطأ غير معروف'
            });
          });
        }

        // تحديث التقدم
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
        setProgress(progress);
      }

      const processingTime = Date.now() - startTime;
      console.log(`🎯 انتهت العملية المجمعة في ${processingTime}ms`);

      return {
        total: data.length,
        successful,
        failed,
        errors,
        processingTime
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
    
    // تحميل البيانات المرجعية مرة واحدة
    const [customersMap, contractsMap] = await Promise.all([
      loadCustomersMap(companyId),
      loadContractsMap(companyId)
    ]);

    // الحصول على آخر رقم مدفوعة
    let lastPaymentNumber = await getLastPaymentNumber(companyId);
    
    const payments = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const normalized = normalizeCsvHeaders(row);
      
      try {
        // تحديد معرف العميل
        let customerId: string | undefined;
        if (normalized.customer_name) {
          customerId = customersMap.get(normalized.customer_name.toLowerCase().trim());
        }

        // تحديد معرف العقد
        let contractId: string | undefined;
        if (normalized.contract_number) {
          const contract = contractsMap.get(normalized.contract_number);
          contractId = contract?.id;
        }

        // إعداد بيانات المدفوعة
        const paymentData = {
          company_id: companyId,
          payment_number: normalized.payment_number || formatPaymentNumber(++lastPaymentNumber),
          payment_date: normalized.payment_date || new Date().toISOString().split('T')[0],
          amount: parseNumber(normalized.amount || normalized.amount_paid || 0),
          payment_method: normalizePaymentMethod(normalized.payment_method || normalized.payment_type),
          reference_number: normalized.reference_number,
          notes: normalized.notes || normalized.description,
          customer_id: customerId,
          contract_id: contractId,
          type: normalizeTxType(normalized.transaction_type) || 'receipt',
          currency: normalized.currency || 'KWD',
          payment_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // التحقق من صحة البيانات إذا لم يتم تخطي التحقق
        if (!skipValidation) {
          if (!paymentData.payment_date || paymentData.amount <= 0) {
            console.warn(`⚠️ تخطي السطر ${i + 1}: بيانات غير صحيحة`);
            continue;
          }
        }

        payments.push(paymentData);
      } catch (error) {
        console.warn(`⚠️ خطأ في تحضير السطر ${i + 1}:`, error);
      }
    }

    console.log(`✅ تم تحضير ${payments.length} مدفوعة من أصل ${data.length} سطر`);
    return payments;
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
      map.set(contract.contract_number, contract);
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

  const normalizePaymentMethod = (method?: string): string => {
    const normalized = method?.toLowerCase().trim();
    const mapping: Record<string, string> = {
      'نقد': 'cash', 'cash': 'cash', 'نقدي': 'cash',
      'شيك': 'check', 'check': 'check', 'cheque': 'check',
      'حوالة': 'bank_transfer', 'transfer': 'bank_transfer', 'bank_transfer': 'bank_transfer',
      'بطاقة': 'credit_card', 'card': 'credit_card', 'credit_card': 'credit_card'
    };
    return mapping[normalized || ''] || 'cash';
  };

  const normalizeTxType = (type?: string): 'receipt' | 'payment' => {
    const normalized = type?.toLowerCase().trim();
    if (['قبض', 'receipt', 'in', 'income'].includes(normalized || '')) return 'receipt';
    if (['صرف', 'payment', 'out', 'expense'].includes(normalized || '')) return 'payment';
    return 'receipt';
  };

  return {
    bulkUploadPayments,
    isProcessing,
    progress
  };
}