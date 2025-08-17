import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  EyeOff,
  Layers,
  FileText,
  Calculator
} from 'lucide-react';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface AccountSummaryPanelProps {
  accounts: ChartOfAccount[];
  expandedNodes: Set<string>;
  showInactiveAccounts: boolean;
  searchTerm: string;
  filterType: string;
}

export const AccountSummaryPanel: React.FC<AccountSummaryPanelProps> = ({
  accounts,
  expandedNodes,
  showInactiveAccounts,
  searchTerm,
  filterType
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  
  const stats = React.useMemo(() => {
    const activeAccounts = accounts.filter(acc => acc.is_active);
    const inactiveAccounts = accounts.filter(acc => !acc.is_active);
    const systemAccounts = accounts.filter(acc => acc.is_system);
    const headerAccounts = accounts.filter(acc => acc.is_header);
    const leafAccounts = accounts.filter(acc => !acc.is_header);
    
    const typeStats = {
      assets: accounts.filter(acc => acc.account_type === 'assets'),
      liabilities: accounts.filter(acc => acc.account_type === 'liabilities'),
      equity: accounts.filter(acc => acc.account_type === 'equity'),
      revenue: accounts.filter(acc => acc.account_type === 'revenue'),
      expenses: accounts.filter(acc => acc.account_type === 'expenses'),
    };
    
    const levelStats: Record<number, number> = {};
    accounts.forEach(acc => {
      levelStats[acc.account_level] = (levelStats[acc.account_level] || 0) + 1;
    });
    
    const totalBalance = leafAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
    const positiveBalance = leafAccounts.filter(acc => acc.current_balance > 0).length;
    const negativeBalance = leafAccounts.filter(acc => acc.current_balance < 0).length;
    const zeroBalance = leafAccounts.filter(acc => acc.current_balance === 0).length;
    
    return {
      total: accounts.length,
      active: activeAccounts.length,
      inactive: inactiveAccounts.length,
      system: systemAccounts.length,
      header: headerAccounts.length,
      leaf: leafAccounts.length,
      types: typeStats,
      levels: levelStats,
      expanded: expandedNodes.size,
      totalBalance,
      positiveBalance,
      negativeBalance,
      zeroBalance,
    };
  }, [accounts, expandedNodes, formatCurrency]);
  
  const getTypeColor = (type: string) => {
    const colors = {
      assets: 'text-blue-600 bg-blue-50',
      liabilities: 'text-red-600 bg-red-50',
      equity: 'text-purple-600 bg-purple-50',
      revenue: 'text-green-600 bg-green-50',
      expenses: 'text-orange-600 bg-orange-50',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };
  
  const getTypeLabel = (type: string) => {
    const labels = {
      assets: 'أصول',
      liabilities: 'خصوم',
      equity: 'حقوق ملكية',
      revenue: 'إيرادات',
      expenses: 'مصروفات',
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Overall Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            إحصائيات عامة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">إجمالي الحسابات</span>
              <Badge variant="secondary">{stats.total}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الحسابات النشطة</span>
              <Badge variant="default" className="bg-green-100 text-green-700">
                {stats.active}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الحسابات الرئيسية</span>
              <Badge variant="outline">{stats.header}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الحسابات النهائية</span>
              <Badge variant="outline">{stats.leaf}</Badge>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">العقد المتوسعة</span>
              <span className="font-medium">{stats.expanded} من {stats.header}</span>
            </div>
            <Progress 
              value={(stats.expanded / Math.max(stats.header, 1)) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Types Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4" />
            توزيع أنواع الحسابات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.types).map(([type, accounts]) => (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getTypeColor(type)}`}
                  >
                    {getTypeLabel(type)}
                  </Badge>
                </div>
                <span className="font-medium">{accounts.length}</span>
              </div>
              <Progress 
                value={(accounts.length / Math.max(stats.total, 1)) * 100} 
                className="h-1.5"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Balance Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calculator className="h-4 w-4" />
            إحصائيات الأرصدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">أرصدة موجبة</span>
              </div>
              <Badge variant="outline" className="text-green-600">
                {stats.positiveBalance}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-muted-foreground">أرصدة سالبة</span>
              </div>
              <Badge variant="outline" className="text-red-600">
                {stats.negativeBalance}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-muted-foreground">أرصدة صفر</span>
              </div>
              <Badge variant="outline" className="text-gray-600">
                {stats.zeroBalance}
              </Badge>
            </div>
          </div>
          
          {stats.totalBalance !== 0 && (
            <>
              <Separator />
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">إجمالي الأرصدة</div>
                <div className={`font-mono text-sm font-medium ${
                  stats.totalBalance > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(stats.totalBalance)}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Level Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            توزيع المستويات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.levels)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, count]) => (
              <div key={level} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">المستوى {level}</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-16 h-2 bg-primary/20 rounded-full overflow-hidden"
                  >
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ 
                        width: `${(count / Math.max(...Object.values(stats.levels))) * 100}%` 
                      }}
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Current Filters */}
      {(searchTerm || filterType !== 'all' || !showInactiveAccounts) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" />
              الفلاتر المطبقة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchTerm && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">بحث: {searchTerm}</Badge>
              </div>
            )}
            {filterType !== 'all' && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">نوع: {getTypeLabel(filterType)}</Badge>
              </div>
            )}
            {!showInactiveAccounts && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">إخفاء غير النشط</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};