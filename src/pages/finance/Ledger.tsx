import React from 'react';
import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { QuickSystemCheck } from '@/components/finance/QuickSystemCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Ledger = () => {
  return (
    <ProtectedFinanceRoute 
      permission="finance.ledger.view"
      title="دفتر الأستاذ"
    >
      <FinanceErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
        title="خطأ في دفتر الأستاذ"
        context="صفحة دفتر الأستاذ"
      >
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">دفتر الأستاذ</h1>
                <p className="text-muted-foreground">إدارة القيود المحاسبية والحركات المالية</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link to="/finance/chart-of-accounts">
                  <Plus className="h-4 w-4 mr-2" />
                  قيد جديد
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick System Check */}
          <QuickSystemCheck />

          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                البحث والفلتر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="البحث في القيود..."
                    className="pl-10"
                  />
                </div>
                
                <Input
                  type="date"
                  placeholder="من تاريخ"
                />
                
                <Input
                  type="date"
                  placeholder="إلى تاريخ"
                />
                
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  تطبيق الفلاتر
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Journal Entries Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>القيود المحاسبية</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    تصدير
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    استيراد
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Placeholder for Journal Entries */}
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">دفتر الأستاذ تحت التطوير</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    نعمل حالياً على تطوير واجهة دفتر الأستاذ المتقدمة. 
                    يمكنك استخدام دليل الحسابات لإدارة الحسابات في الوقت الحالي.
                  </p>
                </div>
                
                <div className="flex justify-center gap-3 pt-6">
                  <Button asChild>
                    <Link to="/finance/chart-of-accounts">
                      <FileText className="h-4 w-4 mr-2" />
                      دليل الحسابات
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <Link to="/finance/payments">
                      المدفوعات
                    </Link>
                  </Button>
                  
                  <Button variant="outline" asChild>
                    <Link to="/finance/dashboard">
                      الوحة المالية
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </FinanceErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default Ledger;