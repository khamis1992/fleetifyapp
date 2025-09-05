import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building, UserPlus, Search } from "lucide-react";

const Customers = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إدارة العملاء</h1>
          <p className="text-muted-foreground">إدارة شاملة لقاعدة العملاء</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">جميع العملاء</TabsTrigger>
          <TabsTrigger value="companies">الشركات</TabsTrigger>
          <TabsTrigger value="individuals">الأفراد</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>قائمة العملاء</CardTitle>
              <CardDescription>جميع العملاء المسجلين في النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى قائمة العملاء سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>عملاء الشركات</CardTitle>
              <CardDescription>العملاء من فئة الشركات والمؤسسات</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى عملاء الشركات سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individuals">
          <Card>
            <CardHeader>
              <CardTitle>العملاء الأفراد</CardTitle>
              <CardDescription>العملاء من فئة الأفراد</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">محتوى العملاء الأفراد سيكون هنا</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Customers;