import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Bell } from 'lucide-react';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'error';
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface MinimalAlertSystemProps {
  alerts?: Alert[];
  loading?: boolean;
}

const MinimalAlertSystem: React.FC<MinimalAlertSystemProps> = ({ 
  alerts = [], 
  loading = false 
}) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'error': return AlertTriangle;
      default: return Bell;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-warning';
      case 'success': return 'text-success';
      case 'error': return 'text-destructive';
      default: return 'text-primary';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell size={16} />
            التنبيهات الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-5 h-5 bg-muted rounded-full animate-pulse mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted/50 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts.length) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell size={16} />
            التنبيهات الذكية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={20} />
            </div>
            <p className="text-sm text-muted-foreground">لا توجد تنبيهات جديدة</p>
            <p className="text-xs text-muted-foreground mt-1">كل شيء يسير بسلاسة</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bell size={16} />
            التنبيهات الذكية
          </div>
          <Badge variant="secondary" className="text-xs">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.slice(0, 4).map((alert, index) => {
            const Icon = getAlertIcon(alert.type);
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group p-3 rounded-lg border border-border/50 hover:border-border transition-colors duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${getAlertColor(alert.type)}`}>
                    <Icon size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {alert.title}
                      </h4>
                      <Badge 
                        variant={getPriorityVariant(alert.priority)}
                        className="text-xs px-1.5 py-0"
                      >
                        {alert.priority === 'high' ? 'عاجل' : 
                         alert.priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={10} />
                        {alert.timestamp}
                      </div>
                      
                      {alert.action && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={alert.action.onClick}
                        >
                          {alert.action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {alerts.length > 4 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Button 
              variant="ghost" 
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              عرض جميع التنبيهات ({alerts.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MinimalAlertSystem;