import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Filter } from 'lucide-react';

const Reports = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">التقارير</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            تصفية
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
        </div>
      </div>
      
      {/* أنواع التقارير */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير العملاء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              تقرير شامل عن جميع العملاء وأنشطتهم
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير الأسطول
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              تقرير عن حالة وأداء المركبات
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              التقرير المالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              تقرير الإيرادات والمصروفات
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير العقود
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              تقرير حالة العقود والمدفوعات
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير الأداء
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              تحليل أداء النظام والعمليات
            </p>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير مخصص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              إنشاء تقرير مخصص حسب المتطلبات
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* تقارير حديثة */}
      <Card>
        <CardHeader>
          <CardTitle>التقارير الحديثة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">تقرير العملاء - ديسمبر 2024</h3>
                <p className="text-sm text-muted-foreground">تم إنشاؤه في 15 ديسمبر 2024</p>
              </div>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                تحميل
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">التقرير المالي - نوفمبر 2024</h3>
                <p className="text-sm text-muted-foreground">تم إنشاؤه في 1 ديسمبر 2024</p>
              </div>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                تحميل
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">تقرير الأسطول - نوفمبر 2024</h3>
                <p className="text-sm text-muted-foreground">تم إنشاؤه في 30 نوفمبر 2024</p>
              </div>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                تحميل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;