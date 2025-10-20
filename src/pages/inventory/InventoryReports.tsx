import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useInventoryValuationReport,
  useInventoryAgingReport,
  useInventoryTurnoverReport,
  useStockLevelAlerts,
  useInventoryValuationSummary,
  useInventoryAgingSummary,
  useInventoryTurnoverSummary,
  useStockAlertSummary,
} from "@/hooks/useInventoryReports";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, Clock } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const InventoryReports = () => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("valuation");

  const { data: warehouses } = useInventoryWarehouses();
  const { data: categories } = useInventoryCategories({ is_active: true });

  // Reports data
  const { data: valuationReport, isLoading: valuationLoading } = useInventoryValuationReport(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );
  const { data: agingReport, isLoading: agingLoading } = useInventoryAgingReport(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );
  const { data: turnoverReport, isLoading: turnoverLoading } = useInventoryTurnoverReport(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );
  const { data: stockAlerts, isLoading: alertsLoading } = useStockLevelAlerts(
    selectedWarehouse !== "all" ? selectedWarehouse : undefined,
    selectedCategory !== "all" ? selectedCategory : undefined
  );

  // Summary data
  const { data: valuationSummary } = useInventoryValuationSummary();
  const { data: agingSummary } = useInventoryAgingSummary();
  const { data: turnoverSummary } = useInventoryTurnoverSummary();
  const { data: alertSummary } = useStockAlertSummary();

  const getAlertBadge = (alertType: string) => {
    const types: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; icon: React.ReactNode }> = {
      "نفذ المخزون": { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
      "أقل من الحد الأدنى": { variant: "warning", icon: <TrendingDown className="h-3 w-3" /> },
      "نقطة إعادة الطلب": { variant: "warning", icon: <Package className="h-3 w-3" /> },
      "تخزين زائد": { variant: "secondary", icon: <TrendingUp className="h-3 w-3" /> },
    };

    const typeInfo = types[alertType] || { variant: "outline" as const, icon: null };
    return (
      <Badge variant={typeInfo.variant} className="gap-1">
        {typeInfo.icon}
        {alertType}
      </Badge>
    );
  };

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
            <BreadcrumbLink href="/inventory">إدارة المخزون</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>تقارير المخزون</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">تقارير المخزون</h1>
            <p className="text-muted-foreground">تحليلات شاملة للمخزون والتكلفة والحركة</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="جميع المستودعات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستودعات</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="valuation">تقرير التقييم</TabsTrigger>
          <TabsTrigger value="turnover">تحليل دوران المخزون</TabsTrigger>
          <TabsTrigger value="aging">تقرير التقادم</TabsTrigger>
          <TabsTrigger value="alerts">تنبيهات المخزون</TabsTrigger>
        </TabsList>

        {/* Valuation Report Tab */}
        <TabsContent value="valuation" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{valuationSummary?.total_items || 0}</div>
                <p className="text-xs text-muted-foreground">صنف في المخزون</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قيمة التكلفة</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(valuationSummary?.total_cost_value || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">ريال سعودي</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قيمة البيع</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(valuationSummary?.total_selling_value || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">ريال سعودي</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الربح المتوقع</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {(valuationSummary?.potential_profit || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  هامش {(valuationSummary?.profit_margin || 0).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>التقييم حسب المستودع</CardTitle>
              <CardDescription>مقارنة قيمة المخزون في المستودعات</CardDescription>
            </CardHeader>
            <CardContent>
              {valuationLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : valuationReport && valuationReport.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={valuationReport}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="warehouse_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_cost_value" fill="#3b82f6" name="قيمة التكلفة" />
                    <Bar dataKey="total_selling_value" fill="#10b981" name="قيمة البيع" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للعرض
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل التقييم</CardTitle>
            </CardHeader>
            <CardContent>
              {valuationLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : valuationReport && valuationReport.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستودع</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>عدد الأصناف</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>قيمة التكلفة</TableHead>
                      <TableHead>قيمة البيع</TableHead>
                      <TableHead>الربح المتوقع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuationReport.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.warehouse_name}</TableCell>
                        <TableCell>{row.category_name}</TableCell>
                        <TableCell>{row.total_items}</TableCell>
                        <TableCell>{row.total_quantity}</TableCell>
                        <TableCell>{row.total_cost_value.toFixed(2)} ريال</TableCell>
                        <TableCell>{row.total_selling_value.toFixed(2)} ريال</TableCell>
                        <TableCell className="text-green-600">
                          {row.potential_profit.toFixed(2)} ريال
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للعرض
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Turnover Report Tab */}
        <TabsContent value="turnover" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Turnover Categories Chart */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع دوران المخزون</CardTitle>
                <CardDescription>تصنيف الأصناف حسب سرعة الحركة</CardDescription>
              </CardHeader>
              <CardContent>
                {turnoverSummary && turnoverSummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={turnoverSummary}
                        dataKey="item_count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {turnoverSummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات للعرض
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات الدوران</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {turnoverSummary?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item.category}</span>
                      </div>
                      <Badge variant="outline">{item.item_count} صنف</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل دوران المخزون</CardTitle>
              <CardDescription>آخر 90 يوم</CardDescription>
            </CardHeader>
            <CardContent>
              {turnoverLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : turnoverReport && turnoverReport.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>المخزون الحالي</TableHead>
                      <TableHead>عدد الحركات</TableHead>
                      <TableHead>كمية المبيعات</TableHead>
                      <TableHead>معدل الدوران</TableHead>
                      <TableHead>التصنيف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turnoverReport.slice(0, 20).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.item_name}</TableCell>
                        <TableCell>{row.warehouse_name}</TableCell>
                        <TableCell>{row.current_stock}</TableCell>
                        <TableCell>{row.movements_last_90_days}</TableCell>
                        <TableCell>{row.sales_quantity_last_90_days}</TableCell>
                        <TableCell>{row.turnover_ratio}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.turnover_category === "سريع الحركة"
                                ? "default"
                                : row.turnover_category === "متوسط الحركة"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {row.turnover_category}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للعرض
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging Report Tab */}
        <TabsContent value="aging" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Aging Chart */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع تقادم المخزون</CardTitle>
                <CardDescription>القيمة المربوطة حسب فئة التقادم</CardDescription>
              </CardHeader>
              <CardContent>
                {agingSummary && agingSummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={agingSummary}
                        dataKey="tied_up_value"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {agingSummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد بيانات للعرض
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aging Summary */}
            <Card>
              <CardHeader>
                <CardTitle>ملخص التقادم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agingSummary?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item.category}</span>
                      </div>
                      <span className="text-sm font-semibold">{item.tied_up_value.toFixed(2)} ريال</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل تقادم المخزون</CardTitle>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : agingReport && agingReport.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>أيام بدون حركة</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>القيمة المربوطة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agingReport.slice(0, 20).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.item_name}</TableCell>
                        <TableCell>{row.warehouse_name}</TableCell>
                        <TableCell>{row.quantity_on_hand}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {row.days_since_last_movement} يوم
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.aging_category.includes("راكد جداً")
                                ? "destructive"
                                : row.aging_category.includes("راكد")
                                ? "warning"
                                : row.aging_category.includes("بطيء")
                                ? "secondary"
                                : "default"
                            }
                          >
                            {row.aging_category}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.tied_up_value.toFixed(2)} ريال</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للعرض
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {/* Alert Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {alertSummary?.map((item, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.alert_type}</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{item.count}</div>
                  <p className="text-xs text-muted-foreground">صنف يحتاج اهتمام</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerts Table */}
          <Card>
            <CardHeader>
              <CardTitle>تنبيهات مستويات المخزون</CardTitle>
              <CardDescription>جميع الأصناف التي تحتاج إلى إعادة طلب أو اهتمام</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : stockAlerts && stockAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الصنف</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>الكمية المتاحة</TableHead>
                      <TableHead>الحد الأدنى</TableHead>
                      <TableHead>النقص</TableHead>
                      <TableHead>الكمية المقترحة</TableHead>
                      <TableHead>نوع التنبيه</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockAlerts.map((alert, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{alert.item_name}</TableCell>
                        <TableCell>{alert.warehouse_name}</TableCell>
                        <TableCell>
                          <Badge variant={alert.quantity_available === 0 ? "destructive" : "warning"}>
                            {alert.quantity_available}
                          </Badge>
                        </TableCell>
                        <TableCell>{alert.min_stock_level}</TableCell>
                        <TableCell className="text-red-600 font-semibold">
                          {alert.shortage_quantity > 0 ? `-${alert.shortage_quantity}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{alert.suggested_order_quantity}</Badge>
                        </TableCell>
                        <TableCell>{getAlertBadge(alert.alert_type)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-green-600">
                  لا توجد تنبيهات - جميع مستويات المخزون طبيعية
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports;
