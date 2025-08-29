import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Save, ChevronLeft, ChevronRight, Send, Clock, TestTube, FileText, CheckCircle, Brain, Sparkles } from 'lucide-react'
import { ContractWizardProvider, useContractWizard } from './ContractWizardProvider'
import { 
  BasicInfoStep, 
  CustomerVehicleStep, 
  DatesStep, 
  FinancialStep, 
  ReviewStep 
} from './ContractWizardSteps'
import { LateFinesStep } from './LateFinesStep'
import { AIContractAssistant } from './AIContractAssistant'

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
}

const ContractWizardContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('wizard');
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
    fillTestData
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

  return (
    <>
      <DialogHeader className="space-y-4">
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>انشاء عقد جديد</span>
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

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wizard" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            معالج العقد
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            المساعد الذكي
            <Sparkles className="w-3 h-3" />
          </TabsTrigger>
        </TabsList>

        {/* محتوى معالج العقد */}
        <TabsContent value="wizard" className="space-y-4">
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
        </TabsContent>

        {/* محتوى المساعد الذكي */}
        <TabsContent value="ai-assistant" className="space-y-4">
          <AIContractAssistant
            contractData={data}
            customerData={data.customer}
            vehicleData={data.vehicle}
            onContractGenerated={(contract) => {
              console.log('Generated contract:', contract);
              // يمكن دمج العقد المُنشأ في البيانات
            }}
            onSuggestionApplied={(suggestion) => {
              console.log('Applied suggestion:', suggestion);
              // يمكن تطبيق الاقتراح على بيانات العقد
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}

export const ContractWizard: React.FC<ContractWizardProps> = ({
  open,
  onOpenChange,
  onSubmit,
  preselectedCustomerId
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ContractWizardProvider
          onSubmit={onSubmit}
          preselectedCustomerId={preselectedCustomerId}
        >
          <ContractWizardContent />
        </ContractWizardProvider>
      </DialogContent>
    </Dialog>
  )
}