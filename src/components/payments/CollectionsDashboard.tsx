/**
 * Collections Dashboard Component
 * 
 * Comprehensive payment tracking and collections management dashboard
 * Features: Command center, priority queue, payment health, customer scores
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';
import {
  getCollectionsSummary,
  getPaymentHealthScore,
  getPriorityCustomers,
  calculatePaymentScore,
  type CollectionsSummary,
  type PaymentHealthScore,
  type PriorityCustomer,
  type PaymentScore,
} from '@/lib/paymentCollections';

interface CollectionsDashboardProps {
  companyId: string;
}

export const CollectionsDashboard: React.FC<CollectionsDashboardProps> = ({
  companyId,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Fetch collections summary
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['collections-summary', companyId],
    queryFn: () => getCollectionsSummary(companyId),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch payment health score
  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['payment-health-score', companyId],
    queryFn: () => getPaymentHealthScore(companyId),
    refetchInterval: 60000,
  });

  // Fetch priority customers
  const { data: priorityCustomers, isLoading: customersLoading, refetch: refetchCustomers } = useQuery({
    queryKey: ['priority-customers', companyId],
    queryFn: () => getPriorityCustomers(companyId),
    refetchInterval: 60000,
  });

  // Fetch selected customer payment score
  const { data: customerScore } = useQuery({
    queryKey: ['customer-payment-score', selectedCustomer, companyId],
    queryFn: () => selectedCustomer ? calculatePaymentScore(selectedCustomer, companyId) : null,
    enabled: !!selectedCustomer,
  });

  const handleRefresh = async () => {
    await Promise.all([refetchSummary(), refetchCustomers()]);
    toast({
      title: "Data Refreshed",
      description: "Collections data has been updated.",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections Command Center</h1>
          <p className="text-muted-foreground">
            Real-time payment tracking and collections management
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Collections Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Overdue"
          value={formatCurrency(summary?.totalOverdue || 0)}
          icon={DollarSign}
          trend={summary?.trend}
          isLoading={summaryLoading}
          variant="critical"
        />
        <SummaryCard
          title="Overdue Customers"
          value={summary?.overdueCustomersCount || 0}
          icon={Users}
          isLoading={summaryLoading}
          variant="warning"
        />
        <SummaryCard
          title="Avg Days Overdue"
          value={summary?.averageDaysOverdue || 0}
          icon={Clock}
          isLoading={summaryLoading}
          variant="info"
        />
        <SummaryCard
          title="Collection Rate"
          value={`${summary?.collectionSuccessRate || 0}%`}
          icon={TrendingUp}
          trend={summary?.trend}
          isLoading={summaryLoading}
          variant="success"
        />
      </div>

      {/* Payment Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Payment Health Score
          </CardTitle>
          <CardDescription>
            Overall payment health based on last 90 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PaymentHealthDisplay healthScore={healthScore} />
          )}
        </CardContent>
      </Card>

      {/* Priority Collections Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Priority Collections Queue
          </CardTitle>
          <CardDescription>
            Top 10 customers requiring immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PriorityCustomersTable
              customers={priorityCustomers || []}
              formatCurrency={formatCurrency}
              onSelectCustomer={setSelectedCustomer}
              selectedCustomer={selectedCustomer}
            />
          )}
        </CardContent>
      </Card>

      {/* Customer Payment Score Detail */}
      {selectedCustomer && customerScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Payment Score Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerScoreDetail score={customerScore} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'improving' | 'stable' | 'worsening';
  isLoading?: boolean;
  variant?: 'success' | 'warning' | 'critical' | 'info';
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  isLoading,
  variant = 'info',
}) => {
  const variantStyles = {
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
  };

  const iconStyles = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
    info: 'text-blue-600',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {trend === 'improving' && <TrendingUp className="h-3 w-3 mr-1 text-green-600" />}
                {trend === 'worsening' && <TrendingDown className="h-3 w-3 mr-1 text-red-600" />}
                <span className="capitalize">{trend}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface PaymentHealthDisplayProps {
  healthScore?: PaymentHealthScore;
}

const PaymentHealthDisplay: React.FC<PaymentHealthDisplayProps> = ({ healthScore }) => {
  if (!healthScore) return null;

  const categoryColors = {
    healthy: 'bg-green-600',
    warning: 'bg-yellow-600',
    critical: 'bg-red-600',
  };

  const categoryLabels = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-4xl font-bold">{healthScore.score}/100</div>
          <Badge className={categoryColors[healthScore.category]}>
            {categoryLabels[healthScore.category]}
          </Badge>
        </div>
        <Progress value={healthScore.score} className="w-48" />
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {healthScore.breakdown.onTime}
          </div>
          <div className="text-xs text-muted-foreground">On Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {healthScore.breakdown.late}
          </div>
          <div className="text-xs text-muted-foreground">Late (1-15d)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {healthScore.breakdown.veryLate}
          </div>
          <div className="text-xs text-muted-foreground">Very Late (16-30d)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {healthScore.breakdown.defaulted}
          </div>
          <div className="text-xs text-muted-foreground">Defaulted (30+d)</div>
        </div>
      </div>
    </div>
  );
};

