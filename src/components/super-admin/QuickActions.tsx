import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Settings, 
  FileText, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Database,
  Bell
} from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      label: 'Add Company',
      description: 'Create new company account',
      icon: Plus,
      color: 'from-blue-500 to-blue-600',
      action: () => console.log('Add Company')
    },
    {
      label: 'System Settings',
      description: 'Configure system parameters',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      action: () => console.log('System Settings')
    },
    {
      label: 'Generate Report',
      description: 'Create system analytics report',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      action: () => console.log('Generate Report')
    },
    {
      label: 'User Management',
      description: 'Manage system users',
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      action: () => console.log('User Management')
    },
    {
      label: 'Billing & Plans',
      description: 'Manage subscription plans',
      icon: CreditCard,
      color: 'from-yellow-500 to-yellow-600',
      action: () => console.log('Billing & Plans')
    },
    {
      label: 'System Alerts',
      description: 'View system notifications',
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      action: () => console.log('System Alerts')
    },
    {
      label: 'Database Health',
      description: 'Monitor database status',
      icon: Database,
      color: 'from-teal-500 to-teal-600',
      action: () => console.log('Database Health')
    },
    {
      label: 'Notifications',
      description: 'Send system notifications',
      icon: Bell,
      color: 'from-indigo-500 to-indigo-600',
      action: () => console.log('Notifications')
    }
  ];

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-3 hover:shadow-card transition-all duration-300 group border-border/50 hover:border-primary/20"
              onClick={action.action}
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-sm group-hover:text-primary transition-colors">
                  {action.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};