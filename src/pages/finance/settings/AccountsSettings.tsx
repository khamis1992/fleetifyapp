import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Copy, FileText } from "lucide-react";
import { useCopyDefaultAccounts } from "@/hooks/useChartOfAccounts";
import { toast } from "sonner";

export default function AccountsSettings() {
  const navigate = useNavigate();
  const copyDefaultAccounts = useCopyDefaultAccounts();

  const handleCopyDefaults = () => {
    copyDefaultAccounts.mutate();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الحسابات</h1>
          <p className="text-muted-foreground">إدارة دليل الحسابات والحسابات المحاسبية</p>
        </div>
        <Button onClick={() => navigate("/finance/chart-of-accounts/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          حساب جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/chart-of-accounts")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              دليل الحسابات
            </CardTitle>
            <CardDescription>
              عرض وإدارة جميع الحسابات المحاسبية
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/chart-of-accounts/new")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              إضافة حساب جديد
            </CardTitle>
            <CardDescription>
              إنشاء حساب محاسبي جديد في دليل الحسابات
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              نسخ الحسابات الافتراضية
            </CardTitle>
            <CardDescription>
              نسخ دليل الحسابات الافتراضي للشركة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCopyDefaults}
              disabled={copyDefaultAccounts.isPending}
              className="w-full"
              variant="outline"
            >
              {copyDefaultAccounts.isPending ? "جاري النسخ..." : "نسخ الحسابات الافتراضية"}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/account-mappings")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              ربط الحسابات
            </CardTitle>
            <CardDescription>
              إدارة ربط الحسابات بالأقسام المختلفة
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">أنواع الحسابات</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• الأصول (Assets): النقد، البنوك، المخزون</li>
                <li>• الخصوم (Liabilities): الذمم الدائنة، القروض</li>
                <li>• الإيرادات (Revenue): مبيعات، خدمات</li>
                <li>• المصروفات (Expenses): رواتب، إيجار</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">أرقام الحسابات</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 1xxx: الأصول</li>
                <li>• 2xxx: الخصوم</li>
                <li>• 3xxx: حقوق الملكية</li>
                <li>• 4xxx: الإيرادات</li>
                <li>• 5xxx: المصروفات</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}