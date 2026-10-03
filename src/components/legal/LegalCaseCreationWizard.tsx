import { legalCaseTypeLabel, legalCaseStatusLabel } from './workspace/legalLabels';
/**
 * Legal Case Creation Wizard
 * 
 * Create incoming or outgoing cases with an explicit claim amount.
 * 1. تفاصيل القضية - Type, priority, court info (complaint #, case #, court name, dates)
 * 2. معلومات العميل - Select customer first
 * 3. Select الفواتير/العقود - Multi-select filtered by customer
 * Evidence is uploaded within the created case and is not persisted by this wizard.
 * 5. المراجعة - Review all details before submission
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle,
  FileWarning,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useCreateLegalCase } from '@/hooks/useLegalCases';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LegalComplaintGenerator } from './LegalComplaintGenerator';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { parseLegalClaimAmount, legalDirectionLabel } from './workspace/legalCaseExport';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
interface LegalCaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CaseFormData {
  case_direction: 'filed_by_us' | 'filed_against_us';
  claim_amount: string;
  case_title: string;
  case_type: 'payment_collection' | 'contract_breach' | 'vehicle_damage' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expected_outcome: 'payment' | 'vehicle_return' | 'both' | 'other';
  description: string;
  
  // Court case tracking
  complaint_number: string;  // رقم البلاغ
  court_case_number: string;  // رقم القضية في المحكمة
  court_name: string;  // اسم المحكمة
  filing_date: string;  // تاريخ رفع القضية
  first_hearing_date: string;  // تاريخ أول جلسة (اختياري)
  judge_name: string;  // القاضي المسؤول (اختياري)
  
  // Selected invoices/contracts
  selected_invoices: string[];
  selected_contracts: string[];
  
  // Customer info
  customer_id: string;
  customer_name: string;
  national_id: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact: string;
  employer_info: string;
  

}

type WizardStep = 'details' | 'customer' | 'court' | 'invoices' | 'review';

const LegalCaseCreationWizard: React.FC<LegalCaseWizardProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useFleetifyTranslation("ui");
  const { companyId } = useUnifiedCompanyAccess();
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [showComplaintGenerator, setShowComplaintGenerator] = useState(false);
  const [formData, setFormData] = useState<CaseFormData>({
    case_direction: 'filed_by_us',
    claim_amount: '',
    case_title: '',
    case_type: 'payment_collection',
    priority: 'medium',
    expected_outcome: 'payment',
    description: '',
    complaint_number: '',
    court_case_number: '',
    court_name: '',
    filing_date: '',
    first_hearing_date: '',
    judge_name: '',
    selected_invoices: [],
    selected_contracts: [],
    customer_id: '',
    customer_name: '',
    national_id: '',
    address: '',
    phone: '',
    email: '',
    emergency_contact: '',
    employer_info: '',
  });

  const createCaseMutation = useCreateLegalCase();
  const { saveDraft, lastSaved } = useCaseDraft(formData, currentStep);

  const stepOrder: WizardStep[] = formData.case_direction === 'filed_against_us' ? ['details', 'customer', 'court', 'review'] : ['details', 'customer', 'court', 'invoices', 'review'];
  const stepLabels: Record<WizardStep, string> = { details: 'القضية', customer: 'الطرف الآخر', court: 'المحكمة', invoices: 'مراجع المطالبات', review: 'المراجعة' };
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / stepOrder.length) * 100;

  const handleNextStep = () => {
    if (currentStepIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentStepIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(stepOrder[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      if (!formData.case_title || !formData.customer_name) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      const totalClaimAmount = parseLegalClaimAmount(formData.claim_amount);

      await createCaseMutation.mutateAsync({
        case_title: formData.case_title,
        case_direction: formData.case_direction,
        case_type: formData.case_type,
        priority: formData.priority,
        case_status: 'active',
        description: formData.description,
        client_id: formData.case_direction === 'filed_by_us' ? formData.customer_id || undefined : undefined,
        client_name: formData.customer_name,
        client_phone: formData.phone,
        client_email: formData.email,
        case_value: totalClaimAmount,
        // Court tracking fields
        complaint_number: formData.complaint_number || undefined,
        court_name: formData.court_name || undefined,
        filing_date: formData.filing_date || undefined,
        hearing_date: formData.first_hearing_date || undefined,
        judge_name: formData.judge_name || undefined,
        case_reference: formData.court_case_number || undefined,  // Map court_case_number to case_reference
        legal_fees: 0,
        court_fees: 0,
        other_expenses: 0,
        billing_status: 'pending',
        is_confidential: false,
        legal_team: [],
        tags: [],
        notes: `الرقم الوطني: ${formData.national_id || '-'}
رقم الهاتف: ${formData.phone || '-'}
عدد الفواتير المحددة: ${formData.selected_invoices.length}
عدد العقود المحددة: ${formData.selected_contracts.length}
المستندات الأصلية: تُرفع من داخل ملف القضية بعد إنشائها؛ لا توجد ملفات مرفقة من هذا المعالج
قيمة المطالبة المدخلة لا تمثل حكمًا أو دفعة فعلية
النتيجة المتوقعة: ${formData.expected_outcome}`,
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('❌ Error creating legal case:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في إنشاء القضية. يرجى المحاولة مرة أخرى.');
    }
  };

  const resetForm = () => {
    setFormData({
      case_direction: 'filed_by_us',
      claim_amount: '',
      case_title: '',
      case_type: 'payment_collection',
      priority: 'medium',
      expected_outcome: 'payment',
      description: '',
      complaint_number: '',
      court_case_number: '',
      court_name: '',
      filing_date: '',
      first_hearing_date: '',
      judge_name: '',
      selected_invoices: [],
      selected_contracts: [],
      customer_id: '',
      customer_name: '',
      national_id: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact: '',
      employer_info: '',
      });
    setCurrentStep('details');
  };
  React.useEffect(() => { resetForm(); }, [companyId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lw-case-wizard max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="lw-form-heading">
          <span className="lw-eyebrow"><FileText size={16} />ملف قانوني جديد</span>
          <DialogTitle className="text-2xl">إنشاء قضية قانونية</DialogTitle>
          <DialogDescription>حدد اتجاه الدعوى والطرف الآخر وقيمة المطالبة، ثم راجع الملف. تُرفع المستندات من داخل القضية بعد إنشائها.</DialogDescription>
          <div className="lw-step-caption">الخطوة {currentStepIndex + 1} من {stepOrder.length} · {stepLabels[currentStep]}</div>
          <Progress value={progress} aria-label="تقدم إنشاء القضية" className="mt-3 h-1.5" />
          <ol className="lw-step-rail" aria-label="مراحل إنشاء القضية">{stepOrder.map((step, index) => <li key={step} aria-current={step === currentStep ? 'step' : undefined} data-completed={index < currentStepIndex}><span>{index < currentStepIndex ? <CheckCircle size={16} /> : index + 1}</span><strong>{stepLabels[step]}</strong></li>)}</ol>
        </DialogHeader>

        <div className="lw-form-body space-y-6 py-4">
          {/* Step 1: تفاصيل القضية */}
          {currentStep === 'details' && (
            <CaseDetailsStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 2: معلومات العميل */}
          {currentStep === 'customer' && (
            formData.case_direction === 'filed_against_us' ? <IncomingPartyStep formData={formData} setFormData={setFormData} /> : <CustomerInfoStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 3: معلومات القضية في المحكمة */}
          {currentStep === 'court' && (
            <CourtInfoStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 4: Select الفواتير/العقود - Filtered by selected customer */}
          {currentStep === 'invoices' && (
            <InvoiceSelectionStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <ReviewStep formData={formData} />
              
              {/* زر إنشاء ملف البلاغ */}
              {formData.case_direction === 'filed_by_us' && <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileWarning className="w-4 h-4 text-orange-600" />
                    إنشاء ملف البلاغ
                  </CardTitle>
                  <CardDescription>
                    قم بإنشاء مذكرة شارحة للمطالبة المالية وتحويل الغرامات المرورية
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => setShowComplaintGenerator(true)}
                  >
                    <FileText className="w-4 h-4 ml-2" />
                    إنشاء ملف البلاغ
                  </Button>
                </CardContent>
              </Card>}
            </div>
          )}
        </div>

        <DialogFooter className="lw-form-footer flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
            >
              <ChevronRight className="h-4 w-4 ml-2" />
              السابق
            </Button>
            <Button
              variant="ghost"
              onClick={() => saveDraft()}
              className="text-muted-foreground"
            >
              حفظ كمسودة
            </Button>
          </div>

          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={createCaseMutation.isPending}
            >
              {createCaseMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء القضية'}
            </Button>
          ) : (
            <Button onClick={handleNextStep}>
              التالي
              <ChevronLeft className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* مكون إنشاء البلاغ */}
      {formData.case_direction === 'filed_by_us' && <LegalComplaintGenerator
        open={showComplaintGenerator}
        onOpenChange={setShowComplaintGenerator}
        caseData={{
          customer_name: formData.customer_name,
          customer_id: formData.customer_id,
          national_id: formData.national_id,
          phone: formData.phone,
          total_amount: Number(formData.claim_amount) || 0,
          late_fees: 0,
          unpaid_rent: 0,
        }}
      />}
    </Dialog>
  );
};

