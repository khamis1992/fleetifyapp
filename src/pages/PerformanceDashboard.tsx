import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const PerformanceDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">لوحة الأداء</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            لوحة تحليل الأداء قيد التطوير
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;

