import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Palette
} from 'lucide-react';
import { CompanyBrandingSettings } from '@/components/settings/CompanyBrandingSettings';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

export default function AdvancedSettings() {
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

        {/* Settings Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Palette className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-xl">الهوية البصرية</CardTitle>
                <CardDescription>تخصيص الشعار والألوان والخطوط</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CompanyBrandingSettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
