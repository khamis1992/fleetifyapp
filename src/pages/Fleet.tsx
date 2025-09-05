import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';

const Fleet = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة الأسطول</h1>
        <Button>
          <Truck className="h-4 w-4 mr-2" />
          مركبة جديدة
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>إدارة الأسطول</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            مرحباً بك في صفحة إدارة الأسطول. هنا يمكنك إدارة جميع المركبات.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Fleet;