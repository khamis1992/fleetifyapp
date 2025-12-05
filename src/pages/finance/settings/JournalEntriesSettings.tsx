import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Search } from "lucide-react";

export default function JournalEntriesSettings() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة القيود المحاسبية</h1>
          <p className="text-muted-foreground">إنشاء وإدارة القيود المحاسبية</p>
        </div>
        <Button onClick={() => navigate("/finance/new-entry")} className="gap-2">
          <Plus className="h-4 w-4" />
          قيد جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/new-entry")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              إنشاء قيد جديد
            </CardTitle>
            <CardDescription>
              إنشاء قيد محاسبي جديد بخانة مدين ودائن
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate("/finance/ledger")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              عرض جميع القيود
            </CardTitle>
            <CardDescription>
              استعراض وإدارة القيود المحاسبية الموجودة
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate("/finance/ledger")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              البحث في القيود
            </CardTitle>
            <CardDescription>
              البحث والتصفية في القيود المحاسبية
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إرشادات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">إنشاء القيود</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• تأكد من توازن إجمالي المدين والدائن</li>
                <li>• اختر الحسابات المناسبة من دليل الحسابات</li>
                <li>• أضف وصف واضح للقيد</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">أفضل الممارسات</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• راجع القيود قبل الترحيل</li>
                <li>• استخدم مراكز التكلفة عند الحاجة</li>
                <li>• احتفظ بالمستندات المؤيدة</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}