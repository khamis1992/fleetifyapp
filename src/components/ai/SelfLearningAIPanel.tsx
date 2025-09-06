import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Brain,
  TrendingUp,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  BarChart3,
  Zap,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Star,
  BookOpen,
  Activity
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { StatCardNumber, StatCardPercentage } from '@/components/ui/NumberDisplay';

interface LearningPattern {
  id: string;
  pattern_type: string;
  pattern_data: any;
  success_rate: number;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

interface PerformanceMetric {
  id: string;
  metric_date: string;
  total_queries: number;
  successful_classifications: number;
  clarification_requests: number;
  user_satisfaction_avg: number;
  learning_improvements: number;
}

interface AIRecommendation {
  id: string;
  type: 'process_improvement' | 'cost_optimization' | 'risk_mitigation' | 'growth_opportunity';
  title: string;
  description: string;
  impact_score: number;
  confidence: number;
  actionable_steps: string[];
  estimated_value: number;
  timeline: string;
  priority: 'high' | 'medium' | 'low';
}

export const SelfLearningAIPanel: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const [activeTab, setActiveTab] = React.useState('learning');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [learningPatterns, setLearningPatterns] = React.useState<LearningPattern[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = React.useState<PerformanceMetric[]>([]);
  const [recommendations, setRecommendations] = React.useState<AIRecommendation[]>([]);
  const [feedbackText, setFeedbackText] = React.useState('');

  // Mock data for demonstration
  React.useEffect(() => {
    // Simulate loading learning patterns
    setLearningPatterns([
      {
        id: '1',
        pattern_type: 'customer_behavior',
        pattern_data: { segment: 'premium_customers', preference: 'quarterly_billing' },
        success_rate: 87.5,
        usage_count: 156,
        last_used_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        pattern_type: 'payment_prediction',
        pattern_data: { delay_indicators: ['contract_value', 'customer_history'] },
        success_rate: 92.3,
        usage_count: 89,
        last_used_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        pattern_type: 'vehicle_maintenance',
        pattern_data: { optimization_factors: ['usage_hours', 'route_type'] },
        success_rate: 94.1,
        usage_count: 203,
        last_used_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]);

    // Simulate performance metrics
    setPerformanceMetrics([
      {
        id: '1',
        metric_date: new Date().toISOString().split('T')[0],
        total_queries: 245,
        successful_classifications: 223,
        clarification_requests: 18,
        user_satisfaction_avg: 4.7,
        learning_improvements: 12
      }
    ]);

    // Simulate AI recommendations
    setRecommendations([
      {
        id: '1',
        type: 'cost_optimization',
        title: 'Optimize Vehicle Maintenance Schedule',
        description: 'AI analysis suggests adjusting maintenance intervals based on usage patterns could reduce costs by 15%',
        impact_score: 8.5,
        confidence: 94,
        actionable_steps: [
          'Implement predictive maintenance scheduling',
          'Analyze vehicle usage patterns',
          'Adjust maintenance intervals based on actual wear'
        ],
        estimated_value: 15000,
        timeline: '3 months',
        priority: 'high'
      },
      {
        id: '2',
        type: 'process_improvement',
        title: 'Streamline Contract Approval Process',
        description: 'Pattern analysis shows 78% of contracts follow predictable approval paths',
        impact_score: 7.2,
        confidence: 89,
        actionable_steps: [
          'Create automated approval workflows',
          'Implement smart routing based on contract type',
          'Reduce manual approval steps for standard contracts'
        ],
        estimated_value: 8500,
        timeline: '6 weeks',
        priority: 'medium'
      },
      {
        id: '3',
        type: 'growth_opportunity',
        title: 'Customer Retention Enhancement',
        description: 'AI identifies customers at risk of churn with 91% accuracy',
        impact_score: 9.1,
        confidence: 91,
        actionable_steps: [
          'Implement proactive customer outreach',
          'Offer personalized retention packages',
          'Monitor satisfaction indicators in real-time'
        ],
        estimated_value: 25000,
        timeline: '2 months',
        priority: 'high'
      }
    ]);
  }, []);

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Here you would call the AI learning API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Feedback submitted successfully. AI will learn from your input.');
      setFeedbackText('');
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTrainModel = async () => {
    setIsAnalyzing(true);
    try {
      // Here you would call the model training API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('Model training initiated. Performance improvements will be visible in 24-48 hours.');
    } catch (error) {
      toast.error('Failed to initiate model training');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cost_optimization': return <TrendingUp className="h-4 w-4" />;
      case 'process_improvement': return <Target className="h-4 w-4" />;
      case 'risk_mitigation': return <AlertCircle className="h-4 w-4" />;
      case 'growth_opportunity': return <Lightbulb className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Self-Learning AI System
          <Badge variant="outline" className="ml-auto">
            <Activity className="h-3 w-3 mr-1" />
            Active Learning
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="learning">Learning Patterns</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="training">Model Training</TabsTrigger>
          </TabsList>

          <TabsContent value="learning" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Active Learning Patterns</h3>
                <Badge variant="secondary">
                  {learningPatterns.length} Patterns
                </Badge>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {learningPatterns.map((pattern) => (
                    <Card key={pattern.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium capitalize">
                              {pattern.pattern_type.replace('_', ' ')}
                            </span>
                          </div>
                          <Badge variant="outline">
                            {pattern.success_rate}% Success Rate
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Performance</span>
                            <span>{pattern.success_rate}%</span>
                          </div>
                          <Progress value={pattern.success_rate} className="h-2" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{pattern.usage_count} Uses</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>Last used today</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Total Queries</span>
                </div>
                <div className="text-2xl font-bold">
                  <StatCardNumber value={245} />
                </div>
                <div className="text-xs text-muted-foreground">Today</div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  <StatCardPercentage value={91} />
                </div>
                <div className="text-xs text-muted-foreground">+2% from yesterday</div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Satisfaction</span>
                </div>
                <div className="text-2xl font-bold">
                  <StatCardNumber value={4.7} />
                </div>
                <div className="text-xs text-muted-foreground">Out of 5.0</div>
              </Card>
            </div>
            
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Learning Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Pattern Recognition</span>
                    <span>87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Prediction Accuracy</span>
                    <span>94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Response Quality</span>
                    <span>91%</span>
                  </div>
                  <Progress value={91} className="h-2" />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">AI-Powered Recommendations</h3>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <Card key={rec.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(rec.type)}
                          <div>
                            <h4 className="font-semibold">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                          </div>
                        </div>
                        <Badge variant={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Impact Score</span>
                          <div className="font-medium">{rec.impact_score}/10</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Confidence</span>
                          <div className="font-medium">{rec.confidence}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Est. Value</span>
                          <div className="font-medium">${rec.estimated_value.toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium">Action Steps:</span>
                        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                          {rec.actionable_steps.map((step, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Timeline: {rec.timeline}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Provide Feedback for AI Learning</h3>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Share your feedback about AI performance, suggestions for improvement, or report any issues..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleSubmitFeedback}
                    disabled={isAnalyzing || !feedbackText.trim()}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </div>
              </Card>
              
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Model Training</h3>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Train the AI model with recent data to improve performance and accuracy.
                    This process may take several hours to complete.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleTrainModel}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Training...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Start Training
                        </>
                      )}
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      Last training: 2 days ago
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Training Progress</span>
                      <span>Complete</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};