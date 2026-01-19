/**
 * Quality Dashboard - CTO Agent Monitoring
 * Displays all agent audit results and quality metrics
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Database, 
  Palette, 
  Zap, 
  Lock, 
  FileText, 
  TestTube,
  Ghost,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Agent configurations
const AGENTS = [
  { id: 'rls_audit', name: 'RLS Audit', icon: Shield, color: '#ef4444' },
  { id: 'migration_safety', name: 'Migration Safety', icon: Database, color: '#f59e0b' },
  { id: 'design_audit', name: 'Design Consistency', icon: Palette, color: '#8b5cf6' },
  { id: 'performance_scan', name: 'Performance', icon: Zap, color: '#22c55e' },
  { id: 'security_scan', name: 'Security', icon: Lock, color: '#ef4444' },
  { id: 'test_coverage', name: 'Test Coverage', icon: TestTube, color: '#3b82f6' },
  { id: 'ghost_review', name: 'Ghost Reviewer', icon: Ghost, color: '#6b7280' },
];

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280'];

export default function QualityDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Fetch audit logs
  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['cto-audit-logs', selectedTimeRange],
    queryFn: async () => {
      const daysAgo = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 1;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('cto_agent_audit')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!auditLogs) return null;

    const total = auditLogs.length;
    const passed = auditLogs.filter(l => l.status === 'pass').length;
    const failed = auditLogs.filter(l => l.status === 'fail').length;
    const critical = auditLogs.filter(l => l.severity === 'critical').length;

    // Group by stage
    const byStage = AGENTS.map(agent => {
      const stageLogs = auditLogs.filter(l => l.stage === agent.id);
      return {
        ...agent,
        total: stageLogs.length,
        passed: stageLogs.filter(l => l.status === 'pass').length,
        failed: stageLogs.filter(l => l.status === 'fail').length,
        lastRun: stageLogs[0]?.created_at
      };
    });

    // Daily trend
    const dailyTrend = auditLogs.reduce((acc, log) => {
      const date = new Date(log.created_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, passed: 0, failed: 0, total: 0 };
      }
      acc[date].total++;
      if (log.status === 'pass') acc[date].passed++;
      if (log.status === 'fail') acc[date].failed++;
      return acc;
    }, {} as Record<string, any>);

    return {
      total,
      passed,
      failed,
      critical,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      byStage,
      dailyTrend: Object.values(dailyTrend).reverse().slice(-7)
    };
  }, [auditLogs]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Passed', value: metrics.passed, color: '#22c55e' },
      { name: 'Failed', value: metrics.failed, color: '#ef4444' },
    ];
  }, [metrics]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    };
    return colors[severity] || 'bg-slate-100 text-slate-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🤖 CTO Agent Dashboard</h1>
          <p className="text-slate-500">Quality & compliance monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Runs</p>
                <p className="text-3xl font-bold">{metrics?.total || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pass Rate</p>
                <p className="text-3xl font-bold text-green-600">{metrics?.passRate || 0}%</p>
              </div>
              {(metrics?.passRate || 0) >= 80 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
            <Progress value={metrics?.passRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Failed Checks</p>
                <p className="text-3xl font-bold text-red-600">{metrics?.failed || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600">{metrics?.critical || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Trend</CardTitle>
                <CardDescription>Pass/Fail over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="passed" stroke="#22c55e" name="Passed" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Failed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Overall check results</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Agent Performance Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Pass/Fail by agent type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics?.byStage || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="passed" fill="#22c55e" name="Passed" />
                  <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics?.byStage.map((agent) => {
              const Icon = agent.icon;
              const passRate = agent.total > 0 ? Math.round((agent.passed / agent.total) * 100) : 0;
              
              return (
                <Card key={agent.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div 
                        className="p-3 rounded-lg" 
                        style={{ backgroundColor: `${agent.color}20` }}
                      >
                        <Icon className="h-6 w-6" style={{ color: agent.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{agent.name}</h3>
                        <p className="text-sm text-slate-500">
                          {agent.total} runs
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pass Rate</span>
                        <span className={passRate >= 80 ? 'text-green-600' : 'text-red-600'}>
                          {passRate}%
                        </span>
                      </div>
                      <Progress value={passRate} className="h-2" />
                      
                      <div className="flex justify-between text-sm text-slate-500 mt-2">
                        <span>✅ {agent.passed} passed</span>
                        <span>❌ {agent.failed} failed</span>
                      </div>
                      
                      {agent.lastRun && (
                        <p className="text-xs text-slate-400 mt-2">
                          Last run: {new Date(agent.lastRun).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Logs</CardTitle>
              <CardDescription>Latest agent activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {auditLogs?.slice(0, 50).map((log: any) => (
                  <div 
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="font-medium text-sm">{log.stage}</p>
                        <p className="text-xs text-slate-500">
                          {log.actor} • {log.branch || 'main'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityBadge(log.severity)}>
                        {log.severity}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
