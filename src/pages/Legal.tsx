import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, FileText, AlertTriangle } from 'lucide-react';

const Legal = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Scale className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">القسم القانوني</h1>
          <p className="text-muted-foreground">إدارة الشؤون القانونية والمراسلات</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الشؤون القانونية</CardTitle>
          <CardDescription>إدارة القضايا والمراسلات القانونية</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">محتوى القسم القانوني سيكون هنا</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Legal;