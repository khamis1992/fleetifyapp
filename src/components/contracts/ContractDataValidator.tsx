import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Info 
} from 'lucide-react'

interface ContractDataValidatorProps {
  data: any
  onDataCorrection?: (correctedData: any) => void
  onValidate?: () => void
  isValidating?: boolean
}

interface DataIssue {
  field: string
  issue: string
  severity: 'error' | 'warning' | 'info'
  correction?: any
}

export const ContractDataValidator: React.FC<ContractDataValidatorProps> = ({
  data,
  onDataCorrection,
  onValidate,
  isValidating = false
}) => {
  const [issues, setIssues] = React.useState<DataIssue[]>([])
  const [autoCorrections, setAutoCorrections] = React.useState<any>({})

  // Validate contract data and detect issues
  React.useEffect(() => {
    const detectedIssues: DataIssue[] = []
    const corrections: any = {}

    // Check monthly_amount
    if (!data.monthly_amount || data.monthly_amount <= 0) {
      detectedIssues.push({
        field: 'monthly_amount',
        issue: 'المبلغ الشهري مفقود أو صفر',
        severity: 'warning',
        correction: data.contract_amount
      })
      corrections.monthly_amount = data.contract_amount
    }

    // Check contract amount
    if (!data.contract_amount || data.contract_amount <= 0) {
      detectedIssues.push({
        field: 'contract_amount',
        issue: 'مبلغ العقد مطلوب',
        severity: 'error'
      })
    }

    // Check customer
    if (!data.customer_id) {
      detectedIssues.push({
        field: 'customer_id',
        issue: 'العميل مطلوب',
        severity: 'error'
      })
    }

    // Check dates
    if (!data.start_date || !data.end_date) {
      detectedIssues.push({
        field: 'dates',
        issue: 'تواريخ العقد مطلوبة',
        severity: 'error'
      })
    }

    // Check rental days
    if (!data.rental_days || data.rental_days <= 0) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const diffTime = endDate.getTime() - startDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        detectedIssues.push({
          field: 'rental_days',
          issue: 'عدد أيام التأجير غير محسوب',
          severity: 'warning',
          correction: diffDays
        })
        corrections.rental_days = diffDays
      }
    }

    setIssues(detectedIssues)
    setAutoCorrections(corrections)
  }, [data])

  const applyAutoCorrections = () => {
    if (Object.keys(autoCorrections).length > 0 && onDataCorrection) {
      console.log('[DATA_VALIDATOR] Applying auto-corrections:', autoCorrections)
      onDataCorrection(autoCorrections)
    }
  }

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive'
      case 'warning': return 'secondary'
      case 'info': return 'outline'
      default: return 'default'
    }
  }

  if (issues.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          جميع بيانات العقد صحيحة ومكتملة
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          تم اكتشاف {issues.length} مشكلة في بيانات العقد
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {issues.map((issue, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getIssueIcon(issue.severity)}
              <span className="text-sm">{issue.issue}</span>
              <Badge variant={getSeverityVariant(issue.severity)} className="text-xs">
                {issue.field}
              </Badge>
            </div>
            {issue.correction && (
              <Badge variant="outline" className="text-xs">
                اقتراح: {issue.correction}
              </Badge>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {Object.keys(autoCorrections).length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={applyAutoCorrections}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            تطبيق التصحيحات التلقائية
          </Button>
        )}
        
        {onValidate && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onValidate}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            إعادة التحقق
          </Button>
        )}
      </div>
    </div>
  )
}