import React from 'react';
import { CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ContractsStatisticsProps {
  activeCount: number;
  draftCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export const ContractsStatistics: React.FC<ContractsStatisticsProps> = ({
  activeCount,
  draftCount,
  cancelledCount,
  totalRevenue
}) => {
  const { formatCurrency } = useCurrencyFormatter();
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">العقود النشطة</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مسودات العقود</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
          <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">العقود الملغية</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{cancelledCount}</div>
          <p className="text-xs text-muted-foreground">عقود ملغية</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
          <p className="text-xs text-muted-foreground">من العقود النشطة</p>
        </CardContent>
      </Card>
    </div>
  );
};