import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Zap, 
  Loader2,
  ExternalLink 
} from 'lucide-react'
import { useEssentialAccountMappings } from '@/hooks/useEssentialAccountMappings'
import { useNavigate } from 'react-router-dom'

export const EssentialAccountMappingsManager: React.FC = () => {
  const navigate = useNavigate()
  const {
    mappingStatus,
    isLoading,
    hasMissingMappings,
    hasExistingMappings,
    autoConfigureEssentialMappings,
    isAutoConfiguring
  } = useEssentialAccountMappings()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>جاري التحقق من ربط الحسابات...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          إدارة ربط الحسابات الأساسية
        </CardTitle>
        <CardDescription>
          تأكد من وجود ربط الحسابات الأساسية المطلوبة لإنشاء العقود والقيود المحاسبية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hasExistingMappings && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">حسابات مربوطة</p>
                <p className="text-sm text-green-700">
                  {mappingStatus?.existing?.length || 0} حساب
                </p>
              </div>
            </div>
          )}
          
          {hasMissingMappings && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">حسابات مفقودة</p>
                <p className="text-sm text-orange-700">
                  {mappingStatus?.errors?.length || 0} حساب
                </p>
              </div>
            </div>
          )}
          
          {mappingStatus?.created && mappingStatus.created.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">قابل للإعداد التلقائي</p>
                <p className="text-sm text-blue-700">
                  {mappingStatus.created.length} حساب
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Existing Mappings */}
        {hasExistingMappings && (
          <div>
            <h4 className="font-medium mb-2">الحسابات المربوطة حالياً:</h4>
            <div className="flex flex-wrap gap-2">
              {mappingStatus?.existing?.map((accountType) => (
                <Badge key={accountType} variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {getAccountTypeLabel(accountType)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Missing Mappings */}
        {hasMissingMappings && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">الحسابات التالية تحتاج إعداد:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {mappingStatus?.errors?.map((error) => (
                  <Badge key={error} variant="destructive">
                    {error}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                بدون هذه الحسابات، قد تفشل عملية إنشاء العقود والقيود المحاسبية.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          {hasMissingMappings && (
            <Button 
              onClick={() => autoConfigureEssentialMappings()}
              disabled={isAutoConfiguring}
              className="flex-1"
            >
              {isAutoConfiguring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الإعداد التلقائي...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  إعداد تلقائي للحسابات
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/finance/account-mappings')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            إدارة ربط الحسابات يدوياً
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
          <p className="font-medium mb-1">ملاحظة:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>الإعداد التلقائي يبحث عن الحسابات المناسبة في دليل الحسابات الحالي</li>
            <li>إذا لم توجد حسابات مناسبة، ستحتاج لإنشائها أو ربطها يدوياً</li>
            <li>يمكن تعديل الربط في أي وقت من صفحة إدارة ربط الحسابات</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to get Arabic labels for account types
function getAccountTypeLabel(accountType: string): string {
  const labels: Record<string, string> = {
    'RECEIVABLES': 'حسابات القبض',
    'SALES_REVENUE': 'إيرادات المبيعات',
    'RENTAL_REVENUE': 'إيرادات الإيجار',
    'CASH': 'النقد وما في حكمه'
  }
  return labels[accountType] || accountType
}
