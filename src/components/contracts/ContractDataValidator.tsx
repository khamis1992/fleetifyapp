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
import type { ContractCreationData } from '@/types/contracts'

interface ContractDataValidatorProps {
  data: Partial<ContractCreationData>
  onDataCorrection?: (correctedData: Partial<ContractCreationData>) => void
  onValidate?: () => void
  isValidating?: boolean
}

interface DataIssue {
  field: keyof ContractCreationData
  issue: string
  severity: 'error' | 'warning' | 'info'
  correction?: string | number
}

export const ContractDataValidator: React.FC<ContractDataValidatorProps> = ({
  data,
  onDataCorrection,
  onValidate,
  isValidating = false
}) => {
  const [issues, setIssues] = React.useState<DataIssue[]>([])
  const [autoCorrections, setAutoCorrections] = React.useState<Partial<ContractCreationData>>({})

  // Validate contract data and detect issues
  React.useEffect(() => {
    const detectedIssues: DataIssue[] = []
    const corrections: Partial<ContractCreationData> = {}

    // Check monthly_amount
    if (!data.monthly_amount || data.monthly_amount <= 0) {
      if (data.contract_amount && data.contract_amount > 0) {
        detectedIssues.push({
          field: 'monthly_amount',
          issue: 'المبلغ الشهري مفقود أو صفر',
          severity: 'warning',
          correction: data.contract_amount
        })
        corrections.monthly_amount = data.contract_amount
      }
    }

    // Check contract amount
    if (!data.contract_amount || data.contract_amount <= 0) {
      detectedIssues.push({
        field: 'contract_amount',
        issue: 'مبلغ العقد مطلوب ويجب أن يكون أكبر من صفر',
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

    // Check contract type
    if (!data.contract_type) {
      detectedIssues.push({
        field: 'contract_type',
        issue: 'نوع العقد مطلوب',
        severity: 'error'
      })
    }

    // Check dates
    if (!data.start_date) {
      detectedIssues.push({
        field: 'start_date',
        issue: 'تاريخ البداية مطلوب',
        severity: 'error'
      })
    }

    if (!data.end_date) {
      detectedIssues.push({
        field: 'end_date',
        issue: 'تاريخ النهاية مطلوب',
        severity: 'error'
      })
    }

    // Check date logic
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      
      if (endDate <= startDate) {
        detectedIssues.push({
          field: 'end_date',
          issue: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
          severity: 'error'
        })
      }

      // Calculate rental days (as informational) - auto calculated by system
      const diffTime = endDate.getTime() - startDate.getTime()
      void Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // Used for internal calculations
    }

    // Check contract number format
    if (data.contract_number && !/^[A-Z0-9-]+$/.test(data.contract_number)) {
      detectedIssues.push({
        field: 'contract_number',
        issue: 'رقم العقد يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات فقط',
        severity: 'warning'
      })
    }

    // Check description length
    if (data.description && data.description.length > 500) {
      detectedIssues.push({
        field: 'description',
        issue: 'الوصف طويل جداً (أكثر من 500 حرف)',
        severity: 'warning'
      })
    }

    setIssues(detectedIssues)
    setAutoCorrections(corrections)
  }, [data])

  const applyAutoCorrections = () => {
    if (Object.keys(autoCorrections).length > 0 && onDataCorrection) {
      console.log('[DATA_VALIDATOR] تطبيق التصحيحات التلقائية:', autoCorrections)
      onDataCorrection(autoCorrections)
    }
  }

  const getIssueIcon = (severity: DataIssue['severity']) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getSeverityVariant = (severity: DataIssue['severity']): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'error': return 'destructive'
      case 'warning': return 'secondary'
      case 'info': return 'outline'
      default: return 'default'
    }
  }

  const getFieldDisplayName = (field: keyof ContractCreationData): string => {
    const fieldNames: Record<keyof ContractCreationData, string> = {
      customer_id: 'العميل',
      vehicle_id: 'المركبة',
      contract_number: 'رقم العقد',
      contract_type: 'نوع العقد',
      contract_date: 'تاريخ العقد',
      start_date: 'تاريخ البداية',
      end_date: 'تاريخ النهاية',
      contract_amount: 'مبلغ العقد',
      monthly_amount: 'المبلغ الشهري',
      description: 'الوصف',
      terms: 'الشروط والأحكام',
      cost_center_id: 'مركز التكلفة',
      created_by: 'المنشئ'
    }
    
    return fieldNames[field] || field
  }

  if (issues.length === 0) {
    return null
  }

  const errorCount = issues.filter(issue => issue.severity === 'error').length
  const warningCount = issues.filter(issue => issue.severity === 'warning').length

  return (
    <div className="space-y-3">
      <Alert variant={errorCount > 0 ? "destructive" : "default"}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          تم اكتشاف {issues.length} مشكلة في بيانات العقد
          {errorCount > 0 && ` (${errorCount} خطأ`}
          {warningCount > 0 && `, ${warningCount} تحذير)`}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {issues.map((issue, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getIssueIcon(issue.severity)}
              <span className="text-sm">{issue.issue}</span>
              <Badge variant={getSeverityVariant(issue.severity)} className="text-xs">
                {getFieldDisplayName(issue.field)}
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
            تطبيق التصحيحات التلقائية ({Object.keys(autoCorrections).length})
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

