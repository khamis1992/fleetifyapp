import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

const Finance = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">الشؤون المالية</h1>
        <Button>
          <Calculator className="h-4 w-4 mr-2" />
          دفعة جديدة
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>الإدارة المالية</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            مرحباً بك في صفحة الشؤون المالية. هنا يمكنك إدارة جميع العمليات المالية.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;