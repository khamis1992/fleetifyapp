import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useEnhancedContractDocuments, DocumentOperationLog } from '@/hooks/useEnhancedContractDocuments'
import { supabase } from '@/integrations/supabase/client'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Trash2,
  Activity,
  FileX,
  Database
} from 'lucide-react'
import { toast } from 'sonner'
import { StatCardNumber } from '@/components/ui/NumberDisplay'

interface DocumentOperationMonitorProps {
  contractId?: string
  showCleanupActions?: boolean
  className?: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'default'
    case 'failed': return 'destructive' 
    case 'started':
    case 'processing': return 'secondary'
    default: return 'outline'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />
    case 'started':
    case 'processing': return <Clock className="h-4 w-4 text-yellow-600" />
    default: return <Activity className="h-4 w-4" />
  }
}

export function DocumentOperationMonitor({ 
  contractId, 
  showCleanupActions = false,
  className 
}: DocumentOperationMonitorProps) {
  const [logs, setLogs] = useState<DocumentOperationLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cleanupStats, setCleanupStats] = useState<any>(null)
  
  const { 
    getOperationLogs, 
    retryOperation, 
    isRetrying,
    cleanupOrphanedFiles,
    isCleaningUp 
  } = useEnhancedContractDocuments()

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const operationLogs = await getOperationLogs(contractId, 50)
      setLogs(operationLogs)
    } catch (error) {
      console.error('Failed to load operation logs:', error)
      toast.error('فشل في تحميل سجل العمليات')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async (logId: string) => {
    try {
      await retryOperation(logId)
      toast.success('تم إعادة تشغيل العملية بنجاح')
      loadLogs() // Refresh logs
    } catch (error) {
      toast.error('فشل في إعادة تشغيل العملية')
    }
  }

  const handleCleanup = async () => {
    try {
      // Call the edge function for cleanup
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-files')
      
      if (error) throw error
      
      setCleanupStats(data.summary)
      toast.success(`تم التنظيف بنجاح - حُذف ${data.summary.filesDeleted} ملف و ${data.summary.recordsDeleted} سجل`)
      loadLogs() // Refresh logs
    } catch (error) {
      console.error('Cleanup failed:', error)
      toast.error('فشل في عملية التنظيف')
    }
  }

  useEffect(() => {
    loadLogs()

    // Set up real-time subscription for new logs
    const subscription = supabase
      .channel('operation-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_document_operation_log',
          filter: contractId ? `contract_id=eq.${contractId}` : undefined
        },
        () => {
          loadLogs() // Refresh when changes occur
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [contractId])

  const failedOperations = logs.filter(log => log.operation_status === 'failed')
  const recentOperations = logs.slice(0, 10)

  return (
    <div className={className}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              العمليات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatCardNumber value={logs.length} />
            <p className="text-xs text-muted-foreground">
              آخر 50 عملية
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              العمليات الفاشلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatCardNumber value={failedOperations.length} className="text-red-600" />
            <p className="text-xs text-muted-foreground">
              تحتاج إلى إعادة معالجة
            </p>
          </CardContent>
        </Card>

        {cleanupStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-green-600" />
                آخر تنظيف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                <StatCardNumber 
                  value={cleanupStats.filesDeleted + cleanupStats.recordsDeleted} 
                  className="inline" 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                عنصر محذوف
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cleanup Actions */}
      {showCleanupActions && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              أدوات الصيانة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleCleanup}
                disabled={isCleaningUp}
                className="flex items-center gap-2"
              >
                {isCleaningUp ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                تنظيف الملفات المهجورة
              </Button>
              
              <Button 
                variant="outline"
                onClick={loadLogs}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث السجل
              </Button>
            </div>
            
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                عملية التنظيف تحذف الملفات والسجلات المهجورة التي تزيد أعمارها عن 24 ساعة. 
                هذه العملية لا يمكن التراجع عنها.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Failed Operations Alert */}
      {failedOperations.length > 0 && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            يوجد {failedOperations.length} عملية فاشلة تحتاج إلى إعادة معالجة.
            يمكنك إعادة تشغيلها من القائمة أدناه.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            سجل العمليات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentOperations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
              لا توجد عمليات لعرضها
            </div>
          ) : (
            <div className="space-y-4">
              {recentOperations.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.operation_status)}
                      <span className="font-medium">{log.operation_type}</span>
                      <Badge variant={getStatusColor(log.operation_status)}>
                        {log.operation_status}
                      </Badge>
                    </div>
                    
                    {log.operation_status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(log.id)}
                        disabled={isRetrying}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        إعادة المحاولة
                      </Button>
                    )}
                  </div>

                  {log.error_message && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {log.error_message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="text-sm text-muted-foreground">
                    <div>تاريخ البدء: {new Date(log.created_at).toLocaleString('en-US')}</div>
                    {log.completed_at && (
                      <div>تاريخ الإنتهاء: {new Date(log.completed_at).toLocaleString('en-US')}</div>
                    )}
                    {log.retry_count > 0 && (
                      <div>عدد المحاولات: {log.retry_count}</div>
                    )}
                  </div>

                  {log.file_path && (
                    <div className="text-sm text-blue-600">
                      ملف: {log.file_path}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}