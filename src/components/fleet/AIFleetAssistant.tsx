import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Brain,
  Car,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  MapPin,
  Fuel,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Zap,
  Lightbulb,
  BarChart3,
  Target,
  Shield,
  Users,
  Route,
  Gauge,
  Battery,
  Thermometer,
  Activity,
  Sparkles,
  Send,
  Loader2,
  Plus,
  Edit,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { AIAssistantConfig } from '@/types/ai-assistant';
import { toast } from 'sonner';

interface AIFleetAssistantProps {
  companyId: string;
  onRecommendationApplied?: (recommendation: FleetRecommendation) => void;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  status: 'active' | 'maintenance' | 'inactive' | 'rented';
  mileage: number;
  fuelLevel: number;
  batteryLevel?: number;
  lastService: Date;
  nextService: Date;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  healthScore: number;
  utilizationRate: number;
  monthlyRevenue: number;
  maintenanceCost: number;
}

interface MaintenanceTask {
  id: string;
  vehicleId: string;
  type: 'routine' | 'repair' | 'inspection' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  estimatedCost: number;
  estimatedDuration: number; // in hours
  dueDate: Date;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  parts?: string[];
}

interface FleetRecommendation {
  id: string;
  type: 'maintenance' | 'optimization' | 'cost_reduction' | 'safety' | 'efficiency';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  estimatedSavings?: number;
  implementationCost?: number;
  roi?: number;
  confidence: number;
  affectedVehicles: string[];
  actionItems: string[];
  timeline: string;
}

interface FleetInsight {
  id: string;
  category: 'performance' | 'costs' | 'utilization' | 'maintenance' | 'safety';
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  comparison: string;
  recommendation?: string;
}

const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    make: 'تويوتا',
    model: 'كامري',
    year: 2022,
    plateNumber: 'أ ب ج 123',
    status: 'active',
    mileage: 45000,
    fuelLevel: 75,
    lastService: new Date('2024-11-15'),
    nextService: new Date('2025-02-15'),
    location: { lat: 24.7136, lng: 46.6753, address: 'الرياض، المملكة العربية السعودية' },
    healthScore: 85,
    utilizationRate: 78,
    monthlyRevenue: 4500,
    maintenanceCost: 800
  },
  {
    id: 'v2',
    make: 'هونداي',
    model: 'إلنترا',
    year: 2021,
    plateNumber: 'د هـ و 456',
    status: 'maintenance',
    mileage: 62000,
    fuelLevel: 30,
    lastService: new Date('2024-10-20'),
    nextService: new Date('2025-01-20'),
    location: { lat: 24.7136, lng: 46.6753, address: 'ورشة الصيانة الرئيسية' },
    healthScore: 65,
    utilizationRate: 45,
    monthlyRevenue: 3200,
    maintenanceCost: 1200
  }
];

