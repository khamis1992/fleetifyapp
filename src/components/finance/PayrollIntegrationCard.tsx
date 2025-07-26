import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePayrollIntegrationStatus } from '@/hooks/usePayrollFinancialAnalysis';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Link } from 'react-router-dom';

export const PayrollIntegrationCard = () => {
  const { data: integrationData, isLoading, refetch } = usePayrollIntegrationStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            تكامل الرواتب مع المحاسبة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { statusCounts, recentUnintegrated, totalCount } = integrationData || {
    statusCounts: { integrated: 0, pending: 0, error: 0 },
    recentUnintegrated: [],
    totalCount: 0
  };

  const integrationRate = totalCount > 0 ? (statusCounts.integrated / totalCount) * 100 : 0;

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                تكامل الرواتب مع المحاسبة
              </CardTitle>
              <CardDescription>
                حالة ربط الرواتب بالقيود المحاسبية
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">مدمج</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{statusCounts.integrated}</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">معلق</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">خطأ</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{statusCounts.error}</div>
            </div>
            
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">معدل التكامل</span>
              </div>
              <div className="text-2xl font-bold text-primary">{integrationRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* Integration Rate Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">تقدم التكامل</span>
              <span className="text-sm text-muted-foreground">
                {statusCounts.integrated} من {totalCount}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${integrationRate}%` }}
              />
            </div>
          </div>

          {/* Alerts for issues */}
          {statusCounts.error > 0 && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                يوجد {statusCounts.error} راتب يحتوي على أخطاء في التكامل مع النظام المحاسبي. 
                يرجى مراجعة هذه الرواتب وإعادة المعالجة.
              </AlertDescription>
            </Alert>
          )}

          {statusCounts.pending > 0 && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                يوجد {statusCounts.pending} راتب في انتظار التكامل مع النظام المحاسبي. 
                سيتم إنشاء القيود المحاسبية عند اعتماد هذه الرواتب.
              </AlertDescription>
            </Alert>
          )}

          {/* Recent Unintegrated Payrolls */}
          {recentUnintegrated.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">الرواتب التي تحتاج مراجعة</h4>
              <div className="space-y-2">
                {recentUnintegrated.map((payroll: any) => (
                  <div key={payroll.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm">
                        راتب {new Date(payroll.payroll_date).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={payroll.integration_status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {payroll.integration_status === 'error' ? 'خطأ' : 'معلق'}
                      </Badge>
                      <Link to="/hr/payroll">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          مراجعة
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Link to="/finance/reports" className="flex-1">
              <Button variant="outline" className="w-full">
                عرض تقرير الرواتب المالي
              </Button>
            </Link>
            <Link to="/hr/payroll" className="flex-1">
              <Button className="w-full">
                إدارة الرواتب
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};