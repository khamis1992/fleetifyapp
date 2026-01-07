/**
 * Data Integrity Report Component
 * Displays audit trail integrity verification results
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  RefreshCw,
  FileText,
  Info
} from 'lucide-react';
import { DataIntegrityReport } from '@/types/auditLog';
import { format } from 'date-fns';

interface IntegrityReportProps {
  integrityReport: DataIntegrityReport | null;
  isLoading: boolean;
  onVerify: () => void;
}

export function IntegrityReport({ integrityReport, isLoading, onVerify }: IntegrityReportProps) {
  const getIntegrityScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 90) return 'text-yellow-600';
    if (score >= 80) return 'text-orange-600';
    return 'text-red-600';
  };

  const getIntegrityStatusVariant = (score: number) => {
    if (score >= 95) return 'default';
    if (score >= 90) return 'secondary';
    if (score >= 80) return 'destructive';
    return 'destructive';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Integrity Verification
            </CardTitle>
            <CardDescription>Verifying audit trail integrity...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const report = integrityReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Integrity Report</h2>
          <p className="text-muted-foreground">
            Cryptographic verification of audit trail records
          </p>
        </div>
        <Button onClick={onVerify} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Run Verification
        </Button>
      </div>

      {/* Overall Integrity Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Integrity Score
          </CardTitle>
          <CardDescription>
            Last verified: {report?.last_verification
              ? format(new Date(report.last_verification), 'PPpp')
              : 'Never verified'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-bold">
                {report?.integrity_score || 0}%
              </span>
              <Badge
                variant={getIntegrityStatusVariant(report?.integrity_score || 0)}
                className="text-lg px-3 py-1"
              >
                {report?.integrity_score >= 95 ? 'Excellent' :
                 report?.integrity_score >= 90 ? 'Good' :
                 report?.integrity_score >= 80 ? 'Warning' : 'Critical'}
              </Badge>
            </div>
            <Progress
              value={report?.integrity_score || 0}
              className="h-2"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Results */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report?.total_records?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Audit entries analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {report?.verified_records?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.total_records > 0
                ? `${((report.verified_records / report.total_records) * 100).toFixed(1)}%`
                : '0%'} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tampered</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {report?.tampered_records?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Records with integrity issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {report?.suspicious_records?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Records requiring review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Errors */}
      {report?.verification_errors && report.verification_errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Verification Errors
            </CardTitle>
            <CardDescription>
              {report.verification_errors.length} integrity issues detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Integrity Issues Detected</AlertTitle>
              <AlertDescription>
                The following records have integrity verification failures and should be reviewed immediately.
              </AlertDescription>
            </Alert>
            <div className="mt-4 space-y-3">
              {report.verification_errors.map((error, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-red-800">
                      Record ID: {error.record_id?.substring(0, 8)}...
                    </h4>
                    <Badge variant="destructive">
                      {error.error_type}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Expected Hash:</span>{' '}
                      <code className="text-xs bg-red-50 p-1 rounded">
                        {error.expected_hash?.substring(0, 16)}...
                      </code>
                    </p>
                    <p>
                      <span className="font-medium">Actual Hash:</span>{' '}
                      <code className="text-xs bg-red-50 p-1 rounded">
                        {error.actual_hash?.substring(0, 16)}...
                      </code>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report?.recommendations && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <p className="text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Integrity Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report?.integrity_score === 100 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Excellent Integrity</AlertTitle>
                <AlertDescription>
                  All audit records have been verified successfully. No integrity issues detected.
                </AlertDescription>
              </Alert>
            ) : report?.integrity_score >= 90 ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Good Integrity</AlertTitle>
                <AlertDescription>
                  Most audit records have been verified successfully. Some minor issues may exist.
                </AlertDescription>
              </Alert>
            ) : report?.integrity_score >= 80 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Moderate Integrity Concerns</AlertTitle>
                <AlertDescription>
                  Several integrity issues have been detected. Immediate review and action recommended.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertTitle>Critical Integrity Issues</AlertTitle>
                <AlertDescription>
                  Significant integrity issues detected. Immediate investigation and remediation required.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Verification Statistics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {report?.total_records > 0
                        ? `${((report.verified_records / report.total_records) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className="font-medium text-red-600">
                      {report?.total_records > 0
                        ? `${(((report.tampered_records + report.suspicious_records) / report.total_records) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Quick Actions</h4>
                <div className="space-y-1 text-sm">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Review Tampered Records
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restore from Backup
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Investigation Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}