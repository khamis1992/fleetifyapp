import { Check, X, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractCreationState, ContractCreationStep } from '@/hooks/useContractCreation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ContractCreationErrorHandler } from './ContractCreationErrorHandler'
import { useNavigate } from 'react-router-dom'

interface ContractCreationProgressProps {
  creationState: ContractCreationState
  onRetry?: () => void
  onClose?: () => void
}

export const ContractCreationProgress = ({ 
  creationState, 
  onRetry, 
  onClose 
}: ContractCreationProgressProps) => {
  const navigate = useNavigate()
  const { steps, isProcessing, canRetry } = creationState
  
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const failedSteps = steps.filter(step => step.status === 'failed').length
  const progress = (completedSteps / steps.length) * 100
  
  // Get the first error from failed steps for detailed error handling
  const firstError = steps.find(step => step.status === 'failed')?.error
  const errorObject = firstError ? { message: firstError } : null
  
  const handleNavigateToAccounts = () => {
    navigate('/finance/account-mappings')
    onClose?.()
  }
  
  const getStepIcon = (step: ContractCreationStep) => {
    switch (step.status) {
      case 'completed':
        return <Check className="h-4 w-4 text-success" />
      case 'failed':
        return <X className="h-4 w-4 text-destructive" />
      case 'processing':
        return <Clock className="h-4 w-4 text-warning animate-spin" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />
    }
  }

  const getStepColor = (step: ContractCreationStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-success'
      case 'failed':
        return 'text-destructive'
      case 'processing':
        return 'text-warning'
      default:
        return 'text-muted-foreground'
    }
  }

  const isComplete = completedSteps === steps.length
  const hasFailed = failedSteps > 0

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isComplete ? (
            <Check className="h-5 w-5 text-success" />
          ) : hasFailed ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <Clock className="h-5 w-5 text-warning" />
          )}
          {isComplete ? 'تم إنشاء العقد بنجاح' : hasFailed ? 'حدث خطأ أثناء الإنشاء' : 'جاري إنشاء العقد...'}
        </CardTitle>
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-muted-foreground">
          {completedSteps} من {steps.length} خطوات مكتملة
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              step.status === 'processing' && "bg-warning/10",
              step.status === 'failed' && "bg-destructive/10",
              step.status === 'completed' && "bg-success/10"
            )}
          >
            <div className="flex-shrink-0">
              {getStepIcon(step)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", getStepColor(step))}>
                {step.title}
              </p>
              {step.error && (
                <p className="text-xs text-destructive mt-1 truncate" title={step.error}>
                  {step.error}
                </p>
              )}
              {step.retryCount && step.retryCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  المحاولة: {step.retryCount}
                </p>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {index + 1}
            </div>
          </div>
        ))}
        
        <div className="flex gap-2 pt-4">
          {canRetry && onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              إعادة المحاولة
            </Button>
          )}
          
          {(isComplete || hasFailed) && onClose && (
            <Button 
              onClick={onClose} 
              variant={isComplete ? "default" : "outline"}
              size="sm"
              className="flex-1"
            >
              {isComplete ? 'إغلاق' : 'إلغاء'}
            </Button>
          )}
        </div>
        
        {/* Enhanced Error Handling */}
        {hasFailed && !isProcessing && errorObject && (
          <div className="mt-4">
            <ContractCreationErrorHandler 
              error={errorObject}
              onRetry={canRetry ? onRetry : undefined}
              onNavigateToAccounts={handleNavigateToAccounts}
              isRetrying={isProcessing}
            />
          </div>
        )}
        
        {hasFailed && !isProcessing && !errorObject && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-2">
              نصائح لحل المشكلة:
            </p>
            <ul className="text-xs text-destructive space-y-1">
              <li>• تأكد من صحة بيانات العميل والمركبة</li>
              <li>• تحقق من ربط الحسابات المحاسبية</li>
              <li>• جرب تغيير رقم العقد إذا كان مكرراً</li>
              <li>• تواصل مع الدعم الفني إذا استمرت المشكلة</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}