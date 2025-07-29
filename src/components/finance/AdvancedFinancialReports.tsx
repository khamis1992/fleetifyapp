import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  Activity,
  Users,
  Truck,
  Building
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialOverview } from "@/hooks/useFinancialOverview";
import { useAdvancedFinancialAnalytics } from "@/hooks/useAdvancedFinancialAnalytics";
import { useActiveContracts } from "@/hooks/useContracts";
import { useAuth } from "@/contexts/AuthContext";
import { useReportingAccounts } from "@/hooks/useReportingAccounts";
import { AccountLevelBadge } from "@/components/finance/AccountLevelBadge";

interface ReportFilters {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  reportType: string;
  costCenter: string;
}

export function AdvancedFinancialReports() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: undefined,
    dateTo: undefined,
    reportType: 'all',
    costCenter: 'all'
  });

  const { data: financialOverview, isLoading: isOverviewLoading } = useFinancialOverview();
  const { data: analytics, isLoading: isAnalyticsLoading } = useAdvancedFinancialAnalytics();
  const { data: contracts } = useActiveContracts(undefined, undefined, user?.user_metadata?.company_id);
  const { data: reportingAccounts } = useReportingAccounts();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const generatePDFReport = (reportType: string) => {
    // سيتم تنفيذ هذه الدالة لاحقاً
    console.log(`Generating ${reportType} report...`);
  };

  const reportTypes = [
    {
      id: 'financial-overview',
      name: 'التقرير المالي الشامل',
      description: 'نظرة شاملة على الوضع المالي',
      icon: FileText,
      color: 'text-blue-500'
    },
    {
      id: 'fleet-financial',
      name: 'التقرير المالي للأسطول',
      description: 'تحليل تكاليف وإيرادات الأسطول',
      icon: Truck,
      color: 'text-green-500'
    },
    {
      id: 'contracts-revenue',
      name: 'تقرير إيرادات العقود',
      description: 'تحليل إيرادات العقود والعملاء',
      icon: Users,
      color: 'text-purple-500'
    },
    {
      id: 'cost-centers',
      name: 'تقرير مراكز التكلفة',
      description: 'أداء وكفاءة مراكز التكلفة',
      icon: Building,
      color: 'text-orange-500'
    }
  ];

  if (isOverviewLoading || isAnalyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">التقارير المالية المتقدمة</h2>
          <p className="text-muted-foreground">تقارير شاملة ومفصلة للأداء المالي</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 ml-2" />
          تصدير جميع التقارير
        </Button>
      </div>

      {/* مرشحات التقارير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            مرشحات التقارير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">من تاريخ</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value ? new Date(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value ? new Date(e.target.value) : undefined }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع التقرير</label>
              <Select value={filters.reportType} onValueChange={(value) => setFilters(prev => ({ ...prev, reportType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع التقرير" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التقارير</SelectItem>
                  <SelectItem value="financial">التقارير المالية</SelectItem>
                  <SelectItem value="fleet">تقارير الأسطول</SelectItem>
                  <SelectItem value="contracts">تقارير العقود</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">مركز التكلفة</label>
              <Select value={filters.costCenter} onValueChange={(value) => setFilters(prev => ({ ...prev, costCenter: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركز التكلفة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المراكز</SelectItem>
                  <SelectItem value="sales">المبيعات</SelectItem>
                  <SelectItem value="fleet">الأسطول</SelectItem>
                  <SelectItem value="admin">الإدارة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التقارير المتاحة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportTypes.map((report) => {
          const IconComponent = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className={`h-5 w-5 ${report.color}`} />
                  {report.name}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    onClick={() => generatePDFReport(report.id)}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل PDF
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full"
                  >
                    <Activity className="h-4 w-4 ml-2" />
                    معاينة التقرير
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* معاينة التقارير */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">النظرة العامة</TabsTrigger>
          <TabsTrigger value="fleet">الأسطول</TabsTrigger>
          <TabsTrigger value="contracts">العقود</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>التقرير المالي الشامل</CardTitle>
              <CardDescription>معاينة سريعة للوضع المالي العام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-500">
                    {formatCurrency(financialOverview?.totalRevenue || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-500">
                    {formatCurrency(financialOverview?.totalExpenses || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">
                    {formatCurrency(financialOverview?.netIncome || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">صافي الربح</p>
                </div>
              </div>
              
              <div className="mt-6 space-y-4">
                <h4 className="font-semibold">أبرز النقاط:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="default">إيجابي</Badge>
                    نمو في الإيرادات مقارنة بالفترة السابقة
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="secondary">مراقبة</Badge>
                    زيادة في تكاليف التشغيل تحتاج لمراجعة
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="default">جيد</Badge>
                    تحسن في هامش الربح الإجمالي
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تقرير الأسطول المالي</CardTitle>
              <CardDescription>تحليل التكاليف والإيرادات المتعلقة بالأسطول</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">تكاليف التشغيل</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>تكاليف الوقود</span>
                        <span className="font-medium">15,000 د.ك</span>
                      </div>
                      <div className="flex justify-between">
                        <span>تكاليف الصيانة</span>
                        <span className="font-medium">8,500 د.ك</span>
                      </div>
                      <div className="flex justify-between">
                        <span>التأمين</span>
                        <span className="font-medium">3,200 د.ك</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>الإجمالي</span>
                        <span>26,700 د.ك</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">إيرادات الأسطول</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>إيرادات التأجير</span>
                        <span className="font-medium">45,000 د.ك</span>
                      </div>
                      <div className="flex justify-between">
                        <span>خدمات إضافية</span>
                        <span className="font-medium">5,200 د.ك</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>الإجمالي</span>
                        <span>50,200 د.ك</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">صافي ربح الأسطول</span>
                    <span className="text-xl font-bold text-green-600">23,500 د.ك</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    معدل العائد: 46.8% من الإيرادات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تقرير إيرادات العقود</CardTitle>
              <CardDescription>تحليل أداء العقود والعملاء</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {contracts?.length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">العقود النشطة</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-500">
                      {formatCurrency(contracts?.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0) || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">قيمة العقود الإجمالية</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">
                      {formatCurrency(contracts?.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0) || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">الإيراد الشهري</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">توزيع العقود حسب النوع:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>عقود التأجير طويلة المدى</span>
                      <Badge>75%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>عقود التأجير قصيرة المدى</span>
                      <Badge variant="secondary">20%</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <span>عقود الخدمات</span>
                      <Badge variant="outline">5%</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تقرير الأداء المالي</CardTitle>
              <CardDescription>مؤشرات الأداء والكفاءة المالية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analytics?.financialHealthScore && (
                  <div className="text-center p-6 border rounded-lg">
                    <h4 className="font-semibold mb-4">نقاط الصحة المالية</h4>
                    <div className="text-4xl font-bold text-primary mb-2">
                      {analytics.financialHealthScore.score}
                    </div>
                    <Badge variant={analytics.financialHealthScore.score >= 70 ? "default" : "secondary"}>
                      {analytics.financialHealthScore.score >= 70 ? 'ممتاز' : 'جيد'}
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">المؤشرات الأساسية</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>هامش الربح الإجمالي</span>
                        <span className="font-medium">32.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>هامش الربح الصافي</span>
                        <span className="font-medium">18.7%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>معدل دوران الأصول</span>
                        <span className="font-medium">1.8x</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-3">مؤشرات السيولة</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>نسبة التداول</span>
                        <span className="font-medium">2.3:1</span>
                      </div>
                      <div className="flex justify-between">
                        <span>النسبة السريعة</span>
                        <span className="font-medium">1.8:1</span>
                      </div>
                      <div className="flex justify-between">
                        <span>نسبة النقدية</span>
                        <span className="font-medium">0.9:1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}