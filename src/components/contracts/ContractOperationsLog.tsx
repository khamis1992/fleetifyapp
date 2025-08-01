import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  History, 
  Plus, 
  CheckCircle, 
  Pause, 
  XCircle, 
  RefreshCw, 
  Edit,
  FileText
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

interface ContractOperationsLogProps {
  contractId: string
}

export const ContractOperationsLog: React.FC<ContractOperationsLogProps> = ({ contractId }) => {
  const { data: operations, isLoading } = useQuery({
    queryKey: ['contract-operations', contractId],
    queryFn: async () => {
      // For now, return empty array until table is in types
      return []
    },
    enabled: !!contractId
  })

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'created': return <Plus className="h-4 w-4 text-blue-600" />
      case 'activated': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'suspended': return <Pause className="h-4 w-4 text-orange-600" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />
      case 'renewed': return <RefreshCw className="h-4 w-4 text-purple-600" />
      case 'updated': return <Edit className="h-4 w-4 text-gray-600" />
      default: return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getOperationColor = (operationType: string) => {
    switch (operationType) {
      case 'created': return 'bg-blue-100 text-blue-800'
      case 'activated': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'renewed': return 'bg-purple-100 text-purple-800'
      case 'updated': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOperationLabel = (operationType: string) => {
    switch (operationType) {
      case 'created': return 'تم الإنشاء'
      case 'activated': return 'تم التفعيل'
      case 'suspended': return 'تم التعليق'
      case 'cancelled': return 'تم الإلغاء'
      case 'renewed': return 'تم التجديد'
      case 'updated': return 'تم التحديث'
      case 'status_changed': return 'تغيير الحالة'
      default: return operationType
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل العمليات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          سجل العمليات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {operations && operations.length > 0 ? (
          <div className="space-y-4">
            {operations.map((operation: any) => (
              <div key={operation.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getOperationIcon(operation.operation_type)}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getOperationColor(operation.operation_type)}>
                        {getOperationLabel(operation.operation_type)}
                      </Badge>
                      {operation.performed_at && (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(operation.performed_at), {
                            addSuffix: true,
                            locale: ar
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {operation.profiles && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {operation.profiles.first_name?.[0]}{operation.profiles.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {operation.profiles.first_name} {operation.profiles.last_name}
                      </span>
                    </div>
                  )}
                  
                  {operation.operation_details && (
                    <div className="bg-muted p-3 rounded-md">
                      <div className="space-y-1 text-sm">
                        {operation.operation_details.contract_number && (
                          <p><span className="font-medium">رقم العقد:</span> {operation.operation_details.contract_number}</p>
                        )}
                        {operation.operation_details.old_status && operation.operation_details.new_status && (
                          <p>
                            <span className="font-medium">تغيير الحالة:</span> 
                            {' '}{operation.operation_details.old_status} ← {operation.operation_details.new_status}
                          </p>
                        )}
                        {operation.operation_details.amount && (
                          <p><span className="font-medium">القيمة:</span> {operation.operation_details.amount} د.ك</p>
                        )}
                        {operation.operation_details.contract_type && (
                          <p><span className="font-medium">نوع العقد:</span> {operation.operation_details.contract_type}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {operation.notes && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">ملاحظات:</span> {operation.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد عمليات مسجلة لهذا العقد</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}