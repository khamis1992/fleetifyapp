import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ProfessionalPaymentSystem: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle>النظام المهني للمدفوعات</CardTitle>
          </div>
          <CardDescription>
            نظام إدارة المدفوعات المتقدم مع التكامل المحاسبي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              النظام المهني للمدفوعات قيد التطوير حالياً. سيتم تفعيله قريباً مع جميع الميزات المتقدمة.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-2">التخصيص التلقائي للمدفوعات</h3>
                  <p className="text-sm text-muted-foreground">قريباً</p>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-2">التكامل المحاسبي</h3>
                  <p className="text-sm text-muted-foreground">قريباً</p>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-2">تتبع المراجعة</h3>
                  <p className="text-sm text-muted-foreground">قريباً</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-center">
              <Button variant="outline" disabled>
                استكشاف الميزات المتقدمة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfessionalPaymentSystem;