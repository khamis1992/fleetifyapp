import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Download, RefreshCw } from 'lucide-react';
import { useCustomersAgingReport, useUpdateCustomerAging } from '@/hooks/useEnhancedCustomerFinancials';
import { formatCurrency } from '@/lib/utils';

interface CustomerAgingData {
  id: string;
  customer_id: string;
  customers: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    customer_type: 'individual' | 'corporate';
    phone: string;
    email?: string;
  };
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  days_over_120: number;
  total_outstanding: number;
}

export const CustomerAgingReport: React.FC = () => {
  const { data: agingData, isLoading, refetch } = useCustomersAgingReport();
  const updateAgingMutation = useUpdateCustomerAging();

  const getCustomerName = (customer: CustomerAgingData['customers']) => {
    if (customer.customer_type === 'individual') {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.company_name || 'غير محدد';
  };

  const getRiskLevel = (agingData: CustomerAgingData) => {
    const totalOverdue = agingData.days_1_30 + agingData.days_31_60 + agingData.days_61_90 + agingData.days_91_120 + agingData.days_over_120;
    const overduePercentage = agingData.total_outstanding > 0 ? (totalOverdue / agingData.total_outstanding) * 100 : 0;
    
    if (overduePercentage >= 50 || agingData.days_over_120 > 0) return 'high';
    if (overduePercentage >= 25 || agingData.days_61_90 > 0) return 'medium';
    return 'low';
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'default';
    }
  };

  const handleExportReport = () => {
    // Implementation for exporting the report
    console.log('Exporting aging report...');
  };

  const handleRefreshAll = () => {
    refetch();
  };

  // Calculate summary totals
  const summaryTotals = agingData?.reduce(
    (acc, item) => ({
      current: acc.current + item.current_amount,
      days_1_30: acc.days_1_30 + item.days_1_30,
      days_31_60: acc.days_31_60 + item.days_31_60,
      days_61_90: acc.days_61_90 + item.days_61_90,
      days_91_120: acc.days_91_120 + item.days_91_120,
      days_over_120: acc.days_over_120 + item.days_over_120,
      total: acc.total + item.total_outstanding,
    }),
    {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_120: 0,
      days_over_120: 0,
      total: 0,
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              تقرير أعمار ذمم العملاء
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleRefreshAll} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button onClick={handleExportReport} variant="outline" size="sm">
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          {summaryTotals && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">حالي</p>
                <p className="text-lg font-semibold">{formatCurrency(summaryTotals.current)}</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-muted-foreground">1-30 يوم</p>
                <p className="text-lg font-semibold">{formatCurrency(summaryTotals.days_1_30)}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-muted-foreground">31-60 يوم</p>
                <p className="text-lg font-semibold">{formatCurrency(summaryTotals.days_31_60)}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground">61-90 يوم</p>
                <p className="text-lg font-semibold">{formatCurrency(summaryTotals.days_61_90)}</p>
              </div>
              <div className="text-center p-3 bg-red-100 rounded-lg">
                <p className="text-sm text-muted-foreground">91-120 يوم</p>
                <p className="text-lg font-semibold">{formatCurrency(summaryTotals.days_91_120)}</p>
              </div>
              <div className="text-center p-3 bg-red-200 rounded-lg">
                <p className="text-sm text-muted-foreground">+120 يوم</p>
                <p className="text-lg font-semibold">{formatCurrency(summaryTotals.days_over_120)}</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">الإجمالي</p>
                <p className="text-lg font-bold">{formatCurrency(summaryTotals.total)}</p>
              </div>
            </div>
          )}

          {/* Data Table */}
          {agingData && agingData.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم العميل</TableHead>
                    <TableHead>حالي</TableHead>
                    <TableHead>1-30 يوم</TableHead>
                    <TableHead>31-60 يوم</TableHead>
                    <TableHead>61-90 يوم</TableHead>
                    <TableHead>91-120 يوم</TableHead>
                    <TableHead>أكثر من 120 يوم</TableHead>
                    <TableHead>الإجمالي المستحق</TableHead>
                    <TableHead>مستوى المخاطر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.map((item) => {
                    const riskLevel = getRiskLevel(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getCustomerName(item.customers)}</p>
                            <p className="text-xs text-muted-foreground">{item.customers.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(item.current_amount)}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${item.days_1_30 > 0 ? 'text-yellow-600' : ''}`}>
                            {formatCurrency(item.days_1_30)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${item.days_31_60 > 0 ? 'text-orange-600' : ''}`}>
                            {formatCurrency(item.days_31_60)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${item.days_61_90 > 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(item.days_61_90)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${item.days_91_120 > 0 ? 'text-red-700' : ''}`}>
                            {formatCurrency(item.days_91_120)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${item.days_over_120 > 0 ? 'text-red-800' : ''}`}>
                            {formatCurrency(item.days_over_120)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">{formatCurrency(item.total_outstanding)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeVariant(riskLevel)}>
                            {riskLevel === 'low' ? 'منخفض' : riskLevel === 'medium' ? 'متوسط' : 'عالي'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد بيانات أعمار ذمم متاحة</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};