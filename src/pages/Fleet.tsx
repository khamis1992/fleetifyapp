import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Settings, FileText, AlertTriangle } from "lucide-react";

const Fleet = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة الأسطول</h1>
          <p className="text-muted-foreground">إدارة شاملة للمركبات والصيانة</p>
        </div>
      </div>

      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vehicles">المركبات</TabsTrigger>
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
          <TabsTrigger value="violations">المخالفات</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>قائمة المركبات</CardTitle>
              <CardDescription>إدارة أسطول المركبات</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى إدارة المركبات سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>سجل الصيانة</CardTitle>
              <CardDescription>متابعة أعمال الصيانة والإصلاحات</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى إدارة الصيانة سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations">
          <Card>
            <CardHeader>
              <CardTitle>المخالفات المرورية</CardTitle>
              <CardDescription>متابعة المخالفات والغرامات</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى إدارة المخالفات سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Fleet;