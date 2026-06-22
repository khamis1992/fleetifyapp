import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/hooks/use-toast';

export const QuickSystemCheck: React.FC = () => {
  const { user } = useAuth();
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const runQuickCheck = async () => {
    setIsChecking(true);
    
    // محاكاة فحص سريع
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (user && companyId) {
      toast({
        title: "✅ النظام يعمل بشكل طبيعي",
        description: "جميع الفحوصات الأساسية تمت بنجاح",
      });
    } else {
      toast({
        title: "⚠️ مشكلة في النظام",
        description: "يرجى التحقق من البيانات الأساسية",
        variant: "destructive",
      });
    }
    
    setIsChecking(false);
  };

  const getSystemStatus = () => {
    if (!user) return { status: 'error', message: 'غير مسجل دخول' };
    if (!companyId) return { status: 'error', message: 'لا توجد شركة مرتبطة' };
    return { status: 'success', message: 'النظام يعمل بشكل طبيعي' };
  };

  const systemStatus = getSystemStatus();

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            فحص سريع للنظام
          </CardTitle>
          <Badge 
            variant={systemStatus.status === 'success' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {systemStatus.status === 'success' ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {systemStatus.message}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className={`text-lg font-bold ${user ? 'text-green-600' : 'text-red-600'}`}>
              {user ? '✓' : '✗'}
            </div>
            <div className="text-xs text-muted-foreground">تسجيل الدخول</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-bold ${companyId ? 'text-green-600' : 'text-red-600'}`}>
              {companyId ? '✓' : '✗'}
            </div>
            <div className="text-xs text-muted-foreground">بيانات الشركة</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-bold ${hasCompanyAdminAccess ? 'text-green-600' : 'text-yellow-600'}`}>
              {hasCompanyAdminAccess ? '⚡' : '👤'}
            </div>
            <div className="text-xs text-muted-foreground">
              {hasCompanyAdminAccess ? 'مدير' : 'مستخدم'}
            </div>
          </div>
        </div>
        
        <Button 
          onClick={runQuickCheck}
          disabled={isChecking}
          size="sm"
          variant="outline"
          className="w-full mt-4"
        >
          <RefreshCw className={`h-3 w-3 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'جاري الفحص...' : 'فحص سريع'}
        </Button>
      </CardContent>
    </Card>
  );
};