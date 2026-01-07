import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Settings, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ContractCreationErrorHandlerProps {
  error: any
  onRetry?: () => void
  onNavigateToAccounts?: () => void
  isRetrying?: boolean
}

export const ContractCreationErrorHandler: React.FC<ContractCreationErrorHandlerProps> = ({
  error,
  onRetry,
  onNavigateToAccounts,
  isRetrying = false
}) => {
  const getErrorType = () => {
    if (!error?.message) return 'unknown'
    
    const message = error.message.toLowerCase()
    
    if (message.includes('account') || message.includes('mapping') || 
        message.includes('receivable') || message.includes('revenue') ||
        message.includes('حساب') || message.includes('ربط')) {
      return 'accounting'
    }
    
    if (message.includes('network') || message.includes('connection') || 
        message.includes('timeout')) {
      return 'network'
    }
    
    if (message.includes('validation') || message.includes('required') ||
        message.includes('مطلوب') || message.includes('تحقق')) {
      return 'validation'
    }
    
    if (message.includes('permission') || message.includes('صلاحية')) {
      return 'permission'
    }
    
    return 'unknown'
  }

  const errorType = getErrorType()

  const getErrorInfo = () => {
    switch (errorType) {
      case 'accounting':
        return {
          title: 'خطأ في الإعدادات المحاسبية',
          description: 'يبدو أن ربط الحسابات المحاسبية غير مكتمل أو مفقود',
          icon: <Settings className="h-5 w-5 text-orange-500" />,
          color: 'border-orange-200 bg-orange-50',
          solutions: [
            'تحقق من ربط الحسابات في قسم المحاسبة',
            'تأكد من وجود حساب الإيرادات وحساب الذمم المدينة',
            'يمكن للنظام إنشاء الحسابات الأساسية تلقائياً'
          ]
        }
      case 'network':
        return {
          title: 'خطأ في الشبكة',
          description: 'حدث خطأ في الاتصال بالخادم',
          icon: <RefreshCw className="h-5 w-5 text-blue-500" />,
          color: 'border-blue-200 bg-blue-50',
          solutions: [
            'تحقق من اتصال الإنترنت',
            'أعد المحاولة بعد قليل',
            'تواصل مع الدعم الفني إذا استمر الخطأ'
          ]
        }
      case 'validation':
        return {
          title: 'خطأ في البيانات',
          description: 'بعض البيانات المطلوبة مفقودة أو غير صحيحة',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          color: 'border-yellow-200 bg-yellow-50',
          solutions: [
            'تحقق من ملء جميع الحقول المطلوبة',
            'تأكد من صحة البيانات المدخلة',
            'راجع تفاصيل العميل والمركبة'
          ]
        }
      case 'permission':
        return {
          title: 'خطأ في الصلاحيات',
          description: 'ليس لديك صلاحية لإجراء هذه العملية',
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          color: 'border-red-200 bg-red-50',
          solutions: [
            'تواصل مع مدير النظام',
            'تحقق من صلاحياتك في النظام',
            'قد تحتاج إلى تسجيل دخول جديد'
          ]
        }
      default:
        return {
          title: 'خطأ في إنشاء العقد',
          description: 'حدث خطأ غير متوقع أثناء إنشاء العقد',
          icon: <HelpCircle className="h-5 w-5 text-slate-500" />,
          color: 'border-slate-200 bg-slate-50',
          solutions: [
            'أعد المحاولة',
            'تحقق من البيانات المدخلة',
            'تواصل مع الدعم الفني'
          ]
        }
    }
  }

  const errorInfo = getErrorInfo()

  const handleCopyError = () => {
    const errorText = `Error Type: ${errorType}\nMessage: ${error?.message || 'Unknown error'}\nTimestamp: ${new Date().toISOString()}`
    navigator.clipboard.writeText(errorText)
    toast.success('تم نسخ تفاصيل الخطأ')
  }

  return (
    <Card className={`${errorInfo.color} border-l-4`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {errorInfo.icon}
          {errorInfo.title}
        </CardTitle>
        <CardDescription className="text-sm">
          {errorInfo.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        <Alert className="bg-white/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm font-mono break-words">
            {error?.message || 'خطأ غير محدد'}
          </AlertDescription>
        </Alert>

        {/* Solutions */}
        <div>
          <h4 className="font-medium mb-2">الحلول المقترحة:</h4>
          <ul className="space-y-1 text-sm">
            {errorInfo.solutions.map((solution, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1 h-1 bg-slate-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>{solution}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              size="sm"
              variant="default"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  جاري المحاولة...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  إعادة المحاولة
                </>
              )}
            </Button>
          )}

          {errorType === 'accounting' && onNavigateToAccounts && (
            <Button
              onClick={onNavigateToAccounts}
              size="sm"
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              إعدادات الحسابات
            </Button>
          )}

          <Button
            onClick={handleCopyError}
            size="sm"
            variant="ghost"
          >
            نسخ تفاصيل الخطأ
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}