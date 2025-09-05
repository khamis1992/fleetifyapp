import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  MessageSquare, 
  FileText,
  Search,
  TrendingUp,
  Lightbulb,
  Zap,
  Send, 
  Loader2, 
  CheckCircle, 
  Clock,
  DollarSign,
  Star,
  Users,
  Target,
  User,
  Bot,
  Database,
  ThumbsUp,
  AlertCircle,
  History,
  Sparkles,
  Shield,
  Scale,
  BookOpen,
  Download,
  Eye,
  Edit,
  Plus,
  Filter,
  BarChart3
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIAssistantConfig, AIUseCasePrimitive } from '@/types/ai-assistant';
import { FloatingAIAssistant } from '@/components/ai/FloatingAIAssistant';
import { toast } from 'sonner';

interface EnhancedLegalAIConsultantProps {
  companyId: string;
}

interface LegalDocument {
  id: string;
  title: string;
  type: 'contract' | 'notice' | 'memo' | 'report' | 'letter';
  content: string;
  status: 'draft' | 'review' | 'approved' | 'sent';
  createdAt: Date;
  updatedAt: Date;
  confidence: number;
  tags: string[];
}

interface LegalCase {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: Date;
  documents: string[];
  notes: string[];
}

interface LegalInsight {
  id: string;
  title: string;
  description: string;
  type: 'risk' | 'opportunity' | 'compliance' | 'trend';
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  recommendations: string[];
  sources: string[];
}

const primitiveConfigs: Record<AIUseCasePrimitive, { 
  title: string; 
  description: string; 
  icon: React.ComponentType<any>;
  color: string;
}> = {
  content_creation: {
    title: 'إنشاء المحتوى القانوني',
    description: 'توليد الوثائق والعقود والمذكرات القانونية',
    icon: FileText,
    color: 'bg-blue-500'
  },
  research: {
    title: 'البحث القانوني',
    description: 'البحث في القوانين والسوابق والأحكام',
    icon: Search,
    color: 'bg-green-500'
  },
  data_analysis: {
    title: 'تحليل البيانات القانونية',
    description: 'تحليل القضايا والمخاطر والاتجاهات',
    icon: TrendingUp,
    color: 'bg-purple-500'
  },
  automation: {
    title: 'أتمتة العمليات القانونية',
    description: 'أتمتة المراجعات والتنبيهات والمتابعات',
    icon: Zap,
    color: 'bg-orange-500'
  },
  coding: {
    title: 'الأدوات التقنية',
    description: 'إنشاء أدوات مخصصة للعمل القانوني',
    icon: Brain,
    color: 'bg-red-500'
  },
  ideation_strategy: {
    title: 'الاستراتيجية القانونية',
    description: 'وضع الاستراتيجيات والخطط القانونية',
    icon: Lightbulb,
    color: 'bg-yellow-500'
  }
};

