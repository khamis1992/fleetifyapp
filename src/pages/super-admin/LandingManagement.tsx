import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LandingContentManager } from '@/components/super-admin/landing/LandingContentManager';
import { LandingMediaLibrary } from '@/components/super-admin/landing/LandingMediaLibrary';
import { LandingThemeSettings } from '@/components/super-admin/landing/LandingThemeSettings';
import { LandingAnalytics } from '@/components/super-admin/landing/LandingAnalytics';
import { LandingPreview } from '@/components/super-admin/landing/LandingPreview';
import { LandingABTesting } from '@/components/super-admin/landing/LandingABTesting';
import { Monitor, Image, Palette, BarChart3, Eye, TestTube } from 'lucide-react';

const LandingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('content');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            إدارة الصفحات المقصودة
          </h1>
          <p className="text-muted-foreground">
            إدارة وتخصيص الصفحات المقصودة لجميع الشركات
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              المحتوى
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              الوسائط
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              القوالب
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              التحليلات
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              المعاينة
            </TabsTrigger>
            <TabsTrigger value="ab-testing" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              اختبار أ/ب
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إدارة المحتوى</CardTitle>
                <CardDescription>
                  إدارة أقسام ومحتوى الصفحات المقصودة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingContentManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>مكتبة الوسائط</CardTitle>
                <CardDescription>
                  رفع وإدارة الصور والفيديوهات والوسائط الأخرى
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingMediaLibrary />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="themes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات القوالب</CardTitle>
                <CardDescription>
                  تخصيص الألوان والخطوط والتصميم المرئي
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingThemeSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تحليلات الصفحة المقصودة</CardTitle>
                <CardDescription>
                  عرض مقاييس الأداء وبيانات تفاعل المستخدمين
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المعاينة المباشرة</CardTitle>
                <CardDescription>
                  معاينة كيف ستظهر الصفحات المقصودة للزوار
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingPreview />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ab-testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>اختبار أ/ب</CardTitle>
                <CardDescription>
                  إنشاء وإدارة اختبارات أ/ب لتحسين الصفحة المقصودة
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LandingABTesting />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LandingManagement;