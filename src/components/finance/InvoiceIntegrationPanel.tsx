import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Package,
  FileText,
  BarChart3,
  Link,
  ExternalLink
} from "lucide-react";
import { useInvoiceCostCenterAnalysis, useInvoiceBudgetComparison, useFixedAssetInvoiceAnalysis } from "@/hooks/useInvoiceAnalysis";

interface InvoiceIntegrationPanelProps {
  invoiceId?: string;
  costCenterId?: string;
  fixedAssetId?: string;
  className?: string;
}

export function InvoiceIntegrationPanel({ 
  invoiceId, 
  costCenterId, 
  fixedAssetId,
  className 
}: InvoiceIntegrationPanelProps) {
  const { data: costCenterAnalysis } = useInvoiceCostCenterAnalysis();
  const { data: budgetComparison } = useInvoiceBudgetComparison(new Date().getFullYear());
  const { data: assetAnalysis } = useFixedAssetInvoiceAnalysis();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* روابط التكامل السريعة */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="h-5 w-5" />
            روابط التكامل السريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              القيود اليومية
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <DollarSign className="h-4 w-4 mr-2" />
              المدفوعات
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              التقارير المالية
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Building2 className="h-4 w-4 mr-2" />
              مراكز التكلفة
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* معلومات مركز التكلفة */}
      {costCenterId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              تحليل مركز التكلفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costCenterAnalysis?.filter(item => item.cost_center_id === costCenterId).map(center => (
              <div key={center.cost_center_id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{center.center_name}</h4>
                    <p className="text-sm text-muted-foreground">{center.center_code}</p>
                  </div>
                  <Badge variant={center.variance_percentage > 0 ? "destructive" : "default"}>
                    {center.variance_percentage > 0 ? '+' : ''}{center.variance_percentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">إجمالي الفواتير</p>
                    <p className="font-medium">{center.total_invoices}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">إجمالي المبلغ</p>
                    <p className="font-medium">{center.total_amount.toFixed(3)} د.ك</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الميزانية</p>
                    <p className="font-medium">{center.budget_amount.toFixed(3)} د.ك</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* معلومات الأصل الثابت */}
      {fixedAssetId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              تحليل الأصل الثابت
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetAnalysis?.filter(asset => asset.asset_id === fixedAssetId).map(asset => (
              <div key={asset.asset_id} className="space-y-3">
                <div>
                  <h4 className="font-medium">{asset.asset_name}</h4>
                  <p className="text-sm text-muted-foreground">{asset.asset_code}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">فواتير الشراء</p>
                    <p className="font-medium">{asset.total_purchase_invoices} ({asset.total_purchase_amount.toFixed(3)} د.ك)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">فواتير الصيانة</p>
                    <p className="font-medium">{asset.maintenance_invoices} ({asset.maintenance_amount.toFixed(3)} د.ك)</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">إجمالي التكلفة</p>
                    <p className="font-medium text-lg">{asset.total_cost.toFixed(3)} د.ك</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* مقارنة الميزانية */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            مقارنة الميزانية (الشهر الحالي)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {budgetComparison && budgetComparison.length > 0 && (
            <div className="space-y-3">
              {(() => {
                const currentMonth = budgetComparison[new Date().getMonth()];
                if (!currentMonth) return null;
                
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">المبيعات</span>
                        <Badge variant={currentMonth.sales_variance >= 0 ? "default" : "destructive"}>
                          {currentMonth.sales_variance >= 0 ? '+' : ''}{currentMonth.sales_variance_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        فعلي: {currentMonth.actual_sales.toFixed(3)} د.ك
                      </p>
                      <p className="text-xs text-muted-foreground">
                        مخطط: {currentMonth.budgeted_sales.toFixed(3)} د.ك
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-muted-foreground">المشتريات</span>
                        <Badge variant={currentMonth.purchase_variance <= 0 ? "default" : "destructive"}>
                          {currentMonth.purchase_variance >= 0 ? '+' : ''}{currentMonth.purchase_variance_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        فعلي: {currentMonth.actual_purchases.toFixed(3)} د.ك
                      </p>
                      <p className="text-xs text-muted-foreground">
                        مخطط: {currentMonth.budgeted_purchases.toFixed(3)} د.ك
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}