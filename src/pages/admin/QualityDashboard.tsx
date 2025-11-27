/**
 * CTO Agent Quality Dashboard
 * Displays code quality metrics, audit logs, and deploy gate status
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Code,
  TestTube,
  Rocket,
  Clock,
  TrendingUp,
  TrendingDown,
  FileCode,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== Types =====
interface AuditLog {
  id: string;
  repo: string;
  run_id: string;
  pr_number: number | null;
  branch: string;
  commit_sha: string;
  actor: string;
  stage: string;
  status: 'pass' | 'fail' | 'waived';
  severity: 'critical' | 'warning' | 'info';
  details: Record<string, any>;
  created_at: string;
}

interface DeployGate {
  id: string;
  run_id: string;
  environment: string;
  gate_status: 'pending' | 'approved' | 'rejected';
  lint_passed: boolean;
  typecheck_passed: boolean;
  tests_passed: boolean;
  coverage_passed: boolean;
  security_passed: boolean;
  build_passed: boolean;
  coverage_percent: number;
  bundle_size_kb: number;
  triggered_by: string;
  created_at: string;
  deployed_at: string | null;
}

// ===== Components =====
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    pass: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    waived: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
    rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
    pending: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
  };

  const { icon: Icon, color, bg } = config[status] || config.pending;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', bg, color)}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
};

const StageIcon: React.FC<{ stage: string }> = ({ stage }) => {
  const icons: Record<string, React.ElementType> = {
    static_analysis: Code,
    lint: Code,
    typecheck: FileCode,
    tests: TestTube,
    security: Shield,
    build: Rocket,
    deploy_gate: GitBranch,
    deploy: Rocket,
  };
  const Icon = icons[stage] || Code;
  return <Icon className="w-4 h-4" />;
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, change, icon: Icon, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl p-5 shadow-sm"
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {change !== undefined && (
        <span className={cn(
          'flex items-center gap-1 text-xs font-semibold',
          change >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
    <p className="text-xs text-neutral-500">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
  </motion.div>
);

// ===== Main Component =====
const QualityDashboard: React.FC = () => {
  // Fetch recent audit logs
  const { data: auditLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['cto-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cto_agent_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Fetch deploy gates
  const { data: deployGates, isLoading: gatesLoading } = useQuery({
    queryKey: ['cto-deploy-gates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cto_deploy_gates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as DeployGate[];
    },
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    if (!auditLogs) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = auditLogs.filter(log => new Date(log.created_at) >= today);
    const passCount = todayLogs.filter(log => log.status === 'pass').length;
    const failCount = todayLogs.filter(log => log.status === 'fail').length;
    const successRate = todayLogs.length > 0 ? Math.round((passCount / todayLogs.length) * 100) : 100;

    const avgCoverage = deployGates?.length 
      ? Math.round(deployGates.reduce((acc, g) => acc + (g.coverage_percent || 0), 0) / deployGates.length)
      : 0;

    const deploysToday = deployGates?.filter(g => new Date(g.created_at) >= today).length || 0;

    return {
      totalChecks: todayLogs.length,
      passCount,
      failCount,
      successRate,
      avgCoverage,
      deploysToday,
    };
  }, [auditLogs, deployGates]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (logsLoading || gatesLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-coral-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">🤖 CTO Agent Dashboard</h1>
          <p className="text-sm text-neutral-500">مراقبة جودة الكود والنشر</p>
        </div>
        <button
          onClick={() => refetchLogs()}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-neutral-200 hover:bg-neutral-50"
        >
          <RefreshCw className="w-4 h-4" />
          تحديث
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="إجمالي الفحوصات اليوم"
          value={metrics?.totalChecks || 0}
          icon={Code}
          color="bg-blue-500"
        />
        <MetricCard
          title="معدل النجاح"
          value={`${metrics?.successRate || 100}%`}
          change={metrics?.successRate ? metrics.successRate - 90 : 0}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <MetricCard
          title="متوسط التغطية"
          value={`${metrics?.avgCoverage || 0}%`}
          icon={TestTube}
          color="bg-purple-500"
        />
        <MetricCard
          title="عمليات النشر اليوم"
          value={metrics?.deploysToday || 0}
          icon={Rocket}
          color="bg-coral-500"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Recent Audit Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-8 bg-white rounded-xl shadow-sm"
        >
          <div className="p-4 border-b border-neutral-100">
            <h2 className="font-bold text-neutral-900">سجل التدقيق</h2>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 sticky top-0">
                <tr>
                  <th className="text-right text-xs font-medium text-neutral-500 p-3">المرحلة</th>
                  <th className="text-right text-xs font-medium text-neutral-500 p-3">الفرع</th>
                  <th className="text-right text-xs font-medium text-neutral-500 p-3">المنفذ</th>
                  <th className="text-right text-xs font-medium text-neutral-500 p-3">الحالة</th>
                  <th className="text-right text-xs font-medium text-neutral-500 p-3">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs?.map((log) => (
                  <tr key={log.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <StageIcon stage={log.stage} />
                        <span className="text-sm font-medium">{log.stage}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-neutral-600 font-mono">{log.branch || '-'}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-neutral-600">{log.actor}</span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-neutral-400">{formatDate(log.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!auditLogs || auditLogs.length === 0) && (
              <div className="text-center py-10 text-neutral-400">
                <Code className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>لا توجد سجلات تدقيق</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Deploy Gates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-4 bg-white rounded-xl shadow-sm"
        >
          <div className="p-4 border-b border-neutral-100">
            <h2 className="font-bold text-neutral-900">بوابات النشر</h2>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
            {deployGates?.map((gate) => (
              <div
                key={gate.id}
                className={cn(
                  'p-3 rounded-lg border',
                  gate.gate_status === 'approved' ? 'border-green-200 bg-green-50' :
                  gate.gate_status === 'rejected' ? 'border-red-200 bg-red-50' :
                  'border-amber-200 bg-amber-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-neutral-500">
                    Run #{gate.run_id.slice(-8)}
                  </span>
                  <StatusBadge status={gate.gate_status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {gate.lint_passed ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                    <span>Lint</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {gate.tests_passed ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                    <span>Tests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {gate.security_passed ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                    <span>Security</span>
                  </div>
                </div>
                {gate.coverage_percent && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Coverage</span>
                      <span className="font-semibold">{gate.coverage_percent}%</span>
                    </div>
                    <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          gate.coverage_percent >= 70 ? 'bg-green-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${gate.coverage_percent}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-neutral-400 mt-2">
                  {formatDate(gate.created_at)} • {gate.triggered_by}
                </p>
              </div>
            ))}
            {(!deployGates || deployGates.length === 0) && (
              <div className="text-center py-10 text-neutral-400">
                <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>لا توجد بوابات نشر</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QualityDashboard;