interface PriorityCustomersTableProps {
  customers: PriorityCustomer[];
  formatCurrency: (amount: number) => string;
  onSelectCustomer: (customerId: string) => void;
  selectedCustomer: string | null;
}

const PriorityCustomersTable: React.FC<PriorityCustomersTableProps> = ({
  customers,
  formatCurrency,
  onSelectCustomer,
  selectedCustomer,
}) => {
  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <p className="text-muted-foreground">No overdue customers! Great job!</p>
      </div>
    );
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 75) return <Badge variant="destructive">Critical</Badge>;
    if (riskScore >= 50) return <Badge className="bg-orange-600">High</Badge>;
    if (riskScore >= 25) return <Badge className="bg-yellow-600">Medium</Badge>;
    return <Badge className="bg-blue-600">Low</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-blue-600">Good</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-600">Fair</Badge>;
    if (score >= 30) return <Badge className="bg-orange-600">Poor</Badge>;
    return <Badge variant="destructive">Very Poor</Badge>;
  };

  return (
    <div className="space-y-2">
      {customers.map((customer, index) => (
        <div
          key={customer.customerId}
          className={`p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors ${
            selectedCustomer === customer.customerId ? 'bg-accent border-primary' : ''
          }`}
          onClick={() => onSelectCustomer(customer.customerId)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-lg">#{index + 1}</span>
                <span className="font-semibold">{customer.customerName}</span>
                {getRiskBadge(customer.riskScore)}
                {getScoreBadge(customer.paymentScore)}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total Overdue</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(customer.totalOverdue)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Days Overdue</div>
                  <div className="text-lg font-bold">{customer.daysOverdue} days</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Risk Score</div>
                  <div className="text-lg font-bold">{customer.riskScore}/100</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Payment Score</div>
                  <div className="text-lg font-bold">{customer.paymentScore}/100</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4">
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
              <Button size="sm" variant="outline">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button size="sm" variant="outline">
                <MessageSquare className="h-4 w-4 mr-1" />
                SMS
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface CustomerScoreDetailProps {
  score: PaymentScore;
}

const CustomerScoreDetail: React.FC<CustomerScoreDetailProps> = ({ score }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-5xl font-bold">{score.score}/100</div>
          <Badge className="mt-2">
            {score.category.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Trend</div>
          <div className="flex items-center gap-2 mt-1">
            {score.trend === 'improving' && <TrendingUp className="h-5 w-5 text-green-600" />}
            {score.trend === 'declining' && <TrendingDown className="h-5 w-5 text-red-600" />}
            <span className="text-lg font-semibold capitalize">{score.trend}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold">Score Breakdown</h4>
        
        <div className="space-y-2">
          <ScoreBreakdownItem
            label="Late Payments"
            value={score.breakdown.latePayments}
            isNegative={score.breakdown.latePayments < 0}
          />
          <ScoreBreakdownItem
            label="Broken Promises"
            value={score.breakdown.brokenPromises}
            isNegative={score.breakdown.brokenPromises < 0}
          />
          <ScoreBreakdownItem
            label="Disputes"
            value={score.breakdown.disputes}
            isNegative={score.breakdown.disputes < 0}
          />
          <ScoreBreakdownItem
            label="Failed Payments"
            value={score.breakdown.failedPayments}
            isNegative={score.breakdown.failedPayments < 0}
          />
          <ScoreBreakdownItem
            label="Early Payments"
            value={score.breakdown.earlyPayments}
            isNegative={false}
          />
          <ScoreBreakdownItem
            label="Bonuses"
            value={score.breakdown.bonuses}
            isNegative={false}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Last updated: {format(new Date(score.lastUpdated), 'PPpp')}
      </div>
    </div>
  );
};

interface ScoreBreakdownItemProps {
  label: string;
  value: number;
  isNegative: boolean;
}

const ScoreBreakdownItem: React.FC<ScoreBreakdownItemProps> = ({
  label,
  value,
  isNegative,
}) => {
  if (value === 0) return null;

  return (
    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
      <span className="text-sm">{label}</span>
      <span className={`font-semibold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
        {value > 0 ? '+' : ''}{value} points
      </span>
    </div>
  );
};

export default CollectionsDashboard;