export const AIFleetAssistant: React.FC<AIFleetAssistantProps> = ({
  companyId,
  onRecommendationApplied
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [recommendations, setRecommendations] = useState<FleetRecommendation[]>([]);
  const [insights, setInsights] = useState<FleetInsight[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [analysisQuery, setAnalysisQuery] = useState('');

  const aiConfig: AIAssistantConfig = {
    module: 'fleet',
    primitives: ['data_analysis', 'automation', 'ideation_strategy', 'content_creation'],
    context: {
      companyId,
      vehicles,
      maintenanceTasks,
      recommendations
    },
    priority: 'high_value',
    enabledFeatures: []
  };

  const {
    executeTask,
    analyzeData,
    suggestActions,
    isLoading
  } = useAIAssistant(aiConfig);

  // تحليل الأسطول وإنشاء التوصيات
  const analyzeFleet = async () => {
    try {
      // تحليل بيانات الأسطول
      const analysisResult = await analyzeData(
        vehicles,
        'تحليل أداء الأسطول',
        [
          'ما هي المركبات التي تحتاج صيانة؟',
          'كيف يمكن تحسين معدل الاستخدام؟',
          'ما هي الفرص لتقليل التكاليف؟'
        ]
      );

      if (analysisResult) {
        // إنشاء رؤى من التحليل
        const newInsights: FleetInsight[] = [
          {
            id: 'insight_1',
            category: 'utilization',
            title: 'معدل الاستخدام العام',
            description: 'متوسط معدل استخدام الأسطول',
            value: 67,
            trend: 'up',
            comparison: '+5% من الشهر الماضي',
            recommendation: 'تحسين جدولة المركبات لزيادة الاستخدام'
          },
          {
            id: 'insight_2',
            category: 'costs',
            title: 'تكاليف الصيانة',
            description: 'متوسط تكاليف الصيانة الشهرية',
            value: 1000,
            trend: 'down',
            comparison: '-8% من الشهر الماضي',
            recommendation: 'الصيانة الوقائية تقلل التكاليف'
          },
          {
            id: 'insight_3',
            category: 'performance',
            title: 'نقاط الصحة العامة',
            description: 'متوسط نقاط صحة المركبات',
            value: 75,
            trend: 'stable',
            comparison: 'مستقر مقارنة بالشهر الماضي'
          }
        ];
        setInsights(newInsights);

        // الحصول على توصيات
        const actionSuggestions = await suggestActions(
          'تحسين إدارة الأسطول وتقليل التكاليف',
          ['زيادة الكفاءة', 'تقليل تكاليف الصيانة', 'تحسين الأمان'],
          ['الميزانية المحدودة', 'وقت التنفيذ']
        );

        const newRecommendations: FleetRecommendation[] = actionSuggestions.map((suggestion, index) => ({
          id: `rec_${Date.now()}_${index}`,
          type: ['maintenance', 'optimization', 'cost_reduction', 'efficiency'][index % 4] as any,
          title: suggestion.title,
          description: suggestion.description,
          impact: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
          urgency: index < 2 ? 'high' : 'medium',
          estimatedSavings: Math.floor(Math.random() * 5000) + 1000,
          implementationCost: Math.floor(Math.random() * 2000) + 500,
          roi: Math.floor(Math.random() * 200) + 150,
          confidence: suggestion.confidence,
          affectedVehicles: vehicles.slice(0, Math.floor(Math.random() * 3) + 1).map(v => v.id),
          actionItems: [
            'تقييم الوضع الحالي',
            'وضع خطة التنفيذ',
            'تنفيذ التحسينات',
            'مراقبة النتائج'
          ],
          timeline: '2-4 أسابيع'
        }));

        setRecommendations(newRecommendations);
        toast.success('تم تحليل الأسطول بنجاح');
      }
    } catch (error) {
      console.error('Error analyzing fleet:', error);
      toast.error('حدث خطأ في تحليل الأسطول');
    }
  };

  // تنفيذ استعلام مخصص
  const executeCustomQuery = async () => {
    if (!analysisQuery.trim()) return;

    try {
      await executeTask('analyze_data', analysisQuery);
      setAnalysisQuery('');
    } catch (error) {
      console.error('Error executing query:', error);
    }
  };

  // تطبيق توصية
  const applyRecommendation = (recommendation: FleetRecommendation) => {
    onRecommendationApplied?.(recommendation);
    toast.success(`تم تطبيق التوصية: ${recommendation.title}`);
  };

  // تشغيل التحليل عند التحميل
  useEffect(() => {
    analyzeFleet();
  }, []);

  // مكون بطاقة المركبة
  const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => (
    <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
      selectedVehicle?.id === vehicle.id ? 'ring-2 ring-blue-500' : ''
    }`} onClick={() => setSelectedVehicle(vehicle)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-500" />
            <div>
              <h4 className="font-medium text-sm">{vehicle.make} {vehicle.model}</h4>
              <p className="text-xs text-gray-600">{vehicle.plateNumber}</p>
            </div>
          </div>
          <Badge variant={
            vehicle.status === 'active' ? 'default' :
            vehicle.status === 'maintenance' ? 'destructive' :
            vehicle.status === 'rented' ? 'secondary' : 'outline'
          }>
            {vehicle.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>نقاط الصحة</span>
            <span className="font-medium">{vehicle.healthScore}%</span>
          </div>
          <Progress value={vehicle.healthScore} className="h-1" />

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span>{vehicle.mileage.toLocaleString()} كم</span>
            </div>
            <div className="flex items-center gap-1">
              <Fuel className="w-3 h-3" />
              <span>{vehicle.fuelLevel}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>{vehicle.utilizationRate}%</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>{vehicle.monthlyRevenue} ر.س</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // مكون التوصية
  const RecommendationCard: React.FC<{ recommendation: FleetRecommendation }> = ({ recommendation }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {recommendation.type === 'maintenance' && <Wrench className="w-4 h-4 text-orange-500" />}
              {recommendation.type === 'optimization' && <TrendingUp className="w-4 h-4 text-green-500" />}
              {recommendation.type === 'cost_reduction' && <DollarSign className="w-4 h-4 text-blue-500" />}
              {recommendation.type === 'efficiency' && <Zap className="w-4 h-4 text-purple-500" />}
              
              <h4 className="font-medium text-sm">{recommendation.title}</h4>
              
              <Badge variant={recommendation.impact === 'high' ? 'destructive' : recommendation.impact === 'medium' ? 'default' : 'secondary'}>
                {recommendation.impact}
              </Badge>
              
              <Badge variant="outline" className="text-xs">
                {Math.round(recommendation.confidence * 100)}% دقة
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">{recommendation.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {recommendation.estimatedSavings && (
                <div>
                  <span className="text-gray-500">توفير متوقع</span>
                  <p className="font-medium text-green-600">{recommendation.estimatedSavings} ر.س</p>
                </div>
              )}
              {recommendation.implementationCost && (
                <div>
                  <span className="text-gray-500">تكلفة التنفيذ</span>
                  <p className="font-medium">{recommendation.implementationCost} ر.س</p>
                </div>
              )}
              {recommendation.roi && (
                <div>
                  <span className="text-gray-500">العائد على الاستثمار</span>
                  <p className="font-medium text-blue-600">{recommendation.roi}%</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">الإطار الزمني</span>
                <p className="font-medium">{recommendation.timeline}</p>
              </div>
            </div>

            {recommendation.actionItems.length > 0 && (
              <div className="mt-3">
                <h5 className="text-xs font-medium mb-1">خطوات التنفيذ:</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {recommendation.actionItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <Button size="sm" onClick={() => applyRecommendation(recommendation)}>
            تطبيق
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // مكون الرؤية
  const InsightCard: React.FC<{ insight: FleetInsight }> = ({ insight }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            insight.category === 'performance' ? 'bg-blue-100 text-blue-600' :
            insight.category === 'costs' ? 'bg-red-100 text-red-600' :
            insight.category === 'utilization' ? 'bg-green-100 text-green-600' :
            insight.category === 'maintenance' ? 'bg-orange-100 text-orange-600' :
            'bg-purple-100 text-purple-600'
          }`}>
            {insight.category === 'performance' && <Activity className="w-4 h-4" />}
            {insight.category === 'costs' && <DollarSign className="w-4 h-4" />}
            {insight.category === 'utilization' && <BarChart3 className="w-4 h-4" />}
            {insight.category === 'maintenance' && <Wrench className="w-4 h-4" />}
            {insight.category === 'safety' && <Shield className="w-4 h-4" />}
          </div>
          
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold">{insight.value}</span>
              <div className={`flex items-center gap-1 text-xs ${
                insight.trend === 'up' ? 'text-green-600' :
                insight.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {insight.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {insight.trend === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
                <span>{insight.comparison}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600">{insight.description}</p>
            {insight.recommendation && (
              <p className="text-xs text-blue-600 mt-1">💡 {insight.recommendation}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* رأس مساعد الأسطول */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            مساعد إدارة الأسطول الذكي
            <Badge variant="secondary" className="mr-auto">
              <Sparkles className="w-3 h-3 ml-1" />
              مدعوم بالذكاء الاصطناعي
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button onClick={analyzeFleet} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Brain className="w-4 h-4 ml-2" />
              )}
              تحليل الأسطول
            </Button>
            
            <div className="flex-1 flex gap-2">
              <Input
                value={analysisQuery}
                onChange={(e) => setAnalysisQuery(e.target.value)}
                placeholder="اسأل عن الأسطول..."
                className="flex-1"
              />
              <Button onClick={executeCustomQuery} disabled={!analysisQuery.trim() || isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التبويبات */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="vehicles">المركبات</TabsTrigger>
          <TabsTrigger value="recommendations">التوصيات</TabsTrigger>
          <TabsTrigger value="insights">الرؤى</TabsTrigger>
        </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{vehicles.length}</p>
                    <p className="text-sm text-gray-600">إجمالي المركبات</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vehicles.filter(v => v.status === 'active').length}
                    </p>
                    <p className="text-sm text-gray-600">مركبات نشطة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {vehicles.filter(v => v.status === 'maintenance').length}
                    </p>
                    <p className="text-sm text-gray-600">في الصيانة</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {Math.round(vehicles.reduce((acc, v) => acc + v.utilizationRate, 0) / vehicles.length)}%
                    </p>
                    <p className="text-sm text-gray-600">معدل الاستخدام</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* الرؤى السريعة */}
          {insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* المركبات */}
        <TabsContent value="vehicles" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">المركبات ({vehicles.length})</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Filter className="w-4 h-4 ml-1" />
                تصفية
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 ml-1" />
                مركبة جديدة
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(vehicle => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>

          {/* تفاصيل المركبة المحددة */}
          {selectedVehicle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  {selectedVehicle.make} {selectedVehicle.model}
                  <Badge variant="outline">{selectedVehicle.plateNumber}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">المسافة المقطوعة</Label>
                    <p className="font-medium">{selectedVehicle.mileage.toLocaleString()} كم</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">مستوى الوقود</Label>
                    <p className="font-medium">{selectedVehicle.fuelLevel}%</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">معدل الاستخدام</Label>
                    <p className="font-medium">{selectedVehicle.utilizationRate}%</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">الإيرادات الشهرية</Label>
                    <p className="font-medium">{selectedVehicle.monthlyRevenue} ر.س</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 ml-1" />
                    عرض التفاصيل
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 ml-1" />
                    تعديل
                  </Button>
                  <Button size="sm" variant="outline">
                    <Calendar className="w-4 h-4 ml-1" />
                    جدولة صيانة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* التوصيات */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>التوصيات الذكية</span>
                <Badge variant="outline">{recommendations.length} توصية</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {recommendations.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد توصيات حالياً</p>
                    <p className="text-sm">قم بتحليل الأسطول للحصول على توصيات ذكية</p>
                  </div>
                ) : (
                  <div>
                    {recommendations.map(recommendation => (
                      <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الرؤى */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>

          {insights.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد رؤى متاحة حالياً</p>
                <p className="text-sm">قم بتحليل الأسطول للحصول على رؤى مفيدة</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
