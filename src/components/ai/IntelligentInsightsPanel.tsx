import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  ArrowRight,
  Eye,
  Download,
  Share,
  Sparkles,
  Target,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

interface AutoInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'forecast';
  category: 'financial' | 'operational' | 'customer' | 'vehicle' | 'employee';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  data_points: any[];
  actionable: boolean;
  created_at: string;
  status: 'new' | 'viewed' | 'actioned' | 'dismissed';
  estimated_value?: number;
  timeline?: string;
}

interface DataPattern {
  id: string;
  pattern_name: string;
  detection_date: string;
  affected_metrics: string[];
  strength: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  description: string;
  trend_direction: 'up' | 'down' | 'stable' | 'volatile';
}

interface PredictiveAlert {
  id: string;
  alert_type: 'cost_increase' | 'revenue_decline' | 'customer_churn' | 'maintenance_due' | 'contract_expiry';
  severity: 'critical' | 'warning' | 'info';
  predicted_date: string;
  probability: number;
  potential_impact: number;
  description: string;
  preventive_actions: string[];
}

export const IntelligentInsightsPanel: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const [activeTab, setActiveTab] = useState('insights');
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<AutoInsight[]>([]);
  const [patterns, setPatterns] = useState<DataPattern[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);

  // Mock data for demonstration
  useEffect(() => {
    // Simulate auto-generated insights
    setInsights([
      {
        id: '1',
        type: 'opportunity',
        category: 'financial',
        title: 'Revenue Growth Opportunity Detected',
        description: 'Customer payment patterns show 23% faster collection when invoices are sent on Tuesdays. Optimize billing schedule for +15% cash flow improvement.',
        impact: 'high',
        confidence: 87,
        data_points: [],
        actionable: true,
        created_at: new Date().toISOString(),
        status: 'new',
        estimated_value: 12000,
        timeline: '2 weeks'
      },
      {
        id: '2',
        type: 'risk',
        category: 'customer',
        title: 'Customer Churn Risk Identified',
        description: '3 high-value customers showing decreased engagement patterns. Intervention needed within 7 days to prevent potential losses.',
        impact: 'high',
        confidence: 92,
        data_points: [],
        actionable: true,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'new',
        estimated_value: 45000,
        timeline: '1 week'
      },
      {
        id: '3',
        type: 'trend',
        category: 'operational',
        title: 'Vehicle Utilization Optimization',
        description: 'Route analysis reveals 18% efficiency gain possible by redistributing vehicle assignments during peak hours.',
        impact: 'medium',
        confidence: 76,
        data_points: [],
        actionable: true,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'viewed',
        estimated_value: 8500,
        timeline: '3 weeks'
      },
      {
        id: '4',
        type: 'anomaly',
        category: 'financial',
        title: 'Unusual Expense Pattern',
        description: 'Maintenance costs increased 34% this month compared to historical average. Investigation recommended for cost centers 401-405.',
        impact: 'medium',
        confidence: 94,
        data_points: [],
        actionable: true,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        status: 'new'
      }
    ]);

    // Simulate detected patterns
    setPatterns([
      {
        id: '1',
        pattern_name: 'Weekly Payment Cycles',
        detection_date: new Date().toISOString(),
        affected_metrics: ['revenue', 'cash_flow'],
        strength: 89,
        frequency: 'weekly',
        description: 'Strong correlation between day of week and payment completion rates',
        trend_direction: 'up'
      },
      {
        id: '2',
        pattern_name: 'Seasonal Vehicle Demand',
        detection_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        affected_metrics: ['bookings', 'revenue'],
        strength: 94,
        frequency: 'seasonal',
        description: 'Consistent 40% increase in bookings during Q4 holiday periods',
        trend_direction: 'up'
      },
      {
        id: '3',
        pattern_name: 'Customer Retention Cycle',
        detection_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        affected_metrics: ['churn_rate', 'lifetime_value'],
        strength: 82,
        frequency: 'monthly',
        description: 'Customer engagement drops significantly after 18-month mark',
        trend_direction: 'down'
      }
    ]);

    // Simulate predictive alerts
    setAlerts([
      {
        id: '1',
        alert_type: 'contract_expiry',
        severity: 'warning',
        predicted_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        probability: 95,
        potential_impact: 25000,
        description: '5 major contracts expiring in next 2 weeks without renewal discussions',
        preventive_actions: [
          'Schedule renewal meetings immediately',
          'Prepare competitive retention offers',
          'Review contract performance metrics'
        ]
      },
      {
        id: '2',
        alert_type: 'maintenance_due',
        severity: 'critical',
        predicted_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        probability: 88,
        potential_impact: 15000,
        description: 'Vehicle maintenance overdue predictions based on usage patterns',
        preventive_actions: [
          'Schedule immediate inspections for flagged vehicles',
          'Prepare maintenance teams for increased workload',
          'Order required parts in advance'
        ]
      },
      {
        id: '3',
        alert_type: 'revenue_decline',
        severity: 'warning',
        predicted_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        probability: 73,
        potential_impact: 35000,
        description: 'Projected 12% revenue decline next month based on booking trends',
        preventive_actions: [
          'Launch targeted marketing campaign',
          'Review pricing strategy',
          'Increase customer outreach efforts'
        ]
      }
    ]);
  }, []);

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      // Here you would call the AI insights generation API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('New insights generated successfully');
      // Refresh insights
    } catch (error) {
      toast.error('Failed to generate insights');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsightAction = async (insightId: string, action: 'view' | 'action' | 'dismiss') => {
    const insight = insights.find(i => i.id === insightId);
    if (!insight) return;

    const updatedInsights = insights.map(i => 
      i.id === insightId 
        ? { ...i, status: action === 'view' ? 'viewed' as const : action === 'action' ? 'actioned' as const : 'dismissed' as const }
        : i
    );
    setInsights(updatedInsights);

    toast.success(`Insight ${action === 'action' ? 'actioned' : action}ed`);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'trend': return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'anomaly': return <Activity className="h-4 w-4 text-orange-500" />;
      case 'forecast': return <Target className="h-4 w-4 text-purple-500" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'volatile': return <Activity className="h-4 w-4 text-orange-500" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Intelligent Insights Engine
          <Badge variant="outline" className="ml-auto">
            <Lightbulb className="h-3 w-3 mr-1" />
            Auto-Generated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">Smart Insights</TabsTrigger>
            <TabsTrigger value="patterns">Data Patterns</TabsTrigger>
            <TabsTrigger value="alerts">Predictive Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI-Generated Insights</h3>
              <Button 
                onClick={handleGenerateInsights}
                disabled={isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate New Insights
                  </>
                )}
              </Button>
            </div>
            
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {insights.map((insight) => (
                  <Card key={insight.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(insight.type)}
                          <div>
                            <h4 className="font-semibold">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getImpactColor(insight.impact)}>
                            {insight.impact} impact
                          </Badge>
                          {insight.status === 'new' && (
                            <Badge variant="secondary">New</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Confidence</span>
                          <div className="flex items-center gap-2">
                            <Progress value={insight.confidence} className="h-2 flex-1" />
                            <span className="font-medium">{insight.confidence}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Category</span>
                          <div className="font-medium capitalize">{insight.category}</div>
                        </div>
                        {insight.estimated_value && (
                          <div>
                            <span className="text-muted-foreground">Est. Value</span>
                            <div className="font-medium">${insight.estimated_value.toLocaleString()}</div>
                          </div>
                        )}
                        {insight.timeline && (
                          <div>
                            <span className="text-muted-foreground">Timeline</span>
                            <div className="font-medium">{insight.timeline}</div>
                          </div>
                        )}
                      </div>
                      
                      {insight.actionable && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4" />
                            <span>Actionable insight</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInsightAction(insight.id, 'view')}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleInsightAction(insight.id, 'action')}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Take Action
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Detected Data Patterns</h3>
              <Badge variant="secondary">{patterns.length} Active Patterns</Badge>
            </div>
            
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {patterns.map((pattern) => (
                  <Card key={pattern.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(pattern.trend_direction)}
                          <h4 className="font-semibold">{pattern.pattern_name}</h4>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {pattern.frequency}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {pattern.description}
                      </p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Pattern Strength</span>
                          <span>{pattern.strength}%</span>
                        </div>
                        <Progress value={pattern.strength} className="h-2" />
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {pattern.affected_metrics.map((metric, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {metric.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Detected {new Date(pattern.detection_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                          <Button size="sm" variant="outline">
                            <Share className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Predictive Alerts</h3>
              <Badge variant="destructive">{alerts.filter(a => a.severity === 'critical').length} Critical</Badge>
            </div>
            
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card key={alert.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === 'critical' ? 'text-red-500' : 
                            alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div>
                            <h4 className="font-semibold capitalize">
                              {alert.alert_type.replace('_', ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {alert.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Probability</span>
                          <div className="flex items-center gap-2">
                            <Progress value={alert.probability} className="h-2 flex-1" />
                            <span className="font-medium">{alert.probability}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Impact</span>
                          <div className="font-medium">${alert.potential_impact.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timeline</span>
                          <div className="font-medium">
                            {new Date(alert.predicted_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium">Recommended Actions:</span>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          {alert.preventive_actions.map((action, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Action required by {new Date(alert.predicted_date).toLocaleDateString()}</span>
                        </div>
                        <Button size="sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Address Alert
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};