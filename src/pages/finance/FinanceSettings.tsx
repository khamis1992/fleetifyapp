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
import { AccountMappings } from '@/components/finance/AccountMappings';
import { AuditTrail } from '@/components/finance/AuditTrail';

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
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl text-white">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">الإعدادات المالية</h1>
                  <HelpIcon topic="financeSettings" />
                </div>
                <p className="text-muted-foreground">إعدادات وأدوات النظام المالي</p>
              </div>
            </div>
          </div>

          {/* Main Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="mappings" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                ربط الحسابات
              </TabsTrigger>
              <TabsTrigger value="wizard" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                معالج الإعداد
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                سجل التدقيق
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                الصلاحيات
              </TabsTrigger>
            </TabsList>

            {/* Account Mappings */}
            <TabsContent value="mappings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    ربط الحسابات
                    <HelpIcon topic="accountMappings" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AccountMappings />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Setup Wizard */}
            <TabsContent value="wizard" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    معالج إعداد النظام المحاسبي
                    <HelpIcon topic="accountingWizard" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>معالج إعداد نظام محاسبي متكامل</p>
                    <p className="text-sm mt-2">للشركات الجديدة</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audit Trail */}
            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    سجل التدقيق الشامل
                    <HelpIcon topic="auditTrail" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AuditTrail />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions */}
            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    إدارة الصلاحيات المالية
                    <HelpIcon topic="financePermissions" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
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
