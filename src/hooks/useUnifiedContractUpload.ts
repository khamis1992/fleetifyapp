import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { findOrCreateCustomer, CustomerSearchData } from '@/utils/enhanced-customer-search';
import { generateErrorMessage, formatErrorForUser, ContractError } from '@/utils/contract-error-handler';
import { validateContractData, generateUserFriendlyMessage, TempContractData } from '@/utils/contract-upload-validator';
import { processExcelFile, detectFileFormat, normalizeFileData } from '@/utils/excel-processor';
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
  const { companyId, user } = useUnifiedCompanyAccess();

  // القيم الافتراضية الذكية
  const SMART_DEFAULTS = {
    monthly_amount: 1500,
    contract_type: 'rental', // Changed from 'تحت التدقيق' to 'rental' for proper vehicle status
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
          
          // تكميل البيانات المالية بذكاء
          const originalMonthly = Number(enhanced.monthly_amount) || 0;
          const originalTotal = Number(enhanced.contract_amount) || 0;
          
          // تعيين الإيجار الشهري الافتراضي
          if (!enhanced.monthly_amount || enhanced.monthly_amount === '' || originalMonthly === 0) {
            enhanced.monthly_amount = SMART_DEFAULTS.monthly_amount;
            issues.push(`تم تعيين الإيجار الشهري الافتراضي: ${SMART_DEFAULTS.monthly_amount} ريال`);
          }
          
          // حساب عدد الأشهر من التواريخ أو استخدام القيمة الافتراضية
          let rentalMonths = Number(enhanced.rental_months) || 0;
          if (rentalMonths === 0 && enhanced.start_date && enhanced.end_date) {
            const startDate = new Date(enhanced.start_date);
            const endDate = new Date(enhanced.end_date);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
              rentalMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)); // تقريبي
              enhanced.rental_months = rentalMonths;
              issues.push(`تم حساب عدد الأشهر من التواريخ: ${rentalMonths} شهر`);
            }
          }
          
          if (rentalMonths === 0) {
            rentalMonths = SMART_DEFAULTS.rental_months;
            enhanced.rental_months = rentalMonths;
            issues.push(`تم تعيين عدد الأشهر الافتراضي: ${rentalMonths} شهر`);
          }
          
          // حساب القيمة الإجمالية
          const monthlyAmount = Number(enhanced.monthly_amount) || SMART_DEFAULTS.monthly_amount;
          
          if (!enhanced.contract_amount || enhanced.contract_amount === '' || originalTotal === 0) {
            enhanced.contract_amount = monthlyAmount * rentalMonths;
            issues.push(`تم حساب القيمة الإجمالية: ${enhanced.contract_amount} ريال (${monthlyAmount} × ${rentalMonths} شهر)`);
          } else if (originalTotal !== monthlyAmount * rentalMonths) {
            // تحذير في حالة عدم تطابق الحسابات
            issues.push(`تحذير: القيمة الإجمالية (${originalTotal}) لا تتطابق مع الحصل المتوقع (${monthlyAmount * rentalMonths})`);
          }
          
          // تعيين نوع العقد
          if (!enhanced.contract_type || enhanced.contract_type === '') {
            enhanced.contract_type = SMART_DEFAULTS.contract_type;
            issues.push('تم تعيين نوع العقد: إيجار');
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
              
              if (aiResponse.data?.choices?.[0]?.message?.content) {
                // استخراج الاقتراحات من الرد
                const suggestions = aiResponse.data.choices[0].message.content;
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
      
      // كشف تنسيق الملف ومعالجته
      const fileFormat = detectFileFormat(file);
      console.log('🔍 File format detected:', fileFormat);
      
      let rawData: any[] = [];
      const processingWarnings: string[] = [];
      
      switch (fileFormat) {
        case 'csv':
          const csvText = await file.text();
          const csvParsed = Papa.parse(csvText, { 
            header: true, 
            skipEmptyLines: 'greedy'
          });
          
          if (csvParsed.errors && csvParsed.errors.length > 0) {
            processingWarnings.push(...csvParsed.errors.map((err: unknown) => `تحذير CSV: ${err.message}`));
          }
          
          rawData = (csvParsed.data as any[]) || [];
          break;
          
        case 'excel':
          const excelResult = await processExcelFile(file);
          rawData = excelResult.data;
          processingWarnings.push(...excelResult.warnings);
          
          if (excelResult.errors.length > 0) {
            throw new Error(`أخطاء في معالجة Excel: ${excelResult.errors.join(', ')}`);
          }
          break;
          
        case 'json':
          const jsonText = await file.text();
          try {
            const jsonData = JSON.parse(jsonText);
            rawData = Array.isArray(jsonData) ? jsonData : [jsonData];
          } catch (jsonError) {
            throw new Error(`خطأ في قراءة JSON: ${jsonError.message}`);
          }
          break;
          
        case 'text':
          const txtText = await file.text();
          // محاولة تحليل كـ CSV أولاً
          try {
            const txtParsed = Papa.parse(txtText, { header: true, skipEmptyLines: 'greedy' });
            rawData = txtParsed.data as any[];
            processingWarnings.push('تم تحليل الملف النصي كـ CSV');
          } catch {
            // محاولة كـ JSON
            try {
              const jsonData = JSON.parse(txtText);
              rawData = Array.isArray(jsonData) ? jsonData : [jsonData];
              processingWarnings.push('تم تحليل الملف النصي كـ JSON');
            } catch {
              throw new Error('لا يمكن تحليل الملف النصي كـ CSV أو JSON');
            }
          }
          break;
          
        default:
          throw new Error(`نوع الملف غير مدعوم: ${file.name}`);
      }
      
      // تطبيق التطبيع على البيانات
      rawData = normalizeFileData(rawData, fileFormat);

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
        warnings: [...processingWarnings], // إضافة تحذيرات معالجة الملف
        created_customers: 0,
        contracts_under_review: 0
      };

      for (let i = 0; i < enhancedData.length; i++) {
        const contract = enhancedData[i];
        setProgress(50 + (i / enhancedData.length) * 50); // النصف الثاني للرفع
        
        // التحقق من صحة البيانات قبل المعالجة
        const validation = validateContractData(contract as TempContractData, i);
        if (!validation.isValid) {
          result.failed++;
          result.errors.push(generateUserFriendlyMessage(validation));
          continue;
        }
        
        // إضافة التحذيرات من التحقق
        if (validation.warnings.length > 0) {
          result.warnings.push(...validation.warnings);
        }
        
        try {
          // البحث أو إنشاء العميل بالنظام المحسن
          let customerId = null;
          let customerErrors: string[] = [];
          let customerWarnings: string[] = [];
          
          if (contract.customer_name || contract.customer_identifier || contract.customer_phone) {
            // إعداد بيانات البحث
            const searchData = {
              customer_id: contract.customer_id || contract.customer_identifier,
              customer_name: contract.customer_name,
              customer_phone: contract.customer_phone,
              customer_email: contract.customer_email,
              customer_id_number: contract.customer_id_number || contract.national_id,
              national_id: contract.national_id || contract.customer_id_number,
              customer_code: contract.customer_code
            };
            
            const customerResult = await findOrCreateCustomer(searchData, companyId);
            customerId = customerResult.id;
            customerErrors = customerResult.errors;
            customerWarnings = customerResult.warnings;
            
            if (customerResult.created) {
              result.created_customers++;
            }
            
            // إضافة التحذيرات للملاحظات
            if (customerWarnings.length > 0) {
              contract.ai_notes = (contract.ai_notes || '') + ' | ' + customerWarnings.join(' | ');
            }
            
            // إضافة الأخطاء والتحذيرات للنتائج
            if (customerErrors.length > 0) {
              result.warnings.push(...customerErrors.map(err => `السطر ${i + 1}: ${err}`));
              
              // إذا فشل إنشاء العميل، إضافة تفاصيل إضافية
              if (!customerId) {
                result.warnings.push(`السطر ${i + 1}: فشل في إنشاء العميل - تحقق من صحة البيانات المدخلة`);
                console.error('فشل في إنشاء العميل:', {
                  customerData: contract,
                  errors: customerErrors,
                  warnings: customerWarnings
                });
              }
            }
          }
          
          // التحقق من بيانات العقد باستخدام نظام التحقق الموحد
          const tempContract = {
            ...contract,
            contract_amount: Number(contract.contract_amount) || 0,
            monthly_amount: Number(contract.monthly_amount) || 0
          };
          const validation = validateContractData(tempContract, i);
          
          if (!validation.isValid) {
            // إضافة الأخطاء مع تفاصيل العقد
            validation.errors.forEach(error => {
              const errorMessage = generateErrorMessage(
                new Error(error), 
                `السطر ${i + 1}`, 
                i + 1
              );
              result.errors.push(`❌ خطأ في السطر ${i + 1}: ${errorMessage.message}`);
            });
            result.failed++;
            continue;
          }
          
          // عرض التحذيرات إذا كانت موجودة
          if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => {
              console.warn(`⚠️ تحذير: ${warning}`);
            });
          }
          
          // التحقق من وجود customer_id بعد المعالجة
          if (!customerId && !contract.customer_id) {
            const errorMessage = generateErrorMessage(
              new Error('لم يتم العثور على العميل أو إنشاؤه'), 
              `السطر ${i + 1}`, 
              i + 1
            );
            result.errors.push(`❌ خطأ في السطر ${i + 1}: ${errorMessage.message}`);
            result.failed++;
            continue;
          }
          
          // البحث عن المركبة باستخدام رقم اللوحة إذا كانت متوفرة
          let vehicleId = null;
          if (contract.vehicle_plate) {
            const { data: vehicleData, error: vehicleError } = await supabase
              .from('vehicles')
              .select('id')
              .eq('plate_number', contract.vehicle_plate)
              .eq('company_id', companyId)
              .single();
            
            if (vehicleData && !vehicleError) {
              vehicleId = vehicleData.id;
            } else {
              console.warn(`لم يتم العثور على مركبة برقم لوحة: ${contract.vehicle_plate}`);
              result.warnings.push(`السطر ${i + 1}: لم يتم العثور على مركبة برقم لوحة ${contract.vehicle_plate}`);
            }
          }
          
          // إعداد بيانات العقد
          const contractData = {
            company_id: companyId,
            contract_number: contract.contract_number,
            contract_date: contract.contract_date,
            contract_type: contract.contract_type === 'تحت التدقيق' ? 'rental' : contract.contract_type,
            description: contract.description || contract.ai_notes || 'تم إنشاؤه من الرفع الذكي',
            customer_id: customerId || contract.customer_id,
            vehicle_id: vehicleId, // إضافة vehicle_id إذا تم العثور عليه
            monthly_amount: Number(contract.monthly_amount) || SMART_DEFAULTS.monthly_amount,
            contract_amount: Number(contract.contract_amount) || 0,
            start_date: contract.start_date,
            end_date: contract.end_date,
            status: contract.requires_review ? 'under_review' : 'active', // Changed to 'active' to properly set vehicle status
            created_by: user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
          
          // معالجة الخطأ بالنظام المحسن
          const errorDetails = generateErrorMessage(contractError, 'رفع العقد', i + 1);
          const formattedError = formatErrorForUser(errorDetails);
          
          // إضافة تفاصيل الخطأ الأصلي للمطورين
          const detailedError = `❌ خطأ في السطر ${i + 1}: ${formattedError}`;
          if (contractError.message && contractError.message.includes('Could not find')) {
            result.errors.push(`${detailedError}\n💡 راجع البيانات وأعد المحاولة`);
          } else {
            result.errors.push(`${detailedError}\n🔍 تفاصيل الخطأ: ${contractError.message || contractError}`);
          }
          
          // إضافة اقتراحات للمستخدم
          if (errorDetails.suggestion) {
            result.warnings.push(`💡 اقتراح للسطر ${i + 1}: ${errorDetails.suggestion}`);
          }
          
          console.error(`❌ Contract upload error for row ${i + 1}:`, {
            originalError: contractError,
            errorDetails,
            contractData: contract
          });
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
      
    } catch (error: unknown) {
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