import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useNavigate } from 'react-router-dom'

export const DraftContractsNotification: React.FC = () => {
  const { data: stats } = useDashboardStats()
  const navigate = useNavigate()

  // Only show if there are draft contracts
  if (!stats?.draftContracts || stats.draftContracts === 0) {
    return null
  }

  const handleViewContracts = () => {
    navigate('/contracts')
  }

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-amber-800">
                مسودات العقود تحتاج مراجعة
              </h3>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {stats.draftContracts}
              </Badge>
            </div>
            
            <p className="text-sm text-amber-700 mb-3">
              لديك {stats.draftContracts} عقد في حالة مسودة. هذه العقود لن تظهر في الإحصائيات الرئيسية 
              ولن يتم احتسابها في الإيرادات حتى يتم تفعيلها.
            </p>
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleViewContracts}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                <Eye className="h-4 w-4 mr-2" />
                عرض العقود
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}