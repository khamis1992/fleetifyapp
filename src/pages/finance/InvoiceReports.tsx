import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  BarChart3, 
  TrendingUp, 
  Building2, 
  Package, 
  Download,
  Calendar,
  FileText
} from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useInvoiceCostCenterAnalysis, useInvoiceBudgetComparison, useFixedAssetInvoiceAnalysis } from "@/hooks/useInvoiceAnalysis";
import { useCostCenters } from "@/hooks/useCostCenters";

const InvoiceReports = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  
  const { data: costCenterAnalysis, isLoading: costCenterLoading } = useInvoiceCostCenterAnalysis();
  const { data: budgetComparison, isLoading: budgetLoading } = useInvoiceBudgetComparison(selectedYear);
  const { data: assetAnalysis, isLoading: assetLoading } = useFixedAssetInvoiceAnalysis();
  const { data: costCenters } = useCostCenters();

  const getVarianceColor = (percentage: number) => {
    if (percentage > 10) return 'destructive';
    if (percentage < -10) return 'secondary';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">النظام المالي</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance/invoices">الفواتير</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>تقارير التكامل</BreadcrumbPage>
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
            <h1 className="text-2xl font-bold">تقارير تكامل الفواتير</h1>
            <p className="text-muted-foreground">تحليل شامل لتكامل الفواتير مع مراكز التكلفة والميزانية والأصول</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="cost-centers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cost-centers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            مراكز التكلفة
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            مقارنة الميزانية
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            الأصول الثابتة
          </TabsTrigger>
        </TabsList>

        {/* تقرير مراكز التكلفة */}
        <TabsContent value="cost-centers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                تحليل الفواتير حسب مراكز التكلفة
              </CardTitle>
              <CardDescription>
                عرض توزيع الفواتير والانحرافات عن الميزانية لكل مركز تكلفة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costCenterLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>مركز التكلفة</TableHead>
                      <TableHead>نوع الفاتورة</TableHead>
                      <TableHead>عدد الفواتير</TableHead>
                      <TableHead>إجمالي المبلغ</TableHead>
                      <TableHead>الميزانية</TableHead>
                      <TableHead>الانحراف</TableHead>
                      <TableHead>نسبة الانحراف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterAnalysis?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.center_name}</p>
                            <p className="text-sm text-muted-foreground">{item.center_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.invoice_type === 'sales' ? 'مبيعات' : 'مشتريات'}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.total_invoices}</TableCell>
                        <TableCell>{item.total_amount.toFixed(3)} د.ك</TableCell>
                        <TableCell>{item.budget_amount.toFixed(3)} د.ك</TableCell>
                        <TableCell>
                          <span className={item.variance_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.variance_amount >= 0 ? '+' : ''}{item.variance_amount.toFixed(3)} د.ك
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getVarianceColor(item.variance_percentage)}>
                            {item.variance_percentage >= 0 ? '+' : ''}{item.variance_percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تقرير مقارنة الميزانية */}
        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                مقارنة الفواتير الفعلية بالميزانية - {selectedYear}
              </CardTitle>
              <CardDescription>
                تتبع الأداء الفعلي مقابل المخطط له على مدار السنة
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budgetLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفترة</TableHead>
                      <TableHead>المبيعات المخططة</TableHead>
                      <TableHead>المبيعات الفعلية</TableHead>
                      <TableHead>انحراف المبيعات</TableHead>
                      <TableHead>المشتريات المخططة</TableHead>
                      <TableHead>المشتريات الفعلية</TableHead>
                      <TableHead>انحراف المشتريات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetComparison?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {new Date(item.period + '-01').toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </TableCell>
                        <TableCell>{item.budgeted_sales.toFixed(3)} د.ك</TableCell>
                        <TableCell>{item.actual_sales.toFixed(3)} د.ك</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={item.sales_variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.sales_variance >= 0 ? '+' : ''}{item.sales_variance.toFixed(3)} د.ك
                            </span>
                            <Badge variant={getVarianceColor(item.sales_variance_percentage)}>
                              {item.sales_variance_percentage >= 0 ? '+' : ''}{item.sales_variance_percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{item.budgeted_purchases.toFixed(3)} د.ك</TableCell>
                        <TableCell>{item.actual_purchases.toFixed(3)} د.ك</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={item.purchase_variance >= 0 ? 'text-red-600' : 'text-green-600'}>
                              {item.purchase_variance >= 0 ? '+' : ''}{item.purchase_variance.toFixed(3)} د.ك
                            </span>
                            <Badge variant={getVarianceColor(-item.purchase_variance_percentage)}>
                              {item.purchase_variance_percentage >= 0 ? '+' : ''}{item.purchase_variance_percentage.toFixed(1)}%
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* تقرير الأصول الثابتة */}
        <TabsContent value="assets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                تحليل فواتير الأصول الثابتة
              </CardTitle>
              <CardDescription>
                عرض تكاليف شراء وصيانة الأصول الثابتة من خلال الفواتير
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الأصل</TableHead>
                      <TableHead>فواتير الشراء</TableHead>
                      <TableHead>تكلفة الشراء</TableHead>
                      <TableHead>فواتير الصيانة</TableHead>
                      <TableHead>تكلفة الصيانة</TableHead>
                      <TableHead>إجمالي التكلفة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetAnalysis?.map((asset) => (
                      <TableRow key={asset.asset_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asset.asset_name}</p>
                            <p className="text-sm text-muted-foreground">{asset.asset_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {asset.total_purchase_invoices} فاتورة
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.total_purchase_amount.toFixed(3)} د.ك</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {asset.maintenance_invoices} فاتورة
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.maintenance_amount.toFixed(3)} د.ك</TableCell>
                        <TableCell className="font-medium">
                          {asset.total_cost.toFixed(3)} د.ك
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceReports;