import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Construction } from 'lucide-react';

export const ProfessionalPaymentSystem: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          النظام الاحترافي للمدفوعات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-4">
            <Construction className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium">النظام قيد التطوير</h3>
            <p className="text-muted-foreground">
              سيتم إضافة ميزات النظام الاحترافي للمدفوعات قريباً
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};