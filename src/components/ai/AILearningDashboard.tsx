import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  MessageSquare,
  Target,
  Clock,
  Star,
  BarChart3,
  RefreshCw,
  Lightbulb,
  Activity
} from 'lucide-react';
import { useSelfLearningAI, PerformanceMetrics } from '@/hooks/useSelfLearningAI';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StatCardNumber, StatCardPercentage } from '@/components/ui/NumberDisplay';

interface LearningPattern {
  id: string;
  pattern_type: string;
  usage_count: number;
  success_rate: number;
  created_at: string;
  pattern_data: any;
}

interface RecentQuery {
  id: string;
  original_query: string;
  intent_classification: string;
  confidence_score: number;
  user_confirmed: boolean;
  created_at: string;
}

export const AILearningDashboard: React.FC = () => {
  const { getPerformanceMetrics } = useSelfLearningAI();
  const [metrics, setMetrics] = React.useState<PerformanceMetrics[]>([]);
  const [patterns, setPatterns] = React.useState<LearningPattern[]>([]);
  const [recentQueries, setRecentQueries] = React.useState<RecentQuery[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load performance metrics for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const metricsData = await getPerformanceMetrics(
        thirtyDaysAgo.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      );
      setMetrics(metricsData);

      // Load learning patterns
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.user.id)
          .single();

        if (profile) {
          // Get learning patterns
          const { data: patternsData } = await supabase
            .from('ai_learning_patterns')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('usage_count', { ascending: false })
            .limit(10);

          if (patternsData) setPatterns(patternsData);

          // Get recent queries
          const { data: queriesData } = await supabase
            .from('ai_query_intents')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (queriesData) setRecentQueries(queriesData);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const latestMetrics = metrics[0] || {
    total_queries: 0,
    successful_classifications: 0,
    clarification_requests: 0,
    user_satisfaction_avg: 0,
    learning_improvements: 0,
    response_time_avg: 0
  };

  const successRate = latestMetrics.total_queries > 0 
    ? (latestMetrics.successful_classifications / latestMetrics.total_queries) * 100 
    : 0;

  const clarificationRate = latestMetrics.total_queries > 0 
    ? (latestMetrics.clarification_requests / latestMetrics.total_queries) * 100 
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading AI learning data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Learning Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor and analyze AI performance and learning progress
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <StatCardPercentage value={successRate} className="text-green-600" />
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Queries</p>
                <StatCardNumber value={latestMetrics.total_queries} />
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Satisfaction</p>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <StatCardNumber value={latestMetrics.user_satisfaction_avg.toFixed(1)} className="inline" />
                  <Star className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Learning Patterns</p>
                <StatCardNumber value={patterns.length} className="text-purple-600" />
              </div>
              <Lightbulb className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="patterns">Learning Patterns</TabsTrigger>
          <TabsTrigger value="queries">Recent Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Classification Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Successful Classifications</span>
                    <span>{latestMetrics.successful_classifications}</span>
                  </div>
                  <Progress value={successRate} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Clarification Needed</span>
                    <span>{latestMetrics.clarification_requests}</span>
                  </div>
                  <Progress value={clarificationRate} className="bg-orange-100" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Response Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Response Time</span>
                  <Badge variant="outline">
                    {latestMetrics.response_time_avg.toFixed(2)}s
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Learning Improvements</span>
                  <Badge variant="secondary">
                    {latestMetrics.learning_improvements}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Learning Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.pattern_type}</Badge>
                        <span className="text-sm font-medium">
                          Used {pattern.usage_count} times
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Success Rate: {(pattern.success_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <Progress value={pattern.success_rate * 100} className="w-20" />
                  </div>
                ))}
                
                {patterns.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No learning patterns yet. Start using the AI to build patterns!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentQueries.map((query) => (
                  <div key={query.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{query.original_query}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {query.intent_classification}
                        </Badge>
                        <Badge 
                          variant={query.user_confirmed ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {query.user_confirmed ? "Confirmed" : "Unconfirmed"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {(query.confidence_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(query.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentQueries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No recent queries. Start asking the AI questions!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};