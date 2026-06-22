import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  BarChart3, 
  Target, 
  Users, 
  TrendingUp, 
  Sparkles,
  Lightbulb,
  Zap
} from 'lucide-react';
import { SuggestionAnalyticsDashboard } from './SuggestionAnalyticsDashboard';

export const SmartSuggestionsShowcase: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'selector' | 'analytics'>('selector');

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader className="text-center pb-6">
        <CardTitle className="flex items-center justify-center gap-3 arabic-heading-lg">
          <Bot className="h-8 w-8 text-primary" />
          نظام الاقتراحات الذكية المطور
        </CardTitle>
        <p className="arabic-body text-muted-foreground mt-2 max-w-2xl mx-auto">
          نظام متقدم يستخدم الذكاء الاصطناعي لاقتراح أفضل الحسابات الأب بناءً على تحليل الأسماء والأنماط والتعلم من اختيارات المستخدم
        </p>
      </CardHeader>

      <CardContent>
        <Tabs value={activeDemo} onValueChange={(value) => setActiveDemo(value as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="selector" className="arabic-body flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              المحدد الذكي
            </TabsTrigger>
            <TabsTrigger value="analytics" className="arabic-body flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              التحليلات والإحصائيات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="selector" className="space-y-6">
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Bot className="h-5 w-5 text-purple-600" />
                    <Badge className="bg-purple-100 text-purple-800">AI مدعوم</Badge>
                  </div>
                  <h3 className="arabic-heading-sm text-purple-900 mb-2">تحليل ذكي للأسماء</h3>
                  <p className="arabic-body-sm text-purple-700">
                    يحلل GPT أسماء الحسابات ويقترح التصنيف الأنسب بناءً على المحتوى
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-5 w-5 text-blue-600" />
                    <Badge className="bg-blue-100 text-blue-800">دقة عالية</Badge>
                  </div>
                  <h3 className="arabic-heading-sm text-blue-900 mb-2">تطابق مثالي</h3>
                  <p className="arabic-body-sm text-blue-700">
                    خوارزميات متقدمة للعثور على أفضل تطابق في أسماء وأنواع الحسابات
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">تعلم تكيفي</Badge>
                  </div>
                  <h3 className="arabic-heading-sm text-green-900 mb-2">يتعلم من اختياراتك</h3>
                  <p className="arabic-body-sm text-green-700">
                    يحسن الاقتراحات بمرور الوقت بناءً على قرارات المستخدم السابقة
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <Badge className="bg-orange-100 text-orange-800">إحصائيات</Badge>
                  </div>
                  <h3 className="arabic-heading-sm text-orange-900 mb-2">أكثر استخداماً أولاً</h3>
                  <p className="arabic-body-sm text-orange-700">
                    يعطي أولوية للحسابات الأكثر استخداماً وفعالية في النظام
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <Badge className="bg-indigo-100 text-indigo-800">متوافق</Badge>
                  </div>
                  <h3 className="arabic-heading-sm text-indigo-900 mb-2">فحص التوافق</h3>
                  <p className="arabic-body-sm text-indigo-700">
                    يتأكد من توافق أنواع الحسابات ومنع الدورات المغلقة
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="h-5 w-5 text-pink-600" />
                    <Badge className="bg-pink-100 text-pink-800">سريع</Badge>
                  </div>
                  <h3 className="arabic-heading-sm text-pink-900 mb-2">أداء فائق</h3>
                  <p className="arabic-body-sm text-pink-700">
                    تخزين مؤقت ذكي وخوارزميات محسنة لاستجابة فورية
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Demo Preview */}
            <Card className="bg-gradient-to-r from-primary/5 to-purple/5 border-primary/20">
              <CardHeader>
                <CardTitle className="arabic-heading-sm flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  كيف يعمل النظام؟
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <h4 className="arabic-body font-medium mb-2">تحليل الاسم</h4>
                    <p className="arabic-body-sm text-muted-foreground">
                      تحليل اسم الحساب بواسطة AI
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <h4 className="arabic-body font-medium mb-2">العثور على التطابقات</h4>
                    <p className="arabic-body-sm text-muted-foreground">
                      البحث عن حسابات مشابهة ومتوافقة
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <h4 className="arabic-body font-medium mb-2">حساب الثقة</h4>
                    <p className="arabic-body-sm text-muted-foreground">
                      تقييم مستوى الثقة في كل اقتراح
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded-lg border">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <h4 className="arabic-body font-medium mb-2">عرض الاقتراحات</h4>
                    <p className="arabic-body-sm text-muted-foreground">
                      ترتيب وعرض أفضل الخيارات
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <SuggestionAnalyticsDashboard />
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <div className="text-center mt-8 p-6 bg-gradient-to-r from-primary/10 to-purple/10 rounded-lg border border-primary/20">
          <h3 className="arabic-heading-sm text-foreground mb-2">جاهز للتجربة؟</h3>
          <p className="arabic-body text-muted-foreground mb-4">
            ابدأ بتعديل أي حساب لتجربة النظام الذكي الجديد
          </p>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
            <Bot className="h-4 w-4 mr-2" />
            مدعوم بالذكاء الاصطناعي GPT-4
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};