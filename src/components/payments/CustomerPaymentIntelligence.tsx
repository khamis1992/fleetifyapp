/**
 * Customer Payment Intelligence Component
 * 
 * Comprehensive customer payment analysis with timeline, patterns, and risk indicators
 * NOTE: This component uses stub data for payment_promises as that table doesn't exist yet
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calculatePaymentScore, type PaymentScore } from '@/lib/paymentCollections';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

interface CustomerPaymentIntelligenceProps {
  companyId: string;
}

export const CustomerPaymentIntelligence: React.FC<CustomerPaymentIntelligenceProps> = ({ companyId }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Fetch customers with overdue invoices
  const { data: customers } = useQuery({
    queryKey: ['customers-with-payments', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .order('first_name');
      
      if (error) throw error;
      // Map to include full name
      return data?.map(c => ({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      })) || [];
    },
  });

  // Fetch selected customer's payment score
  const { data: paymentScore } = useQuery({
    queryKey: ['customer-payment-score', selectedCustomerId, companyId],
    queryFn: () => selectedCustomerId ? calculatePaymentScore(selectedCustomerId, companyId) : null,
    enabled: !!selectedCustomerId,
  });

  // Fetch payment history
  const { data: paymentHistory } = useQuery({
    queryKey: ['customer-payment-history', selectedCustomerId, companyId],
    queryFn: async () => {
      if (!selectedCustomerId) return null;
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*, payments(*)')
        .eq('company_id', companyId)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomerId,
  });

  // Calculate payment patterns
  const paymentPatterns = useMemo(() => {
    if (!paymentHistory) return null;

    const paid = paymentHistory.filter(inv => inv.status === 'paid');
    const overdue = paymentHistory.filter(inv => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      return inv.status === 'overdue' || (dueDate && dueDate < new Date() && inv.status !== 'paid');
    });

    // Calculate average days to pay
    const daysToPayList = paid
      .filter(inv => inv.payments && inv.payments.length > 0)
      .map(inv => {
        const firstPayment = inv.payments[0];
        const dueDate = inv.due_date ? new Date(inv.due_date) : new Date();
        return differenceInDays(new Date(firstPayment.payment_date), dueDate);
      });

    const avgDaysToPay = daysToPayList.length > 0
      ? daysToPayList.reduce((sum, days) => sum + days, 0) / daysToPayList.length
      : 0;

    // Payment frequency (invoices per month)
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    const monthlyInvoices = last6Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const count = paymentHistory.filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate >= monthStart && invDate <= monthEnd;
      }).length;

      return { month: format(month, 'MMM yyyy'), count };
    });

    // Payment method preference
    const paymentMethods = paid
      .flatMap(inv => inv.payments || [])
      .reduce((acc, payment) => {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const preferredMethod = Object.entries(paymentMethods).sort((a, b) => b[1] - a[1])[0];

    return {
      totalInvoices: paymentHistory.length,
      paidCount: paid.length,
      overdueCount: overdue.length,
      avgDaysToPay: Math.round(avgDaysToPay),
      onTimePaymentRate: paid.length > 0 ? (paid.filter(inv => {
        const payment = inv.payments?.[0];
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        return payment && dueDate && new Date(payment.payment_date) <= dueDate;
      }).length / paid.length) * 100 : 0,
      monthlyInvoices,
      preferredMethod: preferredMethod ? preferredMethod[0] : 'None',
      totalRevenue: paid.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      avgInvoiceAmount: paid.length > 0 ? paid.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / paid.length : 0,
    };
  }, [paymentHistory]);

  // Calculate risk indicators
  const riskIndicators = useMemo(() => {
    if (!paymentHistory || !paymentScore) return [];

    const indicators: Array<{
      type: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      icon: React.ReactNode;
    }> = [];

    // Critical: Very low payment score
    if (paymentScore.score < 30) {
      indicators.push({
        type: 'critical',
        title: 'Very Poor Payment Score',
        description: `Payment score of ${paymentScore.score}/100 indicates high risk`,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }

    // Warning: Declining payment trend
    if (paymentScore.trend === 'declining') {
      indicators.push({
        type: 'warning',
        title: 'Declining Payment Behavior',
        description: 'Payment reliability has decreased over past 3 months',
        icon: <TrendingDown className="h-4 w-4" />,
      });
    }

    // Warning: Consistently late payments
    if (paymentPatterns && paymentPatterns.avgDaysToPay > 15) {
      indicators.push({
        type: 'warning',
        title: 'Consistently Late Payments',
        description: `Average ${paymentPatterns.avgDaysToPay} days late on payments`,
        icon: <Clock className="h-4 w-4" />,
      });
    }

    // Info: Improving trend
    if (paymentScore.trend === 'improving') {
      indicators.push({
        type: 'info',
        title: 'Improving Payment Behavior',
        description: 'Recent payment history shows positive trend',
        icon: <TrendingUp className="h-4 w-4" />,
      });
    }

    return indicators;
  }, [paymentHistory, paymentScore, paymentPatterns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Payment Intelligence</h1>
          <p className="text-muted-foreground">
            Detailed payment analysis, patterns, and risk assessment
          </p>
        </div>
      </div>

      {/* Customer Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Select Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCustomerId || ''} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a customer to analyze..." />
            </SelectTrigger>
            <SelectContent>
              {customers?.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Show analysis if customer selected */}
      {selectedCustomerId && paymentScore && paymentPatterns && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <PaymentScoreCard score={paymentScore} />
            <PaymentPatternsOverview patterns={paymentPatterns} />
            <RiskIndicatorsPanel indicators={riskIndicators} score={paymentScore} />
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <PaymentTimeline history={paymentHistory || []} />
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <PaymentPatternsAnalysis patterns={paymentPatterns} />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!selectedCustomerId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">No Customer Selected</p>
              <p className="text-muted-foreground">
                Select a customer above to view their payment intelligence dashboard
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PaymentScoreCardProps {
  score: PaymentScore;
}

const PaymentScoreCard: React.FC<PaymentScoreCardProps> = ({ score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      excellent: 'bg-green-600',
      good: 'bg-blue-600',
      fair: 'bg-yellow-600',
      poor: 'bg-orange-600',
      very_poor: 'bg-red-600',
    };
    return colors[category] || 'bg-slate-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-slate-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Score</CardTitle>
        <CardDescription>
          Overall payment reliability rating (0-100)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Score Display */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
            <div className={`text-6xl font-bold ${getScoreColor(score.score)}`}>
              {score.score}
            </div>
            <div className="text-sm text-muted-foreground mt-2">out of 100</div>
            <div className="flex items-center gap-2 mt-4">
              <Badge className={getCategoryBadge(score.category)}>
                {score.category.replace('_', ' ').toUpperCase()}
              </Badge>
              <div className="flex items-center gap-1">
                {getTrendIcon(score.trend)}
                <span className="text-sm capitalize">{score.trend}</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-4">
            <div className="text-sm font-semibold">Score Breakdown</div>
            <div className="space-y-2">
              {score.breakdown.latePayments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Late Payments</span>
                  <span className="text-red-600">-{score.breakdown.latePayments}</span>
                </div>
              )}
              {score.breakdown.brokenPromises > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Broken Promises</span>
                  <span className="text-red-600">-{score.breakdown.brokenPromises}</span>
                </div>
              )}
              {score.breakdown.disputes > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Disputed Invoices</span>
                  <span className="text-red-600">-{score.breakdown.disputes}</span>
                </div>
              )}
              {score.breakdown.failedPayments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Failed Payments</span>
                  <span className="text-red-600">-{score.breakdown.failedPayments}</span>
                </div>
              )}
              {score.breakdown.earlyPayments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Early Payments</span>
                  <span className="text-green-600">+{score.breakdown.earlyPayments}</span>
                </div>
              )}
              {score.breakdown.bonuses > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bonuses</span>
                  <span className="text-green-600">+{score.breakdown.bonuses}</span>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Last updated: {format(parseISO(score.lastUpdated), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface PaymentPatternsOverviewProps {
  patterns: any;
}

const PaymentPatternsOverview: React.FC<PaymentPatternsOverviewProps> = ({ patterns }) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Payment Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{patterns.onTimePaymentRate.toFixed(1)}%</div>
          <Progress value={patterns.onTimePaymentRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {patterns.paidCount} of {patterns.totalInvoices} invoices paid on time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Average Days to Pay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {patterns.avgDaysToPay > 0 ? '+' : ''}{patterns.avgDaysToPay} days
          </div>
          <div className="flex items-center gap-1 mt-2">
            {patterns.avgDaysToPay <= 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : patterns.avgDaysToPay <= 7 ? (
              <Clock className="h-4 w-4 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-xs text-muted-foreground">
              {patterns.avgDaysToPay <= 0 ? 'Pays early/on-time' : 
               patterns.avgDaysToPay <= 7 ? 'Slightly late' : 'Consistently late'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${patterns.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Avg: ${patterns.avgInvoiceAmount.toFixed(2)} per invoice
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

interface PaymentTimelineProps {
  history: any[];
}

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ history }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History Timeline</CardTitle>
        <CardDescription>Recent payment activity (last 50 invoices)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((invoice, index) => {
            const isPaid = invoice.status === 'paid';
            const isOverdue = !isPaid && invoice.due_date && new Date(invoice.due_date) < new Date();
            const payment = invoice.payments?.[0];

            return (
              <div key={invoice.id} className="flex items-start gap-4 relative">
                {/* Timeline connector */}
                {index < history.length - 1 && (
                  <div className="absolute left-[11px] top-[28px] w-0.5 h-full bg-border" />
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isPaid ? 'bg-green-600' : isOverdue ? 'bg-red-600' : 'bg-yellow-600'
                }`}>
                  {isPaid ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-white" />
                  ) : (
                    <Clock className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(invoice.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={isPaid ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                      {invoice.status}
                    </Badge>
                    <span className="text-sm font-semibold">${invoice.total_amount?.toFixed(2)}</span>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Due: {format(parseISO(invoice.due_date), 'MMM d, yyyy')}</div>
                    {payment && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Paid {format(parseISO(payment.payment_date), 'MMM d, yyyy')} via {payment.payment_method}
                        {differenceInDays(new Date(payment.payment_date), new Date(invoice.due_date)) <= 0 && (
                          <span className="text-xs">(On time)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

interface PaymentPatternsAnalysisProps {
  patterns: any;
}

const PaymentPatternsAnalysis: React.FC<PaymentPatternsAnalysisProps> = ({ patterns }) => {
  return (
    <div className="grid gap-6">
      {/* Monthly Invoice Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Volume Trend</CardTitle>
          <CardDescription>Number of invoices per month (last 6 months)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patterns.monthlyInvoices.map((month: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{month.month}</span>
                  <span className="font-semibold">{month.count} invoices</span>
                </div>
                <Progress value={(month.count / Math.max(...patterns.monthlyInvoices.map((m: any) => m.count), 1)) * 100} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Behavior Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preferred Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{patterns.preferredMethod}</div>
            <p className="text-xs text-muted-foreground mt-2">Most commonly used payment method</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(patterns.paidCount / patterns.totalInvoices * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {patterns.paidCount} of {patterns.totalInvoices} invoices paid
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface RiskIndicatorsPanelProps {
  indicators: Array<{
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    icon: React.ReactNode;
  }>;
  score: PaymentScore;
}

const RiskIndicatorsPanel: React.FC<RiskIndicatorsPanelProps> = ({ indicators, score }) => {
  const criticalCount = indicators.filter(i => i.type === 'critical').length;
  const warningCount = indicators.filter(i => i.type === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {score.score >= 70 ? 'LOW' : score.score >= 40 ? 'MEDIUM' : 'HIGH'}
            </div>
            <Badge className={
              score.score >= 70 ? 'bg-green-600' :
              score.score >= 40 ? 'bg-yellow-600' : 'bg-red-600'
            }>
              Score: {score.score}/100
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critical Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Indicators List */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Indicators</CardTitle>
          <CardDescription>Identified risk factors and concerns</CardDescription>
        </CardHeader>
        <CardContent>
          {indicators.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-semibold text-green-600">No Risk Indicators</p>
              <p className="text-sm text-muted-foreground mt-2">
                This customer shows healthy payment behavior
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {indicators.map((indicator, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    indicator.type === 'critical' ? 'bg-red-50 border-red-200' :
                    indicator.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className={`flex-shrink-0 p-2 rounded-full ${
                    indicator.type === 'critical' ? 'bg-red-600' :
                    indicator.type === 'warning' ? 'bg-yellow-600' :
                    'bg-blue-600'
                  }`}>
                    <div className="text-white">{indicator.icon}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{indicator.title}</div>
                    <div className="text-sm text-muted-foreground">{indicator.description}</div>
                  </div>
                  <Badge variant={
                    indicator.type === 'critical' ? 'destructive' :
                    indicator.type === 'warning' ? 'secondary' : 'default'
                  }>
                    {indicator.type.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerPaymentIntelligence;
