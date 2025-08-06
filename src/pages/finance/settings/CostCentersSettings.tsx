import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building, TrendingUp, Settings } from "lucide-react";

export default function CostCentersSettings() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة مراكز التكلفة</h1>
          <p className="text-muted-foreground">إنشاء وإدارة مراكز التكلفة للمتابعة المالية</p>
        </div>
        <Button onClick={() => navigate("/finance/cost-centers/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          مركز تكلفة جديد
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/cost-centers")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              عرض مراكز التكلفة
            </CardTitle>
            <CardDescription>
              استعراض جميع مراكز التكلفة المسجلة
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/cost-centers/new")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              إضافة مركز جديد
            </CardTitle>
            <CardDescription>
              إنشاء مركز تكلفة جديد للمتابعة المالية
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => navigate("/finance/cost-centers/reports")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              تقارير مراكز التكلفة
            </CardTitle>
            <CardDescription>
              تقارير الأداء المالي لمراكز التكلفة
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>دليل مراكز التكلفة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">ما هي مراكز التكلفة؟</h4>
              <p className="text-sm text-muted-foreground mb-2">
                مراكز التكلفة هي وحدات تنظيمية تساعد في تتبع وتحليل التكاليف والإيرادات حسب الأقسام أو المشاريع.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• تتبع التكاليف حسب القسم</li>
                <li>• مراقبة الميزانيات</li>
                <li>• تحليل الربحية</li>
                <li>• إعداد تقارير مفصلة</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">أمثلة على مراكز التكلفة</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• قسم المبيعات</li>
                <li>• قسم التسويق</li>
                <li>• قسم الموارد البشرية</li>
                <li>• قسم تقنية المعلومات</li>
                <li>• مشروع محدد</li>
                <li>• فرع معين</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}