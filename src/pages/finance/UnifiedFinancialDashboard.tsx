import React from 'react';
import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import { FinanceErrorBoundary } from '@/components/finance/FinanceErrorBoundary';
import { QuickSystemCheck } from '@/components/finance/QuickSystemCheck';
import { FinanceSystemDiagnostics } from '@/components/finance/FinanceSystemDiagnostics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Settings,
  DollarSign,
  Target,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { HelpIcon } from '@/components/help/HelpIcon';

const UnifiedFinancialDashboard = () => {
  return (
    <ProtectedFinanceRoute 
      permission="finance.view"
      title="الوحة المالية"
    >
      <FinanceErrorBoundary
        error={null}
        isLoading={false}
        onRetry={() => window.location.reload()}
        title="خطأ في الوحة المالية"
        context="الوحة المالية الرئيسية"
      >
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl text-primary-foreground">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">الوحة المالية الموحدة</h1>
                  <HelpIcon topic="generalLedger" />
                </div>
                <p className="text-muted-foreground">نظرة شاملة على الوضع المالي للشركة</p>
              </div>
            </div>
          </div>

          {/* Quick System Check */}
          <QuickSystemCheck />

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                الحسابات
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                التقارير
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                التشخيص
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0.000 د.ك</div>
                    <p className="text-xs text-muted-foreground">
                      +0% من الشهر الماضي
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0.000 د.ك</div>
                    <p className="text-xs text-muted-foreground">
                      +0% من الشهر الماضي
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0.000 د.ك</div>
                    <p className="text-xs text-muted-foreground">
                      +0% من الشهر الماضي
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>الإجراءات السريعة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button asChild className="h-20 flex-col">
                      <Link to="/finance/chart-of-accounts">
                        <FileText className="h-6 w-6 mb-2" />
                        دليل الحسابات
                      </Link>
                    </Button>
                    
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link to="/finance/ledger">
                        <BarChart3 className="h-6 w-6 mb-2" />
                        دفتر الأستاذ
                      </Link>
                    </Button>
                    
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link to="/finance/payments">
                        <DollarSign className="h-6 w-6 mb-2" />
                        المدفوعات
                      </Link>
                    </Button>
                    
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <Link to="/finance/reports">
                        <TrendingUp className="h-6 w-6 mb-2" />
                        التقارير
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accounts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>إدارة الحسابات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      انتقل إلى دليل الحسابات لإدارة حساباتك المحاسبية
                    </p>
                    <Button asChild className="mt-4">
                      <Link to="/finance/chart-of-accounts">
                        فتح دليل الحسابات
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>التقارير المالية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      التقارير المالية المتقدمة تحت التطوير
                    </p>
                    <Button asChild variant="outline" className="mt-4">
                      <Link to="/finance/reports">
                        عرض التقارير المتاحة
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnostics" className="space-y-6">
              <FinanceSystemDiagnostics />
            </TabsContent>
          </Tabs>
        </div>
      </FinanceErrorBoundary>
    </ProtectedFinanceRoute>
  );
};

export default UnifiedFinancialDashboard;