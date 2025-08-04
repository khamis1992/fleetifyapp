import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Brain, 
  TrendingUp, 
  Shield, 
  Search,
  Lightbulb,
  FileText,
  Users,
  Clock,
  Target,
  Star,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { SmartRecommendationSystem } from './SmartRecommendationSystem';
import { SmartLegalAssistant } from './SmartLegalAssistant';
import DocumentAnalyzer from './DocumentAnalyzer';
import LegalDocumentGenerator from './LegalDocumentGenerator';
import PredictiveAnalysis from './PredictiveAnalysis';
import { useLegalAI } from '@/hooks/useLegalAI';
import { useAdvancedLegalAI } from '@/hooks/useAdvancedLegalAI';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from '@/hooks/use-toast';

interface AISession {
  id: string;
  title: string;
  timestamp: Date;
  type: 'consultation' | 'analysis' | 'recommendation';
  status: 'active' | 'completed' | 'archived';
  insights_count: number;
  confidence_score: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'analysis' | 'consultation' | 'documentation' | 'insights';
}

export const LegalAIDashboard: React.FC = () => {
  const { user } = useUnifiedCompanyAccess();
  const { submitQuery, isLoading: aiLoading } = useLegalAI();
  const { getLegalInsights, insights, isLoading: insightsLoading } = useAdvancedLegalAI();
  
  const [activeSession, setActiveSession] = useState<AISession | null>(null);
  const [quickQuery, setQuickQuery] = useState('');
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [recentInsights, setRecentInsights] = useState<any[]>([]);

  useEffect(() => {
    // Load AI insights on mount
    getLegalInsights();
    loadRecentSessions();
  }, []);

  const loadRecentSessions = () => {
    // Mock data - في التطبيق الحقيقي، سيتم جلب البيانات من قاعدة البيانات
    const mockSessions: AISession[] = [
      {
        id: '1',
        title: 'تحليل عقد الإيجار التجاري',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: 'analysis',
        status: 'completed',
        insights_count: 8,
        confidence_score: 0.92
      },
      {
        id: '2',
        title: 'استشارة قانونية - قضية عمالية',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        type: 'consultation',
        status: 'active',
        insights_count: 12,
        confidence_score: 0.88
      },
      {
        id: '3',
        title: 'توصيات تحسين العقود',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        type: 'recommendation',
        status: 'completed',
        insights_count: 6,
        confidence_score: 0.95
      }
    ];
    setSessions(mockSessions);
  };

  const quickActions: QuickAction[] = [
    {
      id: 'smart-assistant',
      title: 'المساعد القانوني الذكي',
      description: 'استشارات وتحليل قانوني ذكي ومتطور',
      icon: <Brain className="h-5 w-5" />,
      category: 'consultation',
      action: () => setActiveTab('smart-assistant')
    },
    {
      id: 'document-analysis',
      title: 'تحليل الوثائق',
      description: 'تحليل فوري للعقود والوثائق القانونية',
      icon: <FileText className="h-5 w-5" />,
      category: 'analysis',
      action: () => setActiveTab('document-analyzer')
    },
    {
      id: 'contract-insights',
      title: 'رؤى العقود',
      description: 'تحليل ذكي لأداء وجودة العقود',
      icon: <TrendingUp className="h-5 w-5" />,
      category: 'insights',
      action: () => setActiveTab('insights')
    },
    {
      id: 'document-generator',
      title: 'مولد الوثائق',
      description: 'إنشاء وثائق قانونية ذكية ومخصصة',
      icon: <Lightbulb className="h-5 w-5" />,
      category: 'documentation',
      action: () => setActiveTab('document-generator')
    }
  ];

  const [activeTab, setActiveTab] = useState('overview');

  const handleQuickQuery = async () => {
    if (!quickQuery.trim()) return;

    try {
      const response = await submitQuery({
        query: quickQuery,
        country: 'KW',
        company_id: user?.profile?.company_id || ''
      });

      toast({
        title: "تم إرسال الاستعلام",
        description: "سيتم عرض النتائج في علامة التبويب المناسبة",
      });

      setQuickQuery('');
    } catch (error) {
      console.error('Quick query error:', error);
      toast({
        title: "خطأ في الاستعلام",
        description: "حدث خطأ أثناء معالجة الاستعلام",
        variant: "destructive"
      });
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis': return <BarChart3 className="h-4 w-4" />;
      case 'consultation': return <MessageSquare className="h-4 w-4" />;
      case 'recommendation': return <Lightbulb className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            النظام نشط
          </Badge>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            مركز الذكاء الاصطناعي القانوني
          </h1>
          <p className="text-muted-foreground mt-2">
            نظام متكامل للاستشارات والتحليل القانوني الذكي
          </p>
        </div>
      </div>

      {/* Quick Query Bar */}
      <Card className="border-primary/20 bg-gradient-subtle">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            استعلام سريع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="اطرح سؤالاً قانونياً سريعاً..."
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuickQuery()}
              className="flex-1"
            />
            <Button 
              onClick={handleQuickQuery}
              disabled={aiLoading || !quickQuery.trim()}
              className="px-6"
            >
              {aiLoading ? 'جاري المعالجة...' : 'استعلام'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="smart-assistant" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            المساعد الذكي
          </TabsTrigger>
          <TabsTrigger value="document-analyzer" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            تحليل الوثائق
          </TabsTrigger>
          <TabsTrigger value="document-generator" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            مولد الوثائق
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الرؤى والتوصيات
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            الأداء
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card key={action.id} className="hover-scale cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-primary" onClick={action.action}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {action.icon}
                    </div>
                    <Badge variant="secondary">{action.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Insights Overview */}
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">معدل نجاح التنبؤات</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    85%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% من الشهر الماضي
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الاستعلامات المعالجة</CardTitle>
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    1,247
                  </div>
                  <p className="text-xs text-muted-foreground">
                    هذا الشهر
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">وقت الاستجابة</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    2.3s
                  </div>
                  <p className="text-xs text-muted-foreground">
                    متوسط وقت الاستجابة
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                الجلسات الأخيرة
              </CardTitle>
              <CardDescription>
                آخر جلسات الذكاء الاصطناعي والتحليل القانوني
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {getSessionTypeIcon(session.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{session.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {session.timestamp.toLocaleString('ar-KW')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {session.insights_count} رؤية
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs">{Math.round(session.confidence_score * 100)}%</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getSessionStatusColor(session.status)}`} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smart-assistant">
          <SmartLegalAssistant />
        </TabsContent>

        <TabsContent value="document-analyzer">
          <DocumentAnalyzer onAnalysisComplete={(analysis) => {
            console.log('Analysis completed:', analysis);
          }} />
        </TabsContent>

        <TabsContent value="document-generator">
          <LegalDocumentGenerator onDocumentGenerated={(document) => {
            console.log('Document generated:', document);
          }} />
        </TabsContent>


        <TabsContent value="insights">
          <SmartRecommendationSystem />
        </TabsContent>


        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>دقة التحليل</span>
                    <span className="font-bold text-green-600">94%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>معدل رضا المستخدمين</span>
                    <span className="font-bold text-blue-600">4.8/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>وقت الاستجابة المتوسط</span>
                    <span className="font-bold">2.3 ثانية</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>الاستعلامات المكتملة</span>
                    <span className="font-bold">1,247</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>التحسينات المقترحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <h4 className="font-medium text-blue-900">تحسين قاعدة البيانات القانونية</h4>
                    <p className="text-sm text-blue-700">إضافة المزيد من السوابق القضائية</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <h4 className="font-medium text-green-900">تطوير الذاكرة السياقية</h4>
                    <p className="text-sm text-green-700">تحسين فهم السياق التاريخي للقضايا</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <h4 className="font-medium text-orange-900">زيادة سرعة المعالجة</h4>
                    <p className="text-sm text-orange-700">تحسين خوارزميات التحليل</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LegalAIDashboard;