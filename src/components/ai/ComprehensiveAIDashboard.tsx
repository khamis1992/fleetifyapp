import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Activity,
  Zap,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw,
  Download,
  Share,
  Settings,
  Bell,
  Sparkles,
  Eye,
  ArrowRight,
  Calendar,
  Award,
  Shield,
  Lightbulb
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';

interface SystemOverview {
  ai_health_score: number;
  prediction_accuracy: number;
  data_quality_score: number;
  system_performance: number;
  user_satisfaction: number;
  automation_efficiency: number;
}

interface AICapability {
  id: string;
  name: string;
  description: string;
  status: 'operational' | 'training' | 'optimizing' | 'maintenance';
  performance_score: number;
  last_updated: string;
  usage_count: number;
  accuracy_trend: 'up' | 'down' | 'stable';
}

interface AutomatedTask {
  id: string;
  task_name: string;
  category: 'analysis' | 'prediction' | 'optimization' | 'notification';
  status: 'running' | 'completed' | 'scheduled' | 'failed';
  completion_rate: number;
  next_execution: string;
  impact_score: number;
  time_saved_minutes: number;
}

interface IntelligenceMetric {
  metric_name: string;
  current_value: number;
  previous_value: number;
  target_value: number;
  trend: 'improving' | 'declining' | 'stable';
  importance: 'high' | 'medium' | 'low';
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export const ComprehensiveAIDashboard: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [aiCapabilities, setAiCapabilities] = useState<AICapability[]>([]);
  const [automatedTasks, setAutomatedTasks] = useState<AutomatedTask[]>([]);
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<IntelligenceMetric[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate system overview
    setSystemOverview({
      ai_health_score: 94,
      prediction_accuracy: 89,
      data_quality_score: 92,
      system_performance: 96,
      user_satisfaction: 88,
      automation_efficiency: 91
    });

    // Simulate AI capabilities
    setAiCapabilities([
      {
        id: '1',
        name: 'Predictive Analytics Engine',
        description: 'Forecasts business trends and identifies opportunities',
        status: 'operational',
        performance_score: 94,
        last_updated: new Date().toISOString(),
        usage_count: 1247,
        accuracy_trend: 'up'
      },
      {
        id: '2',
        name: 'Risk Assessment AI',
        description: 'Evaluates and predicts potential business risks',
        status: 'operational',
        performance_score: 87,
        last_updated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        usage_count: 856,
        accuracy_trend: 'stable'
      },
      {
        id: '3',
        name: 'Customer Behavior Analyzer',
        description: 'Analyzes customer patterns and predicts churn',
        status: 'optimizing',
        performance_score: 91,
        last_updated: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        usage_count: 1034,
        accuracy_trend: 'up'
      },
      {
        id: '4',
        name: 'Financial Intelligence System',
        description: 'Provides deep financial insights and recommendations',
        status: 'operational',
        performance_score: 88,
        last_updated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        usage_count: 672,
        accuracy_trend: 'up'
      },
      {
        id: '5',
        name: 'Operational Optimization AI',
        description: 'Optimizes business processes and workflows',
        status: 'training',
        performance_score: 82,
        last_updated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        usage_count: 543,
        accuracy_trend: 'up'
      }
    ]);

    // Simulate automated tasks
    setAutomatedTasks([
      {
        id: '1',
        task_name: 'Daily Performance Analysis',
        category: 'analysis',
        status: 'completed',
        completion_rate: 100,
        next_execution: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        impact_score: 9.2,
        time_saved_minutes: 180
      },
      {
        id: '2',
        task_name: 'Revenue Prediction Update',
        category: 'prediction',
        status: 'running',
        completion_rate: 67,
        next_execution: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        impact_score: 8.7,
        time_saved_minutes: 240
      },
      {
        id: '3',
        task_name: 'Risk Alert Generation',
        category: 'notification',
        status: 'scheduled',
        completion_rate: 0,
        next_execution: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        impact_score: 9.5,
        time_saved_minutes: 120
      },
      {
        id: '4',
        task_name: 'Customer Segmentation',
        category: 'analysis',
        status: 'completed',
        completion_rate: 100,
        next_execution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        impact_score: 8.3,
        time_saved_minutes: 300
      },
      {
        id: '5',
        task_name: 'Process Optimization',
        category: 'optimization',
        status: 'running',
        completion_rate: 43,
        next_execution: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        impact_score: 8.9,
        time_saved_minutes: 420
      }
    ]);

    // Simulate intelligence metrics
    setIntelligenceMetrics([
      {
        metric_name: 'Prediction Accuracy',
        current_value: 89.3,
        previous_value: 86.7,
        target_value: 92.0,
        trend: 'improving',
        importance: 'high'
      },
      {
        metric_name: 'Response Time',
        current_value: 1.2,
        previous_value: 1.8,
        target_value: 1.0,
        trend: 'improving',
        importance: 'medium'
      },
      {
        metric_name: 'Data Processing Volume',
        current_value: 15420,
        previous_value: 14230,
        target_value: 20000,
        trend: 'improving',
        importance: 'high'
      },
      {
        metric_name: 'Model Confidence',
        current_value: 87.6,
        previous_value: 87.2,
        target_value: 90.0,
        trend: 'stable',
        importance: 'high'
      },
      {
        metric_name: 'Automation Rate',
        current_value: 73.8,
        previous_value: 69.4,
        target_value: 80.0,
        trend: 'improving',
        importance: 'medium'
      }
    ]);
  }, []);

  const handleRefreshSystem = async () => {
    setIsRefreshing(true);
    try {
      // Here you would call the system refresh API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('System data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh system data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'default';
      case 'training': return 'secondary';
      case 'optimizing': return 'outline';
      case 'maintenance': return 'destructive';
      case 'running': return 'default';
      case 'completed': return 'default';
      case 'scheduled': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analysis': return <BarChart3 className="h-4 w-4" />;
      case 'prediction': return <TrendingUp className="h-4 w-4" />;
      case 'optimization': return <Target className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  // Mock data for charts
  const performanceData = [
    { month: 'Jan', accuracy: 82, efficiency: 75, satisfaction: 80 },
    { month: 'Feb', accuracy: 85, efficiency: 78, satisfaction: 83 },
    { month: 'Mar', accuracy: 87, efficiency: 82, satisfaction: 85 },
    { month: 'Apr', accuracy: 89, efficiency: 85, satisfaction: 87 },
    { month: 'May', accuracy: 91, efficiency: 88, satisfaction: 89 },
    { month: 'Jun', accuracy: 93, efficiency: 91, satisfaction: 91 }
  ];

  const capabilityUsageData = aiCapabilities.map(cap => ({
    name: cap.name.split(' ')[0],
    usage: cap.usage_count,
    performance: cap.performance_score
  }));

  const radarData = [
    { metric: 'Accuracy', value: systemOverview?.prediction_accuracy || 0 },
    { metric: 'Performance', value: systemOverview?.system_performance || 0 },
    { metric: 'Quality', value: systemOverview?.data_quality_score || 0 },
    { metric: 'Satisfaction', value: systemOverview?.user_satisfaction || 0 },
    { metric: 'Efficiency', value: systemOverview?.automation_efficiency || 0 },
    { metric: 'Health', value: systemOverview?.ai_health_score || 0 }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Comprehensive AI Command Center
          <Badge variant="outline" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Advanced Intelligence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="capabilities">AI Capabilities</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI System Health</h3>
              <Button 
                onClick={handleRefreshSystem}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {systemOverview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">AI Health Score</span>
                  </div>
                  <div className="text-2xl font-bold">{systemOverview.ai_health_score}%</div>
                  <Progress value={systemOverview.ai_health_score} className="h-2 mt-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Prediction Accuracy</span>
                  </div>
                  <div className="text-2xl font-bold">{systemOverview.prediction_accuracy}%</div>
                  <Progress value={systemOverview.prediction_accuracy} className="h-2 mt-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Data Quality</span>
                  </div>
                  <div className="text-2xl font-bold">{systemOverview.data_quality_score}%</div>
                  <Progress value={systemOverview.data_quality_score} className="h-2 mt-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Performance</span>
                  </div>
                  <div className="text-2xl font-bold">{systemOverview.system_performance}%</div>
                  <Progress value={systemOverview.system_performance} className="h-2 mt-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">User Satisfaction</span>
                  </div>
                  <div className="text-2xl font-bold">{systemOverview.user_satisfaction}%</div>
                  <Progress value={systemOverview.user_satisfaction} className="h-2 mt-2" />
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Automation Efficiency</span>
                  </div>
                  <div className="text-2xl font-bold">{systemOverview.automation_efficiency}%</div>
                  <Progress value={systemOverview.automation_efficiency} className="h-2 mt-2" />
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="accuracy" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="efficiency" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="satisfaction" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Capabilities Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Performance" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI Capabilities Status</h3>
              <Badge variant="secondary">{aiCapabilities.length} Active Systems</Badge>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {aiCapabilities.map((capability) => (
                  <Card key={capability.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{capability.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {capability.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(capability.status)}>
                            {capability.status}
                          </Badge>
                          {getTrendIcon(capability.accuracy_trend)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Performance</span>
                          <div className="flex items-center gap-2">
                            <Progress value={capability.performance_score} className="h-2 flex-1" />
                            <span className="font-medium">{capability.performance_score}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Usage Count</span>
                          <div className="font-medium">{capability.usage_count.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Updated</span>
                          <div className="font-medium">
                            {new Date(capability.last_updated).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          Accuracy trend: {capability.accuracy_trend}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Monitor
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Capability Usage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={capabilityUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Automated Tasks</h3>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {automatedTasks.filter(t => t.status === 'running').length} Running
                </Badge>
                <Badge variant="secondary">
                  {automatedTasks.filter(t => t.status === 'scheduled').length} Scheduled
                </Badge>
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {automatedTasks.map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(task.category)}
                          <div>
                            <h4 className="font-semibold">{task.task_name}</h4>
                            <div className="text-sm text-muted-foreground capitalize">
                              {task.category} Task
                            </div>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>

                      {task.status === 'running' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{task.completion_rate}%</span>
                          </div>
                          <Progress value={task.completion_rate} className="h-2" />
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Impact Score</span>
                          <div className="font-medium">{task.impact_score}/10</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time Saved</span>
                          <div className="font-medium">{task.time_saved_minutes}min</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next Run</span>
                          <div className="font-medium">
                            {new Date(task.next_execution).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Total Time Saved</h4>
                <div className="text-2xl font-bold text-green-600">
                  {automatedTasks.reduce((sum, task) => sum + task.time_saved_minutes, 0)} minutes
                </div>
                <div className="text-sm text-muted-foreground">This month</div>
              </Card>
              
              <Card className="p-4">
                <h4 className="font-semibold mb-2">Average Impact Score</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {(automatedTasks.reduce((sum, task) => sum + task.impact_score, 0) / automatedTasks.length).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Out of 10.0</div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Intelligence Performance Metrics</h3>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            <div className="space-y-4">
              {intelligenceMetrics.map((metric, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">{metric.metric_name}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getImportanceColor(metric.importance)}>
                          {metric.importance} priority
                        </Badge>
                        {getTrendIcon(metric.trend)}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current</span>
                        <div className="font-bold text-lg">{metric.current_value.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Previous</span>
                        <div className="font-medium">{metric.previous_value.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target</span>
                        <div className="font-medium">{metric.target_value.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Progress</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(metric.current_value / metric.target_value) * 100} 
                            className="h-2 flex-1" 
                          />
                          <span className="font-medium">
                            {((metric.current_value / metric.target_value) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Trend: {metric.trend} | Change: {
                          ((metric.current_value - metric.previous_value) / metric.previous_value * 100).toFixed(1)
                        }%
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All intelligence metrics are performing within expected parameters. 
                The system is operating at optimal efficiency with continuous learning improvements.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};