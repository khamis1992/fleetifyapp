import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Layers, 
  FileText, 
  Users, 
  TrendingUp,
  Archive,
  Activity
} from 'lucide-react';
import { useChartStatistics } from '@/hooks/useChartValidation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const ChartStatisticsPanel: React.FC = () => {
  const { data: stats, isLoading } = useChartStatistics();

  const getAccountTypeLabel = (type: string) => {
    const types = {
      assets: 'الأصول',
      liabilities: 'الخصوم',
      equity: 'حقوق الملكية',
      revenue: 'الإيرادات',
      expenses: 'المصروفات'
    };
    return types[type as keyof typeof types] || type;
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      assets: 'bg-blue-500',
      liabilities: 'bg-red-500',
      equity: 'bg-purple-500',
      revenue: 'bg-green-500',
      expenses: 'bg-orange-500'
    };
    return colors[type as keyof typeof colors] || 'bg-slate-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            إحصائيات دليل الحسابات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          إحصائيات دليل الحسابات
        </CardTitle>
        <CardDescription>
          تحليل شامل لبنية ومحتوى دليل الحسابات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              إجمالي الحسابات
            </div>
            <div className="text-2xl font-bold">{stats.total_accounts}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              الحسابات النشطة
            </div>
            <div className="text-2xl font-bold text-success">{stats.active_accounts}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Archive className="h-4 w-4" />
              الحسابات غير النشطة
            </div>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive_accounts}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              أعمق مستوى
            </div>
            <div className="text-2xl font-bold">{stats.max_depth}</div>
          </div>
        </div>

        {/* Account Types Distribution */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            توزيع الحسابات حسب النوع
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.accounts_by_type).map(([type, count]) => {
              const percentage = Math.round((count / stats.active_accounts) * 100);
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getAccountTypeColor(type)}`} />
                      <span className="text-sm font-medium">
                        {getAccountTypeLabel(type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{count}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Account Levels Distribution */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" />
            توزيع الحسابات حسب المستوى
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(stats.accounts_by_level)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([level, count]) => (
                <div key={level} className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">
                    المستوى {level}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Header vs Detail Accounts */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            نوع الحسابات
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.header_accounts}</div>
              <div className="text-sm text-muted-foreground">حسابات إجمالية</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.detail_accounts}</div>
              <div className="text-sm text-muted-foreground">حسابات تفصيلية</div>
            </div>
          </div>
        </div>

        {/* Average Depth */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">متوسط عمق الحسابات</span>
            <Badge variant="secondary">{stats.avg_depth}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};