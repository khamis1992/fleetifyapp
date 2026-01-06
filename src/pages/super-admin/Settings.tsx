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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs />

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-teal-500/10 opacity-50"></div>
          <div className="relative p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 bg-clip-text text-transparent">
                    System Settings
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Configure system-wide settings and manage platform features
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Settings className="h-5 w-5 text-teal-600" />
            Configuration Management
          </CardTitle>
          <CardDescription className="text-gray-600">
            Manage all system-wide settings from this centralized control panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-xl transition-all hover:bg-teal-50"
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
                <div className="border-l-4 border-teal-500/20 pl-6 space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {tab.label}
                  </h3>
                  <p className="text-gray-600">
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