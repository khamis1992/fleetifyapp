import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Key, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface APIKeySettingsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export const APIKeySettings: React.FC<APIKeySettingsProps> = ({
  apiKey,
  onApiKeyChange
}) => {
  const [localKey, setLocalKey] = useState(apiKey);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showKey, setShowKey] = useState(false);

  const handleSaveKey = () => {
    if (!localKey.trim()) {
      toast.error('يرجى إدخال مفتاح API');
      return;
    }

    if (!localKey.startsWith('sk-')) {
      toast.error('مفتاح API غير صحيح. يجب أن يبدأ بـ sk-');
      return;
    }

    onApiKeyChange(localKey);
    toast.success('تم حفظ مفتاح API بنجاح');
  };

  const handleTestConnection = async () => {
    if (!localKey.trim()) {
      toast.error('يرجى إدخال مفتاح API أولاً');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Simple test: try to make a minimal API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${localKey}`
        }
      });

      if (response.ok) {
        setConnectionStatus('success');
        toast.success('الاتصال ناجح! المفتاح يعمل بشكل صحيح');
      } else {
        setConnectionStatus('error');
        toast.error('فشل الاتصال. تحقق من صحة المفتاح');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('حدث خطأ في الاتصال');
      console.error('Connection test error:', error);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleClearKey = () => {
    setLocalKey('');
    onApiKeyChange('');
    setConnectionStatus('idle');
    toast.success('تم مسح مفتاح API');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            إعدادات OpenAI API
          </CardTitle>
          <CardDescription>
            قم بإدخال مفتاح OpenAI API الخاص بك لاستخدام المستشار القانوني الذكي
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="api-key">مفتاح API</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={handleSaveKey}
                disabled={!localKey.trim() || localKey === apiKey}
              >
                حفظ
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              يمكنك الحصول على مفتاح API من{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                لوحة تحكم OpenAI
              </a>
            </p>
          </div>

          {/* Connection Test */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!localKey.trim() || isTestingConnection}
              className="flex-1"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الاختبار...
                </>
              ) : (
                'اختبار الاتصال'
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearKey}
              disabled={!localKey.trim()}
            >
              مسح
            </Button>
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'idle' && (
            <Alert variant={connectionStatus === 'success' ? 'default' : 'destructive'}>
              {connectionStatus === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {connectionStatus === 'success'
                  ? 'الاتصال ناجح! يمكنك الآن استخدام المستشار القانوني'
                  : 'فشل الاتصال. تحقق من صحة مفتاح API'}
              </AlertDescription>
            </Alert>
          )}

          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">حالة المفتاح:</span>
            <Badge variant={apiKey ? 'default' : 'secondary'}>
              {apiKey ? 'محفوظ' : 'غير محفوظ'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>ملاحظة أمنية:</strong> يتم حفظ مفتاح API محلياً في متصفحك فقط. لا يتم إرساله
          إلى خوادمنا. تأكد من عدم مشاركة مفتاحك مع أي شخص.
        </AlertDescription>
      </Alert>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إرشادات الاستخدام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-1">
            <p>• استخدم مفتاح API خاص بشركتك فقط</p>
            <p>• راقب استخدامك على لوحة تحكم OpenAI</p>
            <p>• قم بتعيين حدود للإنفاق الشهري</p>
            <p>• احتفظ بنسخة احتياطية من مفتاحك في مكان آمن</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
