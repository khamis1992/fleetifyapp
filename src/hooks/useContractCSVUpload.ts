import { useState } from "react"
import Papa from "papaparse"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { ContractCreationData } from "@/types/contracts"
import { toast } from "sonner"
import { normalizeCsvHeaders } from "@/utils/csv"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}

export function useContractCSVUpload() {
  const { user, companyId, isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess()
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
    // دعم تحديد مركز التكلفة بعدة طرق
    cost_center_id: 'text' as const,          // اختياري
    cost_center_code: 'text' as const,        // اختياري
    cost_center_name: 'text' as const,        // اختياري
    description: 'text' as const,
    terms: 'text' as const,
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
      // طرق تحديد مركز التكلفة (اختياري)
      'cost_center_id',
      'cost_center_code',
      'cost_center_name',
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
      // cost center (اختياري): اتركها فارغة للتعيين التلقائي
      '',            // cost_center_id
      '',            // cost_center_code
      '',            // cost_center_name
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
      // cost center (اختياري)
      '',            // cost_center_id
      '',            // cost_center_code
      '',            // cost_center_name
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
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
    const raw = (parsed.data as any[]).filter(Boolean);
    const normalized = raw.map((row) => normalizeCsvHeaders(row));
    // Add row numbers (starting at 2 to account for header)
    return normalized.map((row, idx) => ({ ...row, rowNumber: idx + 2 }));
  }

  // ===================== Helpers: Resolve IDs from human-friendly fields =====================
  const nameToIdCache = new Map<string, string>();
  const plateToIdCache = new Map<string, string>();
  const ccCodeToIdCache = new Map<string, string>();
  const ccNameToIdCache = new Map<string, string>();

  const normalize = (s?: string) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
  
  const buildFullName = (first?: string | null, last?: string | null) => normalize(`${first || ''} ${last || ''}`);
  
  const isPlaceholderValue = (s?: string) => {
    const v = (s || '').toString().trim().toLowerCase();
    if (!v) return false;
    return ['uuid-here', 'cost-center-uuid-here', 'n/a', 'na', '-', '—', '0', 'null', 'undefined'].includes(v);
  };

  const isCancelledDescription = (desc?: string) => {
    const t = (desc || '').toString().toLowerCase();
    const keywords = ['cancelled', 'canceled', 'cancel', 'ملغي', 'ملغى'];
    return keywords.some((k) => t.includes(k));
  };

  const isUUID = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

  const resolveCostCenterId = async (
    inputs: { cost_center_id?: string; cost_center_code?: string; cost_center_name?: string },
    companyId: string
  ): Promise<{ id?: string; error?: string; provided: boolean }> => {
    const { cost_center_id, cost_center_code, cost_center_name } = inputs || {};
    const provided = !!(cost_center_id || cost_center_code || cost_center_name);

    // If explicit UUID provided, accept it as-is (validated)
    if (cost_center_id) {
      // Treat placeholders as not provided (let triggers assign defaults)
      if (isPlaceholderValue(cost_center_id)) return { id: undefined, provided };
      if (!isUUID(cost_center_id)) return { error: 'قيمة cost_center_id ليست UUID صالحاً', provided };
      return { id: cost_center_id, provided };
    }

    // Resolve by code
    if (cost_center_code) {
      const key = normalize(cost_center_code);
      if (ccCodeToIdCache.has(key)) return { id: ccCodeToIdCache.get(key)!, provided };
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, center_code')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('center_code', cost_center_code)
        .limit(2);
      if (error) return { error: `تعذر البحث عن مركز التكلفة بالكود: ${error.message}`, provided };
      if (!data || data.length === 0) return { error: `لم يتم العثور على مركز تكلفة بالكود: ${cost_center_code}`, provided };
      if (data.length > 1) return { error: `الكود غير فريد لمركز التكلفة: ${cost_center_code}`, provided };
      const id = (data[0] as any).id as string;
      ccCodeToIdCache.set(key, id);
      return { id, provided };
    }

    // Resolve by name (Arabic/English, case-insensitive, partial allowed with uniqueness check)
    if (cost_center_name) {
      const key = normalize(cost_center_name);
      if (ccNameToIdCache.has(key)) return { id: ccNameToIdCache.get(key)!, provided };
      const like = `%${cost_center_name}%`;
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, center_name, center_name_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`center_name.ilike.${like},center_name_ar.ilike.${like}`)
        .limit(5);
      if (error) return { error: `تعذر البحث عن مركز التكلفة بالاسم: ${error.message}`, provided };
      if (!data || data.length === 0) return { error: `لم يتم العثور على مركز تكلفة بالاسم: ${cost_center_name}`, provided };
      const exact = data.filter((cc: any) => normalize((cc as any).center_name) === key || normalize((cc as any).center_name_ar) === key);
      const picked = exact.length === 1 ? exact[0] : (data.length === 1 ? data[0] : null);
      if (!picked) return { error: `اسم مركز التكلفة غير فريد: ${cost_center_name}`, provided };
      const id = (picked as any).id as string;
      ccNameToIdCache.set(key, id);
      return { id, provided };
    }

    // Not provided -> let DB trigger assign default
    return { provided, id: undefined };
  };
  async function resolveCustomerIdByName(customerName: string): Promise<{ id?: string; error?: string }>;
  async function resolveCustomerIdByName(customerName: string, companyId: string): Promise<{ id?: string; error?: string }>;
  async function resolveCustomerIdByName(customerName: string, companyId?: string): Promise<{ id?: string; error?: string }> {
    const key = normalize(customerName);
    if (!key) return { error: 'اسم العميل فارغ' };
    if (nameToIdCache.has(key)) return { id: nameToIdCache.get(key)! };

    const like = `%${customerName}%`;
    let query = supabase
      .from('customers')
      .select('id, customer_type, company_name, first_name, last_name')
      .or(`company_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(20);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

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
  }

  async function resolveVehicleIdByNumber(plateOrNumber: string): Promise<{ id?: string; error?: string }>;
  async function resolveVehicleIdByNumber(plateOrNumber: string, companyId: string): Promise<{ id?: string; error?: string }>;
  async function resolveVehicleIdByNumber(plateOrNumber: string, companyId?: string): Promise<{ id?: string; error?: string }> {
    const key = normalize(plateOrNumber);
    if (!key) return { error: 'رقم المركبة فارغ' };
    if (plateToIdCache.has(key)) return { id: plateToIdCache.get(key)! };

    // نجرب تطابق دقيق أولاً ثم نfallback إلى بحث جزئي (مع تقييد الشركة إن وُجد)
    let exactQuery = supabase
      .from('vehicles')
      .select('id, plate_number');
    if (companyId) {
      exactQuery = exactQuery.eq('company_id', companyId);
    }
    const { data: exact, error: e1 } = await exactQuery
      .eq('plate_number', plateOrNumber)
      .limit(1);

    if (e1) return { error: `تعذر البحث عن المركبة: ${e1.message}` };

    let picked = exact && exact[0];

    if (!picked) {
      const like = `%${plateOrNumber}%`;
      let partialQuery = supabase
        .from('vehicles')
        .select('id, plate_number');
      if (companyId) {
        partialQuery = partialQuery.eq('company_id', companyId);
      }
      const { data: partial, error: e2 } = await partialQuery
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
  }
  // Preprocess row: resolve non-UUID identifiers and handle placeholders
  const preprocessAndResolveIds = async (
    input: any,
    companyId: string
  ): Promise<{ data?: any; error?: string }> => {
    try {
      const out: any = { ...input };
      const rowNum = input.rowNumber || 0;

      // Normalize obvious alias fields
      if (!out.vehicle_number && out.plate_number) out.vehicle_number = out.plate_number;

      // Customer resolution
      const customerRaw: string | undefined = out.customer_id || out.customer_name;
      if (!customerRaw) {
        // keep as is; validate will catch missing
      } else if (isPlaceholderValue(customerRaw)) {
        delete out.customer_id;
      } else if (!isUUID(customerRaw)) {
        const nameKey = out.customer_name || customerRaw;
        const resolved = await resolveCustomerIdByName(String(nameKey), companyId);
        if (resolved.error) return { error: `السطر ${rowNum}: تعذر تحديد العميل من القيمة '${nameKey}' - ${resolved.error}` };
        out.customer_id = resolved.id;
      }

      // Vehicle resolution (optional)
      const vehicleRaw: string | undefined = out.vehicle_id || out.vehicle_number;
      if (!vehicleRaw) {
        // optional
      } else if (isPlaceholderValue(vehicleRaw)) {
        delete out.vehicle_id;
      } else if (!isUUID(vehicleRaw)) {
        const plateKey = out.vehicle_number || vehicleRaw;
        const resolved = await resolveVehicleIdByNumber(String(plateKey), companyId);
        if (resolved.error) return { error: `السطر ${rowNum}: تعذر تحديد المركبة من القيمة '${plateKey}' - ${resolved.error}` };
        out.vehicle_id = resolved.id;
      }

      // Cost center placeholders handled in resolver; nothing here
      return { data: out };
    } catch (e: any) {
      return { error: e?.message || 'خطأ غير معروف أثناء التحضير المسبق' };
    }
  };

  // ============== Additional Helpers: normalization and membership checks ==============
  const normalizeContractType = (value?: string) => {
    const v = (value || '').toString().trim().toLowerCase();
    // Arabic/English synonyms mapping (expanded)
    const map: Record<string, string> = {
      // rental base
      'ايجار': 'rental', 'إيجار': 'rental', 'إيجار عادي': 'rental', 'rent': 'rental', 'rental': 'rental',
      // daily
      'يومي': 'daily_rental', 'يومى': 'daily_rental', 'daily': 'daily_rental', 'daily rental': 'daily_rental', 'daily_rental': 'daily_rental',
      // weekly
      'اسبوعي': 'weekly_rental', 'أسبوعي': 'weekly_rental', 'weekly': 'weekly_rental', 'weekly rental': 'weekly_rental', 'weekly_rental': 'weekly_rental',
      // monthly
      'شهري': 'monthly_rental', 'شهري إيجار': 'monthly_rental', 'إيجار شهري': 'monthly_rental',
      'monthly': 'monthly_rental', 'monthly rental': 'monthly_rental', 'monthly_rental': 'monthly_rental',
      // yearly
      'سنوي': 'yearly_rental', 'سنوى': 'yearly_rental', 'سَنوي': 'yearly_rental', 'سَنوى': 'yearly_rental',
      'yearly': 'yearly_rental', 'annual': 'yearly_rental', 'yearly rental': 'yearly_rental', 'yearly_rental': 'yearly_rental',
      // rent to own
      'تمليك': 'rent_to_own', 'تأجير تمويلي': 'rent_to_own', 'تأجير منتهي بالتمليك': 'rent_to_own', 'إيجار تمليك': 'rent_to_own',
      'rent to own': 'rent_to_own', 'rent_to_own': 'rent_to_own'
    };
    return map[v] || v || '';
  };

  const getFriendlyDbError = (message?: string) => {
    const m = (message || '').toLowerCase();
    if (!m) return 'خطأ غير معروف في قاعدة البيانات';
    
    if (m.includes('row-level security') || m.includes('rls') || m.includes('violates row-level security')) {
      const browsedText = isBrowsingMode && browsedCompany 
        ? ` أنت تتصفح شركة "${browsedCompany.name}" - تأكد من صحة الشركة المختارة.`
        : ' تأكد من اختيار الشركة الصحيحة من أعلى الشاشة.';
      return `رفض بواسطة صلاحيات الأمان (RLS).${browsedText} ثم أعد المحاولة.`;
    }
    
    if (m.includes('foreign key') && m.includes('customer')) {
      return `العميل غير موجود داخل الشركة المستهدفة "${browsedCompany?.name || 'الحالية'}" أو لا تملك صلاحية الوصول إليه.`;
    }
    
    if (m.includes('foreign key') && m.includes('vehicle')) {
      return `المركبة غير موجودة داخل الشركة المستهدفة "${browsedCompany?.name || 'الحالية'}" أو لا تملك صلاحية الوصول إليها.`;
    }
    
    if (m.includes('not-null constraint') && m.includes('customer_id')) {
      return 'العميل مطلوب. يرجى التأكد من صحة customer_id أو اسم العميل.';
    }
    
    return message || 'خطأ غير معروف';
  };

  const validateCustomerInCompany = async (customerId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) return false;
    return !!data?.id;
  };

  const validateVehicleInCompany = async (vehicleId: string, companyId: string) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicleId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) return false;
    return !!data?.id;
  };

  const validateContractData = (data: any, rowNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Required fields validation
    if (!data.customer_id) {
      errors.push('العميل مطلوب: يرجى تزويد customer_id أو customer_name قابل للتعرف')
    } else if (!isUUID(data.customer_id)) {
      errors.push(`معرّف العميل غير صالح (ليس UUID): ${data.customer_id}`)
    }

    if (data.vehicle_id && !isUUID(data.vehicle_id)) {
      errors.push(`معرّف المركبة غير صالح (ليس UUID): ${data.vehicle_id}`)
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
    console.log('📝 [Contract CSV] Starting CSV upload for user:', user?.id, 'target companyId:', companyId);
    console.log('📝 [Contract CSV] Browsing mode:', isBrowsingMode, 'Target company:', browsedCompany?.name);
    
    if (!companyId) {
      console.error('📝 [Contract CSV] Missing companyId from unified access.');
      throw new Error('لا يوجد معرف شركة محدد للرفع. الرجاء اختيار الشركة الصحيحة ثم إعادة المحاولة.');
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    // Set browsed company context for database operations
    if (isBrowsingMode && browsedCompany && user?.roles?.includes('super_admin')) {
      console.log('📝 [Contract CSV] Setting browsed company context for:', browsedCompany.name, browsedCompany.id);
      try {
        const { error } = await supabase.functions.invoke('set-browsed-company', {
          body: { company_id: browsedCompany.id }
        });
        if (error) {
          console.warn('⚠️ [Contract CSV] Could not set browsed company context:', error);
        } else {
          console.log('✅ [Contract CSV] Browsed company context set successfully');
        }
      } catch (error) {
        console.warn('⚠️ [Contract CSV] Failed to set browsed company context:', error);
      }
    }

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
        const originalRow = data[i];

        // Preprocess and resolve IDs (customer/vehicle)
        const pre = await preprocessAndResolveIds({ ...originalRow }, companyId);
        if (pre.error) {
          results.failed++;
          results.errors.push({ row: originalRow.rowNumber || (i + 1), message: pre.error });
          setProgress(Math.round(((i + 1) / data.length) * 100));
          continue;
        }
        const contractData: any = pre.data;

        // Normalize contract type (Arabic/English synonyms)
        contractData.contract_type = normalizeContractType(contractData.contract_type);

        // Validate that provided UUIDs belong to target company
        if (isUUID(contractData.customer_id)) {
          const ok = await validateCustomerInCompany(contractData.customer_id, companyId);
          if (!ok) {
            results.failed++;
            results.errors.push({ row: contractData.rowNumber, message: `معرّف العميل لا ينتمي إلى الشركة المحددة (${contractData.customer_id})` });
            setProgress(Math.round(((i + 1) / data.length) * 100));
            continue;
          }
        }
        if (contractData.vehicle_id && isUUID(contractData.vehicle_id)) {
          const okv = await validateVehicleInCompany(contractData.vehicle_id, companyId);
          if (!okv) {
            results.failed++;
            results.errors.push({ row: contractData.rowNumber, message: `معرّف المركبة لا ينتمي إلى الشركة المحددة (${contractData.vehicle_id})` });
            setProgress(Math.round(((i + 1) / data.length) * 100));
            continue;
          }
        }

        // مركز التكلفة: حل بالمعرّف أو الكود أو الاسم، وإلا اتركه للتعيين التلقائي عبر التريجر
        const cc = await resolveCostCenterId({
          cost_center_id: contractData.cost_center_id,
          cost_center_code: contractData.cost_center_code,
          cost_center_name: contractData.cost_center_name,
        }, companyId);
        if (cc.error) {
          results.failed++;
          results.errors.push({ row: contractData.rowNumber, message: cc.error });
          setProgress(Math.round(((i + 1) / data.length) * 100));
          continue;
        }
        const resolvedCostCenterId = cc.id;
        delete contractData.cost_center_code;
        delete contractData.cost_center_name;

        const validation = validateContractData(contractData, contractData.rowNumber);

        setProgress(Math.round(((i + 1) / data.length) * 100));

        if (!validation.isValid) {
          results.failed++;
          results.errors.push({
            row: contractData.rowNumber,
            message: validation.errors.join(', ')
          });
          continue;
        }

        try {
          // Generate contract number if not provided
          const contractNumber = contractData.contract_number || `CON-${Date.now()}-${i + 1}`;
          console.log(`📝 [Contract CSV] Inserting contract row ${contractData.rowNumber} for company ${companyId}`);

          const contractPayload: any = {
            company_id: companyId,
            customer_id: contractData.customer_id,
            vehicle_id: contractData.vehicle_id || null,
            cost_center_id: resolvedCostCenterId ?? null,
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

          const { error } = await supabase
            .from('contracts')
            .insert(contractPayload);

          if (error) {
            console.error(`📝 [Contract CSV] Database error for row ${contractData.rowNumber}:`, error);
            results.failed++;
            results.errors.push({
              row: contractData.rowNumber,
              message: getFriendlyDbError(error.message)
            });
          } else {
            console.log(`📝 [Contract CSV] Successfully inserted contract row ${contractData.rowNumber}`);
            results.successful++;
          }
        } catch (error: any) {
          console.error(`📝 [Contract CSV] Unexpected error for row ${contractData.rowNumber}:`, error);
          results.failed++;
          results.errors.push({
            row: contractData.rowNumber,
            message: `خطأ غير متوقع: ${error.message}`
          });
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
  const smartUploadContracts = async (
    fixedData: any[],
    options?: { upsert?: boolean; targetCompanyId?: string }
  ) => {
    console.log('📝 [Smart Contract CSV] Starting upload with companyId:', companyId);
    console.log('📝 [Smart Contract CSV] Browsing mode:', isBrowsingMode, 'Target company:', browsedCompany?.name);
    
    setIsUploading(true);
    setProgress(0);

    // Set browsed company context for database operations
    if (isBrowsingMode && browsedCompany && user?.roles?.includes('super_admin')) {
      console.log('📝 [Smart Contract CSV] Setting browsed company context for:', browsedCompany.name, browsedCompany.id);
      try {
        const { error } = await supabase.functions.invoke('set-browsed-company', {
          body: { company_id: browsedCompany.id }
        });
        if (error) {
          console.warn('⚠️ [Smart Contract CSV] Could not set browsed company context:', error);
        } else {
          console.log('✅ [Smart Contract CSV] Browsed company context set successfully');
        }
      } catch (error) {
        console.warn('⚠️ [Smart Contract CSV] Failed to set browsed company context:', error);
      }
    }
    
    const uploadResults: CSVUploadResults = {
      total: fixedData.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const targetCompanyId = options?.targetCompanyId || companyId;
      if (!targetCompanyId) throw new Error('لا يوجد معرف شركة محدد للرفع.');

      for (let i = 0; i < fixedData.length; i++) {
        const originalRow = fixedData[i];
        setProgress(((i + 1) / fixedData.length) * 100);
        const rowNum = originalRow.rowNumber || i + 1;
        
        try {
          // Preprocess row (resolve IDs, normalize)
          const pre = await preprocessAndResolveIds({ ...originalRow }, targetCompanyId);
          if (pre.error) throw new Error(pre.error);
          const contractData: any = pre.data;

          // Normalize type
          contractData.contract_type = normalizeContractType(contractData.contract_type);

          // Membership checks when UUIDs provided directly
          if (isUUID(contractData.customer_id)) {
            const ok = await validateCustomerInCompany(contractData.customer_id, targetCompanyId);
            if (!ok) throw new Error(`معرّف العميل لا ينتمي إلى الشركة المحددة (${contractData.customer_id})`);
          }
          if (contractData.vehicle_id && isUUID(contractData.vehicle_id)) {
            const okv = await validateVehicleInCompany(contractData.vehicle_id, targetCompanyId);
            if (!okv) throw new Error(`معرّف المركبة لا ينتمي إلى الشركة المحددة (${contractData.vehicle_id})`);
          }

          // مركز التكلفة
          const cc = await resolveCostCenterId({
            cost_center_id: contractData.cost_center_id,
            cost_center_code: contractData.cost_center_code,
            cost_center_name: contractData.cost_center_name,
          }, targetCompanyId);
          if (cc.error) throw new Error(cc.error);
          const resolvedCostCenterId = cc.id;
          delete contractData.cost_center_code;
          delete contractData.cost_center_name;

          // التحقق المسبق
          const validation = validateContractData(contractData, rowNum);
          if (!validation.isValid) {
            throw new Error(validation.errors.join(' | '));
          }

          const contractNumber = contractData.contract_number || `CON-${Date.now()}-${i + 1}`;
          
          const contractPayload: any = {
            company_id: targetCompanyId,
            customer_id: contractData.customer_id,
            vehicle_id: contractData.vehicle_id || null,
            cost_center_id: resolvedCostCenterId ?? null,
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

          const { error } = await supabase
            .from('contracts')
            .insert([contractPayload]);

          if (error) throw error;
          uploadResults.successful++;
        } catch (error: any) {
          uploadResults.failed++;
          const dbMessage = error?.message || 'خطأ غير معروف';
          uploadResults.errors.push({
            row: rowNum,
            message: getFriendlyDbError(dbMessage),
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