import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const Customers = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">العملاء</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          عميل جديد
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>إدارة العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            مرحباً بك في صفحة إدارة العملاء. هنا يمكنك إضافة وإدارة جميع العملاء.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;