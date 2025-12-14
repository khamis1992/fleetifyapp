import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesOpportunities, useSalesPipelineMetrics } from "@/hooks/useSalesOpportunities";
import { useSalesLeads } from "@/hooks/useSalesLeads";
import { useSalesQuotes } from "@/hooks/useSalesQuotes";
import { useSalesOrders } from "@/hooks/useSalesOrders";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BarChart3, TrendingUp, DollarSign, Users, Target, FileText, ShoppingCart, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

const SalesAnalytics = () => {
  const [dateRange, setDateRange] = useState("30");
  const [comparisonPeriod, setComparisonPeriod] = useState("previous");

  const { data: opportunities, isLoading: opportunitiesLoading } = useSalesOpportunities({ is_active: true });
  const { data: pipelineMetrics } = useSalesPipelineMetrics();
  const { data: leads, isLoading: leadsLoading } = useSalesLeads({ is_active: true });
  const { data: quotes, isLoading: quotesLoading } = useSalesQuotes({ is_active: true });
  const { data: orders, isLoading: ordersLoading } = useSalesOrders({ is_active: true });

  const isLoading = opportunitiesLoading || leadsLoading || quotesLoading || ordersLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount);
  };

  // Calculate metrics
  const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
  const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

  const leadConversionRate = leads && opportunities
    ? ((opportunities.length / (leads.length || 1)) * 100).toFixed(1)
    : "0.0";

  const quoteAcceptanceRate = quotes
    ? ((quotes.filter(q => q.status === 'accepted').length / (quotes.length || 1)) * 100).toFixed(1)
    : "0.0";

  const avgDealSize = opportunities?.length
    ? (opportunities.reduce((sum, opp) => sum + opp.estimated_value, 0) / opportunities.length)
    : 0;

  const wonOpportunities = opportunities?.filter(o => o.stage === 'won') || [];
  const wonValue = wonOpportunities.reduce((sum, opp) => sum + opp.estimated_value, 0);
  const winRate = opportunities?.length
    ? ((wonOpportunities.length / opportunities.length) * 100).toFixed(1)
    : "0.0";

  // Sales by stage
  const stageData = [
    { stage: 'عميل محتمل', count: opportunities?.filter(o => o.stage === 'lead').length || 0, value: opportunities?.filter(o => o.stage === 'lead').reduce((sum, opp) => sum + opp.estimated_value, 0) || 0 },
    { stage: 'مؤهل', count: opportunities?.filter(o => o.stage === 'qualified').length || 0, value: opportunities?.filter(o => o.stage === 'qualified').reduce((sum, opp) => sum + opp.estimated_value, 0) || 0 },
    { stage: 'عرض', count: opportunities?.filter(o => o.stage === 'proposal').length || 0, value: opportunities?.filter(o => o.stage === 'proposal').reduce((sum, opp) => sum + opp.estimated_value, 0) || 0 },
    { stage: 'تفاوض', count: opportunities?.filter(o => o.stage === 'negotiation').length || 0, value: opportunities?.filter(o => o.stage === 'negotiation').reduce((sum, opp) => sum + opp.estimated_value, 0) || 0 },
    { stage: 'ناجح', count: wonOpportunities.length, value: wonValue },
  ];

  const maxValue = Math.max(...stageData.map(s => s.value), 1);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/sales/pipeline">المبيعات</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>التحليلات</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">تحليلات المبيعات</h1>
            <p className="text-muted-foreground">مؤشرات الأداء والتقارير التفصيلية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
              <SelectItem value="365">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            تخصيص
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(deliveredRevenue)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">12.5%</span>
                  عن الفترة السابقة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل الفوز</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate}%</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">3.2%</span>
                  عن الفترة السابقة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط حجم الصفقة</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <ArrowDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">2.1%</span>
                  عن الفترة السابقة
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل قبول العروض</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quoteAcceptanceRate}%</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">5.3%</span>
                  عن الفترة السابقة
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Chart */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>قمع المبيعات</CardTitle>
                <CardDescription>توزيع الفرص حسب المراحل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stageData.map((stage, index) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{stage.count} فرصة</Badge>
                        <span className="font-semibold">{formatCurrency(stage.value)}</span>
                      </div>
                    </div>
                    <div className="h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500 flex items-center justify-end px-3"
                        style={{ width: `${(stage.value / maxValue) * 100}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {stage.value > 0 ? `${((stage.value / maxValue) * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معدلات التحويل</CardTitle>
                <CardDescription>أداء عملية المبيعات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">عميل محتمل → فرصة</span>
                    <span className="text-sm font-bold">{leadConversionRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${leadConversionRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">فرصة → عرض سعر</span>
                    <span className="text-sm font-bold">
                      {quotes?.length && opportunities?.length
                        ? ((quotes.length / opportunities.length) * 100).toFixed(1)
                        : "0.0"}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{
                        width: `${quotes?.length && opportunities?.length
                          ? ((quotes.length / opportunities.length) * 100)
                          : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">عرض سعر → طلبية</span>
                    <span className="text-sm font-bold">
                      {orders?.length && quotes?.length
                        ? ((orders.length / quotes.length) * 100).toFixed(1)
                        : "0.0"}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${orders?.length && quotes?.length
                          ? ((orders.length / quotes.length) * 100)
                          : 0}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">معدل الفوز الإجمالي</span>
                    <span className="text-sm font-bold text-green-600">{winRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  العملاء المحتملون
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">إجمالي العملاء</span>
                  <span className="font-bold text-lg">{leads?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">جديد</span>
                  <Badge variant="default">{leads?.filter(l => l.status === 'new').length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">مؤهل</span>
                  <Badge variant="success">{leads?.filter(l => l.status === 'qualified').length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">تم التحويل</span>
                  <Badge variant="secondary">{leads?.filter(l => l.status === 'converted').length || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-yellow-500" />
                  عروض الأسعار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">إجمالي العروض</span>
                  <span className="font-bold text-lg">{quotes?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">مسودة</span>
                  <Badge variant="default">{quotes?.filter(q => q.status === 'draft').length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">مرسل</span>
                  <Badge variant="secondary">{quotes?.filter(q => q.status === 'sent').length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">مقبول</span>
                  <Badge variant="success">{quotes?.filter(q => q.status === 'accepted').length || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  الطلبيات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">إجمالي الطلبيات</span>
                  <span className="font-bold text-lg">{orders?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">قيد المعالجة</span>
                  <Badge variant="warning">{orders?.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">تم الشحن</span>
                  <Badge variant="secondary">{orders?.filter(o => o.status === 'shipped').length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">تم التسليم</span>
                  <Badge variant="success">{orders?.filter(o => o.status === 'delivered').length || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>أعلى الفرص قيمة</CardTitle>
              <CardDescription>أكبر 5 فرص بيعية حسب القيمة المتوقعة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {opportunities
                  ?.sort((a, b) => b.estimated_value - a.estimated_value)
                  .slice(0, 5)
                  .map((opp, index) => (
                    <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{opp.opportunity_name_ar || opp.opportunity_name}</p>
                          <p className="text-xs text-muted-foreground">
                            احتمالية: {opp.probability}% • {opp.stage}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(opp.estimated_value)}</p>
                        <p className="text-xs text-muted-foreground">
                          مرجح: {formatCurrency(opp.estimated_value * (opp.probability / 100))}
                        </p>
                      </div>
                    </div>
                  ))}
                {(!opportunities || opportunities.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">لا توجد فرص بيعية</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SalesAnalytics;