export const EnhancedLegalAIConsultant: React.FC<EnhancedLegalAIConsultantProps> = ({
  companyId
}) => {
  const [activeTab, setActiveTab] = useState('consultation');
  const [activePrimitive, setActivePrimitive] = useState<AIUseCasePrimitive>('content_creation');
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [insights, setInsights] = useState<LegalInsight[]>([]);
  const [query, setQuery] = useState('');

  const aiConfig: AIAssistantConfig = {
    module: 'legal',
    primitives: Object.keys(primitiveConfigs) as AIUseCasePrimitive[],
    context: {
      companyId,
      documents,
      cases,
      insights
    },
    priority: 'high_value',
    enabledFeatures: []
  };

  const {
    messages,
    suggestions,
    isLoading,
    executeTask,
    generateContent,
    analyzeData,
    researchTopic,
    suggestActions,
    clearConversation
  } = useAIAssistant(aiConfig);

  // تنفيذ مهمة حسب النوع المحدد
  const executePrimitiveTask = async (primitive: AIUseCasePrimitive, taskQuery: string) => {
    try {
      switch (primitive) {
        case 'content_creation':
          const content = await generateContent(
            'وثيقة قانونية',
            taskQuery,
            'قالب قانوني معتمد'
          );
          if (content) {
            const newDoc: LegalDocument = {
              id: `doc_${Date.now()}`,
              title: `وثيقة مُنشأة - ${new Date().toLocaleDateString('ar-SA')}`,
              type: 'memo',
              content: content.content,
              status: 'draft',
              createdAt: new Date(),
              updatedAt: new Date(),
              confidence: 0.85,
              tags: ['ai-generated', 'draft']
            };
            setDocuments(prev => [newDoc, ...prev]);
            toast.success('تم إنشاء الوثيقة بنجاح');
          }
          break;

        case 'research':
          await researchTopic(
            taskQuery,
            'القوانين والأنظمة المحلية',
            ['القانون السعودي', 'الأنظمة التجارية']
          );
          break;

        case 'data_analysis':
          await analyzeData(
            [...documents, ...cases],
            'تحليل قانوني',
            ['ما هي المخاطر القانونية؟', 'ما هي الفرص المتاحة؟']
          );
          break;

        case 'automation':
          await executeTask('automate_process', `أتمتة العملية: ${taskQuery}`);
          break;

        case 'ideation_strategy':
          const strategySuggestions = await suggestActions(
            taskQuery,
            ['تقليل المخاطر القانونية', 'تحسين الامتثال', 'زيادة الكفاءة'],
            ['الموارد المتاحة', 'الوقت المحدود']
          );
          
          const newInsights: LegalInsight[] = strategySuggestions.map(suggestion => ({
            id: `insight_${Date.now()}_${Math.random()}`,
            title: suggestion.title,
            description: suggestion.description,
            type: 'opportunity',
            impact: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
            confidence: suggestion.confidence,
            recommendations: [suggestion.description],
            sources: ['AI Analysis']
          }));
          
          setInsights(prev => [...newInsights, ...prev]);
          break;

        default:
          await executeTask('suggest_action', taskQuery);
      }
    } catch (error) {
      console.error('Error executing primitive task:', error);
      toast.error('حدث خطأ في تنفيذ المهمة');
    }
  };

  // تنفيذ الاستعلام
  const handleSubmitQuery = async () => {
    if (!query.trim()) return;
    
    await executePrimitiveTask(activePrimitive, query);
    setQuery('');
  };

  // مكون بطاقة المهمة
  const PrimitiveCard: React.FC<{ primitive: AIUseCasePrimitive }> = ({ primitive }) => {
    const config = primitiveConfigs[primitive];
    const Icon = config.icon;
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          activePrimitive === primitive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        }`}
        onClick={() => setActivePrimitive(primitive)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${config.color} text-white`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">{config.title}</h4>
              <p className="text-xs text-gray-600">{config.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // مكون الوثيقة
  const DocumentCard: React.FC<{ document: LegalDocument }> = ({ document }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h4 className="font-medium text-sm">{document.title}</h4>
              <Badge variant={document.status === 'approved' ? 'default' : 'secondary'}>
                {document.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {document.content.substring(0, 100)}...
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {document.createdAt.toLocaleDateString('ar-SA')}
              <Badge variant="outline" className="text-xs">
                {Math.round(document.confidence * 100)}% دقة
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost">
              <Eye className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost">
              <Edit className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost">
              <Download className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // مكون الرؤية القانونية
  const InsightCard: React.FC<{ insight: LegalInsight }> = ({ insight }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            insight.type === 'risk' ? 'bg-red-100 text-red-600' :
            insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
            insight.type === 'compliance' ? 'bg-blue-100 text-blue-600' :
            'bg-purple-100 text-purple-600'
          }`}>
            {insight.type === 'risk' ? <AlertCircle className="w-4 h-4" /> :
             insight.type === 'opportunity' ? <TrendingUp className="w-4 h-4" /> :
             insight.type === 'compliance' ? <Shield className="w-4 h-4" /> :
             <BarChart3 className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm">{insight.title}</h4>
              <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                {insight.impact}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mb-2">{insight.description}</p>
            {insight.recommendations.length > 0 && (
              <div className="text-xs">
                <strong>التوصيات:</strong>
                <ul className="mt-1 space-y-1">
                  {insight.recommendations.map((rec, index) => (
                    <li key={index} className="text-gray-600">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* رأس المستشار القانوني المحسن */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            المستشار القانوني الذكي المحسن
            <Badge variant="secondary" className="mr-auto">
              <Sparkles className="w-3 h-3 ml-1" />
              مدعوم بالذكاء الاصطناعي المتقدم
            </Badge>
          </CardTitle>
          <CardDescription>
            نظام شامل للاستشارات القانونية وإدارة الوثائق مع دعم الـ 6 أنماط الأساسية للذكاء الاصطناعي
          </CardDescription>
        </CardHeader>
      </Card>

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultation">الاستشارة</TabsTrigger>
          <TabsTrigger value="documents">الوثائق</TabsTrigger>
          <TabsTrigger value="insights">الرؤى</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        {/* تبويب الاستشارة */}
        <TabsContent value="consultation" className="space-y-6">
          {/* اختيار نمط الذكاء الاصطناعي */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">اختر نمط المساعدة</CardTitle>
              <CardDescription>
                حدد نوع المهمة التي تريد تنفيذها باستخدام الذكاء الاصطناعي
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(primitiveConfigs) as AIUseCasePrimitive[]).map(primitive => (
                  <PrimitiveCard key={primitive} primitive={primitive} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* منطقة الاستعلام */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(primitiveConfigs[activePrimitive].icon, { className: "w-5 h-5" })}
                {primitiveConfigs[activePrimitive].title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`اكتب استفسارك أو طلبك لـ ${primitiveConfigs[activePrimitive].title}...`}
                className="min-h-[100px]"
              />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {primitiveConfigs[activePrimitive].description}
                </div>
                <Button 
                  onClick={handleSubmitQuery}
                  disabled={!query.trim() || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  تنفيذ
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* نتائج المحادثة */}
          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>المحادثة</span>
                  <Button variant="outline" size="sm" onClick={clearConversation}>
                    مسح المحادثة
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                          {message.metadata && (
                            <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                              {message.metadata.confidence && (
                                <Badge variant="secondary" className="text-xs">
                                  دقة: {Math.round(message.metadata.confidence * 100)}%
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* تبويب الوثائق */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>الوثائق القانونية</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Filter className="w-4 h-4 ml-1" />
                    تصفية
                  </Button>
                  <Button size="sm">
                    <Plus className="w-4 h-4 ml-1" />
                    وثيقة جديدة
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {documents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد وثائق حالياً</p>
                    <p className="text-sm">استخدم المساعد الذكي لإنشاء وثائق جديدة</p>
                  </div>
                ) : (
                  <div>
                    {documents.map(document => (
                      <DocumentCard key={document.id} document={document} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب الرؤى */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الرؤى القانونية الذكية</CardTitle>
              <CardDescription>
                تحليلات ورؤى مدعومة بالذكاء الاصطناعي لمساعدتك في اتخاذ القرارات القانونية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {insights.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد رؤى حالياً</p>
                    <p className="text-sm">استخدم تحليل البيانات أو الاستراتيجية لإنشاء رؤى</p>
                  </div>
                ) : (
                  <div>
                    {insights.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب التحليلات */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{documents.length}</p>
                    <p className="text-sm text-gray-600">الوثائق المُنشأة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Lightbulb className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{insights.length}</p>
                    <p className="text-sm text-gray-600">الرؤى المُكتشفة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{messages.length}</p>
                    <p className="text-sm text-gray-600">الاستشارات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* المساعد الذكي العائم */}
      <FloatingAIAssistant 
        config={aiConfig}
        defaultPosition={{ x: window.innerWidth - 420, y: 120 }}
      />
    </div>
  );
};
