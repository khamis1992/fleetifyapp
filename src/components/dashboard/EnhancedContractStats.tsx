import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export const EnhancedContractStats: React.FC = () => {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  const contractStats = [
    {
      title: 'العقود النشطة',
      value: stats?.activeContracts || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'قيد التنفيذ'
    },
    {
      title: 'المسودات',
      value: stats?.draftContracts || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'تحتاج مراجعة'
    },
    {
      title: 'إجمالي العقود',
      value: stats?.totalContracts || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'جميع العقود'
    }
  ]

  const draftPercentage = stats?.totalContracts 
    ? Math.round((stats.draftContracts / stats.totalContracts) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          إحصائيات العقود
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {contractStats.map((stat) => (
            <div key={stat.title} className="text-center">
              <div className={`mx-auto w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center mb-2`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.description}</div>
            </div>
          ))}
        </div>
        
        {stats?.draftContracts && stats.draftContracts > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">تنبيه: مسودات العقود</span>
            </div>
            <p className="text-sm text-yellow-700">
              لديك {stats.draftContracts} عقد في حالة مسودة ({draftPercentage}% من إجمالي العقود).
              يُنصح بمراجعتها وتفعيلها لتظهر في الإحصائيات.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}