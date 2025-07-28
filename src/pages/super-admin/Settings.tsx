import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Building2, Users, Shield, Bell, Database, Palette, FileText } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { CompanyBrandingSettings } from '@/components/settings/CompanyBrandingSettings';
import { TemplateManagement } from '@/components/settings/TemplateManagement';
import { SystemSecuritySettings } from '@/components/super-admin/settings/SystemSecuritySettings';
import { GlobalNotificationSettings } from '@/components/super-admin/settings/GlobalNotificationSettings';
import { DatabaseManagement } from '@/components/super-admin/settings/DatabaseManagement';
import { FeatureManagement } from '@/components/super-admin/settings/FeatureManagement';
import { SystemIntegrations } from '@/components/super-admin/settings/SystemIntegrations';
import { BulkOperations } from '@/components/super-admin/settings/BulkOperations';

const SuperAdminSettings: React.FC = () => {
  const settingsTabs = [
    {
      id: 'security',
      label: 'Security & Access',
      icon: Shield,
      description: 'System security, authentication, and access control',
      component: SystemSecuritySettings,
    },
    {
      id: 'features',
      label: 'Feature Management',
      icon: Settings,
      description: 'Enable/disable features and manage subscription plans',
      component: FeatureManagement,
    },
    {
      id: 'companies',
      label: 'Company Management',
      icon: Building2,
      description: 'Manage company settings and configurations',
      component: BulkOperations,
    },
    {
      id: 'branding',
      label: 'Global Branding',
      icon: Palette,
      description: 'System-wide branding and appearance settings',
      component: CompanyBrandingSettings,
    },
    {
      id: 'templates',
      label: 'Template Management',
      icon: FileText,
      description: 'Manage global templates and document settings',
      component: TemplateManagement,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Global notification settings and email configurations',
      component: GlobalNotificationSettings,
    },
    {
      id: 'database',
      label: 'Database',
      icon: Database,
      description: 'Database management, backups, and maintenance',
      component: DatabaseManagement,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: Users,
      description: 'Third-party integrations and API management',
      component: SystemIntegrations,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs />
        
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-50"></div>
          <div className="relative p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                    System Settings
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Configure system-wide settings and manage platform features
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configuration Management
          </CardTitle>
          <CardDescription>
            Manage all system-wide settings from this centralized control panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-muted/30">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {tab.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {settingsTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                <div className="border-l-4 border-primary/20 pl-6 space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {tab.label}
                  </h3>
                  <p className="text-muted-foreground">
                    {tab.description}
                  </p>
                </div>
                <tab.component />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminSettings;