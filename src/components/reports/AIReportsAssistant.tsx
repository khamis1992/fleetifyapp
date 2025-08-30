import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Brain,
  BarChart3,
  FileText,
  TrendingUp,
  Download,
  Send,
  Loader2,
  Calendar,
  Filter,
  Eye,
  Share,
  Settings,
  Sparkles,
  Target,
  DollarSign,
  Users,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Lightbulb,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIAssistantConfig, AIDataAnalysisResult } from '@/types/ai-assistant';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

interface AIReportsAssistantProps {
  companyId: string;
  onReportGenerated?: (report: GeneratedReport) => void;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'fleet' | 'hr' | 'customers' | 'legal' | 'custom';
  fields: ReportField[];
  charts: ChartConfig[];
  schedule?: ScheduleConfig;
}

interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'radar' | 'area';
  title: string;
  dataSource: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time: string;
  recipients: string[];
  enabled: boolean;
}

interface GeneratedReport {
  id: string;
  title: string;
  description: string;
  category: string;
  data: any[];
  charts: ChartData[];
  insights: string[];
  recommendations: string[];
  generatedAt: Date;
  confidence: number;
  metadata: {
    dataPoints: number;
    processingTime: number;
    sources: string[];
  };
}

interface ChartData {
  id: string;
  type: string;
  title: string;
  data: any[];
  config: any;
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'financial_summary',
    name: 'التقرير المالي الشامل',
    description: 'تقرير شامل للوضع المالي والإيرادات والمصروفات',
    category: 'financial',
    fields: [
      { id: 'period', name: 'الفترة الزمنية', type: 'select', required: true, options: ['شهري', 'ربع سنوي', 'سنوي'] },
      { id: 'include_forecast', name: 'تضمين التوقعات', type: 'boolean', required: false, defaultValue: true }
    ],
    charts: [
      { id: 'revenue_trend', type: 'line', title: 'اتجاه الإيرادات', dataSource: 'revenue_data', xAxis: 'month', yAxis: 'amount' },
      { id: 'expense_breakdown', type: 'pie', title: 'تفصيل المصروفات', dataSource: 'expense_data' }
    ]
  },
  {
    id: 'fleet_performance',
    name: 'تقرير أداء الأسطول',
    description: 'تحليل شامل لأداء المركبات والصيانة والاستخدام',
    category: 'fleet',
    fields: [
      { id: 'vehicle_type', name: 'نوع المركبة', type: 'select', required: false, options: ['جميع الأنواع', 'سيارات', 'شاحنات', 'دراجات'] },
      { id: 'include_maintenance', name: 'تضمين بيانات الصيانة', type: 'boolean', required: false, defaultValue: true }
    ],
    charts: [
      { id: 'utilization_rate', type: 'bar', title: 'معدل الاستخدام', dataSource: 'utilization_data' },
      { id: 'maintenance_costs', type: 'line', title: 'تكاليف الصيانة', dataSource: 'maintenance_data' }
    ]
  },
  {
    id: 'customer_analysis',
    name: 'تحليل العملاء',
    description: 'تقرير مفصل عن سلوك العملاء ومعدلات الرضا',
    category: 'customers',
    fields: [
      { id: 'segment', name: 'شريحة العملاء', type: 'select', required: false, options: ['جميع الشرائح', 'VIP', 'عاديين', 'جدد'] },
      { id: 'include_satisfaction', name: 'تضمين مؤشرات الرضا', type: 'boolean', required: false, defaultValue: true }
    ],
    charts: [
      { id: 'customer_growth', type: 'line', title: 'نمو العملاء', dataSource: 'customer_data' },
      { id: 'satisfaction_score', type: 'radar', title: 'مؤشرات الرضا', dataSource: 'satisfaction_data' }
    ]
  }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AIReportsAssistant: React.FC<AIReportsAssistantProps> = ({
  companyId,
  onReportGenerated
}) => {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportParameters, setReportParameters] = useState<Record<string, any>>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [customQuery, setCustomQuery] = useState('');
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const aiConfig: AIAssistantConfig = {
    module: 'reports',
    primitives: ['data_analysis', 'content_creation', 'automation', 'ideation_strategy'],
    context: {
      companyId,
      selectedTemplate,
      reportParameters,
      dateRange
    },
    priority: 'quick_win',
    enabledFeatures: []
  };

  const {
    executeTask,
    analyzeData,
    generateContent,
    isLoading
  } = useAIAssistant(aiConfig);

  // توليد تقرير باستخدام القالب
  const generateTemplateReport = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      // محاكاة بيانات للتقرير
      const mockData = generateMockData(selectedTemplate);
      
      // تحليل البيانات
      const analysisResult = await analyzeData(
        mockData,
        `تحليل ${selectedTemplate.name}`,
        ['ما هي الاتجاهات الرئيسية؟', 'ما هي التوصيات المقترحة؟']
      );

      if (analysisResult) {
        const newReport: GeneratedReport = {
          id: `report_${Date.now()}`,
          title: selectedTemplate.name,
          description: selectedTemplate.description,
          category: selectedTemplate.category,
          data: mockData,
          charts: generateChartData(selectedTemplate.charts, mockData),
          insights: analysisResult.insights,
          recommendations: analysisResult.recommendations,
          generatedAt: new Date(),
          confidence: analysisResult.confidence,
          metadata: {
            dataPoints: mockData.length,
            processingTime: 2.5,
            sources: ['Database', 'AI Analysis']
          }
        };

        setGeneratedReports(prev => [newReport, ...prev]);
        onReportGenerated?.(newReport);
        toast.success('تم إنشاء التقرير بنجاح');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('حدث خطأ في إنشاء التقرير');
    } finally {
      setIsGenerating(false);
    }
  };

  // توليد تقرير مخصص
  const generateCustomReport = async () => {
    if (!customQuery.trim()) return;

    setIsGenerating(true);
    try {
      const content = await generateContent(
        'تقرير مخصص',
        customQuery,
        'قالب تقرير تحليلي'
      );

      if (content) {
        const newReport: GeneratedReport = {
          id: `custom_report_${Date.now()}`,
          title: 'تقرير مخصص',
          description: customQuery,
          category: 'custom',
          data: [],
          charts: [],
          insights: [content.content],
          recommendations: ['مراجعة البيانات بانتظام', 'تحديث المؤشرات حسب الحاجة'],
          generatedAt: new Date(),
          confidence: 0.85,
          metadata: {
            dataPoints: 0,
            processingTime: 1.8,
            sources: ['AI Generation']
          }
        };

        setGeneratedReports(prev => [newReport, ...prev]);
        onReportGenerated?.(newReport);
        toast.success('تم إنشاء التقرير المخصص بنجاح');
      }
    } catch (error) {
      console.error('Error generating custom report:', error);
      toast.error('حدث خطأ في إنشاء التقرير المخصص');
    } finally {
      setIsGenerating(false);
    }
  };

  // توليد بيانات وهمية للاختبار
  const generateMockData = (template: ReportTemplate) => {
    const data = [];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    
    for (let i = 0; i < months.length; i++) {
      data.push({
        month: months[i],
        revenue: Math.floor(Math.random() * 100000) + 50000,
        expenses: Math.floor(Math.random() * 60000) + 30000,
        customers: Math.floor(Math.random() * 500) + 200,
        vehicles: Math.floor(Math.random() * 50) + 20,
        utilization: Math.floor(Math.random() * 40) + 60,
        satisfaction: Math.floor(Math.random() * 20) + 80
      });
    }
    
    return data;
  };

  // توليد بيانات الرسوم البيانية
  const generateChartData = (chartConfigs: ChartConfig[], data: any[]): ChartData[] => {
    return chartConfigs.map(config => ({
      id: config.id,
      type: config.type,
      title: config.title,
      data: data,
      config: {
        colors: COLORS,
        ...config
      }
    }));
  };

  // مكون قالب التقرير
  const TemplateCard: React.FC<{ template: ReportTemplate }> = ({ template }) => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={() => setSelectedTemplate(template)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500 text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">{template.name}</h4>
            <p className="text-xs text-gray-600 mb-2">{template.description}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {template.charts.length} رسم بياني
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // مكون التقرير المُنشأ
  const ReportCard: React.FC<{ report: GeneratedReport }> = ({ report }) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            {report.title}
            <Badge variant="outline" className="text-xs">
              {Math.round(report.confidence * 100)}% دقة
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost">
              <Eye className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Share className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{report.description}</p>
        
        {/* الرسوم البيانية */}
        {report.charts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.charts.map(chart => (
              <div key={chart.id} className="h-64">
                <h4 className="text-sm font-medium mb-2">{chart.title}</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <div>
                    {chart.type === 'bar' && (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#0088FE" />
                      </BarChart>
                    )}
                    {chart.type === 'line' && (
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} />
                      </LineChart>
                    )}
                    {chart.type === 'pie' && (
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'الإيرادات', value: 60 },
                            { name: 'المصروفات', value: 40 }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[{ name: 'الإيرادات', value: 60 }, { name: 'المصروفات', value: 40 }].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    )}
                  </div>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

        {/* الرؤى والتوصيات */}
        {report.insights.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              الرؤى الرئيسية
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {report.insights.map((insight, index) => (
                <li key={index}>• {insight}</li>
              ))}
            </ul>
          </div>
        )}

        {report.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              التوصيات
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {report.recommendations.map((recommendation, index) => (
                <li key={index}>• {recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* معلومات التقرير */}
        <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {report.generatedAt.toLocaleString('ar-SA')}
          </span>
          <span>{report.metadata.dataPoints} نقطة بيانات</span>
          <span>{report.metadata.processingTime}s معالجة</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* رأس مساعد التقارير */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-green-600" />
            مساعد التقارير الذكي
            <Badge variant="secondary" className="mr-auto">
              <Sparkles className="w-3 h-3 ml-1" />
              مدعوم بالذكاء الاصطناعي
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* التبويبات */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">إنشاء تقرير</TabsTrigger>
          <TabsTrigger value="reports">التقارير المُنشأة</TabsTrigger>
          <TabsTrigger value="templates">القوالب</TabsTrigger>
        </TabsList>

        {/* تبويب إنشاء التقرير */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* القوالب المتاحة */}
            <Card>
              <CardHeader>
                <CardTitle>اختر قالب التقرير</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </CardContent>
            </Card>

            {/* إعدادات التقرير */}
            <Card>
              <CardHeader>
                <CardTitle>إعدادات التقرير</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplate ? (
                  <>
                    {/* حقول القالب */}
                    {selectedTemplate.fields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.name}</Label>
                        {field.type === 'select' && (
                          <Select
                            value={reportParameters[field.id] || ''}
                            onValueChange={(value) => 
                              setReportParameters(prev => ({ ...prev, [field.id]: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر..." />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === 'boolean' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={reportParameters[field.id] || field.defaultValue}
                              onChange={(e) => 
                                setReportParameters(prev => ({ ...prev, [field.id]: e.target.checked }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* نطاق التاريخ */}
                    <div className="space-y-2">
                      <Label>الفترة الزمنية</Label>
                      <DatePickerWithRange
                        date={dateRange}
                        onDateChange={setDateRange}
                      />
                    </div>

                    <Button 
                      onClick={generateTemplateReport}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : (
                        <BarChart3 className="w-4 h-4 ml-2" />
                      )}
                      إنشاء التقرير
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>اختر قالب تقرير للبدء</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* تقرير مخصص */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                إنشاء تقرير مخصص
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="اكتب وصفاً مفصلاً للتقرير الذي تريد إنشاءه..."
                className="min-h-[100px]"
              />
              <Button 
                onClick={generateCustomReport}
                disabled={!customQuery.trim() || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Send className="w-4 h-4 ml-2" />
                )}
                إنشاء تقرير مخصص
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب التقارير المُنشأة */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>التقارير المُنشأة</span>
                <Badge variant="outline">{generatedReports.length} تقرير</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {generatedReports.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد تقارير مُنشأة حالياً</p>
                    <p className="text-sm">استخدم تبويب "إنشاء تقرير" لإنشاء تقرير جديد</p>
                  </div>
                ) : (
                  <div>
                    {generatedReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب القوالب */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>قوالب التقارير</span>
                <Button size="sm">
                  <Plus className="w-4 h-4 ml-1" />
                  قالب جديد
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTemplates.map(template => (
                  <Card key={template.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                          <p className="text-xs text-gray-600">{template.description}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.fields.length} حقل
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.charts.length} رسم
                        </Badge>
                      </div>

                      <Button size="sm" className="w-full">
                        استخدام القالب
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
