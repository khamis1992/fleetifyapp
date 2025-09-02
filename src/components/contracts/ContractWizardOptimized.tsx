import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useContractCreationOptimized } from '@/hooks/useContractCreationOptimized'

interface ContractWizardOptimizedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (contractData: any) => void
  preselectedCustomerId?: string
}

const ContractWizardOptimized: React.FC<ContractWizardOptimizedProps> = ({
  open,
  onOpenChange,
  onSubmit,
  preselectedCustomerId
}) => {
  const { creationState, createContract, isCreating, reset } = useContractCreationOptimized()
  const [contractData, setContractData] = useState<any>(null)

  const handleSubmit = async (data: any) => {
    setContractData(data)
    try {
      const result = await createContract(data)
      console.log('✅ Contract created successfully:', result)
      onSubmit?.(result)
      
      // إغلاق النافذة بعد ثانية واحدة لتحسين السرعة
      setTimeout(() => {
        onOpenChange(false)
        reset()
      }, 1000)
    } catch (error) {
      console.error('❌ Contract creation failed:', error)
    }
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const completedSteps = creationState.steps.filter(step => step.status === 'completed').length
  const totalSteps = creationState.steps.length
  const progressPercentage = (completedSteps / totalSteps) * 100

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isCreating) {
        onOpenChange(newOpen)
        if (!newOpen) reset()
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            معالج إنشاء العقد المحسن
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* شريط التقدم */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>التقدم الإجمالي</span>
              <span>{completedSteps} / {totalSteps}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* عرض الخطوات */}
          <div className="space-y-3">
            {creationState.steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  step.status === 'processing'
                    ? 'border-blue-500 bg-blue-50'
                    : step.status === 'completed'
                    ? 'border-green-500 bg-green-50'
                    : step.status === 'failed'
                    ? 'border-red-500 bg-red-50'
                    : step.status === 'warning'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div>
                      <h3 className="font-medium">{step.title}</h3>
                      {step.error && (
                        <p className="text-sm text-red-600 mt-1">{step.error}</p>
                      )}
                      {step.warnings && step.warnings.length > 0 && (
                        <div className="text-sm text-yellow-600 mt-1">
                          {step.warnings.map((warning, idx) => (
                            <p key={idx}>{warning}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {step.executionTime && (
                    <span className="text-xs text-gray-500">
                      {step.executionTime}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* معلومات الأداء */}
          {creationState.totalExecutionTime && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">إحصائيات الأداء</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">الوقت الإجمالي:</span>
                  <span className="font-medium ml-2">{creationState.totalExecutionTime}ms</span>
                </div>
                <div>
                  <span className="text-blue-600">الحالة:</span>
                  <span className="font-medium ml-2 capitalize">{creationState.healthStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {!isCreating && (
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                إغلاق
              </Button>
            )}
            
            {creationState.canRetry && (
              <Button 
                variant="default"
                onClick={() => contractData && handleSubmit(contractData)}
                disabled={isCreating}
              >
                إعادة المحاولة
              </Button>
            )}
          </div>

          {/* نموذج إنشاء العقد المبسط */}
          {!isCreating && !creationState.contractId && (
            <div className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">نموذج اختبار سريع</h4>
              <Button 
                onClick={() => {
                  const testData = {
                    customer_id: preselectedCustomerId || '12345',
                    contract_type: 'rental',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    contract_amount: 1000,
                    monthly_amount: 1000,
                    description: 'عقد تجريبي للاختبار',
                    terms: 'شروط وأحكام العقد'
                  }
                  handleSubmit(testData)
                }}
                className="w-full"
              >
                اختبار إنشاء عقد سريع
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ContractWizardOptimized