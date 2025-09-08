import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import Papa from 'papaparse';

export interface ContractUploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  warnings: string[];
  created_customers: number;
  contracts_under_review: number;
}

export interface SmartContractData {
  // البيانات الأساسية
  contract_number?: string;
  contract_date?: string;
  contract_type?: string;
  description?: string;
  
  // بيانات العميل
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_id_number?: string;
  customer_address?: string;
  
  // بيانات المركبة
  vehicle_plate?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  
  // البيانات المالية
  monthly_amount?: string | number;
  contract_amount?: string | number;
  rental_months?: string | number;
  rental_days?: string | number;
  
  // التواريخ
  start_date?: string;
  end_date?: string;
  
  // أي بيانات إضافية
  [key: string]: any;
}

export function useUnifiedContractUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ContractUploadResult | null>(null);
  const { companyId } = useUnifiedCompanyAccess();

  // القيم الافتراضية الذكية
  const SMART_DEFAULTS = {
    monthly_amount: 1500,
    contract_type: 'تحت التدقيق',
    rental_months: 12,
    contract_date: new Date().toISOString().split('T')[0]
  };

  // دالة الذكاء الاصطناعي لتحليل وتكميل البيانات
  const enhanceDataWithAI = async (contractData: SmartContractData[]): Promise<SmartContractData[]> => {
    try {
      console.log('🤖 AI Enhancement: Processing', contractData.length, 'contracts');
      
      const enhancedData = await Promise.all(
        contractData.map(async (contract, index) => {
          setProgress((index / contractData.length) * 50); // نصف التقدم للـ AI
          
          const enhanced = { ...contract };
          const issues: string[] = [];
          
          // تكميل البيانات المالية
          if (!enhanced.monthly_amount || enhanced.monthly_amount === '' || enhanced.monthly_amount === 0) {
            enhanced.monthly_amount = SMART_DEFAULTS.monthly_amount;
            issues.push('تم تعيين الإيجار الشهري الافتراضي: 1500');
          }
          
          // حساب القيمة الإجمالية
          const monthlyAmount = Number(enhanced.monthly_amount) || SMART_DEFAULTS.monthly_amount;
          const rentalMonths = Number(enhanced.rental_months) || SMART_DEFAULTS.rental_months;
          
          if (!enhanced.contract_amount || enhanced.contract_amount === '' || enhanced.contract_amount === 0) {
            enhanced.contract_amount = monthlyAmount * rentalMonths;
            issues.push(`تم حساب القيمة الإجمالية: ${enhanced.contract_amount} (${monthlyAmount} × ${rentalMonths})`);
          }
          
          // تعيين نوع العقد
          if (!enhanced.contract_type || enhanced.contract_type === '') {
            enhanced.contract_type = SMART_DEFAULTS.contract_type;
            issues.push('تم تعيين نوع العقد: تحت التدقيق');
          }
          
          // تعيين تاريخ العقد
          if (!enhanced.contract_date || enhanced.contract_date === '') {
            enhanced.contract_date = SMART_DEFAULTS.contract_date;
            issues.push('تم تعيين تاريخ اليوم كتاريخ العقد');
          }
          
          // إنشاء رقم عقد تلقائي
          if (!enhanced.contract_number || enhanced.contract_number === '') {
            const timestamp = Date.now().toString().slice(-6);
            enhanced.contract_number = `AUTO-${timestamp}-${String(index + 1).padStart(3, '0')}`;
            issues.push(`تم إنشاء رقم عقد تلقائي: ${enhanced.contract_number}`);
          }
          
          // تحسين بيانات العميل باستخدام AI
          if (enhanced.customer_name && (!enhanced.customer_phone || !enhanced.customer_email)) {
            try {
              const aiResponse = await supabase.functions.invoke('openai-chat', {
                body: {
                  messages: [
                    {
                      role: 'system',
                      content: `أنت مساعد ذكي لتحسين بيانات العقود. قم بتحليل اسم العميل واقتراح بيانات معقولة.`
                    },
                    {
                      role: 'user',
                      content: `اسم العميل: ${enhanced.customer_name}. اقترح رقم هاتف وإيميل معقولين للاختبار (استخدم أرقام وهمية).`
                    }
                  ],
                  model: 'gpt-4o-mini',
                  temperature: 0.3
                }
              });
              
              if (aiResponse.data?.response) {
                // استخراج الاقتراحات من الرد
                const suggestions = aiResponse.data.response;
                if (!enhanced.customer_phone && suggestions.includes('05')) {
                  const phoneMatch = suggestions.match(/05\d{8}/);
                  if (phoneMatch) {
                    enhanced.customer_phone = phoneMatch[0];
                    issues.push(`تم اقتراح رقم هاتف: ${enhanced.customer_phone}`);
                  }
                }
              }
            } catch (aiError) {
              console.warn('AI enhancement failed for customer:', aiError);
            }
          }
          
          // إضافة الملاحظات
          if (issues.length > 0) {
            enhanced.ai_notes = issues.join(' | ');
            enhanced.requires_review = true;
          }
          
          return enhanced;
        })
      );
      
      console.log('🤖 AI Enhancement: Completed');
      return enhancedData;
    } catch (error) {
      console.error('AI Enhancement error:', error);
      toast.error('فشل في تحسين البيانات بالذكاء الاصطناعي');
      return contractData;
    }
  };

  // إنشاء عميل جديد تلقائياً
  const createCustomerIfNeeded = async (customerData: any): Promise<string | null> => {
    try {
      if (!customerData.customer_name) return null;
      
      // البحث عن عميل موجود
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .or(`name.eq.${customerData.customer_name},phone.eq.${customerData.customer_phone || ''}`)
        .single();
      
      if (existingCustomer) {
        return existingCustomer.id;
      }
      
      // إنشاء عميل جديد
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          company_id: companyId,
          name: customerData.customer_name,
          phone: customerData.customer_phone || 'غير محدد',
          email: customerData.customer_email || null,
          id_number: customerData.customer_id_number || null,
          address: customerData.customer_address || null,
          customer_type: 'individual',
          status: 'active',
          notes: 'تم إنشاؤه تلقائياً من رفع العقود الذكي'
        })
        .select('id')
        .single();
      
      if (error) throw error;
      return newCustomer.id;
    } catch (error) {
      console.error('Error creating customer:', error);
      return null;
    }
  };

  // الدالة الرئيسية لرفع العقود الموحد
  const uploadContracts = useCallback(async (file: File): Promise<ContractUploadResult> => {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    setIsUploading(true);
    setProgress(0);
    setResults(null);

    try {
      console.log('🚀 Unified Upload: Starting smart contract upload');
      
      // قراءة وتحليل الملف
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      let rawData: any[] = [];
      
      switch (fileExtension) {
        case '.csv':
          const csvText = await file.text();
          const csvParsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
          rawData = csvParsed.data as any[];
          break;
          
        case '.json':
          const jsonText = await file.text();
          const jsonData = JSON.parse(jsonText);
          rawData = Array.isArray(jsonData) ? jsonData : [jsonData];
          break;
          
        default:
          throw new Error(`نوع الملف ${fileExtension} غير مدعوم حالياً`);
      }

      if (rawData.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على بيانات صالحة');
      }

      // تحسين البيانات بالذكاء الاصطناعي
      const enhancedData = await enhanceDataWithAI(rawData);
      
      // رفع العقود
      const result: ContractUploadResult = {
        total: enhancedData.length,
        successful: 0,
        failed: 0,
        errors: [],
        warnings: [],
        created_customers: 0,
        contracts_under_review: 0
      };

      for (let i = 0; i < enhancedData.length; i++) {
        const contract = enhancedData[i];
        setProgress(50 + (i / enhancedData.length) * 50); // النصف الثاني للرفع
        
        try {
          // إنشاء العميل إذا لزم الأمر
          let customerId = null;
          if (contract.customer_name) {
            customerId = await createCustomerIfNeeded(contract);
            if (customerId && !contract.customer_id) {
              result.created_customers++;
            }
          }
          
          // إعداد بيانات العقد
          const contractData = {
            company_id: companyId,
            contract_number: contract.contract_number,
            contract_date: contract.contract_date,
            contract_type: contract.contract_type,
            description: contract.description || contract.ai_notes || 'تم إنشاؤه من الرفع الذكي',
            customer_id: customerId || contract.customer_id,
            monthly_amount: Number(contract.monthly_amount) || SMART_DEFAULTS.monthly_amount,
            contract_amount: Number(contract.contract_amount) || 0,
            rental_months: Number(contract.rental_months) || SMART_DEFAULTS.rental_months,
            start_date: contract.start_date,
            end_date: contract.end_date,
            status: contract.requires_review ? 'under_review' : 'draft',
            created_via: 'smart_upload'
          };
          
          // رفع العقد
          const { error: contractError } = await supabase
            .from('contracts')
            .insert(contractData);
          
          if (contractError) {
            throw contractError;
          }
          
          result.successful++;
          if (contract.requires_review) {
            result.contracts_under_review++;
          }
          
        } catch (contractError: any) {
          result.failed++;
          result.errors.push(`السطر ${i + 1}: ${contractError.message}`);
        }
      }
      
      setResults(result);
      setProgress(100);
      
      // رسائل النتائج
      if (result.successful > 0) {
        toast.success(`تم رفع ${result.successful} عقد بنجاح`);
      }
      
      if (result.created_customers > 0) {
        toast.info(`تم إنشاء ${result.created_customers} عميل جديد`);
      }
      
      if (result.contracts_under_review > 0) {
        toast.warning(`${result.contracts_under_review} عقد تحت المراجعة`);
      }
      
      if (result.failed > 0) {
        toast.error(`فشل في رفع ${result.failed} عقد`);
      }
      
      return result;
      
    } catch (error: any) {
      console.error('Unified upload error:', error);
      toast.error(`خطأ في الرفع: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [companyId]);

  return {
    uploadContracts,
    isUploading,
    progress,
    results,
    SMART_DEFAULTS
  };
}
