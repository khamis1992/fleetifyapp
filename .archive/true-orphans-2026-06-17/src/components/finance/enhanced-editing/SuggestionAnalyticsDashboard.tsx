import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Users, Bot, Sparkles, BarChart3 } from 'lucide-react';
import { useEnhancedAccountSuggestions } from '@/hooks/useEnhancedAccountSuggestions';

export const SuggestionAnalyticsDashboard: React.FC = () => {
  const { analytics } = useEnhancedAccountSuggestions();

  if (!analytics || analytics.totalSuggestions === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-heading-sm">
            <BarChart3 className="h-5 w-5" />
            إحصائيات الاقتراحات الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground arabic-body">
              لا توجد بيانات كافية لعرض الإحصائيات
            </div>
            <div className="text-sm text-muted-foreground mt-1 arabic-body">
              ابدأ باستخدام الاقتراحات الذكية لجمع البيانات
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryIcons = {
    perfect_match: <Target className="h-4 w-4" />,
    similar_name: <Users className="h-4 w-4" />,
    ai_suggested: <Bot className="h-4 w-4" />,
    usage_based: <TrendingUp className="h-4 w-4" />,
    type_match: <Sparkles className="h-4 w-4" />
  };

  const categoryLabels = {
    perfect_match: 'تطابق مثالي',
    similar_name: 'أسماء متشابهة',
    ai_suggested: 'اقتراح ذكي',
    usage_based: 'الأكثر استخداماً',
    type_match: 'تطابق النوع'
  };

  return (
    <div className="space-y-6">
      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-heading-sm">
            <BarChart3 className="h-5 w-5" />
            الأداء العام للاقتراحات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary arabic-heading-sm">
                {Math.round(analytics.accuracy * 100)}%
              </div>
              <div className="text-sm text-muted-foreground arabic-body">دقة الاقتراحات</div>
              <Progress value={analytics.accuracy * 100} className="mt-2" />
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary arabic-heading-sm">
                {analytics.totalSuggestions}
              </div>
              <div className="text-sm text-muted-foreground arabic-body">إجمالي الاقتراحات</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary arabic-heading-sm">
                {analytics.acceptedSuggestions}
              </div>
              <div className="text-sm text-muted-foreground arabic-body">اقتراحات مقبولة</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-heading-sm">
            <TrendingUp className="h-5 w-5" />
            أداء الفئات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.categoryPerformance)
              .sort(([, a], [, b]) => b.accuracy - a.accuracy)
              .map(([category, performance]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {categoryIcons[category as keyof typeof categoryIcons]}
                      <span className="font-medium arabic-body">
                        {categoryLabels[category as keyof typeof categoryLabels] || category}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {performance.count} اقتراح
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium arabic-body">
                        {Math.round(performance.accuracy * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground arabic-body">دقة</div>
                    </div>
                    <div className="w-24">
                      <Progress value={performance.accuracy * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 arabic-heading-sm">
            <Sparkles className="h-5 w-5" />
            نصائح وتوصيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.accuracy < 0.7 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 arabic-body">
                  يمكن تحسين دقة الاقتراحات
                </div>
                <div className="text-xs text-yellow-700 mt-1 arabic-body">
                  حاول استخدام أسماء حسابات أكثر وضوحاً ودقة
                </div>
              </div>
            )}
            
            {analytics.accuracy >= 0.8 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm font-medium text-green-800 arabic-body">
                  أداء ممتاز للاقتراحات الذكية!
                </div>
                <div className="text-xs text-green-700 mt-1 arabic-body">
                  النظام يتعلم من اختياراتك ويحسن الاقتراحات
                </div>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 arabic-body">
                الذكاء الاصطناعي يحلل أسماء الحسابات
              </div>
              <div className="text-xs text-blue-700 mt-1 arabic-body">
                استخدم أسماء وصفية للحصول على اقتراحات أفضل من AI
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};