// ============================================================================
// STEP 1: تفاصيل القضية
// ============================================================================

interface CaseDetailsStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const IncomingPartyStep: React.FC<CaseDetailsStepProps> = ({ formData, setFormData }) => (
  <div className="space-y-4">
    <h3 className="font-semibold">بيانات المدعي / الطرف الآخر</h3>
    <p className="text-sm text-muted-foreground">أدخل البيانات الواردة في الدعوى المرفوعة على الشركة.</p>
    <div><Label htmlFor="incoming-party-name">اسم المدعي *</Label><Input id="incoming-party-name" value={formData.customer_name} onChange={event => setFormData({ ...formData, customer_name: event.target.value })} /></div>
    <div><Label htmlFor="incoming-party-phone">الهاتف</Label><Input id="incoming-party-phone" value={formData.phone} onChange={event => setFormData({ ...formData, phone: event.target.value })} /></div>
    <div><Label htmlFor="incoming-party-email">البريد الإلكتروني</Label><Input id="incoming-party-email" value={formData.email} onChange={event => setFormData({ ...formData, email: event.target.value })} /></div>
    <div><Label htmlFor="incoming-party-id">رقم الهوية / السجل بحسب المستند</Label><Input id="incoming-party-id" value={formData.national_id} onChange={event => setFormData({ ...formData, national_id: event.target.value })} /></div>
  </div>
);

