import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Loader2,
  FileText 
} from 'lucide-react'
import type { DocumentSavingStep } from '@/types/contractDocumentSaving'

interface DocumentSavingProgressProps {
  steps: DocumentSavingStep[]
  isProcessing: boolean
  className?: string
}

export function DocumentSavingProgress({ 
  steps, 
  isProcessing, 
  className = '' 
}: DocumentSavingProgressProps) {
  if (steps.length === 0) {
    return null
  }

  const getStatusIcon = (status: DocumentSavingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: DocumentSavingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'processing':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getStatusText = (status: DocumentSavingStep['status']) => {
    switch (status) {
      case 'completed':
        return 'مكتمل'
      case 'failed':
        return 'فشل'
      case 'warning':
        return 'تحذير'
      case 'processing':
        return 'جاري المعالجة'
      default:
        return 'في الانتظار'
    }
  }

  const overallProgress = steps.length > 0 
    ? Math.round(steps.reduce((acc, step) => acc + step.progress, 0) / steps.length)
    : 0

  const completedSteps = steps.filter(step => 
    step.status === 'completed' || step.status === 'warning'
  ).length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          حفظ مستندات العقد
          {isProcessing && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          )}
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>التقدم العام</span>
            <span>{completedSteps}/{steps.length} مكتمل</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(step.status)}
                  <span className="font-medium text-sm">{step.title}</span>
                </div>
                <Badge variant={getStatusColor(step.status)} className="text-xs">
                  {getStatusText(step.status)}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground pr-6">
                {step.description}
              </p>
              
              {step.status === 'processing' && (
                <div className="pr-6">
                  <Progress value={step.progress} className="h-1" />
                </div>
              )}
              
              {step.error && (
                <div className="pr-6">
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {step.error}
                  </p>
                </div>
              )}
              
              {step.warnings && step.warnings.length > 0 && (
                <div className="pr-6">
                  {step.warnings.map((warning, index) => (
                    <p key={index} className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mb-1">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
              
              {(step.started_at || step.completed_at) && (
                <div className="pr-6 flex gap-4 text-xs text-muted-foreground">
                  {step.started_at && (
                    <span>بدأ: {new Date(step.started_at).toLocaleTimeString('ar-SA')}</span>
                  )}
                  {step.completed_at && (
                    <span>انتهى: {new Date(step.completed_at).toLocaleTimeString('ar-SA')}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}