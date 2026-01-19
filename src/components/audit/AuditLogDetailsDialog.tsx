/**
 * Audit Log Details Dialog
 * Shows comprehensive details for a single audit log entry
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Calendar,
  Globe,
  Shield,
  AlertTriangle,
  Activity,
  FileText,
  DollarSign,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  Info
} from 'lucide-react';
import { FinancialAuditLog } from '@/types/auditLog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AuditLogDetailsDialogProps {
  log: FinancialAuditLog;
  open: boolean;
  onClose: () => void;
}

export function AuditLogDetailsDialog({ log, open, onClose }: AuditLogDetailsDialogProps) {
  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-slate-600" />;
    }
  };

  const getIntegrityIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'tampered':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'suspicious':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            Comprehensive view of the audit trail entry
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <div className="space-y-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Log ID:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.id.substring(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Date & Time:</span>
                        <span className="text-sm">
                          {format(new Date(log.created_at), 'PPpp')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Action:</span>
                        <Badge variant="outline" className="capitalize">
                          {log.action.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Entity Type:</span>
                        <Badge variant="outline" className="capitalize">
                          {log.resource_type}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Entity:</span>
                        <span className="text-sm font-medium">{log.entity_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Status:</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(log.status)}
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Severity:</span>
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity?.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        User Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">User ID:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.user_id.substring(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm">{log.user_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{log.user_email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">IP Address:</span>
                        <span className="text-sm font-mono">
                          {log.ip_address || 'Not available'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Entity Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Entity Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <span className="text-sm font-medium">Resource ID:</span>
                        <p className="font-mono text-sm mt-1">{log.resource_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Entity Name:</span>
                        <p className="text-sm mt-1">{log.entity_name || 'N/A'}</p>
                      </div>
                    </div>
                    {log.changes_summary && (
                      <div>
                        <span className="text-sm font-medium">Changes Summary:</span>
                        <p className="text-sm mt-1 p-3 bg-muted rounded">
                          {log.changes_summary}
                        </p>
                      </div>
                    )}
                    {log.notes && (
                      <div>
                        <span className="text-sm font-medium">Notes:</span>
                        <p className="text-sm mt-1 p-3 bg-muted rounded">
                          {log.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Data Integrity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Data Integrity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Verification Status:</span>
                      <div className="flex items-center gap-1">
                        {getIntegrityIcon(log.verification_status)}
                        <Badge
                          variant={
                            log.verification_status === 'verified' ? 'default' :
                            log.verification_status === 'tampered' ? 'destructive' : 'secondary'
                          }
                        >
                          {log.verification_status || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                    {log.hash_signature && (
                      <div>
                        <span className="text-sm font-medium">Hash Signature:</span>
                        <p className="font-mono text-xs mt-1 p-2 bg-muted rounded break-all">
                          {log.hash_signature}
                        </p>
                      </div>
                    )}
                    {log.compliance_flags && log.compliance_flags.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Compliance Flags:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {log.compliance_flags.map((flag, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Changes Tab */}
              <TabsContent value="changes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Data Changes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {log.old_values || log.new_values ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {log.old_values && (
                          <div>
                            <h4 className="font-medium mb-2 text-sm">Previous Values:</h4>
                            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                              {formatJson(log.old_values)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <h4 className="font-medium mb-2 text-sm">New Values:</h4>
                            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                              {formatJson(log.new_values)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No change data available for this entry
                      </p>
                    )}
                  </CardContent>
                </Card>

                {log.metadata && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Metadata</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                        {formatJson(log.metadata)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount:</span>
                        <span className="font-bold text-lg">
                          {formatAmount(log.financial_data?.amount, log.financial_data?.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Currency:</span>
                        <span className="text-sm font-mono">
                          {log.financial_data?.currency || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Payment Method:</span>
                        <span className="text-sm">
                          {log.financial_data?.payment_method || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Reference Number:</span>
                        <span className="text-sm font-mono">
                          {log.financial_data?.reference_number || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Transaction Date:</span>
                        <span className="text-sm">
                          {log.financial_data?.transaction_date
                            ? format(new Date(log.financial_data.transaction_date), 'PP')
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Account Code:</span>
                        <span className="text-sm font-mono">
                          {log.financial_data?.account_code || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Invoice Number:</span>
                        <span className="text-sm font-mono">
                          {log.financial_data?.invoice_number || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Contract Number:</span>
                        <span className="text-sm font-mono">
                          {log.financial_data?.contract_number || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Customer ID:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.financial_data?.customer_id?.substring(0, 8) || 'N/A'}...
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Tax Amount:</span>
                        <span className="text-sm">
                          {log.financial_data?.tax_amount
                            ? formatAmount(log.financial_data.tax_amount, log.financial_data.currency)
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Discount Amount:</span>
                        <span className="text-sm">
                          {log.financial_data?.discount_amount
                            ? formatAmount(log.financial_data.discount_amount, log.financial_data.currency)
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Balance:</span>
                        <span className="text-sm">
                          {log.financial_data?.balance
                            ? formatAmount(log.financial_data.balance, log.financial_data.currency)
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Technical Tab */}
              <TabsContent value="technical" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Technical Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Request Method:</span>
                        <Badge variant="outline">
                          {log.request_method || 'N/A'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Request Path:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.request_path || 'N/A'}
                        </code>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">User Agent:</span>
                      <p className="text-xs mt-1 p-2 bg-muted rounded break-all">
                        {log.user_agent || 'Not available'}
                      </p>
                    </div>

                    {log.error_message && (
                      <div>
                        <span className="text-sm font-medium">Error Message:</span>
                        <p className="text-sm mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                          {log.error_message}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-sm font-medium">Retention Period:</span>
                      <p className="text-sm">
                        {log.retention_period
                          ? `${log.retention_period} days`
                          : 'Not specified'
                        }
                      </p>
                    </div>

                    {log.archival_date && (
                      <div>
                        <span className="text-sm font-medium">Archival Date:</span>
                        <p className="text-sm">
                          {format(new Date(log.archival_date), 'PPpp')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Full JSON Data */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Complete Log Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                      {formatJson({
                        id: log.id,
                        user_id: log.user_id,
                        user_email: log.user_email,
                        user_name: log.user_name,
                        company_id: log.company_id,
                        action: log.action,
                        resource_type: log.resource_type,
                        resource_id: log.resource_id,
                        entity_name: log.entity_name,
                        old_values: log.old_values,
                        new_values: log.new_values,
                        changes_summary: log.changes_summary,
                        ip_address: log.ip_address,
                        user_agent: log.user_agent,
                        request_method: log.request_method,
                        request_path: log.request_path,
                        status: log.status,
                        error_message: log.error_message,
                        severity: log.severity,
                        metadata: log.metadata,
                        notes: log.notes,
                        created_at: log.created_at,
                        financial_data: log.financial_data,
                        compliance_flags: log.compliance_flags,
                        retention_period: log.retention_period,
                        archival_date: log.archival_date
                      })}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}