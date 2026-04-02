import { useState } from 'react';
import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Link as LinkIcon,
  Wand2,
  Shield,
  Users
} from 'lucide-react';
import { HelpIcon } from '@/components/help/HelpIcon';
import { AccountMappingSettings } from '@/components/finance/AccountMappingSettings';
import { EssentialAccountMappingsManager } from '@/components/finance/EssentialAccountMappingsManager';
import { AuditTrailViewer } from '@/components/finance/AuditTrailViewer';

const FinanceSettings = () => {
  const [activeTab, setActiveTab] = useState('mappings');

  return (
    <ProtectedFinanceRoute 
      permission="finance.settings.view"
      title="الإعدادات المالية"
    >
      <FinanceErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
        title="خطأ في الإعدادات المالية"
        context="الإعدادات المالية"
      >
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl">
                <Settings className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">الإعدادات المالية</h1>
                  <HelpIcon topic="financeSettings" />
                </div>
                <p className="text-sm text-slate-500">إعدادات وأدوات النظام المالي</p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100">
              <TabsTrigger value="mappings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <LinkIcon className="h-4 w-4" />
                ربط الحسابات
              </TabsTrigger>
              <TabsTrigger value="wizard" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <Wand2 className="h-4 w-4" />
                معالج الإعداد
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <Shield className="h-4 w-4" />
                سجل التدقيق
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900">
                <Users className="h-4 w-4" />
                الصلاحيات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mappings" className="space-y-6">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <LinkIcon className="h-5 w-5" />
                    ربط الحسابات
                    <HelpIcon topic="accountMappings" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <EssentialAccountMappingsManager />
                    <AccountMappingSettings />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wizard" className="space-y-6">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Wand2 className="h-5 w-5" />
                    معالج إعداد النظام المحاسبي
                    <HelpIcon topic="accountingWizard" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-slate-500">
                    <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>معالج إعداد نظام محاسبي متكامل</p>
                    <p className="text-sm mt-2">للشركات الجديدة</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Shield className="h-5 w-5" />
                    سجل التدقيق الشامل
                    <HelpIcon topic="auditTrail" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditTrailViewer />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <Card className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Users className="h-5 w-5" />
                    إدارة الصلاحيات المالية
                    <HelpIcon topic="financePermissions" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-slate-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>إدارة صلاحيات المستخدمين للنظام المالي</p>
                    <p className="text-sm mt-2">التحكم في الوصول والصلاحيات</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </FinanceErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default FinanceSettings;