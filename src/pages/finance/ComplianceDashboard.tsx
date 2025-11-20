/**
 * Compliance Dashboard Component
 * FIN-003: Multi-Currency and Compliance System
 *
 * Comprehensive dashboard for monitoring currency exposure,
 * compliance status, and regulatory requirements.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Shield,
  FileText,
  Calendar,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { useCurrencyManager, useCurrencyCompliance, useCurrencyRiskMonitor } from '@/hooks/useCurrencyManager';
import { EnhancedCurrencyUtils } from '@/utils/enhancedCurrencyUtils';
import { toast } from 'sonner';
import type { CurrencyExposureReport, ComplianceCalendar, RegulatoryReport } from '@/types/finance.types';

interface ComplianceDashboardProps {
  companyId: string;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ companyId }) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const {
    currencyExposure,
    supportedCurrencies,
    isLoading: currencyLoading,
    refetchExposure,
    updateRates
  } = useCurrencyManager({ companyId, autoUpdateRates: true });

  const {
    complianceSummary,
    upcomingDeadlines,
    isLoading: complianceLoading,
    refetchCompliance
  } = useCurrencyCompliance(companyId);

  const {
    exposureReports,
    riskIndicators,
    isLoading: riskLoading
  } = useCurrencyRiskMonitor(companyId);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchExposure(),
        refetchCompliance()
      ]);
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateRates = async () => {
    try {
      await updateRates();
      toast.success('Exchange rates updated successfully');
    } catch (error) {
      toast.error('Failed to update exchange rates');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'non_compliant':
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'pending_review':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const totalExposure = currencyExposure?.reduce(
    (sum, exposure) => sum + Math.abs(exposure.total_exposure),
    0
  ) || 0;

  const highRiskCount = currencyExposure?.filter(
    exposure => exposure.risk_level === 'high' || exposure.risk_level === 'critical'
  ).length || 0;

  const urgentDeadlines = upcomingDeadlines?.filter(
    deadline => deadline.priority === 'critical' || deadline.priority === 'high'
  ).length || 0;

  if (currencyLoading || complianceLoading || riskLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading compliance dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600">Monitor currency exposure and regulatory compliance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleUpdateRates}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Update Rates
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {EnhancedCurrencyUtils.formatCurrency(totalExposure, 'QAR')}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {supportedCurrencies?.length || 0} currencies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceSummary?.complianceScore || 0}%
            </div>
            <Progress value={complianceSummary?.complianceScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {highRiskCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {complianceSummary?.pending_actions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {urgentDeadlines} urgent deadlines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="exposure">Currency Exposure</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Risk Indicators */}
          {riskIndicators && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getRiskIcon(riskIndicators.riskLevel)}
                      <span className="font-medium">Overall Risk Level</span>
                    </div>
                    <Badge className={getStatusColor(riskIndicators.riskLevel)}>
                      {riskIndicators.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Risk Score</div>
                    <div className="text-2xl font-bold">
                      {riskIndicators.totalRiskScore.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Volatility Currencies</div>
                    <div className="text-lg font-semibold">
                      {Object.keys(riskIndicators.currencyVolatility).length}
                    </div>
                  </div>
                </div>

                {riskIndicators.hedgingRecommendations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Hedging Recommendations</h4>
                    <div className="space-y-2">
                      {riskIndicators.hedgingRecommendations.map((recommendation, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{recommendation}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Compliance Validations */}
          {complianceSummary?.recent_validations && complianceSummary.recent_validations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Compliance Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceSummary.recent_validations.slice(0, 5).map((validation) => (
                    <div key={validation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{validation.entity_type}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(validation.validated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(validation.validation_result)}>
                          {validation.validation_result}
                        </Badge>
                        {validation.action_required && (
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exposure" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exposureReports?.map((exposure) => (
              <Card key={exposure.currency}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{exposure.currency} Exposure</span>
                    <Badge className={getStatusColor(exposure.risk_level)}>
                      {exposure.risk_level}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Total Exposure</div>
                        <div className="text-lg font-semibold">
                          {EnhancedCurrencyUtils.formatCurrency(exposure.total_exposure, exposure.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Net Exposure</div>
                        <div className="text-lg font-semibold">
                          {EnhancedCurrencyUtils.formatCurrency(exposure.net_exposure, exposure.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Hedged Amount</div>
                        <div className="text-lg font-semibold">
                          {EnhancedCurrencyUtils.formatCurrency(exposure.hedged_amount, exposure.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Hedge Coverage</div>
                        <div className="text-lg font-semibold">
                          {exposure.total_exposure > 0
                            ? ((exposure.hedged_amount / exposure.total_exposure) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Receivables</span>
                        <span>{EnhancedCurrencyUtils.formatCurrency(exposure.receivables, exposure.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Payables</span>
                        <span>{EnhancedCurrencyUtils.formatCurrency(exposure.payables, exposure.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Investments</span>
                        <span>{EnhancedCurrencyUtils.formatCurrency(exposure.investments, exposure.currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Loans</span>
                        <span>{EnhancedCurrencyUtils.formatCurrency(exposure.loans, exposure.currency)}</span>
                      </div>
                    </div>

                    {exposure.hedging_recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recommended Actions</h4>
                        <div className="space-y-1">
                          {exposure.hedging_recommendations.map((rec, index) => (
                            <div key={index} className="text-sm p-2 bg-blue-50 rounded">
                              {rec.description}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {complianceSummary?.total_rules || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Validations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {complianceSummary?.active_validations || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overdue Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {complianceSummary?.overdue_reports || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>High Risk Entities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {complianceSummary?.high_risk_entities || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {complianceSummary?.pending_actions || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {complianceSummary?.complianceScore || 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deadlines" className="space-y-6">
          {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <Card key={deadline.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{deadline.event_title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{deadline.event_description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-gray-600">
                            Due: {new Date(deadline.due_date).toLocaleDateString()}
                          </span>
                          <Badge className={getStatusColor(deadline.priority)}>
                            {deadline.priority}
                          </Badge>
                          {deadline.jurisdiction && (
                            <Badge variant="outline">{deadline.jurisdiction}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Deadlines</h3>
                <p className="text-gray-600">All compliance deadlines are up to date</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Regulatory Reports</h3>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Generate New Report
            </Button>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Regulatory report generation and management will be available in the next phase.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};