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

import { useFleetifyTranslation } from "@/hooks/useTranslation";
const SuperAdminSettings: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  const settingsTabs = [
    {
      id: 'security',
      label: t("securityAccess"),
      icon: Shield,
      description: t("systemSecurityAuthenticationAnd"),
      component: SystemSecuritySettings,
    },
    {
      id: 'features',
      label: t("featureManagement"),
      icon: Settings,
      description: t("enabledisableFeaturesAndManage"),
      component: FeatureManagement,
    },
    {
      id: 'companies',
      label: t("companyManagement"),
      icon: Building2,
      description: t("manageCompanySettingsAnd"),
      component: BulkOperations,
    },
    {
      id: 'branding',
      label: t("globalBranding"),
      icon: Palette,
      description: t("systemwideBrandingAndAppearance"),
      component: CompanyBrandingSettings,
    },
    {
      id: 'templates',
      label: t("templateManagement"),
      icon: FileText,
      description: t("manageGlobalTemplatesAnd"),
      component: TemplateManagement,
    },
    {
      id: 'notifications',
      label: t("notifications"),
      icon: Bell,
      description: t("globalNotificationSettingsAnd"),
      component: GlobalNotificationSettings,
    },
    {
      id: 'database',
      label: t("database"),
      icon: Database,
      description: t("databaseManagementBackupsAnd"),
      component: DatabaseManagement,
    },
    {
      id: 'integrations',
      label: t("integrations"),
      icon: Users,
      description: t("thirdpartyIntegrationsAndApi"),
      component: SystemIntegrations,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs />

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-teal-500/10 opacity-50"></div>
          <div className="relative p-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="p-3 rounded-xl bg-teal-500 shadow-sm">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 bg-clip-text text-transparent">{t("systemSettings")}</h1>
                  <p className="text-slate-600 text-lg">{t("configureSystemwideSettingsAnd")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <Card className="border-0 shadow-lg bg-white border border-slate-200 rounded-xl hover:border-teal-500/50 hover:shadow-sm transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Settings className="h-5 w-5 text-teal-600" />{t("configurationManagement")}</CardTitle>
          <CardDescription className="text-slate-600">{t("manageAllSystemwideSettings")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-teal-500 data-[state=active]:text-white rounded-xl transition-all hover:bg-teal-50"
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
                  <h3 className="text-xl font-semibold text-slate-900">
                    {tab.label}
                  </h3>
                  <p className="text-slate-600">
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