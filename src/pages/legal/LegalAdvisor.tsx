import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, BookOpen, MessageCircle, FileCheck } from 'lucide-react';

const LegalAdvisor = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Scale className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">المستشار القانوني</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              المراجع القانونية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              الوصول إلى المراجع والقوانين ذات الصلة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              الاستشارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              طلب الاستشارة القانونية والحصول على المشورة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              مراجعة الوثائق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              مراجعة الوثائق والعقود القانونية
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LegalAdvisor;