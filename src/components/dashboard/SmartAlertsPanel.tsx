import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { SmartAlert } from '@/hooks/useSmartAlerts';

interface SmartAlertsPanelProps {
  alerts: SmartAlert[];
  loading?: boolean;
}

export const SmartAlertsPanel: React.FC<SmartAlertsPanelProps> = ({ alerts, loading }) => {
  const getAlertIcon = (type: SmartAlert['type']) => {
    switch (type) {
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      case 'success': return CheckCircle;
      default: return Info;
    }
  };

  const getAlertColor = (type: SmartAlert['type']) => {
    switch (type) {
      case 'error': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'warning': return 'text-warning bg-warning/10 border-warning/20';
      case 'info': return 'text-primary bg-primary/10 border-primary/20';
      case 'success': return 'text-success bg-success/10 border-success/20';
      default: return 'text-muted-foreground bg-muted/10 border-muted/20';
    }
  };

  const getPriorityBadge = (priority: SmartAlert['priority']) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">عالية</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">متوسطة</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">منخفضة</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            التنبيهات الذكية
          </CardTitle>
          <CardDescription>نظام التنبيهات المتقدم</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          التنبيهات الذكية
          {alerts.length > 0 && (
            <Badge variant="secondary" className="mr-auto">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>نظام التنبيهات المتقدم</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-3" />
            <p className="text-sm font-medium text-success">لا توجد تنبيهات</p>
            <p className="text-xs text-muted-foreground mt-1">كل شيء يعمل بشكل طبيعي</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.map((alert) => {
              const IconComponent = getAlertIcon(alert.type);
              const alertColor = getAlertColor(alert.type);
              
              return (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${alertColor}`}
                >
                  <div className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold truncate">{alert.title}</h4>
                        {getPriorityBadge(alert.priority)}
                      </div>
                      <p className="text-xs leading-relaxed mb-2">{alert.message}</p>
                      
                      {(alert.count || alert.amount) && (
                        <div className="flex gap-2 text-xs mb-2">
                          {alert.count && (
                            <span className="text-muted-foreground">العدد: {alert.count}</span>
                          )}
                          {alert.amount && (
                            <span className="text-muted-foreground">
                              المبلغ: {alert.amount.toFixed(0)} د.ك
                            </span>
                          )}
                        </div>
                      )}
                      
                      {alert.action && alert.actionUrl && (
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          {alert.action}
                          <ExternalLink className="h-3 w-3 mr-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};