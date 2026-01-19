/**
 * Dialog for opening legal cases from customer page
 * Provides options for traffic violation transfer and theft report
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronRight,
  Car,
  User,
  Calendar,
  MapPin,
  Printer,
  Download,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useLegalDocumentGenerator } from '@/hooks/useLegalDocumentGenerator';
import { LEGAL_CASE_OPTIONS, MissingField } from '@/types/legal-cases';

interface CustomerLegalCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  companyId: string;
  customerName: string;
}

export function CustomerLegalCaseDialog({
  open,
  onOpenChange,
  customerId,
  companyId,
  customerName,
}: CustomerLegalCaseDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<'select' | 'contract' | 'validate' | 'preview'>('select');
  const [selectedCaseType, setSelectedCaseType] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<any | null>(null);

  // Hooks
  const { useTemplates, useValidateFields, generateDocument, useCustomerContracts } =
    useLegalDocumentGenerator({
      customerId,
      companyId,
      vehicleId: selectedVehicleId || undefined,
      contractId: selectedContractId || undefined,
    });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useTemplates(
    selectedCaseType ? [selectedCaseType] : []
  );

  // Fetch customer contracts with vehicles
  const { data: contracts, isLoading: contractsLoading } = useCustomerContracts(customerId);

  // Validate fields
  const template = templates?.[0];
  const { data: missingFields, isLoading: validationLoading } = useValidateFields(template || ({} as any));

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedCaseType(null);
      setSelectedContractId(null);
      setSelectedVehicleId(null);
      setGeneratedDocument(null);
    }
  }, [open]);

  // Handle case type selection
  const handleSelectCaseType = (caseType: string) => {
    setSelectedCaseType(caseType);
    setStep('contract');
  };

  // Handle contract selection
  const handleSelectContract = (contract: any) => {
    setSelectedContractId(contract.id);
    setSelectedVehicleId(contract.vehicle?.id || null);
    setStep('validate');
  };

  // Handle generate document
  const handleGenerateDocument = async () => {
    if (!template) return;

    try {
      const result = await generateDocument.mutateAsync({
        template,
        variables: {
          letter_date: new Date().toISOString().split('T')[0],
        },
      });

      setGeneratedDocument(result);

      toast({
        title: 'تم إنشاء الوثيقة بنجاح',
        description: 'يمكنك تحميل الوثيقة أو طباعتها الآن',
      });

      setStep('preview');
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء الوثيقة',
        variant: 'destructive',
      });
    }
  };

  // Handle download PDF
  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    toast({
      title: 'قريباً',
      description: 'ميزة تحميل PDF قيد التطوير',
    });
  };

  // Handle print
  const handlePrint = () => {
    if (!generatedDocument?.body) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>${generatedDocument.document_type || 'وثيقة قانونية'}</title>
            <style>
              body {
                font-family: 'Tajawal', sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
              }
              .content {
                white-space: pre-wrap;
                text-align: justify;
              }
              .footer {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                font-size: 0.9em;
                color: #666;
              }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${template?.name_ar || 'وثيقة قانونية'}</h2>
              <p>الرقم المرجعي: ${generatedDocument.document_number || '-'}</p>
            </div>
            <div class="content">
              ${generatedDocument.body}
            </div>
            <div class="footer">
              <p>تم استخراج هذه الوثيقة إلكترونياً من نظام Fleetify</p>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Render case type selection
  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-2">فتح قضية جديدة</h3>
        <p className="text-sm text-neutral-500">اختر نوع القضية المراد فتحها</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEGAL_CASE_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSelectCaseType(option.template_key)}
            className={cn(
              'relative p-6 rounded-2xl border-2 transition-all text-right',
              'hover:border-teal-500 hover:bg-teal-50',
              'border-neutral-200 bg-white'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                option.key === 'traffic_violation_transfer'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-red-100 text-red-600'
              )}>
                {option.key === 'traffic_violation_transfer' ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-neutral-900 mb-1">{option.name_ar}</h4>
                <p className="text-sm text-neutral-500">{option.description_ar}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Render contract selection
  const renderContractStep = () => (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setStep('select')}
        className="mb-4"
      >
        <ChevronRight className="w-4 h-4 ml-1 rotate-180" />
        العودة
      </Button>

      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-2">اختر العقد والمركبة</h3>
        <p className="text-sm text-neutral-500">حدد العقد المرتبط بالقضية</p>
      </div>

      {contractsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      ) : contracts && contracts.length > 0 ? (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {contracts.map((contract: any) => {
            const statusColors: Record<string, string> = {
              active: 'bg-green-100 text-green-700',
              inactive: 'bg-neutral-100 text-neutral-700',
              completed: 'bg-blue-100 text-blue-700',
              cancelled: 'bg-red-100 text-red-700',
              expired: 'bg-orange-100 text-orange-700',
            };
            const statusLabels: Record<string, string> = {
              active: 'نشط',
              inactive: 'غير نشط',
              completed: 'مكتمل',
              cancelled: 'ملغي',
              expired: 'منتهي',
            };

            return (
              <button
                key={contract.id}
                onClick={() => handleSelectContract(contract)}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all text-right',
                  'hover:border-teal-500 hover:bg-teal-50',
                  'border-neutral-200 bg-white'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-neutral-900">
                        {contract.vehicle?.make} {contract.vehicle?.model}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {contract.vehicle?.plate_number}
                      </Badge>
                      <Badge className={cn('text-xs', statusColors[contract.status] || 'bg-neutral-100 text-neutral-700')}>
                        {statusLabels[contract.status] || contract.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {contract.contract_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(contract.start_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-400" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            لا توجد عقود لهذا العميل. يجب إنشاء عقد أولاً قبل فتح قضية.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Render validation step
  const renderValidateStep = () => {
    const hasMissingFields = missingFields && missingFields.length > 0;

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep('contract')}
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4 ml-1 rotate-180" />
          العودة
        </Button>

        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">التحقق من البيانات</h3>
          <p className="text-sm text-neutral-500">التأكد من اكتمال المعلومات المطلوبة</p>
        </div>

        {validationLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : hasMissingFields ? (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <div className="font-bold mb-2">بيانات ناقصة</div>
              <p className="text-sm mb-3">يرجى استكمال البيانات التالية قبل المتابعة:</p>
              <ul className="space-y-2">
                {missingFields.map((field, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span>{field.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {field.source === 'customer' && 'بيانات العميل'}
                      {field.source === 'vehicle' && 'بيانات المركبة'}
                      {field.source === 'contract' && 'بيانات العقد'}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-3 bg-white rounded-lg">
                <p className="text-sm text-neutral-700">
                  <strong>ملاحظة:</strong> يرجى تحديث بيانات العميل أو المركبة أولاً، ثم المحاولة مرة أخرى.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/customers/${customerId}`, {
                      state: { edit: true }
                    });
                  }}
                >
                  تعديل بيانات العميل
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <div className="font-bold mb-2">جميع البيانات مكتملة</div>
              <p className="text-sm">يمكنك الآن متابعة إنشاء الوثيقة.</p>
            </AlertDescription>
          </Alert>
        )}

        {!hasMissingFields && (
          <Button
            onClick={handleGenerateDocument}
            disabled={generateDocument.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600"
          >
            {generateDocument.isPending ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              'إنشاء الوثيقة'
            )}
          </Button>
        )}
      </div>
    );
  };

  // Render preview step
  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-2">تم إنشاء الوثيقة بنجاح</h3>
        <p className="text-sm text-neutral-500">يمكنك الآن تحميل أو طباعة الوثيقة</p>
        {generatedDocument && (
          <p className="text-sm font-mono text-teal-600 mt-2">
            رقم الوثيقة: {generatedDocument.document_number}
          </p>
        )}
      </div>

      {/* Document Preview Box */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 max-h-[300px] overflow-y-auto mb-4">
        <div className="text-right whitespace-pre-wrap font-serif text-sm leading-relaxed text-neutral-700">
          {generatedDocument?.body}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleDownloadPDF}
          className="flex-1 gap-2"
          variant="outline"
        >
          <Download className="w-4 h-4" />
          تحميل PDF
        </Button>
        <Button
          onClick={handlePrint}
          className="flex-1 gap-2 bg-teal-600 hover:bg-teal-700"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
      </div>

      <Button
        variant="ghost"
        onClick={() => onOpenChange(false)}
        className="w-full"
      >
        إغلاق
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">
            {step === 'select' && 'فتح قضية جديدة'}
            {step === 'contract' && 'اختر العقد'}
            {step === 'validate' && 'التحقق من البيانات'}
            {step === 'preview' && 'معاينة الوثيقة'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {step === 'select' && `إنشاء قضية للعميل: ${customerName}`}
            {step === 'contract' && 'اختر العقد والمركبة المرتبطة بالقضية'}
            {step === 'validate' && 'التحقق من اكتمال البيانات المطلوبة'}
            {step === 'preview' && 'معاينة وتنزيل الوثيقة'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {step === 'select' && renderSelectStep()}
          {step === 'contract' && renderContractStep()}
          {step === 'validate' && renderValidateStep()}
          {step === 'preview' && renderPreviewStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
