import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompanyId } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

type ContractTemplateRow = Database['public']['Tables']['contract_templates']['Row'];
type ContractTemplateInsert = Database['public']['Tables']['contract_templates']['Insert'];
type ContractTemplateUpdate = Database['public']['Tables']['contract_templates']['Update'];

export type ContractTemplateType =
  | 'rent_to_own'
  | 'daily_rental'
  | 'weekly_rental'
  | 'monthly_rental'
  | 'yearly_rental';

export interface TemplateAccountMappings {
  revenue_account_id?: string;
  receivables_account_id?: string;
  cost_center_id?: string;
}

export interface TemplatePresetConfig {
  discountPercentage?: number;
  minDays?: number;
  maxDays?: number;
  features?: string[];
}

export interface ContractTemplate {
  id: string;
  company_id: string;
  template_name: string;
  template_name_ar?: string;
  template_type: 'preset' | 'custom';
  contract_type: ContractTemplateType;
  default_duration_days: number;
  default_terms: string;
  auto_calculate_pricing: boolean;
  requires_approval: boolean;
  approval_threshold: number;
  account_id?: string;
  account_mappings: TemplateAccountMappings;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Compatibility fields consumed by the express contract flow.
  rental_days: number;
  description?: string;
  terms?: string;
  preset_config?: TemplatePresetConfig;
}

export interface ContractTemplateData {
  template_name: string;
  template_name_ar?: string;
  contract_type: ContractTemplateType;
  default_duration_days: number;
  default_terms?: string;
  auto_calculate_pricing?: boolean;
  requires_approval?: boolean;
  approval_threshold?: number;
  account_id?: string;
  account_mappings?: TemplateAccountMappings;
  template_description?: string;
}

interface PresetSeed {
  template_name: string;
  contract_type: ContractTemplateType;
  rental_days: number;
  description: string;
  terms: string;
  preset_config: TemplatePresetConfig;
}

export const PRESET_TEMPLATES: PresetSeed[] = [
  {
    template_name: 'عرض نهاية الأسبوع',
    contract_type: 'daily_rental',
    rental_days: 3,
    description: 'إيجار لثلاثة أيام مع خصم 10%.',
    terms: 'مدة الإيجار ثلاثة أيام، ويطبق الخصم على السعر اليومي وفق سياسة الشركة.',
    preset_config: { discountPercentage: 10, minDays: 3, maxDays: 3, features: ['weekend_special'] },
  },
  {
    template_name: 'العقد الشهري للشركات',
    contract_type: 'monthly_rental',
    rental_days: 30,
    description: 'عقد شهري مخصص للشركات مع خصم 15%.',
    terms: 'مدة الإيجار ثلاثون يومًا، وتطبق شروط الصيانة والاستبدال المعتمدة لدى الشركة.',
    preset_config: { discountPercentage: 15, minDays: 30, maxDays: 30, features: ['corporate'] },
  },
  {
    template_name: 'العقد طويل الأجل',
    contract_type: 'yearly_rental',
    rental_days: 180,
    description: 'عقد لمدة ستة أشهر أو أكثر مع خصم 25%.',
    terms: 'الحد الأدنى للعقد 180 يومًا، وتطبق سياسة الإلغاء والصيانة طويلة الأجل.',
    preset_config: { discountPercentage: 25, minDays: 180, maxDays: 365, features: ['long_term'] },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeContractType(value: string): ContractTemplateType {
  if (
    value === 'rent_to_own' || value === 'daily_rental' || value === 'weekly_rental' ||
    value === 'monthly_rental' || value === 'yearly_rental'
  ) return value;
  return 'monthly_rental';
}

function normalizeMappings(value: unknown): TemplateAccountMappings {
  if (!isRecord(value)) return {};
  return {
    revenue_account_id: getString(value.revenue_account_id),
    receivables_account_id: getString(value.receivables_account_id),
    cost_center_id: getString(value.cost_center_id),
  };
}

function normalizePresetConfig(value: unknown): TemplatePresetConfig | undefined {
  if (!isRecord(value)) return undefined;
  const features = Array.isArray(value.features)
    ? value.features.filter((feature): feature is string => typeof feature === 'string')
    : undefined;
  return {
    discountPercentage: getNumber(value.discountPercentage),
    minDays: getNumber(value.minDays),
    maxDays: getNumber(value.maxDays),
    features,
  };
}

function normalizeDatabaseTemplate(row: ContractTemplateRow): ContractTemplate {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const presetConfig = normalizePresetConfig(metadata.preset_config);
  return {
    id: row.id,
    company_id: row.company_id,
    template_name: row.template_name,
    template_name_ar: row.template_name_ar || undefined,
    template_type: row.template_type === 'preset' ? 'preset' : 'custom',
    contract_type: normalizeContractType(row.contract_type),
    default_duration_days: row.default_duration_days,
    default_terms: row.default_terms || '',
    auto_calculate_pricing: row.auto_calculate_pricing,
    requires_approval: row.requires_approval,
    approval_threshold: row.approval_threshold,
    account_id: row.account_id || undefined,
    account_mappings: normalizeMappings(row.account_mappings),
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    rental_days: row.default_duration_days,
    description: row.template_description || undefined,
    terms: row.default_terms || undefined,
    preset_config: presetConfig,
  };
}

function createPresetTemplate(seed: PresetSeed, index: number, companyId: string): ContractTemplate {
  const timestamp = '1970-01-01T00:00:00.000Z';
  return {
    id: `preset-${index}`,
    company_id: companyId,
    template_name: seed.template_name,
    template_type: 'preset',
    contract_type: seed.contract_type,
    default_duration_days: seed.rental_days,
    default_terms: seed.terms,
    auto_calculate_pricing: true,
    requires_approval: false,
    approval_threshold: 0,
    account_mappings: {},
    is_active: true,
    created_by: 'system',
    created_at: timestamp,
    updated_at: timestamp,
    rental_days: seed.rental_days,
    description: seed.description,
    terms: seed.terms,
    preset_config: seed.preset_config,
  };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function toInsert(data: ContractTemplateData, companyId: string, userId: string): ContractTemplateInsert {
  return {
    company_id: companyId,
    created_by: userId,
    template_name: data.template_name.trim(),
    template_name_ar: data.template_name_ar?.trim() || null,
    template_type: 'custom',
    contract_type: data.contract_type,
    default_duration_days: data.default_duration_days,
    default_terms: data.default_terms?.trim() || null,
    template_description: data.template_description?.trim() || null,
    auto_calculate_pricing: data.auto_calculate_pricing ?? true,
    requires_approval: data.requires_approval ?? false,
    approval_threshold: data.approval_threshold ?? 0,
    account_id: data.account_id || null,
    account_mappings: toJson(data.account_mappings || {}),
    is_active: true,
  };
}

function toUpdate(data: Partial<ContractTemplateData>): ContractTemplateUpdate {
  const update: ContractTemplateUpdate = {};
  if (data.template_name !== undefined) update.template_name = data.template_name.trim();
  if (data.template_name_ar !== undefined) update.template_name_ar = data.template_name_ar.trim() || null;
  if (data.contract_type !== undefined) update.contract_type = data.contract_type;
  if (data.default_duration_days !== undefined) update.default_duration_days = data.default_duration_days;
  if (data.default_terms !== undefined) update.default_terms = data.default_terms.trim() || null;
  if (data.template_description !== undefined) update.template_description = data.template_description.trim() || null;
  if (data.auto_calculate_pricing !== undefined) update.auto_calculate_pricing = data.auto_calculate_pricing;
  if (data.requires_approval !== undefined) update.requires_approval = data.requires_approval;
  if (data.approval_threshold !== undefined) update.approval_threshold = data.approval_threshold;
  if (data.account_id !== undefined) update.account_id = data.account_id || null;
  if (data.account_mappings !== undefined) update.account_mappings = toJson(data.account_mappings);
  return update;
}

export const useContractTemplates = () => {
  const companyId = useCurrentCompanyId();
  return useQuery({
    queryKey: ['contract-templates', companyId],
    queryFn: async ({ signal }) => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .abortSignal(signal);
      if (error) throw error;
      return [
        ...PRESET_TEMPLATES.map((preset, index) => createPresetTemplate(preset, index, companyId)),
        ...(data || []).map(normalizeDatabaseTemplate),
      ];
    },
    enabled: Boolean(companyId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateContractTemplate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  return useMutation({
    mutationFn: async (templateData: ContractTemplateData) => {
      if (!companyId || !user?.id) throw new Error('Company or user context is unavailable');
      const { data, error } = await supabase
        .from('contract_templates')
        .insert(toInsert(templateData, companyId, user.id))
        .select('*')
        .single();
      if (error) throw error;
      return normalizeDatabaseTemplate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('تم حفظ القالب بنجاح');
    },
    onError: error => {
      console.error('Error creating contract template:', error);
      toast.error('فشل حفظ القالب');
    },
  });
};

export const useUpdateContractTemplate = () => {
  const queryClient = useQueryClient();
  const companyId = useCurrentCompanyId();
  return useMutation({
    mutationFn: async ({ templateId, data }: { templateId: string; data: Partial<ContractTemplateData> }) => {
      if (!companyId) throw new Error('Company context is unavailable');
      if (templateId.startsWith('preset-')) throw new Error('Cannot update preset templates');
      const { data: updated, error } = await supabase
        .from('contract_templates')
        .update(toUpdate(data))
        .eq('id', templateId)
        .eq('company_id', companyId)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeDatabaseTemplate(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('تم تحديث القالب بنجاح');
    },
    onError: error => {
      console.error('Error updating contract template:', error);
      toast.error(error instanceof Error && error.message.includes('preset') ? 'لا يمكن تعديل القوالب الجاهزة' : 'فشل تحديث القالب');
    },
  });
};

export const useDeleteContractTemplate = () => {
  const queryClient = useQueryClient();
  const companyId = useCurrentCompanyId();
  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!companyId) throw new Error('Company context is unavailable');
      if (templateId.startsWith('preset-')) throw new Error('Cannot delete preset templates');
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .eq('company_id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates'] });
      toast.success('تم حذف القالب بنجاح');
    },
    onError: error => {
      console.error('Error deleting contract template:', error);
      toast.error(error instanceof Error && error.message.includes('preset') ? 'لا يمكن حذف القوالب الجاهزة' : 'فشل حذف القالب');
    },
  });
};

