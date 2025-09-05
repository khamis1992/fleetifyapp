import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, FileText, Users, Shield } from 'lucide-react';

const Legal = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Scale className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">الشؤون القانونية</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              العقود والاتفاقيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              إدارة العقود والاتفاقيات القانونية للشركة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              الاستشارات القانونية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              خدمات الاستشارة القانونية والدعم القانوني
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              الامتثال والمخاطر
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              إدارة المخاطر القانونية والامتثال للقوانين
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Legal;