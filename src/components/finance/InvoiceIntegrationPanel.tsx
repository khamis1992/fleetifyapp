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
  ExternalLink,
  Car,
  Users,
  Wrench,
  Scale,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useInvoiceCostCenterAnalysis, useInvoiceBudgetComparison, useFixedAssetInvoiceAnalysis } from "@/hooks/useInvoiceAnalysis";
import { useVehicles } from "@/hooks/useVehicles";
import { useCustomers } from "@/hooks/useEnhancedCustomers";
import { useContracts } from "@/hooks/useContracts";
import { useNavigate } from 'react-router-dom';

interface InvoiceIntegrationPanelProps {
  invoiceId?: string;
  costCenterId?: string;
  fixedAssetId?: string;
  customerId?: string;
  contractId?: string;
  vehicleId?: string;
  className?: string;
}

export function InvoiceIntegrationPanel({ 
  invoiceId, 
  costCenterId, 
  fixedAssetId,
  customerId,
  contractId,
  vehicleId,
  className 
}: InvoiceIntegrationPanelProps) {
  const navigate = useNavigate();
  const { data: costCenterAnalysis } = useInvoiceCostCenterAnalysis();
  const { data: budgetComparison } = useInvoiceBudgetComparison(new Date().getFullYear());
  const { data: assetAnalysis } = useFixedAssetInvoiceAnalysis();
  const { data: vehicles } = useVehicles();
  const { data: customers } = useCustomers();
  const { data: contracts } = useContracts();

  // البحث عن البيانات المرتبطة
  const relatedVehicle = vehicleId ? vehicles?.find(v => v.id === vehicleId) : null;
  const relatedCustomer = customerId ? customers?.find(c => c.id === customerId) : null;
  const relatedContract = contractId ? contracts?.find(c => c.id === contractId) : null;

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => navigate('/finance/general-ledger')}
            >
              <FileText className="h-4 w-4 mr-2" />
              القيود اليومية
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => navigate('/finance/payments')}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              المدفوعات
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => navigate('/finance/reports')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              التقارير المالية
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => navigate('/fleet')}
            >
              <Car className="h-4 w-4 mr-2" />
              إدارة الأسطول
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => navigate('/customers')}
            >
              <Users className="h-4 w-4 mr-2" />
              إدارة العملاء
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* البيانات المرتبطة */}
      {(relatedVehicle || relatedCustomer || relatedContract) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              البيانات المرتبطة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {relatedVehicle && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{relatedVehicle.make} {relatedVehicle.model}</p>
                    <p className="text-sm text-muted-foreground">لوحة: {relatedVehicle.plate_number}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/fleet?vehicle=${relatedVehicle.id}`)}
                  >
                    عرض المركبة
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/fleet/maintenance?vehicle=${relatedVehicle.id}`)}
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    الصيانة
                  </Button>
                </div>
              </div>
            )}

            {relatedCustomer && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">
                      {relatedCustomer.customer_type === 'individual' 
                        ? `${relatedCustomer.first_name} ${relatedCustomer.last_name}`
                        : relatedCustomer.company_name
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {relatedCustomer.customer_type === 'individual' ? 'عميل فردي' : 'شركة'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/customers?customer=${relatedCustomer.id}`)}
                  >
                    عرض العميل
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/contracts?customer=${relatedCustomer.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    العقود
                  </Button>
                </div>
              </div>
            )}

            {relatedContract && (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">عقد رقم: {relatedContract.contract_number}</p>
                    <p className="text-sm text-muted-foreground">
                      المبلغ: {relatedContract.contract_amount.toFixed(3)} د.ك
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/contracts?contract=${relatedContract.id}`)}
                  >
                    عرض العقد
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/finance/payments?contract=${relatedContract.id}`)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    المدفوعات
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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