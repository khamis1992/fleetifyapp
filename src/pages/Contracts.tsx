import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";

const Contracts = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة العقود</h1>
          <p className="text-muted-foreground">إدارة شاملة للعقود والاتفاقيات</p>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">العقود النشطة</TabsTrigger>
          <TabsTrigger value="pending">قيد المراجعة</TabsTrigger>
          <TabsTrigger value="expired">منتهية الصلاحية</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>العقود النشطة</CardTitle>
              <CardDescription>العقود السارية المفعول حالياً</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى العقود النشطة سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>العقود قيد المراجعة</CardTitle>
              <CardDescription>العقود التي تحتاج للموافقة أو التوقيع</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى العقود قيد المراجعة سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card>
            <CardHeader>
              <CardTitle>العقود منتهية الصلاحية</CardTitle>
              <CardDescription>العقود المنتهية أو الملغاة</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى العقود المنتهية سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contracts;