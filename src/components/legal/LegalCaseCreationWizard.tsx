/**
 * Legal Case Creation Wizard
 * 
 * Complete 5-step wizard for tracking legal cases:
 * 1. تفاصيل القضية - Type, priority, court info (complaint #, case #, court name, dates)
 * 2. معلومات العميل - Select customer first
 * 3. Select الفواتير/العقود - Multi-select filtered by customer
 * 4. رفع المستندات - Upload contracts, invoices, receipts, communications, photos, recordings
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
  Upload,
  X,
  CheckCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useCreateLegalCase } from '@/hooks/useLegalCases';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LegalCaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface CaseFormData {
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
  
  // Evidence files
  evidence_files: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    category: 'contract' | 'invoice' | 'receipt' | 'communication' | 'photo' | 'recording' | 'witness';
  }>;
}

type WizardStep = 'details' | 'invoices' | 'customer' | 'evidence' | 'review';

const LegalCaseCreationWizard: React.FC<LegalCaseWizardProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [formData, setFormData] = useState<CaseFormData>({
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
    evidence_files: [],
  });

  const createCaseMutation = useCreateLegalCase();
  const { saveDraft, lastSaved } = useCaseDraft(formData, currentStep);

  const stepOrder: WizardStep[] = ['details', 'customer', 'invoices', 'evidence', 'review'];
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
      if (!formData.case_title || !formData.customer_name) {
        toast.error('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      const totalClaimAmount = calculateTotalClaim();

      await createCaseMutation.mutateAsync({
        case_title: formData.case_title,
        case_type: formData.case_type,
        priority: formData.priority,
        case_status: 'active',
        description: formData.description,
        client_name: formData.customer_name,
        client_phone: formData.phone,
        client_email: formData.email,
        case_value: totalClaimAmount,
        // Court tracking fields
        complaint_number: formData.complaint_number,
        court_name: formData.court_name,
        filing_date: formData.filing_date,
        hearing_date: formData.first_hearing_date,
        judge_name: formData.judge_name,
        case_reference: formData.court_case_number,  // Map court_case_number to case_reference
        legal_fees: 0,
        court_fees: 0,
        other_expenses: 0,
        billing_status: 'pending',
        is_confidential: false,
        legal_team: [],
        tags: [],
        notes: `Customer ID: ${formData.customer_id}
الرقم الوطني: ${formData.national_id}
رقم الهاتف: ${formData.phone}
Selected الفواتير: ${formData.selected_invoices.length}
Selected العقود: ${formData.selected_contracts.length}
ملفات الأدلة: ${formData.evidence_files.length}
النتيجة المتوقعة: ${formData.expected_outcome}`,
      });

      toast.success('تم إنشاء القضية بنجاح');
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating legal case:', error);
      toast.error('Failed to create legal case');
    }
  };

  const calculateTotalClaim = () => {
    // This would sum up invoice amounts from selected_invoices
    // For now, return 0 as placeholder
    return 0;
  };

  const resetForm = () => {
    setFormData({
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
      evidence_files: [],
    });
    setCurrentStep('details');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء قضية قانونية</DialogTitle>
            <CardDescription>
            Step {currentStepIndex + 1} of {stepOrder.length}
            </CardDescription>
          <Progress value={progress} className="mt-4" />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: تفاصيل القضية */}
          {currentStep === 'details' && (
            <CaseDetailsStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 2: معلومات العميل */}
          {currentStep === 'customer' && (
            <CustomerInfoStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 3: Select الفواتير/العقود - Filtered by selected customer */}
          {currentStep === 'invoices' && (
            <InvoiceSelectionStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 4: رفع المستندات */}
          {currentStep === 'evidence' && (
            <EvidenceUploadStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <ReviewStep formData={formData} />
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
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
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
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

const CaseDetailsStep: React.FC<CaseDetailsStepProps> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4">
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

      {/* Court Case Tracking Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">معلومات القضية في المحكمة</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="complaint_number" className="text-base font-semibold mb-2 block">
              رقم البلاغ *
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
              رقم القضية في المحكمة *
            </Label>
            <Input
              id="court_case_number"
              placeholder="مثال: 456/2025"
              value={formData.court_case_number}
              onChange={(e) => setFormData({ ...formData, court_case_number: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="court_name" className="text-base font-semibold mb-2 block">
            اسم المحكمة *
          </Label>
          <Input
            id="court_name"
            placeholder="مثال: محكمة الدوحة الابتدائية"
            value={formData.court_name}
            onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="filing_date" className="text-base font-semibold mb-2 block">
              تاريخ رفع القضية *
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

        <div className="mt-4">
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
    </div>
  );
};

// ============================================================================
// STEP 2: الفواتير Selection
// ============================================================================

interface InvoiceSelectionStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const InvoiceSelectionStep: React.FC<InvoiceSelectionStepProps> = ({
  formData,
  setFormData,
}) => {
  // Fetch outstanding amounts from Supabase
  const [unpaidRent, setUnpaidRent] = React.useState<any[]>([]);
  const [lateFees, setLateFees] = React.useState<any[]>([]);
  const [trafficViolations, setTrafficViolations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchOutstandingAmounts = async () => {
      if (!formData.customer_id) return;
      
      try {
        setLoading(true);
        
        // Fetch overdue rent (invoices) - only invoices past due date
        const { data: rentData, error: rentError } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, invoice_date, payment_status, due_date')
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
          .eq('status', 'applied')
          .in('invoice_id', (rentData || []).map(inv => inv.id))
          .order('created_at', { ascending: false });
        
        if (feesError) throw feesError;
        setLateFees(feesData || []);
        
        // Fetch traffic violations (penalties)
        const { data: violationsData, error: violationsError } = await supabase
          .from('penalties')
          .select('id, penalty_number, violation_type, amount, penalty_date, payment_status, vehicle_plate')
          .eq('customer_id', formData.customer_id)
          .eq('payment_status', 'unpaid')
          .order('penalty_date', { ascending: false });
        
        if (violationsError) throw violationsError;
        setTrafficViolations(violationsData || []);
        
      } catch (error) {
        console.error('Error fetching outstanding amounts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOutstandingAmounts();
  }, [formData.customer_id]);

  // Calculate total outstanding amount
  const totalRent = unpaidRent.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalLateFees = lateFees.reduce((sum, fee) => sum + fee.fee_amount, 0);
  const totalViolations = trafficViolations.reduce((sum, v) => sum + v.amount, 0);
  const grandTotal = totalRent + totalLateFees + totalViolations;



  return (
    <div className="space-y-6">
      {!formData.customer_id ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            يرجى اختيار العميل في الخطوة السابقة لعرض المبالغ المستحقة.
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
                      تاريخ الفاتورة: {new Date(rent.invoice_date).toLocaleDateString('ar-QA')} | 
                      تاريخ الاستحقاق: {new Date(rent.due_date).toLocaleDateString('ar-QA')}
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
                      التاريخ: {new Date(fee.created_at).toLocaleDateString('ar-QA')}
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
                    <div className="font-medium">{violation.penalty_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {violation.violation_type} | 
                      لوحة: {violation.vehicle_plate} | 
                      التاريخ: {new Date(violation.penalty_date).toLocaleDateString('ar-QA')}
                    </div>
                  </div>
                  <Badge variant="destructive">{formatCurrency(violation.amount)}</Badge>
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
  company_name?: string | null;
  email?: string | null;
  phone?: string;
  address?: string | null;
  national_id?: string | null;
  emergency_contact_name?: string | null;
}

// Helper to get full customer name
const getCustomerName = (customer: Customer): string => {
  if (customer.company_name) return customer.company_name;
  if (customer.first_name && customer.last_name) 
    return `${customer.first_name} ${customer.last_name}`;
  if (customer.first_name) return customer.first_name;
  return 'Unknown';
};

interface CustomerInfoStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const CustomerInfoStep: React.FC<CustomerInfoStepProps> = ({ formData, setFormData }) => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [customerCases, setCustomerCases] = React.useState<any[]>([]);
  const [loadingCases, setLoadingCases] = React.useState(false);

  // Fetch customers from database
  React.useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('id, first_name, last_name, company_name, email, phone, address, national_id, emergency_contact_name')
          .eq('is_active', true)
          .order('company_name, first_name');

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
  }, []);

  // Auto-extract customer from selected invoices
  React.useEffect(() => {
    const extractCustomerFromInvoices = async () => {
      if (formData.selected_invoices.length > 0 && !formData.customer_id) {
        try {
          const { data, error } = await supabase
            .from('invoices')
            .select('customer_id')
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
  }, [formData.selected_invoices]);

  // Fetch customer's previous cases
  const fetchCustomerCases = async (customerId: string) => {
    try {
      setLoadingCases(true);
      const { data, error } = await supabase
        .from('legal_cases')
        .select('id, case_title, case_type, case_status, case_value, created_at')
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
      return (
        fullName.toLowerCase().includes(search) ||
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
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          اختر عميلاً موجوداً أو أدخل معلومات العميل يدوياً. يمكن تعديل التفاصيل أدناه.
        </AlertDescription>
      </Alert>

      {/* Customer Search & Selection */}
      <div className="space-y-3">
        <Label htmlFor="customer_search" className="text-base font-semibold mb-2 block">
          البحث واختيار العميل
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
          اسم العميل *
        </Label>
        <Input
          id="customer_name"
          value={formData.customer_name}
          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
          placeholder="Enter or select customer name"
        />
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
                        {caseItem.case_type.replace(/_/g, ' ').toUpperCase()} • {caseItem.case_status}
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
// STEP 4: رفع المستندات
// ============================================================================

interface EvidenceUploadStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const EvidenceUploadStep: React.FC<EvidenceUploadStepProps> = ({
  formData,
  setFormData,
}) => {
  const [dragActive, setDragActive] = React.useState(false);

  const evidenceCategories = [
    { value: 'contract', label: 'العقود' },
    { value: 'invoice', label: 'الفواتير' },
    { value: 'receipt', label: 'Payment Receipts' },
    { value: 'communication', label: 'البريد الإلكتروني/SMS Communications' },
    { value: 'photo', label: 'Photos (Vehicle/Damage)' },
    { value: 'recording', label: 'Voice Recordings' },
    { value: 'witness', label: 'Witness Statements' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    addFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      addFiles(files);
    }
  };

  const addFiles = (files: FileList) => {
    const newFiles = Array.from(files).map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      category: 'communication' as const,
    }));

    setFormData({
      ...formData,
      evidence_files: [...formData.evidence_files, ...newFiles],
    });

    toast.success(`${newFiles.length} ملف تمت إضافته`);
  };

  const removeFile = (fileId: string) => {
    setFormData({
      ...formData,
      evidence_files: formData.evidence_files.filter((f) => f.id !== fileId),
    });
  };

  const updateFileCategory = (fileId: string, category: any) => {
    setFormData({
      ...formData,
      evidence_files: formData.evidence_files.map((f) =>
        f.id === fileId ? { ...f, category } : f
      ),
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          رفع المستندات <strong>اختياري</strong>. يمكنك إضافة المستندات لاحقاً من صفحة القضية.
        </AlertDescription>
      </Alert>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">اسحب وأفلت الملفات هنا</p>
        <p className="text-xs text-muted-foreground mb-4">أو انقر لاختيار الملفات</p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        <Label htmlFor="file-input" className="cursor-pointer">
          <Button variant="outline" size="sm">
            اختر الملفات
          </Button>
        </Label>
      </div>

      {/* Files List */}
      {formData.evidence_files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الأدلة المرفوعة</CardTitle>
            <CardDescription>
              {formData.evidence_files.length} ملف مرفوع
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.evidence_files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Select
                  value={file.category}
                  onValueChange={(value) => updateFileCategory(file.id, value)}
                >
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
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
  const [selectedInvoicesData, setSelectedInvoicesData] = React.useState<any[]>([]);
  const [selectedContractsData, setSelectedContractsData] = React.useState<any[]>([]);
  const [selectedPenaltiesData, setSelectedPenaltiesData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchSelectedData = async () => {
      try {
        setLoading(true);
        
        // Fetch selected invoices details
        if (formData.selected_invoices.length > 0) {
          const { data: invoicesData } = await supabase
            .from('invoices')
            .select('id, invoice_number, total_amount, invoice_date, payment_status')
            .in('id', formData.selected_invoices);
          setSelectedInvoicesData(invoicesData || []);
        }
        
        // Fetch selected contracts details
        if (formData.selected_contracts.length > 0) {
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('id, contract_number, start_date, end_date, monthly_rate')
            .in('id', formData.selected_contracts);
          setSelectedContractsData(contractsData || []);
        }
        
        // Note: Penalties are stored in selected_invoices array with 'penalty-' prefix
        const penaltyIds = formData.selected_invoices.filter(id => id.startsWith('penalty-')).map(id => id.replace('penalty-', ''));
        if (penaltyIds.length > 0) {
          const { data: penaltiesData } = await supabase
            .from('penalties')
            .select('id, penalty_number, violation_type, amount, penalty_date, vehicle_plate')
            .in('id', penaltyIds);
          setSelectedPenaltiesData(penaltiesData || []);
        }
        
      } catch (error) {
        console.error('Error fetching selected data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSelectedData();
  }, [formData.selected_invoices, formData.selected_contracts]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل القضية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Title:</span>
            <span className="font-medium">{formData.case_title}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Type:</span>
            <Badge>{formData.case_type}</Badge>
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
          <CardTitle>معلومات العميل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Name:</span>
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
                            {new Date(invoice.invoice_date).toLocaleDateString('ar-QA')}
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

              {/* Penalties Section */}
              {selectedPenaltiesData.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    المخالفات المرورية
                    <Badge variant="secondary">{selectedPenaltiesData.length}</Badge>
                  </h4>
                  <div className="space-y-2">
                    {selectedPenaltiesData.map((penalty) => (
                      <div key={penalty.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{penalty.penalty_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {penalty.violation_type} • {penalty.vehicle_plate}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(penalty.penalty_date).toLocaleDateString('ar-QA')}
                          </div>
                        </div>
                        <div className="font-bold text-destructive">{formatCurrency(penalty.amount)}</div>
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
                            {new Date(contract.start_date).toLocaleDateString('ar-QA')} - {contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-QA') : 'مفتوح'}
                          </div>
                        </div>
                        <div className="font-bold text-primary">{formatCurrency(contract.monthly_rate)}/شهر</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Files */}
              {formData.evidence_files.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    ملفات الأدلة
                    <Badge variant="secondary">{formData.evidence_files.length}</Badge>
                  </h4>
                  <div className="space-y-2">
                    {formData.evidence_files.map((file) => (
                      <div key={file.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">{file.category}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInvoicesData.length === 0 && selectedPenaltiesData.length === 0 && selectedContractsData.length === 0 && formData.evidence_files.length === 0 && (
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
          جميع المعلومات مكتملة. انقر على "إنشاء القضية" للإنهاء.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default LegalCaseCreationWizard;
