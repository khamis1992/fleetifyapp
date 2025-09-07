import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Target, Activity, BarChart3 } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface KPIItem {
  label: string;
  value: number;
  previousValue?: number;
  type: 'currency' | 'number' | 'percentage';
  target?: number;
  icon?: React.ComponentType<any>;
}

interface ReportKPISectionProps {
  kpis: KPIItem[];
  title?: string;
}

export function ReportKPISection({ kpis, title = "مؤشرات الأداء الرئيسية" }: ReportKPISectionProps) {
  const { formatCurrency } = useCurrencyFormatter();

  const formatValue = (value: number, type: KPIItem['type']) => {
    switch (type) {
      case 'currency':
        return formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString('ar-KW');
    }
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="w-4 h-4 text-muted-foreground" />;
    
    if (current > previous) {
      return <TrendingUp className="w-4 h-4 text-success" />;
    } else if (current < previous) {
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    } else {
      return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (current: number, previous?: number) => {
    if (!previous) return 'text-muted-foreground';
    
    if (current > previous) {
      return 'text-success';
    } else if (current < previous) {
      return 'text-destructive';
    } else {
      return 'text-muted-foreground';
    }
  };

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground arabic-heading-sm">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const IconComponent = kpi.icon || Activity;
          const change = calculateChange(kpi.value, kpi.previousValue);
          const targetProgress = kpi.target ? (kpi.value / kpi.target) * 100 : null;
          
          return (
            <Card key={index} className="stat-card bg-gradient-card border-0 print:border print:shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg print:bg-primary/20">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  {getTrendIcon(kpi.value, kpi.previousValue)}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium print:text-gray-600">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground arabic-heading-sm print:text-black">
                    {formatValue(kpi.value, kpi.type)}
                  </p>
                  
                  {change !== null && (
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(kpi.value, kpi.previousValue)}`}>
                      <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
                      <span className="text-muted-foreground print:text-gray-600">عن السابق</span>
                    </div>
                  )}
                  
                  {targetProgress !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground print:text-gray-600 mb-1">
                        <span>الهدف: {formatValue(kpi.target!, kpi.type)}</span>
                        <span>{targetProgress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 print:bg-gray-200">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-500 print:bg-gray-600"
                          style={{ width: `${Math.min(targetProgress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}