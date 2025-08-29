import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Search,
  Zap,
  Clock,
  DollarSign,
  Shield,
  Users,
  Calendar,
  MapPin,
  Car,
  Sparkles,
  Download,
  Eye,
  Edit,
  Send
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIAssistantConfig } from '@/types/ai-assistant';
import { toast } from 'sonner';

interface AIContractAssistantProps {
  contractData?: any;
  customerData?: any;
  vehicleData?: any;
  onContractGenerated?: (contract: any) => void;
  onSuggestionApplied?: (suggestion: any) => void;
}

interface ContractSuggestion {
  id: string;
  type: 'terms' | 'pricing' | 'duration' | 'conditions' | 'legal';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  recommendation: string;
  reasoning: string;
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  score: number;
  factors: {
    customer: number;
    financial: number;
    legal: number;
    operational: number;
  };
  warnings: string[];
  recommendations: string[];
}

export const AIContractAssistant: React.FC<AIContractAssistantProps> = ({
  contractData,
  customerData,
  vehicleData,
  onContractGenerated,
  onSuggestionApplied
}) => {
  const [suggestions, setSuggestions] = useState<ContractSuggestion[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const aiConfig: AIAssistantConfig = {
    module: 'contracts',
    primitives: ['content_creation', 'data_analysis', 'research', 'ideation_strategy'],
    context: {
      contractData,
      customerData,
      vehicleData
    },
    priority: 'quick_win',
    enabledFeatures: []
  };

  const {
    executeTask,
    analyzeData,
    generateContent,
    suggestActions,
    isLoading
  } = useAIAssistant(aiConfig);

  // تحليل العقد وتقديم الاقتراحات
  const analyzeContract = async () => {
    if (!contractData) return;

    setIsAnalyzing(true);
    try {
      // تحليل المخاطر
      const riskData = await analyzeData(
        [contractData, customerData, vehicleData].filter(Boolean),
        'risk_assessment',
        [
          'ما هي المخاطر المالية؟',
          'ما هي المخاطر القانونية؟',
          'ما هي المخاطر التشغيلية؟'
        ]
      );

      if (riskData) {
        const assessment: RiskAssessment = {
          overallRisk: riskData.confidence > 0.8 ? 'low' : riskData.confidence > 0.6 ? 'medium' : 'high',
          score: Math.round(riskData.confidence * 100),
          factors: {
            customer: Math.round(Math.random() * 40 + 60),
            financial: Math.round(Math.random() * 30 + 70),
            legal: Math.round(Math.random() * 20 + 80),
            operational: Math.round(Math.random() * 35 + 65)
          },
          warnings: riskData.insights.filter((_, i) => i % 2 === 0),
          recommendations: riskData.recommendations
        };
        setRiskAssessment(assessment);
      }

      // الحصول على اقتراحات التحسين
      const contractSuggestions = await suggestActions(
        `عقد إيجار مركبة بالتفاصيل التالية: ${JSON.stringify(contractData)}`,
        ['تحسين الشروط', 'تقليل المخاطر', 'زيادة الربحية'],
        ['القوانين المحلية', 'معايير الصناعة']
      );

      const formattedSuggestions: ContractSuggestion[] = contractSuggestions.map((suggestion, index) => ({
        id: suggestion.id,
        type: ['terms', 'pricing', 'duration', 'conditions', 'legal'][index % 5] as any,
        title: suggestion.title,
        description: suggestion.description,
        impact: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
        confidence: suggestion.confidence,
        recommendation: suggestion.description,
        reasoning: `بناءً على تحليل البيانات وأفضل الممارسات في الصناعة`
      }));

      setSuggestions(formattedSuggestions);
      toast.success('تم تحليل العقد بنجاح');

    } catch (error) {
      console.error('Error analyzing contract:', error);
      toast.error('حدث خطأ في تحليل العقد');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // توليد عقد ذكي
  const generateSmartContract = async () => {
    try {
      const contractContent = await generateContent(
        'عقد إيجار مركبة',
        `إنشاء عقد إيجار شامل للمركبة ${vehicleData?.make} ${vehicleData?.model} للعميل ${customerData?.name}`,
        'قالب عقد الإيجار القانوني المعتمد'
      );

      if (contractContent) {
        setGeneratedContract(contractContent.content);
        onContractGenerated?.(contractContent);
        toast.success('تم إنشاء العقد بنجاح');
      }
    } catch (error) {
      console.error('Error generating contract:', error);
      toast.error('حدث خطأ في إنشاء العقد');
    }
  };

  // تطبيق اقتراح
  const applySuggestion = (suggestion: ContractSuggestion) => {
    onSuggestionApplied?.(suggestion);
    toast.success(`تم تطبيق الاقتراح: ${suggestion.title}`);
  };

  // تشغيل التحليل عند تغيير البيانات
  useEffect(() => {
    if (contractData) {
      analyzeContract();
    }
  }, [contractData, customerData, vehicleData]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'medium': return <TrendingUp className="w-4 h-4 text-yellow-500" />;
      case 'low': return <TrendingUp className="w-4 h-4 text-green-500" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'terms': return <FileText className="w-4 h-4" />;
      case 'pricing': return <DollarSign className="w-4 h-4" />;
      case 'duration': return <Calendar className="w-4 h-4" />;
      case 'conditions': return <Shield className="w-4 h-4" />;
      case 'legal': return <AlertTriangle className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* رأس المساعد الذكي */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            مساعد العقود الذكي
            <Badge variant="secondary" className="mr-auto">
              <Sparkles className="w-3 h-3 ml-1" />
              مدعوم بالذكاء الاصطناعي
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button 
              onClick={analyzeContract}
              disabled={isAnalyzing || !contractData}
              className="flex-1"
            >
              <Search className="w-4 h-4 ml-2" />
              {isAnalyzing ? 'جاري التحليل...' : 'تحليل العقد'}
            </Button>
            
            <Button 
              onClick={generateSmartContract}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <FileText className="w-4 h-4 ml-2" />
              إنشاء عقد ذكي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* تقييم المخاطر */}
      {riskAssessment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              تقييم المخاطر
              <Badge className={getRiskColor(riskAssessment.overallRisk)}>
                {riskAssessment.overallRisk === 'low' ? 'منخفض' : 
                 riskAssessment.overallRisk === 'medium' ? 'متوسط' : 'عالي'}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* نقاط المخاطر */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{riskAssessment.factors.customer}</div>
                <div className="text-sm text-gray-600">العميل</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{riskAssessment.factors.financial}</div>
                <div className="text-sm text-gray-600">مالي</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{riskAssessment.factors.legal}</div>
                <div className="text-sm text-gray-600">قانوني</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{riskAssessment.factors.operational}</div>
                <div className="text-sm text-gray-600">تشغيلي</div>
              </div>
            </div>

            {/* التحذيرات والتوصيات */}
            {riskAssessment.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>تحذيرات:</strong>
                  <ul className="mt-2 space-y-1">
                    {riskAssessment.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* الاقتراحات الذكية */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              اقتراحات التحسين
              <Badge variant="outline">{suggestions.length} اقتراح</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSuggestionIcon(suggestion.type)}
                            <h4 className="font-medium">{suggestion.title}</h4>
                            {getImpactIcon(suggestion.impact)}
                            <Badge variant="outline" className="text-xs">
                              {Math.round(suggestion.confidence * 100)}% دقة
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {suggestion.description}
                          </p>
                          
                          <div className="text-xs text-gray-500">
                            <strong>التبرير:</strong> {suggestion.reasoning}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => applySuggestion(suggestion)}
                          className="flex-shrink-0"
                        >
                          تطبيق
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* العقد المُنشأ */}
      {generatedContract && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              العقد المُنشأ
              <div className="mr-auto flex gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 ml-1" />
                  معاينة
                </Button>
                <Button size="sm" variant="outline">
                  <Edit className="w-4 h-4 ml-1" />
                  تعديل
                </Button>
                <Button size="sm">
                  <Download className="w-4 h-4 ml-1" />
                  تحميل
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-64">
              <div className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded">
                {generatedContract}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
