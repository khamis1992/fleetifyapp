/**
 * Enhanced Contract Dashboard Component
 *
 * Comprehensive dashboard showcasing enhanced contract management
 * features including calculations, workflows, compliance, and analytics.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Icons
import {
  Calculator,
  Workflow,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  Settings,
  Eye,
  Edit,
  Play,
  Pause,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  Calendar,
  Target,
  Zap,
  Database,
  GitBranch,
  FileCheck,
  AlertCircle
} from 'lucide-react';

// Hooks
import { useEnhancedContractManagement } from '@/hooks/useEnhancedContractManagement';
import { useToast } from '@/hooks/use-toast-mock';

interface EnhancedContractDashboardProps {
  contractId: string;
  className?: string;
}

export function EnhancedContractDashboard({
  contractId,
  className
}: EnhancedContractDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const { toast } = useToast();

  const {
    // State
    contract,
    calculationResult,
    calculationMetrics,
    workflows,
    complianceReport,
    analytics,
    performanceReport,
    isLoading,
    error,
    isCompliant,
    hasCriticalIssues,
    performanceScore,
    profitability,

    // Actions
    performEnhancedCalculation,
    performComplianceCheck,
    createWorkflow,
    executeWorkflow,
    generateAnalytics,
    generatePerformanceReport,
    refresh,
    exportReport,

    // Engines
    workflowEngine,
    complianceEngine,
    analyticsEngine
  } = useEnhancedContractManagement({
    contractId,
    enableCalculations: true,
    enableWorkflows: true,
    enableCompliance: true,
    enableAnalytics: true,
    autoRefresh: false
  });

  // Initialize data on mount
  useEffect(() => {
    if (contract && !calculationResult) {
      performEnhancedCalculation(contract);
    }
    if (contract && !complianceReport) {
      performComplianceCheck(contract);
    }
    if (contract && !performanceReport) {
      generatePerformanceReport();
    }
  }, [contract, calculationResult, complianceReport, performanceReport]);

  const handleCreateWorkflow = async (type: 'renewal' | 'termination' | 'amendment' | 'compliance_check') => {
    const workflow = await createWorkflow(type, {
      requested_by: 'dashboard_user',
      timestamp: new Date().toISOString()
    });

    if (workflow) {
      toast({
        title: 'Workflow Created',
        description: `${type} workflow has been created successfully`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to create workflow',
        variant: 'destructive'
      });
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    await executeWorkflow(workflowId);
    toast({
      title: 'Workflow Executed',
      description: 'Workflow has been executed successfully',
    });
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    await exportReport(format, 'analytics');
    toast({
      title: 'Export Complete',
      description: `Contract report exported as ${format.toUpperCase()}`,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'error': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  if (isLoading && !contract) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!contract) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Contract Not Found</AlertTitle>
        <AlertDescription>The requested contract could not be found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {contract.agreement_number || contract.contract_number}
          </h1>
          <p className="text-muted-foreground">
            Enhanced Contract Management Dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
          Status: {contract.status}
        </Badge>
        <Badge variant={isCompliant ? 'default' : 'destructive'}>
          <ShieldCheck className="h-3 w-3 mr-1" />
          {isCompliant ? 'Compliant' : 'Non-Compliant'}
        </Badge>
        <Badge variant="outline">
          <DollarSign className="h-3 w-3 mr-1" />
          {contract.currency} {contract.monthly_rate?.toLocaleString()}
        </Badge>
        {hasCriticalIssues && (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Critical Issues
          </Badge>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Performance Score */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceScore.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  Overall contract performance
                </p>
              </CardContent>
            </Card>

            {/* Profitability */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profitability</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${profitability.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Net profit generated
                </p>
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {complianceReport ? `${complianceReport.rules_passed}/${complianceReport.total_rules_checked}` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rules passed / checked
                </p>
              </CardContent>
            </Card>

            {/* Active Workflows */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflows.filter(w => w.status === 'in_progress').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
              <CardDescription>Basic contract information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Contract Type:</span>
                  <p>{contract.contract_type}</p>
                </div>
                <div>
                  <span className="font-medium">Billing Frequency:</span>
                  <p>{contract.billing_frequency}</p>
                </div>
                <div>
                  <span className="font-medium">Start Date:</span>
                  <p>{new Date(contract.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium">End Date:</span>
                  <p>{new Date(contract.end_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium">Contract Value:</span>
                  <p>{contract.currency} {contract.contract_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="font-medium">Monthly Rate:</span>
                  <p>{contract.currency} {contract.monthly_rate?.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculations Tab */}
        <TabsContent value="calculations" className="space-y-6">
          {calculationResult ? (
            <>
              {/* Enhanced Payment Result */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Enhanced Payment Calculation
                  </CardTitle>
                  <CardDescription>
                    Latest calculation results with breakdown
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Payment Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{calculationResult.currency} {calculationResult.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>{calculationResult.currency} {calculationResult.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>{calculationResult.currency} {calculationResult.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Base Rate:</span>
                          <span>{calculationResult.currency} {calculationResult.breakdown.base_rate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insurance:</span>
                          <span>{calculationResult.currency} {calculationResult.breakdown.insurance_fees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Service:</span>
                          <span>{calculationResult.currency} {calculationResult.breakdown.service_fees.toFixed(2)}</span>
                        </div>
                        {calculationResult.breakdown.usage_fees && (
                          <div className="flex justify-between">
                            <span>Usage:</span>
                            <span>{calculationResult.currency} {calculationResult.breakdown.usage_fees.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Billing Period</h4>
                      <div className="space-y-2">
                        <div>
                          <span>Period:</span>
                          <p>{new Date(calculationResult.billing_period.start_date).toLocaleDateString()} - {new Date(calculationResult.billing_period.end_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span>Days:</span>
                          <p>{calculationResult.billing_period.days}</p>
                        </div>
                        <div>
                          <span>Frequency:</span>
                          <p>{calculationResult.billing_period.billing_frequency}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {calculationResult.discounts_applied.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Applied Discounts</h4>
                      <div className="space-y-2">
                        {calculationResult.discounts_applied.map((discount, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{discount.type}:</span>
                            <span>-{calculationResult.currency} {discount.discountAmount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Calculation Metrics */}
              {calculationMetrics && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Calculation Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Calculation Time:</span>
                        <p>{calculationMetrics.calculation_time_ms}ms</p>
                      </div>
                      <div>
                        <span className="font-medium">Cache Hit Rate:</span>
                        <p>{(calculationMetrics.cache_hit_rate * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <span className="font-medium">Error Count:</span>
                        <p>{calculationMetrics.error_count}</p>
                      </div>
                      <div>
                        <span className="font-medium">Last Calculation:</span>
                        <p>{new Date(calculationMetrics.last_calculation).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No calculation results available</p>
                  <Button
                    className="mt-2"
                    onClick={() => performEnhancedCalculation(contract)}
                  >
                    Calculate Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Active Workflows</h3>
            <div className="flex space-x-2">
              <Button onClick={() => handleCreateWorkflow('renewal')}>
                <FileText className="h-4 w-4 mr-2" />
                Renewal
              </Button>
              <Button variant="outline" onClick={() => handleCreateWorkflow('termination')}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Termination
              </Button>
              <Button variant="outline" onClick={() => handleCreateWorkflow('compliance_check')}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Compliance Check
              </Button>
            </div>
          </div>

          {workflows.length > 0 ? (
            <div className="grid gap-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{workflow.title}</h4>
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge className={getStatusColor(workflow.status)}>
                            {workflow.status}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(workflow.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {workflow.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleExecuteWorkflow(workflow.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {workflow.steps.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Steps:</h5>
                        <div className="space-y-1">
                          {workflow.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center space-x-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(step.status)}`} />
                              <span className="flex-1">{index + 1}. {step.name}</span>
                              {step.completed_date && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(step.completed_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No active workflows</p>
                  <Button className="mt-2" onClick={() => handleCreateWorkflow('compliance_check')}>
                    Create Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          {complianceReport ? (
            <>
              {/* Compliance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShieldCheck className="h-5 w-5 mr-2" />
                    Compliance Status
                  </CardTitle>
                  <CardDescription>
                    Overall compliance: {complianceReport.overall_status}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {complianceReport.rules_passed}
                      </div>
                      <p className="text-sm text-muted-foreground">Rules Passed</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {complianceReport.rules_failed}
                      </div>
                      <p className="text-sm text-muted-foreground">Rules Failed</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {complianceReport.rules_pending}
                      </div>
                      <p className="text-sm text-muted-foreground">Pending Review</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {complianceReport.critical_issues}
                      </div>
                      <p className="text-sm text-muted-foreground">Critical Issues</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Details</CardTitle>
                  <CardDescription>Individual rule validation results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complianceReport.results.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{result.rule_id}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.message}
                            </p>
                            {result.recommendations && result.recommendations.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium">Recommendations:</p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {result.recommendations.map((rec, recIndex) => (
                                    <li key={recIndex}>{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(result.severity)}>
                              {result.severity}
                            </Badge>
                            <Badge variant={
                              result.status === 'compliant' ? 'default' : 'destructive'
                            }>
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No compliance data available</p>
                  <Button className="mt-2" onClick={() => performComplianceCheck(contract)}>
                    Check Compliance
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {performanceReport ? (
            <>
              {/* Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Contract Performance
                  </CardTitle>
                  <CardDescription>
                    Overall performance score and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {performanceReport.performance_score.toFixed(1)}
                      </div>
                      <p className="text-sm text-muted-foreground">Performance Score</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        ${performanceReport.revenue_generated.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Revenue Generated</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {performanceReport.utilization_rate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Utilization Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span>${performanceReport.revenue_generated.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Costs:</span>
                        <span>${performanceReport.costs_incurred.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Profitability:</span>
                        <span className={performanceReport.profitability >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${performanceReport.profitability.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quality Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Customer Retention:</span>
                        <span>{performanceReport.customer_retention_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Compliance Score:</span>
                        <span>{performanceReport.compliance_score.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Issues:</span>
                        <span>{performanceReport.payment_history.filter(p => p.status !== 'on_time').length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              {performanceReport.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>
                      Suggestions for improving contract performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {performanceReport.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No analytics data available</p>
                  <Button className="mt-2" onClick={generatePerformanceReport}>
                    Generate Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedContractDashboard;