import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, 
  Palette, 
  FileText, 
  Database,
  Zap,
  Shield,
  Globe,
  Bell
} from 'lucide-react';
import { CompanyBrandingSettings } from '@/components/settings/CompanyBrandingSettings';
import { TemplateManagement } from '@/components/settings/TemplateManagement';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import UnifiedSettings from './hr/UnifiedSettings';

export default function AdvancedSettings() {
  const settingsTabs = [
    {
      id: 'branding',
      label: 'الهوية البصرية',
      icon: Palette,
      description: 'تخصيص الشعار والألوان والخطوط',
      component: <CompanyBrandingSettings />
    },
    {
      id: 'templates',
      label: 'إدارة القوالب',
      icon: FileText,
      description: 'قوالب الفواتير والعقود والتقارير',
      component: <TemplateManagement />
    },
    {
      id: 'hr-settings',
      label: 'إعدادات الموارد البشرية',
      icon: Settings2,
      description: 'إعدادات الحضور والرواتب والموظفين',
      component: <UnifiedSettings />
    },
    {
      id: 'system',
      label: 'إعدادات النظام',
      icon: Database,
      description: 'إعدادات عامة للنظام والأمان',
      component: <SystemSettings />
    },
    {
      id: 'integrations',
      label: 'التكاملات',
      icon: Zap,
      description: 'ربط النظام مع الخدمات الخارجية',
      component: <IntegrationsSettings />
    },
    {
      id: 'notifications',
      label: 'الإشعارات المتقدمة',
      icon: Bell,
      description: 'إعدادات الإشعارات والتنبيهات',
      component: <NotificationsSettings />
    }
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" dir="rtl">
      <div className="space-y-6">
        <Breadcrumbs />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Settings2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">الإعدادات المتقدمة</h1>
              <p className="text-muted-foreground">
                تخصيص وتكوين جميع جوانب النظام
              </p>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="branding" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-col h-20 w-32 text-xs gap-2 data-[state=active]:bg-background"
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {settingsTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <tab.icon className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle className="text-xl">{tab.label}</CardTitle>
                      <CardDescription>{tab.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {tab.component}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

// Placeholder components for other settings tabs
const SystemSettings: React.FC = () => (
  <div className="space-y-6" dir="rtl">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            الأمان والحماية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">إعدادات الأمان والحماية - قيد التطوير</p>
          <Badge variant="outline">قريباً</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            قاعدة البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">إعدادات قاعدة البيانات - قيد التطوير</p>
          <Badge variant="outline">قريباً</Badge>
        </CardContent>
      </Card>
    </div>
  </div>
);

const IntegrationsSettings: React.FC = () => (
  <div className="space-y-6" dir="rtl">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { name: 'البريد الإلكتروني', icon: '📧', status: 'متاح' },
        { name: 'الرسائل النصية', icon: '📱', status: 'قريباً' },
        { name: 'الدفع الإلكتروني', icon: '💳', status: 'قريباً' },
        { name: 'التقويم', icon: '📅', status: 'قريباً' },
        { name: 'المحاسبة', icon: '📊', status: 'قريباً' },
        { name: 'CRM خارجي', icon: '🤝', status: 'قريباً' }
      ].map((integration) => (
        <Card key={integration.name}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <h3 className="font-semibold">{integration.name}</h3>
                <Badge variant={integration.status === 'متاح' ? 'default' : 'outline'}>
                  {integration.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const NotificationsSettings: React.FC = () => (
  <div className="space-y-6" dir="rtl">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          إعدادات الإشعارات المتقدمة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">نظام إشعارات متقدم - قيد التطوير</p>
        <Badge variant="outline" className="mt-2">قريباً</Badge>
      </CardContent>
    </Card>
  </div>
);