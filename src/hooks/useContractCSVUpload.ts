import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { ContractCreationData } from "@/types/contracts"
import { toast } from "sonner"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function useContractCSVUpload() {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)

  // تعريف أنواع الحقول للعقود بما يدعم الحقول الذكية (الاسم/اللوحة)
  const contractFieldTypes = {
    customer_id: 'text' as const,
    customer_name: 'text' as const,
    vehicle_id: 'text' as const,
    vehicle_number: 'text' as const,
    contract_number: 'text' as const,
    contract_type: 'text' as const,
    contract_date: 'date' as const,
    start_date: 'date' as const,
    end_date: 'date' as const,
    contract_amount: 'number' as const,
    monthly_amount: 'number' as const,
    description: 'text' as const,
    terms: 'text' as const,
    // cost_center_id لم يعد مطلوباً من CSV (يتم تحديده تلقائياً)
  };

  // الحقول المطلوبة: سنسمح بتحديد العميل عبر الاسم أو المعرّف
  const contractRequiredFields = ['contract_type', 'start_date', 'end_date', 'contract_amount'];

  const downloadTemplate = () => {
    const headers = [
      'customer_name', // سيتم تحويله تلقائياً إلى customer_id
      'customer_id',   // بديل اختياري إذا أردت وضع المعرّف مباشرة
      'vehicle_number', // سيتم تحويله تلقائياً إلى vehicle_id من رقم اللوحة
      'vehicle_id',     // بديل اختياري
      'contract_number',
      'contract_type',
      'contract_date',
      'start_date',
      'end_date',
      'contract_amount',
      'monthly_amount',
      'description',
      'terms'
    ]

    const exampleData = [
      'شركة الهدى للتجارة',
      '',
      'KWT-1234',
      '',
      'CON-2025-001',
      'monthly_rental',
      '2025-01-01',
      '2025-01-01',
      '2025-12-31',
      '6000',
      '500',
      'عقد إيجار شهري لمركبة تويوتا كامري',
      'يلتزم المستأجر بدفع الإيجار في موعده المحدد'
    ]

    const exampleDataCancelled = [
      'شركة مثال',
      '',
      'KWT-5678',
      '',
      'CON-2025-002',
      'monthly_rental',
      '2025-02-01',
      '2025-02-01',
      '2025-12-31',
      '0',
      '0',
      'cancelled - عقد ملغي',
      'تم الإلغاء قبل التفعيل'
    ]

    const csvContent = [
      headers.join(','),
      exampleData.join(','),
      exampleDataCancelled.join(',')
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'contracts_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line)
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      data.push({ ...row, rowNumber: i + 1 })
    }

    return data
  }

  // ===================== Helpers: Resolve IDs from human-friendly fields =====================
  const nameToIdCache = new Map<string, string>();
  const plateToIdCache = new Map<string, string>();

  const normalize = (s?: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

  const buildFullName = (first?: string | null, last?: string | null) => normalize(`${first || ''} ${last || ''}`);

  const isCancelledDescription = (desc?: string) => {
    const t = (desc || '').toString().toLowerCase();
    const keywords = ['cancelled', 'canceled', 'cancel', 'ملغي', 'ملغى'];
    return keywords.some((k) => t.includes(k));
  };

  const resolveCustomerIdByName = async (customerName: string): Promise<{ id?: string; error?: string }> => {
    const key = normalize(customerName);
    if (!key) return { error: 'اسم العميل فارغ' };
    if (nameToIdCache.has(key)) return { id: nameToIdCache.get(key)! };

    const like = `%${customerName}%`;
    const { data, error } = await supabase
      .from('customers')
      .select('id, customer_type, company_name, first_name, last_name')
      .or(`company_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(20);

    if (error) return { error: `تعذر البحث عن العميل: ${error.message}` };
    if (!data || data.length === 0) return { error: `لم يتم العثور على عميل بالاسم: ${customerName}` };

    // حاول إيجاد تطابق دقيق أولاً
    const exactMatches = data.filter((c) => {
      const company = normalize((c as any).company_name);
      const full = buildFullName((c as any).first_name, (c as any).last_name);
      return company === key || full === key;
    });

    const candidates = exactMatches.length > 0 ? exactMatches : data;

    if (candidates.length > 1) {
      return { error: `الاسم غير فريد، تم العثور على ${candidates.length} نتائج لـ: ${customerName}` };
    }

    const id = (candidates[0] as any).id as string;
    nameToIdCache.set(key, id);
    return { id };
  };

  const resolveVehicleIdByNumber = async (plateOrNumber: string): Promise<{ id?: string; error?: string }> => {
    const key = normalize(plateOrNumber);
    if (!key) return { error: 'رقم المركبة فارغ' };
    if (plateToIdCache.has(key)) return { id: plateToIdCache.get(key)! };

    // نجرب تطابق دقيق أولاً ثم نfallback إلى بحث جزئي
    const { data: exact, error: e1 } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('plate_number', plateOrNumber)
      .limit(1);

    if (e1) return { error: `تعذر البحث عن المركبة: ${e1.message}` };

    let picked = exact && exact[0];

    if (!picked) {
      const like = `%${plateOrNumber}%`;
      const { data: partial, error: e2 } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .ilike('plate_number', like)
        .limit(5);

      if (e2) return { error: `تعذر البحث عن المركبة: ${e2.message}` };
      if (!partial || partial.length === 0) return { error: `لم يتم العثور على مركبة بالرقم: ${plateOrNumber}` };
      if (partial.length > 1) return { error: `رقم المركبة غير فريد، تم العثور على ${partial.length} نتائج لـ: ${plateOrNumber}` };
      picked = partial[0];
    }

    const id = (picked as any).id as string;
    plateToIdCache.set(key, id);
    return { id };
  };
  const validateContractData = (data: any, rowNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Required fields validation
    if (!data.customer_id) {
      errors.push('العميل مطلوب: يرجى تزويد customer_id أو customer_name قابل للتعرف')
    }

    if (!data.contract_type) {
      errors.push('نوع العقد مطلوب')
    }

    const validContractTypes = ['rental', 'daily_rental', 'weekly_rental', 'monthly_rental', 'yearly_rental', 'rent_to_own']
    if (data.contract_type && !validContractTypes.includes(data.contract_type)) {
      errors.push(`نوع العقد يجب أن يكون أحد القيم التالية: ${validContractTypes.join(', ')}`)
    }

    if (!data.start_date) {
      errors.push('تاريخ بداية العقد مطلوب')
    }

    if (!data.end_date) {
      errors.push('تاريخ نهاية العقد مطلوب')
    }

    const contractAmountMissing = data.contract_amount === undefined || data.contract_amount === null || data.contract_amount === ''
    if (contractAmountMissing) {
      errors.push('مبلغ العقد مطلوب')
    }

    // Date format validation
    if (data.contract_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.contract_date)) {
      errors.push('تنسيق تاريخ العقد يجب أن يكون YYYY-MM-DD')
    }

    if (data.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.start_date)) {
      errors.push('تنسيق تاريخ بداية العقد يجب أن يكون YYYY-MM-DD')
    }

    if (data.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.end_date)) {
      errors.push('تنسيق تاريخ نهاية العقد يجب أن يكون YYYY-MM-DD')
    }

    // Date logic validation
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      if (endDate <= startDate) {
        errors.push('تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية')
      }
    }

    // Numeric validation
    const hasContractAmount = !contractAmountMissing
    if (hasContractAmount && isNaN(Number(data.contract_amount))) {
      errors.push('مبلغ العقد يجب أن يكون رقماً')
    }

    if (data.monthly_amount !== undefined && data.monthly_amount !== null && data.monthly_amount !== '' && isNaN(Number(data.monthly_amount))) {
      errors.push('المبلغ الشهري يجب أن يكون رقماً')
    }

    // Amount logic validation (allow zero, forbid negatives)
    if (hasContractAmount && Number(data.contract_amount) < 0) {
      errors.push('مبلغ العقد لا يمكن أن يكون سالباً')
    }

    return { isValid: errors.length === 0, errors }
  }

  const uploadContracts = async (file: File) => {
    console.log('📝 [Contract CSV] Starting CSV upload for user:', user?.id);
    console.log('📝 [Contract CSV] User company info:', {
      company: user?.company,
      profile_company_id: user?.profile?.company_id,
      has_company: !!user?.company?.id
    });
    
    if (!user?.company?.id) {
      console.error('📝 [Contract CSV] Company ID not available. User data:', {
        user_id: user?.id,
        email: user?.email,
        company: user?.company,
        profile: user?.profile
      });
      throw new Error('معرف الشركة غير متوفر. تأكد من تسجيل الدخول بحساب مرتبط بشركة.')
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    try {
      const text = await file.text()
      const data = parseCSV(text)
      
      if (data.length === 0) {
        throw new Error('الملف فارغ أو غير صحيح')
      }

      const results: CSVUploadResults = {
        total: data.length,
        successful: 0,
        failed: 0,
        errors: []
      }

      for (let i = 0; i < data.length; i++) {
        const originalRow = data[i]

        // محاولة التعرف الذكي على الحقول قبل التحقق
        const contractData: any = { ...originalRow }

        // العميل: من الاسم إلى المعرّف إذا لزم
        if (!contractData.customer_id && contractData.customer_name) {
          const resolved = await resolveCustomerIdByName(contractData.customer_name)
          if (resolved.error) {
            results.failed++
            results.errors.push({ row: contractData.rowNumber, message: resolved.error })
            setProgress(Math.round(((i + 1) / data.length) * 100))
            continue
          }
          contractData.customer_id = resolved.id
        }

        // المركبة: من رقم اللوحة إلى المعرّف إذا لزم
        const providedPlate = contractData.vehicle_number || contractData.plate_number
        if (!contractData.vehicle_id && providedPlate) {
          const resolved = await resolveVehicleIdByNumber(providedPlate)
          if (resolved.error) {
            results.failed++
            results.errors.push({ row: contractData.rowNumber, message: resolved.error })
            setProgress(Math.round(((i + 1) / data.length) * 100))
            continue
          }
          contractData.vehicle_id = resolved.id
        }

        // لا نرسل cost_center_id — سيتم تعيينه تلقائياً من التريجر
        delete contractData.cost_center_id

        const validation = validateContractData(contractData, contractData.rowNumber)

        setProgress(Math.round(((i + 1) / data.length) * 100))

        if (!validation.isValid) {
          results.failed++
          results.errors.push({
            row: contractData.rowNumber,
            message: validation.errors.join(', ')
          })
          continue
        }

        try {
          // Generate contract number if not provided
          const contractNumber = contractData.contract_number || `CON-${Date.now()}-${i + 1}`
          
          console.log(`📝 [Contract CSV] Inserting contract row ${contractData.rowNumber} for company ${user.company.id}`);

          const contractPayload: any = {
            company_id: user.company.id,
            customer_id: contractData.customer_id,
            vehicle_id: contractData.vehicle_id || null,
            contract_number: contractNumber,
            contract_type: contractData.contract_type,
            contract_date: contractData.contract_date || new Date().toISOString().split('T')[0],
            start_date: contractData.start_date,
            end_date: contractData.end_date,
            contract_amount: Number(contractData.contract_amount),
            monthly_amount: (contractData.monthly_amount !== undefined && contractData.monthly_amount !== null && contractData.monthly_amount !== '') ? Number(contractData.monthly_amount) : Number(contractData.contract_amount),
            description: contractData.description || null,
            terms: contractData.terms || null,
            status: isCancelledDescription(contractData.description) ? 'cancelled' : 'draft',
            created_by: user.id
          }

          const { error } = await supabase
            .from('contracts')
            .insert(contractPayload)

          if (error) {
            console.error(`📝 [Contract CSV] Database error for row ${contractData.rowNumber}:`, error);
            results.failed++
            results.errors.push({
              row: contractData.rowNumber,
              message: `خطأ في قاعدة البيانات: ${error.message}`
            })
          } else {
            console.log(`📝 [Contract CSV] Successfully inserted contract row ${contractData.rowNumber}`);
            results.successful++
          }
        } catch (error: any) {
          console.error(`📝 [Contract CSV] Unexpected error for row ${contractData.rowNumber}:`, error);
          results.failed++
          results.errors.push({
            row: contractData.rowNumber,
            message: `خطأ غير متوقع: ${error.message}`
          })
        }
      }

      setResults(results)
      
    } catch (error: any) {
      toast.error(`خطأ في معالجة الملف: ${error.message}`)
      throw error
    } finally {
      setIsUploading(false)
      setProgress(100)
    }
  }

  // دالة رفع ذكية للعقود
  const smartUploadContracts = async (fixedData: any[]) => {
    setIsUploading(true);
    setProgress(0);
    
    const uploadResults: CSVUploadResults = {
      total: fixedData.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      for (let i = 0; i < fixedData.length; i++) {
        const originalRow = fixedData[i];
        setProgress(((i + 1) / fixedData.length) * 100);
        
        try {
          const contractData: any = { ...originalRow };

          // Resolve customer by name if needed
          if (!contractData.customer_id && contractData.customer_name) {
            const resolved = await resolveCustomerIdByName(contractData.customer_name);
            if (resolved.error) throw new Error(resolved.error);
            contractData.customer_id = resolved.id;
          }

          // Resolve vehicle by plate if needed
          const providedPlate = contractData.vehicle_number || contractData.plate_number;
          if (!contractData.vehicle_id && providedPlate) {
            const resolved = await resolveVehicleIdByNumber(providedPlate);
            if (resolved.error) throw new Error(resolved.error);
            contractData.vehicle_id = resolved.id;
          }

          delete contractData.cost_center_id; // handled by trigger automatically

          const contractNumber = contractData.contract_number || `CON-${Date.now()}-${i + 1}`;
          
          const contractPayload: any = {
            company_id: user?.company?.id,
            customer_id: contractData.customer_id,
            vehicle_id: contractData.vehicle_id || null,
            contract_number: contractNumber,
            contract_type: contractData.contract_type,
            contract_date: contractData.contract_date || new Date().toISOString().split('T')[0],
            start_date: contractData.start_date,
            end_date: contractData.end_date,
            contract_amount: Number(contractData.contract_amount),
            monthly_amount: (contractData.monthly_amount !== undefined && contractData.monthly_amount !== null && contractData.monthly_amount !== '') ? Number(contractData.monthly_amount) : Number(contractData.contract_amount),
            description: contractData.description || null,
            terms: contractData.terms || null,
            status: isCancelledDescription(contractData.description) ? 'cancelled' : 'draft',
            created_by: user?.id
          };

          const { data, error } = await supabase
            .from('contracts')
            .insert([contractPayload])
            .select();

          if (error) throw error;
          uploadResults.successful++;
        } catch (error: any) {
          uploadResults.failed++;
          uploadResults.errors.push({
            row: originalRow.rowNumber || i + 1,
            message: error.message
          });
        }
      }
    } finally {
      setIsUploading(false);
      setResults(uploadResults);
    }

    return uploadResults;
  };

  return {
    uploadContracts,
    smartUploadContracts,
    downloadTemplate,
    isUploading,
    progress,
    results,
    contractFieldTypes,
    contractRequiredFields
  }
}