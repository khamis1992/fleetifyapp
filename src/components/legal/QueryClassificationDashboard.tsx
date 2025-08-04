import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  BarChart3, 
  Clock, 
  Target, 
  Filter,
  Search,
  RefreshCw,
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Database,
  MessageSquare,
  FileText,
  Scale,
  Eye,
  Settings
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { useAdvancedLegalAI, type QueryClassification } from '@/hooks/useAdvancedLegalAI';

interface QueryAnalytics {
  total_queries: number;
  classification_accuracy: number;
  average_response_time: number;
  user_satisfaction: number;
  type_distribution: Array<{ type: string; count: number; percentage: number }>;
  complexity_distribution: Array<{ complexity: string; count: number; avg_time: number }>;
  hourly_patterns: Array<{ hour: number; count: number; avg_complexity: number }>;
  accuracy_trends: Array<{ date: string; accuracy: number; volume: number }>;
  error_analysis: Array<{ error_type: string; frequency: number; impact: string }>;
}

interface LiveQuery {
  id: string;
  query: string;
  classification: QueryClassification;
  timestamp: Date;
  status: 'processing' | 'completed' | 'error';
  response_time?: number;
  user_satisfaction?: number;
}

const QueryClassificationDashboard: React.FC = () => {
  const { classifyQuery } = useAdvancedLegalAI();
  const [analytics, setAnalytics] = useState<QueryAnalytics>({
    total_queries: 0,
    classification_accuracy: 0,
    average_response_time: 0,
    user_satisfaction: 0,
    type_distribution: [],
    complexity_distribution: [],
    hourly_patterns: [],
    accuracy_trends: [],
    error_analysis: []
  });

  const [liveQueries, setLiveQueries] = useState<LiveQuery[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterComplexity, setFilterComplexity] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<QueryClassification | null>(null);

  // محاكاة البيانات (في التطبيق الحقيقي، ستأتي من API)
  useEffect(() => {
    loadAnalytics();
    // تحديث البيانات كل دقيقة
    const interval = setInterval(loadAnalytics, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    
    // محاكاة تحميل البيانات
    setTimeout(() => {
      setAnalytics({
        total_queries: 1247,
        classification_accuracy: 0.89,
        average_response_time: 2.3,
        user_satisfaction: 0.85,
        type_distribution: [
          { type: 'legal_advice', count: 623, percentage: 50 },
          { type: 'system_data', count: 311, percentage: 25 },
          { type: 'mixed', count: 187, percentage: 15 },
          { type: 'document_generation', count: 126, percentage: 10 }
        ],
        complexity_distribution: [
          { complexity: 'simple', count: 498, avg_time: 1.2 },
          { complexity: 'moderate', count: 436, avg_time: 2.1 },
          { complexity: 'complex', count: 249, avg_time: 3.8 },
          { complexity: 'expert_level', count: 64, avg_time: 6.2 }
        ],
        hourly_patterns: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: Math.floor(Math.random() * 100) + 20,
          avg_complexity: Math.random() * 5 + 1
        })),
        accuracy_trends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          accuracy: 0.7 + Math.random() * 0.3,
          volume: Math.floor(Math.random() * 100) + 20
        })),
        error_analysis: [
          { error_type: 'تصنيف خاطئ', frequency: 45, impact: 'متوسط' },
          { error_type: 'عدم وضوح الاستفسار', frequency: 32, impact: 'منخفض' },
          { error_type: 'نقص في البيانات', frequency: 18, impact: 'عالي' },
          { error_type: 'خطأ تقني', frequency: 12, impact: 'عالي' }
        ]
      });

      // محاكاة الاستفسارات المباشرة
      setLiveQueries([
        {
          id: '1',
          query: 'ما هي إجراءات تسجيل شركة في الكويت؟',
          classification: {
            primary_type: 'legal_advice',
            confidence_score: 0.92,
            sub_categories: ['تأسيس شركات', 'إجراءات قانونية'],
            complexity_level: 'moderate',
            required_expertise: ['قانون تجاري'],
            estimated_response_time: 3,
            suggested_approach: 'ai_analysis',
            data_requirements: {
              needs_client_data: false,
              needs_case_history: false,
              needs_legal_precedents: true,
              needs_jurisdiction_specific: true
            }
          },
          timestamp: new Date(),
          status: 'completed',
          response_time: 2.8,
          user_satisfaction: 4
        },
        {
          id: '2',
          query: 'عرض قائمة العقود النشطة للعميل أحمد محمد',
          classification: {
            primary_type: 'system_data',
            confidence_score: 0.96,
            sub_categories: ['بيانات العملاء', 'إدارة العقود'],
            complexity_level: 'simple',
            required_expertise: ['تقني'],
            estimated_response_time: 1,
            suggested_approach: 'database_query',
            data_requirements: {
              needs_client_data: true,
              needs_case_history: false,
              needs_legal_precedents: false,
              needs_jurisdiction_specific: false
            }
          },
          timestamp: new Date(Date.now() - 120000),
          status: 'processing'
        }
      ]);

      setIsLoading(false);
    }, 1000);
  };

  const handleTestClassification = async () => {
    if (!testQuery.trim()) return;

    setIsLoading(true);
    try {
      const result = await classifyQuery(testQuery);
      setTestResult(result);
    } catch (error) {
      console.error('Error classifying query:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'legal_advice': return '#8884d8';
      case 'system_data': return '#82ca9d';
      case 'mixed': return '#ffc658';
      case 'document_generation': return '#ff7300';
      default: return '#8dd1e1';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '#4ade80';
      case 'moderate': return '#fbbf24';
      case 'complex': return '#f97316';
      case 'expert_level': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const filteredQueries = liveQueries.filter(query => {
    const matchesSearch = query.query.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || query.classification.primary_type === filterType;
    const matchesComplexity = filterComplexity === 'all' || query.classification.complexity_level === filterComplexity;
    return matchesSearch && matchesType && matchesComplexity;
  });

  return (
    <div className="space-y-6">
      {/* الشاشة الرئيسية */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                لوحة تحكم تصنيف الاستفسارات
              </CardTitle>
              <CardDescription>
                مراقبة وتحليل أداء نظام تصنيف الاستفسارات القانونية
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadAnalytics} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-1" />
                تصدير
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* المؤشرات الرئيسية */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{analytics.total_queries.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">إجمالي الاستفسارات</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {Math.round(analytics.classification_accuracy * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">دقة التصنيف</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{analytics.average_response_time}ث</div>
              <div className="text-sm text-muted-foreground">متوسط وقت الاستجابة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {Math.round(analytics.user_satisfaction * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">رضا المستخدمين</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التحليلات المفصلة */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
          <TabsTrigger value="live">المراقبة المباشرة</TabsTrigger>
          <TabsTrigger value="analysis">التحليل المتقدم</TabsTrigger>
          <TabsTrigger value="testing">اختبار التصنيف</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* توزيع أنواع الاستفسارات */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع أنواع الاستفسارات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.type_distribution}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                    >
                      {analytics.type_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTypeColor(entry.type)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* توزيع مستويات التعقيد */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع مستويات التعقيد</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.complexity_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="complexity" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* الأنماط الزمنية */}
          <Card>
            <CardHeader>
              <CardTitle>أنماط الاستخدام اليومية</CardTitle>
              <CardDescription>توزيع الاستفسارات حسب الساعة</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.hourly_patterns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الأداء */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* اتجاه الدقة */}
            <Card>
              <CardHeader>
                <CardTitle>اتجاه دقة التصنيف</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.accuracy_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* تحليل الأخطاء */}
            <Card>
              <CardHeader>
                <CardTitle>تحليل الأخطاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.error_analysis.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`h-4 w-4 ${
                          error.impact === 'عالي' ? 'text-red-500' :
                          error.impact === 'متوسط' ? 'text-yellow-500' :
                          'text-green-500'
                        }`} />
                        <span className="font-medium">{error.error_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          error.impact === 'عالي' ? 'destructive' :
                          error.impact === 'متوسط' ? 'secondary' :
                          'outline'
                        }>
                          {error.impact}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{error.frequency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* معايير الأداء */}
          <Card>
            <CardHeader>
              <CardTitle>معايير الأداء التفصيلية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">وقت الاستجابة حسب التعقيد</h4>
                  <div className="space-y-2">
                    {analytics.complexity_distribution.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{item.complexity}</span>
                        <span className="font-medium">{item.avg_time}ث</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">دقة التصنيف حسب النوع</h4>
                  <div className="space-y-2">
                    {analytics.type_distribution.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm">{item.type}</span>
                        <span className="font-medium">{Math.round(85 + Math.random() * 15)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">مؤشرات الجودة</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">الدقة الإجمالية</span>
                      <span className="font-medium text-green-600">89%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">الاستقرار</span>
                      <span className="font-medium text-blue-600">94%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">الموثوقية</span>
                      <span className="font-medium text-purple-600">91%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* المراقبة المباشرة */}
        <TabsContent value="live" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                الاستفسارات المباشرة
              </CardTitle>
              <CardDescription>مراقبة الاستفسارات الواردة في الوقت الفعلي</CardDescription>
            </CardHeader>
            <CardContent>
              {/* أدوات التصفية */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="البحث في الاستفسارات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="نوع الاستفسار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="legal_advice">استشارة قانونية</SelectItem>
                    <SelectItem value="system_data">بيانات النظام</SelectItem>
                    <SelectItem value="mixed">مختلط</SelectItem>
                    <SelectItem value="document_generation">إنتاج الوثائق</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterComplexity} onValueChange={setFilterComplexity}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="مستوى التعقيد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستويات</SelectItem>
                    <SelectItem value="simple">بسيط</SelectItem>
                    <SelectItem value="moderate">متوسط</SelectItem>
                    <SelectItem value="complex">معقد</SelectItem>
                    <SelectItem value="expert_level">مستوى خبير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* قائمة الاستفسارات */}
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredQueries.map((query) => (
                    <div key={query.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium">{query.query}</p>
                          <p className="text-sm text-muted-foreground">
                            {query.timestamp.toLocaleTimeString('ar-KW')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={
                            query.status === 'completed' ? 'default' :
                            query.status === 'processing' ? 'secondary' :
                            'destructive'
                          }>
                            {query.status === 'completed' ? 'مكتمل' :
                             query.status === 'processing' ? 'قيد المعالجة' :
                             'خطأ'}
                          </Badge>
                          <Badge variant="outline" style={{ 
                            backgroundColor: getTypeColor(query.classification.primary_type) + '20',
                            borderColor: getTypeColor(query.classification.primary_type)
                          }}>
                            {query.classification.primary_type}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">التعقيد: </span>
                          <Badge variant="outline" style={{
                            backgroundColor: getComplexityColor(query.classification.complexity_level) + '20',
                            borderColor: getComplexityColor(query.classification.complexity_level)
                          }}>
                            {query.classification.complexity_level}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">الثقة: </span>
                          <span>{Math.round(query.classification.confidence_score * 100)}%</span>
                        </div>
                        {query.response_time && (
                          <div>
                            <span className="font-medium">وقت الاستجابة: </span>
                            <span>{query.response_time}ث</span>
                          </div>
                        )}
                        {query.user_satisfaction && (
                          <div>
                            <span className="font-medium">التقييم: </span>
                            <span>⭐ {query.user_satisfaction}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* التحليل المتقدم */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* تحليل الارتباط */}
            <Card>
              <CardHeader>
                <CardTitle>تحليل العلاقة بين التعقيد والأداء</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.complexity_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="complexity" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg_time" fill="#8884d8" name="متوسط الوقت (ثانية)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* تحليل الاتجاهات */}
            <Card>
              <CardHeader>
                <CardTitle>تحليل الاتجاهات الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.accuracy_trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="volume" stroke="#82ca9d" name="حجم الاستفسارات" />
                    <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="الدقة" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* توصيات التحسين */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                توصيات التحسين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-700">نقاط القوة</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">دقة عالية في تصنيف الاستفسارات البسيطة</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">وقت استجابة سريع للاستعلامات النظامية</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">معدل رضا مستخدمين مرتفع</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3 text-orange-700">فرص التحسين</h4>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <span className="text-sm">تحسين دقة تصنيف الاستفسارات المختلطة</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <span className="text-sm">تقليل وقت معالجة الاستفسارات المعقدة</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                      <span className="text-sm">تطوير نماذج خاصة بالمجالات المتخصصة</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* اختبار التصنيف */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                اختبار خوارزمية التصنيف
              </CardTitle>
              <CardDescription>
                اختبر كيفية تصنيف النظام لاستفسارات مختلفة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="أدخل استفسار للاختبار..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTestClassification} disabled={isLoading || !testQuery.trim()}>
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  تصنيف
                </Button>
              </div>

              {testResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نتيجة التصنيف</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="font-medium">النوع الأساسي:</span>
                        <Badge className="ml-2">{testResult.primary_type}</Badge>
                      </div>
                      <div>
                        <span className="font-medium">مستوى الثقة:</span>
                        <span className="ml-2 font-bold text-green-600">
                          {Math.round(testResult.confidence_score * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">التعقيد:</span>
                        <Badge variant="outline" className="ml-2">{testResult.complexity_level}</Badge>
                      </div>
                      <div>
                        <span className="font-medium">الوقت المتوقع:</span>
                        <span className="ml-2">{testResult.estimated_response_time}ث</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">الفئات الفرعية:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {testResult.sub_categories.map((category, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">النهج المقترح:</span>
                      <Badge variant="secondary" className="ml-2">{testResult.suggested_approach}</Badge>
                    </div>

                    <div>
                      <span className="font-medium">متطلبات البيانات:</span>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(testResult.data_requirements).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            {value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                            <span className="text-sm">{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* أمثلة للاختبار */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">أمثلة للاختبار</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      'ما هي إجراءات تأسيس شركة في الكويت؟',
                      'عرض قائمة العقود المنتهية الصلاحية',
                      'أحتاج إنشاء عقد إيجار لعقار تجاري',
                      'كيفية التعامل مع نزاع عمالي مع موظف؟',
                      'إحصائية العقود الموقعة هذا الشهر',
                      'مذكرة قانونية حول حقوق المستأجر'
                    ].map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto p-3 text-right"
                        onClick={() => setTestQuery(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueryClassificationDashboard;