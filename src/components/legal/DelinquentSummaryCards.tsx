import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { useDelinquencyStats } from '@/hooks/useDelinquencyStats';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';

export const DelinquentSummaryCards: React.FC = () => {
  const { data: stats, isLoading, error } = useDelinquencyStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 flex items-center justify-center h-32">
              <LoadingSpinner size="sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p>حدث خطأ أثناء تحميل الإحصائيات</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Total Delinquent Customers */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            إجمالي العملاء المتأخرين
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.totalDelinquent}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.criticalRisk + stats.highRisk} عميل عالي المخاطر
          </p>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-red-600">🔴 {stats.criticalRisk + stats.highRisk}</span>
            <span className="text-orange-600">🟠 {stats.mediumRisk}</span>
            <span className="text-yellow-600">🟡 {stats.lowRisk}</span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Total Amount at Risk */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            المبالغ المعرضة للخطر
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(stats.totalAmountAtRisk)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إيجارات متأخرة
          </p>
          <p className="text-xs text-orange-600 mt-1">
            + {formatCurrency(stats.totalViolations)} مخالفات
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Total Penalties */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            الغرامات المتراكمة
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(stats.totalPenalties)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            غرامات تأخير (0.1% يومياً)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            متوسط {Math.round(stats.averageDaysOverdue)} يوم تأخير
          </p>
        </CardContent>
      </Card>

      {/* Card 4: High Risk Customers */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            عملاء خطر حرج
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {stats.criticalRisk + stats.highRisk}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            يحتاجون إجراء فوري
          </p>
          <div className="flex gap-2 mt-2 text-xs">
            <span>🔴 {stats.needBlacklist} قائمة سوداء</span>
            <span>⚖️ {stats.needLegalCase} قضية</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DelinquentSummaryCards;
