import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Building, 
  TrendingUp, 
  PieChart, 
  DollarSign, 
  Calculator, 
  BarChart3,
  Users,
  Database,
  Activity,
  Target,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

interface AccountStatisticsProps {
  accounts: ChartOfAccount[];
}

export const AccountStatistics: React.FC<AccountStatisticsProps> = ({ accounts }) => {
  const stats = React.useMemo(() => {
    const byType = accounts.reduce((acc, account) => {
      if (!acc[account.account_type]) {
        acc[account.account_type] = { count: 0, balance: 0 };
      }
      acc[account.account_type].count++;
      acc[account.account_type].balance += account.current_balance || 0;
      return acc;
    }, {} as Record<string, { count: number; balance: number }>);

    const byLevel = accounts.reduce((acc, account) => {
      const level = account.account_level || 1;
      if (!acc[level]) {
        acc[level] = { count: 0, balance: 0 };
      }
      acc[level].count++;
      acc[level].balance += account.current_balance || 0;
      return acc;
    }, {} as Record<number, { count: number; balance: number }>);

    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(acc => acc.is_active).length;
    const headerAccounts = accounts.filter(acc => acc.is_header).length;
    const entryAccounts = accounts.filter(acc => !acc.is_header && (acc.account_level || 1) >= 5).length;

    return {
      byType,
      byLevel,
      totalAccounts,
      activeAccounts,
      headerAccounts,
      entryAccounts,
    };
  }, [accounts]);

  const typeColors = {
    'Assets': 'hsl(var(--primary))',
    'الأصول': 'hsl(var(--primary))',
    'Liabilities': 'hsl(var(--destructive))',
    'الخصوم': 'hsl(var(--destructive))',
    'Equity': 'hsl(var(--secondary))',
    'حقوق الملكية': 'hsl(var(--secondary))',
    'Revenue': 'hsl(var(--success))',
    'الإيرادات': 'hsl(var(--success))',
    'Expenses': 'hsl(var(--warning))',
    'المصروفات': 'hsl(var(--warning))',
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.totalAccounts}</p>
                <p className="text-xs text-muted-foreground">Total Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.activeAccounts}</p>
                <p className="text-xs text-muted-foreground">Active Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <PieChart className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.headerAccounts}</p>
                <p className="text-xs text-muted-foreground">Header Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.entryAccounts}</p>
                <p className="text-xs text-muted-foreground">Entry Allowed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Distribution by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Distribution by Account Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byType).map(([type, data]) => {
              const percentage = (data.count / stats.totalAccounts) * 100;
              const color = typeColors[type as keyof typeof typeColors] || 'hsl(var(--muted-foreground))';
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">{type}</span>
                      <Badge variant="outline" className="text-xs">
                        {data.count} accounts
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{percentage.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(data.balance)}
                      </div>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Account Distribution by Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribution by Account Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byLevel)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([level, data]) => {
                const percentage = (data.count / stats.totalAccounts) * 100;
                const levelNum = parseInt(level);
                const isEntryLevel = levelNum >= 5;
                
                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={isEntryLevel ? "default" : "secondary"}
                          className="w-16 justify-center"
                        >
                          Level {level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {isEntryLevel ? "Entry Allowed" : "Aggregate Only"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {data.count} accounts ({percentage.toFixed(1)}%)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(data.balance)}
                        </div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};