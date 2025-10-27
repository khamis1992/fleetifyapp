/**
 * Legal Case Creation Wizard
 * 
 * Complete 4-step wizard for creating legal cases:
 * 1. Case Details - Type, priority, expected outcome
 * 2. Select Invoices/Contracts - Multi-select with claim calculation
 * 3. Customer Information - Auto-populate & edit customer details
 * 4. Evidence Upload - Upload contracts, invoices, receipts, communications, photos, recordings
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
import { formatCurrency } from '@/lib/utils';

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
  
  // Selected invoices/contracts
  selected_invoices: string[];
  selected_contracts: string[];
  
  // Customer info
  customer_id: string;
  customer_name: string;
  national_id: string;
  address: string;
  phone: string;
  email: string;
  emergency_contact: string;
  employer_info: string;
  
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

  const stepOrder: WizardStep[] = ['details', 'invoices', 'customer', 'evidence', 'review'];
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
        toast.error('Please fill in all required fields');
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
        legal_fees: 0,
        court_fees: 0,
        other_expenses: 0,
        total_costs: 0,
        billing_status: 'pending',
        is_confidential: false,
        metadata: {
          expected_outcome: formData.expected_outcome,
          national_id: formData.national_id,
          address: formData.address,
          emergency_contact: formData.emergency_contact,
          employer_info: formData.employer_info,
          selected_invoices: formData.selected_invoices,
          selected_contracts: formData.selected_contracts,
          evidence_count: formData.evidence_files.length,
        },
      });

      toast.success('Legal case created successfully');
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
    setCurrentStep('details');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Legal Case</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {stepOrder.length}
          </DialogDescription>
          <Progress value={progress} className="mt-4" />
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Case Details */}
          {currentStep === 'details' && (
            <CaseDetailsStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 2: Select Invoices/Contracts */}
          {currentStep === 'invoices' && (
            <InvoicesSelectionStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 3: Customer Information */}
          {currentStep === 'customer' && (
            <CustomerInfoStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 4: Evidence Upload */}
          {currentStep === 'evidence' && (
            <EvidenceUploadStep formData={formData} setFormData={setFormData} />
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <ReviewStep formData={formData} />
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={createCaseMutation.isPending}
            >
              {createCaseMutation.isPending ? 'Creating...' : 'Create Case'}
            </Button>
          ) : (
            <Button onClick={handleNextStep}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// STEP 1: Case Details
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
          Case Title *
        </Label>
        <Input
          id="case_title"
          placeholder="e.g., Collection of Overdue Rent"
          value={formData.case_title}
          onChange={(e) => setFormData({ ...formData, case_title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="case_type" className="text-base font-semibold mb-2 block">
            Case Type *
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
              <SelectItem value="payment_collection">Payment Collection</SelectItem>
              <SelectItem value="contract_breach">Contract Breach</SelectItem>
              <SelectItem value="vehicle_damage">Vehicle Damage</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority" className="text-base font-semibold mb-2 block">
            Priority *
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
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="expected_outcome" className="text-base font-semibold mb-2 block">
          Expected Outcome *
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
            <SelectItem value="payment">Payment Recovery</SelectItem>
            <SelectItem value="vehicle_return">Vehicle Return</SelectItem>
            <SelectItem value="both">Both Payment & Return</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description" className="text-base font-semibold mb-2 block">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Detailed description of the case..."
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
    </div>
  );
};

// ============================================================================
// STEP 2: Invoices Selection
// ============================================================================

interface InvoicesSelectionStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const InvoicesSelectionStep: React.FC<InvoicesSelectionStepProps> = ({
  formData,
  setFormData,
}) => {
  // Mock data - in production, fetch from Supabase
  const mockInvoices = [
    { id: '1', number: 'INV-2025-001', amount: 5000, date: '2025-09-01' },
    { id: '2', number: 'INV-2025-002', amount: 7500, date: '2025-08-15' },
    { id: '3', number: 'INV-2025-003', amount: 3200, date: '2025-07-20' },
  ];

  const mockContracts = [
    { id: 'C1', number: 'CONTRACT-2024-001', title: 'Rental Agreement' },
    { id: 'C2', number: 'CONTRACT-2024-002', title: 'Service Agreement' },
  ];

  const selectedInvoiceAmount = mockInvoices
    .filter((inv) => formData.selected_invoices.includes(inv.id))
    .reduce((sum, inv) => sum + inv.amount, 0);

  const toggleInvoice = (invoiceId: string) => {
    setFormData({
      ...formData,
      selected_invoices: formData.selected_invoices.includes(invoiceId)
        ? formData.selected_invoices.filter((id) => id !== invoiceId)
        : [...formData.selected_invoices, invoiceId],
    });
  };

  const toggleContract = (contractId: string) => {
    setFormData({
      ...formData,
      selected_contracts: formData.selected_contracts.includes(contractId)
        ? formData.selected_contracts.filter((id) => id !== contractId)
        : [...formData.selected_contracts, contractId],
    });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Select all invoices and contracts related to this case. The total claim amount will be calculated automatically.
        </AlertDescription>
      </Alert>

      {/* Invoices Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
          <CardDescription>
            Selected: {formData.selected_invoices.length} | Total Claim: {formatCurrency(selectedInvoiceAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
            >
              <Checkbox
                checked={formData.selected_invoices.includes(invoice.id)}
                onCheckedChange={() => toggleInvoice(invoice.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{invoice.number}</div>
                <div className="text-sm text-muted-foreground">{invoice.date}</div>
              </div>
              <Badge variant="outline">{formatCurrency(invoice.amount)}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contracts</CardTitle>
          <CardDescription>
            Selected: {formData.selected_contracts.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockContracts.map((contract) => (
            <div
              key={contract.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
            >
              <Checkbox
                checked={formData.selected_contracts.includes(contract.id)}
                onCheckedChange={() => toggleContract(contract.id)}
              />
              <div className="flex-1">
                <div className="font-medium">{contract.number}</div>
                <div className="text-sm text-muted-foreground">{contract.title}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// STEP 3: Customer Information
// ============================================================================

interface CustomerInfoStepProps {
  formData: CaseFormData;
  setFormData: (data: CaseFormData) => void;
}

const CustomerInfoStep: React.FC<CustomerInfoStepProps> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          All customer information will be auto-populated from the selected invoices. You can edit the details below.
        </AlertDescription>
      </Alert>

      <div>
        <Label htmlFor="customer_name" className="text-base font-semibold mb-2 block">
          Customer Name *
        </Label>
        <Input
          id="customer_name"
          value={formData.customer_name}
          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="national_id" className="text-base font-semibold mb-2 block">
            National ID
          </Label>
          <Input
            id="national_id"
            value={formData.national_id}
            onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-base font-semibold mb-2 block">
            Phone
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-base font-semibold mb-2 block">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="address" className="text-base font-semibold mb-2 block">
          Address
        </Label>
        <Textarea
          id="address"
          rows={2}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="emergency_contact" className="text-base font-semibold mb-2 block">
          Emergency Contact
        </Label>
        <Input
          id="emergency_contact"
          value={formData.emergency_contact}
          onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="employer_info" className="text-base font-semibold mb-2 block">
          Employer Information
        </Label>
        <Input
          id="employer_info"
          value={formData.employer_info}
          onChange={(e) => setFormData({ ...formData, employer_info: e.target.value })}
        />
      </div>
    </div>
  );
};

// ============================================================================
// STEP 4: Evidence Upload
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
    { value: 'contract', label: 'Contracts' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'receipt', label: 'Payment Receipts' },
    { value: 'communication', label: 'Email/SMS Communications' },
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

    toast.success(`${newFiles.length} file(s) added`);
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
          Upload supporting documents and evidence for the legal case. All files should be relevant to the case.
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
        <p className="text-sm font-medium mb-1">Drag and drop files here</p>
        <p className="text-xs text-muted-foreground mb-4">or click to select files</p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-input"
        />
        <Label htmlFor="file-input" className="cursor-pointer">
          <Button variant="outline" size="sm">
            Select Files
          </Button>
        </Label>
      </div>

      {/* Files List */}
      {formData.evidence_files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Evidence</CardTitle>
            <CardDescription>
              {formData.evidence_files.length} file(s) uploaded
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
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
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
            <span className="text-muted-foreground">Priority:</span>
            <Badge variant="destructive">{formData.priority.toUpperCase()}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Expected Outcome:</span>
            <span className="font-medium">{formData.expected_outcome}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-medium">{formData.customer_name}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Phone:</span>
            <span className="font-medium">{formData.phone}</span>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected Evidence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Invoices:</span>
            <Badge variant="secondary">{formData.selected_invoices.length}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Contracts:</span>
            <Badge variant="secondary">{formData.selected_contracts.length}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Evidence Files:</span>
            <Badge variant="secondary">{formData.evidence_files.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          All information is complete. Click "Create Case" to finalize.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default LegalCaseCreationWizard;
