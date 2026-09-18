import type { LawsuitPreparationState } from '../store/types';
import { getFilingReadiness, type FilingReadiness, type TaqadiFieldIssue } from './filingReadiness';

export type PreparationTab = 'overview' | 'evidence' | 'documents' | 'taqadi' | 'actions';
export type FilingResolution =
  | { kind: 'nationality' }
  | { kind: 'customer' }
  | { kind: 'contract' }
  | { kind: 'vehicle' }
  | { kind: 'tab'; tab: PreparationTab; anchor: string };

export interface FilingIssue {
  id: string;
  severity: 'blocking' | 'warning';
  title: string;
  description: string;
  actionLabel: string;
  resolution: FilingResolution;
  pending?: boolean;
}

const evidence = (anchor: string): FilingResolution => ({ kind: 'tab', tab: 'evidence', anchor });

/** Routes existing legal rules to their source controls without changing their severity. */
function legalResolution(message: string): Pick<FilingIssue, 'title' | 'actionLabel' | 'resolution'> {
  if (/الرقم الشخصي/.test(message)) return { title: 'هوية المدعى عليه', actionLabel: 'استكمال بيانات العميل', resolution: { kind: 'customer' } };
  if (/المركبة غير مرتبطة|بيانات العقد/.test(message)) return { title: 'بيانات العقد والمركبة', actionLabel: 'مراجعة العقد', resolution: { kind: 'contract' } };
  if (/عنوان|بريد|البريد|بيانات التبليغ/.test(message)) return { title: 'بيانات التبليغ', actionLabel: 'استكمال بيانات التبليغ', resolution: evidence('lawsuit-contact') };
  if (/مطالبة مالية موجبة/.test(message)) return { title: 'مصدر المطالبة المالية', actionLabel: 'مراجعة مالية العقد', resolution: { kind: 'contract' } };
  if (/نسخة العقد/.test(message)) return { title: 'العقد الموقّع', actionLabel: 'ربط العقد الموقّع', resolution: { kind: 'tab', tab: 'documents', anchor: 'lawsuit-documents' } };
  if (/تسليم/.test(message)) return { title: 'محضر تسليم المركبة وتاريخه', actionLabel: 'استكمال محضر التسليم', resolution: evidence('lawsuit-custody') };
  if (/حيازة|تسليم|استرداد|مفقودة/.test(message)) return { title: 'توثيق التسليم وحيازة المركبة', actionLabel: 'استكمال الحيازة والمحاضر', resolution: evidence('lawsuit-custody') };
  if (/إعذار|تبليغ غير ثابت/.test(message)) return { title: 'إثبات الإنذار', actionLabel: 'إضافة إنذار أو إثبات', resolution: evidence('lawsuit-notices') };
  if (/المخالفات/.test(message)) return { title: 'مستند المخالفات الرسمي', actionLabel: 'رفع مستند الإثبات', resolution: evidence('lawsuit-evidence-upload') };
  if (/التعويض/.test(message)) return { title: 'أدلة التعويض', actionLabel: 'استكمال أدلة التعويض', resolution: evidence('lawsuit-compensation') };
  return { title: 'استكمال الوقائع القانونية', actionLabel: 'مراجعة المسار القانوني', resolution: evidence('lawsuit-legal-path') };
}

function fieldResolution(field: TaqadiFieldIssue['field']): Pick<FilingIssue, 'title' | 'description' | 'actionLabel' | 'resolution'> {
  switch (field) {
    case 'nationality': return {
      title: 'جنسية العميل غير مسجلة',
      description: 'أدخل الجنسية الصحيحة وفق الهوية أو العقد الموقّع. بلد الإقامة لا يحدد الجنسية.',
      actionLabel: 'استكمال الجنسية', resolution: { kind: 'nationality' },
    };
    case 'fullName': return { title: 'اسم المدعى عليه', description: 'استكمل الاسم الرسمي في ملف العميل.', actionLabel: 'استكمال بيانات العميل', resolution: { kind: 'customer' } };
    case 'plate': return { title: 'رقم لوحة المركبة', description: 'استكمل رقم اللوحة في سجل المركبة المرتبطة بالعقد.', actionLabel: 'مراجعة المركبة', resolution: { kind: 'vehicle' } };
    case 'address':
    case 'email': return { title: 'بيانات تبليغ المدعى عليه', description: 'استكمل العنوان والبريد المتحقق منه ومصدرهما ثم احفظ الملف القانوني.', actionLabel: 'استكمال بيانات التبليغ', resolution: evidence('lawsuit-contact') };
    default: return {
      title: field === 'caseTitle' ? 'عنوان الدعوى' : field === 'facts' ? 'وقائع الدعوى' : 'طلبات الدعوى',
      description: 'راجع النص وأكمله في بيانات التقاضي قبل بدء الرفع.',
      actionLabel: 'استكمال نص الدعوى', resolution: { kind: 'tab', tab: 'taqadi', anchor: `lawsuit-${field}` },
    };
  }
}

export function getFilingIssues(state: LawsuitPreparationState, readiness: FilingReadiness = getFilingReadiness(state)): FilingIssue[] {
  const issues: FilingIssue[] = readiness.taqadiIssues
    // Contact rules already explain unknown/unavailable/invalid email precisely.
    .filter(({ field }) => !(['email', 'address'].includes(field) && readiness.legalStatus.issues.some((message) => /بريد|البريد|عنوان|بيانات التبليغ/.test(message))))
    .map(({ field }) => ({ id: `field-${field}`, severity: 'blocking', ...fieldResolution(field) }));

  readiness.legalStatus.issues.forEach((message, index) => {
    // The signed contract card below includes both linking and identity matching.
    if (/نسخة العقد/.test(message) && !readiness.signedLease.isComplete) return;
    issues.push({ id: `legal-${index}`, severity: 'blocking', description: message, ...legalResolution(message) });
  });
  if (!readiness.signedLease.isComplete) {
    issues.push({
      id: 'signed-contract', severity: 'blocking', title: 'العقد الموقّع ومطابقة الهوية',
      description: readiness.signedLease.blockingReason || 'يلزم عقد موقّع يطابق هوية العميل.',
      actionLabel: 'استكمال العقد والتحقق', resolution: { kind: 'tab', tab: 'documents', anchor: 'lawsuit-documents' },
    });
  }
  readiness.requiredDocumentIds.forEach((id) => {
    const doc = state.documents[id];
    if (doc.status === 'ready' || (id === 'contract' && !readiness.signedLease.isComplete)) return;
    const pending = doc.status === 'generating' || Boolean(doc.isUploading);
    issues.push({
      id: `document-${id}`, severity: 'blocking', title: doc.name,
      description: pending ? 'جارٍ تجهيز المستند؛ ستتحدث الجاهزية تلقائيًا عند اكتماله.' : doc.uploadError || doc.error?.message || 'هذا المستند مطلوب ضمن حافظة الدعوى ولم يكتمل بعد.',
      actionLabel: pending ? 'متابعة تجهيز المستند' : 'استكمال المستند', pending,
      resolution: { kind: 'tab', tab: 'documents', anchor: 'lawsuit-documents' },
    });
  });
  const warnings = [...readiness.legalStatus.warnings];
  if (state.litigationProfile
    && (!state.litigationProfile.delivery_handover_date || !state.litigationProfile.delivery_handover_document_id)
    && !warnings.some((message) => /تسليم/.test(message))) {
    warnings.push('محضر تسليم المركبة وتاريخه غير مكتملين؛ أرفق المحضر وحدد التاريخ وفق المستند.');
  }
  warnings.forEach((message, index) => {
    const description = /حيازة المركبة غير مؤكدة/.test(message) && state.contract?.vehicle_returned && !state.litigationProfile?.vehicle_return_document_id
      ? 'سجل العقد يشير إلى عودة المركبة، لكن محضر الرد أو الاسترداد غير مرتبط بالملف والحيازة القانونية غير مؤكدة.'
      : message;
    issues.push({ id: `warning-${index}`, severity: 'warning', description, ...legalResolution(message) });
  });
  return issues;
}
