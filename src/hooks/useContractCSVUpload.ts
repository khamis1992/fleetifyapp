import { useState } from "react"
import Papa from "papaparse"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { ContractCreationData } from "@/types/contracts"
import { toast } from "sonner"
import { normalizeCsvHeaders } from "@/utils/csv"
import { cleanPhone, normalizeDigits } from "@/lib/phone"
import { addDays, addMonths, addYears, differenceInMonths, parseISO, isValid as isValidDate, format } from "date-fns"
import { useCSVArchive } from "@/hooks/useCSVArchive"

interface CSVUploadResults {
  total: number
  successful: number
  failed: number
  customersCreated?: number
  contractsCreated?: number
  errors: Array<{ row: number; message: string; customerName?: string }>
  warnings?: Array<{ row: number; message: string; customerName?: string }>
}

export function useContractCSVUpload() {
  const { user, companyId, isBrowsingMode, browsedCompany } = useUnifiedCompanyAccess()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<CSVUploadResults | null>(null)
  const { archiveCSV } = useCSVArchive()

  // تعريف أنواع الحقول للعقود بما يدعم الحقول الذكية (الاسم/اللوحة)
  const contractFieldTypes = {
    customer_id: 'text' as const,
    customer_name: 'text' as const,
    customer_phone: 'phone' as const, // هاتف العميل (للبحث/الإنشاء التلقائي)
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
      'customer_phone', // مطلوب فقط عند تفعيل الإنشاء التلقائي
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

    // أمثلة مبنية على البيانات المرفقة من المستخدم
    const exampleData1 = [
      'issam abdallah',
      '',
      '+96550123456',
      '7036',
      '',
      'LTO2024139',
      'rent_to_own',
      '2024-04-29',
      '2024-04-29',
      '2024-11-30',
      '75600',
      '2100',
      '',            // cost_center_id
      '',            // cost_center_code
      '',            // cost_center_name
      'عقد إيجار منتهي بالتمليك',
      'يلتزم المستأجر بدفع الإيجار في موعده المحدد'
    ]

    const exampleData2 = [
      'MEHRAN TABIB TABIB HUSSAIN',
      '',
      '+96555555555',
      '749762',
      '',
      'LTO20249',
      'rent_to_own',
      '2023-11-26',
      '2023-11-26',
      '2026-11-26',
      '0',
      '0',
      '',            // cost_center_id
      '',            // cost_center_code
      '',            // cost_center_name
      'عقد إيجار منتهي بالتمليك - نشط',
      'يلتزم المستأجر بدفع الإيجار في موعده المحدد'
    ]

    const exampleData3 = [
      'AHMED BEN DHAOU',
      '',
      '+96566666666',
      '7071',
      '',
      'LTO2024153',
      'rent_to_own',
      '2024-03-12',
      '2024-03-12',
      '2027-06-01',
      '0',
      '0',
      '',            // cost_center_id
      '',            // cost_center_code
      '',            // cost_center_name
      'cancelled - عقد ملغي',
      'تم الإلغاء قبل التفعيل'
    ]

    const csvContent = [
      headers.join(','),
      exampleData1.join(','),
      exampleData2.join(','),
      exampleData3.join(',')
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

  // دالة البحث عن العميل أو إنشاؤه تلقائياً
  const findOrCreateCustomer = async (customerName: string, targetCompanyId: string): Promise<{ id: string; created: boolean; error?: string }> => {
    try {
      // تنظيف اسم العميل
      const cleanName = customerName.trim()
      if (!cleanName) {
        return { id: '', created: false, error: 'اسم العميل فارغ' }
      }

      console.log(`🔍 البحث عن العميل: "${cleanName}" في الشركة ${targetCompanyId}`)
      
      // البحث عن العميل الموجود باستخدام البحث الذكي
      const searchResult = await resolveCustomerIdByName(cleanName, targetCompanyId)
      
      if (searchResult.id) {
        console.log(`✅ تم العثور على العميل الموجود: ${searchResult.id}`)
        return { id: searchResult.id, created: false }
      }

      // إذا لم يوجد العميل، نقوم بإنشائه
      console.log(`➕ إنشاء عميل جديد: "${cleanName}"`)
      
      // تحديد نوع العميل (فرد أم شركة)
      const isCompany = cleanName.includes('شركة') || cleanName.includes('مؤسسة') || 
                       cleanName.includes('Company') || cleanName.includes('Corp') ||
                       cleanName.includes('LLC') || cleanName.includes('Ltd') ||
                       cleanName.toUpperCase() === cleanName // إذا كان الاسم بأحرف كبيرة

      let customerData: any = {
        company_id: targetCompanyId,
        is_active: true,
        is_blacklisted: false,
        credit_limit: 0,
        city: 'Kuwait City',
        country: 'Kuwait',
        phone: '+965XXXXXXXX', // رقم وهمي - يجب تحديثه لاحقاً
        created_by: user?.id
      }

      if (isCompany) {
        customerData = {
          ...customerData,
          customer_type: 'corporate',
          company_name: cleanName,
          company_name_ar: cleanName,
        }
      } else {
        // تقسيم الاسم إلى أول وأخير
        const nameParts = cleanName.split(' ')
        const firstName = nameParts[0] || cleanName
        const lastName = nameParts.slice(1).join(' ') || 'غير محدد'

        customerData = {
          ...customerData,
          customer_type: 'individual',
          first_name: firstName,
          last_name: lastName,
          first_name_ar: firstName,
          last_name_ar: lastName,
        }
      }

      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id')
        .single()

      if (createError) {
        console.error(`❌ فشل في إنشاء العميل "${cleanName}":`, createError)
        return { 
          id: '', 
          created: false, 
          error: `فشل في إنشاء العميل "${cleanName}": ${createError.message}` 
        }
      }

      console.log(`✅ تم إنشاء عميل جديد بنجاح: ${newCustomer.id}`)
      return { id: newCustomer.id, created: true }

    } catch (error: any) {
      console.error(`❌ خطأ في معالجة العميل "${customerName}":`, error)
      return { 
        id: '', 
        created: false, 
        error: `خطأ في معالجة العميل "${customerName}": ${error.message}` 
      }
    }
  };

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
    companyId: string,
    autoCreateCustomers: boolean = false
  ): Promise<{ data?: any; error?: string }> => {
    try {
      const out: any = { ...input };
      const rowNum = input.rowNumber || 0;

      // Normalize obvious alias fields
      if (!out.vehicle_number && out.plate_number) out.vehicle_number = out.plate_number;

      // Customer resolution (phone-first, then name; supports auto-create)
      const rawId: string | undefined = out.customer_id;
      const rawPhone: string | undefined = out.customer_phone;
      const rawName: string | undefined = out.customer_name;

      if (rawId) {
        if (isPlaceholderValue(rawId)) {
          delete out.customer_id;
        } else if (!isUUID(rawId)) {
          // Treat as name if not a UUID
          const nameKey = rawName || rawId;
          const resolved = await resolveCustomerIdByName(String(nameKey), companyId);
          if (resolved.error) {
            return { error: `السطر ${rowNum}: تعذر تحديد العميل من القيمة '${nameKey}' - ${resolved.error}` };
          }
          out.customer_id = resolved.id;
        }
      } else if (rawPhone && String(rawPhone).trim() !== '') {
        const normalizedPhone = normalizeDigits(String(rawPhone).trim());
        const cleanedPhone = cleanPhone(normalizedPhone);

        const { data: byPhone, error: phoneErr } = await supabase
          .from('customers')
          .select('id, phone')
          .eq('company_id', companyId)
          .eq('phone', cleanedPhone)
          .limit(5);
        if (phoneErr) return { error: `السطر ${rowNum}: تعذر البحث عن العميل برقم الهاتف - ${phoneErr.message}` };

        if (byPhone && byPhone.length === 1) {
          out.customer_id = (byPhone[0] as any).id;
        } else if (byPhone && byPhone.length > 1) {
          return { error: `السطر ${rowNum}: رقم الهاتف غير فريد داخل الشركة: ${cleanedPhone}` };
        } else {
          // Not found by phone - try to create or find by name
          if (rawName) {
            if (autoCreateCustomers) {
              // استخدام الدالة الجديدة للبحث أو الإنشاء
              const result = await findOrCreateCustomer(String(rawName), companyId);
              if (result.error) {
                return { error: `السطر ${rowNum}: ${result.error}` };
              }
              out.customer_id = result.id;
              // إضافة معلومة عن إنشاء عميل جديد للإحصائيات
              if (result.created) {
                out._customerCreated = true;
              }
            } else {
              const resolved = await resolveCustomerIdByName(String(rawName), companyId);
              if (resolved.error) return { error: `السطر ${rowNum}: تعذر تحديد العميل من الاسم '${rawName}' - ${resolved.error}` };
              out.customer_id = resolved.id;
            }
          } else {
            // No way to resolve a customer
            // leave as is; validation will flag missing customer_id
          }
        }
      } else if (rawName) {
        if (autoCreateCustomers) {
          // استخدام الدالة الجديدة للبحث أو الإنشاء
          const result = await findOrCreateCustomer(String(rawName), companyId);
          if (result.error) {
            return { error: `السطر ${rowNum}: ${result.error}` };
          }
          out.customer_id = result.id;
          // إضافة معلومة عن إنشاء عميل جديد للإحصائيات
          if (result.created) {
            out._customerCreated = true;
          }
        } else {
          const resolved = await resolveCustomerIdByName(String(rawName), companyId);
          if (resolved.error) return { error: `السطر ${rowNum}: تعذر تحديد العميل من الاسم '${rawName}' - ${resolved.error}` };
          out.customer_id = resolved.id;
        }
      } else {
        // keep as is; validate will catch missing customer
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

  // ====== Auto-complete helpers for contract fields ======
  const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');
  const parseDateFlexible = (val?: any): Date | null => {
    if (!val) return null;
    const s = String(val).trim();
    // Try ISO first
    let d: Date | null = null;
    try {
      const iso = parseISO(s);
      if (isValidDate(iso)) d = iso;
    } catch {}
    if (!d) {
      const tmp = new Date(s);
      if (!isNaN(tmp.getTime())) d = tmp;
    }
    return d;
  };
  const toNumber = (val: any): number | undefined => {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const cleaned = String(val).replace(/\u066B/g, '.').replace(/[٬,\s]/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? undefined : n;
  };
  const monthsBetweenInclusive = (start: Date, end: Date): number => {
    const diff = differenceInMonths(end, start);
    return diff <= 0 ? 1 : diff + 1; // include the starting month window
  };

  const autoCompleteContractFields = (row: any) => {
    const out: any = { ...row };

    // Normalize contract type and set default
    out.contract_type = normalizeContractType(out.contract_type) || 'monthly_rental';

    // Dates
    const today = new Date();
    let contractDate = parseDateFlexible(out.contract_date) || null;
    let startDate = parseDateFlexible(out.start_date) || null;
    let endDate = parseDateFlexible(out.end_date) || null;

    if (!contractDate) contractDate = startDate || today;
    if (!startDate) startDate = contractDate || today;

    if (!endDate && startDate) {
      switch (out.contract_type) {
        case 'daily_rental':
          endDate = addDays(startDate, 1);
          break;
        case 'weekly_rental':
          endDate = addDays(startDate, 7);
          break;
        case 'yearly_rental':
          endDate = addYears(startDate, 1);
          break;
        case 'monthly_rental':
        default:
          endDate = addMonths(startDate, 1);
          break;
      }
    }

    if (contractDate) out.contract_date = toISODate(contractDate);
    if (startDate) out.start_date = toISODate(startDate);
    if (endDate) out.end_date = toISODate(endDate);

    // Amounts
    const contractAmount = toNumber(out.contract_amount);
    const monthlyAmount = toNumber(out.monthly_amount);

    if (startDate && endDate) {
      const months = monthsBetweenInclusive(startDate, endDate);
      if (contractAmount !== undefined && monthlyAmount === undefined) {
        out.monthly_amount = Number((contractAmount / months).toFixed(2));
      } else if (monthlyAmount !== undefined && contractAmount === undefined) {
        out.contract_amount = Number((monthlyAmount * months).toFixed(2));
      } else if (contractAmount !== undefined && monthlyAmount !== undefined) {
        // keep both as provided but normalize numeric formatting
        out.contract_amount = contractAmount;
        out.monthly_amount = monthlyAmount;
      }
    } else if (contractAmount !== undefined && monthlyAmount === undefined) {
      // Fallback: align monthly to contract if duration unknown
      out.monthly_amount = contractAmount;
    }

    return out;
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
    
    if (m.includes('duplicate key value') || m.includes('unique constraint')) {
      if (m.includes('contracts_contract_number') || m.includes('contract_number')) {
        return 'رقم العقد مكرر داخل نفس الشركة. سيتم توليد رقم بديل تلقائياً أو عدِّل الرقم في الملف ثم أعد المحاولة.';
      }
      return 'قيمة مكررة تنتهك شرط التفرد. تحقق من القيم الفريدة.';
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

  const uploadContracts = async (file: File, shouldArchive: boolean = false) => {
    console.log('📝 [Contract CSV] Starting CSV upload for user:', user?.id, 'target companyId:', companyId);
    console.log('📝 [Contract CSV] Browsing mode:', isBrowsingMode, 'Target company:', browsedCompany?.name);
    
    if (!companyId) {
      console.error('📝 [Contract CSV] Missing companyId from unified access.');
      throw new Error('لا يوجد معرف شركة محدد للرفع. الرجاء اختيار الشركة الصحيحة ثم إعادة المحاولة.');
    }

    setIsUploading(true)
    setProgress(0)
    setResults(null)

    // Note: We no longer set browsed company via edge function; we pass company_id explicitly per insert


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
        customersCreated: 0,
        contractsCreated: 0,
        errors: [],
        warnings: []
      }

      for (let i = 0; i < data.length; i++) {
        const originalRow = data[i];

        // Auto-complete missing fields (type, dates, amounts)
        const filledRow = autoCompleteContractFields({ ...originalRow });

        // Preprocess and resolve IDs (customer/vehicle) - مع إمكانية إنشاء العملاء تلقائياً
        const pre = await preprocessAndResolveIds({ ...filledRow }, companyId, true); // تفعيل إنشاء العملاء
        if (pre.error) {
          results.failed++;
          results.errors.push({ 
            row: originalRow.rowNumber || (i + 1), 
            message: pre.error,
            customerName: filledRow.customer_name || filledRow.customer_id
          });
          setProgress(Math.round(((i + 1) / data.length) * 100));
          continue;
        }
        const contractData: any = pre.data;

        // تتبع إنشاء العملاء الجدد
        if (contractData._customerCreated) {
          results.customersCreated!++;
          delete contractData._customerCreated; // إزالة المعلومة المؤقتة
        }

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

          let insertError: any = null;
          let { error: insertErr } = await supabase
            .from('contracts')
            .insert(contractPayload);

          if (insertErr) {
            const msg = String(insertErr.message || '').toLowerCase();
            if ((msg.includes('duplicate') || msg.includes('unique constraint')) && msg.includes('contract_number')) {
              const altNumber = `${contractNumber}-${Date.now() % 10000}`;
              const retryPayload = { ...contractPayload, contract_number: altNumber };
              const retry = await supabase.from('contracts').insert(retryPayload);
              if (retry.error) insertError = retry.error;
            } else {
              insertError = insertErr;
            }
          }

          if (insertError) {
            console.error(`📝 [Contract CSV] Database error for row ${contractData.rowNumber}:`, insertError);
            results.failed++;
            results.errors.push({
              row: contractData.rowNumber,
              message: getFriendlyDbError(insertError.message),
              customerName: filledRow.customer_name || filledRow.customer_id
            });
          } else {
            console.log(`📝 [Contract CSV] Successfully inserted contract row ${contractData.rowNumber}`);
            results.successful++;
            results.contractsCreated!++;
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
      
      // حفظ الملف في الأرشيف إذا طُلب ذلك
      if (shouldArchive) {
        try {
          const fileContent = await file.text()
          const createdContractsIds = results.contractsCreated ? 
            Array.from({ length: results.contractsCreated }, (_, i) => `contract_${i + 1}`) : []
          
          archiveCSV({
            file,
            fileContent,
            uploadType: 'contracts',
            processingResults: {
              uploadMode: 'classic',
              completed: true,
              summary: results
            },
            totalRows: results.total,
            successfulRows: results.successful,
            failedRows: results.failed,
            errorDetails: results.errors,
            createdContractsIds,
            metadata: {
              uploadedAt: new Date().toISOString(),
              fileSize: file.size,
              fileName: file.name,
            }
          })
        } catch (archiveError) {
          console.warn('فشل في أرشفة الملف:', archiveError)
          // لا نوقف العملية إذا فشلت الأرشفة
        }
      }
      
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
    options?: { upsert?: boolean; targetCompanyId?: string; autoCreateCustomers?: boolean; autoCompleteDates?: boolean; autoCompleteType?: boolean; autoCompleteAmounts?: boolean; dryRun?: boolean; shouldArchive?: boolean; originalFile?: File }
  ) => {
    console.log('📝 [Smart Contract CSV] Starting upload with companyId:', companyId);
    console.log('📝 [Smart Contract CSV] Browsing mode:', isBrowsingMode, 'Target company:', browsedCompany?.name);
    
    setIsUploading(true);
    setProgress(0);

    // Note: We no longer set browsed company via edge function; we pass company_id explicitly per insert

    
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
          // Auto-complete first, then optionally revert fields based on toggles
          const autoFilled = autoCompleteContractFields({ ...originalRow });
          const filledRow = (() => {
            const out: any = { ...autoFilled };
            // If user disabled type auto-complete and original had no type, remove default
            if (options?.autoCompleteType === false && !originalRow.contract_type) {
              delete out.contract_type;
            }
            // Dates
            if (options?.autoCompleteDates === false) {
              if (!originalRow.contract_date) delete out.contract_date; else out.contract_date = originalRow.contract_date;
              if (!originalRow.start_date) delete out.start_date; else out.start_date = originalRow.start_date;
              if (!originalRow.end_date) delete out.end_date; else out.end_date = originalRow.end_date;
            }
            // Amounts
            if (options?.autoCompleteAmounts === false) {
              if (!originalRow.contract_amount) delete out.contract_amount; else out.contract_amount = originalRow.contract_amount;
              if (!originalRow.monthly_amount) delete out.monthly_amount; else out.monthly_amount = originalRow.monthly_amount;
            }
            return out;
          })();
          const pre = await preprocessAndResolveIds({ ...filledRow }, targetCompanyId, Boolean(options?.autoCreateCustomers));
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

          // Dry-run: count as success without inserting
          if (options?.dryRun) {
            uploadResults.successful++;
          } else {
            let insertError: any = null;
            let { error: insertErr } = await supabase.from('contracts').insert([contractPayload]);
            if (insertErr) {
              const msg = String(insertErr.message || '').toLowerCase();
              if ((msg.includes('duplicate') || msg.includes('unique constraint')) && msg.includes('contract_number')) {
                const altNumber = `${contractNumber}-${Date.now() % 10000}`;
                const retryPayload = { ...contractPayload, contract_number: altNumber };
                const retry = await supabase.from('contracts').insert([retryPayload]);
                if (retry.error) insertError = retry.error;
              } else {
                insertError = insertErr;
              }
            }
            if (insertError) throw insertError;
            uploadResults.successful++;
          }
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
      
      // حفظ الملف في الأرشيف إذا طُلب ذلك
      if (options?.shouldArchive && options?.originalFile) {
        try {
          const fileContent = await options.originalFile.text()
          
          archiveCSV({
            file: options.originalFile,
            fileContent,
            uploadType: 'contracts',
            processingResults: {
              uploadMode: 'smart',
              completed: true,
              summary: uploadResults,
              options
            },
            totalRows: uploadResults.total,
            successfulRows: uploadResults.successful,
            failedRows: uploadResults.failed,
            errorDetails: uploadResults.errors,
            metadata: {
              uploadedAt: new Date().toISOString(),
              fileSize: options.originalFile.size,
              fileName: options.originalFile.name,
              smartUploadOptions: options
            }
          })
        } catch (archiveError) {
          console.warn('فشل في أرشفة الملف:', archiveError)
          // لا نوقف العملية إذا فشلت الأرشفة
        }
      }
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