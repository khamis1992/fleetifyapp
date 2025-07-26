import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, className }) => {
  return (
    <Card className={cn("border-0 shadow-card", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>إجراءات سريعة</CardTitle>
        </div>
        <CardDescription>
          الإجراءات الأكثر استخداماً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <Button
            key={action.id}
            className={cn(
              "w-full justify-start gap-3 h-auto p-4 transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              action.variant === 'primary' && "bg-primary text-primary-foreground shadow-accent",
              action.variant === 'secondary' && "bg-secondary/50 hover:bg-secondary"
            )}
            variant={action.variant === 'primary' ? 'default' : 'outline'}
            onClick={action.action}
            disabled={action.disabled}
          >
            <action.icon className="h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col items-start">
              <span className="font-medium">{action.title}</span>
              {action.description && (
                <span className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </span>
              )}
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};