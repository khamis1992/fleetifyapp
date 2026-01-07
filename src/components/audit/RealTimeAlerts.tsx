/**
 * Real-time Alerts Component
 * Displays real-time audit alerts and notifications
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Bell,
  X,
  Eye,
  Clock,
  User
} from 'lucide-react';
import { useRealtimeAuditMonitoring } from '@/hooks/useFinancialAudit';
import { FinancialAuditLog } from '@/types/auditLog';
import { format } from 'date-fns';
import { relativeTime } from '@/lib/utils';

interface RealTimeAlertsProps {
  companyId: string;
  onHighRiskTransaction?: (log: FinancialAuditLog) => void;
  onComplianceViolation?: (log: FinancialAuditLog) => void;
  onTamperDetection?: (log: FinancialAuditLog) => void;
}

export function RealTimeAlerts({
  companyId,
  onHighRiskTransaction,
  onComplianceViolation,
  onTamperDetection
}: RealTimeAlertsProps) {
  const { recentAlerts, clearAlerts } = useRealtimeAuditMonitoring(companyId, {
    onHighRiskTransaction,
    onComplianceViolation,
    onTamperDetection
  });

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const visibleAlerts = recentAlerts.filter(alert => !dismissedAlerts.has(alert.id));

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <Activity className="h-4 w-4 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  const getAlertTitle = (log: FinancialAuditLog) => {
    if (log.verification_status === 'tampered') {
      return 'Tampered Audit Record Detected';
    }
    if (log.compliance_flags && log.compliance_flags.length > 0) {
      return 'Compliance Violation Detected';
    }
    if (log.severity === 'critical') {
      return 'Critical System Event';
    }
    if (log.severity === 'high') {
      return 'High-Risk Transaction';
    }
    return 'Audit Event';
  };

  const getAlertDescription = (log: FinancialAuditLog) => {
    if (log.verification_status === 'tampered') {
      return `Audit record ${log.entity_name} shows signs of tampering. Immediate investigation required.`;
    }
    if (log.compliance_flags && log.compliance_flags.length > 0) {
      return `Transaction violates compliance policies: ${log.compliance_flags.join(', ')}`;
    }
    if (log.severity === 'critical') {
      return `Critical ${log.action} operation on ${log.resource_type}: ${log.entity_name}`;
    }
    if (log.severity === 'high') {
      return `High-risk ${log.action} operation: ${log.entity_name} (${log.financial_data?.amount ? '$' + log.financial_data.amount.toLocaleString() : ''})`;
    }
    return `${log.action} on ${log.entity_name}`;
  };

  if (visibleAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Real-time Alerts
          </CardTitle>
          <CardDescription>
            Monitor audit events in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-medium text-green-800">All Clear</h3>
          <p className="text-green-600">No recent audit alerts detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Real-time Alerts
            </CardTitle>
            <CardDescription>
              {visibleAlerts.length} recent alert{visibleAlerts.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={visibleAlerts.length > 0 ? 'destructive' : 'default'}>
              {visibleAlerts.length} Active
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAlerts}
              disabled={visibleAlerts.length === 0}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleAlerts.map((alert) => (
            <Alert
              key={alert.id}
              className={`border-l-4 ${getAlertColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <AlertTitle className="flex items-center gap-2">
                      {getAlertTitle(alert)}
                      <Badge variant="outline" className="capitalize">
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {alert.action}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      {getAlertDescription(alert)}
                    </AlertDescription>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{alert.user_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(alert.created_at), 'PPpp')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Activity className="h-3 w-3" />
                        <span>{relativeTime(new Date(alert.created_at))}</span>
                      </div>
                    </div>
                    {alert.financial_data?.amount && (
                      <div className="mt-2 p-2 bg-muted rounded">
                        <div className="text-sm font-medium">
                          Amount: ${alert.financial_data.amount.toLocaleString()} {alert.financial_data.currency}
                        </div>
                        {alert.financial_data.payment_method && (
                          <div className="text-xs text-muted-foreground">
                            Method: {alert.financial_data.payment_method}
                          </div>
                        )}
                        {alert.financial_data.reference_number && (
                          <div className="text-xs text-muted-foreground">
                            Reference: {alert.financial_data.reference_number}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Open details view - would need to integrate with a details dialog
                      console.log('View details for alert:', alert.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper utility function for relative time
function relativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString();
}