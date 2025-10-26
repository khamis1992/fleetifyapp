import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, ChevronLeft, ChevronRight, Send, Clock, TestTube, FileText, CheckCircle, Scan } from 'lucide-react'
import { ContractWizardProvider, useContractWizard } from './ContractWizardProvider'
import { 
  BasicInfoStep, 
  CustomerVehicleStep, 
  DatesStep, 
  FinancialStep, 
  ReviewStep 
} from './ContractWizardSteps'
import { LateFinesStep } from './LateFinesStep'
import { ContractScannerDialog } from './ContractScannerDialog'
import { useState } from 'react'


const stepComponents = [
  BasicInfoStep,
  DatesStep,
  CustomerVehicleStep,
  FinancialStep,
  LateFinesStep,
  ReviewStep
]

const stepTitles = [
  'المعلومات الأساسية',
  'التواريخ والمدة', 
  'العميل والمركبة',
  'التفاصيل المالية',
  'إعدادات الغرامات',
  'المراجعة والإرسال'
]

interface ContractWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (contractData: any) => Promise<any>
  preselectedCustomerId?: string
  draftIdToLoad?: string
  contractToEdit?: any
}

const ContractWizardContent: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  
  const {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    canProceedToNext,
    submitContract,
    saveDraft,
    isAutoSaving,
    data,
    fillTestData,
    updateData
  } = useContractWizard()

  const progress = ((currentStep + 1) / totalSteps) * 100
  const CurrentStepComponent = stepComponents[currentStep]

  const handleNext = () => {
    if (currentStep === totalSteps - 1) {
      // Last step - submit contract
      submitContract()
    } else {
      nextStep()
    }
  }

  const handleScanDataExtracted = (extractedData: any) => {
    console.log('📄 [CONTRACT_WIZARD] OCR data extracted:', extractedData);
    
    // Map extracted data to contract form fields
    const mappedData: any = {};
    
    // Basic info
    if (extractedData.contract_number) mappedData.contract_number = extractedData.contract_number;
    if (extractedData.contract_date) mappedData.contract_date = extractedData.contract_date;
    if (extractedData.agreement_type) mappedData.contract_type = extractedData.agreement_type;
    
    // Dates
    if (extractedData.start_date) mappedData.start_date = extractedData.start_date;
    if (extractedData.end_date) mappedData.end_date = extractedData.end_date;
    if (extractedData.contract_duration_months) mappedData.duration_months = extractedData.contract_duration_months;
    
    // Financial
    if (extractedData.monthly_rent) mappedData.monthly_amount = extractedData.monthly_rent;
    if (extractedData.guarantee_amount) mappedData.guarantee_amount = extractedData.guarantee_amount;
    
    // Store scanned customer/vehicle data for manual matching
    if (extractedData.customer_name) mappedData.scanned_customer_name = extractedData.customer_name;
    if (extractedData.customer_civil_id) mappedData.scanned_customer_id = extractedData.customer_civil_id;
    if (extractedData.customer_phone) mappedData.scanned_customer_phone = extractedData.customer_phone;
    if (extractedData.vehicle_make) mappedData.scanned_vehicle_make = extractedData.vehicle_make;
    if (extractedData.vehicle_model) mappedData.scanned_vehicle_model = extractedData.vehicle_model;
    if (extractedData.vehicle_plate) mappedData.scanned_vehicle_plate = extractedData.vehicle_plate;
    
    // Update wizard data
    updateData(mappedData);
    
    // Close scanner
    setShowScanner(false);
  };

  return (
    <>
      <DialogHeader className="space-y-4">
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>انشاء عقد جديد</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScanner(true)}
              className="text-xs flex items-center gap-1"
            >
              <Scan className="h-3 w-3" />
              مسح عقد
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fillTestData}
              className="text-xs flex items-center gap-1"
            >
              <TestTube className="h-3 w-3" />
              بيانات تجريبية
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {isAutoSaving && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                جاري الحفظ...
              </Badge>
            )}
            {data.last_saved_at && (
              <Badge variant="secondary" className="text-xs">
                آخر حفظ: {new Date(data.last_saved_at).toLocaleTimeString('ar-SA')}
              </Badge>
            )}
          </div>
        </DialogTitle>
      </DialogHeader>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>الخطوة {currentStep + 1} من {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          {stepTitles.map((title, index) => (
            <span 
              key={index}
              className={`${index === currentStep ? 'text-primary font-medium' : ''}`}
            >
              {title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="py-4">
        <CurrentStepComponent />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={isAutoSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            حفظ مسودة
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            السابق
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceedToNext()}
            className="flex items-center gap-2"
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <Send className="h-4 w-4" />
                إرسال العقد
              </>
            ) : (
              <>
                التالي
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Contract Scanner Dialog */}
      <ContractScannerDialog
        open={showScanner}
        onOpenChange={setShowScanner}
        onDataExtracted={handleScanDataExtracted}
      />
    </>
  )
}

export const ContractWizard: React.FC<ContractWizardProps> = ({
  open,
  onOpenChange,
  onSubmit,
  preselectedCustomerId,
  draftIdToLoad,
  contractToEdit
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ContractWizardProvider
          onSubmit={onSubmit}
          preselectedCustomerId={preselectedCustomerId}
          draftIdToLoad={draftIdToLoad}
          contractToEdit={contractToEdit}
        >
          <ContractWizardContent />
        </ContractWizardProvider>
      </DialogContent>
    </Dialog>
  )
}