import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff, 
  Settings, 
  Shield, 
  Zap,
  DollarSign,
  Info,
  AlertTriangle
} from 'lucide-react';

interface APIKeySettingsProps {
  onApiKeyChange?: (apiKey: string) => void;
}

interface APIStatus {
  isValid: boolean;
  isConnected: boolean;
  model: string;
  usage: {
    requests: number;
    cost: number;
    savings: number;
  };
}

const APIKeySettings: React.FC<APIKeySettingsProps> = ({ onApiKeyChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<APIStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // تحميل API Key المحفوظ عند بدء التشغيل
  useEffect(() => {
    const savedApiKey = localStorage.getItem('fleetify_openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      checkApiKeyStatus(savedApiKey);
    }
  }, []);

  // فحص حالة API Key
  const checkApiKeyStatus = async (key: string) => {
    if (!key || !key.startsWith('sk-')) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/check-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key })
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setError('');
      } else {
        setError('فشل في التحقق من صحة API Key');
        setStatus(null);
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  // حفظ API Key
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('يرجى إدخال API Key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      setError('API Key يجب أن يبدأ بـ sk-');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // حفظ في localStorage
      localStorage.setItem('fleetify_openai_api_key', apiKey);
      
      // فحص صحة المفتاح
      await checkApiKeyStatus(apiKey);
      
      // إشعار المكون الأب
      if (onApiKeyChange) {
        onApiKeyChange(apiKey);
      }

      setSuccess('تم حفظ API Key بنجاح');
    } catch (err) {
      setError('فشل في حفظ API Key');
    } finally {
      setIsLoading(false);
    }
  };

  // حذف API Key
  const handleRemoveApiKey = () => {
    localStorage.removeItem('fleetify_openai_api_key');
    setApiKey('');
    setStatus(null);
    setError('');
    setSuccess('تم حذف API Key');
    
    if (onApiKeyChange) {
      onApiKeyChange('');
    }
  };

  // اختبار الاتصال
  const testConnection = async () => {
    if (!apiKey) {
      setError('يرجى إدخال API Key أولاً');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (response.ok) {
        setSuccess('تم اختبار الاتصال بنجاح');
        await checkApiKeyStatus(apiKey);
      } else {
        setError('فشل في اختبار الاتصال');
      }
    } catch (err) {
      setError('خطأ في اختبار الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            إعدادات OpenAI API Key
          </CardTitle>
          <CardDescription>
            قم بإضافة مفتاح OpenAI API الخاص بك لتفعيل المستشار القانوني الذكي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* حقل إدخال API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSaveApiKey} 
                disabled={isLoading}
                className="shrink-0"
              >
                {isLoading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={testConnection}
              disabled={!apiKey || isLoading}
            >
              <Zap className="h-4 w-4 mr-2" />
              اختبار الاتصال
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveApiKey}
              disabled={!apiKey}
            >
              حذف المفتاح
            </Button>
          </div>

          {/* رسائل النجاح والخطأ */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* حالة API */}
          {status && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  حالة API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>الحالة:</span>
                  <Badge variant={status.isConnected ? "default" : "destructive"}>
                    {status.isConnected ? 'متصل' : 'غير متصل'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>النموذج:</span>
                  <Badge variant="outline">{status.model}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>الطلبات:</span>
                  <span>{status.usage.requests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>التكلفة:</span>
                  <span>${status.usage.cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>التوفير:</span>
                  <span className="text-green-600">${status.usage.savings.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* تبويبات الإعدادات المتقدمة */}
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="security">الأمان</TabsTrigger>
          <TabsTrigger value="cost">التكلفة</TabsTrigger>
          <TabsTrigger value="help">المساعدة</TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                الأمان والحماية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  يتم حفظ API Key محلياً في متصفحك فقط ولا يتم إرساله لأي خادم خارجي
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h4 className="font-medium">نصائح الأمان:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• لا تشارك API Key مع أحد</li>
                  <li>• راقب استخدامك في لوحة تحكم OpenAI</li>
                  <li>• حدد حد أقصى للإنفاق الشهري</li>
                  <li>• احذف المفتاح إذا لم تعد تستخدمه</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                إدارة التكلفة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">60-80%</div>
                  <div className="text-sm text-muted-foreground">توفير متوقع</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">$10-25</div>
                  <div className="text-sm text-muted-foreground">تكلفة شهرية متوقعة</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">كيف نوفر التكلفة:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• نظام ذاكرة ذكية للاستفسارات المتكررة</li>
                  <li>• قاعدة معرفة محلية للأسئلة الشائعة</li>
                  <li>• تحسين طول الاستجابات</li>
                  <li>• استخدام النماذج الأكثر كفاءة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>كيفية الحصول على API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center shrink-0">1</div>
                  <div>
                    <p className="font-medium">إنشاء حساب OpenAI</p>
                    <p className="text-sm text-muted-foreground">اذهب إلى platform.openai.com وأنشئ حساب</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center shrink-0">2</div>
                  <div>
                    <p className="font-medium">إنشاء API Key</p>
                    <p className="text-sm text-muted-foreground">انتقل إلى API Keys وأنشئ مفتاح جديد</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center shrink-0">3</div>
                  <div>
                    <p className="font-medium">إضافة رصيد</p>
                    <p className="text-sm text-muted-foreground">أضف طريقة دفع وحدد حد الإنفاق</p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تحتاج إلى رصيد في حساب OpenAI لاستخدام API. الحد الأدنى عادة $5-10
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default APIKeySettings;

