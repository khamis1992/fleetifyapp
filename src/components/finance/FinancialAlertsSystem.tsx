import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, TrendingDown, TrendingUp } from "lucide-react";

interface BudgetAlert {
  id: string;
  alert_type: string;
  current_percentage: number;
  threshold_percentage: number;
  message: string;
  amount_exceeded: number;
  is_acknowledged: boolean;
  created_at: string;
  budget_item?: {
    account?: {
      account_name: string;
    };
  };
}

interface FinancialAlert {
  id: string;
  type: 'budget_exceeded' | 'budget_warning' | 'cash_flow' | 'profitability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  amount?: number;
  percentage?: number;
  created_at: string;
  is_acknowledged: boolean;
}

export const FinancialAlertsSystem = () => {
  const { user } = useAuth();

  const { data: budgetAlerts, isLoading: budgetLoading } = useQuery({
    queryKey: ["budget-alerts", user?.user_metadata?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_alerts")
        .select(`
          *,
          budget_items!inner(
            account_id,
            chart_of_accounts!inner(account_name)
          )
        `)
        .eq("company_id", user?.user_metadata?.company_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.user_metadata?.company_id,
  });

  const handleAcknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("budget_alerts")
      .update({
        is_acknowledged: true,
        acknowledged_by: user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const getAlertIcon = (alertType: string, severity?: string) => {
    switch (alertType) {
      case 'budget_exceeded':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'budget_warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAlertVariant = (alertType: string) => {
    switch (alertType) {
      case 'budget_exceeded':
        return 'destructive';
      case 'budget_warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (budgetLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Alerts</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unacknowledgedAlerts = budgetAlerts?.filter(alert => !alert.is_acknowledged) || [];
  const acknowledgedAlerts = budgetAlerts?.filter(alert => alert.is_acknowledged) || [];

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Financial Alerts
              <Badge variant="destructive">{unacknowledgedAlerts.length}</Badge>
            </CardTitle>
            <CardDescription>
              These alerts require your immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unacknowledgedAlerts.map((alert) => (
              <Alert key={alert.id} className="border-destructive/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.alert_type)}
                    <div className="space-y-1">
                      <p className="font-medium">{alert.message}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {alert.current_percentage.toFixed(1)}% of budget utilized
                        </span>
                        {alert.amount_exceeded > 0 && (
                          <Badge variant="outline">
                            +{alert.amount_exceeded.toLocaleString()} KWD exceeded
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Recent Acknowledged Alerts
            </CardTitle>
            <CardDescription>
              Previously resolved financial alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {acknowledgedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.alert_type)}
                  <div>
                    <p className="font-medium text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Acknowledged on {new Date(alert.acknowledged_at || alert.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-success">
                  Resolved
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Alerts State */}
      {(!budgetAlerts || budgetAlerts.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              All Clear
            </CardTitle>
            <CardDescription>
              No financial alerts at this time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-muted-foreground">
                Your financial metrics are within normal ranges
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};