import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Lightbulb,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  impact: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SmartInsightsPanelProps {
  insights?: Insight[];
  loading?: boolean;
}

const SmartInsightsPanel: React.FC<SmartInsightsPanelProps> = ({ 
  insights = [], 
  loading = false 
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return TrendingUp;
      case 'warning': return AlertTriangle;
      case 'trend': return Target;
      case 'recommendation': return Lightbulb;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-success/10 text-success border-success/20';
      case 'warning': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'trend': return 'bg-primary/10 text-primary border-primary/20';
      case 'recommendation': return 'bg-accent/10 text-accent-foreground border-accent/20';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">عالية</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">متوسطة</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">منخفضة</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-glass backdrop-blur-sm border-0 shadow-glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded animate-pulse" />
            <div className="w-32 h-5 bg-muted rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultInsights: Insight[] = [
    {
      id: '1',
      title: 'فرصة زيادة الإيرادات',
      description: 'تحليل البيانات يشير إلى إمكانية زيادة الإيرادات بنسبة 15% من خلال تحسين استراتيجية التسعير',
      type: 'opportunity',
      priority: 'high',
      impact: 'زيادة متوقعة: 18,750 د.ك شهرياً',
      action: {
        label: 'مراجعة الأسعار',
        onClick: () => console.log('Navigate to pricing')
      }
    },
    {
      id: '2',
      title: 'تحذير من انخفاض الأداء',
      description: 'ملاحظة انخفاض في معدل رضا العملاء بنسبة 3% خلال الأسبوعين الماضيين',
      type: 'warning',
      priority: 'medium',
      impact: 'تأثير على الاحتفاظ بالعملاء'
    },
    {
      id: '3',
      title: 'اتجاه إيجابي في المبيعات',
      description: 'نمو مستمر في المبيعات لثلاثة أشهر متتالية مع توقعات بالاستمرار',
      type: 'trend',
      priority: 'low',
      impact: 'نمو متوقع: 8-12% ربع سنوي'
    },
    {
      id: '4',
      title: 'توصية تحسين العمليات',
      description: 'تطبيق نظام إدارة أتوماتيكي للمهام الروتينية قد يوفر 20 ساعة عمل أسبوعياً',
      type: 'recommendation',
      priority: 'medium',
      impact: 'توفير: 2,400 د.ك شهرياً'
    }
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  return (
    <Card className="bg-gradient-glass backdrop-blur-sm border-0 shadow-glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            رؤى ذكية
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            مدعوم بالذكاء الاصطناعي
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayInsights.slice(0, 4).map((insight, index) => {
            const InsightIcon = getInsightIcon(insight.type);
            
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="group"
              >
                <div className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${getInsightColor(insight.type)}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <InsightIcon size={18} />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          {insight.title}
                        </h4>
                        {getPriorityBadge(insight.priority)}
                      </div>
                      
                      <p className="text-xs opacity-80 leading-relaxed">
                        {insight.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium opacity-70">
                          {insight.impact}
                        </div>
                        
                        {insight.action && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={insight.action.onClick}
                            className="h-6 text-xs opacity-70 hover:opacity-100"
                          >
                            {insight.action.label}
                            <ChevronRight size={12} className="mr-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            عرض جميع الرؤى
            <ArrowLeft size={12} className="mr-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartInsightsPanel;