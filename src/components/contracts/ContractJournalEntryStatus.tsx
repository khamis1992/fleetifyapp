import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useEssentialAccountMappings } from '@/hooks/useEssentialAccountMappings'

interface ContractJournalEntryStatusProps {
  contractId?: string
  showAutoFix?: boolean
}

export const ContractJournalEntryStatus = ({ 
  contractId, 
  showAutoFix = true 
}: ContractJournalEntryStatusProps) => {
  const { 
    mappingStatus, 
    isLoading, 
    hasMissingMappings, 
    autoConfigureEssentialMappings, 
    isAutoConfiguring 
  } = useEssentialAccountMappings()

  if (isLoading) {
    return null
  }

  if (!hasMissingMappings) {
    return (
      <Alert className="bg-success/10 border-success">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          جميع الحسابات الأساسية مُعدة بشكل صحيح
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-destructive/10 border-destructive">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="text-destructive font-medium">
            لا يمكن إنشاء القيد المحاسبي - الحسابات التالية مفقودة:
          </div>
          
          {mappingStatus?.errors && (
            <ul className="list-disc list-inside text-sm text-muted-foreground mr-4">
              {mappingStatus.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}

          {showAutoFix && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => autoConfigureEssentialMappings()}
                disabled={isAutoConfiguring}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isAutoConfiguring ? 'جاري الإعداد...' : 'إعداد الحسابات تلقائياً'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('/finance/account-mappings', '_blank')}
              >
                إعداد يدوي
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}