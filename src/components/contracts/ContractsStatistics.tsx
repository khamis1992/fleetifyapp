import React from 'react';
import { CheckCircle, Clock, XCircle, DollarSign, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

interface ContractsStatisticsProps {
  activeCount: number;
  draftCount: number;
  underReviewCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export const ContractsStatistics: React.FC<ContractsStatisticsProps> = ({
  activeCount,
  draftCount,
  underReviewCount,
  cancelledCount,
  totalRevenue
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  
  // إجبار استخدام الأرقام الإنجليزية للعملة
  const formattedRevenue = formatCurrency(totalRevenue, { 
    minimumFractionDigits: 3, 
    maximumFractionDigits: 3 
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 w-full">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">العقود النشطة</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <StatCardNumber value={activeCount} className="text-green-600" />
          <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">قيد المراجعة</CardTitle>
          <Eye className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <StatCardNumber value={underReviewCount} className="text-orange-600" />
          <p className="text-xs text-muted-foreground">تحتاج موافقة</p>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مسودات العقود</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <StatCardNumber value={draftCount} className="text-yellow-600" />
          <p className="text-xs text-muted-foreground">تحتاج إكمال</p>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">العقود الملغية</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <StatCardNumber value={cancelledCount} className="text-red-600" />
          <p className="text-xs text-muted-foreground">عقود ملغية</p>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <StatCardNumber value={formattedRevenue} className="text-blue-600" />
          <p className="text-xs text-muted-foreground">من العقود النشطة والمراجعة</p>
        </CardContent>
      </Card>
    </div>
  );
};