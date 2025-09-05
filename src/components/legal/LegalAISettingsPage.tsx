import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Key, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Shield,
  Zap,
  Database,
  ExternalLink,
  Activity
} from 'lucide-react';

interface SystemHealth {
  openai_api: boolean;
  edge_function: boolean;
  database: boolean;
  overall_status: 'healthy' | 'degraded' | 'down';
  last_check: string;
  errors: string[];
}

const LegalAISettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    openai_api: false,
    edge_function: false,
    database: false,
    overall_status: 'down',
    last_check: new Date().toISOString(),
    errors: []
  });

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    setIsLoading(true);
    const errors: string[] = [];
    
    try {
      // Test database connection
      const { data: testData, error: dbError } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      const databaseStatus = !dbError;
      if (dbError) {
        errors.push(`Database: ${dbError.message}`);
      }

      // Test edge function
      let edgeFunctionStatus = false;
      try {
        const { data: healthData, error: healthError } = await supabase.functions.invoke('legal-ai-api', {
          body: { path: 'health' }
        });
        
        edgeFunctionStatus = !healthError && healthData?.status === 'healthy';
        if (healthError) {
          errors.push(`Edge Function: ${healthError.message}`);
        }
      } catch (error) {
        errors.push(`Edge Function: ${error instanceof Error ? error.message : 'Connection failed'}`);
      }

      // Test OpenAI API (through health endpoint)
      let openaiStatus = false;
      try {
        const { data: healthData } = await supabase.functions.invoke('legal-ai-api', {
          body: { path: 'health' }
        });
        openaiStatus = healthData?.openai_available || false;
        if (!openaiStatus) {
          errors.push('OpenAI API: Key not configured or invalid');
        }
      } catch (error) {
        errors.push(`OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const overallStatus: SystemHealth['overall_status'] = 
        databaseStatus && edgeFunctionStatus && openaiStatus ? 'healthy' :
        databaseStatus && edgeFunctionStatus ? 'degraded' : 'down';

      setSystemHealth({
        openai_api: openaiStatus,
        edge_function: edgeFunctionStatus,
        database: databaseStatus,
        overall_status: overallStatus,
        last_check: new Date().toISOString(),
        errors
      });

    } catch (error) {
      console.error('Error checking system health:', error);
      setSystemHealth({
        openai_api: false,
        edge_function: false,
        database: false,
        overall_status: 'down',
        last_check: new Date().toISOString(),
        errors: [`System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testOpenAIConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح OpenAI API أولاً');
      return;
    }

    setIsTestingConnection(true);
    
    try {
      // Test the API key by making a simple request
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (testResponse.ok) {
        toast.success('✅ تم التحقق من صحة مفتاح OpenAI API بنجاح!');
        setSystemHealth(prev => ({ ...prev, openai_api: true }));
      } else {
        const errorData = await testResponse.json();
        toast.error(`❌ مفتاح OpenAI API غير صحيح: ${errorData.error?.message || 'خطأ غير معروف'}`);
      }
    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      toast.error('❌ فشل في اختبار الاتصال مع OpenAI');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveAPIKey = async () => {
    if (!apiKey.trim()) {
      toast.error('يرجى إدخال مفتاح OpenAI API');
      return;
    }

    setIsLoading(true);
    
    try {
      // Here you would typically save the API key to your secure storage
      // For Supabase edge functions, this would be in the secrets
      toast.info('💡 يجب حفظ المفتاح في إعدادات Supabase Edge Functions');
      toast.info('📝 انتقل إلى لوحة تحكم Supabase > Functions > Secrets وأضف OPENAI_API_KEY');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('فشل في حفظ مفتاح API');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: SystemHealth['overall_status']) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">صحي</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">متدهور</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">معطل</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">غير معروف</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* رأس الصفحة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">إعدادات النظام القانوني الذكي</CardTitle>
                <p className="text-sm text-gray-600">
                  إدارة وتكوين نظام الذكاء الاصطناعي القانوني
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(systemHealth.overall_status)}
              <Button variant="outline" size="sm" onClick={checkSystemHealth} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث الحالة
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="system-health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system-health">حالة النظام</TabsTrigger>
          <TabsTrigger value="api-settings">إعدادات API</TabsTrigger>
          <TabsTrigger value="troubleshooting">استكشاف الأخطاء</TabsTrigger>
        </TabsList>

        {/* تبويب حالة النظام */}
        <TabsContent value="system-health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قاعدة البيانات</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth.database)}
                  <span className={`text-sm ${systemHealth.database ? 'text-green-600' : 'text-red-600'}`}>
                    {systemHealth.database ? 'متصلة' : 'غير متاحة'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Edge Function</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth.edge_function)}
                  <span className={`text-sm ${systemHealth.edge_function ? 'text-green-600' : 'text-red-600'}`}>
                    {systemHealth.edge_function ? 'يعمل' : 'معطل'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">OpenAI API</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(systemHealth.openai_api)}
                  <span className={`text-sm ${systemHealth.openai_api ? 'text-green-600' : 'text-red-600'}`}>
                    {systemHealth.openai_api ? 'متاح' : 'غير متاح'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* الأخطاء */}
          {systemHealth.errors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">الأخطاء المكتشفة:</p>
                  <ul className="list-disc list-inside text-sm">
                    {systemHealth.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>معلومات آخر فحص</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                آخر فحص: {new Date(systemHealth.last_check).toLocaleString('ar')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب إعدادات API */}
        <TabsContent value="api-settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>إعداد مفتاح OpenAI API</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">مفتاح OpenAI API</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  يبدأ المفتاح عادة بـ "sk-" ويتكون من حروف وأرقام
                </p>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={testOpenAIConnection} 
                  disabled={isTestingConnection || !apiKey.trim()}
                  variant="outline"
                >
                  {isTestingConnection ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  اختبار الاتصال
                </Button>
                
                <Button onClick={saveAPIKey} disabled={isLoading || !apiKey.trim()}>
                  حفظ المفتاح
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">لحفظ المفتاح بشكل آمن:</p>
                  <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                    <li>انتقل إلى لوحة تحكم Supabase</li>
                    <li>اختر Functions ثم Secrets</li>
                    <li>أضف متغير جديد باسم OPENAI_API_KEY</li>
                    <li>ألصق المفتاح في القيمة</li>
                  </ol>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 mt-2"
                    onClick={() => window.open('https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/functions', '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    فتح إعدادات Supabase
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تبويب استكشاف الأخطاء */}
        <TabsContent value="troubleshooting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الحلول الشائعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">النظام لا يستجيب</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    <li>تحقق من اتصال الإنترنت</li>
                    <li>أعد تحميل الصفحة</li>
                    <li>تأكد من إعداد مفتاح OpenAI API</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">استجابات غير صحيحة</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    <li>تحقق من صحة مفتاح OpenAI API</li>
                    <li>جرب إعادة صياغة السؤال</li>
                    <li>تأكد من وضوح الاستفسار</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">مشاكل في الاتصال</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    <li>تحقق من حالة Supabase</li>
                    <li>تأكد من تفعيل Edge Functions</li>
                    <li>فحص سجلات الأخطاء</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>روابط مفيدة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                إدارة مفاتيح OpenAI
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/functions', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Supabase Edge Functions
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => window.open('https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/functions/legal-ai-api/logs', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                سجلات Edge Function
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LegalAISettingsPage;