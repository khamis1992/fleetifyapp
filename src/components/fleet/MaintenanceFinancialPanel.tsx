import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Settings, TrendingUp, DollarSign, Receipt, AlertTriangle } from "lucide-react";
import { useMaintenanceAccountMappings } from "@/hooks/useMaintenanceAccountMappings";
import { useMaintenanceCostSummary } from "@/hooks/useMaintenanceCostSummary";
import { MaintenanceAccountMappingDialog } from "./MaintenanceAccountMappingDialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const MaintenanceFinancialPanel: React.FC = () => {
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  
  const { data: mappings, isLoading: mappingsLoading } = useMaintenanceAccountMappings();
  const { data: costSummary, isLoading: costLoading } = useMaintenanceCostSummary();

  const totalMaintenanceCost = costSummary?.reduce((sum, item) => sum + item.total_cost_with_tax, 0) || 0;
  const totalVehicles = costSummary?.length || 0;
  const averageCostPerVehicle = totalVehicles > 0 ? totalMaintenanceCost / totalVehicles : 0;

  if (mappingsLoading || costLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي تكاليف الصيانة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMaintenanceCost.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              {totalVehicles} مركبة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط التكلفة لكل مركبة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCostPerVehicle.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              من {totalVehicles} مركبة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">روابط الحسابات</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mappings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              أنواع صيانة مربوطة
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mappings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mappings">روابط الحسابات</TabsTrigger>
          <TabsTrigger value="costs">تحليل التكاليف</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>روابط حسابات الصيانة</CardTitle>
                <Button 
                  onClick={() => setShowMappingDialog(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة ربط
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mappings && mappings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نوع الصيانة</TableHead>
                      <TableHead>حساب المصروفات</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-medium">
                          {mapping.maintenance_type}
                        </TableCell>
                        <TableCell>
                          {mapping.expense_account?.account_code} - {mapping.expense_account?.account_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mapping.description || "لا يوجد وصف"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mapping.is_active ? "default" : "secondary"}>
                            {mapping.is_active ? "نشط" : "غير نشط"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد روابط حسابات</h3>
                  <p className="text-muted-foreground mb-4">
                    قم بإضافة روابط الحسابات لربط أنواع الصيانة بحسابات المصروفات
                  </p>
                  <Button onClick={() => setShowMappingDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة أول ربط
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليل تكاليف الصيانة حسب المركبة</CardTitle>
            </CardHeader>
            <CardContent>
              {costSummary && costSummary.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المركبة</TableHead>
                      <TableHead>عدد الصيانات</TableHead>
                      <TableHead>التكلفة الأساسية</TableHead>
                      <TableHead>الضريبة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>آخر صيانة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costSummary.map((vehicle) => (
                      <TableRow key={vehicle.vehicle_id}>
                        <TableCell className="font-medium">
                          {vehicle.make} {vehicle.model}
                          <div className="text-sm text-muted-foreground">
                            {vehicle.plate_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {vehicle.completed_maintenance_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.total_maintenance_cost.toFixed(3)} د.ك
                        </TableCell>
                        <TableCell>
                          {vehicle.total_tax_amount.toFixed(3)} د.ك
                        </TableCell>
                        <TableCell className="font-medium">
                          {vehicle.total_cost_with_tax.toFixed(3)} د.ك
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vehicle.last_maintenance_date 
                            ? new Date(vehicle.last_maintenance_date).toLocaleDateString('en-US')
                            : "لا يوجد"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد بيانات تكاليف</h3>
                  <p className="text-muted-foreground">
                    لا توجد صيانات مكتملة بعد لعرض تحليل التكاليف
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MaintenanceAccountMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        onSuccess={() => setShowMappingDialog(false)}
      />
    </div>
  );
};