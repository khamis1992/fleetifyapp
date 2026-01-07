import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Play,
  X,
  RotateCcw
} from 'lucide-react'
import { usePendingJournalEntries } from '@/hooks/usePendingJournalEntries'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

export const PendingJournalEntriesManager: React.FC = () => {
  const {
    pendingEntries,
    isLoading,
    stats,
    hasReadyEntries,
    getEntriesByStatus,
    processPendingEntries,
    isProcessing,
    cancelPendingEntry,
    isCancelling,
    retryPendingEntry,
    isRetrying
  } = usePendingJournalEntries()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            جاري تحميل القيود المعلقة...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />معلق</Badge>
      case 'processing':
        return <Badge variant="default" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" />قيد المعالجة</Badge>
      case 'completed':
        return <Badge variant="default" className="gap-1 bg-green-100 text-green-800"><CheckCircle className="h-3 w-3" />مكتمل</Badge>
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />فشل</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="gap-1"><X className="h-3 w-3" />ملغى</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ar 
      })
    } catch {
      return 'غير محدد'
    }
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات عامة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>إدارة القيود المحاسبية المعلقة</CardTitle>
              <CardDescription>
                متابعة ومعالجة القيود المحاسبية التي لم يتم إنشاؤها بنجاح
              </CardDescription>
            </div>
            <Button 
              onClick={() => processPendingEntries()}
              disabled={isProcessing || !hasReadyEntries}
              size="sm"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              معالجة القيود الجاهزة
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">إجمالي</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">معلق</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-muted-foreground">قيد المعالجة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">مكتمل</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">فشل</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">{stats.cancelled}</div>
              <div className="text-sm text-muted-foreground">ملغى</div>
            </div>
          </div>

          {hasReadyEntries && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                يوجد {getEntriesByStatus('pending').filter(e => new Date(e.next_retry_at) <= new Date()).length} قيد محاسبي جاهز للمعالجة الآن
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* قائمة القيود المعلقة */}
      {pendingEntries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>القيود المعلقة</CardTitle>
            <CardDescription>
              قائمة بجميع القيود المحاسبية المعلقة وحالاتها
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          العقد: {entry.contract?.contract_number || 'غير محدد'}
                        </span>
                        {getStatusBadge(entry.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        المبلغ: {entry.contract?.contract_amount?.toLocaleString('ar-KW')} د.ك
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryPendingEntry(entry.id)}
                          disabled={isRetrying}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          إعادة المحاولة
                        </Button>
                      )}
                      {(entry.status === 'pending' || entry.status === 'failed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelPendingEntry(entry.id)}
                          disabled={isCancelling}
                        >
                          <X className="h-4 w-4 mr-1" />
                          إلغاء
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                      <div>{formatTimeAgo(entry.created_at)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المحاولة التالية:</span>
                      <div>{formatTimeAgo(entry.next_retry_at)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">عدد المحاولات:</span>
                      <div>{entry.retry_count} / {entry.max_retries}</div>
                    </div>
                  </div>

                  {entry.last_error && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        آخر خطأ: {entry.last_error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد قيود معلقة</h3>
            <p className="text-muted-foreground">
              جميع القيود المحاسبية تم إنشاؤها بنجاح
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}