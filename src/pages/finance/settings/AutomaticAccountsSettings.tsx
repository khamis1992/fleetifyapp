import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Settings, Zap, Link as LinkIcon } from "lucide-react";
import { useEssentialAccountMappings } from "@/hooks/useEssentialAccountMappings";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AutomaticAccountsSettings() {
  const navigate = useNavigate();
  const {
    mappingStatus,
    isLoading,
    hasMissingMappings,
    hasExistingMappings,
    autoConfigureEssentialMappings,
    isAutoConfiguring
  } = useEssentialAccountMappings();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const getAccountTypeLabel = (accountType: string) => {
    const labels: Record<string, string> = {
      'RECEIVABLES': 'حسابات القبض',
      'PAYABLES': 'حسابات الدفع',
      'CASH': 'النقد',
      'BANK': 'البنك',
      'REVENUE': 'الإيرادات',
      'EXPENSES': 'المصروفات',
      'VEHICLE_EXPENSES': 'مصروفات المركبات',
      'FUEL_EXPENSES': 'مصروفات الوقود',
      'MAINTENANCE_EXPENSES': 'مصروفات الصيانة',
      'EMPLOYEE_EXPENSES': 'مصروفات الموظفين',
      'LEGAL_EXPENSES': 'المصروفات القانونية',
      'CONTRACT_REVENUE': 'إيرادات العقود'
    };
    return labels[accountType] || accountType;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الحسابات التلقائية</h1>
          <p className="text-muted-foreground">إعداد وإدارة ربط الحسابات الأساسية تلقائياً</p>
        </div>
        <Button 
          onClick={() => navigate("/finance/account-mappings")}
          variant="outline"
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          إدارة الربط يدوياً
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحسابات المربوطة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mappingStatus?.existing?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">يمكن ربطها تلقائياً</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {mappingStatus?.created?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تحتاج إعداد يدوي</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {mappingStatus?.errors?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            الإعداد التلقائي للحسابات
          </CardTitle>
          <CardDescription>
            قم بإعداد الحسابات الأساسية المطلوبة للتكامل مع جميع الأقسام تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasMissingMappings && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                يوجد حسابات أساسية غير مربوطة. يُنصح بتشغيل الإعداد التلقائي لربط الحسابات المتاحة.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button 
              onClick={() => autoConfigureEssentialMappings()}
              disabled={isAutoConfiguring}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {isAutoConfiguring ? "جاري الإعداد..." : "تشغيل الإعداد التلقائي"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/finance/account-mappings")}
              className="gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              إدارة الربط يدوياً
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Existing Mappings */}
        {hasExistingMappings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                الحسابات المربوطة حالياً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mappingStatus?.existing?.map((accountType) => (
                  <div key={accountType} className="flex items-center justify-between">
                    <span className="text-sm">{getAccountTypeLabel(accountType)}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      مربوط
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Missing Mappings */}
        {hasMissingMappings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                الحسابات التي تحتاج إعداد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mappingStatus?.errors?.map((accountType) => (
                  <div key={accountType} className="flex items-center justify-between">
                    <span className="text-sm">{getAccountTypeLabel(accountType)}</span>
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      يحتاج ربط
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات مهمة حول الحسابات التلقائية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">ما هو الإعداد التلقائي؟</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• يقوم النظام بالبحث عن الحسابات المناسبة</li>
                <li>• يربط الحسابات الموجودة بالأقسام المختلفة</li>
                <li>• يوفر الوقت في الإعداد اليدوي</li>
                <li>• يضمن التكامل بين الأقسام والمحاسبة</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">الأقسام المدعومة</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• إدارة المركبات والأسطول</li>
                <li>• إدارة الموارد البشرية</li>
                <li>• الشؤون القانونية</li>
                <li>• إدارة العقود</li>
                <li>• المبيعات والعملاء</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
