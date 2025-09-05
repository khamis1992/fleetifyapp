import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Scale, DollarSign, AlertTriangle } from 'lucide-react';

interface LegalCaseDashboardProps {
  stats?: {
    total: number;
    active: number;
    closed: number;
    highPriority: number;
    totalValue: number;
    pendingBilling: number;
    overduePayments: number;
    byType: {
      civil: number;
      criminal: number;
      commercial: number;
      labor: number;
      administrative: number;
    };
  };
}

export const LegalCaseDashboard: React.FC<LegalCaseDashboardProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القضايا</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القضايا النشطة</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عالية الأولوية</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القيمة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalValue.toLocaleString()} د.ك</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>حسب النوع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>مدنية</span>
              <span className="font-semibold">{stats.byType.civil}</span>
            </div>
            <div className="flex justify-between">
              <span>تجارية</span>
              <span className="font-semibold">{stats.byType.commercial}</span>
            </div>
            <div className="flex justify-between">
              <span>عمالية</span>
              <span className="font-semibold">{stats.byType.labor}</span>
            </div>
            <div className="flex justify-between">
              <span>إدارية</span>
              <span className="font-semibold">{stats.byType.administrative}</span>
            </div>
            <div className="flex justify-between">
              <span>جنائية</span>
              <span className="font-semibold">{stats.byType.criminal}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الحالة المالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>فوترة معلقة</span>
              <span className="font-semibold text-yellow-600">{stats.pendingBilling}</span>
            </div>
            <div className="flex justify-between">
              <span>مدفوعات متأخرة</span>
              <span className="font-semibold text-red-600">{stats.overduePayments}</span>
            </div>
            <div className="flex justify-between">
              <span>قضايا مغلقة</span>
              <span className="font-semibold text-gray-600">{stats.closed}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};