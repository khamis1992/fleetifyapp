/**
 * Test version to verify routing works
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cards';

const LegalCasesTrackingTest = () => {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-right">
            🎉 التصميم الجديد يعمل!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-right">
            <p className="text-xl">إذا كنت ترى هذه الرسالة، فهذا يعني أن:</p>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li>✅ المسار في App.tsx يعمل بشكل صحيح</li>
              <li>✅ الصفحة الجديدة يتم تحميلها</li>
              <li>✅ لا توجد أخطاء في الاستيراد</li>
            </ul>
            <p className="text-muted-foreground mt-6">
              الآن سنقوم بإضافة المكونات الكاملة تدريجياً...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalCasesTrackingTest;
