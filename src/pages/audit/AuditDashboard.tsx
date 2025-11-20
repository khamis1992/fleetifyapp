/**
 * Comprehensive Audit Dashboard
 * Main dashboard for financial audit trail monitoring and reporting
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

import { useFinancialAuditTrail } from '@/hooks/useFinancialAudit';
import { useAuditMetrics } from '@/hooks/useFinancialAudit';
import { useDataIntegrityVerification } from '@/hooks/useFinancialAudit';
import { useComplianceReport } from '@/hooks/useFinancialAudit';
import { useAuditExport } from '@/hooks/useFinancialAudit';
import { useAuth } from '@/contexts/AuthContext';

import { AuditTrailTable } from '@/components/audit/AuditTrailTable';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { ComplianceMetrics } from '@/components/audit/ComplianceMetrics';
import { IntegrityReport } from '@/components/audit/IntegrityReport';
import { AuditSearch } from '@/components/audit/AuditSearch';
import { ExportDialog } from '@/components/audit/ExportDialog';
import { RealTimeAlerts } from '@/components/audit/RealTimeAlerts';

export function AuditDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Audit trail data
  const {
    logs,
    totalCount,
    summary,
    isLoading: auditLoading,
    filters,
    updateFilters,
    refetch: refetchAudit
  } = useFinancialAuditTrail();

  // Metrics data
  const { metrics, isLoading: metricsLoading } = useAuditMetrics(
    user?.company_id || '',
    30 // Last 30 days
  );

  // Integrity verification
  const {
    integrityReport,
    isLoading: integrityLoading,
    verifyNow
  } = useDataIntegrityVerification(user?.company_id || '');

  // Compliance report
  const {
    complianceReport,
    isLoading: complianceLoading,
    reportPeriod,
    setReportPeriod
  } = useComplianceReport(user?.company_id || '');

  // Export functionality
  const { exportData, isExporting } = useAuditExport();

  const handleExport = async (format: 'csv' | 'excel' | 'pdf' | 'json', options: any) => {
    await exportData(format, filters, options);
    setShowExportDialog(false);
  };

  const handleRefresh = () => {
    refetchAudit();
    verifyNow();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Audit Trail</h1>
          <p className="text-muted-foreground">
            Monitor and analyze all financial operations with complete audit visibility
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {(integrityReport?.integrity_score || 100) < 90 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Data Integrity Alert</AlertTitle>
          <AlertDescription>
            Audit integrity score is {integrityReport?.integrity_score}%.
            {integrityReport?.tampered_records > 0 && (
              <> {integrityReport.tampered_records} records show signs of tampering.</>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={verifyNow}
            >
              Run Verification
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {(complianceReport?.compliance_score || 100) < 80 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Shield className="h-4 w-4" />
          <AlertTitle>Compliance Concern</AlertTitle>
          <AlertDescription>
            Compliance score is {complianceReport?.compliance_score}% with {complianceReport?.compliance_violations?.length || 0} violations detected.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audit Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditFilters
              filters={filters}
              onFiltersChange={updateFilters}
              onReset={() => updateFilters({})}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="integrity">Data Integrity</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total_transactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Last {metrics?.period?.days || 30} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((metrics?.total_amount || 0) / 1000).toFixed(1)}K
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.calculated?.success_rate?.toFixed(1) || 100}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.failed_operations || 0} failed operations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.calculated?.risk_score?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.high_risk_operations || 0} high-risk operations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Audit Activity</CardTitle>
                <CardDescription>Latest financial operations and changes</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant={log.severity === 'critical' ? 'destructive' :
                                       log.severity === 'high' ? 'destructive' :
                                       log.severity === 'medium' ? 'secondary' : 'default'}>
                            {log.severity}
                          </Badge>
                          <span className="font-medium">{log.action}</span>
                          <span className="text-sm text-muted-foreground">{log.entity_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No recent audit activity found
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Real-time monitoring and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Data Integrity</span>
                    <Badge variant={integrityReport?.integrity_score || 100 > 90 ? 'default' : 'destructive'}>
                      {integrityReport?.integrity_score || 100}% Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Compliance Score</span>
                    <Badge variant={complianceReport?.compliance_score || 100 > 80 ? 'default' : 'secondary'}>
                      {complianceReport?.compliance_score || 100}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Alerts</span>
                    <Badge variant={integrityReport?.tampered_records || 0 > 0 ? 'destructive' : 'default'}>
                      {integrityReport?.tampered_records || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="trail" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Audit Trail</h2>
              <p className="text-muted-foreground">
                Complete history of all financial operations ({totalCount} records)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                Showing {logs.length} of {totalCount}
              </Badge>
            </div>
          </div>

          <AuditTrailTable
            logs={logs}
            isLoading={auditLoading}
            onRefresh={refetchAudit}
          />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <ComplianceMetrics
            complianceReport={complianceReport}
            isLoading={complianceLoading}
            reportPeriod={reportPeriod}
            onPeriodChange={setReportPeriod}
          />
        </TabsContent>

        {/* Data Integrity Tab */}
        <TabsContent value="integrity" className="space-y-6">
          <IntegrityReport
            integrityReport={integrityReport}
            isLoading={integrityLoading}
            onVerify={verifyNow}
          />
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Search</CardTitle>
              <CardDescription>Search audit trail with specific criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditSearch companyId={user?.company_id || ''} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          onClose={() => setShowExportDialog(false)}
          onExport={handleExport}
          isExporting={isExporting}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}