import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
  Palette
} from 'lucide-react';
import { CompanyBrandingSettings } from '@/components/settings/CompanyBrandingSettings';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

export default function AdvancedSettings() {
  const settingsTabs = [
    {
      id: 'branding',
      label: 'الهوية البصرية',
      icon: Palette,
      description: 'تخصيص الشعار والألوان والخطوط',
      component: <CompanyBrandingSettings />
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
              <Palette className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">إعدادات الهوية البصرية</h1>
              <p className="text-muted-foreground">
                تخصيص الشعار والألوان والعناصر البصرية للنظام
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