export const applyTemplateToContract = (
  template: ContractTemplate,
  baseData: Record<string, unknown> = {}
): Record<string, unknown> => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + template.rental_days);
  return {
    ...baseData,
    contract_type: template.contract_type,
    rental_days: template.rental_days,
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
    description: template.description || baseData.description || '',
    terms: template.terms || baseData.terms || '',
    customer_id: baseData.customer_id || '',
    vehicle_id: baseData.vehicle_id || '',
  };
};

export const calculateTemplateDiscount = (baseAmount: number, template: ContractTemplate): number => {
  const percentage = template.preset_config?.discountPercentage;
  return percentage ? baseAmount - (baseAmount * percentage) / 100 : baseAmount;
};

export const isTemplateApplicable = (template: ContractTemplate, rentalDays: number): boolean => {
  const { minDays, maxDays } = template.preset_config || {};
  return !(minDays && rentalDays < minDays) && !(maxDays && rentalDays > maxDays);
};

export const useTemplateByType = (contractType: string) => {
  const { data: templates } = useContractTemplates();
  return templates?.find(template => template.contract_type === contractType) || null;
};

export const useApplyTemplate = () => ({ applyTemplate: applyTemplateToContract });

export const getDefaultDurationByType = (contractType: string): number => {
  switch (contractType) {
    case 'daily_rental': return 1;
    case 'weekly_rental': return 7;
    case 'monthly_rental': return 30;
    case 'yearly_rental':
    case 'rent_to_own': return 365;
    default: return 1;
  }
};