const CaseDetailsStep: React.FC<CaseDetailsStepProps> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><Label htmlFor="case_direction">اتجاه الدعوى *</Label>
          <Select value={formData.case_direction} onValueChange={(value: CaseFormData['case_direction']) => setFormData({ ...formData, case_direction: value, customer_id: '', customer_name: '', phone: '', email: '', national_id: '', address: '', selected_invoices: [], selected_contracts: [], expected_outcome: value === 'filed_against_us' ? 'other' : 'payment' })}>
            <SelectTrigger id="case_direction"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="filed_by_us">مرفوعة من الشركة</SelectItem><SelectItem value="filed_against_us">مرفوعة على الشركة</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label htmlFor="claim_amount">قيمة المطالبة (ر.ق) *</Label><Input id="claim_amount" type="number" min="0" step="0.01" value={formData.claim_amount} onChange={event => setFormData({ ...formData, claim_amount: event.target.value })} placeholder="أدخل المبلغ أو صفرًا للمطالبة غير المالية" /></div>
      </div>
      <Alert><AlertDescription>هذه قيمة المطالبة بحسب المستندات؛ تُسجل النتيجة والحكم والدفع لاحقًا بصورة منفصلة. لا تُجمع تلقائيًا من الفواتير المعروضة.</AlertDescription></Alert>
      <div>
        <Label htmlFor="case_title" className="text-base font-semibold mb-2 block">
          عنوان القضية *
        </Label>
        <Input
          id="case_title"
          placeholder="مثال: تحصيل إيجار متأخر"
          value={formData.case_title}
          onChange={(e) => setFormData({ ...formData, case_title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="case_type" className="text-base font-semibold mb-2 block">
            نوع القضية *
          </Label>
          <Select
            value={formData.case_type}
            onValueChange={(value: any) =>
              setFormData({ ...formData, case_type: value })
            }
          >
            <SelectTrigger id="case_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment_collection">تحصيل دفعات</SelectItem>
              <SelectItem value="contract_breach">خرق عقد</SelectItem>
              <SelectItem value="vehicle_damage">أضرار مركبة</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority" className="text-base font-semibold mb-2 block">
            الأولوية *
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value: any) =>
              setFormData({ ...formData, priority: value })
            }
          >
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">منخفضة</SelectItem>
              <SelectItem value="medium">متوسطة</SelectItem>
              <SelectItem value="high">عالية</SelectItem>
              <SelectItem value="urgent">عاجلة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="expected_outcome" className="text-base font-semibold mb-2 block">
          النتيجة المتوقعة *
        </Label>
        <Select
          value={formData.expected_outcome}
          onValueChange={(value: any) =>
            setFormData({ ...formData, expected_outcome: value })
          }
        >
          <SelectTrigger id="expected_outcome">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payment">استرداد المبلغ</SelectItem>
            <SelectItem value="vehicle_return">استرجاع المركبة</SelectItem>
            <SelectItem value="both">كلاهما</SelectItem>
            <SelectItem value="other">أخرى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description" className="text-base font-semibold mb-2 block">
          وصف تفصيلي <span className="text-muted-foreground font-normal">(اختياري)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="وصف تفصيلي للقضية..."
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
    </div>
  );
};

// ============================================================================
// STEP 3: معلومات القضية في المحكمة
// ============================================================================

interface CourtInfoStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const CourtInfoStep: React.FC<CourtInfoStepProps> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          أدخل معلومات القضية في المحكمة. يمكنك تعديل هذه البيانات لاحقاً.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="complaint_number" className="text-base font-semibold mb-2 block">
            رقم البلاغ
          </Label>
          <Input
            id="complaint_number"
            placeholder="مثال: 2025/123"
            value={formData.complaint_number}
            onChange={(e) => setFormData({ ...formData, complaint_number: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="court_case_number" className="text-base font-semibold mb-2 block">
            رقم القضية في المحكمة
          </Label>
          <Input
            id="court_case_number"
            placeholder="مثال: 456/2025"
            value={formData.court_case_number}
            onChange={(e) => setFormData({ ...formData, court_case_number: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="court_name" className="text-base font-semibold mb-2 block">
          اسم المحكمة
        </Label>
        <Input
          id="court_name"
          placeholder="مثال: محكمة الدوحة الابتدائية"
          value={formData.court_name}
          onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="filing_date" className="text-base font-semibold mb-2 block">
            تاريخ رفع القضية
          </Label>
          <Input
            id="filing_date"
            type="date"
            value={formData.filing_date}
            onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="first_hearing_date" className="text-base font-semibold mb-2 block">
            تاريخ أول جلسة <span className="text-muted-foreground font-normal">(اختياري)</span>
          </Label>
          <Input
            id="first_hearing_date"
            type="date"
            value={formData.first_hearing_date}
            onChange={(e) => setFormData({ ...formData, first_hearing_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="judge_name" className="text-base font-semibold mb-2 block">
          القاضي المسؤول <span className="text-muted-foreground font-normal">(اختياري)</span>
        </Label>
        <Input
          id="judge_name"
          placeholder="مثال: القاضي محمد أحمد"
          value={formData.judge_name}
          onChange={(e) => setFormData({ ...formData, judge_name: e.target.value })}
        />
      </div>
    </div>
  );
};

// ============================================================================
// STEP 4: الفواتير Selection
// ============================================================================

interface InvoiceSelectionStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const InvoiceSelectionStep: React.FC<InvoiceSelectionStepProps> = ({
  formData,
  setFormData,
}) => {
  const { companyId } = useUnifiedCompanyAccess();
  // Fetch outstanding amounts from Supabase
  const [unpaidRent, setUnpaidRent] = React.useState<any[]>([]);
  const [lateFees, setLateFees] = React.useState<any[]>([]);
  const [trafficViolations, setTrafficViolations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchOutstandingAmounts = async () => {
      if (!formData.customer_id || !companyId) return;
      
      try {
        setLoading(true);
        
        // Fetch overdue rent (invoices) - only invoices past due date
        const { data: rentData, error: rentError } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, invoice_date, payment_status, due_date')
          .eq('company_id', companyId)
          .eq('customer_id', formData.customer_id)
          .neq('payment_status', 'paid')
          .lte('due_date', new Date().toISOString())
          .order('invoice_date', { ascending: false });
        
        if (rentError) throw rentError;
        setUnpaidRent(rentData || []);
        
        // Fetch late fees
        const { data: feesData, error: feesError } = await supabase
          .from('late_fees')
          .select('id, fee_amount, days_overdue, invoice_id, status, created_at')
          .eq('company_id', companyId)
          .eq('status', 'applied')
          .in('invoice_id', (rentData || []).map(inv => inv.id))
          .order('created_at', { ascending: false });
        
        if (feesError) throw feesError;
        setLateFees(feesData || []);
        
        // Fetch traffic violations via contracts
        // First get customer's contracts
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id')
          .eq('company_id', companyId)
          .eq('customer_id', formData.customer_id);
        
        if (contractsData && contractsData.length > 0) {
          const contractIds = contractsData.map(c => c.id);
          const { data: violationsData, error: violationsError } = await supabase
            .from('penalties')
            .select('id, penalty_number, violation_type, amount, penalty_date, status, payment_status')
            .eq('company_id', companyId)
            .in('contract_id', contractIds)
            .neq('payment_status', 'paid')
            .neq('status', 'cancelled')
            .order('penalty_date', { ascending: false });
          
          if (violationsError) {
            console.warn('Traffic violations query error:', violationsError);
          } else {
            setTrafficViolations((violationsData || []).map((violation) => ({
              ...violation,
              violation_number: violation.penalty_number,
              total_amount: violation.amount,
              violation_date: violation.penalty_date,
            })));
          }
        }
        
      } catch (error) {
        console.error('Error fetching outstanding amounts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOutstandingAmounts();
  }, [formData.customer_id, companyId]);

  // Calculate total outstanding amount
  const totalRent = unpaidRent.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalLateFees = lateFees.reduce((sum, fee) => sum + fee.fee_amount, 0);
  const totalViolations = trafficViolations.reduce((sum, v) => sum + (v.total_amount || 0), 0);
  const grandTotal = totalRent + totalLateFees + totalViolations;



  return (
    <div className="space-y-6">
      {!formData.customer_id ? (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>العميل غير مسجل في النظام</strong>
            <br />
            <span className="text-sm">
              لم يتم اختيار عميل من القائمة. يمكنك المتابعة لإنشاء القضية بالبيانات المدخلة يدوياً.
              <br />
              اضغط "التالي" للمتابعة أو عد للخطوة السابقة لاختيار عميل مسجل.
            </span>
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">جاري تحميل المبالغ المستحقة...</div>
        </div>
      ) : (
        <>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              المبالغ المستحقة للعميل: <strong>{formData.customer_name}</strong>
            </AlertDescription>
          </Alert>
          
          {/* Total Summary Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">إجمالي المبالغ المستحقة</CardTitle>
              <CardDescription className="text-3xl font-bold text-primary mt-2">
                {formatCurrency(grandTotal)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">الإيجارات</div>
                  <div className="text-lg font-semibold">{formatCurrency(totalRent)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">غرامات التأخير</div>
                  <div className="text-lg font-semibold">{formatCurrency(totalLateFees)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">المخالفات المرورية</div>
                  <div className="text-lg font-semibold">{formatCurrency(totalViolations)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Unpaid Rent Section */}
      {formData.customer_id && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الإيجارات غير المدفوعة</CardTitle>
            <CardDescription>
              {unpaidRent.length} فاتورة | الإجمالي: {formatCurrency(totalRent)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {unpaidRent.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">لا توجد إيجارات غير مدفوعة</div>
            ) : (
              unpaidRent.map((rent) => (
                <div
                  key={rent.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{rent.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      تاريخ الفاتورة: {new Date(rent.invoice_date).toLocaleDateString('en-US')} | 
                      تاريخ الاستحقاق: {new Date(rent.due_date).toLocaleDateString('en-US')}
                    </div>
                  </div>
                  <Badge variant="destructive">{formatCurrency(rent.total_amount)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Late Fees Section */}
      {formData.customer_id && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">غرامات التأخير</CardTitle>
            <CardDescription>
              {lateFees.length} غرامة | الإجمالي: {formatCurrency(totalLateFees)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lateFees.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">لا توجد غرامات تأخير</div>
            ) : (
              lateFees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">غرامة تأخير</div>
                    <div className="text-sm text-muted-foreground">
                      عدد أيام التأخير: {fee.days_overdue} يوم | 
                      التاريخ: {new Date(fee.created_at).toLocaleDateString('en-US')}
                    </div>
                  </div>
                  <Badge variant="destructive">{formatCurrency(fee.fee_amount)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Traffic Violations Section */}
      {formData.customer_id && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المخالفات المرورية</CardTitle>
            <CardDescription>
              {trafficViolations.length} مخالفة | الإجمالي: {formatCurrency(totalViolations)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trafficViolations.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">لا توجد مخالفات مرورية</div>
            ) : (
              trafficViolations.map((violation) => (
                <div
                  key={violation.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{violation.violation_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {violation.violation_type} | 
                      التاريخ: {violation.violation_date ? new Date(violation.violation_date).toLocaleDateString('en-US') : '-'}
                    </div>
                  </div>
                  <Badge variant="destructive">{formatCurrency(violation.total_amount)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// STEP 3: معلومات العميل
// ============================================================================

interface Customer {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  company_name?: string | null;
  company_name_ar?: string | null;
  email?: string | null;
  phone?: string;
  address?: string | null;
  national_id?: string | null;
  emergency_contact_name?: string | null;
}

// Helper to get full customer name - prioritizing primary name fields
const getCustomerName = (customer: Customer): string => {
  // Company name - prefer primary field
  if (customer.company_name) return customer.company_name;
  if (customer.company_name_ar) return customer.company_name_ar;
  
  // Personal name - prefer primary fields
  const firstName = customer.first_name || customer.first_name_ar || '';
  const lastName = customer.last_name || customer.last_name_ar || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  return fullName || 'غير معروف';
};

interface CustomerInfoStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const CustomerInfoStep: React.FC<CustomerInfoStepProps> = ({ formData, setFormData }) => {
  const { companyId } = useUnifiedCompanyAccess();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerCases, setCustomerCases] = React.useState<any[]>([]);
  const [loadingCases, setLoadingCases] = React.useState(false);

  // Fetch customers from database
  React.useEffect(() => {
    const fetchCustomers = async () => {
      if (!companyId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar, email, phone, address, national_id, emergency_contact_name')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('first_name_ar', { nullsFirst: false });

        if (error) throw error;
        setCustomers((data as any) || []);
        setFilteredCustomers((data as any) || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error('فشل تحميل العملاء');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [companyId]);

  // Auto-extract customer from selected invoices
  React.useEffect(() => {
    const extractCustomerFromInvoices = async () => {
      if (companyId && formData.selected_invoices.length > 0 && !formData.customer_id) {
        try {
          const { data, error } = await supabase
            .from('invoices')
            .select('customer_id')
            .eq('company_id', companyId)
            .in('id', formData.selected_invoices)
            .limit(1);

          if (error) throw error;
          if (data && data.length > 0 && data[0].customer_id) {
            const matchedCustomer = customers.find(c => c.id === data[0].customer_id);
            if (matchedCustomer) {
              handleSelectCustomer(matchedCustomer.id);
              toast.success('تم استخراج معلومات العميل من الفاتورة');
            }
          }
        } catch (error) {
          console.error('Error extracting customer from invoice:', error);
        }
      }
    };

    extractCustomerFromInvoices();
  }, [formData.selected_invoices, companyId]);

  // Fetch customer's previous cases
  const fetchCustomerCases = async (customerId: string) => {
    if (!companyId) return;
    try {
      setLoadingCases(true);
      const { data, error } = await supabase
        .from('legal_cases')
        .select('id, case_title, case_type, case_status, case_value, created_at')
        .eq('company_id', companyId)
        .eq('client_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setCustomerCases((data as any) || []);
    } catch (error) {
      console.error('Error fetching customer cases:', error);
    } finally {
      setLoadingCases(false);
    }
  };

  // Filter customers based on search term
  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = customers.filter(customer => {
      const fullName = getCustomerName(customer);
      // Search in both Arabic and English names
      const firstNameAr = customer.first_name_ar?.toLowerCase() || '';
      const lastNameAr = customer.last_name_ar?.toLowerCase() || '';
      const firstName = customer.first_name?.toLowerCase() || '';
      const lastName = customer.last_name?.toLowerCase() || '';
      const companyNameAr = customer.company_name_ar?.toLowerCase() || '';
      const companyName = customer.company_name?.toLowerCase() || '';
      
      return (
        fullName.toLowerCase().includes(search) ||
        firstNameAr.includes(search) ||
        lastNameAr.includes(search) ||
        firstName.includes(search) ||
        lastName.includes(search) ||
        companyNameAr.includes(search) ||
        companyName.includes(search) ||
        (customer.phone && customer.phone.includes(search)) ||
        (customer.email && customer.email.toLowerCase().includes(search)) ||
        (customer.national_id && customer.national_id.includes(search))
      );
    });

    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // Handle customer selection
  const handleSelectCustomer = (customerId: string) => {
    const selected = customers.find((c) => c.id === customerId);
    if (selected) {
      const fullName = getCustomerName(selected);
      setFormData({
        ...formData,
        customer_id: selected.id,
        customer_name: fullName,
        national_id: selected.national_id || '',
        phone: selected.phone || '',
      });
      // Fetch previous cases for this customer
      fetchCustomerCases(selected.id);
      toast.success(`${fullName} selected`);
      setSearchTerm('');
    }
  };

  return (
    <div className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>يمكنك اختيار عميل من القائمة أو إدخال البيانات يدوياً.</strong>
          <br />
          <span className="text-sm">في حال عدم وجود العميل في النظام، أدخل اسمه ورقم هاتفه أدناه مباشرة.</span>
        </AlertDescription>
      </Alert>

      {/* Customer Search & Selection */}
      <div className="space-y-3">
        <Label htmlFor="customer_search" className="text-base font-semibold mb-2 block">
          البحث واختيار العميل <span className="text-muted-foreground font-normal text-sm">(اختياري)</span>
        </Label>
        
        {/* Search Input */}
        <Input
          id="customer_search"
          placeholder="ابحث باستخدام الاسم، الهاتف، البريد الإلكتروني، أو الرقم الوطني..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
          className="bg-white"
        />
        
        {/* Search Results */}
        {searchTerm && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              {filteredCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <Button
                      key={customer.id}
                      variant="ghost"
                      className="w-full justify-start font-normal text-left h-auto py-2"
                      onClick={() => handleSelectCustomer(customer.id)}
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="font-medium text-sm">{getCustomerName(customer)}</div>
                        <div className="text-xs text-muted-foreground">
                          {customer.phone && <span>{customer.phone}</span>}
                          {customer.email && <span> • {customer.email}</span>}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Quick Select - Recent Customers - Show only first 10 */}
        {!searchTerm && customers.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">اختيار سريع:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {customers.slice(0, 10).map((customer) => (
                <Button
                  key={customer.id}
                  variant="outline"
                  className="w-full justify-start font-normal text-left h-auto py-2"
                  onClick={() => handleSelectCustomer(customer.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{getCustomerName(customer)}</div>
                    {customer.phone && <div className="text-xs text-muted-foreground">{customer.phone}</div>}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="customer_name" className="text-base font-semibold mb-2 block">
          اسم العميل <span className="text-red-500">*</span>
        </Label>
        <Input
          id="customer_name"
          value={formData.customer_name}
          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
          placeholder="أدخل اسم العميل يدوياً أو اختر من القائمة أعلاه"
          className={!formData.customer_name ? 'border-red-300' : ''}
        />
        {!formData.customer_name && (
          <p className="text-xs text-red-500 mt-1">هذا الحقل مطلوب</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="national_id" className="text-base font-semibold mb-2 block">
            الرقم الوطني
          </Label>
          <Input
            id="national_id"
            value={formData.national_id}
            onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-base font-semibold mb-2 block">
            رقم الهاتف
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      {/* القضايا السابقة للعميل */}
      {formData.customer_id && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-sm">القضايا السابقة للعميل</CardTitle>
            <CardDescription>
              {loadingCases ? 'جاري تحميل سجل القضايا...' : `${customerCases.length} قضية`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCases ? (
              <div className="text-sm text-muted-foreground">جاري التحميل...</div>
            ) : customerCases.length === 0 ? (
              <div className="text-sm text-muted-foreground">لا توجد قضايا سابقة لهذا العميل</div>
            ) : (
              <div className="space-y-2">
                {customerCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-2 border rounded-md bg-white text-sm"
                  >
                    <div className="font-medium">{caseItem.case_title}</div>
                    <div className="text-xs text-muted-foreground flex justify-between items-center mt-1">
                      <span>
                        {legalCaseTypeLabel(caseItem.case_type)} • {legalCaseStatusLabel(caseItem.case_status)}
                      </span>
                      {caseItem.case_value && (
                        <span className="font-semibold text-primary">
                          {formatCurrency(caseItem.case_value)}
                        </span>
                      )}
                    </div>
                    {caseItem.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(caseItem.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// STEP 5: Review
// ============================================================================

interface ReviewStepProps {
  formData: CaseFormData;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ formData }) => {
  const { companyId } = useUnifiedCompanyAccess();
  const [selectedInvoicesData, setSelectedInvoicesData] = React.useState<any[]>([]);
  const [selectedContractsData, setSelectedContractsData] = React.useState<any[]>([]);
  const [selectedPenaltiesData, setSelectedPenaltiesData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchSelectedData = async () => {
      if (!companyId) return;
      try {
        setLoading(true);
        
        // Fetch selected invoices details
        if (formData.selected_invoices.length > 0) {
          const { data: invoicesData } = await supabase
            .from('invoices')
            .select('id, invoice_number, total_amount, invoice_date, payment_status')
            .eq('company_id', companyId)
            .in('id', formData.selected_invoices.filter(id => !id.startsWith('violation-')));
          setSelectedInvoicesData(invoicesData || []);
        }
        
        // Fetch selected contracts details
        if (formData.selected_contracts.length > 0) {
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('id, contract_number, start_date, end_date, monthly_rate')
            .eq('company_id', companyId)
            .in('id', formData.selected_contracts);
          setSelectedContractsData(contractsData || []);
        }
        
        // Note: Violations are stored in selected_invoices array with 'violation-' prefix
        const violationIds = formData.selected_invoices.filter(id => id.startsWith('violation-')).map(id => id.replace('violation-', ''));
        if (violationIds.length > 0) {
          const { data: violationsData, error: violationsError } = await supabase
            .from('penalties')
            .select('id, penalty_number, violation_type, amount, penalty_date')
            .eq('company_id', companyId)
            .in('id', violationIds);
          if (!violationsError) {
            setSelectedPenaltiesData((violationsData || []).map((violation) => ({
              ...violation,
              violation_number: violation.penalty_number,
              total_amount: violation.amount,
              violation_date: violation.penalty_date,
            })));
          }
        }
        
      } catch (error) {
        console.error('Error fetching selected data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectedData();
  }, [formData.selected_invoices, formData.selected_contracts, companyId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل القضية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between"><span>اتجاه الدعوى:</span><strong>{legalDirectionLabel(formData.case_direction)}</strong></div>
          <div className="flex justify-between"><span>قيمة المطالبة (وليست حكمًا):</span><strong>{formData.claim_amount ? formatCurrency(Number(formData.claim_amount)) : 'غير محددة'}</strong></div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">العنوان:</span>
            <span className="font-medium">{formData.case_title}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">النوع:</span>
            <Badge>{legalCaseTypeLabel(formData.case_type)}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">الأولوية:</span>
            <Badge variant="destructive">{formData.priority.toUpperCase()}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">النتيجة المتوقعة:</span>
            <span className="font-medium">{formData.expected_outcome}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الطرف الآخر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">الاسم:</span>
            <span className="font-medium">{formData.customer_name}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">رقم الهاتف:</span>
            <span className="font-medium">{formData.phone}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">البريد الإلكتروني:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الأدلة المحددة</CardTitle>
          <CardDescription>
            الفواتير والعقود والمخالفات المرتبطة بالقضية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <>
              {/* Invoices Section */}
              {selectedInvoicesData.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    الفواتير المستحقة
                    <Badge variant="secondary">{selectedInvoicesData.length}</Badge>
                  </h4>
                  <div className="space-y-2">
                    {selectedInvoicesData.map((invoice) => (
                      <div key={invoice.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{invoice.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(invoice.invoice_date).toLocaleDateString('en-US')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{formatCurrency(invoice.total_amount)}</div>
                          <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                            {invoice.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Violations Section */}
              {selectedPenaltiesData.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    المخالفات المرورية
                    <Badge variant="secondary">{selectedPenaltiesData.length}</Badge>
                  </h4>
                  <div className="space-y-2">
                    {selectedPenaltiesData.map((violation: any) => (
                      <div key={violation.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{violation.violation_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {violation.violation_type}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {violation.violation_date ? new Date(violation.violation_date).toLocaleDateString('en-US') : '-'}
                          </div>
                        </div>
                        <div className="font-bold text-destructive">{formatCurrency(violation.total_amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contracts Section */}
              {selectedContractsData.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    العقود المرتبطة
                    <Badge variant="secondary">{selectedContractsData.length}</Badge>
                  </h4>
                  <div className="space-y-2">
                    {selectedContractsData.map((contract) => (
                      <div key={contract.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{contract.contract_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(contract.start_date).toLocaleDateString('en-US')} - {contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-US') : 'مفتوح'}
                          </div>
                        </div>
                        <div className="font-bold text-primary">{formatCurrency(contract.monthly_rate)}/شهر</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvoicesData.length === 0 && selectedPenaltiesData.length === 0 && selectedContractsData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لم يتم تحديد أي أدلة بعد
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          راجع البيانات قبل إنشاء القضية. لم تُرفق ملفات المستندات من هذا المعالج؛ أضفها داخل ملف القضية بعد إنشائها. اكتمال هذه البيانات لا يعني اكتمال الحافظة القانونية.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default LegalCaseCreationWizard;
