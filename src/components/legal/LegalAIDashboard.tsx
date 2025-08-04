import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { SmartLegalAssistant } from './SmartLegalAssistant';
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
  const [activeTab, setActiveTab] = useState('overview');
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
    }
  ];

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
          <h1 className="text-3xl font-bold text-black">
            المستشار القانوني
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

      {/* المساعد القانوني الذكي */}
      <SmartLegalAssistant />
    </div>
  );
};

export default LegalAIDashboard;