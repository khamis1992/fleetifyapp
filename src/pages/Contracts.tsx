import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const Contracts = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">العقود</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          عقد جديد
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>إدارة العقود</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            مرحباً بك في صفحة إدارة العقود. هنا يمكنك إنشاء وإدارة جميع العقود.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contracts;