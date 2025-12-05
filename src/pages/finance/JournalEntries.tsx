import React from 'react';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HelpIcon } from '@/components/help/HelpIcon';

const JournalEntries = () => {
  return (
    <FinanceErrorBoundary
      error={null}
      isLoading={false}
      onRetry={() => window.location.reload()}
      title="خطأ في القيود اليومية"
      context="صفحة القيود اليومية"
    >
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">القيود اليومية</h1>
                <HelpIcon topic="journalEntries" />
              </div>
              <p className="text-muted-foreground">إدارة القيود المحاسبية اليومية</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/finance/ledger">
                <Plus className="h-4 w-4 mr-2" />
                قيد جديد
              </Link>
            </Button>
          </div>
        </div>

        {/* صفحة مؤقتة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              صفحة تحت التطوير
            </CardTitle>
          </CardHeader>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">صفحة القيود اليومية تحت التطوير</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  نعمل حالياً على تطوير صفحة القيود اليومية المحسنة. 
                  يمكنك استخدام دفتر الأستاذ لإدارة القيود في الوقت الحالي.
                </p>
              </div>
              
              <div className="flex justify-center gap-3 pt-4">
                <Button asChild>
                  <Link to="/finance/ledger">
                    <FileText className="h-4 w-4 mr-2" />
                    دفتر الأستاذ
                  </Link>
                </Button>
                
                <Button variant="outline" asChild>
                  <Link to="/finance/hub">
                    العودة للوحة المالية
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceErrorBoundary>
  );
};

export default JournalEntries;