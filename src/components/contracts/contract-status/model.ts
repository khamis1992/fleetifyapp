import { AlertCircle, CheckCircle2, Clock3, FileText, Pause, Play, Scale, XCircle, type LucideIcon } from 'lucide-react';
import type { ContractCustomer, ContractVehicle } from '@/types/contracts';

export type EditableContractStatus = 'active' | 'suspended' | 'cancelled';
export interface StatusContract {
  id: string;
  company_id?: string;
  contract_number?: string;
  status: string;
  updated_at?: string | null;
  end_date?: string | null;
  customer?: Partial<ContractCustomer> | null;
  customers?: Partial<ContractCustomer> | null;
  vehicle?: Partial<ContractVehicle> | null;
  vehicles?: Partial<ContractVehicle> | null;
  license_plate?: string | null;
}

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  tone: 'green' | 'amber' | 'rose' | 'legal' | 'neutral';
}
export interface StatusOption extends StatusMeta {
  value: EditableContractStatus;
  action: string;
  description: string;
  impact: string;
}

export const statusOptions: StatusOption[] = [
  { value: 'active', label: 'نشط', action: 'تفعيل العقد', icon: Play, tone: 'green',
    description: 'تفعيل العقد أو استئنافه بعد التعليق.',
    impact: 'يُفعّل العقد وتُجهّز الفوترة المرتبطة به وفق بياناته وقواعد النظام.' },
  { value: 'suspended', label: 'معلق', action: 'تعليق العقد', icon: Pause, tone: 'amber',
    description: 'تعليق العقد مؤقتًا مع الاحتفاظ بسجله.',
    impact: 'تتغير حالة العقد إلى «معلق» مع تسجيل سبب التعليق. يمكنك طلب إعادة تفعيله لاحقًا من هذه النافذة.' },
  { value: 'cancelled', label: 'ملغي', action: 'إلغاء العقد', icon: XCircle, tone: 'rose',
    description: 'إلغاء العقد بعد مراجعة المخالفات المرتبطة.',
    impact: 'يُلغى العقد مع الاحتفاظ بسجله، وتُعالج المعاملات المرتبطة وحالة المركبة وفق قواعد الإلغاء في النظام.' },
];

const activatableStatuses = new Set(['draft', 'pending', 'pending_completion', 'suspended']);
export function availableStatusOptions(status: string): StatusOption[] {
  return status === 'under_legal_procedure'
    ? statusOptions.filter(option => option.value !== 'suspended').map(option => option.value === 'cancelled' ? { ...option,
      description: 'إلغاء العقد مع الاحتفاظ بالملف القانوني للمراجعة والمتابعة.',
    } : ({ ...option,
      tone: 'legal', action: 'إنهاء الإجراء القانوني',
      description: 'إنهاء الإجراء وتحديد حالة العقد وفق تاريخ انتهائه.',
      impact: 'إذا لم تُقدّم الدعوى، تُلغى إجراءات التجهيز المرتبطة ويصبح العقد منتهيًا إن انقضت مدته، أو نشطًا بعد اجتياز الفحوص. القضايا المسجلة وبيانات تقديم الدعاوى تحتاج مراجعة النتيجة والإغلاق من سجل القضايا أولاً.',
    }))
    : statusOptions.filter(option => option.value !== status
      && (option.value !== 'active' || activatableStatuses.has(status)));
}

const otherStatuses: Record<string, StatusMeta> = {
  draft: { label: 'مسودة', icon: FileText, tone: 'neutral' },
  pending: { label: 'قيد الانتظار', icon: Clock3, tone: 'neutral' },
  pending_completion: { label: 'بانتظار الاستكمال', icon: Clock3, tone: 'amber' },
  under_review: { label: 'قيد المراجعة', icon: FileText, tone: 'neutral' },
  expiring_soon: { label: 'قارب على الانتهاء', icon: Clock3, tone: 'amber' },
  expired: { label: 'منتهي', icon: Clock3, tone: 'neutral' },
  renewed: { label: 'مجدد', icon: CheckCircle2, tone: 'green' },
  completed: { label: 'مكتمل', icon: CheckCircle2, tone: 'green' },
  closed: { label: 'مغلق', icon: CheckCircle2, tone: 'neutral' },
  canceled: { label: 'ملغي', icon: XCircle, tone: 'rose' },
  terminated: { label: 'موقوف', icon: XCircle, tone: 'rose' },
  under_legal_procedure: { label: 'تحت الإجراء القانوني', icon: Scale, tone: 'legal' },
};
export function statusMeta(status?: string): StatusMeta {
  return statusOptions.find(option => option.value === status) || otherStatuses[status || '']
    || { label: 'غير محددة', icon: AlertCircle, tone: 'neutral' };
}

export function statusCustomerName(contract: StatusContract): string {
  const customer = contract.customer || contract.customers;
  return customer?.company_name_ar
    || [customer?.first_name_ar, customer?.last_name_ar].filter(Boolean).join(' ')
    || customer?.company_name
    || [customer?.first_name, customer?.last_name].filter(Boolean).join(' ')
    || 'غير محدد';
}
