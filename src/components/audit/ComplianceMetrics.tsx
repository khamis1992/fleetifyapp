/**
 * Compliance Metrics Component
 * Displays compliance monitoring data and reports
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Users,
  FileText
} from 'lucide-react';
import { ComplianceReport } from '@/types/auditLog';
import { format } from 'date-fns';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
interface ComplianceMetricsProps {
  complianceReport: ComplianceReport | null;
  isLoading: boolean;
  reportPeriod: { start: string; end: string };
  onPeriodChange: (period: { start: string; end: string }) => void;
}

export function ComplianceMetrics({
  complianceReport,
  isLoading,
  reportPeriod,
  onPeriodChange
}: ComplianceMetricsProps) {

  const { t } = useFleetifyTranslation("ui");
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const handlePeriodChange = (days: string) => {
    setSelectedPeriod(days);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(days));

    onPeriodChange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getComplianceScoreVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'destructive';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("complianceMetrics")}</CardTitle>
            <CardDescription>{t("loadingComplianceData")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = complianceReport; // Alias for easier access

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("complianceMonitoring")}</h2>
          <p className="text-muted-foreground">
            Track regulatory compliance and audit trail completeness
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {reportPeriod.start} to {reportPeriod.end}
            </span>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />{t("exportReport")}</Button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Period:</span>
        {['7', '30', '90', '365'].map((days) => (
          <Button
            key={days}
            variant={selectedPeriod === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodChange(days)}
          >
            {days === '7' ? 'Last Week' :
             days === '30' ? 'Last Month' :
             days === '90' ? 'Last Quarter' : 'Last Year'}
          </Button>
        ))}
      </div>

      {/* Overall Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />{t("overallComplianceScore")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold">
                {report?.compliance_score || 0}%
              </span>
              <Badge
                variant={getComplianceScoreVariant(report?.compliance_score || 0)}
                className="text-lg px-3 py-1"
              >
                {report?.compliance_score >= 90 ? 'Excellent' :
                 report?.compliance_score >= 80 ? 'Good' :
                 report?.compliance_score >= 70 ? 'Needs Improvement' : 'Critical'}
              </Badge>
            </div>
            <Progress
              value={report?.compliance_score || 0}
              className="h-2"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalTransactions")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report?.total_transactions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("analyzedInThisPeriod")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("highRiskTransactions")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report?.high_risk_transactions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.total_transactions > 0
                ? `${((report.high_risk_transactions / report.total_transactions) * 100).toFixed(1)}% of total`
                : '0% of total'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("complianceViolations")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report?.compliance_violations?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("typesOfViolationsDetected")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("auditTrailStatus")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report?.audit_trail_complete ? 'Complete' : 'Incomplete'}
            </div>
            <p className="text-xs text-muted-foreground">{t("traceabilityStatus")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Violations Details */}
      {report?.compliance_violations && report.compliance_violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />{t("complianceViolations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.compliance_violations.map((violation, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-800">
                      {violation.violation_type}
                    </h4>
                    <Badge variant="destructive">
                      {violation.count} occurrences
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {violation.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Amount:</span>
                    <span className="font-medium">
                      ${violation.total_amount?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segregation of Duties Violations */}
      {report?.segregation_duties_violations && report.segregation_duties_violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />{t("segregationOfDuties")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("segregationOfDutiesViolations")}</AlertTitle>
              <AlertDescription>
                {report.segregation_duties_violations.length} users have been flagged for potential
                segregation of duties violations.
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-3">
              {report.segregation_duties_violations.map((violation, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">
                      User ID: {violation.user_id?.substring(0, 8)}...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {violation.violation_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{violation.transaction_count}</p>
                    <p className="text-xs text-muted-foreground">transactions</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required Approvals */}
      {report?.required_approvals_missing && report.required_approvals_missing > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("missingRequiredApprovals")}</AlertTitle>
          <AlertDescription>
            {report.required_approvals_missing} transactions are missing required approvals.
            This may indicate a gap in your approval workflow.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Compliance Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="violations">{t("violations")}</TabsTrigger>
          <TabsTrigger value="recommendations">{t("recommendations")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("complianceStatus")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Audit Trail Completeness:</span>
                  <Badge variant={report?.audit_trail_complete ? 'default' : 'destructive'}>
                    {report?.audit_trail_complete ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Risk Assessment:</span>
                  <Badge variant={report?.high_risk_transactions === 0 ? 'default' : 'secondary'}>
                    {report?.high_risk_transactions === 0 ? 'Low Risk' : 'High Risk'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Violation Status:</span>
                  <Badge variant={report?.compliance_violations.length === 0 ? 'default' : 'destructive'}>
                    {report?.compliance_violations.length === 0 ? 'No Violations' : 'Violations Found'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("periodAnalysis")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Period Start:</span>
                  <span className="text-sm">{report?.period_start}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Period End:</span>
                  <span className="text-sm">{report?.period_end}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Analysis Days:</span>
                  <span className="text-sm">
                    {report?.period_start && report?.period_end
                      ? Math.ceil((new Date(report.period_end).getTime() - new Date(report.period_start).getTime()) / (1000 * 60 * 60 * 24))
                      : 0} days
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("violationBreakdown")}</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.compliance_violations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>{t("noComplianceViolationsDetected")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.compliance_violations.map((violation, index) => (
                    <div key={index} className="border-l-4 border-orange-500 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{violation.violation_type}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {violation.count} times
                          </Badge>
                          <span className="text-sm font-medium">
                            ${violation.total_amount?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {violation.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("complianceRecommendations")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report?.compliance_score >= 90 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>{t("excellentCompliance")}</AlertTitle>
                    <AlertDescription>
                      Your compliance score is excellent. Continue monitoring and maintaining current practices.
                    </AlertDescription>
                  </Alert>
                ) : report?.compliance_score >= 80 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t("goodWithRoomFor")}</AlertTitle>
                    <AlertDescription>{t("considerReviewingTheIdentified")}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t("immediateActionRequired")}</AlertTitle>
                    <AlertDescription>
                      Multiple compliance issues detected. Immediate review and remediation is recommended.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium">Recommended Actions:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>{t("reviewAndStrengthenApproval")}</li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>{t("implementAdditionalSegregationOf")}</li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>{t("enhancedMonitoringOfHighrisk")}</li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>{t("regularComplianceTrainingFor")}</li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>{t("automateComplianceCheckingAnd")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}