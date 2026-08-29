import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useLawsuitPreparationContext } from '../store';
import type {
  DamageCost,
  FormalNotice,
  LitigationProfile,
  RescissionStrategy,
} from '../store/types';
import {
  DEFAULT_DEFENDANT_SERVICE_ADDRESS,
  evaluateLegalCaseReadiness,
} from '../utils/legalCaseWorkflow';
import {
  buildLegalEvidenceAnalysis,
  inferEvidenceDocumentType,
  type LegalEvidenceAnalysis,
} from '../utils/legalEvidenceAutomation';
import { generateLegalComplaintHTML, type LegalDocumentData } from '@/utils/legal-document-generator';

const fieldClass = 'h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800';

const defaultProfile = (): Partial<LitigationProfile> => ({
  rescission_strategy: 'judicial_rescission',
  termination_type: 'judicial_rescission',
  termination_date: null,
  termination_date_source: null,
  termination_date_status: 'requires_judicial_proof',
  termination_supporting_document_id: null,
  delivery_handover_date: null,
  delivery_handover_document_id: null,
  vehicle_custody: 'unknown',
  vehicle_returned_at: null,
  vehicle_return_document_id: null,
  renewal_applies: false,
  renewed_end_date: null,
  rent_due_day: null,
  payment_clause_number: null,
  return_clause_number: null,
  violations_clause_number: null,
  termination_clause_number: null,
  termination_clause_text: null,
  notice_exception_type: null,
  notice_exception_clause_or_reason: null,
  notice_exception_document_id: null,
  defendant_service_address: DEFAULT_DEFENDANT_SERVICE_ADDRESS,
  defendant_email: null,
  defendant_email_status: 'unknown',
  defendant_contact_source: null,
  defendant_contact_document_id: null,
  security_deposit_amount: null,
  apply_security_deposit: false,
  retention_daily_rate: null,
  retention_rate_source: null,
  retention_rate_source_ref: null,
  retention_rate_source_document_id: null,
  contractual_compensation_enabled: false,
  contractual_compensation_clause_number: null,
  contractual_compensation_clause_text: null,
  contractual_compensation_method: null,
  contractual_compensation_rate: null,
  contractual_compensation_cap: null,
  contractual_compensation_document_id: null,
  legal_review_status: 'draft',
  notes: null,
});

function nullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function EvidenceSelect({
  value,
  onChange,
  documents,
  allowEmpty = true,
}: {
  value?: string | null;
  onChange: (value: string | null) => void;
  documents: { id: string; document_name: string; document_type: string }[];
  allowEmpty?: boolean;
}) {
  return (
    <select value={value || ''} onChange={(event) => onChange(event.target.value || null)} className={fieldClass}>
      {allowEmpty && <option value="">اختر مستند الإثبات</option>}
      {documents.map((document) => (
        <option key={document.id} value={document.id}>
          {document.document_name} — {document.document_type}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="font-bold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

export function LegalEvidence() {
  const { state, actions } = useLawsuitPreparationContext();
  const [profile, setProfile] = useState<Partial<LitigationProfile>>(defaultProfile);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('auto');
  const [reviewingProposal, setReviewingProposal] = useState<string | null>(null);
  // مرآة العرض الحية للمحرك نفسه؛ التحليل الفعلي يعمل تلقائياً في الخلفية
  const analysis: LegalEvidenceAnalysis = useMemo(
    () => buildLegalEvidenceAnalysis(state, { vehicleReturn: null, vehiclePricing: null, contractTemplate: null }),
    [state],
  );
  const [notice, setNotice] = useState<Partial<FormalNotice>>({
    notice_type: 'payment_demand',
    sent_on: '',
    delivery_method: 'registered_mail',
    delivery_confirmed: false,
    grace_period_days: null,
    delivered_on: null,
    proof_document_id: null,
    notes: null,
  });
  const [damage, setDamage] = useState<Partial<DamageCost>>({
    cost_type: 'recovery_towing',
    description: '',
    amount: 0,
    cost_date: null,
    evidence_document_id: null,
    evidence_url: null,
    verified: false,
    causation_notes: null,
    depreciation_deduction: 0,
    insurance_recovery: 0,
    notes: null,
  });

  useEffect(() => {
    if (state.litigationProfile) {
      const customerEmail = state.customer?.email?.trim();
      const canUseCustomerRecord = Boolean(customerEmail)
        && state.litigationProfile.defendant_contact_source !== 'verified_manual';
      setProfile({
        ...state.litigationProfile,
        defendant_service_address: state.litigationProfile.defendant_service_address
          || state.customer?.address?.trim()
          || DEFAULT_DEFENDANT_SERVICE_ADDRESS,
        defendant_email: canUseCustomerRecord ? null : state.litigationProfile.defendant_email,
        defendant_email_status: canUseCustomerRecord
          ? 'verified'
          : state.litigationProfile.defendant_email_status,
        defendant_contact_source: canUseCustomerRecord
          ? 'customer_record'
          : state.litigationProfile.defendant_contact_source,
      });
      return;
    }
    const customerEmail = state.customer?.email?.trim();
    setProfile({
      ...defaultProfile(),
      defendant_email_status: customerEmail ? 'verified' : 'unknown',
      defendant_contact_source: 'customer_record',
    });
  }, [state.customer?.address, state.customer?.email, state.litigationProfile]);

  const readiness = useMemo(() => evaluateLegalCaseReadiness(state), [state]);
  const evidenceDocuments = state.contractEvidenceDocuments;

  const updateProfile = <K extends keyof LitigationProfile>(key: K, value: LitigationProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const selectPath = (path: RescissionStrategy) => {
    setProfile((current) => ({
      ...current,
      rescission_strategy: path,
      termination_type: path === 'natural_expiry'
        ? 'contract_expired'
        : path === 'documented_termination'
          ? 'documented_cancellation'
          : 'judicial_rescission',
      termination_date: path === 'natural_expiry'
        ? current.renewal_applies
          ? current.renewed_end_date || null
          : state.contract?.end_date || null
        : path === 'judicial_rescission'
          ? null
          : current.termination_date || null,
      termination_date_status: path === 'judicial_rescission'
        ? 'requires_judicial_proof'
        : current.termination_date_status || 'confirmed',
    }));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const effectiveTerminationDate = profile.rescission_strategy === 'natural_expiry'
        && profile.renewal_applies
        ? nullable(profile.renewed_end_date)
        : nullable(profile.termination_date);
      await actions.saveLitigationProfile({
        ...profile,
        renewed_end_date: nullable(profile.renewed_end_date),
        termination_date: effectiveTerminationDate,
        termination_date_source: nullable(profile.termination_date_source),
        termination_clause_number: nullable(profile.termination_clause_number),
        termination_clause_text: nullable(profile.termination_clause_text),
        notice_exception_clause_or_reason: nullable(profile.notice_exception_clause_or_reason),
        defendant_service_address: nullable(profile.defendant_service_address),
        defendant_email: profile.defendant_email_status === 'unavailable'
          || profile.defendant_contact_source === 'customer_record'
          ? null
          : nullable(profile.defendant_email),
        defendant_email_status: profile.defendant_email_status || 'unknown',
        delivery_handover_date: nullable(profile.delivery_handover_date),
        vehicle_returned_at: nullable(profile.vehicle_returned_at),
        rent_due_day: numberOrNull(profile.rent_due_day),
        security_deposit_amount: numberOrNull(profile.security_deposit_amount),
        retention_daily_rate: numberOrNull(profile.retention_daily_rate),
        retention_rate_source_ref: nullable(profile.retention_rate_source_ref),
        contractual_compensation_rate: numberOrNull(profile.contractual_compensation_rate),
        contractual_compensation_cap: numberOrNull(profile.contractual_compensation_cap),
        notes: nullable(profile.notes),
        legal_review_status: 'draft',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الملف القانوني');
    } finally {
      setSaving(false);
    }
  };

  const uploadEvidence = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const detectedType = uploadType === 'auto'
        ? inferEvidenceDocumentType(file.name)
        : uploadType;
      await actions.uploadEvidenceDocument(file, detectedType, file.name);
      if (uploadType === 'auto') {
        toast.success(`صُنّف المستند تلقائياً: ${detectedType}`);
      }
      event.target.value = '';
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع مستند الإثبات');
    } finally {
      setUploading(false);
    }
  };

  const reviewProposal = async (proposalId: string, decision: 'accept' | 'reject') => {
    setReviewingProposal(proposalId);
    try {
      await actions.reviewEvidenceProposal(proposalId, decision);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر مراجعة المقترح');
    } finally {
      setReviewingProposal(null);
    }
  };

  const submitNotice = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await actions.saveFormalNotice({
        id: notice.id,
        notice_type: notice.notice_type || 'payment_demand',
        sent_on: notice.sent_on || '',
        delivery_method: notice.delivery_method || 'registered_mail',
        delivered_on: nullable(notice.delivered_on),
        delivery_confirmed: Boolean(notice.delivery_confirmed),
        grace_period_days: numberOrNull(notice.grace_period_days),
        proof_document_id: notice.proof_document_id || null,
        notes: nullable(notice.notes),
      });
      setNotice((current) => ({
        ...current,
        id: undefined,
        sent_on: '',
        delivered_on: null,
        proof_document_id: null,
        delivery_confirmed: false,
        notes: null,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الإنذار');
    }
  };

  const submitDamage = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await actions.saveDamageCost({
        id: damage.id,
        cost_type: damage.cost_type || 'other',
        description: damage.description?.trim() || '',
        amount: Number(damage.amount || 0),
        cost_date: nullable(damage.cost_date),
        evidence_document_id: damage.evidence_document_id || null,
        evidence_url: null,
        verified: Boolean(damage.verified),
        causation_notes: nullable(damage.causation_notes),
        depreciation_deduction: Number(damage.depreciation_deduction || 0),
        insurance_recovery: Number(damage.insurance_recovery || 0),
        notes: nullable(damage.notes),
      });
      setDamage((current) => ({
        ...current,
        id: undefined,
        description: '',
        amount: 0,
        cost_date: null,
        evidence_document_id: null,
        verified: false,
        causation_notes: null,
        depreciation_deduction: 0,
        insurance_recovery: 0,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ بند الضرر');
    }
  };

  const freeze = async () => {
    try {
      await actions.freezeMemoSnapshot();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تثبيت المذكرة');
    }
  };

  const viewSnapshot = (payload: Record<string, unknown>) => {
    const html = generateLegalComplaintHTML(payload as unknown as LegalDocumentData);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="space-y-5">
      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading">
          <div>
            <Badge className="bg-[#EAF2F9] text-[#173A63] hover:bg-[#EAF2F9]">
              <ShieldCheck className="ml-1 h-4 w-4" /> الملف القانوني
            </Badge>
            <h2>الوقائع والأدلة ومسار الدعوى</h2>
            <p>لا تُدرج المذكرة أي واقعة أو مطالبة مشروطة قبل حفظ سندها هنا.</p>
          </div>
          <div className="text-left">
            <strong className="block text-2xl text-[#173A63]">{readiness.score}%</strong>
            <span className="text-xs font-bold text-slate-500">جاهزية قانونية</span>
          </div>
        </div>

        {(readiness.issues.length > 0 || readiness.warnings.length > 0) && (
          <Alert className="mt-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <AlertDescription className="space-y-1 text-right font-semibold text-amber-900">
              {[...readiness.issues, ...readiness.warnings].map((issue) => <div key={issue}>• {issue}</div>)}
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section className="lawsuit-section-panel space-y-4">
        <div className="lawsuit-section-heading compact">
          <div>
            <h2>التحليل التلقائي للأدلة</h2>
            <p>يجمع النظام البيانات القطعية ويعتمد المقترحات المكتملة السند تلقائياً مع فتح الملف، دون إجراء يدوي.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="text-xs font-bold text-emerald-700">مكتمل تلقائياً</span>
            <strong className="mt-1 block text-2xl text-emerald-900">{analysis?.automatic.length ?? 0}</strong>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <span className="text-xs font-bold text-amber-700">يحتاج تحققاً</span>
            <strong className="mt-1 block text-2xl text-amber-900">{state.evidenceProposals.length}</strong>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-xs font-bold text-slate-600">مستند أو بيان ناقص</span>
            <strong className="mt-1 block text-2xl text-slate-900">{analysis?.missing.length ?? 0}</strong>
          </div>
        </div>

        {analysis?.automatic.length ? (
          <div className="space-y-2">
            <h3 className="font-bold text-emerald-900">مصادر مؤكدة تحقق منها النظام</h3>
            {analysis.automatic.map((item) => (
              <div key={`${item.fieldKey}-${item.sourceRef}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white p-3">
                <div>
                  <strong className="block text-sm text-slate-900">{item.label}: {item.valueLabel}</strong>
                  <span className="text-xs text-slate-500">المصدر: {item.sourceLabel} — ثقة {Math.round(item.confidence * 100)}%</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="ml-1 h-3.5 w-3.5" /> مؤكد</Badge>
              </div>
            ))}
          </div>
        ) : null}

        {state.evidenceProposals.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-amber-900">مقترحات تحتاج قراراً قبل إدراجها</h3>
            {state.evidenceProposals.map((proposal) => (
              <div key={proposal.id} className="rounded-lg border border-amber-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-900">{proposal.field_label}: {proposal.value_label}</strong>
                    <p className="mt-1 text-xs font-semibold text-slate-600">{proposal.reason}</p>
                    <span className="mt-2 inline-block text-xs text-slate-500">المصدر: {proposal.source_label} — ثقة {Math.round(Number(proposal.confidence) * 100)}%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={reviewingProposal === proposal.id} onClick={() => reviewProposal(proposal.id, 'accept')} className="gap-1 bg-emerald-700 text-white hover:bg-emerald-800">
                      {reviewingProposal === proposal.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} قبول المقترح
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={reviewingProposal === proposal.id} onClick={() => reviewProposal(proposal.id, 'reject')} className="gap-1 border-red-200 text-red-700 hover:bg-red-50">
                      <XCircle className="h-3.5 w-3.5" /> رفض
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {analysis?.missing.length ? (
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800">لا يمكن افتراضه تلقائياً</h3>
            {analysis.missing.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /> {item}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading compact">
          <div><h2>رفع مستند إثبات</h2><p>يرتبط المستند بالعقد ثم يصبح متاحاً في جميع الحقول أدناه.</p></div>
          <Badge variant="outline">{evidenceDocuments.length} مستند</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-[240px_1fr]">
          <select value={uploadType} onChange={(event) => setUploadType(event.target.value)} className={fieldClass}>
            <option value="auto">تصنيف تلقائي من اسم المستند</option>
            <option value="legal_evidence">إثبات قانوني عام</option>
            <option value="handover_report">محضر تسليم</option>
            <option value="return_report">محضر رد أو استرداد</option>
            <option value="formal_notice_proof">إثبات إنذار ووصول</option>
            <option value="retention_rate_evidence">إثبات أجرة المثل</option>
            <option value="damage_evidence">إثبات أضرار أو مصاريف</option>
            <option value="contract_clause_evidence">إثبات بند تعاقدي</option>
          </select>
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-[#173A63] bg-[#F4F8FC] font-bold text-[#173A63]">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'جاري الرفع...' : 'اختيار ملف ورفعه'}
            <input type="file" className="hidden" disabled={uploading} onChange={uploadEvidence} />
          </label>
        </div>
      </section>

      <section className="lawsuit-section-panel space-y-5">
        <div className="lawsuit-section-heading compact">
          <div><h2>بيانات تبليغ المدعى عليه</h2><p>يعتمد النظام «الدوحة قطر» عند غياب عنوان أكثر تفصيلاً، ويمكن استبداله بعنوان فعلي موثق.</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="عنوان التبليغ">
            <Textarea
              value={profile.defendant_service_address?.trim()
                || state.customer?.address?.trim()
                || DEFAULT_DEFENDANT_SERVICE_ADDRESS}
              onChange={(event) => updateProfile('defendant_service_address', event.target.value)}
            />
          </Field>
          <Field label="حالة بريد المدعى عليه">
            <select
              value={profile.defendant_email_status || 'unknown'}
              onChange={(event) => {
                const status = event.target.value as LitigationProfile['defendant_email_status'];
                setProfile((current) => ({
                  ...current,
                  defendant_email_status: status,
                  defendant_email: status === 'unavailable' ? null : current.defendant_email,
                }));
              }}
              className={fieldClass}
            >
              <option value="unknown">غير محددة</option>
              <option value="verified">متوفر ومتحقق</option>
              <option value="unavailable">غير متوفر لدى الشركة</option>
            </select>
          </Field>
          <Field label="البريد الإلكتروني الفعلي للمدعى عليه">
            <Input
              type="email"
              value={profile.defendant_contact_source === 'customer_record'
                ? state.customer?.email ?? ''
                : profile.defendant_email ?? ''}
              disabled={profile.defendant_email_status === 'unavailable'
                || profile.defendant_contact_source === 'customer_record'}
              placeholder={profile.defendant_email_status === 'unavailable' ? 'غير متوفر' : 'name@example.com'}
              onChange={(event) => setProfile((current) => ({
                ...current,
                defendant_email: event.target.value,
                defendant_email_status: event.target.value.trim() ? 'verified' : 'unknown',
              }))}
            />
          </Field>
          <Field label="مصدر بيانات التبليغ">
            <select
              value={profile.defendant_contact_source || ''}
              onChange={(event) => {
                const source = (event.target.value || null) as LitigationProfile['defendant_contact_source'];
                setProfile((current) => ({
                  ...current,
                  defendant_contact_source: source,
                  defendant_email: source === 'customer_record' ? null : current.defendant_email,
                  defendant_email_status: source === 'customer_record' && state.customer?.email?.trim()
                    ? 'verified'
                    : current.defendant_email_status,
                }));
              }}
              className={fieldClass}
            >
              <option value="">اختر المصدر</option>
              <option value="customer_record">سجل العميل المتحقق منه</option>
              <option value="contract">العقد الموقع</option>
              <option value="national_address">مستخرج العنوان الوطني</option>
              <option value="verified_manual">إدخال يدوي موثق</option>
            </select>
          </Field>
          <Field label="مستند إثبات بيانات التبليغ">
            <EvidenceSelect
              value={profile.defendant_contact_document_id}
              onChange={(value) => updateProfile('defendant_contact_document_id', value)}
              documents={evidenceDocuments}
            />
          </Field>
        </div>
      </section>

      <section className="lawsuit-section-panel space-y-5">
        <div className="lawsuit-section-heading compact"><div><h2>المسار القانوني والعقد</h2><p>اختر المسار الذي تثبته وقائع القضية، لا المسار الأعلى قيمة.</p></div></div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="مسار القضية">
            <select value={profile.rescission_strategy || 'judicial_rescission'} onChange={(event) => selectPath(event.target.value as RescissionStrategy)} className={fieldClass}>
              <option value="natural_expiry">انتهاء طبيعي بانقضاء المدة</option>
              <option value="documented_termination">شرط فاسخ وإنهاء موثق</option>
              <option value="judicial_rescission">فسخ قضائي</option>
            </select>
          </Field>
          <Field label="يوم استحقاق الأجرة"><Input type="number" min={1} max={31} value={profile.rent_due_day ?? ''} onChange={(event) => updateProfile('rent_due_day', numberOrNull(event.target.value))} /></Field>
          <Field label="مستند العقد/الإنهاء"><EvidenceSelect value={profile.termination_supporting_document_id} onChange={(value) => updateProfile('termination_supporting_document_id', value)} documents={evidenceDocuments} /></Field>
          <Field label="تاريخ انتهاء العلاقة"><Input type="date" value={profile.termination_date || ''} disabled={profile.rescission_strategy === 'judicial_rescission'} onChange={(event) => updateProfile('termination_date', event.target.value || null)} /></Field>
          <Field label="مصدر التاريخ">
            <select value={profile.termination_date_source || ''} onChange={(event) => updateProfile('termination_date_source', event.target.value || null)} className={fieldClass}>
              <option value="">غير محدد</option><option value="system_record">سجل النظام</option><option value="official_document">مستند رسمي</option><option value="court_ruling">حكم قضائي</option><option value="manual_entry">إدخال يدوي</option>
            </select>
          </Field>
          <Field label="حالة تاريخ الانتهاء">
            <select value={profile.termination_date_status || 'requires_judicial_proof'} onChange={(event) => updateProfile('termination_date_status', event.target.value as LitigationProfile['termination_date_status'])} className={fieldClass}>
              <option value="confirmed">مؤكد بالمستند</option><option value="requires_judicial_proof">مطلوب إثباته قضائياً</option>
            </select>
          </Field>
          <Field label="رقم بند السداد"><Input value={profile.payment_clause_number || ''} onChange={(event) => updateProfile('payment_clause_number', event.target.value)} /></Field>
          <Field label="رقم بند الرد"><Input value={profile.return_clause_number || ''} onChange={(event) => updateProfile('return_clause_number', event.target.value)} /></Field>
          <Field label="رقم بند المخالفات"><Input value={profile.violations_clause_number || ''} onChange={(event) => updateProfile('violations_clause_number', event.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 font-bold text-slate-700">
          <input type="checkbox" checked={Boolean(profile.renewal_applies)} onChange={(event) => updateProfile('renewal_applies', event.target.checked)} /> يوجد تجديد أو امتداد للعقد
        </label>
        {profile.renewal_applies && <Field label="تاريخ النهاية بعد التجديد"><Input type="date" value={profile.renewed_end_date || ''} onChange={(event) => updateProfile('renewed_end_date', event.target.value || null)} /></Field>}
        {profile.rescission_strategy === 'documented_termination' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="رقم الشرط الفاسخ"><Input value={profile.termination_clause_number || ''} onChange={(event) => updateProfile('termination_clause_number', event.target.value)} /></Field>
            <Field label="نص الشرط الفاسخ"><Textarea value={profile.termination_clause_text || ''} onChange={(event) => updateProfile('termination_clause_text', event.target.value)} /></Field>
          </div>
        )}
        {profile.rescission_strategy === 'judicial_rescission' && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="حالة الاستثناء من الإعذار — المادة 262">
              <select value={profile.notice_exception_type || ''} onChange={(event) => updateProfile('notice_exception_type', (event.target.value || null) as LitigationProfile['notice_exception_type'])} className={fieldClass}>
                <option value="">لا يوجد استثناء مثبت</option>
                <option value="due_date_agreement">اتفاق على الإعذار بمجرد حلول الأجل</option>
                <option value="written_refusal">رفض مكتوب للتنفيذ</option>
                <option value="impossible_or_useless_performance">أصبح التنفيذ غير ممكن أو غير مجد</option>
              </select>
            </Field>
            <Field label="البند أو سبب الاستثناء"><Textarea value={profile.notice_exception_clause_or_reason || ''} onChange={(event) => updateProfile('notice_exception_clause_or_reason', event.target.value)} /></Field>
            <Field label="مستند إثبات الاستثناء"><EvidenceSelect value={profile.notice_exception_document_id} onChange={(value) => updateProfile('notice_exception_document_id', value)} documents={evidenceDocuments} /></Field>
          </div>
        )}
      </section>

      <section className="lawsuit-section-panel space-y-5">
        <div className="lawsuit-section-heading compact"><div><h2>التسليم والحيازة والرد</h2><p>حالة المركبة التشغيلية لا تستخدم كدليل حيازة.</p></div></div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="تاريخ تسليم المركبة"><Input type="date" value={profile.delivery_handover_date || ''} onChange={(event) => updateProfile('delivery_handover_date', event.target.value || null)} /></Field>
          <Field label="محضر التسليم"><EvidenceSelect value={profile.delivery_handover_document_id} onChange={(value) => updateProfile('delivery_handover_document_id', value)} documents={evidenceDocuments} /></Field>
          <Field label="حيازة المركبة">
            <select value={profile.vehicle_custody || 'unknown'} onChange={(event) => updateProfile('vehicle_custody', event.target.value as LitigationProfile['vehicle_custody'])} className={fieldClass}>
              <option value="unknown">غير معلوم</option><option value="with_defendant">لدى المدعى عليه</option><option value="returned">أعيدت للشركة</option><option value="recovered_by_company">استردتها الشركة</option><option value="authority_impounded">محجوزة لدى جهة رسمية</option><option value="lost">مفقودة/متعذر الوصول</option>
            </select>
          </Field>
          <Field label="تاريخ الرد أو الاسترداد"><Input type="date" value={profile.vehicle_returned_at || ''} onChange={(event) => updateProfile('vehicle_returned_at', event.target.value || null)} /></Field>
          <Field label="محضر الرد أو الاسترداد"><EvidenceSelect value={profile.vehicle_return_document_id} onChange={(value) => updateProfile('vehicle_return_document_id', value)} documents={evidenceDocuments} /></Field>
        </div>
      </section>

      <section className="lawsuit-section-panel space-y-5">
        <div className="lawsuit-section-heading compact"><div><h2>الخصومات والتعويضات المشروطة</h2><p>جميع القيم تساوي صفراً في المذكرة ما لم يكتمل السند.</p></div></div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="وديعة الضمان"><Input type="number" min={0} value={profile.security_deposit_amount ?? ''} onChange={(event) => updateProfile('security_deposit_amount', numberOrNull(event.target.value))} /></Field>
          <label className="mt-8 flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={Boolean(profile.apply_security_deposit)} onChange={(event) => updateProfile('apply_security_deposit', event.target.checked)} /> خصم الوديعة من التسوية</label>
          <span />
          <Field label="أجرة المثل اليومية"><Input type="number" min={0} value={profile.retention_daily_rate ?? ''} onChange={(event) => updateProfile('retention_daily_rate', numberOrNull(event.target.value))} /></Field>
          <Field label="مصدر أجرة المثل">
            <select value={profile.retention_rate_source || ''} onChange={(event) => updateProfile('retention_rate_source', (event.target.value || null) as LitigationProfile['retention_rate_source'])} className={fieldClass}>
              <option value="">غير محدد</option><option value="company_price_list">قائمة أسعار معتمدة</option><option value="market_quotes">عروض سوقية</option><option value="recent_contracts">عقود مماثلة حديثة</option>
            </select>
          </Field>
          <Field label="مرجع مصدر أجرة المثل"><Input value={profile.retention_rate_source_ref || ''} onChange={(event) => updateProfile('retention_rate_source_ref', event.target.value)} /></Field>
          <Field label="مستند أجرة المثل"><EvidenceSelect value={profile.retention_rate_source_document_id} onChange={(value) => updateProfile('retention_rate_source_document_id', value)} documents={evidenceDocuments} /></Field>
        </div>
        <label className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={Boolean(profile.contractual_compensation_enabled)} onChange={(event) => updateProfile('contractual_compensation_enabled', event.target.checked)} /> يوجد تعويض اتفاقي يراد عرضه للمراجعة</label>
        {profile.contractual_compensation_enabled && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="رقم البند"><Input value={profile.contractual_compensation_clause_number || ''} onChange={(event) => updateProfile('contractual_compensation_clause_number', event.target.value)} /></Field>
            <Field label="طريقة الحساب"><select value={profile.contractual_compensation_method || ''} onChange={(event) => updateProfile('contractual_compensation_method', (event.target.value || null) as LitigationProfile['contractual_compensation_method'])} className={fieldClass}><option value="">اختر</option><option value="fixed">مبلغ ثابت</option><option value="daily">يومي</option><option value="monthly">عن كل شهر استحقاق غير مسدد</option><option value="per_invoice">لكل فاتورة</option></select></Field>
            <Field label="القيمة"><Input type="number" min={0} value={profile.contractual_compensation_rate ?? ''} onChange={(event) => updateProfile('contractual_compensation_rate', numberOrNull(event.target.value))} /></Field>
            <Field label="السقف"><Input type="number" min={0} value={profile.contractual_compensation_cap ?? ''} onChange={(event) => updateProfile('contractual_compensation_cap', numberOrNull(event.target.value))} /></Field>
            <Field label="مستند البند"><EvidenceSelect value={profile.contractual_compensation_document_id} onChange={(value) => updateProfile('contractual_compensation_document_id', value)} documents={evidenceDocuments} /></Field>
            <Field label="نص البند"><Textarea value={profile.contractual_compensation_clause_text || ''} onChange={(event) => updateProfile('contractual_compensation_clause_text', event.target.value)} /></Field>
          </div>
        )}
        <Field label="ملاحظات المراجع"><Textarea value={profile.notes || ''} onChange={(event) => updateProfile('notes', event.target.value)} /></Field>
        <Button type="button" onClick={saveProfile} disabled={saving} className="gap-2 bg-[#173A63] text-white hover:bg-[#102C4D]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الملف القانوني
        </Button>
      </section>

      <section className="lawsuit-section-panel space-y-4">
        <div className="lawsuit-section-heading compact"><div><h2>الإنذارات الرسمية</h2><p>إشعارات النظام الآلية لا تعد إنذاراً موثقاً هنا.</p></div><Badge variant="outline">{state.formalNotices.length}</Badge></div>
        <form onSubmit={submitNotice} className="grid gap-4 md:grid-cols-3">
          <Field label="نوع الإنذار"><select value={notice.notice_type || 'payment_demand'} onChange={(event) => setNotice((current) => ({ ...current, notice_type: event.target.value as FormalNotice['notice_type'] }))} className={fieldClass}><option value="payment_demand">مطالبة سداد</option><option value="vehicle_return_demand">مطالبة برد المركبة</option><option value="termination_notice">إنذار إنهاء</option></select></Field>
          <Field label="تاريخ الإرسال"><Input required type="date" value={notice.sent_on || ''} onChange={(event) => setNotice((current) => ({ ...current, sent_on: event.target.value }))} /></Field>
          <Field label="وسيلة الإرسال"><select value={notice.delivery_method || 'registered_mail'} onChange={(event) => setNotice((current) => ({ ...current, delivery_method: event.target.value }))} className={fieldClass}><option value="registered_mail">بريد مسجل</option><option value="national_address">العنوان الوطني</option><option value="courier">مندوب</option><option value="email">بريد إلكتروني</option><option value="whatsapp">واتساب</option><option value="other">أخرى مثبتة</option></select></Field>
          <Field label="مهلة الوفاء بالأيام"><Input type="number" min={1} value={notice.grace_period_days ?? ''} onChange={(event) => setNotice((current) => ({ ...current, grace_period_days: numberOrNull(event.target.value) }))} /></Field>
          <Field label="تاريخ الوصول"><Input type="date" value={notice.delivered_on || ''} onChange={(event) => setNotice((current) => ({ ...current, delivered_on: event.target.value || null }))} /></Field>
          <Field label="إثبات الوصول"><EvidenceSelect value={notice.proof_document_id} onChange={(value) => setNotice((current) => ({ ...current, proof_document_id: value }))} documents={evidenceDocuments} /></Field>
          <label className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={Boolean(notice.delivery_confirmed)} onChange={(event) => setNotice((current) => ({ ...current, delivery_confirmed: event.target.checked }))} /> تم التحقق من الوصول</label>
          <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> {notice.id ? 'حفظ تعديل الإنذار' : 'إضافة الإنذار'}</Button>
        </form>
        <div className="space-y-2">
          {state.formalNotices.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div><strong className="block text-sm">{item.notice_type} — {item.sent_on}</strong><span className="text-xs text-slate-500">{item.delivery_confirmed ? `وصول مؤكد ${item.delivered_on}` : 'وصول غير مؤكد'}</span></div>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => setNotice({ ...item })}><Pencil className="h-4 w-4 text-[#173A63]" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => actions.deleteFormalNotice(item.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lawsuit-section-panel space-y-4">
        <div className="lawsuit-section-heading compact"><div><h2>الأضرار والمصاريف</h2><p>القيمة الصافية = المبلغ − الاستهلاك − ما غطاه التأمين.</p></div><Badge variant="outline">{state.damageCosts.length}</Badge></div>
        <form onSubmit={submitDamage} className="grid gap-4 md:grid-cols-3">
          <Field label="نوع الضرر"><select value={damage.cost_type || 'other'} onChange={(event) => setDamage((current) => ({ ...current, cost_type: event.target.value as DamageCost['cost_type'] }))} className={fieldClass}><option value="recovery_towing">سحب واسترداد</option><option value="non_standard_repairs">إصلاحات غير معتادة</option><option value="parts_insurance_burden">قطع غيار/تحمل تأميني</option><option value="inspection_transport_storage">فحص ونقل وتخزين</option><option value="monetary_delay_damage">ضرر التأخر في الدين النقدي</option><option value="financing_burden_damage">عبء تمويل/أقساط سببه التأخر</option><option value="operational_loss">فوات الانتفاع خلال الإصلاح بعد الاسترداد</option><option value="early_termination_damage">ضرر إنهاء مبكر</option><option value="other">أخرى</option></select></Field>
          <Field label="الوصف"><Input required value={damage.description || ''} onChange={(event) => setDamage((current) => ({ ...current, description: event.target.value }))} /></Field>
          <Field label="المبلغ"><Input required type="number" min={0.01} step="0.01" value={damage.amount || ''} onChange={(event) => setDamage((current) => ({ ...current, amount: Number(event.target.value) }))} /></Field>
          <Field label="تاريخ التكلفة"><Input type="date" value={damage.cost_date || ''} onChange={(event) => setDamage((current) => ({ ...current, cost_date: event.target.value || null }))} /></Field>
          <Field label="خصم الاستهلاك"><Input type="number" min={0} value={damage.depreciation_deduction || ''} onChange={(event) => setDamage((current) => ({ ...current, depreciation_deduction: Number(event.target.value) }))} /></Field>
          <Field label="مبلغ غطاه التأمين"><Input type="number" min={0} value={damage.insurance_recovery || ''} onChange={(event) => setDamage((current) => ({ ...current, insurance_recovery: Number(event.target.value) }))} /></Field>
          <Field label="مستند الضرر"><EvidenceSelect value={damage.evidence_document_id} onChange={(value) => setDamage((current) => ({ ...current, evidence_document_id: value }))} documents={evidenceDocuments} /></Field>
          <Field label="علاقة الضرر بالإخلال"><Textarea value={damage.causation_notes || ''} onChange={(event) => setDamage((current) => ({ ...current, causation_notes: event.target.value }))} /></Field>
          <label className="flex items-center gap-2 font-bold text-slate-700"><input type="checkbox" checked={Boolean(damage.verified)} onChange={(event) => setDamage((current) => ({ ...current, verified: event.target.checked }))} /> تم التحقق من المستند وإدراج البند</label>
          <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> {damage.id ? 'حفظ تعديل البند' : 'إضافة البند'}</Button>
        </form>
        <div className="space-y-2">
          {state.damageCosts.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div><strong className="block text-sm">{item.description} — {Number(item.amount).toLocaleString('en-US')} ر.ق</strong><span className="text-xs text-slate-500">{item.verified ? 'معتمد بالمستند' : 'غير معتمد ولن يظهر في المطالبة'}</span></div>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => setDamage({ ...item })}><Pencil className="h-4 w-4 text-[#173A63]" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => actions.deleteDamageCost(item.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lawsuit-section-panel">
        <div className="lawsuit-section-heading compact"><div><h2>نسخ المذكرة</h2><p>تُثبت المسودة الحديثة تلقائياً، ثم يراجعها وكيل تقاضي ويعتمد النسخة المطابقة أثناء الرفع.</p></div><Badge variant="outline">{state.memoSnapshots.length} نسخة</Badge></div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={readiness.status === 'not_ready'} onClick={() => freeze()} className="gap-2"><FileCheck2 className="h-4 w-4" /> تحديث نسخة المراجعة</Button>
        </div>
        {state.memoSnapshots.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-2 text-right">الإصدار</th><th className="p-2 text-right">المرجع</th><th className="p-2 text-right">المسار</th><th className="p-2 text-right">الحالة</th><th className="p-2 text-right">تاريخ التثبيت</th><th className="p-2 text-right">عرض</th></tr></thead>
              <tbody>{state.memoSnapshots.map((snapshot) => (
                <tr key={snapshot.id} className="border-t border-slate-100">
                  <td className="p-2 font-bold">V{snapshot.version}</td>
                  <td className="p-2 font-mono text-xs">{snapshot.document_reference}</td>
                  <td className="p-2">{snapshot.legal_path}</td>
                  <td className="p-2"><Badge variant="outline">{snapshot.readiness_status}</Badge></td>
                  <td className="p-2">{new Date(snapshot.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="p-2"><Button type="button" size="icon" variant="ghost" onClick={() => viewSnapshot(snapshot.payload)}><Eye className="h-4 w-4" /></Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default LegalEvidence;
